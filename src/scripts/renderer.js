const { setMapLayers, setDefaultMapView, renderRtsData, renderEewData } = require("./helpers/map");
const { START_NOTIFICATION_SERVICE, NOTIFICATION_RECEIVED, NOTIFICATION_SERVICE_STARTED } = require("electron-fcm-push-receiver/src/constants");
const { Marker, Map: MaplibreMap, LngLatBounds } = require("maplibre-gl");
const { ElementBuilder } = require("./helpers/domhelper");
const { cross, reportStationMarkerElement } = require("./factory");
const { getMagnitudeLevel, getDepthLevel, toISOTimestamp } = require("./helpers/utils");
const { ipcRenderer } = require("electron");
const { switchView } = require("./helpers/ui");
const api = new (require("./api"))(localStorage.getItem("ApiKey"));
const colors = require("./helpers/colors");
const constants = require("./constants");
const Circle = require("./classes/circle");
const EEW = require("./classes/eew");

let replayTimer = false;

const map = new MaplibreMap({
  container         : document.getElementById("map"),
  center            : [120.5, 23.6],
  zoom              : 6.75,
  maxPitch          : 0,
  pitchWithRotate   : false,
  dragRotate        : false,
  renderWorldCopies : false,
});

setMapLayers(map);
setDefaultMapView(map);

ipcRenderer.send(START_NOTIFICATION_SERVICE, constants.FCMSenderId);

ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
  localStorage.uuid = token;
});

ipcRenderer.on(NOTIFICATION_RECEIVED, (_, Notification) => {
  if (Notification.data.Data != undefined) {
    const data = JSON.parse(Notification.data.Data);
    api.emit(data.type, data);
  }
});

const waves = {};

api.on("rts", (rts) => {
  if (!replayTimer)
    renderRtsData(rts, map);
});
api.on("ntp", (ntp) => {
  map.localServerTimestamp = Date.now();
  map.serverTimestamp = ntp.time;
});

api.on(constants.Events.TremEew, (data) => renderEewData(data, waves, map));
api.on(constants.Events.CwbEew, (data) => renderEewData(data, waves, map));

const markers = {
  reports        : {},
  reportStations : [],
  reportWaveTime : []
};

// #region init reports

