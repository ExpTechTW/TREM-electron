const constants = require("../constants");

const pga = (magnitde, distance, siteEffect = 1) => {
  const value = 1.657 * Math.pow(Math.E, (1.533 * magnitde)) * Math.pow(distance, -1.607) * siteEffect;
  return {
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