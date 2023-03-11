import { argbFromHex, themeFromSourceColor, applyTheme } from "@material/material-color-utilities";
import maplibregl from "maplibre-gl";
import geojson from "../assets/json/geojson";
import constants from "./constants";
import chroma from "chroma-js";
import ExptechAPI from "./api";
import Wave from "./classes/wave";
import EEW from "./classes/eew";

const timer = {};
const grad_i = chroma
  .scale(["#0500A3", "#00ceff", "#33ff34", "#fdff32", "#ff8532", "#fc5235", "#c03e3c", "#9b4544", "#9a4c86", "#b720e9"])
  .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const exptech = new ExptechAPI();

const ready = async () => {
  if (localStorage.getItem("uuid") == null)
    localStorage.setItem("uuid", (await import("uuid")).v4());

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const data = {

    /**
     * @type {Record<string, Station>} stations
     */
    stations : {},
    reports  : await exptech.v1.earthquake.getReports(60)
  };

  const map = new maplibregl.Map({
    container : "map",
    center    : [120.5, 23.6],
    zoom      : 6.75
  });

  map.on("click", () => map.panTo([120.5, 23.6], {
    zoom: 6.75
  }));

  map.addSource("tw_county", {
    type      : "geojson",
    data      : geojson.tw_county,
    tolerance : 1.2
  });

  map.addLayer({
    id     : "tw_county",
    type   : "fill",
    source : "tw_county",
    layout : {},
    paint  : {
      "fill-color"   : "#d0bcff",
      "fill-opacity" : 0.1,
    },
  });

  map.addLayer({
    id     : "tw_county_line",
    type   : "line",
    source : "tw_county",
    layout : {},
    paint  : {
      "line-color" : "#D0BCFF",
      "line-width" : 1,
    },
  });

  /*
  const arealayer = L.geoJSON(geojson.area, {
    pane  : "stations",
    style : {
      stroke : false,
      fill   : false
    },
  }).addTo(map);
*/

  // #region ws

  /**
   * @type {WebSocket}
   */
  let ws;
  let ServerT = new Date(Date.now()), ServerTime = 0;

  const connect = (retryTimeout) => {
    ws = new WebSocket(constants.WebSocketTargetUrl);

    let ping, heartbeat;

    ws.addEventListener("close", () => {
      console.log(`%c[WS]%c WebSocket closed. Reconnect after ${retryTimeout / 1000}s`, "color: blueviolet", "color:unset");
      ws = null;
      setTimeout(() => connect(retryTimeout), retryTimeout);
    });

    ws.addEventListener("error", (err) => {
      console.error(err);
    });

    ws.addEventListener("open", () => {
      ping = setInterval(() => {
        heartbeat = setTimeout(() => {
          console.warn("%c[WS]%c Heartbeat check failed! Closing WebSocket...", "color: blueviolet", "color:unset");
          clearInterval(ping);
          ws.terminate();
        }, 10_000);
      }, 15_000);

      const message = {
        uuid     : localStorage.getItem("uuid"),
        function : "subscriptionService",
        value    : ["trem-rts-v2", "eew-v1"],
      };

      ws.send(JSON.stringify(message));
    });

    ws.addEventListener("message", (raw) => {
      const parsed = JSON.parse(raw.data);

      if (parsed.response == "Connection Succeeded") {
        console.debug("%c[WS]%c WebSocket has connected", "color: blueviolet", "color:unset");
        ServerT = Date.now();
        ServerTime = parsed.time;
      } else if (parsed.response == "Subscription Succeeded") {
        console.debug("%c[WS]%c Subscription succeeded", "color: blueviolet", "color:unset");
      } else if (parsed.type == "ntp") {
        console.debug("%c[WS]%c Heartbeat received", "color: blueviolet", "color:unset");
        ServerT = Date.now();
        ServerTime = parsed.time;
        clearTimeout(heartbeat);
      } else {
        switch (parsed.type) {
          case "trem-rts": rts(parsed.raw); break;
          case "eew-cwb":
          case "trem-eew": eew(parsed); break;
          default: console.log(parsed);
        }
      }
    });
  };

  connect(5000);

  // #endregion

  // #region rts
  /**
   * @type {Record<string, maplibregl.Marker>} 地圖上測站
   */
  const markers = {};

  const fetch_files = async () => {
    try {
      const res = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
      const s = {};

      if (res) {
        for (let i = 0, k = Object.keys(res), n = k.length; i < n; i++) {
          const id = k[i];

          if (res[id].Long > 118)
            s[id.split("-")[2]] = { uuid: id, ...res[id] };
        }

        data.stations = s;
      }
    } catch (error) {
      console.warn("%c[FETCH]%c Failed to load station data!", "color: blueviolet", "color:unset", error);
    }
  };

  await fetch_files();

  timer.stations = setInterval(fetch_files, 300_000);

  let max_id;

  const chartAlerted = [];

  const rts = (rts_data) => {
    let max = { id: null, i: -4 };
    let min = { id: null, i: 8 };
    let sum = 0;
    let count = 0;
    const area = {};
    const alerted = [];

    for (let i = 0, k = Object.keys(data.stations), n = k.length; i < n; i++) {
      const id = k[i];
      const station_data = data.stations[id];

      if (markers[id] instanceof maplibregl.Marker) {
        const el = markers[id].getElement();

        if (id in rts_data) {
          if (!el.classList.contains("has-data"))
            el.classList.add("has-data");

          el.style.backgroundColor = grad_i(rts_data[id].i);

          if (rts_data[id].i > max.i) max = { id, i: rts_data[id].i };

          if (rts_data[id].i < min.i) min = { id, i: rts_data[id].i };

          markers[id].getElement().style.zIndex = rts_data[id].i + 5;

          if (rts_data.Alert && rts_data[id].alert) {
            sum += rts_data[id].i;
            count++;

            let _i = intensity_float_to_int(rts_data[id].i);

            if (_i == 0) _i = 1;

            if (_i > (area[station_data.PGA] ?? 0))
              area[station_data.PGA] = _i;
          }

          if (rts_data[id].alert)
            alerted.push(id);
        } else {
          if (el.classList.contains("has-data"))
            el.classList.remove("has-data");
          el.style.backgroundColor = "";
        }
      } else {
        const element = document.createElement("div");
        element.className = "station-marker";
        element.style.height = "8px";
        element.style.width = "8px";
        element.style.borderRadius = "8px";
        markers[id] = new maplibregl.Marker({ element })
          .setLngLat([station_data.Long, station_data.Lat])
          // .setPopup(new maplibregl.Popup({ closeOnClick: false, closeButton: false }).setHTML(station_tooltip))
          .addTo(map);
      }
    }

    if (max_id != null && max.id != null && max_id != max.id) {
      if (markers[max_id].getElement().classList.contains("max"))
        markers[max_id].getElement().classList.remove("max");

      if (!markers[max.id].getElement().classList.contains("max"))
        markers[max.id].getElement().classList.add("max");
    }

    max_id = max.id;

    const avg = (!count) ? 0 : (sum / count).toFixed(1);

    document.getElementById("max-int-marker").innerText = `max:${max.i}`;
    document.getElementById("min-int-marker").innerText = `min:${min.i}`;
    document.getElementById("avg-int-marker").innerText = `avg:${avg}`;

    document.getElementById("max-int-marker").style.bottom = `${max.i < 0 ? 2 * max.i : max.i < 5 ? 37.1428571428571 * max.i : 18.5714285714286 * max.i + 92.8571428571427}px`;
    document.getElementById("min-int-marker").style.bottom = `${min.i < 0 ? 2 * min.i : min.i < 5 ? 37.1428571428571 * min.i : 18.5714285714286 * min.i + 92.8571428571427}px`;
    document.getElementById("avg-int-marker").style.bottom = `${avg < 0 ? 2 * avg : avg < 5 ? 37.1428571428571 * avg : 18.5714285714286 * avg + 92.8571428571427}px`;

    if (rts_data)
      if (rts_data.Alert && max.i >= 2) {
        if (document.getElementById("min-int-marker").classList.contains("hide")) {
          document.getElementById("avg-int-marker").classList.remove("hide");
          document.getElementById("min-int-marker").classList.remove("hide");
        }
      } else if (!document.getElementById("min-int-marker").classList.contains("hide")) {
        document.getElementById("min-int-marker").classList.add("hide");
        document.getElementById("min-int-marker").classList.add("hide");
      }

    const time = new Date(rts_data.Time || Date.now());
    document.getElementById("time").innerText = `${time.getFullYear()}/${(time.getMonth() + 1) < 10 ? `0${time.getMonth() + 1}` : time.getMonth() + 1}/${time.getDate() < 10 ? `0${time.getDate()}` : time.getDate()} ${time.getHours() < 10 ? `0${time.getHours()}` : time.getHours()}:${time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}:${time.getSeconds() < 10 ? `0${time.getSeconds()}` : time.getSeconds()}`;
  };

  const intensity_float_to_int = function(float) {
    return (float < 0) ? 0
      : (float < 4.5) ? Math.round(float)
        : (float < 5) ? 5
          : (float < 5.5) ? 6
            : (float < 6) ? 7
              : (float < 6.5) ? 8 : 9;
  };

  // #endregion

  // #region eew

  /**
   * @type {Map<string, { p: Wave, s: Wave, e: EEW }>}
   */
  const eewStore = new Map();

  const apiTime = new Date();

  const eew = (eew_data) => {
    if (eewStore.has(eew_data.id)) {
      const e = eewStore.get(eew_data.id);
      e.e.update(eew_data);
    } else {
      const e = new EEW(eew_data, map, true);
      eewStore.set(eew_data.id, { e });
    }

    console.log(eew_data);
  };

  // #endregion

  // #region navigator

  const navigator = document.getElementById("nav-report-list");
  navigator.append(createReportNavItem(data.reports));

  navigator.navigate = (view) => {
    const views = document.getElementById("view");
    for (let i = 0, n = views.children.length;i < n;i++)
      if (views.children[i].classList.contains("current"))
        views.children[i].classList.remove("current");

    view.classList.add("current");
  };

  document.getElementById("nav-map").addEventListener("click", () => navigator.navigate(document.getElementById("map-view")));
  document.getElementById("nav-settings").addEventListener("click", () => navigator.navigate(document.getElementById("settings-view")));

  // #endregion
};