const updateReports = async () => {
  console.log("%c[Reports] Refreshing earthquake reports...", "color: cornflowerblue");

  const reports = (await api.getReports())
    .filter((v) => (localStorage.getItem("ReportShowCWB") == "true") && !v.location.startsWith("地震資訊") || (localStorage.getItem("ReportShowTYA") == "true") && v.location.startsWith("地震資訊"));
  const frag = new DocumentFragment();
  const list = document.getElementById("reports-list");

  for (const identifier in markers.reports) {
    markers.reports[identifier].remove();
    delete markers.reports[identifier];
  }

  let sliceTo = !((localStorage.getItem("ReportShowCWB") == "true") && (localStorage.getItem("ReportShowTYA") == "true"))
    ? +(localStorage.getItem("ReportCount") ?? 50)
    : 0;
  let cwbCount = sliceTo;

  while (cwbCount < +(localStorage.getItem("ReportCount") ?? 50))
    for (const report of reports) {
      sliceTo++;

      if (report.location.startsWith("地震資訊"))
        continue;
      else
        cwbCount++;
    }

  for (let i = 0, n = reports.slice(0, sliceTo).length, report = reports[i]; i < n; i++, report = reports[i]) {
    const isNumbered = Boolean(report.earthquakeNo % 1000);
    const isTYA = report.location.startsWith("地震資訊");

    const item = new ElementBuilder()
      .setId(report.identifier)
      .setClass([ "report-item" ])
      // color
      .addChildren(new ElementBuilder()
        .setClass([ "report-color", isTYA ? "int-unknown" : `int-${constants.Intensities[report.data[0].areaIntensity].value}`, isNumbered ? "has-number" : ""])
        .setStyle("backgroundColor", isNumbered && !isTYA ? colors.getIntensityColor(report.data[0].areaIntensity - 1) : "transparent")
        .setStyle("borderColor", isTYA ? "var(--md-outline)" : colors.getIntensityColor(report.data[0].areaIntensity - 1))
        .setAttribute("title", isTYA ? "" : `${report.data[0].areaName} ${report.data[0].eqStation[0].stationName}`))
      // location
      .addChildren(new ElementBuilder()
        .setClass([ "report-title" ])
        .setContent(
          (localStorage.getItem("ReportTitleStyle") == "1")
            ? report.location.substring(report.location.indexOf("(") + 3, report.location.indexOf(")"))
            : (localStorage.getItem("ReportTitleStyle") == "2")
              ? isTYA ? "地震資訊" : isNumbered ? `編號 ${report.earthquakeNo}` : "小型有感地震"
              : report.location.substring(report.location.indexOf("(") + 3, report.location.indexOf(")")))
        .setAttribute("title", report.location.split(" (")[0])
        .addChildren(
          (localStorage.getItem("ReportTitleStyle") == "3")
            ? new ElementBuilder("span")
              .setClass([ "report-subtitle" ])
              .setContent(isTYA ? "地震資訊" : isNumbered ? report.earthquakeNo : "小型有感")
            : null)
      )
      // time
      .addChildren(new ElementBuilder()
        .setClass([ "report-time" ])
        .setContent(report.originTime)
        .setAttribute("title", new Date(report.originTime).toISOString()))
      // magnitude
      .addChildren(new ElementBuilder()
        .setClass([ "report-magnitude" ])
        .setContent(report.magnitudeValue.toFixed(1))
        .setAttribute("title", constants.Magnitudes[getMagnitudeLevel(report.magnitudeValue)]))
      // depth
      .addChildren(new ElementBuilder()
        .setClass([ "report-depth" ])
        .setContent(report.depth)
        .setAttribute("title", constants.Depths[getDepthLevel(report.depth)]));

    document.getElementById("reports-list-view").classList.remove("hide");
    ipcRenderer.emit("report:clear.station");
    ipcRenderer.emit("report:unhide.marker");

    if (document.getElementById("reports-panel").classList.contains("show"))
      map.fitBounds(constants.TaiwanBounds, {
        padding : { top: 24, right: 324, bottom: 24, left: 24 },
        animate : (localStorage.getItem("MapAnimation") ?? "true") == "true"
      });

    // map icon
    if (!markers.reports[report.identifier])
      markers.reports[report.identifier] = new Marker({
        element: isTYA ? cross({
          className : "report-cross",
          scale     : (report.magnitudeValue ** 2) / 72,
          opacity   : (100 - i) / 100,
          svg       : true
        }) : cross({
          className  : "report-cross",
          scale      : (report.magnitudeValue ** 2) / 72,
          innerColor : isNumbered ? colors.getIntensityColor(report.data[0].areaIntensity - 1) : undefined,
          outerColor : isNumbered ? undefined : colors.getIntensityColor(report.data[0].areaIntensity - 1),
          opacity    : (100 - i) / 100,
          svg        : true
        }),
      })
        .setLngLat([report.epicenterLon, report.epicenterLat])
        .addTo(map);

    const openReport = () => {
      for (const key in markers.reports)
        if (key != report.identifier)
          markers.reports[key].getElement().classList.add("hide");

      document.getElementById("report-detail-subtitle").textContent = isTYA ? "地震資訊" : isNumbered ? `編號 ${report.earthquakeNo}` : "小型有感地震";
      document.getElementById("report-detail-title").textContent = report.location.substring(report.location.indexOf("(") + 3, report.location.indexOf(")"));
      document.getElementById("report-detail-location").textContent = isTYA ? report.location.substring(report.location.indexOf("(") + 1, report.location.indexOf(")")) : report.location.substring(0, report.location.indexOf("(") - 1);
      document.getElementById("report-detail-longitude").textContent = Math.abs(report.epicenterLon);
      document.getElementById("report-detail-longitude-unit").textContent = report.epicenterLon > 0 ? "E" : "W";
      document.getElementById("report-detail-latitude").textContent = Math.abs(report.epicenterLat);
      document.getElementById("report-detail-latitude-unit").textContent = report.epicenterLat > 0 ? "N" : "S";
      document.getElementById("report-detail-time").textContent = report.originTime;
      document.getElementById("report-detail-magnitude").textContent = report.magnitudeValue.toFixed(1);
      document.getElementById("report-detail-depth").textContent = report.depth;
      document.getElementById("reports-list-view").classList.add("hide");
      console.log(report);

      const bounds = new LngLatBounds();
      bounds.extend([report.epicenterLon, report.epicenterLat]);

      // stations
      const fragment = new DocumentFragment();

      const stationList = report.data
        .reduce((acc, area) => (acc.push(...area.eqStation.map((eqStation) => (eqStation.areaName = area.areaName, eqStation))), acc), [])
        .sort((a, b) => b.stationIntensity - a.stationIntensity);

      for (const station of stationList) {
        fragment.appendChild(new ElementBuilder()
          .setClass([ "report-station", `intensity-${station.stationIntensity}` ])
          .addChildren(new ElementBuilder()
            .setClass([ "report-station-name" ])
            .setContent(`${station.areaName} ${station.stationName}`)
            .setStyle("flex", 1))
          .addChildren(new ElementBuilder()
            .setClass([ "report-station-intensity" ])
            .setContent(constants.Intensities[station.stationIntensity].text))
          .toElement());

        ipcRenderer.emit("report:add.station", station);
        bounds.extend([station.stationLon, station.stationLat]);
      }

      document.getElementById("report-station-list").replaceChildren(fragment);


      // wave time circles

      const distances = EEW.evalWaveDistances(report.depth);

      for (let seconds = 5; seconds <= 90; seconds += 5) {
        let s_dist = Math.floor(Math.sqrt(((seconds * 1000) * 3.5) ** 2 - (report.depth * 1000) ** 2));

        for (let _i = 1; _i < distances.length; _i++)
          if (distances[_i].Stime > seconds) {
            s_dist = _i - 1;

            if ((_i - 1) / distances[_i - 1].Stime > 3.5) {
              s_dist = Math.round(Math.sqrt(((seconds * 1000) * 3.5) ** 2 - (report.depth * 1000) ** 2)) / 1000;
              break;
            }
          }

        if (s_dist > report.depth)
          markers.reportWaveTime.push(new Circle(map, {
            id        : `report-wave-time-${seconds}s`,
            className : "report-wave-time",
            center    : [report.epicenterLon, report.epicenterLat],
            radius    : s_dist - report.depth,
            label     : `${seconds} 秒`
          }));
      }

      map.fitBounds(bounds, {
        padding : { top: 64, right: 364, bottom: 64, left: 64 },
        maxZoom : 8.5,
        animate : (localStorage.getItem("MapAnimation") ?? "true") == "true"
      });
    };

    markers.reports[report.identifier]
      .getElement()
      .addEventListener("mouseenter", () => {
        item.addClass("hightlight");
        document.getElementById("reports-panel").querySelector(".scroll-wrapper").scrollTo({
          top      : item.element.offsetTop - document.getElementById("reports-panel").offsetHeight / 2 + item.element.offsetHeight / 2,
          behavior : "smooth"
        });
      });

    markers.reports[report.identifier]
      .getElement()
      .addEventListener("mouseleave", () => {
        item.removeClass("hightlight");
      });

    markers.reports[report.identifier]
      .getElement()
      .addEventListener("click", openReport);

    item.on("mouseenter", () => {
      markers.reports[report.identifier].getElement().classList.add("hightlight");
    });

    item.on("mouseleave", () => {
      markers.reports[report.identifier].getElement().classList.remove("hightlight");
    });

    item.on("click", openReport);

    item.on("contextmenu", function() {
      const time = this.querySelector(".report-time");
      time.style.cursor = "pointer";
      time.style.color = "yellow";

      api.requestReplay([...report.ID, ...report.trem]);

      const replayStartTime = new Date(toISOTimestamp(report.originTime)).getTime() - 3_000;
      let replayTimeOffset = 0;

      const renderReplayRts = async () => {
        renderRtsData(await api.getRts(replayStartTime + replayTimeOffset * 1000), map);
        replayTimeOffset++;
      };

      renderReplayRts();
      replayTimer = setInterval(renderReplayRts, 1000, replayTimeOffset);
    });

    frag.appendChild(item.toElement());
  }

  list.replaceChildren(frag);

  console.log("%c[Reports] Successfully refreshed earthquake reports.", "color: greenyellow");
};

