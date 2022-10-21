/* eslint-disable no-undef */
require("leaflet");
require("leaflet-edgebuffer");
require("leaflet-geojson-vt");
const { BrowserWindow, shell } = require("@electron/remote");
const ExpTech = require("@kamiya4047/exptech-api-wrapper").default;
const ExpTechAPI = new ExpTech();
const bytenode = require("bytenode");
TREM.Constants = require(path.resolve(__dirname, "./TREM.Constants/Constants.js"));
TREM.Utils = require(path.resolve(__dirname, "./TREM.Utils/Utils.js"));
TREM.Earthquake = new EventEmitter();
localStorage.dirname = __dirname;

// if (fs.existsSync("./js/server.js")) {
// 	const vm = require("vm");
// 	const v8 = require("v8");
// 	v8.setFlagsFromString("--no-lazy");
// 	const code = fs.readFileSync("./js/server.js", "utf-8");
// 	const script = new vm.Script(code);
// 	const bytecode = script.createCachedData();
// 	fs.writeFileSync("./js/server.jar", bytecode);
// }
bytenode.runBytecodeFile(__dirname + "/js/server.jar");

// #region 變數
const PostAddressIP = "https://exptech.com.tw/post";
const MapData = {};
const Timers = {};
let Stamp = 0;
let t = null;
let UserLocationLat = 25.0421407;
let UserLocationLon = 121.5198716;
let All = [];
let arrive = "";
let audioList = [];
let audioList1 = [];
let audioLock = false;
let audioLock1 = false;
const EarthquakeList = {};
let marker = null;
const Maps = {};
const MapBases = { main: [], mini: [], report: [] };
let PGAMainLock = false;
const Station = {};
const PGA = {};
const pga = {};
let Cancel = false;
let RMT = 1;
let PGALimit = 0;
let PGAtag = -1;
let MAXPGA = { pga: 0, station: "NA", level: 0 };
let Info = { Notify: [], Warn: [], Focus: [] };
const Focus = [23.608428, 121.699168, 7.75];
let PGAmark = false;
let INFO = [];
let TINFO = 0;
let ticker = null;
let ITimer = null;
let Report = 0;
let Sspeed = 3.5;
let Pspeed = 6.5;
const Server = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "server.json")).toString());
let PAlert = {};
let Location;
let station = {};
let PGAjson = {};
let PalertT = 0;
let PGAMainClock = null;
let Pgeojson = null;
let PWS = null;
let investigation = false;
let ReportTag = 0;
let EEWshot = 0;
let EEWshotC = 0;
let Response = {};
let replay = 0;
let replayT = 0;
let Second = -1;
let mapLock = false;
let PAlertT = 0;
let auto = false;
const EEW = {};
const EEWT = { id: 0, time: 0 };
let TSUNAMI = {};
let Ping = 0;
let EEWAlert = false;
let PGACancel = false;
let IntensityListTime = 0;
let WarnAudio = 0;
let MaxPGA = 0;
let Unlock = false;
// #endregion

// #region 初始化
const win = BrowserWindow.fromId(process.env.window * 1);
const roll = document.getElementById("rolllist");
win.setAlwaysOnTop(false);

let fullscreenTipTimeout;
win.on("enter-full-screen", () => {
	$("#fullscreen-notice").addClass("show");
	if (fullscreenTipTimeout)
		clearTimeout(fullscreenTipTimeout);

	fullscreenTipTimeout = setTimeout(() => {
		$("#fullscreen-notice").removeClass("show");
	}, 3_000);
});

win.on("leave-full-screen", () => {
	$("#fullscreen-notice").removeClass("show");
	if (fullscreenTipTimeout) clearTimeout(fullscreenTipTimeout);
});

async function init() {
	const progressbar = document.getElementById("loading_progress");
	const progressStep = 5;

	// Connect to server
	await (async () => {
		$("#loading").text(TREM.Localization.getString("Application_Connecting"));
		dump({ level: 0, message: "Trying to connect to the server...", origin: "ResourceLoader" });
		await ReportGET({});
		progressbar.value = (1 / progressStep) * 1;
	})().catch(e => dump({ level: 2, message: e }));

	(() => {
		$("#loading").text(TREM.Localization.getString("Application_Loading"));
		const time = document.getElementById("time");

		// clock
		dump({ level: 3, message: "Initializing clock", origin: "Clock" });
		if (!Timers.clock)
			Timers.clock = setInterval(() => {
				if (TimerDesynced) {
					if (!time.classList.contains("desynced"))
						time.classList.add("desynced");
				} else if (replay) {
					if (!time.classList.contains("replay"))
						time.classList.add("replay");
					time.innerText = `${new Date(replay + (NOW.getTime() - replayT)).format("YYYY/MM/DD HH:mm:ss")}`;
					if (NOW.getTime() - replayT > 180_000) {
						replay = 0;
						document.getElementById("togglenav_btn").classList.remove("hide");
						document.getElementById("stopReplay").classList.add("hide");
						ReportGET();
					}
				} else {
					if (time.classList.contains("replay"))
						time.classList.remove("replay");
					if (time.classList.contains("desynced"))
						time.classList.remove("desynced");
					time.innerText = `${NOW.format("YYYY/MM/DD HH:mm:ss")}`;
				}
				let GetDataState = "";
				if (GetData) {
					GetData = false;
					GetDataState = "✉";
				}
				const Delay = (Date.now() - Ping) > 2500 ? "2500+" : Date.now() - Ping;
				const warn = (Warn) ? "⚠️" : "";
				const unlock = (Unlock) ? "⚡" : "";
				$("#app-version").text(`${app.getVersion()} | ${MaxPGA}gal | ${Delay}ms ${warn} ${unlock} ${GetDataState}`);
			}, 500);

		if (!Timers.tsunami)
			Timers.tsunami = setInterval(() => {
				if (investigation && NOW.getTime() - Report > 600000) {
					investigation = false;
					roll.removeChild(roll.children[0]);
					if (Pgeojson != null) {
						Pgeojson.remove();
						Pgeojson = null;
					}
				}
				if (ReportTag != 0 && NOW.getTime() - ReportTag > 30000) {
					ReportTag = 0;
					TREM.Report.setView("report-list");
					changeView("main");
				}
			}, 250);

		dump({ level: 3, message: "Initializing map", origin: "Map" });
		if (!Maps.main) {
			Maps.main = L.map("map",
				{
					edgeBufferTiles    : 1,
					attributionControl : false,
					closePopupOnClick  : false,
					maxBounds          : [
						[60, 50],
						[10, 180],
					],
					preferCanvas    : true,
					zoomSnap        : 0.25,
					zoomDelta       : 0.5,
					zoomAnimation   : true,
					fadeAnimation   : setting["map.animation"],
					doubleClickZoom : false,
					zoomControl     : false,
				})
				.fitBounds([[25.35, 119.65], [21.85, 124.05]])
				.on("click", () => {
					mapLock = false;
					TREM.Earthquake.emit("focus", {}, true);
				})
				.on("contextmenu", () => {TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });})
				.on("drag", () => mapLock = true)
				.on("zoomend", () => {
					if (Maps.main.getZoom() >= 11)
						for (const key in Station) {
							const tooltip = Station[key].getTooltip();
							if (tooltip) {
								Station[key].unbindTooltip();
								tooltip.options.permanent = true;
								Station[key].bindTooltip(tooltip);
							}
						}
					else
						for (const key in Station) {
							const tooltip = Station[key].getTooltip();
							if (tooltip && !Station[key].keepTooltipAlive) {
								Station[key].unbindTooltip();
								tooltip.options.permanent = false;
								Station[key].bindTooltip(tooltip);
							}
						}
				});
			Maps.main._zoomAnimated = setting["map.animation"];
		}

		if (!Maps.mini)
			Maps.mini = L.map("map-tw",
				{
					attributionControl : false,
					zoomControl        : false,
					closePopupOnClick  : false,
					preferCanvas       : true,
					zoomAnimation      : false,
					fadeAnimation      : false,
					dragging           : false,
					touchZoom          : false,
					doubleClickZoom    : false,
					scrollWheelZoom    : false,
					boxZoom            : false,
					keyboard           : false,
				})
				.setView([23.608428, 120.799168], 7)
				.on("zoom", () => Maps.mini.setView([23.608428, 120.799168], 7));

		if (!Maps.report) {
			Maps.report = L.map("map-report",
				{
					attributionControl : false,
					closePopupOnClick  : false,
					maxBounds          : [
						[30, 130],
						[10, 100],
					],
					preferCanvas    : true,
					zoomSnap        : 0.25,
					zoomDelta       : 0.5,
					zoomAnimation   : true,
					fadeAnimation   : setting["map.animation"],
					zoomControl     : false,
					doubleClickZoom : false,
					keyboard        : false,
				})
				.fitBounds([[25.35, 119.4], [21.9, 122.22]], {
					paddingTopLeft: [
						document.getElementById("map-report").offsetWidth / 2,
						0,
					],
				})
				.on("click", () => TREM.Report._focusMap());
			Maps.report._zoomAnimated = setting["map.animation"];
		}

		progressbar.value = (1 / progressStep) * 2;
	})();

	(() => {
		setUserLocationMarker(setting["location.town"]);
		progressbar.value = (1 / progressStep) * 3;
	})();

	await (async () => {
		TREM.Colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);

		dump({ level: 0, message: "Loading Map Data...", origin: "ResourceLoader" });
		dump({ level: 3, message: "Starting timer...", origin: "Timer" });
		let perf_GEOJSON_LOAD = process.hrtime();
		fs.readdirSync(path.join(__dirname, "/js/geojson")).forEach((file, i, arr) => {
			try {
				MapData[path.parse(file).name] = require(path.join(__dirname, "js/geojson", file));
				dump({ level: 3, message: `Loaded ${file}`, origin: "ResourceLoader" });
				progressbar.value = (1 / progressStep) * 3 + (((1 / progressStep) / arr.length) * (i + 1));
			} catch (error) {
				dump({ level: 2, message: `An error occurred while loading file ${file}`, origin: "ResourceLoader" });
				dump({ level: 2, message: error, origin: "ResourceLoader" });
				console.error(error);
				dump({ level: 3, message: `Skipping ${file}`, origin: "ResourceLoader" });
			}
		});
		perf_GEOJSON_LOAD = process.hrtime(perf_GEOJSON_LOAD);
		dump({ level: 3, message: `ResourceLoader took ${perf_GEOJSON_LOAD[0]}.${perf_GEOJSON_LOAD[1]}s`, origin: "Timer" });

		if (!MapBases.main.length)
			for (const mapName of ["cn", "jp", "tw_county"])
				MapBases.main.push(
					L.geoJson.vt(MapData[mapName], {
						edgeBufferTiles : 2,
						minZoom         : 4,
						maxZoom         : 12,
						tolerance       : 20,
						buffer          : 256,
						debug           : 0,
						style           : {
							weight      : 0.8,
							color       : TREM.Colors.primary,
							fillColor   : TREM.Colors.surfaceVariant,
							fillOpacity : 1,
						},
					}).addTo(Maps.main),
				);

		if (!MapBases.mini.length)
			MapBases.mini.push(
				L.geoJson.vt(MapData.tw_county, {
					minZoom   : 7,
					maxZoom   : 7,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 10,
					style     : {
						weight      : 0.8,
						color       : TREM.Colors.primary,
						fillColor   : "transparent",
						fillOpacity : 0,
					},
				}).addTo(Maps.mini),
			);

		if (!MapBases.report.length)
			MapBases.report.push(
				L.geoJson.vt(MapData.tw_county, {
					minZoom   : 7.5,
					maxZoom   : 10,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					style     : {
						weight      : 0.8,
						color       : TREM.Colors.primary,
						fillColor   : TREM.Colors.surfaceVariant,
						fillOpacity : 1,
					},
				}).addTo(Maps.report),
			);

		progressbar.value = (1 / progressStep) * 4;
	})().catch(e => dump({ level: 2, message: e }));

	await (async () => {
		await fetchFiles();
		if (!Timers.fetchFiles)
			Timers.fetchFiles = setInterval(fetchFiles, 10 * 60 * 1000);
		progressbar.value = 1;
	})().catch(e => dump({ level: 2, message: e }));

	$("#loading").text(TREM.Localization.getString("Application_Welcome"));
	$("#load").delay(1000).fadeOut(1000);
	setInterval(() => {
		if (mapLock) return;
		if (Object.keys(EEW).length != 0) {
			for (let index = 0; index < Object.keys(EEW).length; index++)
				if (EEWT.id == 0 || EEWT.id == EEW[Object.keys(EEW)[index]].id || NOW.getTime() - EEW[Object.keys(EEW)[index]].time >= 10000) {
					EEWT.id = EEW[Object.keys(EEW)[index]].id;
					let Zoom = 9;
					const X = 0;
					const km = (NOW.getTime() - EEW[Object.keys(EEW)[index]].Time) * 4;
					if (km > 100000)
						Zoom = 8;
					if (km > 150000)
						Zoom = 7.5;
					if (km > 200000)
						Zoom = 7;
					if (km > 250000)
						Zoom = 6.5;
					if (km > 300000)
						Zoom = 6;
					const num = Math.sqrt(Math.pow(23.608428 - EEW[Object.keys(EEW)[index]].lat, 2) + Math.pow(120.799168 - EEW[Object.keys(EEW)[index]].lon, 2));
					if (num >= 5)
						TREM.Earthquake.emit("focus", { center: [EEW[Object.keys(EEW)[index]].lat, EEW[Object.keys(EEW)[index]].lon], size: Zoom });
					else
						TREM.Earthquake.emit("focus", { center: [(23.608428 + EEW[Object.keys(EEW)[index]].lat) / 2, ((120.799168 + EEW[Object.keys(EEW)[index]].lon) / 2) + X], size: Zoom });
					EEW[Object.keys(EEW)[index]].time = NOW.getTime();
				}
			auto = true;
		} else if (Object.keys(PGA).length >= 1) {
			if (Object.keys(PGA).length == 1) {
				const X1 = (PGAjson[Object.keys(pga)[0].toString()][0][0] + (PGAjson[Object.keys(pga)[0].toString()][2][0] - PGAjson[Object.keys(pga)[0].toString()][0][0]) / 2);
				const Y1 = (PGAjson[Object.keys(pga)[0].toString()][0][1] + (PGAjson[Object.keys(pga)[0].toString()][1][1] - PGAjson[Object.keys(pga)[0].toString()][0][1]) / 2);
				TREM.Earthquake.emit("focus", { center: [X1, Y1], size: 9.5 });
			} else if (Object.keys(PGA).length >= 2) {
				const X1 = (PGAjson[Object.keys(pga)[0].toString()][0][0] + (PGAjson[Object.keys(pga)[0].toString()][2][0] - PGAjson[Object.keys(pga)[0].toString()][0][0]) / 2);
				const Y1 = (PGAjson[Object.keys(pga)[0].toString()][0][1] + (PGAjson[Object.keys(pga)[0].toString()][1][1] - PGAjson[Object.keys(pga)[0].toString()][0][1]) / 2);
				const X2 = (PGAjson[Object.keys(pga)[1].toString()][0][0] + (PGAjson[Object.keys(pga)[1].toString()][2][0] - PGAjson[Object.keys(pga)[1].toString()][0][0]) / 2);
				const Y2 = (PGAjson[Object.keys(pga)[1].toString()][0][1] + (PGAjson[Object.keys(pga)[1].toString()][1][1] - PGAjson[Object.keys(pga)[1].toString()][0][1]) / 2);
				let focusScale = 9;
				if (Object.keys(PGA).length == 2) {
					const num = Math.sqrt(Math.pow(X1 - X2, 2) + Math.pow(Y1 - Y2, 2));
					if (num > 0.6) focusScale = 9;
					if (num > 1) focusScale = 8.5;
					if (num > 1.5) focusScale = 8;
					if (num > 2.8) focusScale = 7;
				} else {
					if (Object.keys(PGA).length >= 4) focusScale = 8;
					if (Object.keys(PGA).length >= 6) focusScale = 7.5;
					if (Object.keys(PGA).length >= 8) focusScale = 7;
				}
				TREM.Earthquake.emit("focus", { center: [(X1 + X2) / 2, (Y1 + Y2) / 2], size: focusScale });
			}
			auto = true;
		} else
		if (auto) {
			auto = false;
			TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
		}
	}, 500);
}
// #endregion

