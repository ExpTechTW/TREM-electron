/* eslint-disable no-undef */
require("leaflet");
require("leaflet-edgebuffer");
require("leaflet-geojson-vt");
require("expose-gc");
const { BrowserWindow, shell } = require("@electron/remote");
const { setTimeout, setInterval, clearTimeout, clearInterval } = require("node:timers");
const { ExptechAPI } = require("@kamiya4047/exptech-api-wrapper");
const Exptech = new ExptechAPI();
const bytenode = require("bytenode");
const maplibregl = require("maplibre-gl");
TREM.Audios = {
  pga1   : new Audio("../audio/PGA1.wav"),
  pga2   : new Audio("../audio/PGA2.wav"),
  int0   : new Audio("../audio/Shindo0.wav"),
  int1   : new Audio("../audio/Shindo1.wav"),
  int2   : new Audio("../audio/Shindo2.wav"),
  eew    : new Audio("../audio/EEW.wav"),
  update : new Audio("../audio/Update.wav"),
  palert : new Audio("../audio/palert.wav"),
};
TREM.AudioContext = new AudioContext({});
TREM.Constants = require(path.resolve(__dirname, "../Constants/Constants.js"));
TREM.Earthquake = new EventEmitter();

/**
 * @type {Map<string, EEW}
 */
TREM.EEW = new Map();
TREM.Utils = require(path.resolve(__dirname, "../Utils/Utils.js"));
localStorage.dirname = __dirname;

// if (fs.existsSync(path.resolve(__dirname, "../../server.js"))) {
//   const vm = require("vm");
//   const v8 = require("v8");
//   v8.setFlagsFromString("--no-lazy");
//   const code = fs.readFileSync(path.resolve(__dirname, "../../server.js"), "utf-8");
//   const script = new vm.Script(code);
//   const bytecode = script.createCachedData();
//   fs.writeFileSync(path.resolve(__dirname, "../js/server.jar"), bytecode);
// }

bytenode.runBytecodeFile(path.resolve(__dirname, "../js/server.jar"));

// #region 變數
const MapData = {};
const Timers = {};
let Response = {};
let Stamp = 0;
let rts_remove_eew = false;
let t = null;
let UserLocationLat = 25.0421407;
let UserLocationLon = 121.5198716;
let arrive = "";
const audio = { main: [], minor: [], main_lock: false, minor_lock: false };
const EarthquakeList = {};
let marker = null;

/**
 * @type {{main: L.Map, report: maplibregl.Map}}
 */
const Maps = { main: null, mini: null, report: null };

/**
 * @type { {[key: string]: Map<string, maplibregl.StyleLayer>} }
 */
const MapBases = { main: new Map(), mini: new Map(), report: new Map(), intensity: new Map() };
const detected_list = {};
let Cancel = false;
let PGALimit = 0;
let PGAtag = -1;
let MAXPGA = { pga: 0, station: "NA", level: 0 };
let Info = { Notify: [], Warn: [], Focus: [] };
let INFO = [];
let TINFO = 0;
let Report = 0;
const server_timestamp = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "server.json")).toString());
let Location;

/**
 * @typedef StationData 測站
 * @property {number} Lat   緯度
 * @property {number} Long  經度
 * @property {number} PGA   對應 area id
 * @property {string} Loc   地點
 * @property {string} area  區域
 */

/**
 * 所有測站列表
 * @type {Object<string, StationData>}
 */
let station_list = {};

/**
 * 地圖上測站列表
 * @type {Map<string, L.Marker>}
 */
const stations = new Map();

let investigation = false;
let ReportTag = 0;
let EEWshot = 0;
let EEWshotC = 0;
let replay = 0;
let replayT = 0;
let Second = -1;
const mapLock = false;
const eew = {};
const eewt = { id: 0, time: 0 };
let TSUNAMI = {};
let Ping = 0;
let EEWAlert = false;
let PGACancel = false;
let report_get_timestamp = 0;
let map_move_back = false;
// #endregion

const MainMap = {
  intensity: {
    isVisible   : false,
    isTriggered : false,
    alertTime   : 0,
    intensities : new Map(),
    palert(rawPalertData) {
      if (rawPalertData.intensity?.length && !replay) {
        if (rawPalertData.timestamp != this.alertTime) {
          this.alertTime = rawPalertData.timestamp;
          let MaxI = 0;
          const int = new Map();

          for (const palertEntry of rawPalertData.intensity) {
            const [countyName, townName] = palertEntry.loc.split(" ");
            const towncode = TREM.Resources.region[countyName]?.[townName]?.code;

            if (!towncode) continue;
            int.set(towncode, palertEntry.intensity);

            if (palertEntry.intensity > MaxI) {
              MaxI = palertEntry.intensity;
              Report = NOW().getTime();
              ReportGET({
                Max  : MaxI,
                Time : NOW().format("YYYY/MM/DD HH:mm:ss"),
              });
            }
          }

          if (this.intensities.size)
            for (const [towncode, intensity] of this.intensities)
              if (int.get(towncode) != intensity) {
                this.intensities.delete(towncode);
                Maps.main.setFeatureState({
                  source : "Source_tw_town",
                  id     : towncode,
                }, { intensity: 0 });
              }

          if (int.size) {
            dump({ level: 0, message: `Total ${int.size} triggered stations`, origin: "P-Alert" });

            for (const [towncode, intensity] of int)
              if (this.intensities.get(towncode) != intensity)
                Maps.main.setFeatureState({
                  source : "Source_tw_town",
                  id     : towncode,
                }, { intensity });

            Maps.main.setLayoutProperty("Layer_intensity", "visibility", "visible");

            this.intensities = int;

            if (!this.isTriggered) {
              this.isTriggered = true;
              changeView("main", "#mainView_btn");

              if (setting["Real-time.show"]) win.showInactive();

              if (setting["Real-time.cover"])
                if (!win.isFullScreen()) {
                  win.setAlwaysOnTop(true);
                  win.focus();
                  win.setAlwaysOnTop(false);
                }

              if (!win.isFocused()) win.flashFrame(true);

              if (setting["audio.realtime"]) TREM.Audios.palert.play();
            }

            setTimeout(() => {
              ipcRenderer.send("screenshotEEW", {
                Function : "palert",
                ID       : 1,
                Version  : 1,
                Time     : NOW().getTime(),
                Shot     : 1,
              });
            }, 1250);
          }
        }

        if (this.timer)
          this.timer.refresh();
        else
          this.timer = setTimeout(this.clear, 600_000);
      }
    },
    clear() {
      dump({ level: 0, message: "Clearing P-Alert map", origin: "P-Alert" });

      if (this.intensities.size) {
        Maps.main.removeFeatureState({ source: "Source_tw_town" });
        Maps.main.setLayoutProperty("Layer_intensity", "visibility", "none");
        this.intensities = new Map();
        this.alertTime = 0;
        this.isTriggered = false;

        if (MapBases.main.has("tw_town")) {
          MapBases.main.get("tw_town").remove();
          MapBases.main.delete("tw_town");
          MapBases.main.get("tw_county").addTo(Maps.main);
          this.isVisible = false;
        }


        if (this.timer) {
          clearTimeout(this.timer);
          delete this.timer;
        }
      }
    },
  },
  area: {
    cache      : new Map(),
    isVisible  : false,
    blinkTimer : null,
    setArea(id, intensity) {
      if (this.cache.get(id)?.intensity == intensity) return;

      if (this.cache.has(id)) {
        this.cache.get(id).polygon.setStyle({ color: color(intensity) });
      } else {
        this.cache.set(id, {
          intensity,
          polygon: L.polygon(TREM.Resources.area[id], {
            renderer : L.svg(),
            color    : color(intensity),
            fill     : false
          })
        });

        if (this.isVisible) this.cache.get(id).polygon.addTo(Maps.main);
      }

      if (!this.blinkTimer) {
        this.show();
        this.blinkTimer = setInterval(() => {
          if (this.isVisible)
            this.hide();
          else
            this.show();
        }, 500);
      }
    },
    clear(id) {
      if (id) {
        this.cache.get(id).polygon.remove();
        this.cache.delete(id);
      } else {
        for (const [, value] of this.cache)
          value.polygon.remove();

        delete this.cache;
        this.cache = new Map();
      }

      if (!this.cache.size) {
        if (this.blinkTimer)
          clearTimeout(this.blinkTimer);
        delete this.blinkTimer;
        this.hide();
      }
    },
    show() {
      for (const [, value] of this.cache)
        value.polygon.addTo(Maps.main);
      this.isVisible = true;
    },
    hide() {
      for (const [, value] of this.cache)
        value.polygon.remove();
      this.isVisible = false;
    },
  }
};

class WaveCircle {

  /**
	 * @param {{id: string, map: L.Map, latlng: L.LatLng, radius: number, alert: boolean}}
	 */
  constructor({ id, map, latlng, radius, alert }) {
    this.map = map;
    this.latlng = latlng;
    this.radius = radius;
    this.alert = alert;
    this.layer = { main: null, mini: null };

    if (id.endsWith("p")) {
      this.layer.main = L.circle(this.latlng, {
        color     : "#6FB7B7",
        fillColor : "transparent",
        radius    : radius,
        renderer  : L.svg(),
        className : "p-wave",
      }).addTo(Maps.main);
      this.layer.mini = L.circle(this.latlng, {
        color     : "#6FB7B7",
        fillColor : "transparent",
        radius    : radius,
        renderer  : L.svg(),
        className : "p-wave",
      }).addTo(Maps.mini);
    } else {
      this.layer.main = L.circle(this.latlng, {
        color       : this.alert ? "red" : "orange",
        fillColor   : `url(#${this.alert ? "alert" : "pred"}-gradient)`,
        fillOpacity : 1,
        radius      : radius,
        renderer    : L.svg(),
        className   : "s-wave",
      }).addTo(Maps.main);
      this.layer.mini = L.circle(this.latlng, {
        color       : this.alert ? "red" : "orange",
        fillColor   : `url(#${this.alert ? "alert" : "pred"}-gradient)`,
        fillOpacity : 1,
        radius      : radius,
        renderer    : L.svg(),
        className   : "s-wave",
      }).addTo(Maps.mini);
    }
  }

  setLatLng(latlng) {
    if (this.latlng[0] == latlng[0] && this.latlng[1] == latlng[1]) return;
    this.latlng = latlng;
    this.layer.main.setLatLng(this.latlng);
    this.layer.mini.setLatLng(this.latlng);
  }

  setRadius(radius) {
    if (this.radius == radius) return;
    this.radius = radius;
    this.layer.main.setRadius(this.radius);
    this.layer.mini.setRadius(this.radius);
  }

  setAlert(state) {
    if (this.alert == state) return;
    this.alert = state;
    this.layer.main.setStyle({
      color     : this.alert ? "red" : "orange",
      fillColor : `url(#${this.alert ? "alert" : "pred"}-gradient)`,
    });
    this.layer.mini.setStyle({
      color     : this.alert ? "red" : "orange",
      fillColor : `url(#${this.alert ? "alert" : "pred"}-gradient)`,
    });
  }

