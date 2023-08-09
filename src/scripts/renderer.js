const { setMapLayers, setDefaultMapView, renderRtsData, renderEewData } = require("./helpers/map");
const { START_NOTIFICATION_SERVICE, NOTIFICATION_RECEIVED, NOTIFICATION_SERVICE_STARTED } = require("electron-fcm-push-receiver/src/constants");
const { Marker, Map: MaplibreMap, LngLatBounds } = require("maplibre-gl");
const { ElementBuilder } = require("./helpers/domhelper");
const { cross, square, reportStationMarkerElement } = require("./factory");
const { getMagnitudeLevel, getDepthLevel } = require("./helpers/utils");
const { ipcRenderer } = require("electron");
const { switchView } = require("./helpers/ui");
const api = new (require("./api"))(localStorage.getItem("ApiKey"));
const colors = require("./helpers/colors");
const constants = require("./constants");

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

api.on("rts", (rts) => renderRtsData(rts, map));
api.on("ntp", (ntp) => {
  map.localServerTimestamp = Date.now();
  map.serverTimestamp = ntp.time;
});
api.on(constants.Events.TremEew, (data) => renderEewData(data, waves, map));
api.on(constants.Events.CwbEew, (data) => renderEewData(data, waves, map));

const markers = {
  reports        : {},
  reportStations : []
};

// #region init reports

const updateReports = async () => {
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

    item.on("mouseenter", () => {
      markers.reports[report.identifier].getElement().classList.add("hightlight");
    });

    item.on("mouseleave", () => {
      markers.reports[report.identifier].getElement().classList.remove("hightlight");
    });

    item.on("click", function() {
      const time = this.querySelector(".report-time");
      time.style.cursor = "pointer";
      time.style.color = "yellow";

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

      // api.requestReplay([...report.ID, ...report.trem]);
      map.fitBounds(bounds, {
        padding : { top: 64, right: 364, bottom: 64, left: 64 },
        maxZoom : 8.5,
        animate : (localStorage.getItem("MapAnimation") ?? "true") == "true"
      });
    });
    frag.appendChild(item.toElement());
  }

  list.replaceChildren(frag);
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
});

updateReports();
setInterval(updateReports, 300_000);

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

        case "MapAnimation": {

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
