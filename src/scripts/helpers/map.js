const { Map: MapLibreMap, Marker, Popup } = require("maplibre-gl");
const { rtsMarkerElement } = require("../factory");
const { tw_county, tw_town, area } = require("../../assets/json/geojson");
const Colors = require("./colors");
const data = require("../file.js");
const constants = require("../constants");
const Wave = require("../classes/wave");
const EEW = require("../classes/eew");
const colors = require("./colors");
const { switchView } = require("./ui");
const { playAudio } = require("./audio");
const { convertToIntensityInteger } = require("./utils");

/**
 * @param {MapLibreMap} map
 */
const setMapLayers = (map) => {
  map.addSource("tw_county", {
    type      : "geojson",
    data      : tw_county,
    tolerance : 1
  });

  map.addSource("tw_area", {
    type : "geojson",
    data : area,
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
      "line-width"   : 0.6
    }
  });

  map.addLayer({
    id     : "area",
    type   : "line",
    source : "tw_area",
    paint  : {
      "line-color": [
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
        "#6B7979",
      ],
      "line-width"   : 3,
      "line-opacity" : [
        "case",
        [
          ">=",
          [
            "coalesce",
            ["feature-state", "intensity"],
            -1,
          ],
          0,
        ],
        1,
        0,
      ],
    },
    layout: {
      visibility: "none",
    },
  });

  map.on("wheel", (e) => {
    if ((localStorage.getItem("MapAnimation") ?? "true") != "true") {
      e.preventDefault();

      if (e.originalEvent.deltaY > 0)
        map.setZoom(map.getZoom() - 0.5);
      else
        map.setZoom(map.getZoom() + 0.5);
    }
  });
};

let maxIntensity = 0;
let maxIntensityMap = {};
let audioIntensity = -1;
let detected_list = {};

const renderRtsData = (rts, map) => {
  let newMaxIntensity = -5;
  detected_list = {};

  if (rts.Alert == false) {
    maxIntensity = 0;
    maxIntensityMap = {};
    audioIntensity - 1;
  }

  for (const uuid in data.station) {
    const id = uuid.split("-")[2];
    const station = data.station[uuid];
    const element = document.getElementById(uuid);

    if (rts[id]?.i > newMaxIntensity)
      newMaxIntensity = rts[id].i;

    if (rts.Alert)
      if (rts[id]?.v && rts[id].v > (maxIntensityMap[id]?.v ?? -5))
        maxIntensityMap[id] = {
          v         : rts[id].v,
          // sys time, replay time doesn't matter
          timestamp : Date.now()
        };

    if (element == null) {
      const marker = rtsMarkerElement();
      marker.id = uuid;
      marker.style.backgroundColor = ((localStorage.getItem("RtsMode") ?? constants.DefaultSettings.RtsMode) == "i") ? Colors.getIntensityColor(rts[id]?.i) : Colors.getAccerateColor(rts[id]?.i);
      marker.style.outlineColor = id in rts ? "" : Colors.NoDataRtsColor;
      marker.style.zIndex = ((localStorage.getItem("RtsMode") ?? constants.DefaultSettings.RtsMode) == "i") ? ((rts[id]?.i ?? -5) + 5) * 50 : (rts[id]?.v ?? 0.01) * 100;
      new Marker({ element: marker }).setLngLat([station.Long, station.Lat]).addTo(map);
    } else {
      const intensity = convertToIntensityInteger(rts[id]?.i);
      element.classList.remove("intensity-0", "intensity-1", "intensity-2", "intensity-3", "intensity-4", "intensity-5", "intensity-6", "intensity-7", "intensity-8", "intensity-9");

      if (maxIntensityMap[id]?.timestamp)
        if ((Date.now() - maxIntensityMap[id].timestamp) < 5_000) {
          if (!element.classList.contains("alert"))
            element.classList.add("alert");
        } else {
          element.classList.remove("alert");
        }

      if (intensity)
        element.classList.add(`intensity-${intensity.value}`);

      element.style.backgroundColor = ((localStorage.getItem("RtsMode") ?? constants.DefaultSettings.RtsMode) == "i") ? Colors.getIntensityColor(rts[id]?.i) : Colors.getAccerateColor(rts[id]?.i);
      element.style.outlineColor = id in rts ? "" : Colors.NoDataRtsColor;
      element.style.zIndex = ((localStorage.getItem("RtsMode") ?? constants.DefaultSettings.RtsMode) == "i") ? ((rts[id]?.i ?? -5) + 5) * 50 : (rts[id]?.v ?? 0.01) * 100;
    }

    // 檢知框框

    if (rts[id]?.i && (rts[id].i > 0 || rts[id].alert)) {
      detected_list[station.PGA] ??= {
        intensity : rts[id].i,
        time      : 0,
      };

      if ((detected_list[station.PGA].intensity ?? 0) < rts[id].i)
        detected_list[station.PGA].intensity = rts[id].i;
      detected_list[station.PGA].time = Date.now();
    }
  }

  const areas = area.features.reduce((acc, v) => (acc[v.id] = v.geometry.coordinates[0], acc), {});

  if (Object.keys(detected_list).length) {
    for (let index = 0, areaIds = Object.keys(detected_list), areaId = areaIds[0]; index < areaIds.length; index++, areaId = areaIds[index])
      if (!detected_list[areaId].passed) {
        let passed = false;

        if (Object.keys(eewList).length)
          for (const waveKey in eewList) {
            if (!eewList[waveKey].hasWaves) continue;

            let SKIP = 0;

            for (let i = 0; i < 4; i++) {
              const dis = (
                ((areas[areaId][i][0] - eewList[waveKey].epicenter.latitude) * 111) ** 2
                + ((areas[areaId][i][1] - eewList[waveKey].epicenter.longitude) * 101) ** 2) ** (1 / 2);

              if (eewList[waveKey].s.radius > dis) SKIP++;
            }

            if (SKIP >= 4) {
              passed = true;
              break;
            }
          }

        if (passed) {
          detected_list[areaId].passed = true;
          clearAreaIntensity(areaId, map);
        } else {
          setAreaIntensity(areaId, ~~detected_list[areaId]?.intensity, map);
        }
      }
  } else {
    clearAreaIntensity(null, map);
  }

  if (newMaxIntensity > maxIntensity) {
    maxIntensity = newMaxIntensity;

    if (rts.Alert)
      if (newMaxIntensity > 4) {
        if (audioIntensity < 2)
          playAudio("int2", localStorage.getItem("AudioInt2Volume") ?? constants.DefaultSettings.AudioInt2Volume);

        switchView(null, map);
        audioIntensity = 2;
      } else if (newMaxIntensity > 2) {
        if (audioIntensity < 1)
          playAudio("int1", localStorage.getItem("AudioInt1Volume") ?? constants.DefaultSettings.AudioInt1Volume);

        switchView(null, map);
        audioIntensity = 1;
      } else if (newMaxIntensity > 0) {
        if (audioIntensity < 0)
          playAudio("int0", localStorage.getItem("AudioInt0Volume") ?? constants.DefaultSettings.AudioInt0Volume);

        switchView(null, map);
        audioIntensity = 0;
      }
  }
};

