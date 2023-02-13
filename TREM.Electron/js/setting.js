const { getCurrentWindow, shell } = require("@electron/remote");
const axios = require("axios");
const os = require("node:os");
const win = getCurrentWindow();
TREM.Constants = require(path.resolve(__dirname, "../Constants/Constants.js"));

document.onreadystatechange = () => {
	if (document.readyState == "complete")
		handleWindowControls();
};

window.onbeforeunload = async () => {
	await $(document.body).fadeOut(100).promise();
	win.removeAllListeners();
	win.destroy();
};

function handleWindowControls() {
	// Make minimise/maximise/restore/close buttons work when they are clicked
	document.getElementById("min-button").addEventListener("click", () => {
		win.minimize();
	});

	document.getElementById("max-button").addEventListener("click", () => {
		win.maximize();
	});

	document.getElementById("restore-button").addEventListener("click", () => {
		win.unmaximize();
	});

	document.getElementById("close-button").addEventListener("click", () => {
		win.close();
	});

	toggleMaxRestoreButtons();
	win.on("maximize", toggleMaxRestoreButtons);
	win.on("unmaximize", toggleMaxRestoreButtons);

	function toggleMaxRestoreButtons() {
		if (win.isMaximized())
			document.body.classList.add("maximized");
		else
			document.body.classList.remove("maximized");
	}
}

document.getElementById("client-version").innerText = `${app.getVersion()}`;
document.getElementById("client-os").innerText = `${os.version()} (${os.release()})`;
document.getElementById("client-uuid").title = `${localStorage.UUID}`;

const openURL = url => {
	shell.openExternal(url);
};

ipcRenderer.on("setting", (event, data) => {
	if (document.getElementsByClassName("dialog").length)
		closeDialog({ target: { id: "dialog" } });
});

ipcMain.on("RTSUnlock", (event, Unlock) => {
	if (Unlock) {
		document.getElementById("RTSUnlock").classList.remove("hide");
		document.getElementById("RTSUnlock1").classList.remove("hide");
	} else {
		document.getElementById("RTSUnlock").classList.add("hide");
		document.getElementById("RTSUnlock1").classList.add("hide");
	}
});

ipcRenderer.on("settingError", (event, error) => {
	is_setting_disabled = error;
	showDialog(
		"error",
		Localization[setting["general.locale"]]?.Setting_Dialog_Error_Title || Localization["zh-TW"].Setting_Dialog_Error_Title,
		(Localization[setting["general.locale"]]?.Setting_Dialog_Error_Description || Localization["zh-TW"].Setting_Dialog_Error_Description).format(error),
	);
	init();
});

let station;

/**
 * 初始化設定
 */
