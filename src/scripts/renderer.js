const { setMapLayers, setDefaultMapView, renderRtsData } = require("./helpers/map");
const { START_NOTIFICATION_SERVICE, NOTIFICATION_RECEIVED, NOTIFICATION_SERVICE_STARTED } = require("electron-fcm-push-receiver/src/constants");
const { ipcRenderer } = require("electron/renderer");
const Wave = require("./classes/wave");
const api = new (require("./api"))(localStorage.getItem("key"));
const maplibre = require("maplibre-gl");
const constants = require("./constants");

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
  localStorage.UUID = token;
});

ipcRenderer.on(NOTIFICATION_RECEIVED, (_, Notification) => {
  if (Notification.data.Data != undefined)
    get_data(JSON.parse(Notification.data.Data), "fcm");
});

api.on("rts", (rts) => renderRtsData(rts, map));
api.getReports().then(console.log);

// test
const w = new Wave(map, {
  type   : "s",
  center : [120.8369472, 23.6996454],
  radius : 10
});
let t = 0;
setInterval(() => {
  if (t > 300)
    w.remove();
  else
    w.setRadius(w.radius + 0.15);
  t++;
}, 100);

console.log(require("./file.js"));