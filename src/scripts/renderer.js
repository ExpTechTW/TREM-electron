const { setMapLayers, setDefaultMapView, renderRtsData, renderEewData } = require("./helpers/map");
const { START_NOTIFICATION_SERVICE, NOTIFICATION_RECEIVED, NOTIFICATION_SERVICE_STARTED } = require("electron-fcm-push-receiver/src/constants");
const { Marker, Map: MaplibreMap, LngLatBounds } = require("maplibre-gl");
const { ElementBuilder } = require("./helpers/domhelper");
const { cross, reportStationMarkerElement } = require("./factory");
const { getMagnitudeLevel, getDepthLevel, toISOTimestamp, toFormattedTimeString, extractLocationFromString } = require("./helpers/utils");
const { ipcRenderer } = require("electron");
const { switchView } = require("./helpers/ui");
const api = new (require("./api"))(localStorage.getItem("ApiKey"));
const colors = require("./helpers/colors");
const constants = require("./constants");
const Circle = require("./classes/circle");
const EEW = require("./classes/eew");
const { playAudio } = require("./helpers/audio");
// const Wave = require("./classes/wave");

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

setInterval(async () => {
  const rts = await api.getRts(Date.now());

  if (!replayTimer) {
    renderRtsData(rts.station, map);

    document.getElementById("current-time").textContent = toFormattedTimeString(Date.now() - map.time?.localServerTimestamp + map.time?.serverTimestamp);
  }
}, 1000);

api.on(constants.Events.Ntp, (ntp) => {
  map.time ??= {
    get localServerTimestamp() {
      return (map._replayTimestamp != null) ? map._localReplayTimestamp : map._localServerTimestamp;
    },
    set localServerTimestamp(value) {
      map._localServerTimestamp = value;
    },
    get serverTimestamp() {
      return (map._replayTimestamp != null) ? map._replayTimestamp : map._serverTimestamp;
    },
    set serverTimestamp(value) {
      map._serverTimestamp = value;
    },
    get replayTimestamp() {
      return map._replayTimestamp;
    },
    set replayTimestamp(value) {
      map._replayTimestamp = value + 1000;
      map._localReplayTimestamp = Date.now();
    },
    now() {
      return this.serverTimestamp + (Date.now() - this.localServerTimestamp);
    }
  };
  map.time.localServerTimestamp = Date.now();
  map.time.serverTimestamp = ntp.time;
});

api.on(constants.Events.Report, (report) => {
  if ((localStorage.getItem("AudioPlayReport") ?? constants.DefaultSettings.AudioPlayReport) == "true")
    playAudio("report", localStorage.getItem("AudioReportVolume") ?? constants.DefaultSettings.AudioReportVolume);

  if ((localStorage.getItem("ViewSwitchReport") ?? constants.DefaultSettings.ViewSwitchReport) == "true")
    openReport(report.raw);
});

api.on(constants.Events.TremEew, (data) => renderEewData(data, map));
api.on(constants.Events.CwbEew, (data) => renderEewData(data, map));

const markers = {
  reports        : {},
  reportStations : [],
  reportWaveTime : []
};

// #region init reports

const openReport = (report) => {
  const isNumbered = Boolean(report.earthquakeNo % 1000);
  const isTYA = report.location.startsWith("地震資訊");

  for (const key in markers.reports)
    if (key != report.identifier)
      markers.reports[key].getElement().classList.add("hide");

  document.getElementById("report-detail-subtitle").textContent = isTYA ? "地震資訊" : isNumbered ? `編號 ${report.earthquakeNo}` : "小型有感地震";
  document.getElementById("report-detail-title").textContent = extractLocationFromString(report.location);
  document.getElementById("report-detail-location").textContent = isTYA ? report.location.substring(report.location.indexOf("(") + 1, report.location.indexOf(")")) : report.location.substring(0, report.location.indexOf("(") - 1) || report.location;
  document.getElementById("report-detail-longitude").textContent = Math.abs(report.epicenterLon);
  document.getElementById("report-detail-longitude-unit").textContent = report.epicenterLon > 0 ? "E" : "W";
  document.getElementById("report-detail-latitude").textContent = Math.abs(report.epicenterLat);
  document.getElementById("report-detail-latitude-unit").textContent = report.epicenterLat > 0 ? "N" : "S";
  document.getElementById("report-detail-time").textContent = report.originTime;
  document.getElementById("report-detail-magnitude").textContent = report.magnitudeValue.toFixed(1);
  document.getElementById("report-detail-depth").textContent = report.depth;
  document.getElementById("reports-list-view").classList.add("hide");

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
        .addChildren(new ElementBuilder("span")
          .setClass([ "report-station-distance" ])
          .setContent(`震央距 ${station.distance} km`)))
      .addChildren(new ElementBuilder()
        .setClass([ "report-station-intensity" ])
        .setContent(constants.Intensities[station.stationIntensity].text))
      .toElement());

    ipcRenderer.emit("report:add.station", station);
    bounds.extend([station.stationLon, station.stationLat]);
  }

  document.getElementById("report-station-list").replaceChildren(fragment);

  // wave time circles
  if (!isTYA) {
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
  }

  map.fitBounds(bounds, {
    padding : { top: 64, right: 364, bottom: 64, left: 64 },
    maxZoom : 8.5,
    animate : (localStorage.getItem("MapAnimation") ?? constants.DefaultSettings.MapAnimation) == "true"
  });
};

