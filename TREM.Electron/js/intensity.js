require("leaflet");
require("leaflet-edgebuffer");
require("leaflet-geojson-vt");
const maplibregl = require("maplibre-gl");
const { BrowserWindow } = require("@electron/remote");

const MapData = {};
const Station = {};

MapData.tw_county = require(path.join(__dirname, "../Resources/GeoJSON", "tw_county.json"));
MapData.tw_town = require(path.join(__dirname, "../Resources/GeoJSON", "tw_town.json"));

/**
 * @type {{main: L.Map, report: maplibregl.Map}}
 */
const Maps = { intensity: null };

/**
 * @type { {[key: string]: Map<string, maplibregl.StyleLayer>} }
 */
const MapBases = { intensity: new Map() };

TREM.Detector = {
	canvas : !!window.CanvasRenderingContext2D,
	webgl  : (function() {
		try {
			const canvas = document.createElement("canvas");
			return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
		} catch (e) {
			return false;
		}
	})(),
};

TREM.Audios = {
	palert: new Audio("../audio/palert.wav"),
};

TREM.win = BrowserWindow.fromId(process.env.intensitywindow * 1);

const color = function color(Intensity) {
	return setting["theme.customColor"] ? setting[`theme.int.${Intensity}`]
		: [
			"#757575",
			"#757575",
			"#2774C2",
			"#7BA822",
			"#E8D630",
			"#E68439",
			"#DB641F",
			"#F55647",
			"#DB1F1F",
			"#862DB3",
		][Intensity];
	// return ["#666666", "#0165CC", "#01BB02", "#EBC000", "#FF8400", "#E06300", "#FF0000", "#B50000", "#68009E"][Intensity ? Intensity - 1 : Intensity];
};

