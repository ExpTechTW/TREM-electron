/* eslint-disable no-inner-declarations */
/* eslint-disable no-shadow */
/* eslint-disable no-undef */
/* eslint-disable prefer-const */
const { BrowserWindow, shell } = require("@electron/remote");
const path = require("path");
axios.defaults.timeout = 15000;

// #region 變數
let Stamp = 0;
let t = null;
let Lat = 25.0421407;
let Long = 121.5198716;
let audioList = [];
let audioList1 = [];
let audioLock = false;
let audioLock1 = false;
let ReportCache = {};
let ReportMarkID = null;
let MarkList = [];
let EarthquakeList = {};
let marker = null;
let map, mapTW;
let mapLayer, mapLayerTW;
let Station = {};
let PGA = {};
let pga = {};
let RMT = 1;
let RMTlimit = [];
let PGALimit = 0;
let PGAaudio = false;
let PGAtag = 0;
let MAXPGA = { pga: 0, station: "NA", level: 0 };
let expected = [];
let Info = { Notify: [] };
let Focus = [];
let PGAmark = false;
let Check = {};
let INFO = [];
let TINFO = 0;
let ticker = null;
let ITimer = null;
let Tsunami = {};
let Report = 0;
let Sspeed = 4;
let Pspeed = 7;
let Server = [];
let PAlert = {};
let Location;
let station = {};
let PGAjson = {};
let PalertT = 0;
let MainClock = null;
let geojson = null;
let Pgeojson = null;
let clickT = 0;
let investigation = false;
let ReportTag = 0;
let EEWshot = 0;
let EEWshotC = 0;
// #endregion

// #region override Date.format()
Date.prototype.format =
	/**
	 * Format DateTime into string with provided formatting string.
	 * @param {string} format The formatting string to use.
	 * @returns {string} The formatted string.
	 */
	function(format) {
		/**
		 * @type {Date}
		 */
		let me = this;
		return format.replace(/a|A|Z|S(SS)?|ss?|mm?|HH?|hh?|D{1,2}|M{1,2}|YY(YY)?|'([^']|'')*'/g, (str) => {
			let c1 = str.charAt(0);
			let ret = str.charAt(0) == "'"
				? (c1 = 0) || str.slice(1, -1).replace(/''/g, "'")
				: str == "a"
					? (me.getHours() < 12 ? "am" : "pm")
					: str == "A"
						? (me.getHours() < 12 ? "AM" : "PM")
						: str == "Z"
							? (("+" + -me.getTimezoneOffset() / 60).replace(/^\D?(\D)/, "$1").replace(/^(.)(.)$/, "$10$2") + "00")
							: c1 == "S"
								? me.getMilliseconds()
								: c1 == "s"
									? me.getSeconds()
									: c1 == "H"
										? me.getHours()
										: c1 == "h"
											? (me.getHours() % 12) || 12
											: c1 == "D"
												? me.getDate()
												: c1 == "m"
													? me.getMinutes()
													: c1 == "M"
														? me.getMonth() + 1
														: ("" + me.getFullYear()).slice(-str.length);
			return c1 && str.length < 4 && ("" + ret).length < str.length
				? ("00" + ret).slice(-str.length)
				: ret;
		});
	};
// #endregion

// #region 初始化
let win = BrowserWindow.fromId(process.env.window * 1);
let roll = document.getElementById("rolllist");
win.setAlwaysOnTop(false);