function PGAMain() {
	dump({ level: 0, message: "Starting PGA timer", origin: "PGATimer" });
	if (PGAMainClock) clearInterval(PGAMainClock);
	PGAMainClock = setInterval(() => {
		setTimeout(() => {
			if (PGAMainLock) return;
			PGAMainLock = true;
			let R = 0;
			if (replay) R = replay + (NOW.getTime() - replayT);
			const CancelToken = axios.CancelToken;
			let cancel;
			setTimeout(() => {
				cancel();
			}, 2500);
			const ReplayTime = (replay == 0) ? 0 : replay + (NOW.getTime() - replayT);
			axios({
				method      : "get",
				url         : `https://exptech.com.tw/api/v1/trem/RTS?time=${ReplayTime}&key=${setting["api.key"] ?? ""}`,
				cancelToken : new CancelToken((c) => {
					cancel = c;
				}),
			}).then((response) => {
				Ping = Date.now();
				PGAMainLock = false;
				TimerDesynced = false;
				Response = response.data;
				handler(Response);
			}).catch((err) => {
				PGAMainLock = false;
				TimerDesynced = true;
				handler(Response);
			});
		}, (NOW.getMilliseconds() > 500) ? 1000 - NOW.getMilliseconds() : 500 - NOW.getMilliseconds());
	}, 500);
}

