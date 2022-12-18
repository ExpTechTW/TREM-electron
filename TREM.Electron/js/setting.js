const { getCurrentWindow, shell } = require("@electron/remote");
const os = require("node:os");
const win = getCurrentWindow();
TREM.Constants = require(path.resolve(__dirname, "../Constants/Constants.js"));

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLocaleLowerCase() == "i")
    ipcRenderer.send("openDevtool");
});

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

// #region 選單
(() => {
  const el = document.getElementById("location.city");

  for (const key of Object.keys(TREM.Resources.region)) {
    const option = document.createElement("option");
    option.text = key;
    option.value = key;
    el.appendChild(option);
  }
})();

(async () => {
  station = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
  const el = document.getElementById("Real-time.station");
  const stations = {};

  for (const key of Object.keys(station)) {
    if (!stations[station[key].Loc.split(" ")[0]]) stations[station[key].Loc.split(" ")[0]] = {};
    stations[station[key].Loc.split(" ")[0]][key] = station[key].Loc;
  }

  for (const city of Object.keys(stations)) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = city;

    for (const stationKey of Object.keys(stations[city])) {
      const option = document.createElement("option");
      option.text = `${stations[city][stationKey]} ${stationKey}`;
      option.value = stationKey;
      optgroup.appendChild(option);
    }

    el.appendChild(optgroup);
  }
})();
// #endregion

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
        }

        break;
      }

      case "string": {
        const element = document.getElementById(id);

        if (element) {
          if (id == "api.key")
            element.placeholder = "•".repeat(setting[id].length);
          else
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
}

function SelectSave(id) {
  const select = document.getElementById(id);
  const value = select.options[select.selectedIndex].value;
  dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
  ipcRenderer.send("config:value", id, value);

  if (id == "map.engine")
    $("#MEReloadButton").fadeIn(100);

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

  if (id == "compatibility.hwaccel")
    $("#HAReloadButton").fadeIn(100);

  if (id == "theme.customColor")
    if (value)
      $("#intensity-palette-container").fadeIn(100).removeClass("hide");
    else
      $("#intensity-palette-container").fadeOut(100).addClass("hide");
}

function TextSave(id) {
  const value = document.getElementById(id).value;
  dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });

  if (id == "api.key")
    if (value.length <= 0)
      return;
  ipcRenderer.send("config:value", id, value);
}

function ChoiceSave(id, el) {
  const value = el.value;
  dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
  ipcRenderer.send("config:value", id, value);
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
    if (!["HAReloadButton", "MEReloadButton"].includes(e.id))
      $(e).css("opacity", "0");
    $(e).children().each((i2, e2) => {
      if (!["HAReloadButton", "MEReloadButton"].includes(e2.id))
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
        if (!["HAReloadButton", "MEReloadButton"].includes(child[j].id)) {
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

function testEEW() {
  ipcRenderer.send("testEEW");
  ipcRenderer.send("closeChildWindow");
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
};

let testAudioBtn;
testAudioState.audio.addEventListener("ended", () => {
  testAudioState.is_playing = false;
  testAudioBtn.style.removeProperty("--progress");
  testAudioBtn.childNodes[1].textContent = "play_arrow";
  testAudioBtn.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
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
    testAudioBtn.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
  }

  testAudioBtn = el;

  if (!testAudioState.is_playing) {
    testAudioState.audio.src = `../Audio/${audioString}.wav`;
    testAudioState.audio.load();
    testAudioState.audio.play();
    testAudioState.audio.played;
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

  const { MessageEmbed, WebhookClient } = require("discord.js");

  const embeds = [
    new MessageEmbed()
      .setDescription("這是一則由 TREM 發送的測試訊息")
      .setColor("BLUE")
      .setFooter({ text: "ExpTech Studio", iconURL: "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png" })
      .setTimestamp(),
  ];

  await new WebhookClient({ url: setting["webhook.url"] })
    .send({ embeds, username: "TREM | 臺灣即時地震監測", avatarURL: "https://cdn.discordapp.com/attachments/976452418114048051/976469802644291584/received_1354357138388018.webp" })
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

$("input[type=range]")
  .on("input", function() {
    const value = this.value;
    $(this).siblings("span.slider-value").text(function() {
      return this.className.includes("percentage") ? ~~(value * 100) : value;
    });
  })
  .on("mousedown", () => window.getSelection().removeAllRanges());

/*
const stepLockRange = (e) => {
	if (e.shiftKey)
		$("input[type=range]")[0].step = 0.1;
};

const stepUnlockRange = (e) => {
	if (!e.shiftKey)
		$("input[type=range]")[0].step = 0.01;
};

// register the handler
document.addEventListener("keydown", stepLockRange, false);
document.addEventListener("keyup", stepUnlockRange, false);
*/