function init() {
	dump({ level: 0, message: "Initializing", origin: "Setting" });

	if (is_setting_disabled) {
		win.flashFrame(true);
		document.querySelectorAll(".setting-button").forEach((node) => node.disabled = true);
		document.body.classList.add("settingDisabled");
	} else {
		win.flashFrame(false);
		document.querySelectorAll(".setting-button").forEach((node) => node.disabled = false);
		document.body.classList.remove("settingDisabled");
	}

	const utc = new Date();
	const NOW = new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000 + 60 * 60 * 8 * 1000);
	const now = new Date(NOW.getTime() - 20000);
	const Now = now.getFullYear()
	+ "-" + (now.getMonth() + 1)
	+ "-" + now.getDate()
	+ " " + now.getHours()
	+ ":" + now.getMinutes()
	+ ":" + now.getSeconds();
	document.getElementById("Time").value = Now;
	const now1 = new Date(NOW.getTime());
	const Now1 = now1.getFullYear()
	+ "-" + (now1.getMonth() + 1)
	+ "-" + now1.getDate()
	+ " " + now1.getHours()
	+ ":" + now1.getMinutes()
	+ ":" + now1.getSeconds();
	document.getElementById("TimeStamp").value = Now1;

	Object.keys(setting).forEach(id => {
		switch (TREM.Constants.Default_Configurations[id].type) {
			case "toggle": {
				const element = document.getElementById(id);

				if (element) {
					element.checked = setting[id];

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;

					if (id == "theme.customColor")
						if (setting[id])
							$("#intensity-palette-container").removeClass("hide");
						else
							$("#intensity-palette-container").addClass("hide");

					if (id == "api.key.Hide")
						if (setting[id])
							document.getElementById("api.key").type = "password";
						else
							document.getElementById("api.key").type = "text";
				}

				if (id == "dev.mode")
					if (setting[id])
						document.getElementById("Test").classList.remove("hide");
					else
						document.getElementById("Test").classList.add("hide");
				break;
			}

			case "string": {
				const element = document.getElementById(id);

				if (element) {
					// if (id == "api.key")
					// 	element.placeholder = "•".repeat(setting[id].length);
					// else
					element.value = setting[id];

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			case "select": {

				/**
				 * @type {HTMLSelectElement}
				 */
				const element = document.getElementById(id);

				if (element) {
					if (id == "location.town") {
						const town = document.getElementById("location.town");
						town.replaceChildren();

						for (const key of Object.keys(TREM.Resources.region[setting["location.city"]])) {
							const option = document.createElement("option");
							option.text = key;
							option.value = key;
							town.appendChild(option);
						}
					}

					for (let i = 0; i < element.options.length; i++)
						if (element.options[i].value == setting[id])
							element.options[i].selected = true;

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			case "color": {

				/**
				 * @type {HTMLSelectElement}
				 */
				const element = document.getElementById(id);

				if (element) {
					element.value = setting[id];

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				const wrapper = document.getElementById(id.replace(/\./g, "-"));
				console.log(wrapper);

				if (wrapper)
					wrapper.style.backgroundColor = setting[id];
				break;
			}

			case "range": {
				const element = document.getElementById(id);

				if (element) {
					element.value = setting[id];
					$(element).siblings("span.slider-value").text(() => ~~(setting[id] * 100));

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			case "choice": {
				const element = document.getElementById(id);

				if (element) {
					$(element).children("label").children(`input[value=${setting[id]}]`)[0].checked = true;

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			default:
				break;
		}
	});

	// #region 選單
	(() => {
		const el = document.getElementById("location.city");

		for (const key of Object.keys(TREM.Resources.region)) {
			const option = document.createElement("option");
			option.text = key;
			option.value = key;

			if (setting["location.city"] == key)
				option.selected = true;
			el.appendChild(option);
		}
	})();

	(async () => {
		station = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
		const el = document.getElementById("Real-time.station");
		const el1 = document.getElementById("Real-time.station.1");
		const el2 = document.getElementById("Real-time.station.2");
		const el3 = document.getElementById("Real-time.station.3");
		const el4 = document.getElementById("Real-time.station.4");
		const el5 = document.getElementById("Real-time.station.5");
		const stations = {};

		for (const key of Object.keys(station)) {
			if (!stations[station[key].Loc.split(" ")[0]]) stations[station[key].Loc.split(" ")[0]] = {};
			stations[station[key].Loc.split(" ")[0]][key] = station[key].Loc;
		}

		for (const city of Object.keys(stations)) {
			const optgroup = document.createElement("optgroup");
			const optgroup1 = document.createElement("optgroup");
			const optgroup2 = document.createElement("optgroup");
			const optgroup3 = document.createElement("optgroup");
			const optgroup4 = document.createElement("optgroup");
			const optgroup5 = document.createElement("optgroup");
			optgroup.label = city;
			optgroup1.label = city;
			optgroup2.label = city;
			optgroup3.label = city;
			optgroup4.label = city;
			optgroup5.label = city;

			for (const stationKey of Object.keys(stations[city])) {
				const option = document.createElement("option");
				option.text = `${stations[city][stationKey]} ${stationKey}`;
				option.value = stationKey;

				if (setting["Real-time.station"] == stationKey)
					option.selected = true;
				optgroup.appendChild(option);
				const option1 = document.createElement("option");
				option1.text = `${stations[city][stationKey]} ${stationKey}`;
				option1.value = stationKey;

				if (setting["Real-time.station.1"] == stationKey)
					option1.selected = true;
				optgroup1.appendChild(option1);
				const option2 = document.createElement("option");
				option2.text = `${stations[city][stationKey]} ${stationKey}`;
				option2.value = stationKey;

				if (setting["Real-time.station.2"] == stationKey)
					option2.selected = true;
				optgroup2.appendChild(option2);
				const option3 = document.createElement("option");
				option3.text = `${stations[city][stationKey]} ${stationKey}`;
				option3.value = stationKey;

				if (setting["Real-time.station.3"] == stationKey)
					option3.selected = true;
				optgroup3.appendChild(option3);
				const option4 = document.createElement("option");
				option4.text = `${stations[city][stationKey]} ${stationKey}`;
				option4.value = stationKey;

				if (setting["Real-time.station.4"] == stationKey)
					option4.selected = true;
				optgroup4.appendChild(option4);
				const option5 = document.createElement("option");
				option5.text = `${stations[city][stationKey]} ${stationKey}`;
				option5.value = stationKey;

				if (setting["Real-time.station.5"] == stationKey)
					option5.selected = true;
				optgroup5.appendChild(option5);
			}

			el.appendChild(optgroup);
			el1.appendChild(optgroup1);
			el2.appendChild(optgroup2);
			el3.appendChild(optgroup3);
			el4.appendChild(optgroup4);
			el5.appendChild(optgroup5);
		}
	})();
	// #endregion
}

function SelectSave(id) {
	const select = document.getElementById(id);
	const value = select.options[select.selectedIndex].value;
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);

	if (id == "map.engine")
		$("#MEReloadButton").fadeIn(100);

	if (id == "update.time")
		$("#UDReloadButton").fadeIn(100);

	if (id == "location.city") {
		const town = document.getElementById("location.town");
		town.replaceChildren();

		for (const key of Object.keys(TREM.Resources.region[value])) {
			const option = document.createElement("option");
			option.text = key;
			option.value = key;
			town.appendChild(option);
		}

		ipcRenderer.send("config:value", "location.town", town.options[town.selectedIndex].value);
	}

	for (let index = 1; index < 6; index++)
		if (id == "Real-time.station." + index) {
			const text = document.getElementById("Real-time.station." + index + ".text");
			text.innerHTML = "即時測站波形圖" + index + "已設定 " + value;
			text.style = "margin-top: 4px; color: rgb(var(--md-sys-color-on-background));";
		}

	if (id == "location.city" || id == "location.town") {
		const city = document.getElementById("location.city");
		const town = document.getElementById("location.town");
		const Loc = TREM.Resources.region[city.options[city.selectedIndex].value][town.options[town.selectedIndex].value];
		let stamp = 0;
		let loc = "";

		for (let index = 0; index < Object.keys(station).length; index++) {
			const num = Math.abs(Loc[1] - station[Object.keys(station)[index]].Lat, 2) + Math.pow(Loc[2] - station[Object.keys(station)[index]].Long, 2);

			if (stamp == 0) {
				stamp = num;
				loc = Object.keys(station)[index];
			} else if (stamp > num) {
				stamp = num;
				loc = Object.keys(station)[index];
			}
		}

		ipcRenderer.send("config:value", "Real-time.station", loc);
	}
}

function CheckSave(id) {
	const value = document.getElementById(id).checked;
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);

	if (id == "trem-eq.alert.Notification") {
		const element = document.getElementById("trem-eq.Notification");
		element.checked = false;

		if (is_setting_disabled) element.disabled = true;
		else element.disabled = false;

		ipcRenderer.send("config:value", "trem-eq.Notification", false);
		dump({ level: 0, message: `Value Changed trem-eq.Notification: ${setting["trem-eq.Notification"]} -> false`, origin: "Setting" });
	}

	if (id == "trem-eq.Notification") {
		const element = document.getElementById("trem-eq.alert.Notification");
		element.checked = false;

		if (is_setting_disabled) element.disabled = true;
		else element.disabled = false;

		ipcRenderer.send("config:value", "trem-eq.alert.Notification", false);
		dump({ level: 0, message: `Value Changed trem-eq.alert.Notification: ${setting["trem-eq.alert.Notification"]} -> false`, origin: "Setting" });
	}

	if (id == "map.jp" || id == "map.cn" || id == "map.sk" || id == "map.nk" || id == "map.ph" || id == "map.NZ")
		$("#MAPReloadButton").fadeIn(100);

	if (id == "compatibility.hwaccel")
		$("#HAReloadButton").fadeIn(100);

	if (id == "theme.customColor")
		if (value)
			$("#intensity-palette-container").fadeIn(100).removeClass("hide");
		else
			$("#intensity-palette-container").fadeOut(100).addClass("hide");
}

function CheckHide(id) {
	const value = document.getElementById(id).checked;

	if (value)
		document.getElementById("api.key").type = "password";
	else
		document.getElementById("api.key").type = "text";
	ipcRenderer.send("config:value", id, value);
}

function TextSave(id) {
	const value = document.getElementById(id).value;
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });

	if (id == "api.key")
		if (value.length <= 0)
			return;
	ipcRenderer.send("config:value", id, value);
}

function KeyTextSave(id) {
	const value = document.getElementById(id).value;
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);
}

function ChoiceSave(id, el) {
	const value = el.value;
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);

	if (id == "update.mode")
		$("#UDReloadButton").fadeIn(100);
}

function RangeSave(id) {
	const value = document.getElementById(id).value;
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, +value);
}


/**
 * 切換設定分類
 * @param {string} args 設定分類
 * @param {HTMLElement} el 觸發事件的物件
 * @param {Event} event 事件
 * @returns {void}
 */
function setList(args, el, event) {
	if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ")
		return;

	dump({ level: 0, message: `Changed view to ${args}`, origin: "Setting" });
	const currentel = $(".show");
	const changeel = $(`#${args}`);

	if (changeel.attr("id") == currentel.attr("id")) return;

	const currentnav = $(".active");
	currentnav.removeClass("active");
	$(el).addClass("active");

	changeel.children("div").each((i, e) => {
		if (![
			"HAReloadButton",
			"MEReloadButton",
			"MAPReloadButton",
			"UDReloadButton",
		].includes(e.id))
			$(e).css("opacity", "0");
		$(e).children().each((i2, e2) => {
			if (![
				"HAReloadButton",
				"MEReloadButton",
				"MAPReloadButton",
				"UDReloadButton",
			].includes(e2.id))
				$(e2).css("opacity", "0");
		});
	});
	changeel.hide().delay(100).addClass("show").fadeIn(200);
	currentel.fadeOut(100).removeClass("show").show();
	$("#list").delay(100)[0].scrollTo(0, 0);

	const changeelchild = $(`#${args} > div`);

	let delay = 0;

	for (let i = 0; i < changeelchild.length; i++) {
		$(changeelchild[i]).delay(delay + 30 * i).fadeTo(100, is_setting_disabled ? 0.6 : 1).delay(100)
			.queue(function(next) {
				$(this).css("opacity", "");
				next();
			});
		delay += 15;
		const child = changeelchild[i].children;

		if (child.length)
			for (let j = 0; j < child.length; j++)
				if (![
					"HAReloadButton",
					"MEReloadButton",
					"MAPReloadButton",
					"UDReloadButton",
				].includes(child[j].id)) {
					if (!child[j].lang || (child[j].lang == setting["general.locale"]))
						$(child[j]).delay(delay).fadeTo(100, is_setting_disabled ? 0.6 : 1).delay(100)
							.queue(function(next) {
								$(this).css("opacity", "");
								next();
							});
					delay += 15;
				}

	}
}

function send() {
	let data = {};
	let Unit_type = "eew-test";
	const testtext_value = document.getElementById("testtext").value;

	if (testtext_value == "中央氣象局") Unit_type = "eew-cwb";

	if (testtext_value == "防災科学技術研究所") Unit_type = "eew-nied";

	if (testtext_value == "日本氣象廳") Unit_type = "eew-jma";

	if (testtext_value == "韓國氣象廳") Unit_type = "eew-kma";

	if (testtext_value == "福建省地震局") Unit_type = "eew-fjdzj";

	if (testtext_value == "四川省地震局") Unit_type = "eew-scdzj";

	if (document.getElementById("UUID").value != "")
		data = {
			APIkey        : "https://github.com/ExpTechTW",
			Function      : "Send",
			Type          : "test",
			FormatVersion : 1,
			UUID          : document.getElementById("UUID").value,
			Value         : {
				Function      : "earthquake",
				Type          : "data",
				type          : Unit_type,
				time          : new Date(document.getElementById("Time").value).getTime(),
				lon           : document.getElementById("EastLongitude").value,
				lat           : document.getElementById("NorthLatitude").value,
				depth         : document.getElementById("Depth").value,
				scale         : document.getElementById("Scale").value,
				FormatVersion : 1,
				timestamp     : new Date(document.getElementById("TimeStamp").value).getTime(),
				"UTC+8"       : document.getElementById("Time").value,
				number        : document.getElementById("Version").value,
				id            : document.getElementById("ID").value,
				Test          : document.getElementById("testbtn").checked,
				Unit          : document.getElementById("testtext").value,
				location      : document.getElementById("Location").value,
				Alert         : document.getElementById("alertbtn").checked,
				cancel        : document.getElementById("cancelbtn").checked,
			},
		};
	else
		data = {
			APIkey        : "https://github.com/ExpTechTW",
			Function      : "Send",
			Type          : "test",
			FormatVersion : 1,
			UUID          : localStorage.UUID,
			Value         : {
				Function      : "earthquake",
				Type          : "data",
				type          : Unit_type,
				time          : new Date(document.getElementById("Time").value).getTime(),
				lon           : document.getElementById("EastLongitude").value,
				lat           : document.getElementById("NorthLatitude").value,
				depth         : document.getElementById("Depth").value,
				scale         : document.getElementById("Scale").value,
				FormatVersion : 1,
				timestamp     : new Date(document.getElementById("TimeStamp").value).getTime(),
				"UTC+8"       : document.getElementById("Time").value,
				number        : document.getElementById("Version").value,
				id            : document.getElementById("ID").value,
				Test          : document.getElementById("testbtn").checked,
				Unit          : document.getElementById("testtext").value,
				location      : document.getElementById("Location").value,
				Alert         : document.getElementById("alertbtn").checked,
				cancel        : document.getElementById("cancelbtn").checked,
			},
		};
	axios.post("https://exptech.com.tw/api/v1/et", data)
		.then((response) => {
			if (response.data.response == "State Close") {
				document.getElementById("sendState").innerHTML = "設備未連接至伺服器";
				console.log("設備未連接至伺服器");
			} else if (response.data.response == "Device Not Found") {
				document.getElementById("sendState").innerHTML = "找不到此 UUID 的設備";
				console.log("找不到此 UUID 的設備");
			} else {
				document.getElementById("sendState").innerHTML = "發送成功，第" + data.Value.number + "報";
				console.log("發送成功 請刷新網頁");
			}

			document.getElementById("Version").value = Number(document.getElementById("Version").value) + 1;
			const utc = new Date();
			const NOW = new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000 + 60 * 60 * 8 * 1000);
			const now = new Date(NOW.getTime() - 20000);
			const Now = now.getFullYear()
			+ "-" + (now.getMonth() + 1)
			+ "-" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes()
			+ ":" + now.getSeconds();
			document.getElementById("Time").value = Now;
			const now1 = new Date(NOW.getTime());
			const Now1 = now1.getFullYear()
			+ "-" + (now1.getMonth() + 1)
			+ "-" + now1.getDate()
			+ " " + now1.getHours()
			+ ":" + now1.getMinutes()
			+ ":" + now1.getSeconds();
			document.getElementById("TimeStamp").value = Now1;
		});
}

