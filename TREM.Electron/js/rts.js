const { getCurrentWindow, shell } = require("@electron/remote");
const echarts = require("echarts");
const WebSocket = require("ws");
const win = getCurrentWindow();

document.onreadystatechange = () => {
	if (document.readyState == "complete")
		handleWindowControls();
};

function handleWindowControls() {
	// Make minimise/maximise/restore/close buttons work when they are clicked
	document.getElementById("min-button").addEventListener("click", () => {
		win.minimize();
	});

	document.getElementById("max-button").addEventListener("click", () => {
		win.maximize();
	});

	document.getElementById("restore-button").addEventListener("click", () => {
		win.unmaximize();
	});

	document.getElementById("close-button").addEventListener("click", () => {
		win.close();
	});

	toggleMaxRestoreButtons();
	win.on("maximize", toggleMaxRestoreButtons);
	win.on("unmaximize", toggleMaxRestoreButtons);

	function toggleMaxRestoreButtons() {
		if (win.isMaximized())
			document.body.classList.add("maximized");
		else
			document.body.classList.remove("maximized");
	}
}

const wave_count = +localStorage.getItem("displayWaveCount") ?? 8;

let ws = new WebSocket("wss://exptech.com.tw/api");
let Reconnect = 0;
let ServerT = 0;

let Realtimestation = app.Configuration.data["Real-time.station"];
let Realtimestation1 = app.Configuration.data["Real-time.station.1"];
let Realtimestation2 = app.Configuration.data["Real-time.station.2"];
let Realtimestation3 = app.Configuration.data["Real-time.station.3"];
let Realtimestation4 = app.Configuration.data["Real-time.station.4"];
let Realtimestation5 = app.Configuration.data["Real-time.station.5"];
let themecolor = app.Configuration.data["theme.color"];
let themedark = app.Configuration.data["theme.dark"];

let chartuuids = [
	Realtimestation1,
	Realtimestation2,
	Realtimestation3,
	Realtimestation4,
	Realtimestation5,
	Realtimestation,
];

function reconnect() {
	if (Date.now() - Reconnect < 500) return;
	Reconnect = Date.now();

	if (ws != null) {
		ws.close();
		ws = null;
	}

	ws = new WebSocket("wss://exptech.com.tw/api");
	connect(1000);
}

const connect = (retryTimeout) => {
	ws.onclose = function() {
		console.log(`WebSocket closed. Reconnect after ${retryTimeout / 1000}s`);
		reconnect();
	};

	ws.onerror = function(err) {
		console.log(err);
		reconnect();
	};

	ws.onopen = function() {
		ws.send(JSON.stringify({
			uuid     : `TREM/${app.getVersion()} (${localStorage.UUID};)`,
			function : "subscriptionService",
			value    : ["trem-rts-original-v1"],
			addition : {
				"trem-rts-original-v1": chartuuids,
			},
		}));
	};

	ws.onmessage = function(evt) {
		const parsed = JSON.parse(evt.data);
		ServerT = Date.now();

		if (parsed.type == "trem-rts-original")
			wave(parsed.raw);
	};
};

const data = {
	stations: {},
};
const timer = {};

const Real_time_station_run = () => {
	chartuuids = [
		Realtimestation1,
		Realtimestation2,
		Realtimestation3,
		Realtimestation4,
		Realtimestation5,
		Realtimestation,
	];
	reconnect();
	setCharts([
		Realtimestation1.split("-")[2],
		Realtimestation2.split("-")[2],
		Realtimestation3.split("-")[2],
		Realtimestation4.split("-")[2],
		Realtimestation5.split("-")[2],
		Realtimestation.split("-")[2],
	]);
};

