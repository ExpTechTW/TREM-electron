# leaflet-geojson-vt

It is a open-source leaflet plugin which generate the vector tiles for geojson data. It has the dev-dependency of [geojson-vt-leaflet](https://github.com/handygeospatial/geojson-vt-leaflet).

## Demo

[DEMO](https://iamtekson.github.io/leaflet-geojson-vt/demo/)

## Installation and setup

- Using NPM:

```js
npm install leaflet-geojson-vt
```

- Quick use:

```js
<script src="https://unpkg.com/geojson-vt@3.2.0/geojson-vt.js"></script>
<script src="[path to js]/leaflet-geojson-vt.js"></script>
```

## Usage

```js
var options = {
  maxZoom: 16,
  tolerance: 3,
  debug: 0,
  style: {
    fillColor: "#1EB300",
    color: "#F2FF00",
  },
};
var vtLayer = L.geoJson.vt(geojson, options).addTo(map);
```

Apart from an `Object`, a `Function` can also be assigned to `options.style` in order to handle style dynamically.

```js
var options = {
  maxZoom: 16,
  tolerance: 3,
  debug: 0,
  style: (properties) => {
    if (properties.ADM1_PCODE == 'NP07') {
      return  {fillColor:"#0F0",color:"#F2FF00"};
    } else {
      return  {fillColor:"#1EB300",color:"#F2FF00"};
    }
  }
};
```

Options are included with [geojson-vt options](https://github.com/mapbox/geojson-vt#options) and [L.geojson style](http://leafletjs.com/reference.html#path-options).

The following are the default options from geojson-vt.

```js
var tileIndex = geojsonvt(data, {
    maxZoom: 14,  // max zoom to preserve detail on
    tolerance: 3, // simplification tolerance (higher means simpler)
    extent: 4096, // tile extent (both width and height)
    buffer: 64,   // tile buffer on each side
    debug: 0      // logging level (0 to disable, 1 or 2)

    indexMaxZoom: 4,        // max zoom in the initial tile index
    indexMaxPoints: 100000, // max number of points per tile in the index
    solidChildren: false    // whether to include solid tile children in the index
});
```

## Dependency

- [geojson-vt](https://github.com/mapbox/geojson-vt)

## License

[LICENSE](LICENSE)
