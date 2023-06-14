const { Map } = require("maplibre-gl");
const { cross } = require("../factory");
const constants = require("../constants");

class Wave {

  /**
   * @param {*} lnglat
   * @param {*} radius
   * @param {Map} map
   */
  constructor(map, { type = "p", center = [121, 23.5], radius = 1, circle = true, icon = true, zIndex = 10000 }) {
    this.type = type;
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

    const radiusPx = (this.radius * 2000) / (this._initialZoom * constants.PixelRatio);

    if (circle) {
      this._circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      this._circle.setAttribute("cx", centerPx.x);
      this._circle.setAttribute("cy", centerPx.y);
      this._circle.setAttribute("r", radiusPx);

      if (this.type == "p") {
        this._circle.style.stroke = "cyan";
      } else {
        this._svgBackground = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._svgBackground.style.position = "absolute";
        this._svgBackground.style.pointerEvents = "none";
        this._svgBackground.style.height = "100%";
        this._svgBackground.style.width = "100%";

        this._circleBackground = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this._circleBackground.setAttribute("cx", centerPx.x);
        this._circleBackground.setAttribute("cy", centerPx.y);
        this._circleBackground.setAttribute("r", radiusPx);
        this._circleBackground.style.fill = "url(#pred-gradient)";
        this._circle.style.stroke = "orange";

        this._svgBackground.appendChild(this._circleBackground);
      }

      this._svg.appendChild(this._circle);
    }

    let time;

    if (icon) {
      this._cross = cross({
        scale : 0.3,
        blink : true
      });
      this._cross.style.translate = `${centerPx.x - 11.4}px ${centerPx.y - 11.4}px`;

      const anims = document.getAnimations();

      for (let i = 0; i < anims.length; i++)
        if (anims[i].animationName == "blink")
          if (anims[i].currentTime) {
            time = anims[i].currentTime;
            break;
          }

      this._svg.appendChild(this._cross);
    }

    if (this._svgBackground)
      this.map.getCanvasContainer().prepend(this._svgBackground);
    this.map.getCanvasContainer().appendChild(this._svg);

    const anims = document.getAnimations();

    for (let i = 0; i < anims.length; i++)
      if (anims[i].animationName == "blink")
        if (time) anims[i].currentTime = time;

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

    if (this._circleBackground) {
      this._circleBackground.setAttribute("cx", center.x);
      this._circleBackground.setAttribute("cy", center.y);
      this._circleBackground.setAttribute("r", radius);
    }

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
    if (this._circle)
      this._circle.style.stroke = hasAlerted ? "red" : "orange";

    if (this._circleBackground)
      this._circleBackground.style.fill = hasAlerted ? "url(#alert-gradient)" : "url(#pred-gradient)";
  }

  remove() {
    if (this._circleBackground)
      this._circleBackground.remove();

    if (this._circle)
      this._circle.remove();

    if (this._cross)
      this._cross.remove();

    this._svg.remove();
  }
}

module.exports = Wave;