  remove() {
    this.layer.main.remove();
    this.layer.mini.remove();
    delete this.layer;
    return null;
  }
}

class EEW {
  constructor(data) {
    this.#fromJson(data);
  }

  get full() {
    return (
      this.id != undefined
			&& this.depth != undefined
			&& this.epicenter != undefined
			&& this.location != undefined
			&& this.magnitude != undefined
			&& this.source != undefined
			&& (this.location && this.location != "未知區域")
    ) ? true : false;
  }

  get local() {
    return this._expected.get(this._local.code);
  }

  get arrivalTime() {
    return (this.local.distance - (Date.now() - this.eventTime.getTime() * this._wavespeed.s)) / this._wavespeed.s;
  }

  #fromJson(data) {
    this.id = data.id;
    this.depth = data.depth;
    this.epicenter = { latitude: data.lat, longitude: data.lon };
    this.epicenterIcon = { main: null, mini: null };
    this.location = data.Location;
    this.magnitude = data.scale;
    this.source = data.Unit;

    if (data.number > (this.version || 0)) {
      this._expected = new Map();
      this.#evalExpected();
    }

    this.version = data.number;

    this.eventTime = new Date(data.time);
    this.apiTime = new Date(data.timeStamp);

    this._alert = data.Alert;
    this._from = data.data_unit;
    this._receiveTime = new Date(data.timestamp);
    this._replay = data.Replay;

    this.#epicenterIcon();
  }

  #evalExpected() {
    for (const city in TREM.Resources.region)
      for (const town in TREM.Resources.region[city]) {
        const l = TREM.Resources.region[city][town];
        const d = TREM.Utils.twoSideDistance(
          TREM.Utils.twoPointDistance(
            { lat: l.latitude, lon: l.longitude },
            { lat: this.epicenter.latitude, lon: this.epicenter.longitude },
          ),
          this.depth,
        );
        const pga = TREM.Utils.pga(
          this.magnitude,
          d,
          setting["earthquake.siteEffect"] ? l.siteEffect : undefined,
        );
        const i = TREM.Utils.PGAToIntensity(pga);

        if (setting["location.city"] == city && setting["location.town"] == town)
          this._local = l;

        this._expected.set(l.code, { distance: d, intensity: i, pga });
      }
  }

  #epicenterIcon() {
    if (this.epicenter.icon) {
      this.epicenterIcon.main.setLatLng([this.epicenter.latitude, this.epicenter.longitude]);
      this.epicenterIcon.mini.setLatLng([this.epicenter.latitude, this.epicenter.longitude]);
    } else {
      this.epicenterIcon.main = L.marker([this.epicenter.latitude, this.epicenter.longitude], {
        icon: L.icon({
          iconUrl   : "../image/cross.png",
          iconSize  : [30, 30],
          className : "epicenterIcon",
        })
      }).addTo(Maps.main);
      this.epicenterIcon.mini = L.marker([this.epicenter.latitude, this.epicenter.longitude], {
        icon: L.icon({
          iconUrl   : "../image/cross.png",
          iconSize  : [30, 30],
          className : "epicenterIcon",
        })
      }).addTo(Maps.mini);
    }
  }

  update(data) {
    this.#fromJson(data);
  }
}

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

  TREM.MapRenderingEngine = setting["map.engine"];

  // checks internet connectivity
  if (!window.navigator.onLine)
    return showDialog(
      "error",
      TREM.Localization.getString("Initialization_No_Connection_Title"),
      TREM.Localization.getString("Initialization_No_Connection_Description"),
      0, "wifi_off", () => {
        ipcRenderer.send("restart");
      },
    );

  // Connect to server
  await (async () => {
    $("#loading").text(TREM.Localization.getString("Application_Connecting"));
    dump({ level: 0, message: "Trying to connect to the server...", origin: "ResourceLoader" });
    await ReportGET({});
    progressbar.value = (1 / progressStep) * 1;
  })().catch(e => dump({ level: 2, message: e }));

  // Timers
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
          time.innerText = `${new Date(replay + (NOW().getTime() - replayT)).format("YYYY/MM/DD HH:mm:ss")}`;

          if (NOW().getTime() - replayT > 180_000) {
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
          time.innerText = `${NOW().format("YYYY/MM/DD HH:mm:ss")}`;
        }

        let GetDataState = "";

        if (GetData_WS) {
          GetData_WS = false;
          GetDataState += "🟩";
        }

        if (GetData_FCM) {
          GetData_FCM = false;
          GetDataState += "⬜";
        }

        if (GetData_P2P) {
          GetData_P2P = false;
          GetDataState += "🟨";
        }

        if (GetData_HTTP) {
          GetData_HTTP = false;
          GetDataState += "🟥";
        }

        if (GetData_time) {
          GetData_time = false;
          GetDataState += "⏰";
        }

        $("#app-version").text(`${app.getVersion()} ${Ping} ${GetDataState} ${Warn}`);
      }, 500);

    if (!Timers.tsunami)
      Timers.tsunami = setInterval(() => {
        if (investigation) {
          if (NOW().getTime() - Report > 600_000) {
            investigation = false;
            roll.removeChild(roll.children[0]);

            if (MainMap.intensity.isTriggered)
              MainMap.intensity.clear();
          }
        } else
        if (Date.now() - report_get_timestamp > 600_000) {
          ReportGET();
        }

        if (ReportTag != 0 && NOW().getTime() - ReportTag > 30_000) {
          ReportTag = 0;
          TREM.Report.setView("report-list");
          changeView("main");
        }
      }, 1_000);

    progressbar.value = (1 / progressStep) * 2;
  })();

  // Audios
  (() => {
    const gainNode = TREM.AudioContext.createGain();

    for (const key in TREM.Audios) {
      const audioSource = TREM.AudioContext.createMediaElementSource(TREM.Audios[key]);
      audioSource.connect(gainNode).connect(TREM.AudioContext.destination);
    }

    progressbar.value = (1 / progressStep) * 3;
  })();

  // Colors and Map
  await (async () => {
    TREM.Colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);

    dump({ level: 0, message: "Loading Map Data...", origin: "ResourceLoader" });
    dump({ level: 3, message: "Starting timer...", origin: "Timer" });
    let perf_GEOJSON_LOAD = process.hrtime();
    fs.readdirSync(path.join(__dirname, "../Resources/GeoJSON")).forEach((file, i, arr) => {
      try {
        MapData[path.parse(file).name] = require(path.join(__dirname, "../Resources/GeoJSON", file));
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

    // #region Maps

    dump({ level: 3, message: "Initializing map", origin: "Map" });

    // MainMap
    Maps.main = L.map("map", {
      edgeBufferTiles    : 1,
      attributionControl : false,
      closePopupOnClick  : false,
      maxBounds          : [[60, 50], [10, 180]],
      preferCanvas       : true,
      zoomSnap           : 0.25,
      zoomDelta          : 0.5,
      zoomAnimation      : true,
      fadeAnimation      : setting["map.animation"],
      doubleClickZoom    : false,
      zoomControl        : false,
    })
      .setView([23.630405850000496, 120.90373206379121], 7.75)
      .on("click", () => {
        TREM.Earthquake.emit("focus", {
          bounds  : [[21.77, 118.25], [25.47, 122.18]],
          options : {
            paddingBottomRight: [ document.getElementById("map").offsetWidth / 6, 0],
          },
        });
      })
      .on("contextmenu", () => {
        TREM.Earthquake.emit("focus", { center: pointFormatter(23.608428, 120.799168, TREM.MapRenderingEngine), zoom: 7.75 });
      })
      .on("zoomend", () => {
        if (Maps.main.getZoom() >= 11)
          for (const key in stations) {
            const tooltip = stations[key].getTooltip();

            if (tooltip) {
              stations[key].unbindTooltip();
              tooltip.options.permanent = true;
              stations[key].bindTooltip(tooltip);
            }
          }
        else
          for (const key in stations) {
            const tooltip = stations[key].getTooltip();

            if (tooltip && !stations[key].keepTooltipAlive) {
              stations[key].unbindTooltip();
              tooltip.options.permanent = false;
              stations[key].bindTooltip(tooltip);
            }
          }
      });
    // Maps.main._zoomAnimated = setting["map.animation"];

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

    if (!Maps.report)
      if (TREM.MapRenderingEngine == "mapbox-gl") {
        Maps.report = new maplibregl.Map(
          {
            container          : "map-report",
            maxPitch           : 0,
            maxBounds          : [100, 10, 130, 30,],
            maxZoom            : 10,
            minZoom            : 6,
            zoom               : 6.8,
            center             : [121.596, 23.612],
            renderWorldCopies  : false,
            attributionControl : false,
            doubleClickZoom    : false,
            keyboard           : false,
          })
          .on("click", () => TREM.Report._focusMap());
      } else if (TREM.MapRenderingEngine == "leaflet") {
        Maps.report = L.map("map-report",
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
            paddingTopLeft: [document.getElementById("map-report").offsetWidth / 2, 0],
          })
          .on("click", () => TREM.Report._focusMap());
        Maps.report._zoomAnimated = setting["map.animation"];
      }

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
        .on("click", () => TREM.Report._focusMap());
      Maps.intensity._zoomAnimated = setting["map.animation"];
    }

    const resizeHandler = (ev) => {
      if (ev && ev.propertyName != "margin-top") return;

      Maps.main.resize();

      const camera = Maps.main.cameraForBounds(new maplibregl.LngLatBounds([ 118.25, 21.77 ], [ 122.18, 25.47 ]));
      Maps.main.easeTo({
        center   : camera.center,
        zoom     : camera.zoom,
        padding  : { top: 0, right: Maps.report.getCanvas().width / 6, bottom: 0, left: 0 },
        speed    : 2,
        curve    : 1,
        easing   : (e) => Math.sin(e * Math.PI / 2),
        duration : 1000,
      });

      Maps.report.resize();
      TREM.Report._focusMap();
    };

    document.getElementById("view").addEventListener("transitionend", resizeHandler);
    window.addEventListener("resize", () => {
      if (Timers.resize) Timers.resize.refresh();
      else Timers.resize = setTimeout(resizeHandler, 100);
    });

    // #endregion

    for (const mapName of ["cn", "jp", "sk", "nk"]) {
      MapBases.main.set(mapName, L.geoJson.vt(MapData[mapName], {
        edgeBufferTiles : 2,
        minZoom         : 4,
        maxZoom         : 12,
        tolerance       : 25,
        buffer          : 256,
        debug           : 0,
        style           : {
          weight      : 0.8,
          color       : TREM.Colors.secondary,
          fillColor   : TREM.Colors.surfaceVariant,
          fillOpacity : 1,
        },
      }));

      if (setting[`map.${mapName}`])
        MapBases.main.get(mapName).addTo(Maps.main);
    }

    MapBases.main.set("tw_county", L.geoJson.vt(MapData.tw_county, {
      edgeBufferTiles : 2,
      minZoom         : 4,
      maxZoom         : 12,
      tolerance       : 25,
      buffer          : 256,
      debug           : 0,
      style           : {
        color       : TREM.Colors.primary,
        weight      : 1,
        fillColor   : TREM.Colors.surfaceVariant,
        fillOpacity : 1,
      },
    }).addTo(Maps.main));
    MapBases.main.set("area", L.geoJson.vt(MapData.area, {
      edgeBufferTiles : 2,
      minZoom         : 4,
      maxZoom         : 12,
      tolerance       : 20,
      buffer          : 256,
      debug           : 0,
      style           : {
        color     : "transparent",
        weight    : 3,
        opacity   : 0,
        fillColor : "transparent",
      },
    }).addTo(Maps.main));

    if (!MapBases.mini.length)
      MapBases.mini.set("tw_county",
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
        }).addTo(Maps.mini));

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

    setUserLocationMarker(setting["location.town"]);
    progressbar.value = (1 / progressStep) * 4;
  })().catch(e => dump({ level: 2, message: e }));

  // Files
  await (async () => {
    await fetchFiles();

    if (!Timers.fetchFiles)
      Timers.fetchFiles = setInterval(fetchFiles, 10 * 60 * 1000);
    progressbar.value = 1;
  })().catch(e => dump({ level: 2, message: e }));

  $("#loading").text(TREM.Localization.getString("Application_Welcome"));
  $("#load").delay(1000).fadeOut(1000);
  setInterval(() => {
    if (mapLock || !setting["map.autoZoom"]) return;

    if (Object.keys(eew).length != 0) {
      const finalBounds = new maplibregl.LngLatBounds();
      let finalZoom = 0;
      let sampleCount = 0;

      for (let index = 0; index < Object.keys(eew).length; index++)
        if (eewt.id == 0 || eewt.id == eew[Object.keys(eew)[index]].id || NOW().getTime() - eew[Object.keys(eew)[index]].time >= 10000) {
          eewt.id = eew[Object.keys(eew)[index]].id;
          const km = (NOW().getTime() - eew[Object.keys(eew)[index]].Time) * 4;

          if (km > 300000)
            finalZoom += 6;

          else if (km > 250000)
            finalZoom += 6.5;

          else if (km > 200000)
            finalZoom += 6.75;

          else if (km > 150000)
            finalZoom += 7;

          else if (km > 100000)
            finalZoom += 7.5;

          else
            finalZoom += 8;

          sampleCount++;

          finalBounds.extend([eew[Object.keys(eew)[index]].lon, eew[Object.keys(eew)[index]].lat]);

          /*
					const num = Math.sqrt(Math.pow(23.608428 - EEW[Object.keys(EEW)[index]].lat, 2) + Math.pow(120.799168 - EEW[Object.keys(EEW)[index]].lon, 2));

					if (num >= 5)
						TREM.Earthquake.emit("focus", { center: pointFormatter(EEW[Object.keys(EEW)[index]].lat, EEW[Object.keys(EEW)[index]].lon, TREM.MapRenderingEngine), zoom: Zoom });
					else
						TREM.Earthquake.emit("focus", { center: pointFormatter((23.608428 + EEW[Object.keys(EEW)[index]].lat) / 2, ((120.799168 + EEW[Object.keys(EEW)[index]].lon) / 2) + X, TREM.MapRenderingEngine), zoom: Zoom });
					*/
          eew[Object.keys(eew)[index]].time = NOW().getTime();
        }

      finalZoom = finalZoom / sampleCount;

      if (finalZoom != Maps.main.getZoom() && !Maps.main.isEasing()) {
        const camera = Maps.main.cameraForBounds(finalBounds, { padding: { top: 0, right: 100, bottom: 100, left: 0 } });
        TREM.Earthquake.emit("focus", { center: camera.center, zoom: finalZoom }, true);
      }
    } else if (MainMap.area.cache.size) {
      map_move_back = true;
      const bounds = (TREM.MapRenderingEngine == "mapbox-gl") ? new maplibregl.LngLatBounds() : new L.Bounds();

      for (const [ id ] of MainMap.area.cache) {
        const points = TREM.Resources.area[id].map(latlng => pointFormatter(latlng[0], latlng[1], TREM.MapRenderingEngine));
        bounds.extend([points[0], points[2]]);
      }

      const canvas = Maps.main.getCanvas();

      const camera = Maps.main.cameraForBounds(bounds, {
        padding: {
          bottom : canvas.height / 8,
          left   : canvas.width / 12,
          top    : canvas.height / 8,
          right  : canvas.width / 5,
        },
        maxZoom: 8.5,
      });

      if (camera.zoom != Maps.main.getZoom() && !Maps.main.isEasing())
        TREM.Earthquake.emit("focus", camera, true);
    } else if (map_move_back) {
      map_move_back = false;
      Mapsmainfocus();
    }
  }, 500);
  global.gc();
}
// #endregion

