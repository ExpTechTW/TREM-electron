const { Map } = require("maplibre-gl");
const constants = require("../constants");

class Circle {
  constructor(map, { id, className = "", center = [121, 23.5], radius = 1, label, zIndex = 0 }) {
    this.id = id;
    this.lnglat = center;
    this.radius = radius;
    this.zIndex = zIndex;
    this.map = map;

    this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svg.style.position = "absolute";
    this._svg.style.pointerEvents = "none";
    this._svg.style.height = "100%";
    this._svg.style.width = "100%";
    this._svg.style.zIndex = this.zIndex;

    this._svg.classList.add(...className.split(" "));

    const centerPx = this.map.project(this.lnglat);

    this._initialZoom = this.map.getZoom();

    const radiusPx = (this.radius * 2000) / (this._initialZoom * constants.PixelRatio);

    this._circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this._circle.setAttribute("cx", centerPx.x);
    this._circle.setAttribute("cy", centerPx.y);
    this._circle.setAttribute("r", radiusPx);

    if (label) {
      this._label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      this._label.setAttribute("x", centerPx.x + radiusPx);
      this._label.setAttribute("y", centerPx.y);
      this._label.textContent = label;

      this._svg.appendChild(this._label);
    }

    this._svg.appendChild(this._circle);

    this.map.getCanvasContainer().appendChild(this._svg);

    this.map.on("move", this._updateCircle.bind(this));
    this.map.on("zoom", this._updateCircle.bind(this));
  }

  _updateCircle() {
    const center = this.map.project(this.lnglat);
    const zoom = this.map.getZoom();
    const radius = (this.radius * 2000) / ((this._initialZoom * constants.PixelRatio) * Math.pow(2, this._initialZoom - zoom));

    if (this._circle) {
      this._circle.setAttribute("cx", center.x);
      this._circle.setAttribute("cy", center.y);
      this._circle.setAttribute("r", radius);
    }

    if (this._label) {
      this._label.setAttribute("x", center.x + radius);
      this._label.setAttribute("y", center.y);
    }
  }

  setLngLat(newLnglat) {
    this.lnglat = newLnglat;
    this._updateCircle();
  }

  setRadius(radius) {
    this.radius = radius;
    this._updateCircle();
  }

  setZIndex(newZIndex) {
    this.zIndex = newZIndex;
    this._svg.style.zIndex = this.zIndex;
  }

  remove() {
    if (this._circle)
      this._circle.remove();

    if (this._label)
      this._label.remove();

    this._svg.remove();
  }
}

module.exports = Circle;