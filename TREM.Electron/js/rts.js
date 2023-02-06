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

const wave_count = +localStorage.getItem("displayWaveCount") ?? 7;

const connect = (retryTimeout) => {
	const ws = new WebSocket("wss://exptech.com.tw/api");

	ws.addEventListener("close", () => {
		console.debug(`WebSocket closed. Reconnect after ${retryTimeout / 1000}s`);
		setTimeout(connect, retryTimeout, retryTimeout).unref();
	});

	ws.addEventListener("error", (err) => {
		console.error(err);
	});

	ws.addEventListener("open", () => {
		ws.send(JSON.stringify({
			uuid     : `TREM/${app.getVersion()} (${localStorage.UUID};)`,
			function : "subscriptionService",
			value    : ["trem-rts-original-v1"],
			addition : {
				"trem-rts-original-v1": chartuuids,
			},
		}));
	});

	ws.addEventListener("message", (ev) => {
		const parsed = JSON.parse(ev.data);

		if (parsed.type == "trem-rts-original")
			wave(parsed.raw);
	});
};

const data = {
	stations: {},
};
const timer = {};

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

		console.log(res);
	} catch (error) {
		console.warn("Failed to load station data!", error);
	}
};

const chartuuids = [
	"H-335-11339620-4",
	"H-979-11336952-11",
	"H-711-11334880-12",
	"H-541-11370676-10",
	"L-269-11370996-5",
	"L-648-4832348-9",
];

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
						fontSize: 10,
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
					},
				],
			});
		}
};

const wave = (wave_data) => {
	console.log(wave_data);
	const jsondata = {};

	for (let i = 0; i < wave_data.length; i++)
		jsondata[wave_data[i].uuid] = wave_data[i].raw;

	const now = new Date(Date.now());

	for (const i in chartuuids) {
		if (jsondata[chartuuids[i]])
			chartdata[i].push(...jsondata[chartuuids[i]].map((value, index, array) => ({
				name  : now.toString(),
				value : [new Date(+now + (index * (1000 / array.length))).toISOString(), value],
			})));
		else
			for (let j = 0; j < (chartuuids[i].startsWith("H") ? 19 : 38); j++)
				chartdata[i].push({
					name  : now.toString(),
					value : [new Date(+now + (j * (1000 / (chartuuids[i].startsWith("H") ? 19 : 38)))).toISOString(), null],
				});


		while (true)
			if (chartdata[i].length > (chartuuids[i].startsWith("H") ? 1140 : 2280)) {
				chartdata[i].shift();
			} else if (chartdata[i].length == (chartuuids[i].startsWith("H") ? 1140 : 2280)) {
				break;
			} else if (chartdata[i].length != (chartuuids[i].startsWith("H") ? 1140 : 2280)) {
				chartdata[i].shift();
				chartdata[i].unshift({
					name  : new Date(Date.now() - 60_000).toString(),
					value : [new Date(Date.now() - 60_000).toISOString(), null],
				});
				break;
			}

		const values = chartdata[i].map(v => v.value[1]);
		const maxmin = Math.max(Math.abs(Math.max(...values)), Math.abs(Math.min(...values)));

		charts[i].setOption({
			animation : false,
			yAxis     : {
				max : maxmin < (chartuuids[i].startsWith("H") ? 0.5 : 5) ? (chartuuids[i].startsWith("H") ? 0.5 : 5) : maxmin,
				min : -(maxmin < (chartuuids[i].startsWith("H") ? 0.5 : 5) ? (chartuuids[i].startsWith("H") ? 0.5 : 5) : maxmin),
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
	connect(1000);
	await (async () => {
		await fetch_files();

		if (!timer.stations)
			timer.stations = setInterval(fetch_files, 300_000);
	})().catch(e => dump({ level: 2, message: e }));
	setCharts([
		"11339620",
		"11336952",
		"11334880",
		"11370676",
		"11370996",
		"4832348",
		"11423064",
		"11336816",
	]);
	for (const chart of charts)
		chart.setOption({
			title: {
				textStyle: {
					fontSize: 10,
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
				},
			],
		});
}