function resend() {
	document.getElementById("testbtn").checked = true;
	document.getElementById("alertbtn").checked = true;
	document.getElementById("cancelbtn").checked = false;
	document.getElementById("testtext").value = "測試模式";
	document.getElementById("ID").value = "111000";
	const utc = new Date();
	const NOW = new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000 + 60 * 60 * 8 * 1000);
	const now = new Date(NOW.getTime() - 20000);
	const Now = now.getFullYear()
		+ "-" + (now.getMonth() + 1)
		+ "-" + now.getDate()
		+ " " + now.getHours()
		+ ":" + now.getMinutes()
		+ ":" + now.getSeconds();
	document.getElementById("Time").value = Now;
	const now1 = new Date(NOW.getTime());
	const Now1 = now1.getFullYear()
		+ "-" + (now1.getMonth() + 1)
		+ "-" + now1.getDate()
		+ " " + now1.getHours()
		+ ":" + now1.getMinutes()
		+ ":" + now1.getSeconds();
	document.getElementById("TimeStamp").value = Now1;
	document.getElementById("EastLongitude").value = "120.7";
	document.getElementById("NorthLatitude").value = "22.2";
	document.getElementById("Location").value = "未知區域";
	document.getElementById("Depth").value = "10";
	document.getElementById("Scale").value = "5.0";
	document.getElementById("Version").value = "1";
	document.getElementById("UUID").value = "";
	document.getElementById("sendState").innerHTML = "已重置";
}