function PGAMain() {
  dump({ level: 0, message: "Starting PGA timer", origin: "PGATimer" });

  if (Timers.rts) clearInterval(Timers.rts);
  Timers.rts = setInterval(() => {
    setTimeout(async () => {
      try {
        const _t = Date.now();
        const ReplayTime = (replay == 0) ? 0 : replay + (NOW().getTime() - replayT);

        if (ReplayTime == 0) {
          if (rts_ws_timestamp) {
            Ping = "Super";
            Response = rts_response;
          } else {
            for (const removedKey of Object.keys(stations)) {
              stations[removedKey].remove();
              delete stations[removedKey];
            }

            Ping = "🔒";
            Response = {};
          }
        } else {
          const url = `https://exptech.com.tw/api/v1/trem/rts?time=${ReplayTime}&key=${setting["api.key"]}`;
          const controller = new AbortController();
          setTimeout(() => {
            controller.abort();
          }, 5000);
          let ans = await fetch(url, { signal: controller.signal }).catch((err) => void 0);

          if (controller.signal.aborted || ans == undefined) {
            void 0;
          } else {
            ans = await ans.json();
            Ping = Date.now() - _t + "ms";
            Response = ans;
          }
        }

        handler(Response);
      } catch (err) {
        void 0;
      }
    }, (NOW().getMilliseconds() > 500) ? 1000 - NOW().getMilliseconds() : 500 - NOW().getMilliseconds());
  }, 500);
}

