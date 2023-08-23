const { cross } = require("../factory");
const { Marker } = require("maplibre-gl");
const constants = require("../constants");
const colors = require("./colors");
const { getMagnitudeLevel, getDepthLevel } = require("./utils");
const { ipcRenderer } = require("electron");

const markers = {
  reports: {}
};

const resetReportViewport = (transition = true) => {
  if (!transition) {
    document.getElementById("reports-list-view").style.transition = "none";
    document.getElementById("report-detail-view").style.transition = "none";
  }

  document.getElementById("reports-list-view").classList.remove("hide");
  ipcRenderer.emit("report:clear.station");

  if (!transition)
    setImmediate(() => {
      document.getElementById("reports-list-view").style.transition = "";
      document.getElementById("report-detail-view").style.transition = "";
    });

  document.getElementById("reports-panel").querySelector(".scroll-wrapper").scrollTo({
    top      : 0,
    behavior : transition ? "smooth" : "instant"
  });
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
  ipcRenderer.emit("report:unhide.marker");
  resetReportViewport();

  if (panel) {
    if (!isShown) {
      // from other view
      console.debug(`[View] Switching to ${view}.`);
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

          if ((localStorage.getItem("HideStationReport") ?? "true") == "true")
            map.getContainer().classList.add("hide-rts");

          ipcRenderer.emit("report:unhide.marker");
          resetReportViewport(false);
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
      // toggle view
      console.debug("[View] Toogle view.");
      panel.classList.remove("show");
      button.classList.remove("active");

      map.getContainer().classList.remove("hide-rts");
      ipcRenderer.emit("report:unhide.marker");
      resetReportViewport();

      map.fitBounds(constants.TaiwanBounds, {
        padding  : 24,
        duration : 400,
        animate  : (localStorage.getItem("MapAnimation") ?? "true") == "true"
      });
    }
  } else {
    // home
    console.debug("[View] Switching to None.");
    resetReportViewport();
    for (const p of document.querySelectorAll(".panel"))
      p.classList.remove("show");
    for (const btn of document.querySelectorAll("nav > button"))
      btn.classList.remove("active");

    map.getContainer().classList.remove("hide-rts");
    ipcRenderer.emit("report:unhide.marker");
    resetReportViewport();
  }

};

module.exports = { switchView };