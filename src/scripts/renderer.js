const maplibre = require("maplibre-gl");
const { setMapLayers, setDefaultMapView } = require("./helpers/map");
const Wave = require("./classes/wave");
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

const api = new (require("./api"))("", map);

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