const { v4 } = require("uuid");
const { createHash } = require("node:crypto");
const EventEmitter = require("node:events");
const WebSocket = require("ws");
const constants = require("./constants");
const dgram = require("node:dgram");

class api extends EventEmitter {
  constructor(key) {
    super();
    this.key = key;
    this.wsConfig = {
      uuid     : `TREM/v${constants.AppVersion} (${localStorage.uuid})`,
      function : "subscriptionService",
      value    : ["trem-rts-v2", "trem-eew-v1", "report-v1", "tsunami-v1"],
      key      : this.key,
    };
    this.initWebSocket();
  }

  get key() {
    return this._key;
  }

  set key(value) {
    this._key = value;

    if (this.ws instanceof WebSocket)
      if (this.ws.readyState == this.ws.OPEN) {
        if (!localStorage.uuid)
          localStorage.setItem("uuid", v4());

        this.ws.send(JSON.stringify(this.wsConfig));
      }
  }

  initWebSocket() {
    this.ws = new WebSocket(constants.WebSocketTargetUrl);

    this.ws.once("open", () => {
      if (this.ws.readyState == this.ws.OPEN) {
        console.debug("[API] Socket --> open");

        if (!localStorage.uuid)
          localStorage.setItem("uuid", v4());

        this.ws.send(JSON.stringify(this.wsConfig));
      }
    });

    this.ws.once("close", () => {
      console.debug("[API] Socket --> close");
      this.ws.removeAllListeners();
      delete this.ws;

      this.initWebSocket();
    });

    this.ws.on("message", (raw) => {
      const data = JSON.parse(raw);

      switch (data.type) {
        case "trem-rts": {
          this.emit("rts", data.raw);
          break;
        }

        case "ntp": {
          this.emit("ntp", data);
          break;
        }

        case constants.Events.Report: {
          this.emit(constants.Events.Report, data);
          break;
        }

        default: {
          if (data.response == "Connection Succeeded")
            this.emit("ntp", data);

          console.debug("[API] Socket --> message", data);
          break;
        }
      }
    });
  }

  async getReports(fetchCwb = false) {
    const url = `${constants.API.ReportsURL}?${new URLSearchParams({ key: fetchCwb ? this.key : "", limit: 50 })}`;

    const res = await fetch(url);

    if (!res.ok)
      throw Error(`API Responded with ${res.status}.`);

    /** @type {Array} */
    let data = await res.json();

    const cacheResponse = await caches.match(url);

    if (cacheResponse) {
      const cacheData = await cacheResponse.json();

      data = [...cacheData, ...data];
    }

    data
      .filter((v, i, a) => a.map((r) => r.identifier).indexOf(v.identifier) == i)
      .sort((a, b) => new Date(b.originTime) - new Date(a.originTime));

    const jsonResponse = new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json"
      }
    });

    await (await caches.open("reports")).put(url, jsonResponse);

    return data;
  }

  getRts(time, force = false) {
    return new Promise((resolve, reject) => {
      if (!Number.isInteger(time))
        reject(new TypeError("Expected to receive a number."));

      const url = `${constants.API.RtsURL}?${new URLSearchParams({ time })}`;
      caches.open("rts")
        .then((cache) => {
          cache.match(url).then((response) => {
            if (!force && response != undefined)
              response
                .json()
                .then(resolve);
            else
              fetch(url).then(async (res) => {
                if (res.ok) {
                  const resData = await res.json();

                  const jsonResponse = new Response(JSON.stringify(resData), {
                    headers: {
                      "content-type": "application/json"
                    }
                  });

                  cache.put(url, jsonResponse);
                  resolve(resData);
                } else {
                  reject(new Error(`The server responded with ${res.status}.`));
                }
              });
          });
        });
    });
  }

  getEarthquake(time, type = "all", force = false) {
    return new Promise((resolve, reject) => {
      if (!Number.isInteger(time))
        reject(new TypeError("Expected to receive a number."));

      const url = `${constants.API.EarthquakeURL}?${new URLSearchParams({ time, type })}`;
      caches.open("earthquake")
        .then((cache) => {
          cache.match(url).then((response) => {
            if (!force && response != undefined)
              response
                .json()
                .then(resolve);
            else
              fetch(url).then(async (res) => {
                if (res.ok) {
                  const resData = await res.json();

                  const jsonResponse = new Response(JSON.stringify(resData), {
                    headers: {
                      "content-type": "application/json"
                    }
                  });

                  cache.put(url, jsonResponse);
                  resolve(resData);
                } else {
                  reject(new Error(`The server responded with ${res.status}.`));
                }
              });
          });
        });
    });
  }

  requestReplay(ids) {
    for (const id of ids) {
      const data = {
        method  : "POST",
        headers : { "content-type": "application/json" },
        body    : JSON.stringify({
          uuid: localStorage.uuid,
          id,
        }),
      };
      fetch(constants.API.ReplayURL, data)
        .then(() => console.log("posted", id))
        .catch((err) => {
          console.error(err);
        });
    }
  }
}
module.exports = api;