function testEEW() {
	ipcRenderer.send("testEEW");
	ipcRenderer.send("closeChildWindow");
}

function testoldtimeEEW() {
	const oldtime = new Date(document.getElementById("oldtime").value).getTime();
	ipcRenderer.send("testoldtimeEEW", oldtime);
}

function reset() {
	showDialog("warn",
		TREM.Localization.getString("Setting_Dialog_Reset_Title"),
		TREM.Localization.getString("Setting_Dialog_Reset_Description"),
		1, "device_reset", () => {
			setting = {};
			ipcRenderer.send("saveSetting", true);
			restart();
		});
}

function openLogFolder() {
	shell.openPath(app.getPath("logs"));
}

function openSettingFile() {
	ipcRenderer.send("config:open");
}

const restart = () => {
	ipcRenderer.send("restart");
};

const testAudioState = {
	audio      : new Audio(),
	is_playing : false,
	Listener() {
		testAudioState.audio.addEventListener("ended", () => {
			testAudioState.is_playing = false;
			testAudioBtn.style.removeProperty("--progress");
			testAudioBtn.childNodes[1].textContent = "play_arrow";
			testAudioBtn.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
		});
		testAudioState.audio.addEventListener("timeupdate", () => {
			console.log(testAudioState.audio.currentTime);
			console.log(testAudioState.audio.duration);
			testAudioBtn.style.setProperty("--progress", (testAudioState.audio.currentTime / (testAudioState.audio.duration - 0.25)) || 0);
		});
	},
};