function handler(Json) {
  MAXPGA = { pga: 0, station: "NA", level: 0 };

  const removed = Object.keys(Json).filter(k => !stations.has(k));

  for (const removedKey of removed)
    if (stations.has(removedKey)) {
      stations.get(removedKey).remove();
      stations.delete(removedKey);
    }

  try {
    for (let index = 0, keys = Object.keys(station_list), n = keys.length; index < n; index++) {
      const uuid = keys[index];
      const current_station_data = station_list[uuid];
      const current_data = Json[uuid];

      let level_class = "";
      let popup_content = "";
      let amount = 0;
      let intensity = 0;
      const Alert = current_data?.alert ?? false;

      // debugger;

      if (current_data == undefined) {
        level_class = "na";
        popup_content = "無資料";
      } else {
        amount = +current_data.PGA;
        intensity
        = (Alert && Json.Alert) ? current_data.I
            : (NOW().getTime() - current_data.TS * 1000 > 5000) ? "NA"
              : (!Alert) ? 0
                : (amount >= 800) ? 9
                  : (amount >= 440) ? 8
                    : (amount >= 250) ? 7
                      : (amount >= 140) ? 6
                        : (amount >= 80) ? 5
                          : (amount >= 25) ? 4
                            : (amount >= 8) ? 3
                              : (amount >= 5) ? 2
                                : (amount >= 2.2) ? 1
                                  : 0;
        level_class = (intensity != 0 && amount < 999) ? IntensityToClassString(intensity)
          : (amount == 999) ? "pga6"
            : (amount > 3.5) ? "pga5"
              : (amount > 3) ? "pga4"
                : (amount > 2.5) ? "pga3"
                  : (amount > 2) ? "pga2"
                    : "pga1";
        popup_content = `<div class="marker-popup rt-station-popup rt-station-detail-container"><span class="rt-station-name">${station_list[keys[index]].Loc}</span><span class="rt-station-pga">${amount}</span><span class="rt-station-int">${IntensityI(intensity)}</span></div>`;
      }

      if (stations.has(uuid)) {
        const station_marker = stations.get(uuid);

        if (station_marker.getElement().className != `map-intensity-icon rt-icon ${level_class}`) {
          station_marker.setIcon(L.divIcon({
            className : `map-intensity-icon rt-icon ${level_class}`,
            iconSize  : intensity > 0 ? [16, 16] : [8, 8]
          }));
          station_marker.setZIndexOffset(50 + (amount < 999 ? amount : 0) * 10);
        }
      } else {
        const station_marker = L.marker(
          [ current_station_data.Lat, current_station_data.Long ],
          {
            icon: L.divIcon(
              {
                className : `map-intensity-icon rt-icon ${level_class}`,
                iconSize  : intensity > 0 ? [16, 16] : [8, 8]
              }
            ),
            zIndexOffset : 50 + (amount < 999 ? amount : 0) * 10,
            riseOnHover  : true,
            title        : `${current_station_data.Loc} (${uuid})`
          }
        ).addTo(Maps.main);

        stations.set(uuid, station_marker);
      }

      // Top-left station overlay
      if (Object.keys(Json).includes(setting["Real-time.station"])) {
        if (uuid == setting["Real-time.station"]) {
          document.getElementById("rt-station-local-intensity").className = `rt-station-intensity ${(amount < 999 && intensity != "NA") ? IntensityToClassString(intensity) : "na"}`;
          document.getElementById("rt-station-local-name").innerText = station_list[keys[index]].Loc;
          document.getElementById("rt-station-local-time").innerText = new Date(current_data.T * 1000).format("HH:mm:ss");
          document.getElementById("rt-station-local-pga").innerText = amount;
        }
      } else {
      // FIXME: Performance: This block will be executed repeatly when the station the user selected is not in the current_station list.
        document.getElementById("rt-station-local-intensity").className = "rt-station-intensity na";
        document.getElementById("rt-station-local-name").innerText = TREM.Localization.getString("Realtime_No_Data");
        document.getElementById("rt-station-local-time").innerText = "--:--:--";
        document.getElementById("rt-station-local-pga").innerText = "--";
      }

      // box
      if (current_data) {
        const Level = IntensityI(intensity);
        const now = new Date(current_data.T * 1000);

        if (intensity != "NA" && (intensity > 0 || Alert) && amount < 999) {
          detected_list[station_list[uuid].PGA] ??= {
            intensity : intensity,
            time      : 0,
          };

          if ((detected_list[station_list[uuid].PGA].intensity ?? 0) < intensity)
            detected_list[station_list[uuid].PGA].intensity = intensity;

          if (Alert && Json.Alert) {
            if (setting["audio.realtime"])
              if (amount > 8 && PGALimit == 0) {
                PGALimit = 1;
                TREM.Audios.pga1.play();
              } else if (amount > 250 && PGALimit > 1) {
                PGALimit = 2;
                TREM.Audios.pga2.play();
              }

            detected_list[station_list[uuid].PGA].time = NOW().getTime();
          }
        }

        if (MAXPGA.pga < amount && amount < 999 && Level != "NA") {
          MAXPGA.pga = amount;
          MAXPGA.station = uuid;
          MAXPGA.level = Level;
          MAXPGA.lat = station_list[uuid].Lat;
          MAXPGA.long = station_list[uuid].Long;
          MAXPGA.loc = station_list[uuid].Loc;
          MAXPGA.intensity = intensity;
          MAXPGA.time = new Date(current_data.T * 1000);
        }

      }
    }
  } catch (error) {
    console.error(error);
  }

  /*
  for (let index = 0, keys = Object.keys(Json), n = keys.length; index < n; index++) {
    if (station_list[keys[index]] == undefined) continue;
    const stationData = Json[keys[index]];
    const amount = Number(stationData.PGA);
    const Alert = stationData.alert;
    const intensity
      = (Alert && Json.Alert) ? stationData.I
        : (NOW().getTime() - stationData.TS * 1000 > 5000) ? "NA"
          : (!Alert) ? 0
            : (amount >= 800) ? 9
              : (amount >= 440) ? 8
                : (amount >= 250) ? 7
                  : (amount >= 140) ? 6
                    : (amount >= 80) ? 5
                      : (amount >= 25) ? 4
                        : (amount >= 8) ? 3
                          : (amount >= 5) ? 2
                            : (amount >= 2.2) ? 1
                              : 0;
    const levelClass = (intensity != 0 && amount < 999) ? IntensityToClassString(intensity)
      : (amount == 999) ? "pga6"
        : (amount > 3.5) ? "pga5"
          : (amount > 3) ? "pga4"
            : (amount > 2.5) ? "pga3"
              : (amount > 2) ? "pga2"
                : "pga1";
    const station_tooltip = `<div class="marker-popup rt-station-popup rt-station-detail-container"><span class="rt-station-name">${station_list[keys[index]].Loc}</span><span class="rt-station-pga">${amount}</span><span class="rt-station-int">${IntensityI(intensity)}</span></div>`;

    if (!stations[keys[index]] && (!rts_remove_eew || Alert)) {
      stations[keys[index]] = L.marker(
        [station_list[keys[index]].Lat, station_list[keys[index]].Long], {
          icon: L.divIcon({
            html: `<div class="map-intensity-icon rt-icon ${levelClass}" style="z-index: ${50 + (amount < 999 ? amount : 0) * 10};"></div>`
          }),
          riseOnHover: true
        })
        .setPopupContent(L.popup({ content: station_tooltip }))
        .addTo(Maps.main);
      stations[keys[index]].getElement().addEventListener("click", () => stations[keys[index]].getPopup().persist = !stations[keys[index]].getPopup().persist);
    }

    if (stations[keys[index]]) {
      stations[keys[index]].getPopup().setHTML(station_tooltip);

      if (stations[keys[index]].getElement().className != `map-intensity-icon rt-icon ${levelClass}`)
        stations[keys[index]].getElement().className = `map-intensity-icon rt-icon ${levelClass}`;
      stations[keys[index]].getElement().style.zIndex = 50 + (amount < 999 ? amount : 0) * 10;
    }

    if (stations[keys[index]] && rts_remove_eew && !Alert) {
      stations[keys[index]].remove();
      delete stations[keys[index]];
    }

    const Level = IntensityI(intensity);
    const now = new Date(stationData.T * 1000);

    if (keys.includes(setting["Real-time.station"])) {
      if (keys[index] == setting["Real-time.station"]) {
        document.getElementById("rt-station-local-intensity").className = `rt-station-intensity ${(amount < 999 && intensity != "NA") ? IntensityToClassString(intensity) : "na"}`;
        document.getElementById("rt-station-local-name").innerText = station_list[keys[index]].Loc;
        document.getElementById("rt-station-local-time").innerText = now.format("HH:mm:ss");
        document.getElementById("rt-station-local-pga").innerText = amount;
      }
    } else {
      document.getElementById("rt-station-local-intensity").className = "rt-station-intensity na";
      document.getElementById("rt-station-local-name").innerText = TREM.Localization.getString("Realtime_No_Data");
      document.getElementById("rt-station-local-time").innerText = "--:--:--";
      document.getElementById("rt-station-local-pga").innerText = "--";
    }

    if (intensity != "NA" && (intensity > 0 || Alert) && amount < 999) {
      detected_list[station_list[keys[index]].PGA] ??= {
        intensity : intensity,
        time      : 0,
      };

      if ((detected_list[station_list[keys[index]].PGA].intensity ?? 0) < intensity)
        detected_list[station_list[keys[index]].PGA].intensity = intensity;

      if (Alert && Json.Alert) {
        if (setting["audio.realtime"])
          if (amount > 8 && PGALimit == 0) {
            PGALimit = 1;
            TREM.Audios.pga1.play();
          } else if (amount > 250 && PGALimit > 1) {
            PGALimit = 2;
            TREM.Audios.pga2.play();
          }

        detected_list[station_list[keys[index]].PGA].time = NOW().getTime();
      }
    }

    if (MAXPGA.pga < amount && amount < 999 && Level != "NA") {
      MAXPGA.pga = amount;
      MAXPGA.station = keys[index];
      MAXPGA.level = Level;
      MAXPGA.lat = station_list[keys[index]].Lat;
      MAXPGA.long = station_list[keys[index]].Long;
      MAXPGA.loc = station_list[keys[index]].Loc;
      MAXPGA.intensity = intensity;
      MAXPGA.time = new Date(stationData.T * 1000);
    }
  }
  */

  if (MAXPGA.station != "NA") {
    document.getElementById("rt-station-max-intensity").className = `rt-station-intensity ${(MAXPGA.pga < 999) ? IntensityToClassString(MAXPGA.intensity) : "na"}`;
    document.getElementById("rt-station-max-name").innerText = MAXPGA.loc;
    document.getElementById("rt-station-max-time").innerText = MAXPGA.time.format("HH:mm:ss");
    document.getElementById("rt-station-max-pga").innerText = MAXPGA.pga;
  } else {
    document.getElementById("rt-station-max-intensity").className = "rt-station-intensity na";
    document.getElementById("rt-station-max-name").innerText = TREM.Localization.getString("Realtime_No_Data");
    document.getElementById("rt-station-max-time").innerText = "--:--:--";
    document.getElementById("rt-station-max-pga").innerText = "--";
    document.getElementById("rt-station-local-intensity").className = "rt-station-intensity na";
    document.getElementById("rt-station-local-name").innerText = TREM.Localization.getString("Realtime_No_Data");
    document.getElementById("rt-station-local-time").innerText = "--:--:--";
    document.getElementById("rt-station-local-pga").innerText = "--";
  }

  if (Object.keys(detected_list).length)
    for (let index = 0, pgaKeys = Object.keys(detected_list); index < pgaKeys.length; index++) {
      const Intensity = detected_list[pgaKeys[index]]?.intensity;

      if (Intensity == undefined) {
        delete detected_list[pgaKeys[index]];
        continue;
      }

      if (NOW().getTime() - detected_list[pgaKeys[index]].time > 30_000 || PGACancel) {
        MainMap.area.clear(pgaKeys[index]);
        delete detected_list[pgaKeys[index]];
        delete pgaKeys[index];
        index--;
      } else if (!detected_list[pgaKeys[index]].passed) {
        let passed = false;

        if (Object.keys(eew).length)
          for (let Index = 0; Index < Object.keys(eew).length; Index++) {
            let SKIP = 0;

            for (let i = 0; i < 4; i++) {
              const dis = Math.sqrt(Math.pow((TREM.Resources.area[pgaKeys[index].toString()][i][0] - eew[Object.keys(eew)[Index]].lat) * 111, 2) + Math.pow((TREM.Resources.area[pgaKeys[index].toString()][i][1] - eew[Object.keys(eew)[Index]].lon) * 101, 2));

              if (eew[Object.keys(eew)[Index]].km / 1000 > dis) SKIP++;
            }

            if (SKIP >= 4) {
              passed = true;
              break;
            }
          }

        if (passed) {
          detected_list[pgaKeys[index]].passed = true;
          MainMap.area.clear(pgaKeys[index]);
        } else {
          MainMap.area.setArea(pgaKeys[index], Intensity);
        }
      }
    }

  else if (MainMap.area.isVisible)
    MainMap.area.clear();

  const All = (Json.Alert) ? Json.I : [];
  const list = [];

  if (!All.length) {
    PGAtag = -1;
    PGALimit = 0;
    PGACancel = false;
  } else {
    for (let index = 0; index < All.length; index++) {
      if (station_list[All[index].uuid] == undefined) continue;
      All[index].loc = station_list[All[index].uuid].Loc;
    }

    if (All[0].intensity > PGAtag) {
      if (setting["audio.realtime"])
        if (All[0].intensity >= 5 && PGAtag < 5)
          TREM.Audios.int2.play();
        else if (All[0].intensity >= 2 && PGAtag < 2)
          TREM.Audios.int1.play();
        else if (PGAtag == -1)
          TREM.Audios.int0.play();
      setTimeout(() => {
        ipcRenderer.send("screenshotEEW", {
          Function : "station",
          ID       : 1,
          Version  : 1,
          Time     : NOW().getTime(),
          Shot     : 1,
        });
      }, 1250);
      changeView("main", "#mainView_btn");

      if (setting["Real-time.show"]) win.showInactive();

      if (setting["Real-time.cover"])
        if (!win.isFullScreen()) {
          win.setAlwaysOnTop(true);
          win.focus();
          win.setAlwaysOnTop(false);
        }

      if (!win.isFocused()) win.flashFrame(true);
      PGAtag = All[0].intensity;
    }

    let count = 0;

    if (All.length <= 8) {
      for (let Index = 0; Index < All.length; Index++, count++) {
        if (All[Index].loc == undefined) continue;

        if (count >= 8) break;
        const container = document.createElement("DIV");
        container.className = IntensityToClassString(All[Index].intensity);
        const location = document.createElement("span");
        location.innerText = `${All[Index].loc}\n${All[Index].pga} gal`;
        container.appendChild(document.createElement("span"));
        container.appendChild(location);
        list.push(container);
      }
    } else {
      const Idata = {};

      for (let Index = 0; Index < All.length; Index++, count++) {
        if (All[Index].loc == undefined) continue;

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
  }

  document.getElementById("rt-list").replaceChildren(...list);
}

async function fetchFiles() {
  Location = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
  dump({ level: 0, message: "Get Location File", origin: "Location" });
  station_list = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
  dump({ level: 0, message: "Get Station File", origin: "Location" });
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

  if (!marker)
    marker = L.marker([UserLocationLat, UserLocationLon], {
      icon: L.divIcon({ html: "<img id=\"here-marker\" src=\"../image/here.png\" height=\"20\" width=\"20\" style=\"z-index: 5000;\"></img>" }) })
      .addTo(Maps.main);
  else
    marker.setLatLng([UserLocationLat, UserLocationLon]);
}
// #endregion

// #region 聚焦
TREM.Earthquake.on("focus", ({ bounds, center, zoom, options = {} } = {}, jump = false) => {
  if (bounds)
    Maps.main.fitBounds(bounds, {
      ...options,
      animate: !jump,
    });
  else if (center)
    if (jump)
      if (zoom)
        Maps.main.jumpTo({ center, zoom });
      else
        Maps.main.jumpTo({ center });
    else if (zoom)
      Maps.main.easeTo({
        center,
        zoom,
        ...options,
      });
    else
      Maps.main.easeTo({
        center,
        ...options,
      });
});

function Mapsmainfocus() {

  const camera = Maps.main.cameraForBounds(new maplibregl.LngLatBounds([ 118.25, 21.77 ], [ 122.18, 25.47 ]));
  TREM.Earthquake.emit("focus", {
    ...camera,
    options: {
      padding  : { top: 0, right: Maps.main.getCanvas().width / 6, bottom: 0, left: 0 },
      speed    : 2,
      curve    : 1,
      easing   : (e) => Math.sin(e * Math.PI / 2),
      duration : 1000,
    },
  });
}

// #endregion

// #region 音頻播放
let AudioT;
let AudioT1;
const audioDOM = new Audio();
const audioDOM1 = new Audio();
audioDOM.addEventListener("ended", () => {
  audio.main_lock = false;
});
audioDOM1.addEventListener("ended", () => {
  audio.minor_lock = false;
});

function audioPlay(src) {
  audio.main.push(src);

  if (!AudioT)
    AudioT = setInterval(() => {
      if (!audio.main_lock) {
        audio.main_lock = true;

        if (audio.main.length) {
          playNextAudio();
        } else {
          clearInterval(AudioT);
          audio.main_lock = false;
          AudioT = null;
        }
      }
    }, 0);
}

function audioPlay1(src) {
  audio.minor.push(src);

  if (!AudioT1)
    AudioT1 = setInterval(() => {
      if (!audio.minor_lock) {
        audio.minor_lock = true;

        if (audio.minor.length) {
          playNextAudio1();
        } else {
          clearInterval(AudioT1);
          audio.minor_lock = false;
          AudioT1 = null;
        }
      }
    }, 0);
}

function playNextAudio() {
  audio.main_lock = true;
  const nextAudioPath = audio.main.shift();
  audioDOM.src = nextAudioPath;

  if (nextAudioPath.startsWith("../audio/1/") && setting["audio.eew"]) {
    dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
    audioDOM.play();
  } else if (!nextAudioPath.startsWith("../audio/1/")) {
    dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
    audioDOM.play();
  }
}

function playNextAudio1() {
  audio.minor_lock = true;
  const nextAudioPath = audio.minor.shift();
  audioDOM1.src = nextAudioPath;
  audioDOM1.playbackRate = 1.1;

  if (nextAudioPath.startsWith("../audio/1/") && setting["audio.eew"]) {
    dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
    audioDOM1.play();
  } else if (!nextAudioPath.startsWith("../audio/1/")) {
    dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
    audioDOM1.play();
  }
}
// #endregion

// #region Report Data
async function ReportGET(palert) {
  try {
    const res = await getReportData();
    report_get_timestamp = Date.now();

    if (!res) return setTimeout(ReportGET, 1000, palert);
    dump({ level: 0, message: "Reports fetched", origin: "EQReportFetcher" });
    ReportList(res, palert);
  } catch (error) {
    dump({ level: 2, message: "Error fetching reports", origin: "EQReportFetcher" });
    dump({ level: 2, message: error, origin: "EQReportFetcher" });
    return setTimeout(ReportGET, 5000, palert);
  }
}

async function getReportData() {
  try {
    const list = await Exptech.v1.earthquake.getReports(+setting["cache.report"]);
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
function ReportList(earthquakeReportArr, palert) {
  roll.replaceChildren();

  for (let index = 0; index < earthquakeReportArr.length; index++) {
    if (palert != undefined && index == earthquakeReportArr.length - 1) {
      earthquakeReportArr[index].Max = palert.Max;
      earthquakeReportArr[index].Time = palert.Time;
    }

    addReport(earthquakeReportArr[index]);
  }

  setLocale(setting["general.locale"]);
}

function addReport(report, prepend = false) {
  if (replay != 0 && new Date(report.originTime).getTime() > new Date(replay + (NOW().getTime() - replayT)).getTime()) return;

  const Level = IntensityI(report.data[0]?.areaIntensity);
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

    const report_PAlert = document.createElement("span");
    report_PAlert.className = "report-PAlert";
    report_PAlert.innerText = "來源 P-Alert";
    const report_location = document.createElement("span");
    report_location.className = "report-location";
    report_location.innerText = "震源 調查中";
    const report_time = document.createElement("span");
    report_time.className = "report-time";
    report_time.innerText = report.Time.replace(/-/g, "/");
    report_detail_container.append(report_PAlert, report_location, report_time);

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
    report_intensity_value.innerText = (Level == 0) ? "?" : Level;
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
    Div.className += IntensityToClassString(report.data[0]?.areaIntensity);
    Div.addEventListener("click", (event) => {
      TREM.Report.setView("report-overview", report.identifier);
      changeView("report", "#reportView_btn");
    });

    if (prepend) {
      const locating = document.querySelector(".report-detail-container.locating");

      if (locating) {
        locating.replaceWith(Div.children[0]);
      } else {
        if (investigation) {
          investigation = false;
          roll.removeChild(roll.children[0]);
        }

        roll.prepend(Div);
      }

      TREM.Report.cache.set(report.identifier, report);

      if (setting["report.changeView"]) {
        TREM.Report.setView("report-overview", report.identifier);
        changeView("report", "#reportView_btn");
        ReportTag = NOW().getTime();
      }
    } else {
      roll.append(Div);
    }
  }
}

// #endregion

// #region 設定
function openSettingWindow() {
  win.setAlwaysOnTop(false);
  ipcRenderer.send("openChildWindow");
}
// #endregion

// #region Number >> Intensity
function IntensityI(Intensity) {
  return Intensity == 5 ? "5-"
    : Intensity == 6 ? "5+"
      : Intensity == 7 ? "6-"
        : Intensity == 8 ? "6+"
          : Intensity == 9 ? "7"
            : Intensity ?? "?";
}
// #endregion

// #region Intensity >> Number
function IntensityN(level) {
  return level == "5-" ? 5
    : level == "5+" ? 6
      : level == "6-" ? 7
        : level == "6+" ? 8
          : level == "7" ? 9
            : Number(level);
}
// #endregion

// #region Intensity >> Class String
function IntensityToClassString(level) {
  let classname = (level == 9) ? "seven"
    : (level == 8) ? "six strong"
      : (level == 7) ? "six"
        : (level == 6) ? "five strong"
          : (level == 5) ? "five"
            : (level == 4) ? "four"
              : (level == 3) ? "three"
                : (level == 2) ? "two"
                  : (level == 1) ? "one"
                    : "zero";

  if (tinycolor(setting["theme.customColor"] ? setting[`theme.int.${level}`] : [
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
  ][level]).getLuminance() > 0.575)
    classname += " darkText";

  return classname;
}
// #endregion

// #region color
function color(Intensity) {
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
}
// #endregion

// #region IPC
ipcMain.once("start", () => {
  try {
    if (localStorage.TOS_v1 == undefined) {
      localStorage.TOS_v1 = true;
      showDialog("warn", "使用條款 1.0", "• 使用本服務應視為用戶同意使用條款\n• TREM 是一款提供 地震檢知、地震預警、海嘯警報、震度速報、地震報告 的軟體\n• 禁止在未經允許的情況下二次分發 TREM 軟體內的任何資訊\n• 禁止違反 法律、公共秩序 或 道德 的行為\n• 禁止任何 開發團隊 合理認為不適當的行為\n• 如違反上述規定，則服務可能會暫停或終止");
    }

    setInterval(() => {
      if (DATAstamp != 0 && Stamp != DATAstamp) {
        Stamp = DATAstamp;
        FCMdata(DATA, DATA_Unit);
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

  if (Object.keys(detected_list).length != 0) PGACancel = true;

  if (replay != 0) {
    replay = 0;
    ReportGET();
  }

  Exptech.v1
    .post("/trem/stop", { uuid: localStorage.UUID })
    .catch((error) => dump({ level: 2, message: error, origin: "Verbose" }));

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
          uuid : localStorage.UUID,
          id   : list[index],
        };
        dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
        Exptech.v1.post("/trem/replay", data)
          .catch((error) => {
            dump({ level: 2, message: error, origin: "Verbose" });
          });
      }, 100);
    delete localStorage.TestID;
  } else {
    dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
    const data = {
      uuid: localStorage.UUID,
    };
    dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
    Exptech.v1.post("/trem/replay", data)
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
    for (const [key, layer] of MapBases[mapName])
      if (Maps[mapName] instanceof maplibregl.Map)
        if (layer.type == "fill" && key != "tw_county_fill") {
          Maps[mapName].setPaintProperty(layer.id, "fill-color", TREM.Colors.surfaceVariant);
          Maps[mapName].setPaintProperty(layer.id, "fill-outline-color", TREM.Colors.secondary);
        } else if (layer.type == "fill" && key == "tw_county_fill") {
          Maps[mapName].setPaintProperty(layer.id, "fill-color", TREM.Colors.surfaceVariant);
        } else if (layer.type == "line" && key == "tw_county_line") {
          Maps[mapName].setPaintProperty(layer.id, "line-color", TREM.Colors.primary);
        }

  Maps.main.setPaintProperty("Layer_intensity", "fill-outline-color", ["case", [">", ["coalesce", ["feature-state", "intensity"], 0,], 0,], TREM.Colors.onSurfaceVariant, "transparent",]);
};

ipcRenderer.on("config:theme", updateMapColors);
ipcRenderer.on("config:dark", updateMapColors);
ipcRenderer.on("config:color", (event, key, value) => {
  if (typeof event == "boolean") key = event;

  if (typeof key == "boolean") {
    for (let i = 0; i < 10; i++) {
      document.body.style[key ? "setProperty" : "removeProperty"](`--custom-int-${i}`, setting[`theme.int.${i}`]);

      if (tinycolor(key ? setting[`theme.int.${i}`] : [
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
      ][i]).getLuminance() > 0.575)
        $(`.${IntensityToClassString(i).replace(" darkText", "").split(" ").join(".")}`).addClass("darkText");
      else
        $(`.${IntensityToClassString(i).replace(" darkText", "").split(" ").join(".")}`).removeClass("darkText");
    }
  } else if (setting["theme.customColor"]) {
    document.body.style.setProperty(`--${key.replace(/\./g, "-").replace("theme", "custom")}`, value);

    if (tinycolor(value).getLuminance() > 0.575)
      $(`.${IntensityToClassString(IntensityN(key.replace("theme.int.", ""))).replace(" darkText", "").split(" ").join(".")}`).addClass("darkText");
    else
      $(`.${IntensityToClassString(IntensityN(key.replace("theme.int.", ""))).replace(" darkText", "").split(" ").join(".")}`).removeClass("darkText");
  }

  if (Maps.main) {
    Maps.main.setPaintProperty("Layer_intensity", "fill-color", [
      "match",
      ["coalesce", ["feature-state", "intensity"], 0,],
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
    ]);
    Maps.main.setPaintProperty("Layer_area", "line-color", [
      "match",
      ["coalesce", ["feature-state", "intensity"], 0,],
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
    ]);
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
ipcRenderer.on("config:maplayer", (event, mapName, state) => {
  if (state)
    MapBases.main.get(mapName).addTo(Maps.main);
  else
    MapBases.main.get(mapName).remove();
});
// #endregion

// #region EEW
function FCMdata(json, Unit) {
  console.log(json);

  if (server_timestamp.includes(json.timestamp) || NOW().getTime() - json.timestamp > 180000) return;
  server_timestamp.push(json.timestamp);

  if (server_timestamp.length > 5) server_timestamp.splice(0, 1);
  // eslint-disable-next-line no-empty-function
  fs.writeFile(path.join(app.getPath("userData"), "server.json"), JSON.stringify(server_timestamp), () => {});

  if (json.timestamp != undefined)
    dump({ level: 0, message: `Latency: ${NOW().getTime() - json.timestamp}ms`, origin: "API" });

  if (json.type == "tsunami-info") {
    const now = new Date(json.time);
    const Now = now.getFullYear()
        + "/" + (now.getMonth() + 1)
        + "/" + now.getDate()
        + " " + now.getHours()
        + ":" + now.getMinutes();
    dump({ level: 0, message: "Got Tsunami Warning", origin: "API" });
    new Notification("海嘯資訊", { body: `${Now} 發生 ${json.scale} 地震\n\n東經: ${json.lon} 度\n北緯: ${json.lat} 度`, icon: "../TREM.ico" });
  } else if (json.type == "tsunami") {
    TREM.Earthquake.emit("tsunami", json);
  } else if (json.type == "palert") {
    MainMap.intensity.palert(json);
  } else if (json.type == "pws") {
    TREM.PWS.addPWS(json.raw);
  } else if (json.type == "intensity") {
    TREM.Intensity.handle(json);
  } else if (json.Function == "Replay") {
    replay = json.timestamp;
    replayT = NOW().getTime();
    ReportGET();
  } else if (json.type == "report") {
    if (MainMap.intensity.isTriggered)
      MainMap.intensity.clear();

    if (setting["audio.report"]) audioPlay("../audio/Report.wav");
    dump({ level: 0, message: "Got Earthquake Report", origin: "API" });
    console.debug(json);

    if (setting["report.show"]) win.showInactive();

    if (setting["report.cover"])
      if (!win.isFullScreen()) {
        win.setAlwaysOnTop(true);
        win.focus();
        win.setAlwaysOnTop(false);
      }

    const report = json.raw;
    const location = report.location.match(/(?<=位於).+(?=\))/);

    if (!win.isFocused())
      if (!report.location.startsWith("TREM 人工定位"))
        new Notification("地震報告",
          {
            body   : `${location}發生規模 ${report.magnitudeValue.toFixed(1)} 有感地震，最大震度${report.data[0].areaName}${report.data[0].eqStation[0].stationName}${TREM.Constants.intensities[report.data[0].eqStation[0].stationIntensity].text}。`,
            icon   : "../TREM.ico",
            silent : win.isFocused(),
          });

    addReport(report, true);

    setTimeout(() => {
      ipcRenderer.send("screenshotEEW", {
        Function : "report",
        ID       : json.ID,
        Version  : 1,
        Time     : NOW().getTime(),
        Shot     : 1,
      });
    }, 5000);
  } else if (json.type.startsWith("eew") || json.Replay || json.Test) {
    if (replay != 0 && !json.Replay) return;

    if (
      (json.Function == "eew-scdzj" && !setting["accept.eew.SCDZJ"])
			|| (json.Function == "eew-nied" && !setting["accept.eew.NIED"])
			|| (json.Function == "eew-jma" && !setting["accept.eew.JMA"])
			|| (json.Function == "eew-kma" && !setting["accept.eew.KMA"])
			|| (json.Function == "eew-cwb" && !setting["accept.eew.CWB"])
			|| (json.Function == "eew-fjdzj" && !setting["accept.eew.FJDZJ"])
    ) return;

    TREM.Earthquake.emit("eew", json);
  }
}
// #endregion

// #region Event: eew
TREM.Earthquake.on("eew", (data) => {
  dump({ level: 0, message: "Got EEW", origin: "API" });

  if (!TREM.EEW.has(data.id))
    TREM.EEW.set(data.id, new EEW(data));
  else
    TREM.EEW.get(data.id).update(data);

  // handler
  if (EarthquakeList[data.id] == undefined) EarthquakeList[data.id] = {};
  EarthquakeList[data.id].epicenter = [+data.lon, +data.lat];
  EarthquakeList[data.id].Time = data.time;
  EarthquakeList[data.id].ID = data.id;

  let value = 0;
  let distance = 0;

  const GC = {};
  let level;
  let MaxIntensity = { label: "", value: -1 };

  for (const city in TREM.Resources.region)
    for (const town in TREM.Resources.region[city]) {
      const loc = TREM.Resources.region[city][town];
      const d = TREM.Utils.twoSideDistance(
        TREM.Utils.twoPointDistance(
          { lat: loc.latitude, lon: loc.longitude },
          { lat: data.lat, lon: data.lon },
        ),
        data.depth,
      );

      const int = TREM.Utils.PGAToIntensity(
        TREM.Utils.pga(
          data.scale,
          d,
          setting["earthquake.siteEffect"] ? loc.siteEffect : undefined,
        ),
      );

      if (setting["location.city"] == city && setting["location.town"] == town) {
        level = int;
        distance = d;
        value = Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000) - 2;
      }

      if (int.value > MaxIntensity.value)
        MaxIntensity = int;

      GC[loc.code] = int.value;
    }

  // MainMap.intensity.expected(GC);

  let Alert = true;

  if (level.value < Number(setting["eew.Intensity"]) && !data.Replay) Alert = false;

  if (!Info.Notify.includes(data.id)) {
    let Nmsg = "";

    if (value > 0)
      Nmsg = `${value}秒後抵達`;
    else
      Nmsg = "已抵達 (預警盲區)";
    const notify = (level.label.includes("+") || level.label.includes("-")) ? level.label.replace("+", "強").replace("-", "弱") : level.label + "級";
    new Notification("EEW 強震即時警報", {
      body   : `${notify} 地震，${Nmsg}\nM ${data.scale} ${data.location ?? "未知區域"}`,
      icon   : "../TREM.ico",
      silent : win.isFocused(),
    });
    Info.Notify.push(data.id);
    // show latest eew
    TINFO = INFO.length;
    clearInterval(Timers.ticker);
    Timers.ticker = setInterval(() => {
      if (TINFO + 1 >= INFO.length)
        TINFO = 0;
      else TINFO++;
    }, 5000);

    if (Alert) {
      changeView("main", "#mainView_btn");

      if (setting["eew.show"]) win.showInactive();

      if (setting["eew.cover"])
        if (!win.isFullScreen()) {
          win.setAlwaysOnTop(true);
          win.focus();
          win.setAlwaysOnTop(false);
        }

      if (!win.isFocused()) win.flashFrame(true);
    }

    eewt.id = data.id;

    if (setting["audio.eew"] && Alert) {
      TREM.Audios.eew.play();
      audioPlay1(`../audio/1/${level.label.replace("+", "").replace("-", "")}.wav`);

      if (level.label.includes("+"))
        audioPlay1("../audio/1/intensity-strong.wav");
      else if (level.label.includes("-"))
        audioPlay1("../audio/1/intensity-weak.wav");
      else
        audioPlay1("../audio/1/intensity.wav");

      if (value > 0 && value < 100) {
        if (value <= 10) {
          audioPlay1(`../audio/1/${value.toString()}.wav`);
        } else if (value < 20) {
          audioPlay1(`../audio/1/x${value.toString().substring(1, 2)}.wav`);
        } else {
          audioPlay1(`../audio/1/${value.toString().substring(0, 1)}x.wav`);
          audioPlay1(`../audio/1/x${value.toString().substring(1, 2)}.wav`);
        }

        audioPlay1("../audio/1/second.wav");
      }
    }
  }

  if (MaxIntensity.value >= 5) {
    data.Alert = true;

    if (!Info.Warn.includes(data.id)) {
      Info.Warn.push(data.id);

      if (!EEWAlert) {
        EEWAlert = true;

        if (setting["audio.eew"] && Alert)
          for (let index = 0; index < 5; index++)
            audioPlay("../audio/Alert.wav");
      }
    }
  } else {
    data.Alert = false;
  }

  let _time = -1;
  let stamp = 0;

  if ((EarthquakeList[data.id].number ?? 1) < data.number) {
    if (setting["audio.eew"] && Alert) TREM.Audios.update.play();
    EarthquakeList[data.id].number = data.number;
  }

  eew[data.id] = {
    lon  : Number(data.lon),
    lat  : Number(data.lat),
    time : 0,
    Time : data.time,
    id   : data.id,
    km   : 0,
  };
  value = Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000);

  if (Second == -1 || value < Second)
    if (setting["audio.eew"] && Alert)
      if (arrive == data.id || arrive == "") {
        arrive = data.id;

        if (t != null) clearInterval(t);
        t = setInterval(() => {
          value = Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000);
          Second = value;

          if (stamp != value && !audio.minor_lock) {
            stamp = value;

            if (_time >= 0) {
              audioPlay("../audio/1/ding.wav");
              _time++;

              if (_time >= 10)
                clearInterval(t);
            } else if (value < 100) {
              if (value > 10) {
                if (value.toString().substring(1, 2) == "0") {
                  audioPlay1(`../audio/1/${value.toString().substring(0, 1)}x.wav`);
                  audioPlay1("../audio/1/x0.wav");
                } else {
                  audioPlay("../audio/1/ding.wav");
                }
              } else if (value > 0) {
                audioPlay1(`../audio/1/${value.toString()}.wav`);
              } else {
                arrive = data.id;
                audioPlay1("../audio/1/arrive.wav");
                _time = 0;
              }
            }
          }
        }, 50);
      }

  const speed = setting["shock.smoothing"] ? 100 : 500;

  if (EarthquakeList[data.id].Timer != undefined) clearInterval(EarthquakeList[data.id].Timer);

  if (EarthquakeList.ITimer != undefined) clearInterval(EarthquakeList.ITimer);

  // AlertBox: 種類
  let classString = "alert-box ";

  if (data.Replay) {
    replay = data.timestamp;
    replayT = NOW().getTime();
  } else {
    replay = 0;
  }

  if (data.Test)
    classString += "eew-test";
  else if (data.Alert)
    classString += "eew-alert";
  else
    classString += "eew-pred";

  let find = INFO.findIndex(v => v.ID == data.id);

  if (find == -1) find = INFO.length;
  const now = new Date((data.Replay) ? data.replay_time : data.time);
  const time = now.getFullYear()
    + "/" + (now.getMonth() + 1)
	+ "/" + now.getDate()
    + " " + now.getHours()
    + ":" + now.getMinutes()
    + ":" + now.getSeconds();

  INFO[find] = {
    ID              : data.id,
    alert_number    : data.number,
    alert_intensity : MaxIntensity.value,
    alert_location  : data.location ?? "未知區域",
    alert_time      : time,
    alert_sTime     : Math.floor(data.time + _speed(data.depth, distance).Stime * 1000),
    alert_pTime     : Math.floor(data.time + _speed(data.depth, distance).Ptime * 1000),
    alert_local     : level.value,
    alert_magnitude : data.scale,
    alert_depth     : data.depth,
    alert_provider  : "",
    alert_type      : classString,
    "intensity-1"   : `<font color="white" size="7"><b>${MaxIntensity.label}</b></font>`,
    "time-1"        : `<font color="white" size="2"><b>${time}</b></font>`,
    "info-1"        : `<font color="white" size="4"><b>M ${data.scale} </b></font><font color="white" size="3"><b> 深度: ${data.depth} km</b></font>`,
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

  if (Timers.eew == null)
    Timers.eew = setInterval(() => {
      updateText();

      if (Timers.ticker == null)
        Timers.ticker = setInterval(() => {
          if (TINFO + 1 >= INFO.length)
            TINFO = 0;
          else TINFO++;
        }, 5000);
    }, 1000);

  EEWshot = NOW().getTime() - 28500;
  EEWshotC = 1;
  const _distance = [];
  for (let index = 0; index < 1002; index++)
    _distance[index] = _speed(data.depth, index);
  EarthquakeList[data.id].distance = _distance;
  main(data);
  EarthquakeList[data.id].Timer = setInterval(() => {
    main(data);
  }, speed);

  if (TREM.EEW.get(data.id)?.geojson) {
    TREM.EEW.get(data.id).geojson.remove();
    delete TREM.EEW.get(data.id).geojson;
  }

  TREM.EEW.get(data.id).geojson = L.geoJson.vt(MapData.tw_town, {
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
      } else {
        return {
          color       : "transparent",
          weight      : 0.8,
          opacity     : 0,
          fillColor   : TREM.Colors.surfaceVariant,
          fillOpacity : 0.6,
        };
      }
    },
  });

  setTimeout(() => {
    if (setting["webhook.url"] != "") {
      const Now = NOW().getFullYear()
				+ "/" + (NOW().getMonth() + 1)
				+ "/" + NOW().getDate()
				+ " " + NOW().getHours()
				+ ":" + NOW().getMinutes()
				+ ":" + NOW().getSeconds();

      let msg = setting["webhook.body"];
      msg = msg.replace("%Depth%", data.depth).replace("%NorthLatitude%", data.lat).replace("%Time%", time).replace("%EastLongitude%", data.lon).replace("%Scale%", data.scale);

      if (data.type == "eew-cwb")
        msg = msg.replace("%Provider%", "交通部中央氣象局");
      else if (data.type == "eew-scdzj")
        msg = msg.replace("%Provider%", "四川省地震局");
      else if (data.type == "eew-fjdzj")
        msg = msg.replace("%Provider%", "福建省地震局");
      else if (data.type == "eew-nied")
        msg = msg.replace("%Provider%", "防災科学技術研究所");
      else if (data.type == "eew-jma")
        msg = msg.replace("%Provider%", "気象庁(JMA)");
      else if (data.type == "eew-kma")
        msg = msg.replace("%Provider%", "기상청(KMA)");

      msg = JSON.parse(msg);
      msg.username = "TREM | 臺灣即時地震監測";

      msg.embeds[0].image.url = "";
      msg.embeds[0].footer = {
        text     : `ExpTech Studio ${Now}`,
        icon_url : "https://raw.githubusercontent.com/ExpTechTW/API/master/image/Icon/ExpTech.png",
      };
      dump({ level: 0, message: "Posting Webhook", origin: "Webhook" });
      fetch(setting["webhook.url"], {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify(msg),
      }).catch((error) => {
        dump({ level: 2, message: error, origin: "Webhook" });
      });
    }
  }, 2000);
});
// #endregion

// #region Event: eewEnd
TREM.Earthquake.on("eewEnd", (id) => {
  if (TREM.EEW.get(id).CircleS != undefined) TREM.EEW.get(id).CircleS = TREM.EEW.get(id).CircleS.remove();

  if (TREM.EEW.get(id).CircleP != undefined) TREM.EEW.get(id).CircleP = TREM.EEW.get(id).CircleP.remove();

  if (TREM.EEW.get(id).epicenterIcon.main != undefined) TREM.EEW.get(id).epicenterIcon.main.remove();

  if (TREM.EEW.get(id).epicenterIcon.mini != undefined) TREM.EEW.get(id).epicenterIcon.mini.remove();

  if (TREM.EEW.get(id).CircleSTW != undefined) Maps.mini.removeLayer(TREM.EEW.get(id).CircleSTW);

  if (TREM.EEW.get(id).CirclePTW != undefined) Maps.mini.removeLayer(TREM.EEW.get(id).CirclePTW);
});
// #endregion


TREM.Earthquake.on("tsunami", (data) => {
  if (data.number == 1) {
    const now = new Date(json.time);
    const Now = now.getFullYear()
        + "/" + (now.getMonth() + 1)
        + "/" + now.getDate()
        + " " + now.getHours()
        + ":" + now.getMinutes();
    new Notification("海嘯警報", {
      body   : `${Now} 發生 ${data.scale} 地震\n\n東經: ${data.lon} 度\n北緯: ${data.lat} 度`,
      icon   : "../TREM.ico",
      silent : win.isFocused(),
    });

    if (setting["report.show"]) win.showInactive();

    if (setting["report.cover"])
      if (!win.isFullScreen()) {
        win.setAlwaysOnTop(true);
        win.focus();
        win.setAlwaysOnTop(false);
      }

    if (setting["audio.report"]) audioPlay("../audio/Water.wav");
    TREM.Earthquake.emit("focus", { center: pointFormatter(23.608428, 120.799168, TREM.MapRenderingEngine), size: 7.75 });
  }

  if (data.cancel) {
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
        iconUrl   : "../image/warn.png",
        iconSize  : [30, 30],
        className : "tsunami",
      });
      TSUNAMI.warnIcon = L.marker([+data.lat, +data.lon], { icon: warnIcon }).addTo(Maps.main);
    } else {
      TSUNAMI.warnIcon.setLatLng([+data.lat, +data.lon]);
    }

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
          color   : Tcolor(data.area[0].areaColor),
          fill    : false,
        },
      }).addTo(Maps.main);
      L.DomUtil.addClass(TSUNAMI.E._container, "tsunami");
    } else {
      TSUNAMI.E.setStyle({
        weight  : 10,
        opacity : 1,
        color   : Tcolor(data.area[0].areaColor),
        fill    : false,
      });
    }

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
          color   : Tcolor(data.area[1].areaColor),
          fill    : false,
        },
      }).addTo(Maps.main);
      L.DomUtil.addClass(TSUNAMI.EN._container, "tsunami");
    } else {
      TSUNAMI.EN.setStyle({
        weight  : 10,
        opacity : 1,
        color   : Tcolor(data.area[1].areaColor),
        fill    : false,
      });
    }

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
          color   : Tcolor(data.area[2].areaColor),
          fill    : false,
        },
      }).addTo(Maps.main);
      L.DomUtil.addClass(TSUNAMI.ES._container, "tsunami");
    } else {
      TSUNAMI.ES.setStyle({
        weight  : 10,
        opacity : 1,
        color   : Tcolor(data.area[2].areaColor),
        fill    : false,
      });
    }

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
          color   : Tcolor.vt(data.area[3].areaColor),
          fill    : false,
        },
      }).addTo(Maps.main);
      L.DomUtil.addClass(TSUNAMI.N._container, "tsunami");
    } else {
      TSUNAMI.N.setStyle({
        weight  : 10,
        opacity : 1,
        color   : Tcolor(data.area[3].areaColor),
        fill    : false,
      });
    }

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
          color   : Tcolor(data.area[4].areaColor),
          fill    : false,
        },
      }).addTo(Maps.main);
      L.DomUtil.addClass(TSUNAMI.WS._container, "tsunami");
    } else {
      TSUNAMI.WS.setStyle({
        weight  : 10,
        opacity : 1,
        color   : Tcolor(data.area[4].areaColor),
        fill    : false,
      });
    }

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
          color   : Tcolor(data.area[5].areaColor),
          fill    : false,
        },
      }).addTo(Maps.main);
      L.DomUtil.addClass(TSUNAMI.W._container, "tsunami");
    } else {
      TSUNAMI.W.setStyle({
        weight  : 10,
        opacity : 1,
        color   : Tcolor(data.area[5].areaColor),
        fill    : false,
      });
    }
  }
});

