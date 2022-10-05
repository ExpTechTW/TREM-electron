const fetch = require("node-fetch").default;
const fs = require("node:fs");

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
const downloadFile = async (url, path, progressCallback, length) => {
	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/octet-stream",
		},
	});

	if (!response.ok)
		throw Error(
			`Unable to download, server returned ${response.status} ${response.statusText}`,
		);

	const body = response.body;
	if (body == null)
		throw Error("No response body");

	const writer = fs.createWriteStream(path);

	const finalLength =
		length || parseInt(response.headers.get("Content-Length" || "0"), 10);

	await streamWithProgress(finalLength, body, writer, progressCallback);

	writer.end();
	return path;
};

module.exports = {
	twoPointDistance,
	twoSideDistance,
	pga,
	PGAToIntensity,
	downloadFile,
};

async function streamWithProgress(length, body, writer, progressCallback) {
	let bytesDone = 0;
	for await (const chunk of body)
		if (chunk == null)
			throw Error("Empty chunk received during download");
		else {
			writer.write(chunk);
			if (progressCallback != null) {
				bytesDone += chunk.byteLength;
				const percent = length === 0 ? null :
					Math.floor((bytesDone / length) * 100);
				progressCallback(bytesDone, percent);
			}
		}
}