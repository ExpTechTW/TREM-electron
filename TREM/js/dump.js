/* eslint-disable no-empty-function */
const Now = new Date();
const latestLog = path.join(app.getPath("logs"), `${Now.getFullYear()}_${Now.getMonth() + 1}_${Now.getDate()}.log`);
if (fs.existsSync(path.join(app.getPath("logs"), latestLog)))
	fs.writeFileSync(latestLog, "", { encoding: "utf8", flag: "w" });

fs.readdir(app.getPath("logs"), (err, list) => {
	for (let index = 0; index < list.length; index++)
		fs.stat(path.join(app.getPath("logs"), list[index]), (err, date) => {
			if (Date.now() - date.ctimeMs > 86400000 * 3) fs.unlink(path.join(app.getPath("logs"), list[index]), () => {});
		});
});

/**
 * Dump a message.
 * @param {DumpData} dumpData
 * @typedef {object} DumpData
 * @property {0|1|2|3} level 0: info, 1: warn, 2: error, 3: debug
 * @property {string} message Dump message.
 * @property {string} origin Dump origin.
 */
function dump(dumpData) {
	const now = new Date();
	const nowTime = (new Date(now.getTime() - (now.getTimezoneOffset() * 60000))).toISOString().slice(0, -1);
	const line = `${dumpData.origin} >> ${dumpData.message}`;
	console[["log", "warn", "error", "debug"][dumpData.level]](`%c[${nowTime}]`, dumpData.level == 0 ? "color: rgba(255, 255, 255, .4)" : "", line);
	if (dumpData.level != 3)
		fs.appendFileSync(latestLog, `[${nowTime}]` + line + "\r\n", "utf8");
}

function dumpUpload() {
	const msg = {
		"APIkey"        : "https://github.com/ExpTechTW",
		"Function"      : "data",
		"Type"          : "TREM-Dump",
		"FormatVersion" : 1,
		"Value"         : fs.readFileSync(latestLog).toString(),
		"UUID"          : localStorage["UUID"],
	};
	axios.post("https://exptech.mywire.org:1015", msg)
		.then((response) => {
			if (response.data.response == "Speed limit")
				alert("Dump 發送限制\n稍等 5 分鐘後再次嘗試");
			else
				alert("Dump 發送成功");

		})
		.catch((error) => {
			alert("Dump 發送失敗\nError > " + error);
		});
}