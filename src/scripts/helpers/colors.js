const shouldUseDarkColor = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const chroma = require("chroma-js");

const i = chroma
  .scale(["#0500A3", "#00ceff", "#33ff34", "#fdff32", "#ff8532", "#fc5235", "#c03e3c", "#9b4544", "#9a4c86", "#b720e9"])
  .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

module.exports = {
  get MapBackgroundColor() {
    return shouldUseDarkColor() ? "#a3c9ff" : "#1660a5";
  },
  get MapOutlineColor() {
    return shouldUseDarkColor() ? "#8d9199" : "#73777f";
  },
  get NoDataRtsColor() {
    return shouldUseDarkColor() ? "#5b5e66" : "#a8abb4";
  },
  IntensityColor(int) {
    return Number.isFinite(int) ? i(int) : "transparent";
  }
};