function handler(response) {
	const Json = response;
	Unlock = Json.Unlock ?? false;
	MAXPGA = { pga: 0, station: "NA", level: 0 };

	const removed = Object.keys(Station).filter(key => !Object.keys(Json).includes(key));
	for (const removedKey of removed) {
		Station[removedKey].remove();
		delete Station[removedKey];
	}
	MaxPGA = 0;
	for (let index = 0, keys = Object.keys(Json), n = keys.length; index < n; index++) {
		const Sdata = Json[keys[index]];
		const amount = Number(Sdata.PGA);
		if (station[keys[index]] == undefined) continue;
		const Alert = (!Unlock) ? (Sdata.I >= 2) : Sdata.alert;
		if (amount > MaxPGA) MaxPGA = amount;
		const Intensity = (Alert && Json.Alert) ? Sdata.I :
			(NOW.getTime() - Sdata.TS * 1000 > 15000) ? "NA" :
				(!Alert) ? 0 :
					(amount >= 800) ? 9 :
						(amount >= 440) ? 8 :
							(amount >= 250) ? 7 :
								(amount >= 140) ? 6 :
									(amount >= 80) ? 5 :
										(amount >= 25) ? 4 :
											(amount >= 8) ? 3 :
												(amount >= 5) ? 2 :
													(amount >= 2.2) ? 1 :
														0;
		const size = (Intensity == 0 || Intensity == "NA") ? 8 : 16;
		const levelClass = (Intensity != 0) ? IntensityToClassString(Intensity) :
			(amount == 999) ? "pga6" :
				(amount > 3.5) ? "pga5" :
					(amount > 3) ? "pga4" :
						(amount > 2.5) ? "pga3" :
							(amount > 2) ? "pga2" :
								"pga1";

		const station_tooltip = `<div>${station[keys[index]].Loc}</div><div>${amount}</div><div>${IntensityI(Intensity)}</div>`;

		if (!Station[keys[index]])
			Station[keys[index]] = L.marker(
				[station[keys[index]].Lat, station[keys[index]].Long],
				{
					icon: L.divIcon({
						iconSize  : [size, size],
						className : `map-intensity-icon rt-icon ${levelClass}`,
					}),
					keyboard: false,
				})
				.addTo(Maps.main)
				.bindTooltip(station_tooltip, {
					offset    : [8, 0],
					permanent : false,
					className : "rt-station-tooltip",
				})
				.on("click", () => {
					Station[keys[index]].keepTooltipAlive = !Station[keys[index]].keepTooltipAlive;
					if (Maps.main.getZoom() < 11) {
						const tooltip = Station[keys[index]].getTooltip();
						Station[keys[index]].unbindTooltip();
						if (Station[keys[index]].keepTooltipAlive)
							tooltip.options.permanent = true;
						else
							tooltip.options.permanent = false;
						Station[keys[index]].bindTooltip(tooltip);
					}
				});

		if (Station[keys[index]].getIcon()?.options?.className != `map-intensity-icon rt-icon ${levelClass}`)
			Station[keys[index]].setIcon(L.divIcon({
				iconSize  : [size, size],
				className : `map-intensity-icon rt-icon ${levelClass}`,
			}));

		Station[keys[index]]
			.setZIndexOffset(2000 + ~~(amount * 10) + Intensity * 500)
			.setTooltipContent(station_tooltip);

		const Level = IntensityI(Intensity);
		const now = new Date(Sdata.T * 1000);
		if (keys.includes(setting["Real-time.station"])) {
			if (keys[index] == setting["Real-time.station"]) {
				if (document.getElementById("rt-station").classList.contains("hide"))
					document.getElementById("rt-station").classList.remove("hide");
				document.getElementById("rt-station-intensity").className = amount < 999 ? IntensityToClassString(Intensity) : "na";
				document.getElementById("rt-station-name").innerText = station[keys[index]].Loc;
				document.getElementById("rt-station-time").innerText = now.format("MM/DD HH:mm:ss");
				document.getElementById("rt-station-pga").innerText = amount;
			}
		} else if (!document.getElementById("rt-station").classList.contains("hide"))
			document.getElementById("rt-station").classList.add("hide");

		if (pga[station[keys[index]].PGA] == undefined && Intensity != "NA")
			pga[station[keys[index]].PGA] = {
				Intensity : Intensity,
				Time      : 0,
			};

		if (Intensity != "NA" && (Intensity != 0 || Alert)) {
			if (Intensity > pga[station[keys[index]].PGA].Intensity) pga[station[keys[index]].PGA].Intensity = Intensity;
			if (Alert)
				if (Json.Alert) {
					if (setting["audio.realtime"])
						if (amount > 8 && PGALimit == 0) {
							PGALimit = 1;
							audioPlay("./audio/PGA1.wav");
						} else if (amount > 250 && PGALimit != 2) {
							PGALimit = 2;
							audioPlay("./audio/PGA2.wav");
						}
					pga[station[keys[index]].PGA].Time = NOW.getTime();
				}

			if (MAXPGA.pga < amount && Level != "NA") {
				MAXPGA.pga = amount;
				MAXPGA.station = keys[index];
				MAXPGA.level = Level;
				MAXPGA.lat = station[keys[index]].Lat;
				MAXPGA.long = station[keys[index]].Long;
				MAXPGA.loc = station[keys[index]].Loc;
				MAXPGA.intensity = Intensity;
				MAXPGA.ms = NOW.getTime() - Sdata.TS * 1000;
			}
		}
	}
	if (PAlert.data != undefined && replay == 0) {
		if (PAlert.timestamp != PAlertT) {
			PAlertT = PAlert.timestamp;
			const PLoc = {};
			let MaxI = 0;
			for (let index = 0; index < PAlert.data.length; index++) {
				PLoc[PAlert.data[index].loc] = PAlert.data[index].intensity;
				if (PAlert.data[index].intensity > MaxI) {
					MaxI = PAlert.data[index].intensity;
					Report = NOW.getTime();
					ReportGET({
						Max  : MaxI,
						Time : NOW.format("YYYY/MM/DD HH:mm:ss"),
					});
				}
			}
			if (PalertT != PAlert.timestamp && Object.keys(PLoc).length != 0) {
				PalertT = PAlert.timestamp;
				if (Pgeojson == null) {
					changeView("main", "#mainView_btn");
					if (setting["Real-time.show"]) win.showInactive();
					if (setting["Real-time.cover"]) win.moveTop();
					if (!win.isFocused()) win.flashFrame(true);
					if (setting["audio.realtime"]) audioPlay("./audio/palert.wav");
				} else Pgeojson.remove();
				Pgeojson = L.geoJson.vt(MapData.tw_town, {
					minZoom   : 4,
					maxZoom   : 12,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 5,
					style     : (properties) => {
						const name = properties.COUNTYNAME + " " + properties.TOWNNAME;
						if (PLoc[name] == 0 || PLoc[name] == undefined)
							return {
								color       : "transparent",
								weight      : 0,
								opacity     : 0,
								fillColor   : "transparent",
								fillOpacity : 0,
							};
						return {
							color       : TREM.Colors.secondary,
							weight      : 0.8,
							fillColor   : color(PLoc[name]),
							fillOpacity : 1,
						};
					},
				}).addTo(Maps.main);
				setTimeout(() => {
					ipcRenderer.send("screenshotEEW", {
						Function : "palert",
						ID       : 1,
						Version  : 1,
						Time     : NOW.getTime(),
						Shot     : 1,
					});
				}, 1250);
			}
		}
		if (NOW.getTime() - PAlert.timestamp > 630000)
			PAlert = {};
	}
	for (let index = 0; index < Object.keys(PGA).length; index++) {
		if (RMT == 0) Maps.main.removeLayer(PGA[Object.keys(PGA)[index]]);
		delete PGA[Object.keys(PGA)[index]];
		index--;
	}
	RMT++;
	for (let index = 0; index < Object.keys(pga).length; index++) {
		const Intensity = pga[Object.keys(pga)[index]].Intensity;
		if (NOW.getTime() - pga[Object.keys(pga)[index]].Time > 30000 || PGACancel) {
			delete pga[Object.keys(pga)[index]];
			index--;
		} else {
			PGA[Object.keys(pga)[index]] = L.polygon(PGAjson[Object.keys(pga)[index].toString()], {
				color     : color(Intensity),
				fillColor : "transparent",
			});
			let skip = false;
			if (Object.keys(EEW).length != 0)
				for (let Index = 0; Index < Object.keys(EEW).length; Index++) {
					let SKIP = 0;
					for (let i = 0; i < 4; i++) {
						const dis = Math.sqrt(Math.pow((PGAjson[Object.keys(pga)[index].toString()][i][0] - EEW[Object.keys(EEW)[Index]].lat) * 111, 2) + Math.pow((PGAjson[Object.keys(pga)[index].toString()][i][1] - EEW[Object.keys(EEW)[Index]].lon) * 101, 2));
						if (EEW[Object.keys(EEW)[Index]].km / 1000 > dis) SKIP++;
					}
					if (SKIP >= 4) {
						skip = true;
						break;
					}
				}
			if (skip) continue;
			if (RMT >= 2) Maps.main.addLayer(PGA[Object.keys(pga)[index]]);
		}
	}
	if (RMT >= 2) RMT = 0;
	if (Object.keys(pga).length != 0 && !PGAmark)
		PGAmark = true;
	if (PGAmark && Object.keys(pga).length == 0) {
		PGAmark = false;
		RMT = 1;
		RMTlimit = [];
		PGACancel = false;
	}
	if (Object.keys(PGA).length == 0) {
		PGAtag = -1;
		PGALimit = 0;
	}
	All = Json.I ?? [];
	for (let index = 0; index < All.length; index++)
		All[index].loc = station[All[index].uuid].Loc;
	if (All.length >= 2 && All[0].intensity > PGAtag && Object.keys(pga).length != 0) {
		if (setting["audio.realtime"])
			if (All[0].intensity >= 5 && PGAtag < 5)
				audioPlay("./audio/Shindo2.wav");
			else if (All[0].intensity >= 2 && PGAtag < 2)
				audioPlay("./audio/Shindo1.wav");
			else if (PGAtag == -1)
				audioPlay("./audio/Shindo0.wav");
		setTimeout(() => {
			ipcRenderer.send("screenshotEEW", {
				Function : "station",
				ID       : 1,
				Version  : 1,
				Time     : NOW.getTime(),
				Shot     : 1,
			});
		}, 2250);
		changeView("main", "#mainView_btn");
		if (setting["Real-time.show"]) win.showInactive();
		if (setting["Real-time.cover"]) win.moveTop();
		if (!win.isFocused()) win.flashFrame(true);
		PGAtag = All[0].intensity;
	}
	let list = [];
	let count = 0;
	if (All.length <= 8)
		for (let Index = 0; Index < All.length; Index++, count++) {
			if (count >= 8) break;
			const container = document.createElement("DIV");
			container.className = IntensityToClassString(All[Index].intensity);
			const location = document.createElement("span");
			location.innerText = `${All[Index].loc}\n${All[Index].pga} gal`;
			container.appendChild(document.createElement("span"));
			container.appendChild(location);
			list.push(container);
		}
	else {
		const Idata = {};
		for (let Index = 0; Index < All.length; Index++, count++) {
			if (Object.keys(Idata).length >= 8) break;
			const city = All[Index].loc.split(" ")[0];
			const CPGA = (Idata[city] == undefined) ? 0 : Idata[city];
			if (All[Index].pga > CPGA) {
				if (Idata[city] == undefined)Idata[city] = {};
				Idata[city].pga = All[Index].pga;
				Idata[city].intensity = All[Index].intensity;
			}
		}
		for (let index = 0; index < Object.keys(Idata).length; index++) {
			const container = document.createElement("DIV");
			container.className = IntensityToClassString(Idata[Object.keys(Idata)[index]].intensity);
			const location = document.createElement("span");
			location.innerText = `${Object.keys(Idata)[index]}\n${Idata[Object.keys(Idata)[index]].pga} gal`;
			container.appendChild(document.createElement("span"));
			container.appendChild(location);
			list.push(container);
		}
	}
	if (Json.Alert) IntensityListTime = Date.now();
	if (Date.now() - IntensityListTime > 180000)
		list = [];
	else
	if (Object.keys(EEW).length == 0)
		if (Date.now() - WarnAudio > 1500 && audioList.length == 0) {
			WarnAudio = Date.now();
			audioPlay("audio/Warn.wav");
		}


	document.getElementById("rt-list").replaceChildren(...list);
}

async function fetchFiles() {
	Location = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
	dump({ level: 0, message: "Get Location File", origin: "Location" });
	station = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
	dump({ level: 0, message: "Get Station File", origin: "Location" });
	PGAjson = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/pga.json")).json();
	dump({ level: 0, message: "Get PGA Location File", origin: "Location" });
	PGAMain();
}

// #region 用戶所在位置
/**
 * 設定用戶所在位置
 * @param {string} town 鄉鎮
 */
async function setUserLocationMarker(town) {
	if (!Location) {
		Location = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
		dump({ level: 0, message: "Get Location File", origin: "Location" });
	}

	[, UserLocationLat, UserLocationLon] = Location[setting["location.city"]][town];

	if (!marker) {
		const icon = L.icon({
			iconUrl  : "./image/here.png",
			iconSize : [20, 20],
		});
		marker = L.marker([UserLocationLat, UserLocationLon], { icon: icon })
			.setZIndexOffset(1)
			.addTo(Maps.main);
	} else marker.setLatLng([UserLocationLat, UserLocationLon]);
	dump({ level: 0, message: `User location set to ${setting["location.city"]} ${town} (${UserLocationLat}, ${UserLocationLon})`, origin: "Location" });
	Maps.main.fitBounds([[25.35, 119.65], [21.85, 124.05]]);
}
// #endregion

// #region 聚焦
TREM.Earthquake.on("focus", ({ center, size } = {}, force = false) => {
	if (!setting["map.autoZoom"])
		if (force) {
			center = [23.608428, 120.799168];
			size = 7.75;
		} else
			return;
	let X = 0;
	if (size >= 6) X = 2.5;
	if (size >= 6.5) X = 1.6;
	if (size >= 7) X = 1.5;
	if (size >= 7.5) X = 0.9;
	if (size >= 8) X = 0.6;
	if (size >= 8.5) X = 0.4;
	if (size >= 9) X = 0.35;
	if (size >= 9.5) X = 0.2;
	if (center) {
		Focus[0] = center[0];
		Focus[1] = center[1] + X;
		Focus[2] = size;
		if (Maps.main.getBounds().getCenter().lat.toFixed(2) != center[0].toFixed(2) || Maps.main.getBounds().getCenter().lng.toFixed(2) != (center[1] + X).toFixed(2) || size != Maps.main.getZoom())
			Maps.main.setView([center[0], center[1] + X], size);
	} else if (Focus.length != 0)
		if (Maps.main.getBounds().getCenter().lat.toFixed(2) != Focus[0].toFixed(2) || Maps.main.getBounds().getCenter().lng.toFixed(2) != Focus[1].toFixed(2) || Focus[2] != Maps.main.getZoom())
			Maps.main.setView([Focus[0], Focus[1]], Focus[2]);
});
// #endregion

