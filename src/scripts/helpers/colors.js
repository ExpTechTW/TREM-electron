const shouldUseDarkColor = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const chroma = require("chroma-js");
const { getMagnitudeLevel, getDepthLevel } = require("./utils");

const i = chroma
  .scale(["#0500A3", "#00ceff", "#33ff34", "#fdff32", "#ff8532", "#fc5235", "#c03e3c", "#9b4544", "#9a4c86", "#b720e9"])
  .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

const acc = chroma
  .scale([/* "#0000cd",*/ "#0048fa", "#00d08b", "#3ffa36", "#bdff0c", "#ffff00", "#ffdd00", "#ff9000", "#ff4400", "#f50000", "aa0000"])
  .domain([0, 0.8, 2.5, 8, 25, 80, 140, 250, 440, 800]);

const vel = chroma
  .scale([/* "#0000cd",*/ "#0048fa", "#00d08b", "#3ffa36", "#bdff0c", "#ffff00", "#ffdd00", "#ff9000", "#ff4400", "#f50000", "aa0000"])
  .domain([0, 0.2, 0.7, 1.9, 5.7, 15, 30, 50, 80, 140]);

const ibg = chroma
  .scale(["#757575", "#2774C2", "#7BA822", "#E8D630", "#E68439", "#DB641F", "#DB1F1F", "#DB1F1F", "#862DB3"])
  .domain([1, 2, 3, 4, 5, 6, 7, 8, 9]);

module.exports = {
  get MapBackgroundColor() {
    return shouldUseDarkColor() ? "#43474e" : "#dfe2eb";
  },
  get MapOutlineColor() {
    return shouldUseDarkColor() ? "#bcc7db" : "#545f70";
  },
  get NoDataRtsColor() {
    return shouldUseDarkColor() ? "#5b5e66" : "#a8abb4";
  },
  getIntensityColor(int) {
    return Number.isFinite(int) ? i(int).toString() : "transparent";
  },
  getIntensityBgColor(int) {
    return Number.isFinite(int) ? int > 0 ? ibg(int).toString() : "transparent" : "transparent";
  },
  getAccerateColor(a, v) {
    return Number.isFinite(v) ? a < 80 ? acc(a).toString() : vel(v).toString() : "transparent";
  },
  getMagnitudeColor(magnitude) {
    return [
      "white",
      "skyblue",
      "palegreen",
      "gold",
      "salmon",
      "lightred",
      "lightpurple"
    ][getMagnitudeLevel(magnitude)];
  },
  getDepthColor(depth) {
    return [
      "white",
      "palegreen",
      "gold",
      "red"
    ][getDepthLevel(depth)];
  }
};