const Real_time_station = () => {
	try {
		if (Realtimestation != app.Configuration.data["Real-time.station"]) {
			Realtimestation = app.Configuration.data["Real-time.station"];
			Real_time_station_run();
		} else if (Realtimestation1 != app.Configuration.data["Real-time.station.1"]) {
			Realtimestation1 = app.Configuration.data["Real-time.station.1"];
			Real_time_station_run();
		} else if (Realtimestation2 != app.Configuration.data["Real-time.station.2"]) {
			Realtimestation2 = app.Configuration.data["Real-time.station.2"];
			Real_time_station_run();
		} else if (Realtimestation3 != app.Configuration.data["Real-time.station.3"]) {
			Realtimestation3 = app.Configuration.data["Real-time.station.3"];
			Real_time_station_run();
		} else if (Realtimestation4 != app.Configuration.data["Real-time.station.4"]) {
			Realtimestation4 = app.Configuration.data["Real-time.station.4"];
			Real_time_station_run();
		} else if (Realtimestation5 != app.Configuration.data["Real-time.station.5"]) {
			Realtimestation5 = app.Configuration.data["Real-time.station.5"];
			Real_time_station_run();
		} else if (themecolor != app.Configuration.data["theme.color"]) {
			themecolor = app.Configuration.data["theme.color"];
			setCharts([
				Realtimestation1.split("-")[2],
				Realtimestation2.split("-")[2],
				Realtimestation3.split("-")[2],
				Realtimestation4.split("-")[2],
				Realtimestation5.split("-")[2],
				Realtimestation.split("-")[2],
			]);
		} else if (themedark != app.Configuration.data["theme.dark"]) {
			themedark = app.Configuration.data["theme.dark"];
			setCharts([
				Realtimestation1.split("-")[2],
				Realtimestation2.split("-")[2],
				Realtimestation3.split("-")[2],
				Realtimestation4.split("-")[2],
				Realtimestation5.split("-")[2],
				Realtimestation.split("-")[2],
			]);
		}
	} catch (error) {
		console.warn("Failed to load station data!", error);
	}
};

const fetch_files = async () => {
	try {
		const res = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
		const s = {};

		if (res) {
			for (let i = 0, k = Object.keys(res), n = k.length; i < n; i++) {
				const id = k[i];

				if (res[id].Long > 118)
					s[id.split("-")[2]] = { uuid: id, ...res[id] };
			}

			data.stations = s;
		}
	} catch (error) {
		console.warn("Failed to load station data!", error);
	}
};

