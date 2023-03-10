import cross from "../factory";

class Wave {

  /**
   * @param {*} lnglat
   * @param {*} radius
   * @param {Map} map
   */
  constructor(map, { center = [121, 23.5], radius = 1, icon = false, zIndex = 10000 }) {
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

    const centerPx = this.map.project(this.lnglat);

    this._initialZoom = this.map.getZoom();

    const radiusPx = (this.radius * 2000) / (this._initialZoom * 104.41103392);

    this._circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this._circle.id = "test-circle";
    this._circle.setAttribute("cx", centerPx.x);
    this._circle.setAttribute("cy", centerPx.y);
    this._circle.setAttribute("r", radiusPx);
    this._circle.style.fill = "url(#pred-gradient)";
    this._circle.style.stroke = "orange";

    this._svg.appendChild(this._circle);

    if (icon) {
      this._cross = cross({ scale: 0.3 });
      this._cross.style.translate = `${centerPx.x - 11.4}px ${centerPx.y - 11.4}px`;

      this._svg.appendChild(this._cross);
    }

    this.map.getCanvasContainer().appendChild(this._svg);

    this.map.on("move", this._updateCircle.bind(this));
    this.map.on("zoom", this._updateCircle.bind(this));
  }

  _updateCircle() {
    const center = this.map.project(this.lnglat);
    const zoom = this.map.getZoom();
    const radius = (this.radius * 2000) / ((this._initialZoom * 104.41103392) * Math.pow(2, this._initialZoom - zoom));
    this._circle.setAttribute("cx", center.x);
    this._circle.setAttribute("cy", center.y);
    this._circle.setAttribute("r", radius);

    if (this._cross)
      this._cross.style.translate = `${center.x - 11.4}px ${center.y - 11.4}px`;
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

  setAlert(hasAlerted) {
    this._circle.style.fill = hasAlerted ? "url(#alert-gradient)" : "url(#pred-gradient)";
    this._circle.style.stroke = hasAlerted ? "red" : "orange";
  }

  remove() {
    this._svg.remove();
    this._circle.remove();
  }
}

export default Wave;