async function init() {
	TREM.MapRenderingEngine = setting["map.engine"];
	TREM.Colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);

	if (TREM.MapRenderingEngine == "leaflet")
		TREM.Detector.webgl = false;

	if (TREM.Detector.webgl || TREM.MapRenderingEngine == "mapbox-gl") {
		if (!Maps.intensity)
			Maps.intensity = new maplibregl.Map(
				{
					container : "map-intensity",
					maxPitch  : 0,
					maxBounds : [
						50,
						10,
						180,
						60,
					],
					zoom              : 6.5,
					center            : [119, 24.132],
					renderWorldCopies : false,
					keyboard          : false,
					doubleClickZoom   : false,
				})
				.on("click", (ev) => {
					if (ev.originalEvent.target.tagName == "CANVAS")
						Maps.intensity.flyTo({
							center   : [119, 24.132],
							zoom     : 6.5,
							bearing  : 0,
							speed    : 2,
							curve    : 1,
							easing   : (e) => Math.sin(e * Math.PI / 2),
							duration : 500,
						});
				})
				.on("zoom", () => {
					if (Maps.intensity.getZoom() >= 11.5) {
						for (const key in Station)
							if (!Station[key].getPopup().isOpen())
								Station[key].togglePopup();
					} else {
						for (const key in Station)
							if (Station[key].getPopup().isOpen())
								if (!Station[key].getPopup().persist)
									Station[key].togglePopup();
					}
				})
				.on("contextmenu", (ev) => {
					if (ev.originalEvent.target.tagName == "CANVAS")
						Maps.intensity.flyTo({
							center   : [119, 24.132],
							zoom     : 6.5,
							bearing  : 0,
							speed    : 2,
							curve    : 1,
							easing   : (e) => Math.sin(e * Math.PI / 2),
							duration : 1000,
						});
				});

		if (!MapBases.intensity.length) {
			Maps.intensity.addSource("Source_tw_county", {
				type : "geojson",
				data : MapData.tw_county,
			});
			Maps.intensity.addSource("Intensity_Source_tw_town", {
				type : "geojson",
				data : MapData.tw_town,
			});
			MapBases.intensity.set("tw_county_fill", Maps.intensity.addLayer({
				id     : "Layer_tw_county_Fill",
				type   : "fill",
				source : "Source_tw_county",
				paint  : {
					"fill-color"   : TREM.Colors.surfaceVariant,
					"fill-opacity" : 1,
				},
			}).getLayer("Layer_tw_county_Fill"));
			Maps.intensity.addLayer({
				id     : "Layer_intensity",
				type   : "fill",
				source : "Intensity_Source_tw_town",
				paint  : {
					"fill-color": [
						"match",
						[
							"coalesce",
							["feature-state", "intensity"],
							0,
						],
						9,
						setting["theme.customColor"] ? setting["theme.int.9"]
							: "#862DB3",
						8,
						setting["theme.customColor"] ? setting["theme.int.8"]
							: "#DB1F1F",
						7,
						setting["theme.customColor"] ? setting["theme.int.7"]
							: "#F55647",
						6,
						setting["theme.customColor"] ? setting["theme.int.6"]
							: "#DB641F",
						5,
						setting["theme.customColor"] ? setting["theme.int.5"]
							: "#E68439",
						4,
						setting["theme.customColor"] ? setting["theme.int.4"]
							: "#E8D630",
						3,
						setting["theme.customColor"] ? setting["theme.int.3"]
							: "#7BA822",
						2,
						setting["theme.customColor"] ? setting["theme.int.2"]
							: "#2774C2",
						1,
						setting["theme.customColor"] ? setting["theme.int.1"]
							: "#757575",
						"transparent",
					],
					"fill-outline-color": [
						"case",
						[
							">",
							[
								"coalesce",
								["feature-state", "intensity"],
								0,
							],
							0,
						],
						TREM.Colors.onSurfaceVariant,
						"transparent",
					],
					"fill-opacity": [
						"case",
						[
							">",
							[
								"coalesce",
								["feature-state", "intensity"],
								0,
							],
							0,
						],
						1,
						0,
					],
				},
				layout: {
					visibility: "none",
				},
			});
			MapBases.intensity.set("tw_county_line", Maps.intensity.addLayer({
				id     : "Layer_tw_county_Line",
				type   : "line",
				source : "Source_tw_county",
				paint  : {
					"line-color"   : TREM.Colors.primary,
					"line-width"   : 0.75,
					"line-opacity" : 1,
				},
			}).getLayer("Layer_tw_county_Line"));
		}
	} else {
		if (!Maps.intensity) {
			Maps.intensity = L.map("map-intensity",
				{
					attributionControl : false,
					closePopupOnClick  : false,
					maxBounds          : [[30, 130], [10, 100]],
					preferCanvas       : true,
					zoomSnap           : 0.25,
					zoomDelta          : 0.5,
					zoomAnimation      : true,
					fadeAnimation      : setting["map.animation"],
					zoomControl        : false,
					doubleClickZoom    : false,
					keyboard           : false,
				})
				.fitBounds([[25.35, 119.4], [21.9, 122.22]], {
					paddingTopLeft: [document.getElementById("map-intensity").offsetWidth / 2, 0],
				})
				.on("contextmenu", () => TREM.Intensity._focusMap())
				.on("click", () => TREM.Intensity._focusMap());
			Maps.intensity._zoomAnimated = setting["map.animation"];
		}

		if (!MapBases.intensity.length)
			MapBases.intensity.set("tw_county",
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
				}).addTo(Maps.intensity));
	}

	const resizeHandler = (ev) => {
		if (ev && ev.propertyName != "margin-top") return;

		Maps.intensity.resize();
		TREM.Intensity._focusMap();
	};

	document.getElementById("view").addEventListener("transitionend", resizeHandler);
	const folder = path.join(app.getPath("userData"), "data");

	if (setting["intensity.cwb"] != "") {
		const json_cwb = require(path.resolve(folder, `${setting["intensity.cwb"]}.json`));
		ipcRenderer.send("TREMIntensityload", json_cwb);
	}

	if (setting["intensity.palert"] != "") {
		const json_palert = require(path.resolve(folder, `${setting["intensity.palert"]}.json`));
		ipcRenderer.send("TREMIntensityload", json_palert);
	}

	if (setting["intensity.trem"] != "") {
		const json_trem = require(path.resolve(folder, `${setting["intensity.trem"]}.json`));
		ipcRenderer.send("TREMIntensityload", json_trem);
	}
}