function init() {
	ReportGET({});
	const time = document.getElementById("time");

	setInterval(() => {
		if (CONFIG["location.city"] != Check.city || CONFIG["location.town"] != Check.town) {
			Check.city = CONFIG["location.city"];
			Check.town = CONFIG["location.town"];
			setUserLocationMarker();
		}
		if (TimerDesynced)
			time.classList.add("desynced");
		else {
			if (time.classList.contains("desynced"))
				time.classList.remove("desynced");
			time.innerText = NOW.format("YYYY/MM/DD HH:mm:ss");
		}
		if (Object.keys(Tsunami).length != 0)
			if (NOW.getTime() - Tsunami.Time > 240000) {
				map.removeLayer(Tsunami.Cross);
				delete Tsunami.Cross;
				delete Tsunami.Time;
				focus();
			}

		if (investigation && NOW.getTime() - Report > 600000) {
			investigation = false;
			roll.removeChild(roll.children[0]);
		}
		if (ReportTag != 0 && NOW.getTime() - ReportTag > 30000) {
			ReportTag = 0;
			if (ReportMarkID != null) {
				ReportMarkID = null;
				for (let index = 0; index < MarkList.length; index++)
					map.removeLayer(MarkList[index]);
				focus();
			}
		}
	}, 200);

	map = L.map("map", {
		attributionControl : false,
		closePopupOnClick  : false,
		preferCanvas       : true,
	}).setView([23, 121], 7.5);

	mapTW = L.map("map-tw", {
		attributionControl : false,
		closePopupOnClick  : false,
		preferCanvas       : true,
	}).setView([23.608428, 120.799168], 7);

	mapTW.dragging.disable();
	mapTW.scrollWheelZoom.disable();
	mapTW.doubleClickZoom.disable();
	mapTW.removeControl(mapTW.zoomControl);

	L.geoJson(statesData, {
		style: {
			weight    : 0.8,
			opacity   : 0.3,
			color     : "#8E8E8E",
			fillColor : "transparent",
		},
	}).addTo(mapTW);

	map.on("click", (e) => {
		if (ReportMarkID != null) {
			ReportMarkID = null;
			for (let index = 0; index < MarkList.length; index++)
				map.removeLayer(MarkList[index]);
		}
		focus();
	});

	mapLayer = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw", {
		maxZoom    : 14,
		id         : CONFIG["theme.dark"] ? "mapbox/dark-v10" : "mapbox/light-v10",
		tileSize   : 512,
		zoomOffset : -1,
		minZoom    : 2,
	}).addTo(map);

	mapLayerTW = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw", {
		maxZoom    : 14,
		id         : CONFIG["theme.dark"] ? "mapbox/dark-v10" : "mapbox/light-v10",
		tileSize   : 512,
		zoomOffset : -1,
		minZoom    : 2,
	}).addTo(mapTW);

	map.removeControl(map.zoomControl);

	main();

	setInterval(() => {
		main();
	}, 300000);

	function main() {
		fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/locations.json")
			.then((response) => response.json())
			.then((res) => {
				Location = res;
				fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")
					.then((response) => response.json())
					.then((res1) => {
						station = res1;
						dump({ level: 0, message: "Get Station File", origin: "Location" });
						fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/pga.json")
							.then((response) => response.json())
							.then((res2) => {
								PGAjson = res2;
								dump({ level: 0, message: "Get PGA Location File", origin: "Location" });
								if (CONFIG["earthquake.Real-time"])
									PGAMain();
							});
					});
			});
	}

	function PGAMain() {
		dump({ level: 0, message: "Start PGA Timer", origin: "PGATimer" });
		if (MainClock != null) clearInterval(MainClock);
		MainClock = setInterval(() => {
			let data = {
				"APIkey"   : "https://github.com/ExpTechTW",
				"Function" : "data",
				"Type"     : "TREM",
			};
			axios.post(PostIP(), data)
				.then((response) => {
					for (let index = 0; index < Object.keys(Station).length; index++) {
						map.removeLayer(Station[Object.keys(Station)[index]]);
						delete Station[Object.keys(Station)[index]];
						index--;
					}
					if (response.data["state"] != "Success") return;
					let Json = response.data.response;
					let All = [];
					MAXPGA = { pga: 0, station: "NA", level: 0 };
					for (let index = 0; index < Object.keys(Json).length; index++) {
						let Sdata = Json[Object.keys(Json)[index]];
						let amount = 0;
						if (Number(Sdata["MaxPGA"]) > amount) amount = Number(Sdata.MaxPGA);
						if (station[Object.keys(Json)[index]] == undefined) continue;
						let Intensity = (NOW.getTime() - Sdata.TimeStamp > 5000) ? "NA" :
							(amount >= 800) ? 9 :
								(amount >= 440) ? 8 :
									(amount >= 250) ? 7 :
										(amount >= 140) ? 6 :
											(amount >= 80) ? 5 :
												(amount >= 25) ? 4 :
													(amount >= 8) ? 3 :
														(amount >= 5) ? 2 :
															(amount >= 3) ? 1 :
																0;
						let size = 15;
						let Image = `./image/${Intensity}.png`;
						if (Intensity == 0) {
							size = 10;
							Image = "./image/0-1.png";
							if (amount > 2.5) Image = "./image/0-2.png";
							if (amount > 2.8) Image = "./image/0-3.png";
							if (amount > 3) Image = "./image/0-4.png";
							if (amount > 3.5) Image = "./image/0-5.png";
						}
						let myIcon = L.icon({
							iconUrl  : Image,
							iconSize : [size, size],
						});
						let ReportMark = L.marker([station[Object.keys(Json)[index]].Lat, station[Object.keys(Json)[index]].Long], { icon: myIcon });
						let Level = IntensityI(Intensity);
						let now = new Date(Sdata.Time);
						if (Object.keys(Json)[index] == CONFIG["Real-time.station"]) {
							document.getElementById("rt-station-name").innerText = station[Object.keys(Json)[index]].Loc;
							document.getElementById("rt-station-time").innerText = now.format("MM/DD HH:mm:ss");
							document.getElementById("rt-station-intensity").innerText = IntensityI(Intensity) ;
							document.getElementById("rt-station-pga").innerText = amount;
						}
						map.addLayer(ReportMark);
						ReportMark.setZIndexOffset(2000 + amount);
						Station[Object.keys(Json)[index]] = ReportMark;
						if (pga[station[Object.keys(Json)[index]].PGA] == undefined && Intensity != "NA")
							pga[station[Object.keys(Json)[index]].PGA] = {
								"Intensity" : Intensity,
								"Time"      : 0,
							};
						if (Intensity != "NA" && Intensity != 0) {
							All.push({
								"loc"       : station[Object.keys(Json)[index]].Loc,
								"intensity" : Intensity,
							});
							if (Intensity > pga[station[Object.keys(Json)[index]].PGA].Intensity) pga[station[Object.keys(Json)[index]].PGA].Intensity = Intensity;
							if (Sdata.Alert || fs.existsSync(path.join(app.getPath("userData"), "./unlockAlert.tmp"))) {
								if (CONFIG["earthquake.Real-time-forecast"])
									limit();
								else
								if (RMTlimit.length < 2) {
									if (!RMTlimit.includes(Object.keys(Json)[index])) RMTlimit.push(Object.keys(Json)[index]);
								} else
									limit();

								function limit() {
									if (amount > 8 && PGALimit == 0) {
										PGALimit = 1;
										audioPlay("./audio/PGA1.wav");
									} else if (amount > 250 && PGALimit != 2) {
										PGALimit = 2;
										audioPlay("./audio/PGA2.wav");
									}
									pga[station[Object.keys(Json)[index]].PGA].Time = NOW.getTime();
								}
							}
							if (MAXPGA.pga < amount && Level != "NA") {
								MAXPGA.pga = amount;
								MAXPGA.station = Object.keys(Json)[index];
								MAXPGA.level = Level;
								MAXPGA.lat = station[Object.keys(Json)[index]].Lat;
								MAXPGA.long = station[Object.keys(Json)[index]].Long;
								MAXPGA.loc = station[Object.keys(Json)[index]].Loc;
								MAXPGA.intensity = Intensity;
								MAXPGA.ms = NOW.getTime() - Sdata.TimeStamp;
							}
						}
					}
					if (PAlert.data != undefined)
						if (NOW.getTime() - PAlert.timestamp > 30000) {
							if (Pgeojson != null) {
								map.removeLayer(Pgeojson);
								Pgeojson = null;
								focus();
							}
						} else {
							let PLoc = {};
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
									if (CONFIG["Real-time.show"])
										win.show();
									if (CONFIG["Real-time.cover"]) win.setAlwaysOnTop(true);
									win.setAlwaysOnTop(false);
									audioPlay("./audio/palert.wav");
								}
								if (Pgeojson != null) map.removeLayer(Pgeojson);
								Pgeojson = L.geoJson(statesData, {
									style: (feature) => {
										let name = feature.properties.COUNTY + " " + feature.properties.TOWN;
										if (PLoc[name] == 0 || PLoc[name] == undefined)
											return {
												weight      : 0,
												opacity     : 0,
												color       : "#8E8E8E",
												dashArray   : "",
												fillOpacity : 0,
												fillColor   : "transparent",
											};
										return {
											weight      : 0,
											opacity     : 0,
											color       : "#8E8E8E",
											dashArray   : "",
											fillOpacity : 0.8,
											fillColor   : color(PLoc[name]),
										};
									},
								});
								map.addLayer(Pgeojson);
								focus([23.608428, 120.799168], 7, true);
								setTimeout(() => {
									ipcRenderer.send("screenshotEEW", {
										"ID"      : NOW.getTime(),
										"Version" : "P",
									});
								}, 2000);
							}
							if (Pgeojson != null) Pgeojson.setZIndexOffset(1000);
						}
					for (let index = 0; index < Object.keys(PGA).length; index++) {
						if (RMT == 0) map.removeLayer(PGA[Object.keys(PGA)[index]]);
						delete PGA[Object.keys(PGA)[index]];
						index--;
					}
					RMT++;
					for (let index = 0; index < Object.keys(pga).length; index++) {
						let Intensity = pga[Object.keys(pga)[index]].Intensity;
						if (NOW.getTime() - pga[Object.keys(pga)[index]].Time > 30000) {
							delete pga[Object.keys(pga)[index]];
							index--;
						} else {
							PGA[Object.keys(pga)[index]] = L.polygon(PGAjson[Object.keys(pga)[index].toString()], {
								color     : color(Intensity),
								fillColor : "transparent",
							});
							if (RMT >= 2) map.addLayer(PGA[Object.keys(pga)[index]]);
							PGAaudio = true;
						}
					}
					if (RMT >= 2) RMT = 0;
					if (Object.keys(pga).length != 0 && !PGAmark) {
						PGAmark = true;
						focus([23.608428, 120.799168], 7, true);
					}
					if (PGAmark && Object.keys(pga).length == 0) {
						PGAmark = false;
						RMT = 1;
						RMTlimit = [];
						focus();
					}
					if (Object.keys(PGA).length == 0) PGAaudio = false;

					if (!PGAaudio) {
						if (Pgeojson != null) map.removeLayer(Pgeojson);
						PGAtag = 0;
						PGALimit = 0;
					}
					for (let Index = 0; Index < All.length - 1; Index++)
						for (let index = 0; index < All.length - 1; index++)
							if (All[index].intensity < All[index + 1].intensity) {
								let Temp = All[index + 1];
								All[index + 1] = All[index];
								All[index] = Temp;
							}
					if (All.length != 0 && All[0].intensity > PGAtag && Object.keys(pga).length != 0) {
						if (CONFIG["Real-time.audio"])
							if (All[0].intensity >= 5 && PGAtag < 5)
								audioPlay("./audio/Shindo2.wav");
							else if (All[0].intensity >= 2 && PGAtag < 2)
								audioPlay("./audio/Shindo1.wav");
							else if (PGAtag == 0)
								audioPlay("./audio/Shindo0.wav");

						if (All[0].intensity >= 2) {
							Report = NOW.getTime();
							ReportGET({
								Max  : All[0].intensity,
								Time : NOW.format("YYYY/MM/DD HH:mm:ss"),
							});
							setTimeout(() => {
								ipcRenderer.send("screenshotEEW", {
									"ID"      : NOW.getTime(),
									"Version" : "P",
								});
							}, 500);
							if (CONFIG["Real-time.show"])
								win.show();
							if (CONFIG["Real-time.cover"]) win.setAlwaysOnTop(true);
							win.setAlwaysOnTop(false);
						}
						PGAtag = All[0].intensity;
					}
					let list = [];
					let count = 0;
					for (let Index = 0; Index < All.length; Index++, count++) {
						if (!PGAaudio || count >= 10) break;
						const container = document.createElement("DIV");
						container.className = IntensityToClassString(All[Index].intensity);
						const location = document.createElement("span");
						location.innerText = All[Index].loc;
						container.appendChild(document.createElement("span"));
						container.appendChild(location);
						list.push(container);
					}
					document.getElementById("rt-list").replaceChildren(...list);
				})
				.catch((error) => {
					dump({ level: 2, message: error, origin: "PGATimer" });
					console.error(error);
				});
		}, 1000);
	}
	$("#app-version").text(app.getVersion());
	$("#loading").text("歡迎");
	$("#load").delay(1000).fadeOut(1000);
}
// #endregion