document.addEventListener("DOMContentLoaded", ready);

const createReportNavItem = (reports = []) => {
  const frag = document.createDocumentFragment();

  const makeButton = (report) => {

    // button#map-reports.nav-item(role="navigation")
    //   span.nav-item-icon.material-symbols-rounded summarize
    //   .nav-item-label-container
    //     span.nav-item-label ○○縣○○市
    //     span.nav-item-sublabel 地震資訊

    const data = {
      icon     : "description",
      label    : report.location,
      sublabel : report.originTime,
      number   : (report.earthquakeNo % 1000) ? report.earthquakeNo : null
    };

    data.label = data.label.match(/\(位於(.+)\)/)[1];

    if (report.location.startsWith("地震資訊"))
      data.icon = "info";

    const button = document.createElement("button");
    button.className = "nav-item";
    button.role = "navigation";

    const icon = document.createElement("span");
    icon.className = "nav-item-icon material-symbols-rounded";
    icon.innerText = data.icon;

    const label_container = document.createElement("div");
    label_container.className = "nav-item-label-container";

    const label = document.createElement("div");
    label.className = "nav-item-label";
    label.innerText = data.label;

    const sublabel = document.createElement("div");
    sublabel.className = "nav-item-sublabel";
    sublabel.innerText = data.sublabel;

    label_container.append(label, sublabel);
    button.append(icon, label_container);

    if (data.number) {
      const tag = document.createElement("div");
      tag.className = "nav-item-tag";
      tag.innerText = data.number;
      button.append(tag);
    }

    return button;
  };

  if (Array.isArray(reports))
    reports.forEach(report => frag.append(makeButton(report)));
  else
    frag.append(makeButton(reports));

  return frag;
};