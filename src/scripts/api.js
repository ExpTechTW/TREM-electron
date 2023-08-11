const { v4 } = require("uuid");
const { createHash } = require("node:crypto");
const EventEmitter = require("node:events");
const WebSocket = require("ws");
const constants = require("./constants");

class api extends EventEmitter {
  constructor(key) {
    super();
    this.key = key;
    this.wsConfig = {
      uuid     : localStorage.uuid + "-rts",
      function : "subscriptionService",
      value    : ["trem-rts-v2", "trem-eew-v1"],
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

        default: {
          if (data.response == "Connection Succeeded")
            this.emit("ntp", data);

          console.log(`[API] Socket --> message: ${data.response}`);
          break;
        }
      }
    });
  }

  getReports(fetchCwb = false) {
    return new Promise((resolve, reject) => {
      caches.match(constants.API.ReportsURL)
        .then(async (response) => {
          const list = {};

          const req = async (cd, includeKey = true) => {
            const request = new Request(constants.API.ReportsURL, {
              method  : "POST",
              headers : {
                Accept         : "application/json",
                "Content-Type" : "application/json",
              },
              body: JSON.stringify({
                key: (includeKey) ? this.key : null,
                list
              })
            });

            const res = await fetch(request);

            if (res.ok) {
              const resData = await res.json();
              const dataToSave = resData.concat(cd)
                .filter((v, i, a) => a.map((r) => r.identifier).indexOf(v.identifier) == i)
                .sort((a, b) => new Date(b.originTime) - new Date(a.originTime));

              const jsonResponse = new Response(JSON.stringify(dataToSave), {
                headers: {
                  "content-type": "application/json"
                }
              });
              response = jsonResponse;

              const cache = await caches.open("reports");
              await cache.put(request.url, jsonResponse);
              dataToSave.isCache = !resData.length;
              return dataToSave;
            } else {
              cd.isCache = true;
              return cd;
            }
          };

          const cacheData = response ? await response.json() : [];

          if (cacheData.length || fetchCwb) {
            for (const report of cacheData) {
              const md5 = createHash("md5");
              list[report.identifier] = md5.update(JSON.stringify(report)).digest("hex");
            }

            req(cacheData, !fetchCwb)
              .then(resolve)
              .catch(reject);
          } else {
            this.getReports(true)
              .then((d) => req(d))
              .then(resolve)
              .catch(reject);
          }
        })
        .catch(reject);
    });
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