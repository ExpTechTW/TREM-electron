module.exports = Object.freeze({
  WebSocketTargetUrl : "wss://exptech.com.tw/api",
  FCMSenderId        : "583094702393",
  API                : {
    ReportsURL: "https://exptech.com.tw/api/v3/earthquake/reports"
  },
  Intensities: [
    { value: 0, label: "0", text: "０級" },
    { value: 1, label: "1", text: "１級" },
    { value: 2, label: "2", text: "２級" },
    { value: 3, label: "3", text: "３級" },
    { value: 4, label: "4", text: "４級" },
    { value: 5, label: "5-", text: "５弱" },
    { value: 6, label: "5+", text: "５強" },
    { value: 7, label: "6-", text: "６弱" },
    { value: 8, label: "6+", text: "６強" },
    { value: 9, label: "7", text: "７級" }
  ],
  Magnitudes: [
    "極微地震",
    "微小地震",
    "輕微地震",
    "中等地震",
    "強烈地震",
    "重大地震",
    "極大地震"
  ],
  Depths: [
    "極淺層地震",
    "淺層地震",
    "中層地震",
    "深層地震"
  ],
  TaiwanBounds : [[119.4, 25.35], [122.22, 21.9]],
  PixelRatio   : 98.5,
  Views        : {
    Reports     : "reports",
    Forecast    : "forecast",
    Temperature : "temperature",
    AQI         : "aqi",
    Settings    : "settings"
  }
});