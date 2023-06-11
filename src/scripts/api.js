const EventEmitter = require("node:events");
const WebSocket = require("ws");
const constants = require("./constants");
const { renderRtsData } = require("./helpers/map");

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

        const config = {
          uuid     : localStorage.UUID + "-rts",
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
}
module.exports = api;