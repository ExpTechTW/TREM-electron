const constants = require("../constants");

const pga = (magnitde, depth, distance, siteEffect = { site: 1 }) => {
  const value = ((localStorage.getItem("UseNewDecayFormula") ?? constants.DefaultSettings.UseNewDecayFormula) == "true")
    ? 12.44 * Math.exp(1.31 * magnitde) * Math.pow(distance, -1.837) * ((depth < 40) ? siteEffect.s : siteEffect.d)
    : 1.657 * Math.exp(1.533 * magnitde) * Math.pow(distance, -1.607) * siteEffect.site;

  return {
    value,
    toIntensity() {
      const float = 2 * Math.log10(this.value) + 0.7;
      return constants.Intensities[(float < 0) ? 0 : (float < 4.5) ? Math.round(float) : (float < 5) ? 5 : (float < 5.5) ? 6 : (float < 6) ? 7 : (float < 6.5) ? 8 : 9];
    }
  };
};

module.exports = pga;