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
					"description" : "%Time% 左右發生顯著有感地震\n\n東經: %EastLongitude% 度\n北緯: %NorthLatitude% 度\n深度: %Depth% 公里\n規模: %Scale%\n\n發報單位: %Provider%\n\n慎防強烈搖晃，就近避難 [趴下、掩護、穩住]",
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

const lockScroll = state => {
	if (state)
		$(document).off("scroll", () => window.scrollTo(0, 0));
	else
		$(document).off("scroll");
};

const showDialog =
/**
 * Callback for dialogs
 * @callback dialogCallback
 */
/**
 * Shows a dialog
 * @param {"success" | "warn" | "error"} type The dialog type, ignored whenm customIcon is set
 * @param {string} title The title of the dialog
 * @param {string} message The supporting text of the dialog
 * @param {0|1} button Button type of the dialog
 * @param {string} customIcon The icon of the dialog
 * @param {dialogCallback} callback The callback function to run when the user omitted the dialog
 */
(type, title, message, button = 0, customIcon, callback) => {
	const container = document.getElementById("modal-overlay");
	const icon = document.createElement("span");
	icon.classList.add("material-symbols-rounded");
	icon.classList.add("dialog-icon");
	icon.textContent = customIcon != undefined ? customIcon : (type == "success" ? "check" : (type == "warn" ? "warning" : "error"));

	const headline = document.createElement("span");
	headline.classList.add("dialog-headline");
	headline.textContent = title;

	const supportingText = document.createElement("span");
	supportingText.classList.add("dialog-supportText");
	supportingText.innerHTML = message;

	const dialog = document.createElement("div");
	dialog.classList.add("dialog");

	const closeDialog = event => {
		if (!event.target.id.includes("dialog"))
			if (event.target != container)
				return;
		lockScroll(false);
		$("#modal-overlay").fadeOut({ duration: 100, complete: () => container.replaceChildren() }).delay(100).show();
	};

	const buttons = document.createElement("div");
	buttons.classList.add("dialog-button");
	if (button == 1) {
		const Accept = document.createElement("button");
		Accept.classList.add("flat-button");
		Accept.id = "dialog-Accept";
		Accept.textContent = "確定";
		Accept.onclick = (...args) => {
			closeDialog(...args);
			callback();
		};
		buttons.appendChild(Accept);

		const Cancel = document.createElement("button");
		Cancel.classList.add("flat-button");
		Cancel.id = "dialog-Cancel";
		Cancel.textContent = "取消";
		Cancel.onclick = closeDialog;
		buttons.appendChild(Cancel);
	} else {
		const OK = document.createElement("button");
		OK.classList.add("flat-button");
		OK.id = "dialog-OK";
		OK.textContent = "OK";
		OK.onclick = closeDialog;
		buttons.appendChild(OK);
	}

	dialog.appendChild(icon);
	dialog.appendChild(headline);
	dialog.appendChild(supportingText);
	dialog.appendChild(buttons);
	container.appendChild(dialog);
	container.onclick = closeDialog;

	$("#modal-overlay").fadeIn(50);

	buttons.querySelector(":last-child").contentEditable = true;
	buttons.querySelector(":last-child").focus();
	buttons.querySelector(":last-child").contentEditable = false;
	lockScroll(true);
};