// #region 用戶所在位置
async function setUserLocationMarker() {
	if (!Location) {
		Location = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
		dump({ level: 0, message: "Get Location File", origin: "Location" });
	}

	Lat = Location[CONFIG["location.city"]][CONFIG["location.town"]][1];
	Long = Location[CONFIG["location.city"]][CONFIG["location.town"]][2];
	if (marker != null) map.removeLayer(marker);
	let myIcon = L.icon({
		iconUrl  : "./image/here.png",
		iconSize : [20, 20],
	});
	marker = L.marker([Lat, Long], { icon: myIcon });
	map.addLayer(marker);
	marker.setZIndexOffset(1);
	focus([Lat, Long], 7.5);

}
// #endregion

// #region 聚焦
function focus(Loc, size, args) {
	if (Loc != undefined && args == undefined) {
		Focus[0] = Loc[0];
		Focus[1] = Loc[1];
		Focus[2] = size;
		map.setView([Loc[0], Loc[1] + 0.9], size);
	} else if (Loc != undefined)
		map.setView([Loc[0], Loc[1] + 0.9], size);
	else
		map.setView([Focus[0], Focus[1] + 0.9], Focus[2]);

}
// #endregion

// #region 音頻播放
let AudioT;
let AudioT1;
let audioDOM = new Audio();
let audioDOM1 = new Audio();
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
	const path = audioList.shift();
	audioDOM.src = path;
	if (path.startsWith("./audio/1/") && CONFIG["eew.audio"]) {
		dump({ level: 0, message: `Playing Audio > ${path}`, origin: "Audio" });
		audioDOM.play();
	} else if (!path.startsWith("./audio/1/")) {
		dump({ level: 0, message: `Playing Audio > ${path}`, origin: "Audio" });
		audioDOM.play();
	}
}
function playNextAudio1() {
	audioLock1 = true;
	const path = audioList1.shift();
	audioDOM1.src = path;
	if (path.startsWith("./audio/1/") && CONFIG["eew.audio"]) {
		dump({ level: 0, message: `Playing Audio > ${path}`, origin: "Audio" });
		audioDOM1.play();
	} else if (!path.startsWith("./audio/1/")) {
		dump({ level: 0, message: `Playing Audio > ${path}`, origin: "Audio" });
		audioDOM1.play();
	}
}
// #endregion

// #region Report Data
async function ReportGET(eew) {
	const res = await getReportByData();
	dump({ level: 0, message: "Reports fetched", origin: "EQReportFetcher" });
	if (res["state"] == "Warn") {
		dump({ level: 2, message: res, origin: "EQReportFetcher" });
		console.error(res);
		setTimeout(() => {
			ReportGET();
		}, 2000);
	} else
		ReportList(res, eew);
}
async function getReportByData() {
	try {
		const list = await axios.post(PostIP(), {
			"APIkey"   : "https://github.com/ExpTechTW",
			"Function" : "data",
			"Type"     : "earthquake",
			"Value"    : 100,
		});
		return list.data;
	} catch (error) {
		dump({ level: 2, message: error, origin: "EQReportFetcher" });
		console.error(error);
	}

}
// #endregion