const eewList = {};

const renderEewData = (eew, map) => {
  if (!Object.keys(eewList).length)
    switchView(null, map);

  document.body.classList.add("has-eew");

  if (eew.id in eewList) {
    if (eew.number > eewList[eew.id].version)
      eewList[eew.id].update(eew, eewList);
  } else {
    eewList[eew.id] = new EEW(eew, map, eewList);
  }
};

let areaMap = new Map();
let areaBlinkTimer;

const setAreaIntensity = (id, intensity, map) => {
  if (areaMap.get(id) == intensity) return;
  map.setFeatureState({
    source: "tw_area",
    id,
  }, { intensity });
  areaMap.set(id, intensity);

  if (!areaBlinkTimer) {
    map.setLayoutProperty("area", "visibility", "visible");

    areaBlinkTimer = setInterval(() => {
      if (map.getLayoutProperty("area", "visibility") == "none")
        map.setLayoutProperty("area", "visibility", "visible");
      else
        map.setLayoutProperty("area", "visibility", "none");
    }, 500);
  }
};

const clearAreaIntensity = (id, map) => {
  if (id) {
    map.removeFeatureState({ source: "tw_area", id });
    areaMap.delete(id);
  } else {
    map.removeFeatureState({ source: "tw_area" });
    areaMap = new Map();
  }

  if (!areaMap.size) {
    if (areaBlinkTimer)
      clearTimeout(areaBlinkTimer);
    map.setLayoutProperty("area", "visibility", "none");
  }
};

const setDefaultMapView = (map) => {
  map.fitBounds(constants.TaiwanBounds, {
    padding : 24,
    animate : (localStorage.getItem("MapAnimation") ?? "true") == "true"
  });
};

module.exports = { setMapLayers, renderRtsData, renderEewData, setDefaultMapView };