// #region 音頻播放
let AudioT;
let AudioT1;
const audioDOM = new Audio();
const audioDOM1 = new Audio();
audioDOM.addEventListener("ended", () => {
	audioLock = false;
});
audioDOM1.addEventListener("ended", () => {
	audioLock1 = false;
});

function audioPlay(src) {
	audioList.push(src);
	if (!AudioT)
		AudioT = setInterval(() => {
			if (!audioLock) {
				audioLock = true;
				if (audioList.length)
					playNextAudio();
				else {
					clearInterval(AudioT);
					audioLock = false;
					AudioT = null;
				}
			}
		}, 0);
}
function audioPlay1(src) {
	audioList1.push(src);
	if (!AudioT1)
		AudioT1 = setInterval(() => {
			if (!audioLock1) {
				audioLock1 = true;
				if (audioList1.length)
					playNextAudio1();
				else {
					clearInterval(AudioT1);
					audioLock1 = false;
					AudioT1 = null;
				}
			}
		}, 0);
}
function playNextAudio() {
	audioLock = true;
	const nextAudioPath = audioList.shift();
	audioDOM.src = nextAudioPath;
	if (nextAudioPath.startsWith("./audio/1/") && setting["audio.eew"]) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM.play();
	} else if (!nextAudioPath.startsWith("./audio/1/")) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM.play();
	}
}
function playNextAudio1() {
	audioLock1 = true;
	const nextAudioPath = audioList1.shift();
	audioDOM1.src = nextAudioPath;
	audioDOM1.playbackRate = 1.1;
	if (nextAudioPath.startsWith("./audio/1/") && setting["audio.eew"]) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM1.play();
	} else if (!nextAudioPath.startsWith("./audio/1/")) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM1.play();
	}
}
// #endregion

// #region Report Data
async function ReportGET(eew) {
	try {
		const res = await getReportData();
		if (!res) return setTimeout(ReportGET, 1000, eew);
		dump({ level: 0, message: "Reports fetched", origin: "EQReportFetcher" });
		ReportList(res, eew);
	} catch (error) {
		dump({ level: 2, message: "Error fetching reports", origin: "EQReportFetcher" });
		dump({ level: 2, message: error, origin: "EQReportFetcher" });
		return setTimeout(ReportGET, 5000, eew);
	}
}
async function getReportData() {
	try {
		console.log(document.cookie);
		const list = await ExpTechAPI.v0.data.getEarthquakeReports(+setting["cache.report"]);
		TREM.Report.cache = new Map(list.map(v => [v.identifier, v]));
		return list;
	} catch (error) {
		dump({ level: 2, message: error, origin: "EQReportFetcher" });
		console.error(error);
	}
}
// #endregion

// #region Report 點擊
// eslint-disable-next-line no-shadow
const openURL = url => {
	shell.openExternal(url);
};
// #endregion

// #region Report list
function ReportList(earthquakeReportArr, eew) {
	roll.replaceChildren();
	for (let index = 0; index < earthquakeReportArr.length; index++) {
		if (eew != undefined && index == earthquakeReportArr.length - 1) {
			earthquakeReportArr[index].Max = eew.Max;
			earthquakeReportArr[index].Time = eew.Time;
		}
		addReport(earthquakeReportArr[index]);
	}
	setLocale(setting["general.locale"]);
}

function addReport(report, prepend = false) {
	if (replay != 0 && new Date(report.originTime).getTime() > new Date(replay + (NOW.getTime() - replayT)).getTime()) return;
	const Level = IntensityI(report.data[0].areaIntensity);
	let msg = "";
	if (report.location.includes("("))
		msg = report.location.substring(report.location.indexOf("(") + 1, report.location.indexOf(")")).replace("位於", "");
	else
		msg = report.location;

	let star = "";
	if (report.ID.length != 0) star += "↺ ";
	if (report.earthquakeNo % 1000 != 0) star += "✩ ";

	const Div = document.createElement("div");
	Div.className = "md3-ripple ";
	if (report.Time != undefined && report.report == undefined) {
		const report_container = document.createElement("div");
		report_container.className = "report-container locating";
		const report_intensity_container = document.createElement("div");
		report_intensity_container.className = "report-intensity-container";

		const report_intensity_title_container = document.createElement("div");
		report_intensity_title_container.className = "report-intensity-title-container";

		const report_intensity_title_en = document.createElement("span");
		report_intensity_title_en.lang = "en";
		report_intensity_title_en.className = "report-intensity-title";
		report_intensity_title_en.innerText = "Max Int.";
		const report_intensity_title_ja = document.createElement("span");
		report_intensity_title_ja.lang = "ja";
		report_intensity_title_ja.className = "report-intensity-title";
		report_intensity_title_ja.innerText = "最大震度";
		const report_intensity_title_kr = document.createElement("span");
		report_intensity_title_kr.lang = "kr";
		report_intensity_title_kr.className = "report-intensity-title";
		report_intensity_title_kr.innerText = "최대진도";
		const report_intensity_title_ru = document.createElement("span");
		report_intensity_title_ru.lang = "ru";
		report_intensity_title_ru.className = "report-intensity-title";
		report_intensity_title_ru.innerText = "Макс интенси";
		report_intensity_title_ru.style = "font-size: 14px;line-height: 14px";
		const report_intensity_title_zh_tw = document.createElement("span");
		report_intensity_title_zh_tw.lang = "zh-TW";
		report_intensity_title_zh_tw.className = "report-intensity-title";
		report_intensity_title_zh_tw.innerText = "最大震度";
		const report_intensity_title_zh_cn = document.createElement("span");
		report_intensity_title_zh_cn.lang = "zh-CN";
		report_intensity_title_zh_cn.className = "report-intensity-title";
		report_intensity_title_zh_cn.innerText = "最大震度";

		report_intensity_title_container.append(report_intensity_title_en, report_intensity_title_ja, report_intensity_title_kr, report_intensity_title_ru, report_intensity_title_zh_tw, report_intensity_title_zh_cn);
		report_intensity_title_container.childNodes.forEach((node) => node.style.display = node.lang == setting["general.locale"] ? "unset" : "none");

		const report_intensity_value = document.createElement("span");
		report_intensity_value.className = "report-intensity-value";
		report_intensity_value.innerText = IntensityI(report.Max);
		report_intensity_container.append(report_intensity_title_container, report_intensity_value);

		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = "震源 調查中";
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = report.Time.replace(/-/g, "/");
		report_detail_container.append(report_location, report_time);

		report_container.append(report_intensity_container, report_detail_container);
		Div.prepend(report_container);
		Div.className += IntensityToClassString(report.Max);
		ripple(Div);
		roll.prepend(Div);
		investigation = true;
	} else {
		const report_container = document.createElement("div");
		report_container.className = "report-container";

		const report_intensity_container = document.createElement("div");
		report_intensity_container.className = "report-intensity-container";

		const report_intensity_title_container = document.createElement("div");
		report_intensity_title_container.className = "report-intensity-title-container";

		const report_intensity_title_en = document.createElement("span");
		report_intensity_title_en.lang = "en";
		report_intensity_title_en.className = "report-intensity-title";
		report_intensity_title_en.innerText = "Max Int.";
		const report_intensity_title_ja = document.createElement("span");
		report_intensity_title_ja.lang = "ja";
		report_intensity_title_ja.className = "report-intensity-title";
		report_intensity_title_ja.innerText = "最大震度";
		const report_intensity_title_kr = document.createElement("span");
		report_intensity_title_kr.lang = "kr";
		report_intensity_title_kr.className = "report-intensity-title";
		report_intensity_title_kr.innerText = "최대진도";
		const report_intensity_title_ru = document.createElement("span");
		report_intensity_title_ru.lang = "ru";
		report_intensity_title_ru.className = "report-intensity-title";
		report_intensity_title_ru.innerText = "Макс интенси";
		report_intensity_title_ru.style = "font-size: 14px;line-height: 14px";
		const report_intensity_title_zh_tw = document.createElement("span");
		report_intensity_title_zh_tw.lang = "zh-TW";
		report_intensity_title_zh_tw.className = "report-intensity-title";
		report_intensity_title_zh_tw.innerText = "最大震度";
		const report_intensity_title_zh_cn = document.createElement("span");
		report_intensity_title_zh_cn.lang = "zh-CN";
		report_intensity_title_zh_cn.className = "report-intensity-title";
		report_intensity_title_zh_cn.innerText = "最大震度";

		report_intensity_title_container.append(report_intensity_title_en, report_intensity_title_ja, report_intensity_title_kr, report_intensity_title_ru, report_intensity_title_zh_tw, report_intensity_title_zh_cn);
		report_intensity_title_container.childNodes.forEach((node) => node.style.display = node.lang == setting["general.locale"] ? "unset" : "none");

		const report_intensity_value = document.createElement("span");
		report_intensity_value.className = "report-intensity-value";
		report_intensity_value.innerText = Level;
		report_intensity_container.append(report_intensity_title_container, report_intensity_value);


		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = `${star}${msg}`;
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = report.originTime.replace(/-/g, "/");
		const report_magnitude = document.createElement("span");
		report_magnitude.className = "report-magnitude";
		report_magnitude.innerText = report.magnitudeValue.toFixed(1);
		const report_depth = document.createElement("span");
		report_depth.className = "report-depth";
		report_depth.innerText = report.depth;
		report_detail_container.append(report_location, report_time, report_magnitude, report_depth);

		report_container.append(report_intensity_container, report_detail_container);
		ripple(Div);
		Div.append(report_container);
		Div.className += IntensityToClassString(report.data[0].areaIntensity);
		Div.addEventListener("click", (event) => {
			TREM.Report.setView("report-overview", report.identifier);
			changeView("report", "#reportView_btn");
		});
		if (prepend) {
			const locating = document.querySelector(".report-detail-container.locating");
			if (locating)
				locating.replaceWith(Div.children[0]);
			else {
				if (investigation) {
					investigation = false;
					roll.removeChild(roll.children[0]);
				}
				roll.prepend(Div);
			}
			TREM.Report.setView("report-overview", report.identifier);
			changeView("report", "#reportView_btn");
			ReportTag = NOW.getTime();
		} else
			roll.append(Div);
	}
}

// #endregion

// #region 設定
function openSettingWindow() {
	win.setAlwaysOnTop(false);
	ipcRenderer.send("openChildWindow");
}
// #endregion

