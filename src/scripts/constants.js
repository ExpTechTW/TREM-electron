module.exports = Object.freeze({
  AppVersion         : "0.0.1",
  WebSocketTargetUrl : "wss://exptech.com.tw/api",
  FCMSenderId        : "583094702393",
  API                : {
    RtsURL     : "https://exptech.com.tw/api/v3/trem/rts",
    ReportsURL : "https://exptech.com.tw/api/v3/earthquake/reports",
    ReplayURL  : "https://exptech.com.tw/api/v1/trem/replay"
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
  Events: {
    Report  : "report",
    TremEew : "trem-eew",
    CwbEew  : "eew-cwb",
    Rts     : "rts",
    Ntp     : "ntp",
  },
  Sources: {
    "eew-cwb"   : "中央氣象局",
    "eew-nied"  : "日本防災科研",
    "eew-jma"   : "日本氣象廳",
    "eew-kma"   : "韓國氣象廳",
    "eew-fjdzj" : "中國福建省地震局",
    "eew-scdzj" : "中國四川省地震局",
    "trem-eew"  : "TREM 地震預警"
  },
  Models: {
    EEW     : "強震即時警報",
    TREMEEW : "TREM 地震預警",
    PLUM    : "PLUM 法",
    NSSPE   : "NSSPE",
  },
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
  PixelRatio   : 197.1,
  Views        : {
    Reports     : "reports",
    Report      : "report",
    Forecast    : "forecast",
    Temperature : "temperature",
    AQI         : "aqi",
    Settings    : "settings"
  },
  DefaultSettings: {
    ApiKey               : "",
    RtsMode              : "i",
    HideStationEEW       : "true",
    HideStationReport    : "true",
    MapAnimation         : "true",
    ReportShowCWB        : "true",
    ReportShowTYA        : "false",
    ReportTitleStyle     : "3",
    ReportCount          : "50",
    ReportPanelDocking   : "false",
    ViewSwitchReport     : "true",
    AudioPlayUpdate      : "true",
    AudioPlayUpdateNSSPE : "false",
    AudioUpdateVolume    : "40",
    AudioPlayEEW         : "true",
    AudioEEWVolume       : "60",
    AudioEEWTREMVolume   : "80",
    AudioEEWCWBVolume    : "100",
    AudioPlayReport      : "true",
    AudioReportVolume    : "60",
    AudioPlayInt0        : "true",
    AudioInt0Volume      : "60",
    AudioPlayInt1        : "true",
    AudioInt1Volume      : "70",
    AudioPlayInt2        : "true",
    AudioInt2Volume      : "80"
  }
});