const updateReports = async () => {
  console.log("%c[Reports] Refreshing earthquake reports...", "color: cornflowerblue");

  const reports = (await api.getReports())
    .filter((v) => ((localStorage.getItem("ReportShowCWB") ?? constants.DefaultSettings.ReportShowCWB) == "true") && !v.location.startsWith("地震資訊") || ((localStorage.getItem("ReportShowTYA") ?? constants.DefaultSettings.ReportShowTYA) == "true") && v.location.startsWith("地震資訊"));
  const frag = new DocumentFragment();
  const list = document.getElementById("reports-list");

  for (const identifier in markers.reports) {
    markers.reports[identifier].remove();
    delete markers.reports[identifier];
  }

  for (let i = 0, n = reports.slice(0, +(localStorage.getItem("ReportCount") ?? constants.DefaultSettings.ReportCount)).length, report = reports[i]; i < n; i++, report = reports[i]) {
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
          ((localStorage.getItem("ReportTitleStyle") ?? constants.DefaultSettings.ReportTitleStyle) == "1")
            ? extractLocationFromString(report.location)
            : ((localStorage.getItem("ReportTitleStyle") ?? constants.DefaultSettings.ReportTitleStyle) == "2")
              ? isTYA ? "地震資訊" : isNumbered ? `編號 ${report.earthquakeNo}` : "小型有感地震"
              : extractLocationFromString(report.location))
        .setAttribute("title", extractLocationFromString(report.location))
        .addChildren(
          ((localStorage.getItem("ReportTitleStyle") ?? constants.DefaultSettings.ReportTitleStyle) == "3")
            ? new ElementBuilder("span")
              .setClass([ "report-subtitle" ])
              .setContent(isTYA ? "地震資訊" : isNumbered ? report.earthquakeNo : "小型有感地震")
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
        animate : (localStorage.getItem("MapAnimation") ?? constants.DefaultSettings.MapAnimation) == "true"
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
      .addEventListener("click", () => openReport(report));

    item.on("mouseenter", () => {
      markers.reports[report.identifier].getElement().classList.add("hightlight");
    });

    item.on("mouseleave", () => {
      markers.reports[report.identifier].getElement().classList.remove("hightlight");
    });

    item.on("click", () => openReport(report));

    item.on("contextmenu", function() {
      const time = this.querySelector(".report-time");
      time.style.cursor = "pointer";
      time.style.color = "yellow";

      // api.requestReplay([...report.ID, ...report.trem]);

      map.time.replayTimestamp = new Date(toISOTimestamp(report.originTime)).getTime();
      const replayStartTime = map.time.replayTimestamp - 3_000;
      let replayTimeOffset = 0;
      let noDataTimeOffset = 0;

      const renderReplay = async () => {
        try {
          renderRtsData(await api.getRts(replayStartTime + replayTimeOffset * 1000), map);
          document.getElementById("current-time").textContent = toFormattedTimeString(replayStartTime + replayTimeOffset * 1000);
        } catch (error) {
          noDataTimeOffset++;

          if (noDataTimeOffset >= 5)
            renderRtsData({}, map);
        }

        for (const eewdata of (await api.getEarthquake(~~((replayStartTime + replayTimeOffset * 1000) / 1000))).eew)
          renderEewData(eewdata, map);

        replayTimeOffset++;
      };

      renderReplay();
      replayTimer = setInterval(renderReplay, 1000, replayTimeOffset);
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
  markers.reportStations = [];
  for (const marker of markers.reportWaveTime)
    marker.remove();
  markers.reportWaveTime = [];
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
  if ((localStorage.getItem("ReportPanelDocking") ?? constants.DefaultSettings.ReportPanelDocking) == "true")
    document.getElementById("reports-panel").classList.add("docked");

  if ((localStorage.getItem("ApiKey") ?? constants.DefaultSettings.ApiKey) == "") {
    document.getElementById("report-source-choice2").disabled = true;
    localStorage.setItem("ReportShowTYA", "false");
  }

  for (const input of document.querySelectorAll("input.setting")) {
    const settingKey = input.getAttribute("data-setting");

    switch (input.type) {
      case "text":
      case "number":
      case "range":
      case "password": {
        input.value = localStorage.getItem(settingKey) ?? constants.DefaultSettings[settingKey];
        break;
      }

      case "radio": {
        input.checked = input.value == (localStorage.getItem(settingKey) ?? constants.DefaultSettings[settingKey]);
        break;
      }

      case "checkbox": {
        input.checked = (localStorage.getItem(settingKey) ?? constants.DefaultSettings[settingKey]) == "true";
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
        case "range":
        case "password": {
          localStorage.setItem(settingKey, this.value);
          break;
        }

        case "checkbox": {
          localStorage.setItem(settingKey, this.checked);
          break;
        }

        default:
          break;
      }

      switch (this.name) {
        case "ApiKey": {
          api.key = this.value;

          if ((this.value ?? constants.DefaultSettings.ApiKey) == "") {
            document.getElementById("report-source-choice2").disabled = true;
            document.getElementById("report-source-choice2").checked = false;
            localStorage.setItem("ReportShowTYA", "false");
            updateReports();
          } else {
            document.getElementById("report-source-choice2").disabled = false;
          }

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

        case "AudioVolume": {
          playAudio(this.getAttribute("data-audio"), this.value);
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

document.addEventListener("keydown", (ev) => {
  if (ev.key == "F12")
    ipcRenderer.send("win:screenshot");

});

/*
  new Wave(map,
    {
      center : [121.53697954537512, 25.299654023819514],
      type   : "s",
      radius : 384.63
    });
*/