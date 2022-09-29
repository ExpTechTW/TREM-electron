const twoPointDistance = ({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }) => (((lat1 - lat2) * 111) ** 2 + ((lon1 - lon2) * 101) ** 2) ** 0.5;
const twoSideDistance = (side1, side2) => (side1 ** 2 + side2 ** 2) ** 0.5;
const pga = (magnitde, distance, siteEffect = 1) => (1.657 * Math.pow(Math.E, (1.533 * magnitde)) * Math.pow(distance, -1.607) * siteEffect).toFixed(3);
const PGAToIntensity = (value) => value >= 800 ? "7" :
	value <= 800 && value > 440 ? "6+" :
		value <= 440 && value > 250 ? "6-" :
			value <= 250 && value > 140 ? "5+" :
				value <= 140 && value > 80 ? "5-" :
					value <= 80 && value > 25 ? "4" :
						value <= 25 && value > 8 ? "3" :
							value <= 8 && value > 2.5 ? "2" :
								value <= 2.5 && value > 0.8 ? "1" :
									"0";

module.exports = {
	twoPointDistance,
	twoSideDistance,
	pga,
	PGAToIntensity,
};