/* global Maps: false, IntensityToClassString: false, Maps.intensity: true, IntensityI: false, changeView: false, replay: true, replayT: true */

TREM.Intensity = {
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
						}, { intensity });

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
				this.timer = setTimeout(() => this.clear, 60_000);

		}

	},
	clear() {
		dump({ level: 0, message: "Clearing Intensity map", origin: "Intensity" });
		if (this.intensities.size) {
			Maps.intensity.removeFeatureState({ source: "Source_tw_town" });
			Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "none");
			delete this.intensities;
			this.intensities = new Map();
			this.alertTime = 0;
			this.isTriggered = false;
			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
			}
		}
	},
};