const charts = [
	echarts.init(document.getElementById("wave-1"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-2"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-3"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-4"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-5"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-6"), null, { height: 560 / 6, width: 400 }),
];
const chartdata = [
	[],
	[],
	[],
	[],
	[],
	[],
];

for (let i = 0; i < wave_count; i++) {
	const dom = document.createElement("div");
	document.getElementById("wave-container").append(dom);
	charts.push(echarts.init(dom, null, { height: 560 / wave_count, width: 400 }));
	chartdata.push([]);
}

/**
 * @param {string[]} ids
 */
const setCharts = (ids) => {
	for (let i = 0; i < 6; i++)
		if (data.stations?.[ids[i]]?.uuid) {
			if (chartuuids[i] != data.stations[ids[i]].uuid) {
				chartuuids[i] = data.stations[ids[i]].uuid;
				chartdata[i] = [];
			}

			charts[i].setOption({
				title: {
					text: `${data.stations[ids[i]].Loc} | ${chartuuids[i]}`,
				},
			});
		} else {
			chartuuids.splice(i, 1);
			charts[i].clear();
			charts[i].setOption({
				title: {
					textStyle: {
						fontSize : 10,
						color    : (themedark ? "rgb(230, 225, 229)" : "rgb(26, 28, 25)"),
					},
				},
				xAxis: {
					type      : "time",
					splitLine : {
						show: false,
					},
					show: false,
				},
				yAxis: {
					type      : "value",
					animation : false,
					splitLine : {
						show: false,
					},
					axisLabel: {
						interval : 1,
						fontSize : 10,
					},
				},
				grid: {
					top    : 16,
					right  : 0,
					bottom : 0,
				},
				series: [
					{
						type       : "line",
						showSymbol : false,
						data       : [],
						color      : themecolor,
					},
				],
			});
		}
};

const wave = (wave_data) => {
	// console.log(wave_data);
	const jsondata = {};

	for (let i = 0; i < wave_data.length; i++)
		jsondata[wave_data[i].uuid] = wave_data[i].raw;

	const now = new Date(Date.now());

	for (const i in chartuuids) {
		if (jsondata[chartuuids[i]])
			chartdata[i].push(...jsondata[chartuuids[i]].map((value, index, array) => ({
				name  : now.getTime(),
				value : [new Date(+now + (index * (1000 / array.length))).getTime(), value],
			})));
		else
			for (let j = 0; j < (chartuuids[i].startsWith("H") ? 19 : 38); j++)
				chartdata[i].push({
					name  : now.getTime(),
					value : [new Date(+now + (j * (1000 / (chartuuids[i].startsWith("H") ? 19 : 38)))).getTime(), null],
				});


		while (true)
			if (chartdata[i].length > (chartuuids[i].startsWith("H") ? 1140 : 2280)) {
				chartdata[i].shift();
			} else if (chartdata[i].length == (chartuuids[i].startsWith("H") ? 1140 : 2280)) {
				break;
			} else if (chartdata[i].length != (chartuuids[i].startsWith("H") ? 1140 : 2280)) {
				chartdata[i].shift();
				chartdata[i].unshift({
					name  : new Date(Date.now() - 60_000).getTime(),
					value : [new Date(Date.now() - 60_000).getTime(), null],
				});
				break;
			}

		const values = chartdata[i].map(v => v.value[1]);
		const maxmin = Math.max(Math.abs(Math.max(...values)), Math.abs(Math.min(...values)));

		charts[i].setOption({
			animation : false,
			yAxis     : {
				max : maxmin < (chartuuids[i].startsWith("H") ? 1000 : 100000) ? (chartuuids[i].startsWith("H") ? 1000 : 100000) : maxmin,
				min : -(maxmin < (chartuuids[i].startsWith("H") ? 1000 : 100000) ? (chartuuids[i].startsWith("H") ? 1000 : 100000) : maxmin),
			},
			series: [
				{
					data: chartdata[i],
				},
			],
		});
	}
};

async function init() {
	setInterval(() => {
		if ((Date.now() - ServerT > 15_000 && ServerT != 0))
			reconnect();
	}, 3000);
	connect(1000);
	await (async () => {
		await fetch_files();

		if (!timer.stations)
			timer.stations = setInterval(fetch_files, 300_000);

		if (!timer.Realtimestation)
			timer.Realtimestation = setInterval(Real_time_station, 1_000);
	})().catch(e => {
		log(e, 3, "rts", "init");
		dump({ level: 2, message: e });
	});
	setCharts([
		Realtimestation1.split("-")[2],
		Realtimestation2.split("-")[2],
		Realtimestation3.split("-")[2],
		Realtimestation4.split("-")[2],
		Realtimestation5.split("-")[2],
		Realtimestation.split("-")[2],
	]);
	for (const chart of charts)
		chart.setOption({
			title: {
				textStyle: {
					fontSize : 10,
					color    : (themedark ? "rgb(230, 225, 229)" : "rgb(26, 28, 25)"),
				},
			},
			xAxis: {
				type      : "time",
				splitLine : {
					show: false,
				},
				show: false,
			},
			yAxis: {
				type      : "value",
				animation : false,
				splitLine : {
					show: false,
				},
				axisLabel: {
					interval : 1,
					fontSize : 10,
				},
			},
			grid: {
				top    : 16,
				right  : 0,
				bottom : 0,
			},
			series: [
				{
					type       : "line",
					showSymbol : false,
					data       : [],
					color      : themecolor,
				},
			],
		});
}