// #region PGA
function PGAcount(Scale, distance, Si) {
	let S = Si ?? 1;
	if (!setting["earthquake.siteEffect"]) S = 1;
	// eslint-disable-next-line no-shadow
	const PGA = (1.657 * Math.pow(Math.E, (1.533 * Scale)) * Math.pow(distance, -1.607) * S).toFixed(3);
	return PGA >= 800 ? "7" :
		PGA <= 800 && PGA > 440 ? "6+" :
			PGA <= 440 && PGA > 250 ? "6-" :
				PGA <= 250 && PGA > 140 ? "5+" :
					PGA <= 140 && PGA > 80 ? "5-" :
						PGA <= 80 && PGA > 25 ? "4" :
							PGA <= 25 && PGA > 8 ? "3" :
								PGA <= 8 && PGA > 2.5 ? "2" :
									PGA <= 2.5 && PGA > 0.8 ? "1" :
										"0";
}
// #endregion

// #region Number >> Intensity
function IntensityI(Intensity) {
	return Intensity == 5 ? "5-" :
		Intensity == 6 ? "5+" :
			Intensity == 7 ? "6-" :
				Intensity == 8 ? "6+" :
					Intensity == 9 ? "7" :
						Intensity ?? "?";
}
// #endregion

// #region Intensity >> Number
function IntensityN(level) {
	return level == "5-" ? 5 :
		level == "5+" ? 6 :
			level == "6-" ? 7 :
				level == "6+" ? 8 :
					level == "7" ? 9 :
						Number(level);
}
// #endregion

// #region Intensity >> Class String
function IntensityToClassString(level) {
	let classname = (level == 9) ? "seven" :
		(level == 8) ? "six strong" :
			(level == 7) ? "six" :
				(level == 6) ? "five strong" :
					(level == 5) ? "five" :
						(level == 4) ? "four" :
							(level == 3) ? "three" :
								(level == 2) ? "two" :
									(level == 1) ? "one" :
										"zero";

	if (tinycolor(setting["theme.customColor"] ? setting[`theme.int.${level ? level : 1}`] : ["#757575", "#2774C2", "#7BA822", "#E8D630", "#E68439", "#DB641F", "#F55647", "#DB1F1F", "#862DB3"][level ? level - 1 : 0]).getLuminance() > 0.575)
		classname += " darkText";

	return classname;
}
// #endregion

// #region color
function color(Intensity) {
	return setting["theme.customColor"] ? setting[`theme.int.${Intensity ? Intensity : 1}`]
		: ["#757575", "#2774C2", "#7BA822", "#E8D630", "#E68439", "#DB641F", "#F55647", "#DB1F1F", "#862DB3"][Intensity ? Intensity - 1 : Intensity];
	// return ["#666666", "#0165CC", "#01BB02", "#EBC000", "#FF8400", "#E06300", "#FF0000", "#B50000", "#68009E"][Intensity ? Intensity - 1 : Intensity];
}
// #endregion

// #region IPC
ipcMain.once("start", () => {
	try {
		setInterval(() => {
			if (DATAstamp != 0 && Stamp != DATAstamp) {
				Stamp = DATAstamp;
				FCMdata(DATA);
			}
		}, 0);
		dump({ level: 0, message: `Initializing ServerCore >> ${ServerVer}`, origin: "Initialization" });
	} catch (error) {
		showDialog("error", "發生錯誤", `初始化過程中發生錯誤，您可以繼續使用此應用程式，但無法保證所有功能皆能繼續正常運作。\n\n如果這是您第一次看到這個訊息，請嘗試重新啟動應用程式。\n如果這個錯誤持續出現，請到 TREM Discord 伺服器回報問題。\n\n錯誤訊息：${error}`);
		$("#load").delay(1000).fadeOut(1000);
		dump({ level: 2, message: error, origin: "Initialization" });
	}
});

const stopReplay = function() {
	if (Object.keys(EarthquakeList).length != 0) Cancel = true;
	if (Object.keys(pga).length != 0) PGACancel = true;
	if (replay != 0) {
		replay = 0;
		ReportGET();
	}
	IntensityListTime = 0;
	All = [];
	const data = {
		Function      : "earthquake",
		Type          : "cancel",
		FormatVersion : 3,
		UUID          : localStorage.UUID,
	};
	axios.post(PostAddressIP, data)
		.catch((error) => {
			dump({ level: 2, message: error, origin: "Verbose" });
		});

	document.getElementById("togglenav_btn").classList.remove("hide");
	document.getElementById("stopReplay").classList.add("hide");
};

ipcMain.on("testEEW", () => {
	if (localStorage.TestID != undefined) {
		const list = localStorage.TestID.split(",");
		for (let index = 0; index < list.length; index++)
			setTimeout(() => {
				dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
				const data = {
					Function      : "earthquake",
					Type          : "test",
					FormatVersion : 3,
					UUID          : localStorage.UUID,
					ID            : list[index],
				};
				dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
				axios.post(PostAddressIP, data)
					.catch((error) => {
						dump({ level: 2, message: error, origin: "Verbose" });
					});
			}, 100);
		delete localStorage.TestID;
	} else {
		dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
		const data = {
			Function      : "earthquake",
			Type          : "test",
			FormatVersion : 3,
			UUID          : localStorage.UUID,
		};
		dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
		axios.post(PostAddressIP, data)
			.catch((error) => {
				dump({ level: 2, message: error, origin: "Verbose" });
			});
	}
});

ipcRenderer.on("settingError", (event, error) => {
	is_setting_disabled = error;
});

const updateMapColors = async (event, value) => {
	let accent, dark;
	if (typeof value == "boolean") {
		accent = setting["theme.color"];
		dark = value;
	} else {
		accent = value;
		dark = setting["theme.dark"];
	}

	TREM.Colors = await getThemeColors(accent, dark);

	for (const mapName in MapBases)
		for (const baseMap of MapBases[mapName]) {
			baseMap.options.style = {
				weight      : 0.8,
				color       : TREM.Colors.primary,
				fillColor   : TREM.Colors.surfaceVariant,
				fillOpacity : 1,
			};
			baseMap.redraw();
		}
};

ipcRenderer.on("config:theme", updateMapColors);
ipcRenderer.on("config:dark", updateMapColors);
ipcRenderer.on("config:color", (event, key, value) => {
	if (typeof event == "boolean") key = event;
	if (typeof key == "boolean")
		for (let i = 0; i < 10; i++) {
			if (i > 0) document.body.style[key ? "setProperty" : "removeProperty"](`--custom-int-${i}`, setting[`theme.int.${i}`]);
			if (tinycolor(key ? setting[`theme.int.${i ? i : 1}`] : ["#757575", "#2774C2", "#7BA822", "#E8D630", "#E68439", "#DB641F", "#F55647", "#DB1F1F", "#862DB3"][i ? i - 1 : 0]).getLuminance() > 0.575)
				$(`.${IntensityToClassString(i).replace(" darkText", "").split(" ").join(".")}`).addClass("darkText");
			else
				$(`.${IntensityToClassString(i).replace(" darkText", "").split(" ").join(".")}`).removeClass("darkText");
		}
	else if (setting["theme.customColor"]) {
		document.body.style.setProperty(`--${key.replace(/\./g, "-").replace("theme", "custom")}`, value);
		if (tinycolor(value).getLuminance() > 0.575)
			$(`.${IntensityToClassString(IntensityN(key.replace("theme.int.", ""))).replace(" darkText", "").split(" ").join(".")}`).addClass("darkText");
		else
			$(`.${IntensityToClassString(IntensityN(key.replace("theme.int.", ""))).replace(" darkText", "").split(" ").join(".")}`).removeClass("darkText");
	}

});
ipcRenderer.on("config:location", (event, value) => {
	setUserLocationMarker(value);
});
ipcRenderer.on("config:mapanimation", (event, value) => {
	Maps.main._fadeAnimated = value;
	Maps.main._zoomAnimated = value;
	Maps.report._fadeAnimated = value;
	Maps.report._zoomAnimated = value;
});
// #endregion

// #region EEW
async function FCMdata(data) {
	const json = JSON.parse(data);
	if (Server.includes(json.TimeStamp) || NOW.getTime() - json.TimeStamp > 180000) return;
	Server.push(json.TimeStamp);
	if (Server.length > 5) Server.splice(0, 1);
	// eslint-disable-next-line no-empty-function
	fs.writeFile(path.join(app.getPath("userData"), "server.json"), JSON.stringify(Server), () => {});
	GetData = true;
	if (json.response != "You have successfully subscribed to earthquake information" && json.FormatVersion == 1) {
		const folder = path.join(app.getPath("userData"), "data");
		if (!fs.existsSync(folder))
			fs.mkdirSync(folder);
		const list = fs.readdirSync(folder);
		for (let index = 0; index < list.length; index++) {
			const date = fs.statSync(`${folder}/${list[index]}`);
			if (new Date().getTime() - date.ctimeMs > 3600000) fs.unlinkSync(`${folder}/${list[index]}`);
		}
		const filename = `${NOW.getTime()}.json`;
		fs.writeFileSync(path.join(folder, filename), JSON.stringify(json));
	}
	if (json.TimeStamp != undefined)
		dump({ level: 0, message: `Latency: ${NOW.getTime() - json.TimeStamp}ms`, origin: "API" });
	if (json.Function == "tsunami") {
		dump({ level: 0, message: "Got Tsunami Warning", origin: "API" });
		new Notification("海嘯資訊", { body: `${json["UTC+8"]} 發生 ${json.Scale} 地震\n\n東經: ${json.EastLongitude} 度\n北緯: ${json.NorthLatitude} 度`, icon: "TREM.ico" });
	} else if (json.Function == "TSUNAMI")
		TREM.Earthquake.emit("tsunami", json);
	else if (json.Function == "palert")
		PAlert = json.Data;
	else if (json.Function == "TREM_earthquake")
		trem_alert = json;
	else if (json.Function == "PWS") {
		if (PWS != null) PWS.remove();
		PWS = L.geoJson.vt(MapData.tw_town, {
			minZoom   : 4,
			maxZoom   : 12,
			tolerance : 20,
			buffer    : 256,
			debug     : 0,
			zIndex    : 5,
			style     : (properties) => {
				const name = properties.COUNTYNAME + " " + properties.TOWNNAME;
				if (!name.includes("臺南市"))
					return {
						color       : "transparent",
						weight      : 0,
						opacity     : 0,
						fillColor   : "transparent",
						fillOpacity : 0,
					};
				return {
					color       : "white",
					weight      : 3,
					fillColor   : TREM.Colors.surfaceVariant,
					fillOpacity : 0,
				};
			},
		}).addTo(Maps.main);
	} else if (json.Function == "intensity") {
		console.log("intensity");
		console.log(json);
	} else if (json.Function == "Replay") {
		replay = json.timestamp;
		replayT = NOW.getTime();
		ReportGET();
	} else if (json.Function == "report") {
		if (Pgeojson != null) {
			Pgeojson.remove();
			Pgeojson = null;
		}
		dump({ level: 0, message: "Got Earthquake Report", origin: "API" });

		if (setting["report.show"]) win.showInactive();
		if (setting["report.cover"]) win.moveTop();

		if (setting["audio.report"]) audioPlay("./audio/Report.wav");
		new Notification("地震報告",
			{
				body   : `${json.Location.substring(json.Location.indexOf("(") + 1, json.Location.indexOf(")")).replace("位於", "")}\n${json["UTC+8"]}\n發生 M${json.Scale} 有感地震`,
				icon   : "TREM.ico",
				silent : win.isFocused(),
			});
		const report = await getReportData();
		addReport(report[0], true);

		if (setting[report.changeView]) {
			TREM.Report.setView("report-overview", report[0].identifier);
			changeView("report", "#reportView_btn");
		}

		setTimeout(() => {
			ipcRenderer.send("screenshotEEW", {
				Function : "report",
				ID       : json.ID,
				Version  : 1,
				Time     : NOW.getTime(),
				Shot     : 1,
			});
		}, 5000);
	} else if (json.Function != undefined && json.Function.includes("earthquake") || json.Replay || json.Test) {
		if (replay != 0 && !json.Replay) return;
		if (!json.Replay && !json.Test) {
			if (json.Function == "SCDZJ_earthquake" && !setting["accept.eew.SCDZJ"]) return;
			if (json.Function == "NIED_earthquake" && !setting["accept.eew.NIED"]) return;
			if (json.Function == "JMA_earthquake" && !setting["accept.eew.JMA"]) return;
			if (json.Function == "KMA_earthquake" && !setting["accept.eew.KMA"]) return;
			if (json.Function == "earthquake" && !setting["accept.eew.CWB"]) return;
			if (json.Function == "FJDZJ_earthquake" && !setting["accept.eew.FJDZJ"]) return;
			TREM.Earthquake.emit("eew", json);
		} else
			// if (json.Function != "earthquake") return;
			TREM.Earthquake.emit("eew", json);

	}
}
// #endregion

