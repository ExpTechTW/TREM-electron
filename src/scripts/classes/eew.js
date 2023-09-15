const { Map: maplibreMap } = require("maplibre-gl");
const { playAudio } = require("../helpers/audio");
const Distance = require("../helpers/distance");
const Wave = require("./wave");
const calcPGA = require("../helpers/pga");
const region = require("../../assets/json/region.json");
const constants = require("../constants");

class EEW {

  /**
   * @param {*} data
   * @param {maplibreMap} map
   * @param {boolean} waves
   */
  constructor(data, map, waves = true, eewList) {
    this.hasWaves = waves;
    this._map = map;
    this._eewList = eewList;
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

  set epicenter(value) {
    this._epicenter = value;
  }

  /**
   * @return {{latitude:number, longitude:number, toLngLatArray(): number[]}}
   */
  get epicenter() {
    return {
      ...this._epicenter,
      toLngLatArray: () => [this._epicenter.longitude, this._epicenter.latitude]
    };
  }

  #fromJson(data) {
    this.id = data.id;
    this.depth = data.depth;
    this.epicenter = { latitude: data.lat, longitude: data.lon };
    this.epicenterIcon = { main: null, mini: null };
    this.location = data.location;
    this.magnitude = data.scale;
    this.type = data.type;
    this.source = {
      "eew-cwb"   : "中央氣象局",
      "eew-nied"  : "日本防災科研",
      "eew-jma"   : "日本氣象廳",
      "eew-kma"   : "韓國氣象廳",
      "eew-fjdzj" : "中國福建省地震局",
      "eew-scdzj" : "中國四川省地震局",
      "trem-eew"  : "TREM 地震預警"
    }[this.type];

    let _surpressUpdateAudio = false;

    if (data.type == "trem-eew") {
      if (data.model == "nsspe") {
        this.hasWaves = false;
      } else if (this.model == "NSSPE" && data.model == "eew") {
        playAudio("eew2", localStorage.getItem("AudioEEWTREMVolume") ?? constants.DefaultSettings.AudioEEWTREMVolume);
        _surpressUpdateAudio = true;
      }

      this.model = data.model?.toUpperCase() ?? "TREMEEW";
    }

    this.eventTime = new Date(data.time);
    this.apiTime = new Date(data.timeStamp);

    this.alert = data.type == "eew-cwb";
    this._from = data.data_unit;
    this._receiveTime = new Date(data.timestamp);
    this._replay = data.Replay;

    if (data.number > (this.version || 0)) {
      this._expected = new Map();
      this.#evalExpected();

      if (this.hasWaves)
        this._distance = EEW.evalWaveDistances(this.depth);

      this.#createWaveCircles();

      if (data.number > 1) {
        if (!_surpressUpdateAudio)
          if ((this.type == "trem-eew" && (localStorage.getItem("AudioPlayUpdateNSSPE") ?? constants.DefaultSettings.AudioPlayUpdateNSSPE) == "true")
              || (this.type != "trem-eew" && (localStorage.getItem("AudioPlayUpdate") ?? constants.DefaultSettings.AudioPlayUpdate) == "true"))
            playAudio("update", localStorage.getItem("AudioUpdateVolume") ?? constants.DefaultSettings.AudioUpdateVolume);
      } else if (this.type == "eew-cwb") {
        playAudio("cwb", localStorage.getItem("AudioEEWVolume") ?? constants.DefaultSettings.AudioEEWVolume);
      } else {
        playAudio("eew", localStorage.getItem("AudioEEWVolume") ?? constants.DefaultSettings.AudioEEWVolume);
      }
    }

    this.version = data.number;
  }