let testAudioBtn;

/**
 * @param {string} audioString
 * @param {HTMLElement} el
 */
const testAudio = (audioString, el) => {
	if (el != testAudioBtn && testAudioBtn != undefined) {
		testAudioState.audio.pause();
		testAudioState.audio.currentTime = 0;
		testAudioState.is_playing = false;
		testAudioBtn.style.removeProperty("--progress");
		testAudioBtn.childNodes[1].textContent = "play_arrow";
		testAudioBtn.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
	}

	testAudioBtn = el;

	if (!testAudioState.is_playing) {
		testAudioState.audio = new Audio("../audio/" + audioString + ".wav");
		testAudioState.Listener();
		testAudioState.audio.play();
		testAudioState.is_playing = true;
		el.childNodes[1].textContent = "pause";
		el.childNodes[3].textContent = TREM.Localization.getString("Audio_TestStop");
	} else {
		testAudioState.audio.pause();
		testAudioState.audio.currentTime = 0;
		testAudioState.is_playing = false;
		testAudioBtn.style.removeProperty("--progress");
		el.childNodes[1].textContent = "play_arrow";
		el.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
	}
};

const webhook = async () => {
	if (setting["webhook.url"].length == 0)
		return showDialog("error",
			TREM.Localization.getString("Webhook_Dialog_Error_Title"),
			TREM.Localization.getString("Webhook_Dialog_Error_Empty"),
		);

	const url = setting["webhook.url"].match(
		// eslint-disable-next-line no-useless-escape
		/^https?:\/\/(?:canary|ptb)?\.?discord\.com\/api\/webhooks(?:\/v[0-9]\d*)?\/([^\/]+)\/([^\/]+)/i,
	);

	if (!url || url.length <= 1)
		return showDialog("error",
			TREM.Localization.getString("Webhook_Dialog_Error_Title"),
			TREM.Localization.getString("Webhook_Dialog_Error_Invalid"));

	const { EmbedBuilder, WebhookClient } = require("discord.js");

	const embeds = [
		new EmbedBuilder()
			.setDescription("這是一則由 TREM 發送的測試訊息")
			.setColor("BLUE")
			.setFooter({ text: "ExpTech Studio", iconURL: "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png" })
			.setTimestamp(),
	];

	await new WebhookClient({ url: setting["webhook.url"] })
		.send({ embeds, username: "TREM | 臺灣即時地震監測", avatarURL: "https://cdn.discordapp.com/attachments/976452418114048051/976469802644291584/received_1354357138388018.webp", content: setting["tts.Notification"] ? "這是一則由 TREM 發送的測試訊息" : "", tts: setting["tts.Notification"] })
		.then(m => {
			showDialog("success",
				TREM.Localization.getString("Webhook_Dialog_Title"),
				TREM.Localization.getString("Webhook_Dialog_Success").format(m.id, m.channel_id));
		}).catch(error => {
			showDialog("error", "Webhook 測試", `Webhook 發送測試訊息時發生錯誤\n${error}`);
		});
};

const colorUpdate = (el) => {
	document.getElementById(el.id.replace(/\./g, "-")).style.backgroundColor = el.value;
};

const showError = () => {
	showDialog("error",
		TREM.Localization.getString("Setting_Dialog_Error_Title"),
		TREM.Localization.getString("Setting_Dialog_Error_Description").format(is_setting_disabled));
};

$("input[type=range]").on("input", function() {
	const value = this.value;
	$(this).siblings("span.slider-value").text(function() {
		return this.className.includes("percentage") ? ~~(value * 100) : value;
	});
})
	.on("mousedown", () => window.getSelection().removeAllRanges());

const stepLockRange = (e) => {
	if (e.shiftKey)
		$("input[type=range]")[0].step = 0.1;
};

const stepUnlockRange = (e) => {
	if (!e.shiftKey)
		$("input[type=range]")[0].step = 0.01;
};

/*
// register the handler
document.addEventListener("keydown", stepLockRange, false);
document.addEventListener("keyup", stepUnlockRange, false);
*/