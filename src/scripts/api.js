const { renderRtsData } = require("./helpers/map");
const { v4 } = require("uuid");
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
      fetch("https://exptech.com.tw/api/v3/earthquake/reports", {
        method  : "GET",
        headers : {
          Accept         : "application/json",
          "Content-Type" : "application/json",
        }
      }).then((res) => {
        if (res.ok)
          resolve(res.json());
        else
          reject(`${res.status} ${res.statusText}`);
      });
    });
  }
}
module.exports = api;