// #region Report 點擊
// eslint-disable-next-line no-shadow
async function ReportClick(time) {
	if (ReportMarkID == time) {
		ReportMarkID = null;
		for (let index = 0; index < MarkList.length; index++)
			map.removeLayer(MarkList[index]);

		focus();
	} else {
		ReportMarkID = time;
		for (let index = 0; index < MarkList.length; index++)
			map.removeLayer(MarkList[index]);

		let LIST = [];
		let body = {
			"APIkey"   : "https://github.com/ExpTechTW",
			"Function" : "data",
			"Type"     : "report",
			"Value"    : ReportCache[time].earthquakeNo,
		};
		if (
			// 確認是否為無編號地震
			ReportCache[time].earthquakeNo % 1000 == 0
			|| await axios.post(PostIP(), body)
				.then((response) => {
					let json = response.data.response;
					if (json == undefined)
						return true;
					else {
						for (let Index = 0; Index < json.Intensity.length; Index++)
							for (let index = 0; index < json.Intensity[Index].station.length; index++) {
								// eslint-disable-next-line no-shadow
								let Station = json.Intensity[Index].station[index];
								let Intensity = Station.stationIntensity.$t;
								if (Station.stationIntensity.unit == "強") Intensity += "+";
								if (Station.stationIntensity.unit == "弱") Intensity += "-";
								let myIcon = L.icon({
									iconUrl  : `./image/${IntensityI(Intensity)}.png`,
									iconSize : [20, 20],
								});
								let ReportMark = L.marker([Station.stationLat.$t, Station.stationLon.$t], { icon: myIcon });
								// eslint-disable-next-line no-shadow
								let PGA = "";
								if (Station.pga != undefined) PGA = `<br>PGA<br>垂直向: ${Station.pga.vComponent}<br>東西向: ${Station.pga.ewComponent}<br>南北向: ${Station.pga.nsComponent}<br><a onclick="openURL('${Station.waveImageURI}')">震波圖</a>`;
								ReportMark.bindPopup(`站名: ${Station.stationName}<br>代號: ${Station.stationCode}<br>經度: ${Station.stationLon.$t}<br>緯度: ${Station.stationLat.$t}<br>震央距: ${Station["distance"].$t}<br>方位角: ${Station["azimuth"].$t}<br>震度: ${Intensity}<br>${PGA}`);
								map.addLayer(ReportMark);
								ReportMark.setZIndexOffset(1000 + index);
								MarkList.push(ReportMark);
							}


						focus([Number(json.NorthLatitude), Number(json.EastLongitude)], 7.5, true);
						let myIcon = L.icon({
							iconUrl  : "./image/star.png",
							iconSize : [25, 25],
						});
						let ReportMark = L.marker([Number(json.NorthLatitude), Number(json.EastLongitude)], { icon: myIcon });
						ReportMark.bindPopup(`編號: ${json.No}<br>經度: ${json.EastLongitude}<br>緯度: ${json.NorthLatitude}<br>深度: ${json.Depth}<br>規模: ${json.Scale}<br>位置: ${json.Location}<br>時間: ${json["UTC+8"]}<br><br><a onclick="openURL('${json.Web}')">網頁</a><br><a onclick="openURL('${json.EventImage}')">地震報告</a><br><a onclick="openURL('${json.ShakeImage}')">震度分布</a>`);
						map.addLayer(ReportMark);
						ReportMark.setZIndexOffset(3000);
						MarkList.push(ReportMark);
						return false;
					}
				})
				.catch((error) => {
					console.log(error);
					return false;
				})
		) {
			for (let Index = 0; Index < ReportCache[time].data.length; Index++)
				for (let index = 0; index < ReportCache[time].data[Index]["eqStation"].length; index++) {
					let data = ReportCache[time].data[Index]["eqStation"][index];
					const myIcon = L.icon({
						iconUrl  : `./image/${data.stationIntensity}.png`,
						iconSize : [20, 20],
					});
					let level = IntensityI(data.stationIntensity);
					LIST.push({
						Lat       : Number(data.stationLat),
						Long      : Number(data.stationLon),
						Icon      : myIcon,
						Level     : level,
						Intensity : Number(data.stationIntensity),
						Name      : `${ReportCache[time].data[Index]["areaName"]} ${data["stationName"]}`,
					});
				}

			for (let Index = 0; Index < LIST.length - 1; Index++)
				for (let index = 0; index < LIST.length - 1; index++)
					if (LIST[index].Intensity > LIST[index + 1].Intensity) {
						let Temp = LIST[index];
						LIST[index] = LIST[index + 1];
						LIST[index + 1] = Temp;
					}


			for (let index = 0; index < LIST.length; index++) {
				let ReportMark = L.marker([LIST[index].Lat, LIST[index].Long], { icon: LIST[index].Icon });
				ReportMark.bindPopup(`站名: ${LIST[index].Name}<br>經度: ${LIST[index].Long}<br>緯度: ${LIST[index].Lat}<br>震度: ${LIST[index].Level}`);
				map.addLayer(ReportMark);
				ReportMark.setZIndexOffset(1000 + index);
				MarkList.push(ReportMark);
			}
			focus([Number(ReportCache[time].epicenterLat), Number(ReportCache[time].epicenterLon)], 7.5, true);
			const icon = L.icon({
				iconUrl  : "./image/star.png",
				iconSize : [25, 25],
			});
			let ReportMark = L.marker([Number(ReportCache[time].epicenterLat), Number(ReportCache[time].epicenterLon)], { icon });
			let Num = "無";
			if (ReportCache[time].earthquakeNo.toString().substring(3, 6) != "000") Num = ReportCache[time].earthquakeNo;
			ReportMark.bindPopup(`編號: ${Num}<br>經度: ${ReportCache[time].epicenterLon}<br>緯度: ${ReportCache[time].epicenterLat}<br>深度: ${ReportCache[time].depth}<br>規模: ${ReportCache[time].magnitudeValue}<br>位置: ${ReportCache[time].location}<br>時間: ${ReportCache[time].originTime}`);
			map.addLayer(ReportMark);
			ReportMark.setZIndexOffset(3000);
			MarkList.push(ReportMark);
		}
	}
}
let openURL = url => {
	shell.openExternal(url);
	return;
};
// #endregion

// #region Report list
function ReportList(Data, eew) {
	roll.replaceChildren();
	for (let index = 0; index < Data.response.length; index++) {
		if (eew != undefined && index == Data.response.length - 1) {
			Data.response[index].Max = eew.Max;
			Data.response[index].Time = eew.Time;
		}
		addReport(Data.response[index]);
	}
}

