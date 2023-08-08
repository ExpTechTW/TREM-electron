const { cross } = require("../factory");
const { Marker } = require("maplibre-gl");
const constants = require("../constants");
const colors = require("./colors");
const { getMagnitudeLevel, getDepthLevel } = require("./utils");

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

  if (panel) {
    if (!isShown) {
      panel.classList.add("show");
      button.classList.add("active");

      // behaviour for each view on shown
      switch (view) {
        case constants.Views.Reports: {
          map.fitBounds(constants.TaiwanBounds, {
            padding  : { top: 24, right: 324, bottom: 24, left: 24 },
            duration : 400
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
            duration : 400
          });

          break;
        }

        default: break;
      }
    } else {
      panel.classList.remove("show");
      button.classList.remove("active");
      map.getContainer().classList.remove("hide-rts");
      map.fitBounds(constants.TaiwanBounds, {
        padding  : 24,
        duration : 400
      });
    }
  } else {
    for (const p of document.querySelectorAll(".panel"))
      p.classList.remove("show");
    for (const btn of document.querySelectorAll("nav > button"))
      btn.classList.remove("active");
    map.getContainer().classList.remove("hide-rts");
  }

};

module.exports = { switchView };