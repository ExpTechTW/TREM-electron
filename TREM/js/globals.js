const $ = require("jquery");
const { app } = require("@electron/remote");
const fs = require("node:fs");
const { ipcMain } = require("@electron/remote");
const { ipcRenderer } = require("electron");
const path = require("node:path");

const DEFAULT_CONFIG = {
	"general.locale": {
		"type"  : "SelectBox",
		"value" : "zh-TW",
	},
	"accept.eew.CWB": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"accept.eew.NIED": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"accept.eew.JMA": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"accept.eew.KMA": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"accept.eew.SCDZJ": {
		"type"  : "CheckBox",
		"value" : true,
	},
	"accept.eew.FJDZJ": {
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
	"compatibility.hwaccel": {
		"type"  : "CheckBox",
		"value" : true,
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
			"username"   : "TREM | 臺灣即時地震監測",
			"avatar_url" : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
			"embeds"     : [
				{
					"author": {
						"name": "TREM | 臺灣即時地震監測",
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

/**
 * 設定檔路徑
 * @type {string}
 */
const CONFIG_PATH = path.join(app.getPath("userData"), "settings.json");

if (!fs.existsSync(CONFIG_PATH))
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(Object.keys(DEFAULT_CONFIG).reduce((acc, key) => {
		acc[key] = DEFAULT_CONFIG[key].value;
		return acc;
	}, {}), null, 2), "utf8");

/**
 * 設定
 * @type {string}
 */
let CONFIG, settingDisabled = false;
try {
	CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" }));
} catch (err) {
	CONFIG = {};
	settingDisabled = err;
}

// Synchronize config
for (let i = 0, k = Object.keys(DEFAULT_CONFIG), n = k.length; i < n; i++)
	if (typeof CONFIG[k[i]] != typeof DEFAULT_CONFIG[k[i]].value && k[i] != "ver")
		CONFIG[k[i]] = DEFAULT_CONFIG[k[i]].value;
ipcRenderer.send("saveSetting", CONFIG);
setThemeColor(CONFIG["theme.color"], CONFIG["theme.dark"]);
setLocale(CONFIG["general.locale"]);

fs.watch(CONFIG_PATH, () => {
	try {
		const data = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
		if (data == JSON.stringify(CONFIG, null, 2)) return;
		const newConfig = JSON.parse(data);

		// 位置變更
		if (newConfig["location.city"] != CONFIG["location.city"] || newConfig["location.town"] != CONFIG["location.town"])
			ipcRenderer.send("updateLocation", { city: newConfig["location.city"], town: newConfig["location.town"] });

		// 主題變更
		if (newConfig["theme.color"] != CONFIG["theme.color"] || newConfig["theme.dark"] != CONFIG["theme.dark"]) {
			setThemeColor(newConfig["theme.color"], newConfig["theme.dark"]);
			ipcRenderer.send("updateTheme", { color: newConfig["theme.color"], dark: newConfig["theme.dark"] });
		}

		// 語言變更
		if (newConfig["general.locale"] != CONFIG["general.locale"]) {
			setLocale(newConfig["general.locale"]);
			ipcRenderer.send("updateTitle", newConfig["general.locale"]);
		}

		CONFIG = newConfig;
		settingDisabled = false;
		if (document.getElementsByClassName("dialog").length)
			closeDialog({ target: { id: "dialog" } });
	} catch (err) {
		settingDisabled = err;
		showDialog("error", { en: "Parse Error", ja: "解析エラー", "zh-TW": "設定檔錯誤" }[CONFIG["general.locale"]],
			{
				en      : `Cannot parse the config file, this may be that you have accidentally deleted some important symbols such as commas, colons or quotation marks while editing, or the configuration file may have corrupted.\n\nError: ${err}`,
				ja      : `設定ファイルを解析できません。編集中にコンマ、コロン、引用符などの重要な記号を誤って削除したか、設定ファイルが破損している可能性があります。\n\nエラー：${err}`,
				"zh-TW" : `無法解析設定檔，這可能是你在編輯時不小心刪掉了一些重要的符號，像是逗號、冒號或引號，或是設定檔損壞。\n\n錯誤：${err}` }[CONFIG["general.locale"]]);
	}
	ipcRenderer.send("updateSetting");
});

ipcMain.on("saveSetting", (event, setting) => {
	if (!setting || settingDisabled) return;
	dump({ level: 0, message: "Saving user preference", origin: "Setting" });
	try {
		fs.rmSync(CONFIG_PATH);
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2), { encoding: "utf-8", flag: "w" });
	} catch (error) {
		dump({ level: 2, message: `Error saving user preference: ${error}`, origin: "Setting" });
	}

});

const lockScroll = state => {
	if (state)
		$(document).off("scroll", () => window.scrollTo(0, 0));
	else
		$(document).off("scroll");
};

const closeDialog = event => {
	const container = document.getElementById("modal-overlay");
	if (!event.target.id.includes("dialog"))
		if (event.target != container)
			return;
	lockScroll(false);
	$("#modal-overlay").fadeOut({ duration: 100, complete: () => container.replaceChildren() }).delay(100).show();
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
 * @param {?string} customIcon The icon of the dialog
 * @param {?dialogCallback} callback The callback function to run when the user omitted the dialog
 */
(type, title, message, button = 0, customIcon, callback = () => void 0) => {
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

	const buttons = document.createElement("div");
	buttons.classList.add("dialog-button");
	if (button == 1) {
		const Accept = document.createElement("button");
		Accept.classList.add("flat-button");
		Accept.id = "dialog-Accept";
		Accept.textContent = { en: "Confirm", ja: "確認", "zh-TW": "確定" }[CONFIG["general.locale"]];
		Accept.onclick = (...args) => {
			closeDialog(...args);
			callback();
		};
		buttons.appendChild(Accept);

		const Cancel = document.createElement("button");
		Cancel.classList.add("flat-button");
		Cancel.id = "dialog-Cancel";
		Cancel.textContent = { en: "Cancel", ja: "キャンセル", "zh-TW": "取消" }[CONFIG["general.locale"]];
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


// #region override prototype
if (!Date.prototype.format)
	Date.prototype.format =
	/**
	 * Format DateTime into string with provided formatting string.
	 * @param {string} format The formatting string to use.
	 * @returns {string} The formatted string.
	 */
	function(format) {
		/**
		 * @type {Date}
		 */
		const me = this;
		return format.replace(/a|A|Z|S(SS)?|ss?|mm?|HH?|hh?|D{1,2}|M{1,2}|YY(YY)?|'([^']|'')*'/g, (str) => {
			let c1 = str.charAt(0);
			const ret = str.charAt(0) == "'"
				? (c1 = 0) || str.slice(1, -1).replace(/''/g, "'")
				: str == "a"
					? (me.getHours() < 12 ? "am" : "pm")
					: str == "A"
						? (me.getHours() < 12 ? "AM" : "PM")
						: str == "Z"
							? (("+" + -me.getTimezoneOffset() / 60).replace(/^\D?(\D)/, "$1").replace(/^(.)(.)$/, "$10$2") + "00")
							: c1 == "S"
								? me.getMilliseconds()
								: c1 == "s"
									? me.getSeconds()
									: c1 == "H"
										? me.getHours()
										: c1 == "h"
											? (me.getHours() % 12) || 12
											: c1 == "D"
												? me.getDate()
												: c1 == "m"
													? me.getMinutes()
													: c1 == "M"
														? me.getMonth() + 1
														: ("" + me.getFullYear()).slice(-str.length);
			return c1 && str.length < 4 && ("" + ret).length < str.length
				? ("00" + ret).slice(-str.length)
				: ret;
		});
	};

if (!String.prototype.format)
	String.prototype.format = function() {
		const args = arguments;
		return this.replace(/{(\d+)}/g, (match, number) => typeof args[number] != "undefined"
			? args[number]
			: match,
		);
	};
// #endregion