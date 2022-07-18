const { getCurrentWindow, shell } = require("@electron/remote");
const ipc = require("electron").ipcRenderer;
const os = require("node:os");

let Loc;
const win = getCurrentWindow();

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
document.getElementById("client-uuid").title = `${localStorage["UUID"]}`;

const openURL = url => {
	shell.openExternal(url);
	return;
};

// #region 選單
fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")
	.then(async res => await res.json())
	.then(loc => {
		Loc = loc;
		for (let i = 0; i < Object.keys(Loc).length; i++) {
			const city = document.getElementById("location.city");
			const option = document.createElement("option");
			option.text = Object.keys(Loc)[i];
			option.value = Object.keys(Loc)[i];
			city.appendChild(option);
		}
		for (let i = 0; i < Object.keys(Loc[CONFIG["location.city"]]).length; i++) {
			const town = document.getElementById("location.town");
			const option = document.createElement("option");
			option.text = Object.keys(Loc[CONFIG["location.city"]])[i];
			option.value = Object.keys(Loc[CONFIG["location.city"]])[i];
			town.appendChild(option);
		}

		init();
	});

fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")
	.then(async res => await res.json())
	.then(loc => {
		if (loc[CONFIG["Real-time.station"]] == undefined) {
			CONFIG["Real-time.station"] = "L-711-6732340-12";
			ipcRenderer.send("saveSetting", CONFIG);
		}
		for (let index = 0; index < Object.keys(loc).length; index++) {
			if (Object.keys(loc)[index] == "List") continue;
			const select = document.getElementById("Real-time.station");
			const option = document.createElement("option");
			option.text = `${loc[Object.keys(loc)[index]]["Loc"]} ${Object.keys(loc)[index]}`;
			option.value = Object.keys(loc)[index];
			select.appendChild(option);
		}
	});
// #endregion

/**
 * 初始化設定
 */
function init() {
	dump({ level: 0, message: "Initializing", origin: "Setting" });
	Object.keys(CONFIG).forEach(id => {
		switch (DEFAULT_CONFIG[id].type) {
			case "CheckBox": {
				const element = document.getElementById(id);
				if (element)
					element.checked = CONFIG[id];
				break;
			}

			case "TextBox": {
				const element = document.getElementById(id);
				if (element)
					element.value = CONFIG[id];
				break;
			}

			case "SelectBox": {
				/**
				 * @type {HTMLSelectElement}
				 */
				const element = document.getElementById(id);
				if (element)
					for (let i = 0; i < element.options.length; i++)
						if (element.options[i].value == CONFIG[id])
							element.options[i].selected = true;
				break;
			}

			case "ColorBox": {
				/**
				 * @type {HTMLSelectElement}
				 */
				const element = document.getElementById(id);
				if (element)
					element.value = CONFIG[id];
				const wrapper = document.getElementById(id.replace(".", "-"));
				if (element)
					wrapper.style.backgroundColor = CONFIG[id];
				break;
			}

			default:
				break;
		}
	});
}


function SelectSave(id) {
	const select = document.getElementById(id);
	const value = select.options[select.selectedIndex].value;
	dump({ level: 0, message: `Value Changed ${id}: ${CONFIG[id]} -> ${value}`, origin: "Setting" });
	CONFIG[id] = value;
	ipcRenderer.send("saveSetting", CONFIG);
	if (id == "location.city") {
		const town = document.getElementById("location.town");
		town.replaceChildren();

		Object.keys(Loc[value]).forEach(key => {
			const option = document.createElement("option");
			option.text = key;
			option.value = key;
			town.appendChild(option);
		});

		SelectSave("location.town");
	}
}

function CheckSave(id) {
	const value = document.getElementById(id).checked;
	dump({ level: 0, message: `Value Changed ${id}: ${CONFIG[id]} -> ${value}`, origin: "Setting" });
	CONFIG[id] = value;
	ipcRenderer.send("saveSetting", CONFIG);
	if (id == "GPU.disable")
		$("#HAReloadButton").fadeIn(100);
	else if (id == "theme.dark") {
		setThemeColor(CONFIG["theme.color"], value);
		ipc.send("updateTheme");
	}
}

