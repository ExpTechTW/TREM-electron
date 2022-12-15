const $ = require("jquery");
const EventEmitter = require("node:events");
const { app } = require("@electron/remote");
const fs = require("node:fs");
const { ipcMain } = require("@electron/remote");
const { ipcRenderer } = require("electron");
const path = require("node:path");

const TREM = new EventEmitter();
let setting, is_setting_disabled;

TREM.Resources = require(path.resolve(app.getAppPath(), "./Resources/Resources.js"));

ipcRenderer.on("setting", (event, data) => {
	setting = data;
	is_setting_disabled = false;
});

ipcRenderer.once("setting", (event, data) => {
	TREM.Localization = new (require(path.resolve(app.getAppPath(), "./Localization/Localization.js")))(setting["general.locale"], window.navigator.language);
	init();
	setThemeColor(data["theme.color"], data["theme.dark"]);
	ipcRenderer.emit("config:color", data["theme.customColor"]);
	setLocale(data["general.locale"]);
});

ipcRenderer.on("config:theme", (event, value) => {
	setThemeColor(value);
});

ipcRenderer.on("config:dark", (event, value) => {
	setThemeColor(value);
});

ipcRenderer.on("config:locale", (event, value) => {
	TREM.Localization.setLocale(value);
	setLocale(value);
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

const showDialog

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
= (type, title, message, button = 0, customIcon, callback = () => void 0) => {
	const container = document.getElementById("modal-overlay");
	const icon = document.createElement("span");
	icon.classList.add("material-symbols-rounded");
	icon.classList.add("dialog-icon");
	icon.textContent = customIcon != undefined ? customIcon
		: (
			type == "success" ? "check"
				: (type == "warn" ? "warning"
					: "error")
		);

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
		Accept.textContent = TREM.Localization.getString("Dialog_Button_Confirm");

		Accept.onclick = (...args) => {
			closeDialog(...args);
			callback();
		};

		buttons.appendChild(Accept);

		const Cancel = document.createElement("button");
		Cancel.classList.add("flat-button");
		Cancel.id = "dialog-Cancel";
		Cancel.textContent = TREM.Localization.getString("Dialog_Button_Cancel");
		Cancel.onclick = closeDialog;
		buttons.appendChild(Cancel);
	} else {
		const OK = document.createElement("button");
		OK.classList.add("flat-button");
		OK.id = "dialog-OK";
		OK.textContent = TREM.Localization.getString("Dialog_Button_OK");
		OK.onclick = closeDialog;

		OK.onclick = (...args) => {
			closeDialog(...args);
			callback();
		};

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
	Date.prototype.format

	/**
	 * Format DateTime into string with provided formatting string.
	 * @param {string} format The formatting string to use.
	 * @returns {string} The formatted string.
	 */
	= function(format) {

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