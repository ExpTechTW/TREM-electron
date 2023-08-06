const { setMapLayers, setDefaultMapView, renderRtsData, renderEewData } = require("./helpers/map");
const { START_NOTIFICATION_SERVICE, NOTIFICATION_RECEIVED, NOTIFICATION_SERVICE_STARTED } = require("electron-fcm-push-receiver/src/constants");
const { Marker, Map: MaplibreMap } = require("maplibre-gl");
const { ElementBuilder } = require("./helpers/domhelper");
const { cross } = require("./factory");
const { getMagnitudeLevel, getDepthLevel } = require("./helpers/utils");
const { ipcRenderer } = require("electron/renderer");
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
  renderWorldCopies : false
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
  reports: {}
};

// #region init reports

const updateReports = async () => {
  const reports = await api.getReports();
  const frag = new DocumentFragment();
  const list = document.getElementById("reports-list");

  for (const identifier in markers.reports) {
    markers.reports[identifier].remove();
    delete markers.reports[identifier];
  }

  for (let i = 0, n = reports.slice(0, 50).length, report = reports[i]; i < n; i++, report = reports[i]) {
    const isNumbered = Boolean(report.earthquakeNo % 1000);

    const item = new ElementBuilder()
      .setId(report.identifier)
      .setClass([ "report-item" ])
      // color
      .addChildren(new ElementBuilder()
        .setClass([ "report-color", `int-${constants.Intensities[report.data[0].areaIntensity].value}`, isNumbered ? "has-number" : ""])
        .setStyle("backgroundColor", isNumbered ? colors.getIntensityColor(report.data[0].areaIntensity - 1) : "transparent")
        .setStyle("borderColor", colors.getIntensityColor(report.data[0].areaIntensity - 1))
        .setAttribute("title", `${report.data[0].areaName} ${report.data[0].eqStation[0].stationName}`))
      // location
      .addChildren(new ElementBuilder()
        .setClass([ "report-title" ])
        .setContent(localStorage.getItem("ReportTitleStyle") == "1"
          ? report.location.substring(report.location.indexOf("(") + 3, report.location.indexOf(")"))
          : localStorage.getItem("ReportTitleStyle") == "2"
            ? isNumbered ? `編號 ${report.earthquakeNo}` : "小型有感地震"
            : report.location.substring(report.location.indexOf("(") + 3, report.location.indexOf(")")))
        .setAttribute("title", report.location.split(" (")[0])
        .addChildren(localStorage.getItem("ReportTitleStyle") == "3" && isNumbered
          ? new ElementBuilder("span")
            .setClass([ "report-subtitle" ])
            .setContent(report.earthquakeNo)
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

    // map icon
    if (!markers.reports[report.identifier])
      markers.reports[report.identifier] = new Marker({
        element: cross({
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
          top      : item.offsetTop - document.getElementById("reports-panel").offsetHeight / 2 + item.element.offsetHeight / 2,
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

      for (const id of [...report.ID, ...report.trem]) {
        const data = {
          method  : "POST",
          headers : { "content-type": "application/json" },
          body    : JSON.stringify({
            uuid: localStorage.uuid,
            id,
          }),
        };
        fetch(constants.API.ReplayURL, data)
          .then(() => console.log("posted", id))
          .catch((err) => {
            console.error(err);
          });
      }
    });
    frag.appendChild(item.toElement());
  }

  list.replaceChildren(frag);
};

updateReports();
setInterval(updateReports, 300_000);

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

      default:
        break;
    }

    input.addEventListener("change", function() {
      console.log(this.value);

      switch (this.type) {
        case "radio":
        case "text":
        case "number":
        case "password": {
          localStorage.setItem(this.getAttribute("data-setting"), this.value);
          break;
        }

        default:
          break;
      }

      switch (this.getAttribute("data-setting")) {
        case "ApiKey": {
          api.key = this.value;
          break;
        }

        case "ReportTitleStyle": {
          updateReports();
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
