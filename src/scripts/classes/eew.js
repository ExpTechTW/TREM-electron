import region from "../../assets/json/region.json";
import Distance from "../helpers/distance";
import calcPGA from "../helpers/pga";

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
    this.source = (data.type == "eew-cwb") ? "中央氣象局" : (data.type == "eew-nied") ? "日本防災科研" : (data.type == "eew-jma") ? "日本氣象廳" : (data.type == "eew-kma") ? "韓國氣象廳" : (data.type == "eew-fjdzj") ? "中國福建省地震局" : (data.type == "eew-scdzj") ? "中國四川省地震局" : "未知單位";

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

  update(data) {
    this.#fromJson(data);
  }
}

export default EEW;