const constants = require("../constants");

const pga = (magnitde, depth, distance, siteEffect = { site: 1 }) => {
  const value = ((localStorage.getItem("UseNewDecayFormula") ?? constants.DefaultSettings.UseNewDecayFormula) == "true")
    ? 12.44 * Math.exp(1.31 * magnitde) * Math.pow(distance, -1.837) * ((depth < 40) ? siteEffect.s : siteEffect.d)
    : 1.657 * Math.exp(1.533 * magnitde) * Math.pow(distance, -1.607) * siteEffect.site;

  return {
    value,
    toIntensity() {
      return constants.Intensities[value >= 800 ? 9
        : value <= 800 && value > 440 ? 8
          : value <= 440 && value > 250 ? 7
            : value <= 250 && value > 140 ? 6
              : value <= 140 && value > 80 ? 5
                : value <= 80 && value > 25 ? 4
                  : value <= 25 && value > 8 ? 3
                    : value <= 8 && value > 2.5 ? 2
                      : value <= 2.5 && value > 0.8 ? 1
                        : 0];
    }
  };
};

module.exports = pga;