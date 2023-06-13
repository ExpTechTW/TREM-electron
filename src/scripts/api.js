const { renderRtsData } = require("./helpers/map");
const { v4 } = require("uuid");
const { createHash } = require("node:crypto");
const EventEmitter = require("node:events");
const WebSocket = require("ws");
const constants = require("./constants");

class api extends EventEmitter {
  constructor(key, map) {
    super();
    this.key = key;
    this.map = map;
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
          renderRtsData(data.raw, this.map);
          break;
        }

        case "ntp":break;

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
      caches.match("https://exptech.com.tw/api/v3/earthquake/reports")
        .then(async (response) => {
          const list = {};

          const data = response ? await response.json() : [];

          if (data.length)
            for (const report of data) {
              const md5 = createHash("md5");
              list[report.identifier] = md5.update(JSON.stringify(report)).digest("hex");
            }


          const request = new Request("https://exptech.com.tw/api/v3/earthquake/reports", {
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

              console.log(resData, dataToSave);
              caches
                .open("reports")
                .then((cache) => {
                  cache
                    .put(request.url, jsonResponse)
                    .then(() => resolve(res));
                });
            } else {
              reject(`${res.status} ${res.statusText}`);
            }
          });
        });
    });
  }
}
module.exports = api;