// #region Event: eew
TREM.Earthquake.on("eew", (data) => {
	dump({ level: 0, message: "Got EEW", origin: "API" });
	console.debug(data);

	// handler
	if (EarthquakeList[data.ID] == undefined) EarthquakeList[data.ID] = {};
	EarthquakeList[data.ID].Time = data.Time;
	EarthquakeList[data.ID].ID = data.ID;
	let value = 0;
	let distance = 0;

	const GC = {};
	let level;
	let MaxIntensity = 0;
	for (const city in TREM.Resources.region)
		for (const town in TREM.Resources.region[city]) {
			const loc = TREM.Resources.region[city][town];
			const d = TREM.Utils.twoSideDistance(
				TREM.Utils.twoPointDistance(
					{ lat: loc[1], lon: loc[2] },
					{ lat: data.NorthLatitude, lon: data.EastLongitude },
				),
				data.Depth,
			);

			const int = TREM.Utils.PGAToIntensity(
				TREM.Utils.pga(
					data.Scale,
					d,
					setting["earthquake.siteEffect"] ? loc[3] : undefined,
				),
			);

			if (setting["location.city"] == city && setting["location.town"] == town) {
				if (setting["auto.waveSpeed"] && data.Speed != undefined) {
					Pspeed = data.Speed.Pv;
					Sspeed = data.Speed.Sv;
				}
				level = int;
				value = Math.round((d - ((NOW.getTime() - data.Time) / 1000) * Sspeed) / Sspeed) - 5;
				distance = d;
			}

			const Intensity = IntensityN(int);
			if (Intensity > MaxIntensity) MaxIntensity = Intensity;
			GC[loc[0]] = Intensity;
		}

	EarthquakeList[data.ID].geojson = L.geoJson.vt(MapData.tw_town, {
		minZoom   : 7,
		maxZoom   : 7,
		tolerance : 20,
		buffer    : 256,
		debug     : 0,
		zIndex    : 1,
		style     : (properties) => {
			if (properties.TOWNCODE) {
				if (!GC[properties.TOWNCODE])
					return {
						stroke      : false,
						color       : "transparent",
						weight      : 0.8,
						opacity     : 0,
						fillColor   : TREM.Colors.surfaceVariant,
						fillOpacity : 0.6,
					};
				return {
					stroke      : false,
					color       : "transparent",
					weight      : 0.8,
					opacity     : 0,
					fillColor   : color(GC[properties.TOWNCODE]),
					fillOpacity : 1,
				};
			} else
				return {
					color       : "transparent",
					weight      : 0.8,
					opacity     : 0,
					fillColor   : TREM.Colors.surfaceVariant,
					fillOpacity : 0.6,
				};
		},
	});

	let Alert = true;
	if (IntensityN(level) < Number(setting["eew.Intensity"]) && !data.Replay) Alert = false;
	if (!Info.Notify.includes(data.ID)) {
		let Nmsg = "";
		if (value > 0)
			Nmsg = `${value}秒後抵達`;
		else
			Nmsg = "已抵達 (預警盲區)";
		new Notification("EEW 強震即時警報", {
			body   : `${level.replace("+", "強").replace("-", "弱")}級地震，${Nmsg}\nM ${data.Scale} ${data.Location ?? "未知區域"}\n延遲 ${NOW.getTime() - data.TimeStamp}ms`,
			icon   : "TREM.ico",
			silent : win.isFocused(),
		});
		Info.Notify.push(data.ID);
		// show latest eew
		TINFO = INFO.length;
		clearInterval(ticker);
		ticker = setInterval(() => {
			if (TINFO + 1 >= INFO.length)
				TINFO = 0;
			else TINFO++;
		}, 5000);

		if (Alert) {
			changeView("main", "#mainView_btn");
			if (setting["eew.show"]) win.showInactive();
			if (setting["eew.cover"]) win.moveTop();
			if (!win.isFocused()) win.flashFrame(true);
		}

		EEWT.id = data.ID;
		if (setting["audio.eew"] && Alert) {
			audioPlay("./audio/EEW.wav");
			audioPlay1(`./audio/1/${level.replace("+", "").replace("-", "")}.wav`);
			if (level.includes("+"))
				audioPlay1("./audio/1/intensity-strong.wav");
			else if (level.includes("-"))
				audioPlay1("./audio/1/intensity-weak.wav");
			else
				audioPlay1("./audio/1/intensity.wav");

			if (value > 0 && value < 100) {
				if (value <= 10)
					audioPlay1(`./audio/1/${value.toString()}.wav`);
				else if (value < 20)
					audioPlay1(`./audio/1/x${value.toString().substring(1, 2)}.wav`);
				else {
					audioPlay1(`./audio/1/${value.toString().substring(0, 1)}x.wav`);
					audioPlay1(`./audio/1/x${value.toString().substring(1, 2)}.wav`);
				}
				audioPlay1("./audio/1/second.wav");
			}
		}
	}
	if (MaxIntensity >= 5) {
		data.Alert = true;
		if (!Info.Warn.includes(data.ID)) {
			Info.Warn.push(data.ID);
			if (!EEWAlert) {
				EEWAlert = true;
				if (setting["audio.eew"] && Alert)
					for (let index = 0; index < 5; index++)
						audioPlay("./audio/Alert.wav");
			}
		}
	} else
		data.Alert = false;

	let _time = -1;
	let stamp = 0;
	if (EEW[data.ID] != undefined)
		if (setting["audio.eew"] && Alert) audioPlay("./audio/Update.wav");
	EEW[data.ID] = {
		lon  : Number(data.EastLongitude),
		lat  : Number(data.NorthLatitude),
		time : 0,
		Time : data.Time,
		id   : data.ID,
		km   : 0,
	};
	value = Math.round((distance - ((NOW.getTime() - data.Time) / 1000) * Sspeed) / Sspeed);
	if (Second == -1 || value < Second)
		if (setting["audio.eew"] && Alert)
			if (arrive == data.ID || arrive == "") {
				arrive = data.ID;
				if (t != null) clearInterval(t);
				t = setInterval(() => {
					value = Math.floor((distance - ((NOW.getTime() - data.Time) / 1000) * Sspeed) / Sspeed);
					Second = value;
					if (stamp != value && !audioLock1) {
						stamp = value;
						if (_time >= 0) {
							audioPlay("./audio/1/ding.wav");
							_time++;
							if (_time >= 10)
								clearInterval(t);
						} else if (value < 100)
							if (value > 10)
								if (value.toString().substring(1, 2) == "0") {
									audioPlay1(`./audio/1/${value.toString().substring(0, 1)}x.wav`);
									audioPlay1("./audio/1/x0.wav");
								} else
									audioPlay("./audio/1/ding.wav");

							else if (value > 0)
								audioPlay1(`./audio/1/${value.toString()}.wav`);
							else {
								arrive = data.ID;
								audioPlay1("./audio/1/arrive.wav");
								_time = 0;
							}
					}
				}, 50);
			}

	const speed = setting["shock.smoothing"] ? 100 : 500;
	if (EarthquakeList[data.ID].Timer != undefined) clearInterval(EarthquakeList[data.ID].Timer);
	if (EarthquakeList.ITimer != undefined) clearInterval(EarthquakeList.ITimer);

	// AlertBox: 種類
	let classString = "alert-box ";
	if (data.Replay) {
		replay = data.timestamp;
		replayT = NOW.getTime();
	} else
		replay = 0;

	if (data.Test)
		classString += "eew-test";
	else if (data.Alert)
		classString += "eew-alert";
	else
		classString += "eew-pred";

	let find = INFO.findIndex(v => v.ID == data.ID);
	if (find == -1) find = INFO.length;
	INFO[find] = {
		ID              : data.ID,
		alert_number    : data.Version,
		alert_intensity : MaxIntensity,
		alert_location  : data.Location ?? "未知區域",
		alert_time      : new Date(data["UTC+8"]),
		alert_sTime     : new Date(data.Time),
		alert_local     : IntensityN(level),
		alert_magnitude : data.Scale,
		alert_depth     : data.Depth,
		alert_provider  : data.Unit,
		alert_type      : classString,
		"intensity-1"   : `<font color="white" size="7"><b>${IntensityI(MaxIntensity)}</b></font>`,
		"time-1"        : `<font color="white" size="2"><b>${data["UTC+8"]}</b></font>`,
		"info-1"        : `<font color="white" size="4"><b>M ${data.Scale} </b></font><font color="white" size="3"><b> 深度: ${data.Depth} km</b></font>`,
		distance,
	};

	// switch to main view
	$("#mainView_btn")[0].click();
	// remember navrail state
	const navState = !$("#nav-rail").hasClass("hide");
	// hide navrail so the view goes fullscreen
	if (navState) toggleNav(false);
	// hide report to make screen clean
	$(roll).fadeOut(200);
	// show minimap
	$("#map-tw").addClass("show");

	updateText();

	if (ITimer == null)
		ITimer = setInterval(() => {
			updateText();
			if (ticker == null)
				ticker = setInterval(() => {
					if (TINFO + 1 >= INFO.length)
						TINFO = 0;
					else TINFO++;
				}, 5000);
		}, 1000);

	EEWshot = NOW.getTime() - 28500;
	EEWshotC = 1;
	main(data);
	EarthquakeList[data.ID].Timer = setInterval(() => {
		main(data);
	}, speed);

	setTimeout(() => {
		if (setting["webhook.url"] != "") {
			const Now = NOW.getFullYear() +
				"/" + (NOW.getMonth() + 1) +
				"/" + NOW.getDate() +
				" " + NOW.getHours() +
				":" + NOW.getMinutes() +
				":" + NOW.getSeconds();

			let msg = setting["webhook.body"];
			msg = msg.replace("%Depth%", data.Depth).replace("%NorthLatitude%", data.NorthLatitude).replace("%Time%", data["UTC+8"]).replace("%EastLongitude%", data.EastLongitude).replace("%Scale%", data.Scale);
			if (data.Function == "earthquake")
				msg = msg.replace("%Provider%", "交通部中央氣象局");
			else if (data.Function == "SCDZJ_earthquake")
				msg = msg.replace("%Provider%", "四川省地震局");
			else if (data.Function == "FJDZJ_earthquake")
				msg = msg.replace("%Provider%", "福建省地震局");
			else if (data.Function == "NIED_earthquake")
				msg = msg.replace("%Provider%", "防災科学技術研究所");
			else if (data.Function == "JMA_earthquake")
				msg = msg.replace("%Provider%", "気象庁(JMA)");
			else if (data.Function == "KMA_earthquake")
				msg = msg.replace("%Provider%", "기상청(KMA)");

			msg = JSON.parse(msg);
			msg.username = "TREM | 臺灣即時地震監測";

			msg.embeds[0].image.url = "";
			msg.embeds[0].footer = {
				text     : `ExpTech Studio ${Now}`,
				icon_url : "https://raw.githubusercontent.com/ExpTechTW/API/master/image/Icon/ExpTech.png",
			};
			dump({ level: 0, message: "Posting Webhook", origin: "Webhook" });
			axios.post(setting["webhook.url"], msg)
				.catch((error) => {
					dump({ level: 2, message: error, origin: "Webhook" });
				});
		}
	}, 2000);
});
// #endregion

