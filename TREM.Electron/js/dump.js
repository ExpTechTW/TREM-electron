const $ = require("jquery");
const { app } = require("@electron/remote");
const fs = require("node:fs");
const path = require("node:path");

const latestLog = path.join(app.getPath("logs"), "latest.log");
fs.writeFileSync(latestLog, "", { encoding: "utf8", flag: "w" });

const list = fs.readdirSync(app.getPath("logs"));

for (let i = 0; i < list.length; i++) {
	const date = fs.statSync(`${app.getPath("logs")}/${list[i]}`);

	if (Date.now() - date.ctimeMs > 86400 * 1000 * 7) fs.unlinkSync(`${app.getPath("logs")}\\${list[i]}`);
}

const LogPath = () => path.join(app.getPath("logs"), `${log_time_string()}.log`);

if (!fs.existsSync(LogPath())) {
	fs.writeFileSync(LogPath(), "");
	log(app.getVersion(), 2, "TREM", "version");
}

function log(msg, type = 1, sender = "main", fun = "unknow") {
	const _type = (type == 0) ? "Debug" : (type == 3) ? "Error" : (type == 2) ? "Warn" : "Info";
	const _msg = `[${_type}][${time_to_string()}][${sender}/${fun}]: ${msg}`;

	try {
		if (type == 3)
			console.log("\x1b[31m" + _msg + "\x1b[0m");
		else if (type == 2)
			console.log("\x1b[33m" + _msg + "\x1b[0m");
		else if (type == 1)
			console.log("\x1b[32m" + _msg + "\x1b[0m");
		else if (type == 0)
			console.debug("\x1b[34m" + _msg + "\x1b[0m");
	} catch (err) {
		console.log("\x1b[31m" + _msg + "\x1b[0m");
	}

	fs.appendFileSync(LogPath(), `${_msg}\r\n`, "utf8");
}

function log_time_string() {
	const now = new Date();
	let _Now = now.getFullYear().toString();
	_Now += "-";

	if ((now.getMonth() + 1) < 10) _Now += "0" + (now.getMonth() + 1).toString();
	else _Now += (now.getMonth() + 1).toString();
	_Now += "-";

	if (now.getDate() < 10) _Now += "0" + now.getDate().toString();
	else _Now += now.getDate().toString();
	_Now += "_";

	if (now.getHours() < 10) _Now += "0" + now.getHours().toString();
	else _Now += now.getHours().toString();
	return _Now;
}

function time_to_string(date) {
	const now = new Date(date ?? Date.now());
	let _Now = now.getFullYear().toString();
	_Now += "/";

	if ((now.getMonth() + 1) < 10) _Now += "0" + (now.getMonth() + 1).toString();
	else _Now += (now.getMonth() + 1).toString();
	_Now += "/";

	if (now.getDate() < 10) _Now += "0" + now.getDate().toString();
	else _Now += now.getDate().toString();
	_Now += " ";

	if (now.getHours() < 10) _Now += "0" + now.getHours().toString();
	else _Now += now.getHours().toString();
	_Now += ":";

	if (now.getMinutes() < 10) _Now += "0" + now.getMinutes().toString();
	else _Now += now.getMinutes().toString();
	_Now += ":";

	if (now.getSeconds() < 10) _Now += "0" + now.getSeconds().toString();
	else _Now += now.getSeconds().toString();
	return _Now;
}

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
	console[[
		"log",
		"warn",
		"error",
		"debug",
	][dumpData.level]](`%c[${nowTime}]`, dumpData.level == 0 ? "color: rgba(255, 255, 255, .4)" : "", dumpData.origin + " >> " + dumpData.message);

	if (dumpData.level != 3)
		fs.appendFileSync(latestLog, `[${[
			"Log",
			"Warn",
			"Error",
			"Debug",
		][dumpData.level]}] [${nowTime}] [${dumpData.origin}]` + dumpData.message + "\r\n", "utf8");
}

function dumpUpload() {
	const msg = {
		APIkey        : "https://github.com/ExpTechTW",
		Function      : "data",
		Type          : "TREM-Dump",
		FormatVersion : 1,
		Value         : fs.readFileSync(latestLog).toString(),
		UUID          : localStorage.UUID,
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