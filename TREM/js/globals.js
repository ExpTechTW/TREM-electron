const $ = require("jquery");
const { app } = require("@electron/remote");
const fs = require("node:fs");
const { ipcMain } = require("@electron/remote");
const { ipcRenderer } = require("electron");
const { join } = require("node:path");

/**
 * 設定檔路徑
 * @type {string}
 */
const CONFIG_PATH = join(app.getPath("userData"), "settings.json");
if (!fs.existsSync(CONFIG_PATH))
	fs.writeFileSync(CONFIG_PATH, "{}", "utf8");

/**
 * 設定
 * @type {string}
 */
let CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH).toString());

const DEFAULT_CONFIG = {
	"accept.eew.jp": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"shock.smoothing": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"auto.waveSpeed": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"earthquake.Real-time": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"GPU.disable": {
		"type"  : "CheckBox",
		"value" : false,
	},
	"Real-time.show": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"Real-time.cover": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"eew.show": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"eew.cover": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"eew.audio": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"report.audio": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"Real-time.audio": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"Real-time.station": {
		"type"  : "SelectBox",
		"value" : "L-711-6732340-12",
	},
	"report.cover": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"eew.Intensity": {
		"type"  : "SelectBox",
		"value" : "0",
	},
	"map.autoZoom": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"report.show": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"earthquake.siteEffect": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"shock.p": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"webhook.url": {
		"type"  : "TextBox",
		"value" : "",
	},
	"webhook.body": {
		"type"  : "TextBox",
		"value" : JSON.stringify({
			"username"   : "TREM | 台灣實時地震監測",
			"avatar_url" : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
			"embeds"     : [
				{
					"author": {
						"name": "TREM | 台灣實時地震監測",
					},
					"title"       : "",
					"description" : "%Time% 左右發生顯著有感地震\n\n東經: %EastLongitude% 度\n北緯: %NorthLatitude% 度\n深度: %Depth% 公里\n規模: %Scale%\n\n發報單位: %Government%\n\n慎防強烈搖晃，就近避難 [趴下、掩護、穩住]",
					"color"       : 4629503,
					"image"       : {
						"url": "",
					},
				},
			],
		}),
	},
	"location.city": {
		"type"  : "SelectBox",
		"value" : "臺南市",
	},
	"location.town": {
		"type"  : "SelectBox",
		"value" : "歸仁區",
	},
	"theme.color": {
		"type"  : "ColorBox",
		"value" : "#6750A4",
	},
	"theme.dark": {
		"type"  : "CheckBox",
		"value" : true,
	},
};

// Synchronize config
for (let i = 0, k = Object.keys(DEFAULT_CONFIG), n = k.length; i < n; i++)
	if (typeof CONFIG[k[i]] != typeof DEFAULT_CONFIG[k[i]].value)
		CONFIG[k[i]] = DEFAULT_CONFIG[k[i]].value;
ipcRenderer.send("saveSetting", CONFIG);
setThemeColor(CONFIG["theme.color"], CONFIG["theme.dark"]);

ipcMain.on("saveSetting", (event, newSetting) => {
	dump({ level: 0, message: "Saving user preference", origin: "Setting" });
	try {
		CONFIG = newSetting;
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2), "utf8");
	} catch (error) {
		dump({ level: 2, message: `Error saving user preference: ${error}`, origin: "Setting" });
	}
	return;
});