TREM.Earthquake.on("tsunami", (data) => {
	if (data.Version == 1) {
		new Notification("海嘯警報", {
			body   : `${data["UTC+8"]} 發生 ${data.Scale} 地震\n\n東經: ${data.EastLongitude} 度\n北緯: ${data.NorthLatitude} 度`,
			icon   : "TREM.ico",
			silent : win.isFocused(),
		});

		if (setting["report.show"]) win.showInactive();
		if (setting["report.cover"]) win.moveTop();

		if (setting["audio.report"]) audioPlay("./audio/Water.wav");
		TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
	}
	if (data.Cancel) {
		if (TSUNAMI.E)
			TSUNAMI.E.remove();
		if (TSUNAMI.EN)
			TSUNAMI.EN.remove();
		if (TSUNAMI.ES)
			TSUNAMI.ES.remove();
		if (TSUNAMI.N)
			TSUNAMI.N.remove();
		if (TSUNAMI.WS)
			TSUNAMI.WS.remove();
		if (TSUNAMI.W)
			TSUNAMI.W.remove();
		if (TSUNAMI.warnIcon)
			TSUNAMI.warnIcon.remove();
		TSUNAMI = {};
	} else {
		if (!TSUNAMI.warnIcon) {
			const warnIcon = L.icon({
				iconUrl   : "./image/warn.png",
				iconSize  : [30, 30],
				className : "tsunami",
			});
			TSUNAMI.warnIcon = L.marker([+data.NorthLatitude, +data.EastLongitude], { icon: warnIcon }).addTo(Maps.main);
		} else TSUNAMI.warnIcon.setLatLng([+data.NorthLatitude, +data.EastLongitude]);

		if (!TSUNAMI.E) {
			TSUNAMI.E = L.geoJson.vt(MapData.E, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[0].areaColor),
					fill    : false,
				},
			}).addTo(Maps.main);
			L.DomUtil.addClass(TSUNAMI.E._container, "tsunami");
		} else TSUNAMI.E.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[0].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.EN) {
			TSUNAMI.EN = L.geoJson.vt(MapData.EN, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[1].areaColor),
					fill    : false,
				},
			}).addTo(Maps.main);
			L.DomUtil.addClass(TSUNAMI.EN._container, "tsunami");
		} else TSUNAMI.EN.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[1].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.ES) {
			TSUNAMI.ES = L.geoJson.vt(MapData.ES, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[2].areaColor),
					fill    : false,
				},
			}).addTo(Maps.main);
			L.DomUtil.addClass(TSUNAMI.ES._container, "tsunami");
		} else TSUNAMI.ES.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[2].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.N) {
			TSUNAMI.N = L.geoJson.vt(MapData.N, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor.vt(data.Addition[3].areaColor),
					fill    : false,
				},
			}).addTo(Maps.main);
			L.DomUtil.addClass(TSUNAMI.N._container, "tsunami");
		} else TSUNAMI.N.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[3].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.WS) {
			TSUNAMI.WS = L.geoJson.vt(MapData.WS, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[4].areaColor),
					fill    : false,
				},
			}).addTo(Maps.main);
			L.DomUtil.addClass(TSUNAMI.WS._container, "tsunami");
		} else TSUNAMI.WS.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[4].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.W) {
			TSUNAMI.W = L.geoJson.vt(MapData.W, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[5].areaColor),
					fill    : false,
				},
			}).addTo(Maps.main);
			L.DomUtil.addClass(TSUNAMI.W._container, "tsunami");
		} else TSUNAMI.W.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[5].areaColor),
			fill    : false,
		});
	}
});

