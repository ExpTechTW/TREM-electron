const Constants = Object.freeze({
	Default_Configurations: {
		"map.engine": {
			type  : "select",
			value : "mapbox-gl",
		},
		"map.jp": {
			type  : "toggle",
			value : false,
		},
		"map.cn": {
			type  : "toggle",
			value : false,
		},
		"map.sk": {
			type  : "toggle",
			value : false,
		},
		"map.nk": {
			type  : "toggle",
			value : false,
		},
		"map.ph": {
			type  : "toggle",
			value : false,
		},
		"map.NZ": {
			type  : "toggle",
			value : false,
		},
		"map.in": {
			type  : "toggle",
			value : false,
		},
		"map.TU": {
			type  : "toggle",
			value : false,
		},
		"map.ta": {
			type  : "toggle",
			value : false,
		},
		"map.pa": {
			type  : "toggle",
			value : false,
		},
		"map.va": {
			type  : "toggle",
			value : false,
		},
		"map.ec": {
			type  : "toggle",
			value : false,
		},
		"map.af": {
			type  : "toggle",
			value : false,
		},
		"general.locale": {
			type  : "select",
			value : "zh-TW",
		},
		"accept.eew.CWB": {
			type  : "toggle",
			value : true,
		},
		"accept.eew.NIED": {
			type  : "toggle",
			value : false,
		},
		"accept.eew.JMA": {
			type  : "toggle",
			value : false,
		},
		"accept.eew.KMA": {
			type  : "toggle",
			value : false,
		},
		"accept.eew.SCDZJ": {
			type  : "toggle",
			value : false,
		},
		"accept.eew.FJDZJ": {
			type  : "toggle",
			value : false,
		},
		"accept.eew.trem": {
			type  : "toggle",
			value : false,
		},
		"shock.smoothing": {
			type  : "toggle",
			value : true,
		},
		"cache.report": {
			type  : "select",
			value : "25",
		},
		"compatibility.hwaccel": {
			type  : "toggle",
			value : true,
		},
		"sleep.mode": {
			type  : "toggle",
			value : false,
		},
		"Real-time.show": {
			type  : "toggle",
			value : true,
		},
		"Real-time.cover": {
			type  : "toggle",
			value : true,
		},
		"eew.show": {
			type  : "toggle",
			value : true,
		},
		"eew.cover": {
			type  : "toggle",
			value : true,
		},
		"audio.eew": {
			type  : "toggle",
			value : true,
		},
		"audio.eew.volume": {
			type  : "range",
			value : 1,
		},
		"audio.report": {
			type  : "toggle",
			value : true,
		},
		"audio.report.volume": {
			type  : "range",
			value : 1,
		},
		"audio.realtime": {
			type  : "toggle",
			value : true,
		},
		"audio.realtime.volume": {
			type  : "range",
			value : 1,
		},
		"audio.PAlert": {
			type  : "toggle",
			value : true,
		},
		"audio.PAlert.volume": {
			type  : "range",
			value : 1,
		},
		"Real-time.station": {
			type  : "select",
			value : "L-711-6732340-12",
		},
		"Real-time.station.1": {
			type  : "select",
			value : "H-335-11339620-4",
		},
		"Real-time.station.2": {
			type  : "select",
			value : "H-979-11336952-11",
		},
		"Real-time.station.3": {
			type  : "select",
			value : "H-711-11334880-12",
		},
		"Real-time.station.4": {
			type  : "select",
			value : "H-541-11370676-10",
		},
		"Real-time.station.5": {
			type  : "select",
			value : "H-269-6126556-5",
		},
		"report.cover": {
			type  : "toggle",
			value : true,
		},
		"eew.Intensity": {
			type  : "select",
			value : "0",
		},
		"map.autoZoom": {
			type  : "toggle",
			value : true,
		},
		"map.animation": {
			type  : "toggle",
			value : false,
		},
		"checkForUpdates.Notification": {
			type  : "toggle",
			value : false,
		},
		"report.Notification": {
			type  : "toggle",
			value : false,
		},
		"intensity.Notification": {
			type  : "toggle",
			value : false,
		},
		"palert.Notification": {
			type  : "toggle",
			value : false,
		},
		"trem-eq.Notification": {
			type  : "toggle",
			value : false,
		},
		"trem-eq.alert.Notification": {
			type  : "toggle",
			value : false,
		},
		"trem-eq.alert.Notification.Intensity": {
			type  : "select",
			value : "0",
		},
		"tts.Notification": {
			type  : "toggle",
			value : false,
		},
		"trem-eew.No-Notification": {
			type  : "toggle",
			value : false,
		},
		"report.show": {
			type  : "toggle",
			value : true,
		},
		"intensity.show": {
			type  : "toggle",
			value : true,
		},
		"report.changeView": {
			type  : "toggle",
			value : true,
		},
		"report.onlycwbchangeView": {
			type  : "toggle",
			value : false,
		},
		"earthquake.siteEffect": {
			type  : "toggle",
			value : true,
		},
		"shock.p": {
			type  : "toggle",
			value : true,
		},
		"exptech.name": {
			type  : "string",
			value : "",
		},
		"exptech.email": {
			type  : "string",
			value : "",
		},
		"exptech.pass": {
			type  : "string",
			value : "",
		},
		"exptech.name.Hide": {
			type  : "toggle",
			value : true,
		},
		"exptech.email.Hide": {
			type  : "toggle",
			value : true,
		},
		"exptech.pass.Hide": {
			type  : "toggle",
			value : true,
		},
		"exptech.balance": {
			type  : "number",
			value : -1,
		},
		"api.ip.Hide": {
			type  : "toggle",
			value : true,
		},
		"webhook.url": {
			type  : "string",
			value : "",
		},
		"webhook.body": {
			type  : "string",
			value : JSON.stringify({
				username   : "TREM | 臺灣即時地震監測",
				avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
				embeds     : [
					{
						author: {
							name: "TREM | 臺灣即時地震監測",
						},
						title       : "",
						description : "%Time% 左右發生顯著有感地震\n\n東經: %EastLongitude% 度\n北緯: %NorthLatitude% 度\n深度: %Depth% 公里\n規模: %Scale%\n第%Number%報\n\n發報單位: %Provider%\n\n慎防強烈搖晃，就近避難 [趴下、掩護、穩住]",
						color       : 4629503,
						image       : {
							url: "",
						},
					},
				],
			}),
		},
		"location.city": {
			type  : "select",
			value : "臺南市",
		},
		"location.town": {
			type  : "select",
			value : "歸仁區",
		},
		"location.lat": {
			type  : "string",
			value : "",
		},
		"location.lon": {
			type  : "string",
			value : "",
		},
		"theme.color": {
			type  : "color",
			value : "#6750A4",
		},
		"theme.dark": {
			type  : "toggle",
			value : true,
		},
		"theme.customColor": {
			type  : "toggle",
			value : true,
		},
		"theme.int.0": {
			type  : "color",
			value : "#6B7979",
		},
		"theme.int.1": {
			type  : "color",
			value : "#757575",
		},
		"theme.int.2": {
			type  : "color",
			value : "#0165CC",
		},
		"theme.int.3": {
			type  : "color",
			value : "#01BB02",
		},
		"theme.int.4": {
			type  : "color",
			value : "#EBC000",
		},
		"theme.int.5": {
			type  : "color",
			value : "#FF8400",
		},
		"theme.int.6": {
			type  : "color",
			value : "#E06300",
		},
		"theme.int.7": {
			type  : "color",
			value : "#FF0000",
		},
		"theme.int.8": {
			type  : "color",
			value : "#B50000",
		},
		"theme.int.9": {
			type  : "color",
			value : "#68009E",
		},
		"windows.startup": {
			type  : "toggle",
			value : true,
		},
		"windows.minimize": {
			type  : "toggle",
			value : false,
		},
		"windows.tray": {
			type  : "toggle",
			value : true,
		},
		"update.mode": {
			type  : "choice",
			value : "notify",
		},
		"update.time": {
			type  : "select",
			value : "1",
		},
		"api.key": {
			type  : "string",
			value : "",
		},
		"api.key.Hide": {
			type  : "toggle",
			value : true,
		},
		"dev.mode": {
			type  : "toggle",
			value : false,
		},
		"nav.ui.autoclose": {
			type  : "toggle",
			value : true,
		},
	},
	intensities: [
		{ value: 0, label: "0", get text() {
			return TREM.Localization.getString("Intensity_Zero");
		} },
		{ value: 1, label: "1", get text() {
			return TREM.Localization.getString("Intensity_One");
		} },
		{ value: 2, label: "2", get text() {
			return TREM.Localization.getString("Intensity_Two");
		} },
		{ value: 3, label: "3", get text() {
			return TREM.Localization.getString("Intensity_Three");
		} },
		{ value: 4, label: "4", get text() {
			return TREM.Localization.getString("Intensity_Four");
		} },
		{ value: 5, label: "5-", get text() {
			return TREM.Localization.getString("Intensity_Five_Weak");
		} },
		{ value: 6, label: "5+", get text() {
			return TREM.Localization.getString("Intensity_Five_Strong");
		} },
		{ value: 7, label: "6-", get text() {
			return TREM.Localization.getString("Intensity_Six_Weak");
		} },
		{ value: 8, label: "6+", get text() {
			return TREM.Localization.getString("Intensity_Six_Strong");
		} },
		{ value: 9, label: "7", get text() {
			return TREM.Localization.getString("Intensity_Seven");
		} },
	],
});

module.exports = Constants;