function addReport(report, prepend = false) {
	let Level = IntensityI(report.data[0].areaIntensity);
	let msg = "";
	if (report.location.includes("("))
		msg = report.location.substring(report.location.indexOf("(") + 1, report.location.indexOf(")")).replace("位於", "");
	else
		msg = report.location;

	let star = "";
	if (report.ID.length != 0) star += "↺ ";
	if (report.earthquakeNo % 1000 != 0) star += "✩ ";

	let Div = document.createElement("div");
	if (report.Time != undefined && report.report == undefined) {
		const report_container = document.createElement("div");
		report_container.className = "report-container locating";

		const report_intenisty_container = document.createElement("div");
		report_intenisty_container.className = "report-intenisty-container";

		const report_intenisty_title = document.createElement("span");
		report_intenisty_title.className = "report-intenisty-title";
		report_intenisty_title.innerText = "最大震度";
		const report_intenisty_value = document.createElement("span");
		report_intenisty_value.className = "report-intenisty-value";
		report_intenisty_value.innerText = IntensityI(report.Max);
		report_intenisty_container.append(report_intenisty_title, report_intenisty_value);


		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = "震源 調查中";
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = report.Time.replace(/-/g, "/");
		report_detail_container.append(report_location, report_time);

		report_container.append(report_intenisty_container, report_detail_container);
		Div.prepend(report_container);
		Div.style.backgroundColor = color(report.Max);
		roll.prepend(Div);
		investigation = true;
	} else {
		const report_container = document.createElement("div");
		report_container.className = "report-container";

		const report_intenisty_container = document.createElement("div");
		report_intenisty_container.className = "report-intenisty-container";

		const report_intenisty_title = document.createElement("span");
		report_intenisty_title.className = "report-intenisty-title";
		report_intenisty_title.innerText = "最大震度";
		const report_intenisty_value = document.createElement("span");
		report_intenisty_value.className = "report-intenisty-value";
		report_intenisty_value.innerText = Level;
		report_intenisty_container.append(report_intenisty_title, report_intenisty_value);


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

		report_container.append(report_intenisty_container, report_detail_container);
		Div.append(report_container);
		Div.style.backgroundColor = color(report.data[0].areaIntensity);
		ReportCache[report.originTime] = report;
		Div.addEventListener("click", (event) => {
			if (event.detail == 2 && report.ID.length != 0) {
				localStorage.Test = true;
				localStorage.TestID = report.ID;
				ipcRenderer.send("restart");
			} else if (NOW.getTime() - clickT > 150)
				setTimeout(() => {
					clickT = NOW.getTime();
					ReportClick(report.originTime);
				}, 100);
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
			if (ReportMarkID != null) {
				ReportMarkID = null;
				for (let index = 0; index < MarkList.length; index++)
					map.removeLayer(MarkList[index]);
			}
			ReportClick(report.originTime);
			ReportTag = NOW.getTime();
		} else
			roll.append(Div);
	}
}

// #endregion

// #region 設定
function setting() {
	win.setAlwaysOnTop(false);
	ipcRenderer.send("openChildWindow");
}
// #endregion

// #region PGA
function PGAcount(Scale, distance, Si) {
	let S = Si ?? 1;
	if (!CONFIG["earthquake.siteEffect"]) S = 1;
	// eslint-disable-next-line no-shadow
	let PGA = (1.657 * Math.pow(Math.E, (1.533 * Scale)) * Math.pow(distance, -1.607) * S).toFixed(3);
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
	return (level == 9) ? "seven" :
		(level == 8) ? "six strong" :
			(level == 7) ? "six" :
				(level == 6) ? "five strong" :
					(level == 5) ? "five" :
						(level == 4) ? "four" :
							(level == 3) ? "three" :
								(level == 2) ? "two" :
									(level == 1) ? "one" :
										"zero";
}
// #endregion

// #region color
function color(Intensity) {
	let Carr = ["#666666", "#0165CC", "#01BB02", "#EBC000", "#FF8400", "#E06300", "#FF0000", "#B50000", "#68009E"];
	if (Intensity == 0) return Carr[0];
	return Carr[Intensity - 1];
}
// #endregion

// #region IPC
ipcMain.on("start", () => {
	try {
		setInterval(() => {
			if (DATAstamp != 0 && Stamp != DATAstamp) {
				Stamp = DATAstamp;
				FCMdata(DATA);
			}
		}, 0);
		dump({ level: 0, message: `Initializing ServerCore >> ${ServerVer} | MD5 >> ${MD5Check}`, origin: "Initialization" });
		init();
		if (localStorage.Test != undefined)
			setTimeout(() => {
				if (localStorage.TestID != undefined) {
					delete localStorage.Test;
					let list = localStorage.TestID.split(",");
					for (let index = 0; index < list.length; index++)
						setTimeout(() => {
							dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
							let data = {
								"APIkey"        : "https://github.com/ExpTechTW",
								"Function"      : "earthquake",
								"Type"          : "test",
								"FormatVersion" : 3,
								"UUID"          : localStorage.UUID,
								"ID"            : list[index],
							};
							dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
							axios.post(PostIP(), data)
								.catch((error) => {
									dump({ level: 2, message: error, origin: "Verbose" });
								});
						}, 1000);
					delete localStorage.TestID;
				} else {
					delete localStorage.Test;
					dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
					let data = {
						"APIkey"        : "https://github.com/ExpTechTW",
						"Function"      : "earthquake",
						"Type"          : "test",
						"FormatVersion" : 3,
						"UUID"          : localStorage.UUID,
						"Addition"      : "TW",
					};
					if (CONFIG["accept.eew.jp"]) delete data["Addition"];
					dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
					axios.post(PostIP(), data)
						.catch((error) => {
							dump({ level: 2, message: error, origin: "Verbose" });
						});
				}
			}, 1000);
	} catch (error) {
		showDialog("error", "發生錯誤", `初始化過程中發生錯誤，您可以繼續使用此應用程式，但無法保證所有功能皆能繼續正常運作。\n\n如果這是您第一次看到這個訊息，請嘗試重新啟動應用程式。\n如果這個錯誤持續出現，請到 TREM Discord 伺服器回報問題。\n\n錯誤訊息：${error}`);
		$("#load").delay(1000).fadeOut(1000);
		dump({ level: 2, message: error, origin: "Initialization" });
	}
});
ipcMain.on("testEEW", () => {
	localStorage.Test = true;
	ipcRenderer.send("restart");
});
ipcMain.on("updateTheme", () => {
	console.log("updateTheme");
	setThemeColor(CONFIG["theme.color"], CONFIG["theme.dark"]);
	if (mapLayer.options.id != (CONFIG["theme.dark"] ? "mapbox/dark-v10" : "mapbox/light-v10")) {
		map.removeLayer(mapLayer);
		mapTW.removeLayer(mapLayerTW);
		mapLayer = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw", {
			maxZoom    : 14,
			id         : CONFIG["theme.dark"] ? "mapbox/dark-v10" : "mapbox/light-v10",
			tileSize   : 512,
			zoomOffset : -1,
			minZoom    : 2,
		}).addTo(map);
		mapLayerTW = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw", {
			maxZoom    : 14,
			id         : CONFIG["theme.dark"] ? "mapbox/dark-v10" : "mapbox/light-v10",
			tileSize   : 512,
			zoomOffset : -1,
			minZoom    : 2,
		}).addTo(mapTW);
	}
});
// #endregion