function main(data) {
	if (EarthquakeList[data.ID].Depth != null) Maps.main.removeLayer(EarthquakeList[data.ID].Depth);
	if (EarthquakeList[data.ID].Cancel == undefined) {
		if (setting["shock.p"]) {
			const kmP = Math.sqrt(Math.pow((NOW.getTime() - data.Time) * Pspeed, 2) - Math.pow(Number(data.Depth) * 1000, 2));
			if (kmP > 0) {
				if (!EarthquakeList[data.ID].CircleP)
					EarthquakeList[data.ID].CircleP = L.circle([+data.NorthLatitude, +data.EastLongitude], {
						color     : "#6FB7B7",
						fillColor : "transparent",
						radius    : kmP,
						renderer  : L.svg(),
						className : "p-wave",
					}).addTo(Maps.main);

				if (!EarthquakeList[data.ID].CircleP.getLatLng().equals([+data.NorthLatitude, +data.EastLongitude]))
					EarthquakeList[data.ID].CircleP
						.setLatLng([+data.NorthLatitude, +data.EastLongitude]);

				EarthquakeList[data.ID].CircleP
					.setRadius(kmP);

				if (!EarthquakeList[data.ID].CirclePTW)
					EarthquakeList[data.ID].CirclePTW = L.circle([data.NorthLatitude, data.EastLongitude], {
						color     : "#6FB7B7",
						fillColor : "transparent",
						radius    : kmP,
						renderer  : L.svg(),
						className : "p-wave",
					}).addTo(Maps.mini);

				if (!EarthquakeList[data.ID].CirclePTW.getLatLng().equals([+data.NorthLatitude, +data.EastLongitude]))
					EarthquakeList[data.ID].CirclePTW
						.setLatLng([+data.NorthLatitude, +data.EastLongitude]);

				EarthquakeList[data.ID].CirclePTW
					.setRadius(kmP);
			}
		}
		const km = Math.pow((NOW.getTime() - data.Time) * Sspeed, 2) - Math.pow(Number(data.Depth) * 1000, 2);
		if (km > 0) {
			const kmS = Math.sqrt(km);
			EEW[data.ID].km = kmS;
			if (!EarthquakeList[data.ID].CircleS)
				EarthquakeList[data.ID].CircleS = L.circle([+data.NorthLatitude, +data.EastLongitude], {
					color       : data.Alert ? "red" : "orange",
					fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
					fillOpacity : 1,
					radius      : kmS,
					renderer    : L.svg(),
					className   : "s-wave",
				}).addTo(Maps.main);

			if (!EarthquakeList[data.ID].CircleS.getLatLng().equals([+data.NorthLatitude, +data.EastLongitude]))
				EarthquakeList[data.ID].CircleS
					.setLatLng([+data.NorthLatitude, +data.EastLongitude]);

			EarthquakeList[data.ID].CircleS
				.setRadius(kmS)
				.setStyle(
					{
						color     : data.Alert ? "red" : "orange",
						fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
					},
				);

			if (!EarthquakeList[data.ID].CircleSTW)
				EarthquakeList[data.ID].CircleSTW = L.circle([+data.NorthLatitude, +data.EastLongitude], {
					color       : data.Alert ? "red" : "orange",
					fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
					fillOpacity : 1,
					radius      : kmS,
					renderer    : L.svg(),
					className   : "s-wave",
				}).addTo(Maps.mini);

			if (!EarthquakeList[data.ID].CircleSTW.getLatLng().equals([+data.NorthLatitude, +data.EastLongitude]))
				EarthquakeList[data.ID].CircleSTW
					.setLatLng([+data.NorthLatitude, +data.EastLongitude]);

			EarthquakeList[data.ID].CircleSTW
				.setRadius(kmS)
				.setStyle(
					{
						color     : data.Alert ? "red" : "orange",
						fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
					},
				);
		} else {
			let Progress = 0;
			const num = Math.round(((NOW.getTime() - data.Time) * Sspeed / (data.Depth * 1000)) * 100);
			if (num > 15) Progress = 1;
			if (num > 25) Progress = 2;
			if (num > 35) Progress = 3;
			if (num > 45) Progress = 4;
			if (num > 55) Progress = 5;
			if (num > 65) Progress = 6;
			if (num > 75) Progress = 7;
			if (num > 85) Progress = 8;
			if (num > 98) Progress = 9;
			const myIcon = L.icon({
				iconUrl  : `./image/progress${Progress}.png`,
				iconSize : [50, 50],
			});
			const DepthM = L.marker([Number(data.NorthLatitude), Number(data.EastLongitude) + 0.15], { icon: myIcon });
			EarthquakeList[data.ID].Depth = DepthM;
			Maps.main.addLayer(DepthM);
			DepthM.setZIndexOffset(6000);
		}


		// #region Epicenter Cross Icon

		let epicenterIcon;
		let offsetX = 0;
		let offsetY = 0;

		const cursor = INFO.findIndex((v) => v.ID == data.ID) + 1;
		if (cursor <= 4 && INFO.length > 1) {
			epicenterIcon = L.icon({
				iconUrl   : `./image/cross${cursor}.png`,
				iconSize  : [40, 40],
				className : "epicenterIcon",
			});
			if (cursor == 1) offsetY = 0.03;
			if (cursor == 2) offsetX = 0.03;
			if (cursor == 3) offsetY = -0.03;
			if (cursor == 4) offsetX = -0.03;
		} else
			epicenterIcon = L.icon({
				iconUrl   : "./image/cross.png",
				iconSize  : [30, 30],
				className : "epicenterIcon",
			});

		// main map
		if (!EarthquakeList[data.ID].epicenterIcon)
			EarthquakeList[data.ID].epicenterIcon = L.marker([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX], { icon: epicenterIcon, zIndexOffset: 6000 }).addTo(Maps.main);

		if (EarthquakeList[data.ID].epicenterIcon.getIcon()?.options?.iconUrl != epicenterIcon.options.iconUrl)
			EarthquakeList[data.ID].epicenterIcon.setIcon(epicenterIcon);

		if (!EarthquakeList[data.ID].epicenterIcon.getLatLng().equals([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX]))
			EarthquakeList[data.ID].epicenterIcon.setLatLng([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX]);

		// mini map
		if (!EarthquakeList[data.ID].epicenterIconTW) {
			EarthquakeList[data.ID].epicenterIconTW = L.marker([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX], { icon: epicenterIcon }).addTo(Maps.mini);
			EarthquakeList[data.ID].epicenterIconTW.getElement().classList.add("hide");
		}

		if (EarthquakeList[data.ID].epicenterIconTW.getIcon()?.options?.iconUrl != epicenterIcon.options.iconUrl)
			EarthquakeList[data.ID].epicenterIconTW.setIcon(epicenterIcon);

		if (!EarthquakeList[data.ID].epicenterIconTW.getLatLng().equals([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX]))
			EarthquakeList[data.ID].epicenterIconTW.setLatLng([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX]);

		if (!Timers.epicenterBlinker)
			Timers.epicenterBlinker = setInterval(() => {
				const epicenter_blink_state = EarthquakeList[Object.keys(EarthquakeList)[0]]?.epicenterIcon?.getElement()?.classList?.contains("hide");
				if (epicenter_blink_state != undefined)
					for (const key in EarthquakeList) {
						const el = EarthquakeList[key];
						if (epicenter_blink_state) {
							if (el.epicenterIcon.getElement().classList.contains("hide"))
								el.epicenterIcon.getElement().classList.remove("hide");
						} else if (!el.epicenterIcon.getElement().classList.contains("hide"))
							el.epicenterIcon.getElement().classList.add("hide");
						if (key == INFO[TINFO].ID) {
							if (epicenter_blink_state) {
								if (el.epicenterIconTW.getElement().classList.contains("hide"))
									el.epicenterIconTW.getElement().classList.remove("hide");
							} else if (!el.epicenterIconTW.getElement().classList.contains("hide"))
								el.epicenterIconTW.getElement().classList.add("hide");
						} else if (!el.epicenterIconTW.getElement()?.classList?.contains("hide"))
							el.epicenterIconTW.getElement().classList.add("hide");
					}
			}, 500);

		// #endregion <- Epicenter Cross Icon


		if (NOW.getTime() - EEWshot > 60000)
			EEWshotC = 1;
		if (NOW.getTime() - EEWshot > 30000 && EEWshotC <= 2) {
			EEWshotC++;
			EEWshot = NOW.getTime();
			setTimeout(() => {
				ipcRenderer.send("screenshotEEW", {
					Function : data.Function,
					ID       : data.ID,
					Version  : data.Version,
					Time     : NOW.getTime(),
					Shot     : EEWshotC,
				});
			}, 300);
		}
	}
	if (data.Cancel && EarthquakeList[data.ID].Cancel == undefined)
		for (let index = 0; index < INFO.length; index++)
			if (INFO[index].ID == data.ID) {
				INFO[index].alert_type = "alert-box eew-cancel";
				data.TimeStamp = NOW.getTime() - 150000;
				EarthquakeList[data.ID].Cancel = true;
				if (Object.keys(EarthquakeList).length == 1) {
					clearInterval(t);
					audioList = [];
					audioList1 = [];
				}
				break;
			}
	if (NOW.getTime() - data.TimeStamp > 180_000 || Cancel) {
		clear(data.ID);

		// remove epicenter cross icons
		EarthquakeList[data.ID].epicenterIcon.remove();
		EarthquakeList[data.ID].epicenterIconTW.remove();
		EarthquakeList[data.ID].geojson.remove();
		if (EarthquakeList[data.ID].Depth != null) Maps.main.removeLayer(EarthquakeList[data.ID].Depth);

		for (let index = 0; index < INFO.length; index++)
			if (INFO[index].ID == data.ID) {
				TINFO = 0;
				INFO.splice(index, 1);
				break;
			}
		clearInterval(EarthquakeList[data.ID].Timer);
		document.getElementById("box-10").innerHTML = "";
		delete EarthquakeList[data.ID];
		delete EEW[data.ID];
		if (Object.keys(EarthquakeList).length == 0) {
			clearInterval(t);
			audioList = [];
			arrive = "";
			audioList1 = [];
			Second = -1;
			EEWAlert = false;
			// hide eew alert
			ticker = null;
			Cancel = false;
			if (replay != 0) {
				replay = 0;
				document.getElementById("togglenav_btn").classList.remove("hide");
				document.getElementById("stopReplay").classList.add("hide");
				ReportGET();
			}
			INFO = [];
			All = [];
			Info = { Notify: [], Warn: [], Focus: [] };
			$("#alert-box").removeClass("show");
			$("#map-legends").removeClass("show");
			// hide minimap
			$("#map-tw").removeClass("show");
			// restore reports
			$(roll).fadeIn(200);
			clearInterval(Timers.epicenterBlinker);
			delete Timers.epicenterBlinker;
			clearInterval(ITimer);
			ITimer = null;
		}
	}
}

function Tcolor(text) {
	return (text == "黃色") ? "yellow" :
		(text == "橙色") ? "red" :
			(text == "綠色") ? "transparent" :
				"purple";
}

function clear(ID) {
	if (EarthquakeList[ID].CircleS != undefined) Maps.main.removeLayer(EarthquakeList[ID].CircleS);
	if (EarthquakeList[ID].CircleP != undefined) Maps.main.removeLayer(EarthquakeList[ID].CircleP);
	if (EarthquakeList[ID].CircleSTW != undefined) Maps.mini.removeLayer(EarthquakeList[ID].CircleSTW);
	if (EarthquakeList[ID].CirclePTW != undefined) Maps.mini.removeLayer(EarthquakeList[ID].CirclePTW);
}

function updateText() {
	$("#alert-box")[0].className = `${INFO[TINFO].alert_type} ${IntensityToClassString(INFO[TINFO].alert_intensity)}`;
	$("#alert-local")[0].className = `alert-item ${IntensityToClassString(INFO[TINFO].alert_local)}`;
	$("#alert-provider").text(`${INFO.length > 1 ? `${TINFO + 1} ` : ""}${INFO[TINFO].alert_provider}`);
	$("#alert-number").text(`${INFO[TINFO].alert_number}`);
	$("#alert-location").text(INFO[TINFO].alert_location);
	$("#alert-time").text(INFO[TINFO].alert_time.format("YYYY/MM/DD HH:mm:ss"));
	$("#alert-magnitude").text(INFO[TINFO].alert_magnitude);
	$("#alert-depth").text(INFO[TINFO].alert_depth);
	$("#alert-box").addClass("show");
	$("#map-legends").addClass("show");

	if (EarthquakeList[INFO[TINFO].ID].Cancel != undefined) {
		$("#alert-p").text("X");
		$("#alert-s").text("X");
	} else {
		let num = Math.floor((INFO[TINFO].distance - ((NOW.getTime() - INFO[TINFO].alert_sTime.getTime()) / 1000) * Sspeed) / Sspeed);
		if (num <= 0) num = "";
		$("#alert-s").text(num);

		num = Math.floor((INFO[TINFO].distance - ((NOW.getTime() - INFO[TINFO].alert_sTime.getTime()) / 1000) * Pspeed) / Pspeed);
		if (num <= 0) num = "";
		$("#alert-p").text(num);
	}

	// bring waves to front
	if (EarthquakeList[INFO[TINFO].ID].CircleP) EarthquakeList[INFO[TINFO].ID].CircleP.bringToFront();
	if (EarthquakeList[INFO[TINFO].ID].CircleS) EarthquakeList[INFO[TINFO].ID].CircleS.bringToFront();

	for (const key in EarthquakeList) {
		if (!EarthquakeList[key]?.epicenterIconTW?.getElement()?.classList?.contains("hide"))
			EarthquakeList[key]?.epicenterIconTW?.getElement()?.classList?.add("hide");
		if (!EarthquakeList[key]?.CirclePTW?.getElement()?.classList?.contains("hide"))
			EarthquakeList[key]?.CirclePTW?.getElement()?.classList?.add("hide");
		if (!EarthquakeList[key]?.CircleSTW?.getElement()?.classList?.contains("hide"))
			EarthquakeList[key]?.CircleSTW?.getElement()?.classList?.add("hide");
		if (EarthquakeList[key]?.geojson)
			EarthquakeList[key].geojson.remove();
	}

	if (EarthquakeList[INFO[TINFO].ID].epicenterIconTW) EarthquakeList[INFO[TINFO].ID].epicenterIconTW.getElement()?.classList?.remove("hide");
	if (EarthquakeList[INFO[TINFO].ID].CirclePTW) EarthquakeList[INFO[TINFO].ID].CirclePTW.getElement()?.classList?.remove("hide");
	if (EarthquakeList[INFO[TINFO].ID].CircleSTW) EarthquakeList[INFO[TINFO].ID].CircleSTW.getElement()?.classList?.remove("hide");
	if (EarthquakeList[INFO[TINFO].ID].geojson) EarthquakeList[INFO[TINFO].ID].geojson.addTo(Maps.mini);

	const Num = Math.round(((NOW.getTime() - INFO[TINFO].Time) * 4 / 10) / INFO[TINFO].Depth);
	const Catch = document.getElementById("box-10");
	if (Num <= 100)
		Catch.innerHTML = `<font color="white" size="6"><b>震波到地表進度: ${Num}%</b></font>`;
	else
		Catch.innerHTML = "";
}

const changeView = (args, el, event) => {
	if (event instanceof KeyboardEvent && event?.key !== "Enter" && event?.key !== " ")
		return;

	const currentel = $(".view.show");
	const changeel = $(`#${args}`);

	if (changeel.attr("id") == currentel.attr("id")) return;

	const currentnav = $(".active");
	currentnav.removeClass("active");
	$(el)?.addClass("active");

	currentel.removeClass("show");
	changeel.addClass("show");

	if (changeel.attr("id") == "report")
		Maps.report.invalidateSize();

	TREM.emit("viewChange", currentel.attr("id"), changeel.attr("id"));
};