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
  for (const btn of document.querySelectorAll("nav > button"))
    btn.classList.remove("show");

  const panel = document.getElementById(`${view}-panel`);
  const isShown = panel.classList.contains("show");

  if (!isShown)
    document.getElementById(view).classList.add("show");

  switch (view) {
    case constants.Views.Reports: {
      map.fitBounds(constants.TaiwanBounds, {
        padding: isShown ? 24 : { top: 24, right: 324, bottom: 24, left: 24 }
      });

      caches.match(constants.API.ReportsURL)
        .then((res) => (res) ? res.json() : null)
        .then((reports) => {
          const frag = new DocumentFragment();
          const list = document.getElementById("reports-list");

          if (isShown)
            for (const identifier in markers.reports) {
              markers.reports[identifier].remove();
              delete markers.reports[identifier];
            }
          else
            for (let i = 0, n = reports.slice(0, 100).length, report = reports[i]; i < n; i++, report = reports[i]) {
              const isNumbered = Boolean(report.earthquakeNo % 1000);

              const item = document.createElement("div");
              item.id = report.identifier;
              item.className = "report-item";

              const color = document.createElement("div");
              color.className = `report-color int-${constants.Intensities[report.data[0].areaIntensity].value} ${isNumbered ? "has-number" : ""}`;
              color.style.backgroundColor = isNumbered ? colors.getIntensityColor(report.data[0].areaIntensity - 1) : "transparent";
              color.style.borderColor = colors.getIntensityColor(report.data[0].areaIntensity - 1);
              color.title = `${report.data[0].areaName} ${report.data[0].eqStation[0].stationName}`;

              const location = document.createElement("div");
              location.className = "report-location";
              location.textContent = report.location.substring(report.location.indexOf("(") + 3, report.location.indexOf(")"));
              location.title = report.location.split(" (")[0];

              const time = document.createElement("div");
              time.className = "report-time";
              time.textContent = report.originTime;
              time.title = new Date(report.originTime).toISOString();

              const magnitude = document.createElement("div");
              magnitude.className = "report-magnitude";
              magnitude.textContent = report.magnitudeValue.toFixed(1);
              magnitude.title = constants.Magnitudes[getMagnitudeLevel(report.magnitudeValue)];

              const depth = document.createElement("div");
              depth.className = "report-depth";
              depth.textContent = report.depth;
              depth.title = constants.Depths[getDepthLevel(report.depth)];

              item.appendChild(color);
              item.appendChild(location);
              item.appendChild(time);
              item.appendChild(magnitude);
              item.appendChild(depth);

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
                  item.classList.add("hightlight");
                  panel.querySelector(".scroll-wrapper").scrollTo({
                    top      : item.offsetTop - panel.offsetHeight / 2 + item.offsetHeight / 2,
                    behavior : "smooth"
                  });
                });

              markers.reports[report.identifier]
                .getElement()
                .addEventListener("mouseleave", () => {
                  item.classList.remove("hightlight");
                });

              item.addEventListener("mouseenter", () => {
                markers.reports[report.identifier].getElement().classList.add("hightlight");
              });

              item.addEventListener("mouseleave", () => {
                markers.reports[report.identifier].getElement().classList.remove("hightlight");
              });

              item.addEventListener("click", () => {
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
              frag.appendChild(item);
            }

          list.replaceChildren(frag);
        });

      for (const p of document.querySelectorAll(".panel"))
        p.classList.remove("show");

      map.getContainer().classList.remove("hide-rts");

      if (!isShown) {
        panel.classList.add("show");
        map.getContainer().classList.add("hide-rts");
      }

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

      break;
    }

    default: break;
  }
};

module.exports = { switchView };