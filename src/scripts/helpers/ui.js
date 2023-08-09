const { cross } = require("../factory");
const { Marker } = require("maplibre-gl");
const constants = require("../constants");
const colors = require("./colors");
const { getMagnitudeLevel, getDepthLevel } = require("./utils");
const { ipcRenderer } = require("electron");

const markers = {
  reports: {}
};

/**
 * @param {string} view
 * @param {import("maplibre-gl").Map} map
 */
const switchView = (view, map) => {
  let panel, button;
  let isShown = false;

  if (view) {
    panel = document.getElementById(`${view}-panel`);
    button = document.getElementById(`${view}`);
    isShown = panel.classList.contains("show");
  }

  for (const p of document.querySelectorAll(".panel"))
    p.classList.remove("show");

  for (const btn of document.querySelectorAll("nav > button"))
    btn.classList.remove("active");

  map.getContainer().classList.remove("hide-rts");
  ipcRenderer.emit("report:clear.station");

  if (panel) {
    if (!isShown) {
      panel.classList.add("show");
      button.classList.add("active");

      // behaviour for each view on shown
      switch (view) {
        case constants.Views.Reports: {
          map.fitBounds(constants.TaiwanBounds, {
            padding  : { top: 24, right: 324, bottom: 24, left: 24 },
            duration : 400,
            animate  : (localStorage.getItem("MapAnimation") ?? "true") == "true"
          });

          document.getElementById("reports-list-view").style.transition = "none";
          document.getElementById("report-detail-view").style.transition = "none";
          document.getElementById("reports-list-view").classList.remove("hide");
          ipcRenderer.emit("report:unhide.marker");
          setImmediate(() => {
            document.getElementById("reports-list-view").style.transition = "";
            document.getElementById("report-detail-view").style.transition = "";
          });
          map.getContainer().classList.add("hide-rts");
          panel.querySelector(".scroll-wrapper").scrollTo({
            top: 0
          });
          break;
        }

        case constants.Views.Report: {

          break;
        }

        case constants.Views.Forecast: {

          break;
        }

        case constants.Views.Temperature: {

          break;
        }

        case constants.Views.AQI: {

          break;
        }

        case constants.Views.Settings: {
          map.fitBounds(constants.TaiwanBounds, {
            padding  : { top: 24, right: 324, bottom: 24, left: 24 },
            duration : 400,
            animate  : (localStorage.getItem("MapAnimation") ?? "true") == "true"
          });

          break;
        }

        default: break;
      }
    } else {
      panel.classList.remove("show");
      button.classList.remove("active");
      map.getContainer().classList.remove("hide-rts");
      ipcRenderer.emit("report:unhide.marker");
      map.fitBounds(constants.TaiwanBounds, {
        padding  : 24,
        duration : 400,
        animate  : (localStorage.getItem("MapAnimation") ?? "true") == "true"
      });
    }
  } else {
    for (const p of document.querySelectorAll(".panel"))
      p.classList.remove("show");
    for (const btn of document.querySelectorAll("nav > button"))
      btn.classList.remove("active");
    map.getContainer().classList.remove("hide-rts");
    ipcRenderer.emit("report:unhide.marker");
  }

};

module.exports = { switchView };