function TextSave(id) {
	const value = document.getElementById(id).value;
	dump({ level: 0, message: `Value Changed ${id}: ${CONFIG[id]} -> ${value}`, origin: "Setting" });
	CONFIG[id] = value;
	ipcRenderer.send("saveSetting", CONFIG);
	if (id == "theme.color") {
		setThemeColor(value, CONFIG["theme.dark"]);
		ipc.send("updateTheme");
	}
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
		$(e).css("opacity", "0");
		$(e).children().each((i2, e2) => {
			if (e2.id != "HAReloadButton")
				$(e2).css("opacity", "0");
		});
	});
	changeel.hide().delay(100).addClass("show").fadeIn(200);
	currentel.fadeOut(100).removeClass("show").show();
	$("#list").delay(100)[0].scrollTo(0, 0);

	const changeelchild = $(`#${args} > div`);

	let delay = 0;
	for (let i = 0; i < changeelchild.length; i++) {
		$(changeelchild[i]).delay(delay + 40 * i).fadeTo(100, 1);
		delay += 20;
		const child = changeelchild[i].children;
		if (child.length)
			for (let j = 0; j < child.length; j++)
				if (child[j].id != "HAReloadButton") {
					$(child[j]).delay(delay).fadeTo(100, 1);
					delay += 20;
				}

	}
}

function testEEW() {
	ipc.send("testEEW");
	ipc.send("closeChildWindow");
}

function reset() {
	showDialog("warn", "重置設定？", "您確定您真的要重置所有設定嗎\n這個動作將無法挽回", 1, "device_reset", () => {
		CONFIG = {};
		ipcRenderer.send("saveSetting", CONFIG);
		restart();
	});
}

function openLogFolder() {
	shell.openPath(app.getPath("logs"));
}

function openSettingFile() {
	shell.openPath(CONFIG_PATH);
}

const restart = () => {
	ipc.send("restart");
};

const testAudioState = {
	audio      : new Audio(),
	is_playing : false,
};
let testAudioBtn;
testAudioState.audio.addEventListener("ended", () => {
	testAudioState.is_playing = false;
	testAudioBtn.style.removeProperty("--progress");
	testAudioBtn.childNodes[1].textContent = "play_arrow";
	testAudioBtn.childNodes[3].textContent = "測試音效";
});
testAudioState.audio.addEventListener("timeupdate", () => {
	console.log(testAudioState.audio.currentTime);
	testAudioBtn.style.setProperty("--progress", (testAudioState.audio.currentTime / (testAudioState.audio.duration - 0.25)) || 0);
});

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
		testAudioBtn.childNodes[3].textContent = "測試音效";
	}
	testAudioBtn = el;
	if (!testAudioState.is_playing) {
		testAudioState.audio.src = `../Audio/${audioString}.wav`;
		testAudioState.audio.load();
		testAudioState.audio.play();
		testAudioState.audio.played;
		testAudioState.is_playing = true;
		el.childNodes[1].textContent = "pause";
		el.childNodes[3].textContent = "停止測試";
	} else {
		testAudioState.audio.pause();
		testAudioState.audio.currentTime = 0;
		testAudioState.is_playing = false;
		testAudioBtn.style.removeProperty("--progress");
		el.childNodes[1].textContent = "play_arrow";
		el.childNodes[3].textContent = "測試音效";
	}
};

const webhook = async () => {
	if (CONFIG["webhook.url"].length == 0)
		return showDialog("error", "Webhook 錯誤", "Webhook 連結為空，無法傳送測試訊息");

	const url = CONFIG["webhook.url"].match(
		// eslint-disable-next-line no-useless-escape
		/^https?:\/\/(?:canary|ptb)?\.?discord\.com\/api\/webhooks(?:\/v[0-9]\d*)?\/([^\/]+)\/([^\/]+)/i,
	);

	if (!url || url.length <= 1)
		return showDialog("error", "Webhook 測試", "無效的 Webhook 連結");

	const { MessageEmbed, WebhookClient } = require("discord.js");

	const embeds = [
		new MessageEmbed()
			.setDescription("這是一則由 TREM 發送的測試訊息")
			.setColor("BLUE")
			.setFooter({ text: "ExpTech Studio", iconURL: "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png" })
			.setTimestamp(),
	];

	await new WebhookClient({ url: CONFIG["webhook.url"] })
		.send({ embeds, username: "TREM | 台灣實時地震監測", avatarURL: "https://cdn.discordapp.com/attachments/976452418114048051/976469802644291584/received_1354357138388018.webp" })
		.then(m => {
			showDialog("success", "Webhook 測試", `Webhook 發送測試訊息成功\n訊息ID：${m.id}\n頻道ID：${m.channel_id}`);
		}).catch(error => {
			showDialog("error", "Webhook 測試", `Webhook 發送測試訊息時發生錯誤\n${error}`);
		});
};

const colorUpdate = () => {
	$("#theme-color")[0].style.backgroundColor = $("#theme\\.color")[0].value;
};