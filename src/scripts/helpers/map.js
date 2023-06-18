const { Map, Marker } = require("maplibre-gl");
const { rtsMarkerElement } = require("../factory");
const { tw_county, tw_town } = require("../../assets/json/geojson");
const Colors = require("./colors");
const data = require("../file.js");
const constants = require("../constants");
const Wave = require("../classes/wave");
const EEW = require("../classes/eew");
const colors = require("./colors");

/**
 * @param {Map} map
 */
const setMapLayers = (map) => {
  map.addSource("tw_county", {
    type      : "geojson",
    data      : tw_county,
    tolerance : 1
  });

  map.addSource("tw_town", {
    type      : "geojson",
    data      : tw_town,
    tolerance : 1
  });

  map.addLayer({
    id     : "county",
    type   : "fill",
    source : "tw_county",
    layout : {},
    paint  : {
      "fill-color"   : Colors.MapBackgroundColor,
      "fill-opacity" : 1
    }
  });

  map.addLayer({
    id     : "town",
    type   : "fill",
    source : "tw_town",
    layout : {
      visibility: "none",
    },
    paint: {
      "fill-color": [
        "match",
        [
          "coalesce",
          ["feature-state", "intensity"],
          0,
        ],
        9,
        colors.getIntensityBgColor(9),
        8,
        colors.getIntensityBgColor(8),
        7,
        colors.getIntensityBgColor(7),
        6,
        colors.getIntensityBgColor(6),
        5,
        colors.getIntensityBgColor(5),
        4,
        colors.getIntensityBgColor(4),
        3,
        colors.getIntensityBgColor(3),
        2,
        colors.getIntensityBgColor(2),
        1,
        colors.getIntensityBgColor(1),
        "transparent",
      ],
      "fill-outline-color": [
        "case",
        [
          ">",
          [
            "coalesce",
            ["feature-state", "intensity"],
            0,
          ],
          0,
        ],
        colors.MapOutlineColor,
        "transparent",
      ],
      "fill-opacity": [
        "case",
        [
          ">",
          [
            "coalesce",
            ["feature-state", "intensity"],
            0,
          ],
          0,
        ],
        1,
        0,
      ],
    },
  });

  map.addLayer({
    id     : "county_outline",
    type   : "line",
    source : "tw_county",
    layout : {},
    paint  : {
      "line-color"   : Colors.MapOutlineColor,
      "line-opacity" : 1,
      "line-width"   : 1
    }
  });

};

const renderRtsData = (rts, map) => {
  for (const uuid in data.station) {
    const id = uuid.split("-")[2];
    const station = data.station[uuid];
    const element = document.getElementById(uuid);

    if (element == null) {
      const marker = rtsMarkerElement();
      marker.id = uuid;
      marker.style.backgroundColor = Colors.getIntensityColor(rts[id]?.i);
      marker.style.outlineColor = id in rts ? "" : Colors.NoDataRtsColor;
      marker.style.zIndex = (rts[id]?.v ?? 0.01) * 100;
      new Marker({ element: marker }).setLngLat([station.Long, station.Lat]).addTo(map);
    } else {
      element.style.backgroundColor = Colors.getIntensityColor(rts[id]?.i);
      element.style.outlineColor = id in rts ? "" : Colors.NoDataRtsColor;
      element.style.zIndex = (rts[id]?.v ?? 0.01) * 100;
    }
  }
};

const renderEewData = (eew, waves, map) => {
  if (!waves[eew.id])
    waves[eew.id] = new EEW(eew, map);
  else waves[eew.id].update(eew);
};

const setDefaultMapView = (map) => {
  map.fitBounds(constants.TaiwanBounds, {
    padding: 24
  });
};

module.exports = { setMapLayers, renderRtsData, renderEewData, setDefaultMapView };
