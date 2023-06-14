const { renderRtsData } = require("./helpers/map");
const { v4 } = require("uuid");
const { createHash } = require("node:crypto");
const EventEmitter = require("node:events");
const WebSocket = require("ws");
const constants = require("./constants");

class api extends EventEmitter {
  constructor(key) {
    super();
    this.key = key;
    this.initWebSocket();
  }

  initWebSocket() {
    this.ws = new WebSocket(constants.WebSocketTargetUrl);

    this.ws.once("open", () => {
      if (this.ws.readyState == this.ws.OPEN) {
        console.debug("socket opened");

        if (!localStorage.uuid)
          localStorage.setItem("uuid", v4());

        const config = {
          uuid     : localStorage.uuid + "-rts",
          function : "subscriptionService",
          value    : ["trem-rts-v2", "trem-eew-v1"],
          key      : this.key,
        };

        this.ws.send(JSON.stringify(config));
      }
    });

    this.ws.once("close", () => {
      console.debug("socket closed");
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

        case "ntp": break;

        default: {
          console.log(data.response);
          break;
        }
      }

      console.log();
    });
  }

  getReports() {
    return new Promise((resolve, reject) => {
      caches.match(constants.API.ReportsURL)
        .then(async (response) => {
          const list = {};

          const data = response ? await response.json() : [];

          if (data.length)
            for (const report of data) {
              const md5 = createHash("md5");
              list[report.identifier] = md5.update(JSON.stringify(report)).digest("hex");
            }


          const request = new Request(constants.API.ReportsURL, {
            method  : "POST",
            headers : {
              Accept         : "application/json",
              "Content-Type" : "application/json",
            },
            body: JSON.stringify({
              key: this.key,
              list
            })
          });

          fetch(request).then(async (res) => {
            if (res.ok) {
              const resData = await res.json();
              const dataToSave = data.concat(resData).filter((v, i, a) => a.map((r) => r.identifier).indexOf(v.identifier) == i);
              const jsonResponse = new Response(JSON.stringify(dataToSave), {
                headers: {
                  "content-type": "application/json"
                }
              });

              caches
                .open("reports")
                .then((cache) => {
                  cache.put(request.url, jsonResponse)
                    .then(() => cache.match(request.url))
                    .then((r) => r.json())
                    .then((r) => {
                      r.isCache = !resData.length;
                      resolve(r);
                    });
                });
            } else {
              data.isCache = true;
              resolve();
            }
          });
        });
    });
  }
}
module.exports = api;