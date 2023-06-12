const { Map, Marker } = require("maplibre-gl");
const { rtsMarkerElement } = require("../factory");
const { tw_county } = require("../../assets/json/geojson");
const Colors = require("./colors");
const data = require("../file.js");

/**
 * @param {Map} map
 */
const setMapLayers = (map) => {
  map.addSource("tw_county", {
    type      : "geojson",
    data      : tw_county,
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
      marker.style.backgroundColor = Colors.IntensityColor(rts[id]?.i);
      marker.style.outlineColor = id in rts ? "" : Colors.NoDataRtsColor;
      marker.style.zIndex = (rts[id]?.v ?? 0.01) * 100;
      new Marker({ element: marker }).setLngLat([station.Long, station.Lat]).addTo(map);
    } else {
      element.style.backgroundColor = Colors.IntensityColor(rts[id]?.i);
      element.style.outlineColor = id in rts ? "" : Colors.NoDataRtsColor;
      element.style.zIndex = (rts[id]?.v ?? 0.01) * 100;
    }
  }
};

const setDefaultMapView = (map) => {
  map.fitBounds([[119.4, 25.35], [122.22, 21.9]]);
};

module.exports = { setMapLayers, renderRtsData, setDefaultMapView };
