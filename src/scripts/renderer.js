const { setMapLayers, setDefaultMapView, renderRtsData, renderEewData } = require("./helpers/map");
const { START_NOTIFICATION_SERVICE, NOTIFICATION_RECEIVED, NOTIFICATION_SERVICE_STARTED } = require("electron-fcm-push-receiver/src/constants");
const { ipcRenderer } = require("electron/renderer");
const Wave = require("./classes/wave");
const api = new (require("./api"))(localStorage.getItem("key"));
const maplibre = require("maplibre-gl");
const constants = require("./constants");
const { switchView } = require("./helpers/ui");

const map = new maplibre.Map({
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

setInterval(() => {
  api.getReports().then(console.log);
}, 60_000);


// element handlers

for (const btn of document.querySelectorAll("nav > button"))
  btn.addEventListener("click", () => switchView(btn.id, map));


// test
/*
map.once("idle", () => {
  const p = new Wave(map, {
    type      : "p",
    center    : [120.8369472, 23.6996454],
    radius    : 22,
    magnitude : 3.2,
    depth     : 20,
    location  : "aaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  });
  const s = new Wave(map, {
    type   : "s",
    center : [120.8369472, 23.6996454],
    radius : 10
  });

  let t = 0;
  setInterval(() => {
    if (t > 600) {
      p.remove();
      s.remove();
    } else {
      p.setRadius(p.radius + 0.22);
      s.setRadius(s.radius + 0.14);
    }

    t++;
  }, 100);
});

  */