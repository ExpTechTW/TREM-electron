/* global Maps: false, IntensityToClassString: false, Maps.intensity: true, IntensityI: false, changeView: false, replay: true, replayT: true */

TREM.Intensity = {
	cache                 : new Map(),
	view                  : "intensity-list",
	reportList            : [],
	reportListElement     : document.getElementById("intensity-list-container"),
	_markers              : [],
	_markersGroup         : null,
	_lastFocus            : [],
	_filterHasReplay      : false,
	_filterHasNumber      : false,
	_filterMagnitude      : false,
	_filterMagnitudeValue : 2,
	_filterIntensity      : false,
	_filterIntensityValue : 4,
	_reportItemTemplate   : document.getElementById("template-intensity-list-item"),
	get _mapPaddingLeft() {
		return document.getElementById("map-intensity").offsetWidth / 2;
	},
	isTriggered : false,
	alertTime   : 0,
	intensities : new Map(),
	handle(rawIntensityData) {
		if (rawIntensityData.TimeStamp != this.alertTime) {
			rawIntensityData = rawIntensityData.raw.intensity;
			this.alertTime = rawIntensityData.TimeStamp;
			const int = new Map();
			for (let index = 0, keys = Object.keys(rawIntensityData), n = keys.length; index < n; index++) {
				const towncode = keys[index] + "0";
				const intensity = rawIntensityData[keys[index]];
				if (!towncode) continue;
				if (intensity == 0) continue;
				int.set(towncode, intensity);
			}

			if (this.intensities.size)
				for (let index = 0, keys = Object.keys(rawIntensityData), n = keys.length; index < n; index++) {
					const towncode = keys[index] + "0";
					const intensity = rawIntensityData[keys[index]];
					if (int.get(towncode) != intensity) {
						this.intensities.delete(towncode);
						Maps.intensity.setFeatureState({
							source : "Source_tw_town",
							id     : towncode,
						}, { intensity: 0 });
					}
				}

			if (int.size) {
				dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

				for (const [towncode, intensity] of int)
					if (this.intensities.get(towncode) != intensity)
						Maps.intensity.setFeatureState({
							source : "Source_tw_town",
							id     : towncode,
						}, { intensity, intensity_outline: 1 });

				Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "visible");

				this.intensities = int;

				if (!this.isTriggered) {
					this.isTriggered = true;
					changeView("intensity", "#mainView_btn");
					if (setting["Real-time.show"]) TREM.win.showInactive();
					if (setting["Real-time.cover"]) TREM.win.moveTop();
					if (!TREM.win.isFocused()) TREM.win.flashFrame(true);
					if (setting["audio.realtime"]) TREM.Audios.palert.play();
					TREM.IntensityTag1 = NOW.getTime();
					console.log("IntensityTag1: ", TREM.IntensityTag1);
				}
			}

			if (this.timer)
				this.timer.refresh();
			else
				this.timer = setTimeout(this.clear, 120_000);

		}

	},
	clear() {
		dump({ level: 0, message: "Clearing Intensity map", origin: "Intensity" });
		if (this.intensities.size) {
			for (const [towncode] of this.intensities)
				Maps.intensity.removeFeatureState({
					source : "Source_tw_town",
					id     : towncode,
				});
			Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "none");
			this.intensities = new Map();
			this.isTriggered = false;
			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
			}
		}
	},
};