ipcRenderer.on("report:unhide.marker", () => {
  for (const key in markers.reports)
    markers.reports[key].getElement().classList.remove("hide");
});

ipcRenderer.on("report:add.station", (station) => {
  const marker = reportStationMarkerElement(station.stationIntensity);
  marker.style.zIndex = station.stationIntensity;
  markers.reportStations.push(new Marker({
    element: marker,
  })
    .setLngLat([station.stationLon, station.stationLat])
    .addTo(map));
});

ipcRenderer.on("report:clear.station", () => {
  for (const marker of markers.reportStations)
    marker.remove();
  for (const marker of markers.reportWaveTime)
    marker.remove();
});

updateReports();
const refreshReportTimer = (retry) => setTimeout(async () => {
  try {
    await updateReports();
    console.log(`%c[Reports] Next scheduled refresh will be at ${new Date(Date.now() + 300_000).toLocaleTimeString()}, 5 minutes later.`, "color: cornflowerblue");
    refreshReportTimer();
  } catch (error) {
    retry = (retry ?? -1) + 1;

    if (retry > 3) {
      console.warn("[Reports] Retry limit exceeded, skipping.");
      console.warn(`[Reports] Skipped refresh, the next scheduled refresh will be at ${new Date(Date.now() + 300_000).toLocaleTimeString()}, 5 minutes later.`);
      refreshReportTimer();
    } else {
      console.error(`[Reports] Refresh failed with ${error}, ${retry ? `retrying in ${retry * 5} seconds.` : "retrying."}`);
      refreshReportTimer(retry);
    }
  }
}, retry != undefined ? retry * 5000 : 300_000);
refreshReportTimer();