// #region EEW
async function FCMdata(data) {
	let json = JSON.parse(data);
	if (Server.includes(json.TimeStamp)) return;
	Server.push(json.TimeStamp);
	if (json.TimeStamp != undefined)
		dump({ level: 0, message: `${NOW.getTime() - json.TimeStamp}ms`, origin: "API" });

	if (json.Function == "tsunami") {
		dump({ level: 0, message: "Got Tsunami Warning", origin: "API" });
		if (CONFIG["report.show"]) {
			win.show();
			if (CONFIG["report.cover"]) win.setAlwaysOnTop(true);
			win.setAlwaysOnTop(false);
		}
		new Notification("海嘯警報", { body: `${json["UTC+8"]} 發生 ${json.Scale} 地震\n\n東經: ${json.EastLongitude} 度\n北緯: ${json.NorthLatitude} 度`, icon: "TREM.ico" });
		focus([json.NorthLatitude, json.EastLongitude], 2.5, true);
		let myIcon = L.icon({
			iconUrl  : "./image/warn.png",
			iconSize : [30, 30],
		});
		let Cross = L.marker([Number(json.NorthLatitude), Number(json.EastLongitude)], { icon: myIcon });
		if (Tsunami.Cross != undefined) map.removeLayer(Tsunami.Cross);
		Tsunami.Cross = Cross;
		Tsunami.Time = NOW.getTime();
		map.addLayer(Cross);
		if (CONFIG["report.show"]) {
			win.show();
			if (CONFIG["report.cover"]) win.setAlwaysOnTop(true);
			win.setAlwaysOnTop(false);
		}
		if (CONFIG["report.audio"]) audioPlay("./audio/Water.wav");
	} else if (json.Function == "palert")
		PAlert = json.Data;
	else if (json.Function == "TREM_earthquake")
		TREM = json;
	else if (json.Function == "report") {
		dump({ level: 0, message: "Got Earthquake Report", origin: "API" });
		if (CONFIG["report.show"]) {
			win.show();
			if (CONFIG["report.cover"]) win.setAlwaysOnTop(true);
			win.setAlwaysOnTop(false);
		}
		if (CONFIG["report.audio"]) audioPlay("./audio/Report.wav");
		new Notification("地震報告", { body: `${json.Location.substring(json.Location.indexOf("(") + 1, json.Location.indexOf(")")).replace("位於", "")}\n${json["UTC+8"]}\n發生 M${json.Scale} 有感地震`, icon: "TREM.ico" });
		const report = await getReportByData();
		addReport(report.response[0], true);
		setTimeout(() => {
			ipcRenderer.send("screenshotEEW", {
				"ID"      : json.ID + "-" + NOW.getTime(),
				"Version" : "R",
			});
		}, 5000);
	} else if (json.Function.includes("earthquake") || json.Replay || json.Test) {
		if (!json.Replay && !json.Test) {
			if (json.Function == "ICL_earthquake" && !CONFIG["accept.eew.ICL"]) return;
			if (json.Function == "NIED_earthquake" && !CONFIG["accept.eew.NIED"]) return;
			if (json.Function == "JMA_earthquake" && !CONFIG["accept.eew.JMA"]) return;
			if (json.Function == "KMA_earthquake" && !CONFIG["accept.eew.KMA"]) return;
			if (json.Function == "earthquake" && !CONFIG["accept.eew.CWB"]) return;
			if (json.Function == "FJDZJ_earthquake" && !CONFIG["accept.eew.FJDZJ"]) return;
			eew();
		} else
			eew();

		async function eew() {
			dump({ level: 0, message: "Got EEW", origin: "API" });
			console.debug(json);

			// handler
			Info.ID = json.ID;
			if (EarthquakeList[json.ID] == undefined) EarthquakeList[json.ID] = {};
			EarthquakeList[json.ID].Time = json.Time;
			EarthquakeList[json.ID].ID = json.ID;
			let value = 0;
			let distance = 0;
			let res = await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json");
			let location = await res.json();
			let GC = {};
			let level;
			let MaxIntensity = 0;
			if (expected.length != 0)
				for (let index = 0; index < expected.length; index++)
					map.removeLayer(expected[index]);

			for (let index = 0; index < Object.keys(location).length; index++) {
				let city = Object.keys(location)[index];
				for (let Index = 0; Index < Object.keys(location[city]).length; Index++) {
					let town = Object.keys(location[city])[Index];
					let point = Math.sqrt(Math.pow(Math.abs(location[city][town][1] + (Number(json.NorthLatitude) * -1)) * 111, 2) + Math.pow(Math.abs(location[city][town][2] + (Number(json.EastLongitude) * -1)) * 101, 2));
					let Distance = Math.sqrt(Math.pow(Number(json.Depth), 2) + Math.pow(point, 2));
					let Level = PGAcount(json.Scale, Distance, location[city][town][3]);
					if (Lat == location[city][town][1] && Long == location[city][town][2]) {
						if (CONFIG["auto.waveSpeed"])
							if (Distance < 50) {
								Pspeed = 6.5;
								Sspeed = 3.5;
							}

						level = Level;
						value = Math.round((Distance - ((NOW.getTime() - json.Time) / 1000) * Sspeed) / Sspeed) - 5;
						distance = Distance;
					}
					let Intensity = IntensityN(Level);
					if (Intensity > MaxIntensity) MaxIntensity = Intensity;
					GC[city + town] = Intensity;
				}
			}

			let Intensity = IntensityN(level);
			if (Intensity < Number(CONFIG["eew.Intensity"]) && !json.Replay) {
				TimerDesynced = false;
				return;
			}

			if (geojson != null) mapTW.removeLayer(geojson);
			geojson = L.geoJson(statesData, {
				style: (feature) => {
					let name = feature.properties.COUNTY + feature.properties.TOWN;
					if (GC[name] == 0 || GC[name] == undefined)
						return {
							weight      : 1,
							opacity     : 0.8,
							color       : "#8E8E8E",
							dashArray   : "",
							fillOpacity : 0.8,
							fillColor   : "transparent",
						};

					return {
						weight      : 1,
						opacity     : 0.8,
						color       : "#8E8E8E",
						dashArray   : "",
						fillOpacity : 0.8,
						fillColor   : color(GC[name]),
					};
				},
			});
			mapTW.addLayer(geojson);
			if (!Info.Notify.includes(json.ID)) {
				if (CONFIG["eew.show"]) {
					win.show();
					win.flashFrame(true);
					if (CONFIG["eew.cover"]) win.setAlwaysOnTop(true);
				}
				let Nmsg = "";
				if (value > 0)
					Nmsg = `${value}秒後抵達`;
				else
					Nmsg = "已抵達 (預警盲區)";

				new Notification("EEW 強震即時警報", { body: `${level.replace("+", "強").replace("-", "弱")}級地震，${Nmsg}\nM ${json.Scale} ${json.Location ?? "未知區域"}`, icon: "TREM.ico" });
				Info.Notify.push(json.ID);
				if (CONFIG["eew.audio"]) audioPlay("./audio/EEW.wav");
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
			if (json.ID != Info.Warn && json.Alert) {
				Info.Warn = json.ID;
				audioPlay("./audio/Alert.wav");
			}
			let _time = -1;
			let stamp = 0;
			if (json.ID + json.Version != Info.Alert) {
				focus([Number(json.NorthLatitude), Number(json.EastLongitude) - 0.9], 7.5);
				Info.Alert = json.ID + json.Version;
				if (t != null) clearInterval(t);
				t = setInterval(() => {
					value = Math.round((distance - ((NOW.getTime() - json.Time) / 1000) * Sspeed) / Sspeed);
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
								audioPlay1("./audio/1/arrive.wav");
								_time = 0;
							}

					}
				}, 0);
			}
			if (ReportMarkID != null) {
				ReportMarkID = null;
				for (let index = 0; index < MarkList.length; index++)
					map.removeLayer(MarkList[index]);

			}
			let myIcon = L.icon({
				iconUrl  : "./image/cross.png",
				iconSize : [30, 30],
			});
			let Cross = L.marker([Number(json.NorthLatitude), Number(json.EastLongitude)], { icon: myIcon });
			let Cross1 = L.marker([Number(json.NorthLatitude), Number(json.EastLongitude)], { icon: myIcon });
			if (EarthquakeList[json.ID].Cross != undefined)
				map.removeLayer(EarthquakeList[json.ID].Cross);
			EarthquakeList[json.ID].Cross = Cross;
			map.addLayer(Cross);
			if (EarthquakeList[json.ID].Cross1 != undefined)
				mapTW.removeLayer(EarthquakeList[json.ID].Cross1);
			EarthquakeList[json.ID].Cross1 = Cross1;
			mapTW.addLayer(Cross1);
			Cross.setZIndexOffset(6000);
			let Loom = 0;
			let speed = 500;
			if (CONFIG["shock.smoothing"]) speed = 0;
			if (EarthquakeList[json.ID].Timer != undefined) clearInterval(EarthquakeList[json.ID].Timer);
			if (EarthquakeList.ITimer != undefined) clearInterval(EarthquakeList.ITimer);


			// AlertBox: 種類
			let classString = "alert-box ";
			if (json.Replay)
				classString += "eew-history";
			else if (json.Test)
				classString += "eew-test";
			else if (json.Alert)
				classString += "eew-alert";
			else
				classString += "eew-pred";

			let find = -1;
			for (let index = 0; index < INFO.length; index++)
				if (INFO[index].ID == json.ID) {
					find = index;
					break;
				}

			if (find == -1) find = INFO.length;
			INFO[find] = {
				"ID"            : json.ID,
				alert_number    : json.Version,
				alert_intensity : MaxIntensity,
				alert_location  : json.Location ?? "未知區域",
				alert_time      : new Date(json["UTC+8"]),
				alert_sTime     : new Date(json.Time),
				alert_local     : IntensityN(level),
				alert_magnitude : json.Scale,
				alert_depth     : json.Depth,
				alert_provider  : json.Unit,
				alert_type      : classString,
				"intensity-1"   : `<font color="white" size="7"><b>${IntensityI(MaxIntensity)}</b></font>`,
				"time-1"        : `<font color="white" size="2"><b>${json["UTC+8"]}</b></font>`,
				"info-1"        : `<font color="white" size="4"><b>M ${json.Scale} </b></font><font color="white" size="3"><b> 深度: ${json.Depth} km</b></font>`,
				"distance"      : distance,
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

			EEWshot =	NOW.getTime() - 3500;
			EEWshotC = 0;
			EarthquakeList[json.ID].Timer = setInterval(() => {
				if (CONFIG["shock.p"]) {
					if (EarthquakeList[json.ID].Pcircle != null)
						map.removeLayer(EarthquakeList[json.ID].Pcircle);
					if (EarthquakeList[json.ID].Pcircle1 != null)
						mapTW.removeLayer(EarthquakeList[json.ID].Pcircle1);
					let km = Math.sqrt(Math.pow((NOW.getTime() - json.Time) * Pspeed, 2) - Math.pow(Number(json.Depth) * 1000, 2));
					if (km > 0) {
						EarthquakeList[json.ID].Pcircle = L.circle([Number(json.NorthLatitude), Number(json.EastLongitude)], {
							color     : "#6FB7B7",
							fillColor : "transparent",
							radius    : km,
						});
						EarthquakeList[json.ID].Pcircle1 = L.circle([Number(json.NorthLatitude), Number(json.EastLongitude)], {
							color     : "#6FB7B7",
							fillColor : "transparent",
							radius    : km,
						});
						map.addLayer(EarthquakeList[json.ID].Pcircle);
						mapTW.addLayer(EarthquakeList[json.ID].Pcircle1);
					}
				}
				if (EarthquakeList[json.ID].Scircle != null)
					map.removeLayer(EarthquakeList[json.ID].Scircle);
				if (EarthquakeList[json.ID].Scircle1 != null)
					mapTW.removeLayer(EarthquakeList[json.ID].Scircle1);
				let km = Math.pow((NOW.getTime() - json.Time) * Sspeed, 2) - Math.pow(Number(json.Depth) * 1000, 2);
				if (km > 0) {
					let KM = Math.sqrt(km);
					EarthquakeList[json.ID].Scircle = L.circle([Number(json.NorthLatitude), Number(json.EastLongitude)], {
						color       : json.Alert ? "red" : "orange",
						fillColor   : "#F8E7E7",
						fillOpacity : 0.1,
						radius      : KM,
					});
					EarthquakeList[json.ID].Scircle1 = L.circle([Number(json.NorthLatitude), Number(json.EastLongitude)], {
						color       : json.Alert ? "red" : "orange",
						fillColor   : "#F8E7E7",
						fillOpacity : 0.1,
						radius      : KM,
					});
					map.addLayer(EarthquakeList[json.ID].Scircle);
					mapTW.addLayer(EarthquakeList[json.ID].Scircle1);
				}
				if (NOW.getTime() - EEWshot > 60000)
					EEWshotC = 0;

				if (NOW.getTime() - EEWshot > 5000 && EEWshotC <= 1) {
					EEWshotC++;
					json.Version = json.Version + "-" + EEWshotC;
					EEWshot = NOW.getTime();
					ipcRenderer.send("screenshotEEW", json);
				}
				if (NOW.getTime() - json.TimeStamp > 240000 || json.Cancel && EarthquakeList[json.ID] != undefined) {
					if (json.Cancel) {
						document.getElementById("alert").style.display = "inline";
						document.getElementById("alert-body").innerText = "強震即時警報 已取消";
						setTimeout(() => {
							document.getElementById("alert").style.display = "none";
						}, 30000);
					}
					if (EarthquakeList[json.ID].Scircle != undefined) map.removeLayer(EarthquakeList[json.ID].Scircle);
					if (EarthquakeList[json.ID].Pcircle != undefined) map.removeLayer(EarthquakeList[json.ID].Pcircle);
					if (EarthquakeList[json.ID].Scircle1 != undefined) mapTW.removeLayer(EarthquakeList[json.ID].Scircle1);
					if (EarthquakeList[json.ID].Pcircle1 != undefined) mapTW.removeLayer(EarthquakeList[json.ID].Pcircle1);
					map.removeLayer(EarthquakeList[json.ID].Cross);
					mapTW.removeLayer(EarthquakeList[json.ID].Cross1);
					for (let index = 0; index < INFO.length; index++)
						if (INFO[index].ID == json.ID) {
							TINFO = 0;
							INFO.splice(index, 1);
							break;
						}

					clearInterval(EarthquakeList[json.ID].Timer);
					document.getElementById("box-10").innerHTML = "";
					delete EarthquakeList[json.ID];
					if (Object.keys(EarthquakeList).length == 0) {
						clearInterval(t);
						clearInterval(ITimer);
						// hide eew alert
						$("#alert-box").removeClass("show");
						// hide minimap
						$("#map-tw").removeClass("show");
						// restore reports
						$(roll).fadeIn(200);
						ITimer = null;
						ticker = null;
						focus([Lat, Long], 7.5);
						TimerDesynced = false;
						audioList = [];
						INFO = [];
						map.removeLayer(geojson);
						win.setAlwaysOnTop(false);
						for (let index = 0; index < expected.length; index++)
							map.removeLayer(expected[index]);

						expected = [];
					} else
						focus();

				}
				if (CONFIG["map.autoZoom"]) {
					if ((NOW.getTime() - json.Time) * Pspeed > 250000 && Loom < 250000) {
						Loom = 250000;
						focus([Number(json.NorthLatitude), Number(json.EastLongitude) - 0.9], 7);
					}
					if ((NOW.getTime() - json.Time) * Pspeed > 500000 && Loom < 500000) {
						Loom = 500000;
						focus([Number(json.NorthLatitude), Number(json.EastLongitude) - 0.9], 6.5);
					}
					if ((NOW.getTime() - json.Time) * Pspeed > 750000 && Loom < 750000) {
						Loom = 750000;
						focus([Number(json.NorthLatitude), Number(json.EastLongitude) - 0.9], 6);
					}
				}
			}, speed);
			setTimeout(() => {
				if (CONFIG["webhook.url"] != "") {
					let Now = NOW.getFullYear() +
						"/" + (NOW.getMonth() + 1) +
						"/" + NOW.getDate() +
						" " + NOW.getHours() +
						":" + NOW.getMinutes() +
						":" + NOW.getSeconds();

					let msg = CONFIG["webhook.body"];
					msg = msg.replace("%Depth%", json.Depth).replace("%NorthLatitude%", json.NorthLatitude).replace("%Time%", json["UTC+8"]).replace("%EastLongitude%", json.EastLongitude).replace("%Scale%", json.Scale);
					if (json.Function == "earthquake")
						msg = msg.replace("%Provider%", "中華民國交通部中央氣象局");
					else if (json.Function == "JP_earthquake")
						msg = msg.replace("%Provider%", "日本氣象廳");
					else if (json.Function == "CN_earthquake")
						msg = msg.replace("%Provider%", "福建省地震局");

					msg = JSON.parse(msg);
					msg.username = "TREM | 台灣實時地震監測";

					msg.embeds[0].image.url = "";
					msg.embeds[0].footer = {
						"text"     : `ExpTech Studio ${Now}`,
						"icon_url" : "https://raw.githubusercontent.com/ExpTechTW/API/master/image/Icon/ExpTech.png",
					};
					dump({ level: 0, message: "Posting Webhook", origin: "Webhook" });
					axios.post(CONFIG["webhook.url"], msg)
						.catch((error) => {
							dump({ level: 2, message: error, origin: "Webhook" });
						});
				}
			}, 2000);
		}
	}
}
// #endregion

