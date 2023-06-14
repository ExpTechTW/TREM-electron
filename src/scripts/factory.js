const { Marker } = require("maplibre-gl");

const cross = (options) => {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  if ("className" in options)
    if (!("svg" in options))
      options.className.split(" ").forEach((v) => group.classList.add(v));

  if ("blink" in options)
    if (options.blink == true)
      group.classList.add("blink");

  if ("scale" in options)
    group.style.scale = options.scale;

  if ("opacity" in options)
    group.style.opacity = options.opacity;

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "path");
  inner.setAttribute("d", "M59.33,73a3,3,0,0,1-2.12-.88L38,52.92,18.78,72.13a3,3,0,0,1-4.24,0L3.88,61.46a3,3,0,0,1,0-4.24L23.09,38,3.88,18.8a3,3,0,0,1,0-4.25L14.54,3.88a3,3,0,0,1,4.25,0L38,23.1,57.21,3.88A3,3,0,0,1,59.33,3h0a3,3,0,0,1,2.13.88L72.12,14.55a3,3,0,0,1,0,4.25L52.91,38,72.12,57.22a3,3,0,0,1,0,4.24L61.45,72.12A3,3,0,0,1,59.33,73Z");
  inner.classList.add("cross-inner");

  if ("innerColor" in options)
    inner.style.fill = options.innerColor;

  const outer = document.createElementNS("http://www.w3.org/2000/svg", "path");
  outer.setAttribute("d", "M59.33,6,70,16.68,48.67,38,70,59.34,59.33,70,38,48.68,16.66,70,6,59.34,27.33,38,6,16.68,16.66,6,38,27.34,59.33,6m0-6a6,6,0,0,0-4.24,1.76L38,18.85,20.91,1.76A6,6,0,0,0,16.66,0h0a6,6,0,0,0-4.24,1.76L1.75,12.43a6,6,0,0,0,0,8.49L18.84,38,1.76,55.1a6,6,0,0,0,0,8.48L12.42,74.25a6,6,0,0,0,8.49,0L38,57.16,55.09,74.25a6,6,0,0,0,8.49,0L74.24,63.58a6,6,0,0,0,0-8.48L57.15,38,74.24,20.92a6,6,0,0,0,0-8.49L63.58,1.76A6,6,0,0,0,59.33,0Z");
  outer.classList.add("cross-outer");

  if ("outerColor" in options)
    outer.style.fill = options.outerColor;

  group.append(inner, outer);

  if ("svg" in options)
    if (options.svg == true) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.appendChild(group);

      if ("className" in options)
        options.className.split(" ").forEach((v) => svg.classList.add(v));

      if ("scale" in options) {
        svg.style.height = 76 * options.scale;
        svg.style.width = 76 * options.scale;
      }

      return svg;
    }

  return group;
};

const rtsMarkerElement = () => {
  const div = document.createElement("div");
  div.className = "rts-marker";
  return div;
};

module.exports = { cross, rtsMarkerElement };