  #evalExpected() {
    for (const city in region)
      for (const town in region[city]) {
        const l = region[city][town];
        const d = Distance.from(
          Distance.from({ lat: this.epicenter.latitude, lon: this.epicenter.longitude }).to({ lat: l.lat, lon: l.lon })
        ).to(this.depth);

        const pga = calcPGA(
          this.magnitude,
          this.depth,
          d,
          {
            site : ((localStorage.getItem("UseSiteEffect") ?? constants.DefaultSettings.UseSiteEffect) == "true") ? l.site ?? 1 : 1,
            d    : l.site_d,
            s    : l.site_s
          },
        );

        const i = pga.toIntensity();

        if (city == localStorage.getItem("eew.localCity") && town == localStorage.getItem("eew.localTown"))
          this._local = l;

        if (this.source == "中央氣象局") {
          this._map.setFeatureState({
            source : "tw_town",
            id     : l.id,
          }, { intensity: i.value });
          this._map.setLayoutProperty("town", "visibility", "visible");
        }

        this._expected.set(l.code, { distance: d, intensity: i, pga });
      }
  }

  static evalWaveDistances(depth) {
    const _distance = [];
    for (let index = 0; index < 1002; index++)
      _distance[index]
        = ((d, distance) => {
          const Za = 1 * d;
          let G0, G;
          const Xb = distance;

          if (d <= 40) {
            G0 = 5.10298;
            G = 0.06659;
          } else {
            G0 = 7.804799;
            G = 0.004573;
          }

          const Zc = -1 * (G0 / G);
          const Xc = ((Xb ** 2) - 2 * (G0 / G) * Za - (Za ** 2)) / (2 * Xb);
          let Theta_A = Math.atan((Za - Zc) / Xc);

          if (Theta_A < 0) Theta_A = Theta_A + Math.PI;
          Theta_A = Math.PI - Theta_A;
          const Theta_B = Math.atan(-1 * Zc / (Xb - Xc));
          let Ptime = (1 / G) * Math.log(Math.tan(Theta_A / 2) / Math.tan(Theta_B / 2));
          const G0_ = G0 / 1.732;
          const G_ = G / 1.732;
          const Zc_ = -1 * (G0_ / G_);
          const Xc_ = ((Xb ** 2) - 2 * (G0_ / G_) * Za - Math.pow(Za, 2)) / (2 * Xb);
          let Theta_A_ = Math.atan((Za - Zc_) / Xc_);

          if (Theta_A_ < 0) Theta_A_ = Theta_A_ + Math.PI;
          Theta_A_ = Math.PI - Theta_A_;
          const Theta_B_ = Math.atan(-1 * Zc_ / (Xb - Xc_));
          let Stime = (1 / G_) * Math.log(Math.tan(Theta_A_ / 2) / Math.tan(Theta_B_ / 2));

          if (distance / Ptime > 7) Ptime = distance / 7;

          if (distance / Stime > 4) Stime = distance / 4;
          return { Ptime, Stime };
        })(depth, index);
    return _distance;
  }

  #createWaveCircles() {
    if (this.p instanceof Wave) {
      // already has wave circle
      this.p.setLngLat(this.epicenter.toLngLatArray());
      this.p.setModel(this.model);

      if (this.hasWaves && this.s instanceof Wave) {
        this.s.setLngLat(this.epicenter.toLngLatArray());
        this.s.setAlert(this.alert);
      }
    } else {
      // no existing wave circle

      this.p = new Wave(this._map, { id: this.id, type: "p", center: this.epicenter.toLngLatArray(), radius: 0, circle: this.hasWaves, model: this.model, location: this.location, magnitude: this.magnitude, depth: this.depth });

      if (this.hasWaves)
        this.s = new Wave(this._map, { id: this.id, type: "s", center: this.epicenter.toLngLatArray(), radius: 0, icon: false });

      this._waveSpeed = { p: 7, s: 4 };

      this._waveTick = () => {
        const apiTime = this._map.time.serverTimestamp + (Date.now() - this._map.time.localServerTimestamp);

        const elapsedTime = apiTime - this.eventTime.getTime();

        if (elapsedTime > 120_000) {
          this.remove();
          return;
        }

        if (this.hasWaves) {
          let p_dist = Math.floor(Math.sqrt((elapsedTime * this._waveSpeed.p) ** 2 - (this.depth * 1000) ** 2));
          let s_dist = Math.floor(Math.sqrt((elapsedTime * this._waveSpeed.s) ** 2 - (this.depth * 1000) ** 2));

          let pf, sf;

          for (let _i = 1; _i < this._distance.length; _i++) {
            if (!pf && this._distance[_i].Ptime > elapsedTime / 1000) {
              p_dist = _i - 1;

              if ((_i - 1) / this._distance[_i - 1].Ptime > this._waveSpeed.p)
                p_dist = Math.round(Math.sqrt((elapsedTime * this._waveSpeed.p) ** 2 - (this.depth * 1000) ** 2)) / 1000;
              pf = true;
            }

            if (!sf && this._distance[_i].Stime > elapsedTime / 1000) {
              s_dist = _i - 1;

              if ((_i - 1) / this._distance[_i - 1].Stime > this._waveSpeed.s)
                s_dist = Math.round(Math.sqrt((elapsedTime * this._waveSpeed.s) ** 2 - (this.depth * 1000) ** 2)) / 1000;
              sf = true;
            }

            if (pf && sf) break;
          }

          if (p_dist > this.depth)
            this.p.setRadius(p_dist - this.depth);

          if (s_dist > this.depth)
            this.s.setRadius(s_dist - this.depth);
        }
      };

      this._waveTick();
      this._waveInterval = setInterval(this._waveTick, 50);
    }
  }

  update(data) {
    this.#fromJson(data);
  }

  remove() {
    if (this.p)
      this.p.remove();

    if (this.s)
      this.s.remove();

    if (this._waveInterval)
      clearInterval(this._waveInterval);

    delete this.eewList[this.id];
  }
}

module.exports = EEW;