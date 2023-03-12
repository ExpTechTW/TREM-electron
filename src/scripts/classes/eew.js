import region from "../../assets/json/region.json";
import Distance from "../helpers/distance";
import calcPGA from "../helpers/pga";
import Wave from "./wave";

class EEW {
  constructor(data, map, waves = false) {
    this.hasWaves = waves;
    this._map = map;
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
    this.location = data.Location;
    this.magnitude = data.scale;
    this.source = {
      "eew-cwb"   : "中央氣象局",
      "eew-nied"  : "日本防災科研",
      "eew-jma"   : "日本氣象廳",
      "eew-kma"   : "韓國氣象廳",
      "eew-fjdzj" : "中國福建省地震局",
      "eew-scdzj" : "中國四川省地震局",
      "trem-eew"  : "NSSPE"
    }[data.type];

    if (this.source == "NSSPE")
      this.hasWaves = false;

    this.eventTime = new Date(data.time);
    this.apiTime = new Date(data.timeStamp);

    this.alert = data.Alert;
    this._from = data.data_unit;
    this._receiveTime = new Date(data.timestamp);
    this._replay = data.Replay;

    if (data.number > (this.version || 0)) {
      this._expected = new Map();
      this.#evalExpected();

      if (this.hasWaves)
        this.#evalWaveDistances();

      this.#createWaveCircles();
    }

    this.version = data.number;
  }

  #evalExpected() {
    for (const city in region)
      for (const town in region[city]) {
        const l = region[city][town];
        const d = Distance.from(
          Distance.from({ lat: l.latitude, lon: l.longitude }).to({ lat: this.epicenter.latitude, lon: this.epicenter.longitude })
        ).to(this.depth);
        const pga = calcPGA(
          this.magnitude,
          d,
          true ? l.siteEffect : undefined,
        );

        const i = pga.toIntensity();

        if (city == "雲林縣" && town == "斗六市")
          this._local = l;

        this._expected.set(l.code, { distance: d, intensity: i, pga });
      }
  }

  #evalWaveDistances() {
    this._distance = [];
    for (let index = 0; index < 1002; index++)
      this._distance[index]
        = ((depth, distance) => {
          const Za = 1 * depth;
          let G0, G;
          const Xb = distance;

          if (depth <= 40) {
            G0 = 5.10298;
            G = 0.06659;
          } else {
            G0 = 7.804799;
            G = 0.004573;
          }

          const Zc = -1 * (G0 / G);
          const Xc = (Math.pow(Xb, 2) - 2 * (G0 / G) * Za - Math.pow(Za, 2)) / (2 * Xb);
          let Theta_A = Math.atan((Za - Zc) / Xc);

          if (Theta_A < 0) Theta_A = Theta_A + Math.PI;
          Theta_A = Math.PI - Theta_A;
          const Theta_B = Math.atan(-1 * Zc / (Xb - Xc));
          let Ptime = (1 / G) * Math.log(Math.tan((Theta_A / 2)) / Math.tan((Theta_B / 2)));
          const G0_ = G0 / 1.732;
          const G_ = G / 1.732;
          const Zc_ = -1 * (G0_ / G_);
          const Xc_ = (Math.pow(Xb, 2) - 2 * (G0_ / G_) * Za - Math.pow(Za, 2)) / (2 * Xb);
          let Theta_A_ = Math.atan((Za - Zc_) / Xc_);

          if (Theta_A_ < 0) Theta_A_ = Theta_A_ + Math.PI;
          Theta_A_ = Math.PI - Theta_A_;
          const Theta_B_ = Math.atan(-1 * Zc_ / (Xb - Xc_));
          let Stime = (1 / G_) * Math.log(Math.tan(Theta_A_ / 2) / Math.tan(Theta_B_ / 2));

          if (distance / Ptime > 7) Ptime = distance / 7;

          if (distance / Stime > 4) Stime = distance / 4;
          return { Ptime: Ptime, Stime: Stime };
        })(this.depth, index);
  }

  #createWaveCircles() {
    if (this.p instanceof Wave) {
      this.p.setLngLat(this.epicenter.toLngLatArray());

      if (this.hasWaves && this.s instanceof Wave) {
        this.s.setLngLat(this.epicenter.toLngLatArray());
        this.s.setAlert(this.alert);
      }
    } else {
      this.p = new Wave(this._map, { type: "p", center: this.epicenter.toLngLatArray(), radius: 0, ...((this.hasWaves) ? { circle: true } : { circle: false }) });

      if (this.hasWaves)
        this.s = new Wave(this._map, { type: "s", center: this.epicenter.toLngLatArray(), radius: 0, icon: false });

      if (this.hasWaves) {
        this._waveSpeed = { p: 7, s: 4 };

        this._waveTick = () => {
          const apiTime = this._map.serverTimestamp + Date.now() - this._map.localServerTimestamp;

          let p_dist = Math.floor(Math.sqrt(((apiTime - this.eventTime.getTime()) * this._waveSpeed.p) ** 2 - (this.depth * 1000) ** 2));
          let s_dist = Math.floor(Math.sqrt(((apiTime - this.eventTime.getTime()) * this._waveSpeed.s) ** 2 - (this.depth * 1000) ** 2));

          let pf, sf;

          for (let _i = 1; _i < this._distance.length; _i++) {
            if (!pf && this._distance[_i].Ptime > (apiTime - this.eventTime.getTime()) / 1000) {
              p_dist = (_i - 1) * 1000;

              if ((_i - 1) / this._distance[_i - 1].Ptime > this._waveSpeed.p)
                p_dist = Math.round(Math.sqrt(((apiTime - this.eventTime.getTime()) * this._waveSpeed.p) ** 2 - (this.depth * 1000) ** 2));
              pf = true;
            }

            if (!sf && this._distance[_i].Stime > (apiTime - this.eventTime.getTime()) / 1000) {
              s_dist = (_i - 1) * 1000;

              if ((_i - 1) / this._distance[_i - 1].Stime > this._waveSpeed.s)
                s_dist = Math.round(Math.sqrt(((apiTime - this.eventTime.getTime()) * this._waveSpeed.s) ** 2 - (this.depth * 1000) ** 2));
              sf = true;
            }

            if (pf && sf) break;
          }

          p_dist /= 1000;
          s_dist /= 1000;

          if (p_dist > this.depth)
            this.p.setRadius(p_dist - this.depth);

          if (s_dist > this.depth)
            this.s.setRadius(s_dist - this.depth);
        };

        this._waveTick();
        this._waveInterval = setInterval(this._waveTick, 500);
      }
    }
  }

  update(data) {
    this.#fromJson(data);
  }
}

export default EEW;