function updateText() {
	$("#alert-box")[0].className = `${INFO[TINFO].alert_type} ${IntensityToClassString(INFO[TINFO].alert_intensity)}`;
	$("#alert-local")[0].className = `alert-item ${IntensityToClassString(INFO[TINFO].alert_local)}`;
	$("#alert-provider").text(`${INFO.length ? `${TINFO + 1} ` : ""}${INFO[TINFO].alert_provider}`);
	$("#alert-number").text(`${INFO[TINFO].alert_number}`);
	$("#alert-location").text(INFO[TINFO].alert_location);
	$("#alert-time").text(INFO[TINFO].alert_time.format("YYYY/MM/DD HH:mm:ss"));
	$("#alert-magnitude").text(INFO[TINFO].alert_magnitude);
	$("#alert-depth").text(INFO[TINFO].alert_depth);
	$("#alert-box").addClass("show");

	let num = Math.round((INFO[TINFO].distance - ((NOW.getTime() - INFO[TINFO].alert_sTime.getTime()) / 1000) * Sspeed) / Sspeed);
	if (num <= 0) num = "";
	document.getElementById("alert-s").innerText = `${num}`;
	num = Math.round((INFO[TINFO].distance - ((NOW.getTime() - INFO[TINFO].alert_sTime.getTime()) / 1000) * Pspeed) / Pspeed);
	if (num <= 0) num = "";
	document.getElementById("alert-p").innerText = `${num}`;

	let Num = Math.round(((NOW.getTime() - INFO[TINFO].Time) * 4 / 10) / INFO[TINFO].Depth);
	let Catch = document.getElementById("box-10");
	if (Num <= 100)
		Catch.innerHTML = `<font color="white" size="6"><b>震波到地表進度: ${Num}%</b></font>`;
	else
		Catch.innerHTML = "";
}