function main(data) {
  if (TREM.EEW.get(INFO[TINFO].ID).Cancel == undefined) {
    const wave = { p: 7, s: 4 };

    /**
		* @type {{p:number,s:number}}
		*/

    let kmP = Math.floor(Math.sqrt(Math.pow((NOW().getTime() - data.time) * wave.p, 2) - Math.pow(data.depth * 1000, 2)));
    let km = Math.floor(Math.sqrt(Math.pow((NOW().getTime() - data.time) * wave.s, 2) - Math.pow(data.depth * 1000, 2)));


    /**
 		* PS 波已走公尺數
 		* @type {number} kmP
		* @type {number} km
 		*/
    for (let index = 1; index < EarthquakeList[data.id].distance.length; index++)
      if (EarthquakeList[data.id].distance[index].Ptime > (NOW().getTime() - data.time) / 1000) {
        kmP = (index - 1) * 1000;

        if ((index - 1) / EarthquakeList[data.id].distance[index - 1].Ptime > wave.p) kmP = Math.floor(Math.sqrt(Math.pow((NOW().getTime() - data.time) * wave.p, 2) - Math.pow(data.depth * 1000, 2)));
        break;
      }

    for (let index = 1; index < EarthquakeList[data.id].distance.length; index++)
      if (EarthquakeList[data.id].distance[index].Stime > (NOW().getTime() - data.time) / 1000) {
        km = (index - 1) * 1000;

        if ((index - 1) / EarthquakeList[data.id].distance[index - 1].Stime > wave.s) km = Math.floor(Math.sqrt(Math.pow((NOW().getTime() - data.time) * wave.s, 2) - Math.pow(data.depth * 1000, 2)));
        break;
      }

    if (setting["shock.p"])
      if (kmP > 0) {
        if (!TREM.EEW.get(data.id).CircleP) {
          TREM.EEW.get(data.id).CircleP = new WaveCircle({
            id     : `${data.id}-p`,
            map    : Maps.main,
            latlng : [+data.lat, +data.lon],
            radius : kmP,
            alert  : data.Alert
          });
        } else {
          TREM.EEW.get(data.id).CircleP.setLatLng([+data.lat, +data.lon]);
          TREM.EEW.get(data.id).CircleP.setRadius(kmP);
        }

        if (!TREM.EEW.get(data.id).CirclePTW)
          TREM.EEW.get(data.id).CirclePTW = L.circle([data.lat, data.lon], {
            color     : "#6FB7B7",
            fillColor : "transparent",
            radius    : kmP,
            renderer  : L.svg(),
            className : "p-wave",
          }).addTo(Maps.mini);

        if (!TREM.EEW.get(data.id).CirclePTW.getLatLng().equals([+data.lat, +data.lon]))
          TREM.EEW.get(data.id).CirclePTW
            .setLatLng([+data.lat, +data.lon]);

        TREM.EEW.get(data.id).CirclePTW
          .setRadius(kmP);
      }

    if (km > data.depth * 100) {
      if (TREM.EEW.get(data.id).waveProgress) {
        TREM.EEW.get(data.id).waveProgress.remove();
        delete TREM.EEW.get(data.id).waveProgress;
      }

      eew[data.id].km = km;

      if (!TREM.EEW.get(data.id).CircleS) {
        TREM.EEW.get(data.id).CircleS = new WaveCircle({
          id     : `${data.id}-s`,
          map    : Maps.main,
          latlng : [+data.lat, +data.lon],
          radius : km,
          alert  : data.Alert
        });
      } else {
        TREM.EEW.get(data.id).CircleS.setLatLng([+data.lat, +data.lon]);
        TREM.EEW.get(data.id).CircleS.setRadius(km);
        TREM.EEW.get(data.id).CircleS.setAlert(data.Alert);
      }

      if (!TREM.EEW.get(data.id).CircleSTW)
        TREM.EEW.get(data.id).CircleSTW = L.circle([+data.lat, +data.lon], {
          color       : data.Alert ? "red" : "orange",
          fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
          fillOpacity : 1,
          radius      : km,
          renderer    : L.svg(),
          className   : "s-wave",
        }).addTo(Maps.mini);

      if (!TREM.EEW.get(data.id).CircleSTW.getLatLng().equals([+data.lat, +data.lon]))
        TREM.EEW.get(data.id).CircleSTW.setLatLng([+data.lat, +data.lon]);

      TREM.EEW.get(data.id).CircleSTW
        .setRadius(km)
        .setStyle(
          {
            color     : data.Alert ? "red" : "orange",
            fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
          },
        );
    } else {
      const num = (NOW().getTime() - data.time) / 10 / EarthquakeList[data.id].distance[1].Stime;

      if (!TREM.EEW.get(data.id).waveProgress)
        TREM.EEW.get(data.id).waveProgress = new maplibregl.Marker({ element: $(`<div class="s-wave-progress-container"><div class="s-wave-progress" style="height:${num}%;"></div></div>`)[0] })
          .setLngLat([+data.lon, +data.lat])
          .addTo(Maps.main);
      else TREM.EEW.get(data.id).waveProgress.getElement().firstChild.style.height = `${num}%`;
    }

    if (data.cancel)
      for (let index = 0; index < INFO.length; index++)
        if (INFO[index].ID == data.id) {
          INFO[index].alert_type = "alert-box eew-cancel";
          data.timeStamp = NOW().getTime() - ((data.lon < 122.18 && data.lat < 25.47 && data.lon > 118.25 && data.lat > 21.77) ? 90_000 : 150_000);

          if (TREM.EEW.get(data.id).waveProgress) {
            TREM.EEW.get(data.id).waveProgress.remove();
            delete TREM.EEW.get(data.id).waveProgress;
          }

          TREM.Earthquake.emit("eewEnd", data.id);
          TREM.EEW.get(INFO[TINFO].ID).Cancel = true;

          if (Object.keys(EarthquakeList).length == 1) {
            clearInterval(t);
            audio.main = [];
            audio.minor = [];
          }

          break;
        }
  }

  // #region Epicenter Cross Icon

  if (!Timers.epicenterBlinker)
    Timers.epicenterBlinker = (function() {
      let epicenter_blink_state = true;
      return setInterval(() => {
        for (const [key, value] of TREM.EEW) {
          const el = value.epicenterIcon.main;

          if (epicenter_blink_state) {
            if (value.epicenterIcon.main.getElement().classList.contains("hide"))
              value.epicenterIcon.main.getElement().classList.remove("hide");
          } else if (!value.epicenterIcon.main.getElement().classList.contains("hide")) {
            value.epicenterIcon.main.getElement().classList.add("hide");
          }

          if (key == INFO[TINFO].ID) {
            if (epicenter_blink_state) {
              if (value.epicenterIcon.mini.getElement().classList.contains("hide"))
                value.epicenterIcon.mini.getElement().classList.remove("hide");
            } else if (!value.epicenterIcon.mini.getElement().classList.contains("hide")) {
              value.epicenterIcon.mini.getElement().classList.add("hide");
            }
          } else if (!value.epicenterIcon.mini.getElement()?.classList?.contains("hide")) {
            value.epicenterIcon.mini.getElement().classList.add("hide");
          }
        }

        epicenter_blink_state = !epicenter_blink_state;
      }, 500);
    })();

  // #endregion <- Epicenter Cross Icon


  if (NOW().getTime() - EEWshot > 60000)
    EEWshotC = 1;

  if (NOW().getTime() - EEWshot > 30000 && EEWshotC <= 2) {
    EEWshotC++;
    EEWshot = NOW().getTime();
    setTimeout(() => {
      ipcRenderer.send("screenshotEEW", {
        Function : data.Function,
        ID       : data.id,
        Version  : data.number,
        Time     : NOW().getTime(),
        Shot     : EEWshotC,
      });
    }, 300);
  }

  if (NOW().getTime() - data.timeStamp > ((data.lon < 122.18 && data.lat < 25.47 && data.lon > 118.25 && data.lat > 21.77) ? 120_000 : 180_000) || Cancel) {
    TREM.Earthquake.emit("eewEnd", data.id);
    MainMap.intensity.clear();

    for (let index = 0; index < INFO.length; index++)
      if (INFO[index].ID == data.id) {
        TINFO = 0;
        INFO.splice(index, 1);
        break;
      }

    if (TREM.EEW.get(data.id)?.geojson) {
      TREM.EEW.get(data.id).geojson.remove();
      delete TREM.EEW.get(data.id).geojson;
    }

    clearInterval(EarthquakeList[data.id].Timer);
    document.getElementById("box-10").innerHTML = "";
    delete EarthquakeList[data.id];
    delete eew[data.id];

    if (Object.keys(EarthquakeList).length == 0) {
      clearInterval(t);
      audio.main = [];
      arrive = "";
      audio.minor = [];
      Second = -1;
      EEWAlert = false;
      // hide eew alert
      Timers.ticker = null;
      Cancel = false;

      if (replay != 0) {
        replay = 0;
        document.getElementById("togglenav_btn").classList.remove("hide");
        document.getElementById("stopReplay").classList.add("hide");
        ReportGET();
      }

      INFO = [];
      Info = { Notify: [], Warn: [], Focus: [] };
      $("#alert-box").removeClass("show");
      $("#map-legends").removeClass("show");
      // hide minimap
      $("#map-tw").removeClass("show");
      // restore reports
      $(roll).fadeIn(200);
      rts_remove_eew = false;
      clearInterval(Timers.epicenterBlinker);
      delete Timers.epicenterBlinker;
      clearInterval(Timers.eew);
      Timers.eew = null;
      global.gc();

      if (TREM.MapRenderingEngine == "mapbox-gl")
        Mapsmainfocus();
    }
  }
}