TREM.Intensity = {
	isTriggered : false,
	alertTime   : 0,
	intensities : new Map(),
	geojson     : null,
	cwb         : {},
	palert      : {},
	trem        : {},
	timer       : {},

	/**
	 * @type {maplibregl.Marker[]}
	 */
	_markers   : null,
	_raw       : null,
	_lastFocus : [],
	get _mapPaddingLeft() {
		return document.getElementById("map-intensity").offsetWidth / 2;
	},

	_focusMap(...args) {
		if (args.length) {
			this._lastFocus = [...args];
			Maps.intensity.fitBounds(...args);
		} else if (this._lastFocus.length) {
			Maps.intensity.fitBounds(...this._lastFocus);
		} else if (TREM.Detector.webgl || TREM.MapRenderingEngine == "mapbox-gl") {
			this._lastFocus = [
				[
					119.8,
					21.82,
					122.18,
					25.42,
				],
				{
					padding  : { left: (Maps.intensity.getCanvas().width / 2) * 0.8 },
					duration : 1000,
				},
			];
			Maps.intensity.fitBounds(...this._lastFocus);
		} else {
			this._lastFocus = [[[25.35, 119.4], [21.9, 122.22]], { paddingTopLeft: [this._mapPaddingLeft, 0] }];
			Maps.intensity.fitBounds(...this._lastFocus);
		}
	},

	handle(rawIntensityData) {
		console.log(rawIntensityData);

		if (rawIntensityData.raw != undefined) {
			let unit = rawIntensityData.unit;
			const raw = rawIntensityData.raw;
			const raw_intensity_Data = raw.intensity;
			const raw_info_Data = raw.info;
			const PLoc = {};
			const int = new Map();
			// console.log(raw_info_Data);

			if (unit == "cwb")
				TREM.Intensity.cwb = rawIntensityData;
			else if (unit == "palert")
				TREM.Intensity.palert = rawIntensityData;
			else if (unit == "trem")
				TREM.Intensity.trem = rawIntensityData;

			if (this._raw != null) this.clear();

			if (unit == "cwb") unit = "CWB";

			if (unit == "palert") unit = "P-Alert";

			if (unit == "trem") unit = "TREM";

			for (let index = 0, keys = Object.keys(raw_intensity_Data), n = keys.length; index < n; index++) {
				const intensity = Number(keys[index]);
				const ids = raw_intensity_Data[intensity];

				for (const city in TREM.Resources.region)
					for (const town in TREM.Resources.region[city]) {
						const loc = TREM.Resources.region[city][town];

						for (const id of ids)
							if (loc.id == id) {
								int.set(loc.code, intensity);
								PLoc[loc.code] = intensity;
							}
					}
			}

			if (TREM.Detector.webgl || TREM.MapRenderingEngine == "mapbox-gl") {
				if (this.intensities.size)
					for (let index = 0, keys = Object.keys(rawIntensityData), n = keys.length; index < n; index++) {
						const towncode = keys[index] + "0";
						const intensity = rawIntensityData[keys[index]];

						if (int.get(towncode) != intensity) {
							this.intensities.delete(towncode);
							Maps.intensity.setFeatureState({
								source : "Intensity_Source_tw_town",
								id     : towncode,
							}, { intensity: 0 });
						}
					}

				if (this._markers != null) {
					this._markers.remove();
					this._markers = null;
				}

				if (int.size) {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "handle");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					for (const [towncode, intensity] of int)
						Maps.intensity.setFeatureState({
							source : "Intensity_Source_tw_town",
							id     : towncode,
						}, { intensity });

					Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "visible");

					this._raw = raw;
					this.intensities = int;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = new maplibregl.Marker({ element: $(TREM.Resources.icon.cross({ size: 32, className: "epicenterIcon", zIndexOffset: 5000 }))[0] }).setLngLat([raw_info_Data.lon, raw_info_Data.lat]).addTo(Maps.intensity);
				} else {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "handle");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					this._raw = raw;
					this.intensities = int;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = new maplibregl.Marker({ element: $(TREM.Resources.icon.cross({ size: 32, className: "epicenterIcon", zIndexOffset: 5000 }))[0] }).setLngLat([raw_info_Data.lon, raw_info_Data.lat]).addTo(Maps.intensity);
				}
			} else {
				if (this.geojson != null) {
					this.geojson.remove();
					this.geojson = null;
				}

				if (this._markers != null) {
					this._markers.remove();
					this._markers = null;
				}

				if (int.size) {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "handle");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					this._raw = raw;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = L.marker(
						[raw_info_Data.lat, raw_info_Data.lon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.oldcross,
								iconSize  : [32, 32],
								className : "epicenterIcon",
							}),
							zIndexOffset: 5000,
						}).addTo(Maps.intensity);

					this.geojson = L.geoJson.vt(MapData.tw_town, {
						minZoom   : 7.5,
						maxZoom   : 10,
						tolerance : 20,
						buffer    : 256,
						debug     : 0,
						zIndex    : 5,
						style     : (properties) => {
							const name = properties.TOWNCODE;

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
					}).addTo(Maps.intensity);
				} else {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "handle");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					this._raw = raw;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = L.marker(
						[raw_info_Data.lat, raw_info_Data.lon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.oldcross,
								iconSize  : [32, 32],
								className : "epicenterIcon",
							}),
							zIndexOffset: 5000,
						}).addTo(Maps.intensity);
				}
			}

			if (!this.isTriggered) {
				this.isTriggered = true;

				if (setting["intensity.show"]) {
					if (setting["Real-time.show"]) TREM.win.showInactive();

					if (setting["Real-time.cover"]) TREM.win.moveTop();

					if (!TREM.win.isFocused()) TREM.win.flashFrame(true);

					if (setting["audio.PAlert"]) TREM.Audios.palert.play();
				}
			}

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
				this.timer = setTimeout(() => this.clear, 60_000);
			} else {
				this.timer = setTimeout(() => this.clear, 60_000);
			}
		}
	},

	load(rawIntensityData) {
		console.log(rawIntensityData);

		if (rawIntensityData.raw != undefined) {
			let unit = rawIntensityData.unit;
			const raw = rawIntensityData.raw;
			const raw_intensity_Data = raw.intensity;
			const raw_info_Data = raw.info;
			const PLoc = {};
			const int = new Map();
			// console.log(raw_info_Data);

			if (unit == "cwb")
				TREM.Intensity.cwb = rawIntensityData;
			else if (unit == "palert")
				TREM.Intensity.palert = rawIntensityData;
			else if (unit == "trem")
				TREM.Intensity.trem = rawIntensityData;

			if (this._raw != null) this.clear();

			if (unit == "cwb") unit = "CWB";

			if (unit == "palert") unit = "P-Alert";

			if (unit == "trem") unit = "TREM";

			for (let index = 0, keys = Object.keys(raw_intensity_Data), n = keys.length; index < n; index++) {
				const intensity = Number(keys[index]);
				const ids = raw_intensity_Data[intensity];

				for (const city in TREM.Resources.region)
					for (const town in TREM.Resources.region[city]) {
						const loc = TREM.Resources.region[city][town];

						for (const id of ids)
							if (loc.id == id) {
								int.set(loc.code, intensity);
								PLoc[loc.code] = intensity;
							}
					}
			}

			if (TREM.Detector.webgl || TREM.MapRenderingEngine == "mapbox-gl") {
				if (this.intensities.size)
					for (let index = 0, keys = Object.keys(rawIntensityData), n = keys.length; index < n; index++) {
						const towncode = keys[index] + "0";
						const intensity = rawIntensityData[keys[index]];

						if (int.get(towncode) != intensity) {
							this.intensities.delete(towncode);
							Maps.intensity.setFeatureState({
								source : "Intensity_Source_tw_town",
								id     : towncode,
							}, { intensity: 0 });
						}
					}

				if (this._markers != null) {
					this._markers.remove();
					this._markers = null;
				}

				if (int.size) {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "load");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					for (const [towncode, intensity] of int)
						Maps.intensity.setFeatureState({
							source : "Intensity_Source_tw_town",
							id     : towncode,
						}, { intensity });

					Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "visible");

					this._raw = raw;
					this.intensities = int;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = new maplibregl.Marker({ element: $(TREM.Resources.icon.cross({ size: 32, className: "epicenterIcon", zIndexOffset: 5000 }))[0] }).setLngLat([raw_info_Data.lon, raw_info_Data.lat]).addTo(Maps.intensity);
				} else {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "load");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					this._raw = raw;
					this.intensities = int;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = new maplibregl.Marker({ element: $(TREM.Resources.icon.cross({ size: 32, className: "epicenterIcon", zIndexOffset: 5000 }))[0] }).setLngLat([raw_info_Data.lon, raw_info_Data.lat]).addTo(Maps.intensity);
				}
			} else {
				if (this.geojson != null) {
					this.geojson.remove();
					this.geojson = null;
				}

				if (this._markers != null) {
					this._markers.remove();
					this._markers = null;
				}

				if (int.size) {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "load");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					this._raw = raw;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = L.marker(
						[raw_info_Data.lat, raw_info_Data.lon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.oldcross,
								iconSize  : [32, 32],
								className : "epicenterIcon",
							}),
							zIndexOffset: 5000,
						}).addTo(Maps.intensity);

					this.geojson = L.geoJson.vt(MapData.tw_town, {
						minZoom   : 7.5,
						maxZoom   : 10,
						tolerance : 20,
						buffer    : 256,
						debug     : 0,
						zIndex    : 5,
						style     : (properties) => {
							const name = properties.TOWNCODE;

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
					}).addTo(Maps.intensity);
				} else {
					log(`Total ${int.size} triggered area`, 1, "Intensity", "load");
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					this._raw = raw;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					document.getElementById("intensity-overview-unit").innerText = unit;
					document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
					const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
					document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
					document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
					document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";

					this._markers = L.marker(
						[raw_info_Data.lat, raw_info_Data.lon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.oldcross,
								iconSize  : [32, 32],
								className : "epicenterIcon",
							}),
							zIndexOffset: 5000,
						}).addTo(Maps.intensity);
				}
			}

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
				this.timer = setTimeout(() => this.clear, 60_000);
			} else {
				this.timer = setTimeout(() => this.clear, 60_000);
			}
		}
	},

	clear() {
		log("Clearing Intensity map", 1, "Intensity", "clear");
		dump({ level: 0, message: "Clearing Intensity map", origin: "Intensity" });

		if (this.intensities.size) {
			if (TREM.Detector.webgl || TREM.MapRenderingEngine == "mapbox-gl") {
				for (const [towncode] of this.intensities)
					Maps.intensity.removeFeatureState({
						source : "Intensity_Source_tw_town",
						id     : towncode,
					});
				Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "none");
			}

			document.getElementById("intensity-overview").style.visibility = "none";
			document.getElementById("intensity-overview").classList.remove("show");
			delete this.intensities;
			this.intensities = new Map();
			this.alertTime = 0;
			this.isTriggered = false;
			this._raw = null;
			this._lastFocus = [];
			this._focusMap();

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
			}
		}
	},
};

ipcMain.on("TREMIntensityhandle", (event, json) => {
	if (TREM.Intensity.isTriggered)
		TREM.Intensity.clear();
	TREM.Intensity.handle(json);
});

ipcMain.on("TREMIntensityload", (event, json) => {
	if (TREM.Intensity.isTriggered)
		TREM.Intensity.clear();
	TREM.Intensity.load(json);
});

ipcMain.on("TREMIntensitytime2", (event, time) => {
	const time2 = document.getElementById("time2");
	time2.innerText = time;
});

ipcMain.on("TREMIntensitylog2", (event, log) => {
	const time2 = document.getElementById("log2");
	time2.innerText = log;
});

ipcMain.on("TREMIntensityappversion2", (event, version) => {
	const time2 = document.getElementById("app-version2");
	time2.innerText = version;
});