document.getElementById("button-return-to-reports-list").addEventListener("click", () => {
  document.getElementById("reports-list-view").classList.remove("hide");
  ipcRenderer.emit("report:clear.station");
  ipcRenderer.emit("report:unhide.marker");
  map.fitBounds(constants.TaiwanBounds, {
    padding : { top: 24, right: 324, bottom: 24, left: 24 },
    animate : (localStorage.getItem("MapAnimation") ?? "true") == "true"
  });
});
// #endregion

// #region init settings

const initSettings = () => {
  if ((localStorage.getItem("ReportPanelDocking") ?? "false") == "true")
    document.getElementById("reports-panel").classList.add("docked");

  for (const input of document.querySelectorAll("input.setting")) {
    switch (input.type) {
      case "text":
      case "number":
      case "password": {
        input.value = localStorage.getItem(input.getAttribute("data-setting")) ?? "";
        break;
      }

      case "radio": {
        input.checked = input.value == localStorage.getItem(input.getAttribute("data-setting"));
        break;
      }

      case "checkbox": {
        input.checked = localStorage.getItem(input.getAttribute("data-setting")) == "true";
        break;
      }

      default:
        break;
    }

    input.addEventListener("change", function() {
      switch (this.type) {
        case "radio":
        case "text":
        case "number":
        case "password": {
          localStorage.setItem(this.getAttribute("data-setting"), this.value);
          break;
        }

        case "checkbox": {
          localStorage.setItem(this.getAttribute("data-setting"), this.checked);
          break;
        }

        default:
          break;
      }

      switch (this.name) {
        case "ApiKey": {
          api.key = this.value;
          break;
        }

        case "ReportCount":
        case "ReportSource":
        case "ReportTitleStyle": {
          updateReports();
          break;
        }

        case "ReportPanelDocking": {
          if (this.checked)
            document.getElementById("reports-panel").classList.add("docked");
          else
            document.getElementById("reports-panel").classList.remove("docked");
          break;
        }

        default:
          break;
      }
    });
  }
};

initSettings();

// #endregion


// element handlers

for (const btn of document.querySelectorAll("nav > button"))
  btn.addEventListener("click", () => switchView(btn.id, map));
