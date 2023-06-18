const { Map } = require("maplibre-gl");
const { cross } = require("../factory");
const constants = require("../constants");
const { checkOverlap } = require("../helpers/utils");
const { getMagnitudeColor, getDepthColor } = require("../helpers/colors");

class Wave {

  /**
   * @param {*} lnglat
   * @param {*} radius
   * @param {Map} map
   */
  constructor(map, { id, type = "p", center = [121, 23.5], radius = 1, circle = true, icon = true, zIndex = 10000, model = "EEW", location = "", magnitude = 0, depth = 0 }) {
    this.id = id;
    this.type = type;
    this.lnglat = center;
    this.radius = radius;
    this.zIndex = zIndex;
    this.model = model;
    this.location = location;
    this.magnitude = magnitude;
    this.depth = depth;
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

    if (this.type == "p") {
      let x = centerPx.x + 10 * this.map.getZoom();
      let y = centerPx.y - 5 * this.map.getZoom();
      let testNext = false;

      const labelWidth = 120 / 2;

      // tests if top right is placeable
      if (checkOverlap(x + labelWidth, y, "cross-label", `${this.id}-label`)) {
        x = centerPx.x - 10 * this.map.getZoom();
        y = centerPx.y - 5 * this.map.getZoom();
        testNext = true;
        console.log("cant place at top right");
      }

      // tests if top left is placeable
      if (testNext && checkOverlap(x - labelWidth, y, "cross-label", `${this.id}-label`)) {
        x = centerPx.x + 10 * this.map.getZoom();
        y = centerPx.y + 5 * this.map.getZoom();
      } else {
        testNext = false;
      }

      // tests if bottom right is placeable
      if (testNext && checkOverlap(x + labelWidth, y, "cross-label", `${this.id}-label`)) {
        x = centerPx.x - 10 * this.map.getZoom();
        y = centerPx.y + 5 * this.map.getZoom();
      } else {
        testNext = false;
      }

      // tests if bottom left is placeable
      if (testNext && checkOverlap(x - labelWidth, y, "cross-label", `${this.id}-label`)) {
        x = centerPx.x + 10 * this.map.getZoom();
        y = centerPx.y - 5 * this.map.getZoom();
      }

      if (!this._labelLine) {
        this._labelLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this._labelLine.classList.add("label-line");
        this._labelLine.setAttribute("x1", centerPx.x + this.map.getZoom());
        this._labelLine.setAttribute("y1", centerPx.y - this.map.getZoom());
        this._labelLine.setAttribute("x2", x);
        this._labelLine.setAttribute("y2", y);
        this._svg.appendChild(this._labelLine);
      }

      if (!this._label) {
        this._label = document.createElement("div");
        this._label.id = `${this.id}-label`;
        this._label.classList.add("cross-label");
        this._label.style.position = "absolute";

        if (y > centerPx.y) {
          this._label.style.bottom = `calc(100% - ${y}px - 44px)`;
          this._label.style.top = "";
        } else {
          this._label.style.bottom = "";
          this._label.style.top = `${y}px`;
        }

        if (x > centerPx.x) {
          this._label.style.left = `${x}px`;
          this._label.style.right = "";
        } else {
          this._label.style.left = "";
          this._label.style.right = `calc(100% - ${x}px)`;
        }

        const container = document.createElement("div");
        container.classList.add("cross-label-container");

        const headerContainer = document.createElement("div");
        headerContainer.classList.add("cross-label-header-container");

        const header = document.createElement("div");
        header.classList.add("cross-label-header");
        header.classList.add(this.model.toLowerCase());
        header.textContent = constants.Models[this.model];
        headerContainer.appendChild(header);

        if (this.magnitude) {
          const mag = document.createElement("div");
          mag.classList.add("cross-label-magnitude");
          mag.textContent = `M ${this.magnitude}`;
          mag.style.backgroundColor = getMagnitudeColor(this.magnitude);
          headerContainer.appendChild(mag);
        }

        if (this.depth) {
          const dep = document.createElement("div");
          dep.classList.add("cross-label-depth");
          dep.textContent = `${this.depth}㎞`;
          dep.style.backgroundColor = getDepthColor(this.depth);
          headerContainer.appendChild(dep);
        }

        const loc = document.createElement("div");
        loc.classList.add("cross-label-location");
        loc.textContent = this.location;

        container.appendChild(headerContainer);
        container.appendChild(loc);

        this._label.appendChild(container);

        this.map.getCanvasContainer().appendChild(this._label);
      }
    }

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

    let x = center.x + 10 * zoom;
    let y = center.y - 5 * zoom;
    let testNext = false;


    const labelHeight = 44 / 2;
    const labelWidth = 120 / 2;


    // tests if top right is placeable
    if (checkOverlap(x + labelWidth, y, "cross-label", `${this.id}-label`)) {
      x = center.x - 10 * zoom;
      y = center.y - 5 * zoom;
      testNext = true;
    }

    // tests if top left is placeable
    if (testNext && checkOverlap(x - labelWidth, y, "cross-label", `${this.id}-label`)) {
      x = center.x + 10 * zoom;
      y = center.y + 5 * zoom;
    } else {
      testNext = false;
    }

    // tests if bottom right is placeable
    if (testNext && checkOverlap(x + labelWidth, y, "cross-label", `${this.id}-label`)) {
      x = center.x - 10 * zoom;
      y = center.y + 5 * zoom;
    } else {
      testNext = false;
    }

    // tests if bottom left is placeable
    if (testNext && checkOverlap(x - labelWidth, y, "cross-label", `${this.id}-label`)) {
      x = center.x + 10 * zoom;
      y = center.y - 5 * zoom;
    }

    if (this._labelLine) {
      this._labelLine.setAttribute("x1", center.x);
      this._labelLine.setAttribute("y1", center.y);
      this._labelLine.setAttribute("x2", x);
      this._labelLine.setAttribute("y2", y);
    }

    if (this._label) {
      if (y > center.y) {
        this._label.style.bottom = `calc(100% - ${y}px - 44px)`;
        this._label.style.top = "";
      } else {
        this._label.style.bottom = "";
        this._label.style.top = `${y}px`;
      }

      if (x > center.x) {
        this._label.style.left = `${x}px`;
        this._label.style.right = "";
      } else {
        this._label.style.left = "";
        this._label.style.right = `calc(100% - ${x}px)`;
      }
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

    if (this._labelLine)
      this._labelLine.remove();

    if (this._label)
      this._label.remove();

    this._svg.remove();
  }
}

module.exports = Wave;