function Tcolor(text) {
  return (text == "黃色") ? "yellow"
    : (text == "橙色") ? "red"
      : (text == "綠色") ? "transparent"
        : "purple";
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

  if (TREM.EEW.get(INFO[TINFO].ID).Cancel != undefined) {
    $("#alert-p").text("X");
    $("#alert-s").text("X");
  } else {
    let num = Math.floor((INFO[TINFO].alert_sTime - NOW().getTime()) / 1000);

    if (num <= 0) num = "";
    $("#alert-s").text(num);

    num = Math.floor((INFO[TINFO].alert_pTime - NOW().getTime()) / 1000);

    if (num <= 0) num = "";
    $("#alert-p").text(num);
  }

  // bring waves to front
  // if (TREM.EEW.get(INFO[TINFO].ID).CircleP) TREM.EEW.get(INFO[TINFO].ID).CircleP.bringToFront();
  // if (TREM.EEW.get(INFO[TINFO].ID).CircleS) TREM.EEW.get(INFO[TINFO].ID).CircleS.bringToFront();

  for (const key in EarthquakeList) {
    if (!TREM.EEW.get(key)?.epicenterIconTW?.getElement()?.classList?.contains("hide"))
      TREM.EEW.get(key)?.epicenterIconTW?.getElement()?.classList?.add("hide");

    if (!TREM.EEW.get(key)?.CirclePTW?.getElement()?.classList?.contains("hide"))
      TREM.EEW.get(key)?.CirclePTW?.getElement()?.classList?.add("hide");

    if (!TREM.EEW.get(key)?.CircleSTW?.getElement()?.classList?.contains("hide"))
      TREM.EEW.get(key)?.CircleSTW?.getElement()?.classList?.add("hide");

    if (TREM.EEW.get(key)?.geojson)
      TREM.EEW.get(key).geojson.remove();
  }

  if (TREM.EEW.get(INFO[TINFO].ID).epicenterIconTW) TREM.EEW.get(INFO[TINFO].ID).epicenterIconTW.getElement()?.classList?.remove("hide");

  if (TREM.EEW.get(INFO[TINFO].ID).CirclePTW) TREM.EEW.get(INFO[TINFO].ID).CirclePTW.getElement()?.classList?.remove("hide");

  if (TREM.EEW.get(INFO[TINFO].ID).CircleSTW) TREM.EEW.get(INFO[TINFO].ID).CircleSTW.getElement()?.classList?.remove("hide");

  if (TREM.EEW.get(INFO[TINFO].ID)?.geojson) TREM.EEW.get(INFO[TINFO].ID).geojson.addTo(Maps.mini);
  const Num = Math.round(((NOW().getTime() - INFO[TINFO].Time) * 4 / 10) / INFO[TINFO].Depth);
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

  if (changeel.attr("id") == "intensity")
    Maps.intensity.invalidateSize();

  TREM.emit("viewChange", currentel.attr("id"), changeel.attr("id"));
};

function pointFormatter(lat, lng, engine) {
  if (engine == "mapbox-gl")
    return [lng, lat];
  else if (engine == "leaflet")
    return [lat, lng];
}

function NOW() {
  return new Date(ServerTime + (Date.now() - ServerT));
}