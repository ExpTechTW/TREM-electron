const maplibre = require("maplibre-gl");
const { setMapLayers, setDefaultMapView } = require("./helpers/map");
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

console.log(require("./file.js"));