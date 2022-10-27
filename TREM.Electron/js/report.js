/* global Maps: false, IntensityToClassString: false, Maps.report: true, IntensityI: false, changeView: false, replay: true, replayT: true */

TREM.Report = {
	cache                 : new Map(),
	view                  : "report-list",
	reportList            : [],
	reportListElement     : document.getElementById("report-list-container"),
	_markers              : [],
	_markersGroup         : null,
	_lastFocus            : [],
	_filterHasReplay      : false,
	_filterHasNumber      : false,
	_filterMagnitude      : false,
	_filterMagnitudeValue : 2,
	_filterIntensity      : false,
	_filterIntensityValue : 4,
	_reportItemTemplate   : document.getElementById("template-report-list-item"),
	get _mapPaddingLeft() {
		return document.getElementById("map-report").offsetWidth / 2;
	},
	unloadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) {
			this.reportListElement.replaceChildren();
			this._clearMap();
		}
	},
	loadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) {
			const fragment = new DocumentFragment();
			const reports = Array.from(this.cache, ([k, v]) => v);
			this.reportList = reports
				.filter(v => this._filterHasNumber ? v.earthquakeNo % 1000 != 0 : true)
				.filter(v => this._filterHasReplay ? v.ID?.length : true)
				.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == 1 ? v.magnitudeValue < 4.5 : v.magnitudeValue >= 4.5 : true)
				.filter(v => this._filterIntensity ? v.data[0].areaIntensity == this._filterIntensityValue : true);

			for (const report of reports) {
				const element = this._createReportItem(report);
				if (
					(this._filterHasNumber && !(report.earthquakeNo % 1000))
					|| (this._filterHasReplay && !(report.ID?.length))
					|| (this._filterMagnitude && !(this._filterMagnitudeValue == 1 ? report.magnitudeValue < 4.5 : report.magnitudeValue >= 4.5))
					|| (this._filterIntensity && !(report.data[0].areaIntensity == this._filterIntensityValue))) {
					element.classList.add("hide");
					element.style.display = "none";
				} else
					this._markers.push(L.marker(
						[report.epicenterLat, report.epicenterLon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.cross,
								iconSize  : [report.magnitudeValue * 4, report.magnitudeValue * 4],
								className : `epicenterIcon ${IntensityToClassString(report.data[0].areaIntensity)}`,
							}),
							opacity      : (reports.length - reports.indexOf(report)) / reports.length,
							zIndexOffset : 1000 + reports.length - reports.indexOf(report),
						}));
				fragment.appendChild(element);
			}

			this._markersGroup = L.featureGroup(this._markers).addTo(Maps.report);
			this.reportListElement.appendChild(fragment);
		}
	},
	_createReportItem(data) {
		/**
		 * @type {HTMLElement}
		 */
		const el = document.importNode(this._reportItemTemplate.content, true).querySelector(".report-list-item");
		el.id = data.identifier;
		el.className += ` ${IntensityToClassString(data.data[0].areaIntensity)}`;
		el.querySelector(".report-list-item-location").innerText = data.location;
		el.querySelector(".report-list-item-id").innerText = data.earthquakeNo % 1000 ? data.earthquakeNo : "小區域有感地震";
		el.querySelector(".report-list-item-time").innerText = data.originTime.replace(/-/g, "/");
		el.querySelector("button").value = data.identifier;
		el.querySelector("button").addEventListener("click", function() {
			TREM.Report.setView("report-overview", this.value);
		});
		ripple(el.querySelector("button"));
		return el;
	},
	/**
	 * @param {*} key
	 * @param {*} value
	 * @param {HTMLSelectElement} select
	 */
	_handleFilter(key, value, select) {
		const oldlist = [...this.reportList];
		this[`_${key}`] = value;

		if (select) {
			const parent = document.getElementById(select.id.slice(0, select.id.length - 6));
			if (!parent.checked)
				return parent.click();
		}

		this.reportList = Array.from(this.cache, ([k, v]) => v)
			.filter(v => this._filterHasNumber ? v.earthquakeNo % 1000 != 0 : true)
			.filter(v => this._filterHasReplay ? v.ID?.length : true)
			.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == 1 ? v.magnitudeValue < 4.5 : v.magnitudeValue >= 4.5 : true)
			.filter(v => this._filterIntensity ? v.data[0].areaIntensity == this._filterIntensityValue : true);

		this._updateReports(oldlist, this.reportList);
	},
	setView(view, reportIdentifier) {
		if (this.view == view)
			if (!reportIdentifier)
				return;

		const oldView = document.getElementById(this.view);
		const newView = document.getElementById(view);

		document.getElementById("report-detail-body").style.height = `${oldView.offsetHeight}px`;
		document.getElementById("report-detail-body").style.width = `${oldView.offsetWidth}px`;

		switch (view) {
			case "report-list": {
				this._clearMap(true);
				this.loadReports(true);
				document.getElementById("report-detail-back").classList.add("hide");
				document.getElementById("report-detail-refresh").classList.remove("hide");
				break;
			}

			case "report-overview": {
				if (this.view == "report-list") this.unloadReports();
				this._setupReport(this.cache.get(reportIdentifier));
				document.getElementById("report-detail-back").classList.remove("hide");
				document.getElementById("report-detail-refresh").classList.add("hide");
				break;
			}

			default:
				break;
		}

		if (this.view != view) {
			oldView.classList.remove("show");
			newView.style.position = "absolute";
			newView.style.visibility = "visible";
			document.getElementById("report-detail-body").style.height = `${newView.offsetHeight}px`;
			document.getElementById("report-detail-body").style.width = `${newView.offsetWidth}px`;
			setTimeout(() => {
				oldView.style.visibility = "hidden";
				newView.classList.add("show");
			}, 250);
		}

		setTimeout(() => {
			newView.style.position = "";
			document.getElementById("report-detail-body").style.height = "";
			document.getElementById("report-detail-body").style.width = "";
		}, 500);

		this.view = view;
	},
	replay(id) {
		const report = this.cache.get(id);
		if (replay != 0) return;
		changeView("main", "#mainView_btn");
		if (report.ID.length != 0) {
			localStorage.TestID = report.ID;
			ipcRenderer.send("testEEW");
		} else {
			replay = new Date(report.originTime).getTime() - 25000;
			replayT = NOW.getTime();
		}
		toggleNav(false);
		document.getElementById("togglenav_btn").classList.add("hide");
		document.getElementById("stopReplay").classList.remove("hide");
	},
	back() {
		switch (this.view) {
			case "report-overview":
				this.setView("report-list");
				break;

			default:
				break;
		}
	},
	refreshList() {
		this.unloadReports();
		this.loadReports();
	},
	copyReport(id) {
		const { clipboard, shell } = require("electron");
		const report = this.cache.get(id);
		const string = [];
		string.push(`　　　　　　　　　　中央氣象局地震測報中心　${report.earthquakeNo % 1000 ? `第${report.earthquakeNo - 111000}號` : "小區域"}有感地震報告`);
		const time = new Date(report.originTime);
		string.push(`　　　　　　　　　　發　震　時　間： ${time.getFullYear() - 1911}年${(time.getMonth() + 1 < 10 ? " " : "") + (time.getMonth() + 1)}月${(time.getDate() < 10 ? " " : "") + time.getDate()}日${(time.getHours() < 10 ? " " : "") + time.getHours()}時${(time.getMinutes() < 10 ? " " : "") + time.getMinutes()}分${(time.getSeconds() < 10 ? " " : "") + time.getSeconds()}秒`);
		string.push(`　　　　　　　　　　震　央　位　置： 北　緯　 ${report.epicenterLat.toFixed(2)} °`);
		string.push(`　　　　　　　　　　　　　　　　　　 東  經　${report.epicenterLon.toFixed(2)} °`);
		string.push(`　　　　　　　　　　震　源　深　度：　 ${report.depth < 10 ? " " : ""}${report.depth.toFixed(1)}  公里`);
		string.push(`　　　　　　　　　　芮　氏　規　模：　  ${report.magnitudeValue.toFixed(1)}`);
		string.push(`　　　　　　　　　　相　對　位　置： ${report.location}`);
		string.push("");
		string.push("                                 各 地 震 度 級");
		string.push("");

		const name = (text) => text.length < 3 ? text.split("").join("　") : text;
		const int = (number) => `${IntensityI(number)}級`.replace("-級", "弱").replace("+級", "強");
		const areas = [];

		for (const areaData of report.data) {
			const areaString = [];
			areaString.push(`${areaData.areaName}地區最大震度 ${int(areaData.areaIntensity)}`);
			for (const stationData of areaData.eqStation)
				areaString.push(`　　　${name(stationData.stationName)} ${int(stationData.stationIntensity)}　　　`);

			areas.push(areaString);
		}

		let count = areas.length;
		if (count > 2)
			while (count > 0) {
				const threeAreas = [ areas.shift(), areas.shift(), areas.shift() ];
				const whichToLoop = threeAreas[threeAreas.reduce((p, c, i, a) => a[p]?.length > c?.length ? p : i, 0)];
				const theLine = [];
				for (const index in whichToLoop) {
					const a = threeAreas[0][index];
					const b = threeAreas[1][index];
					const c = threeAreas[2][index];
					let strToPush = "";
					if (a)
						strToPush += a;
					else
						strToPush += "　　　　　　　　　　　";

					if (b)
						strToPush += `　　　${b}`;
					else
						strToPush += "　　　　　　　　　　　　　　";

					if (c)
						strToPush += `　　　${c}`;
					else
						strToPush += "　　　　　　　　　　　";
					theLine.push(strToPush.trimEnd());
				}
				string.push(theLine.join("\n"));
				count -= 3;
				continue;
			}
		else
			for (const area of areas) {
				const theLine = [];
				for (const str of area) {
					let strToPush = "";
					if (str)
						strToPush += `　　　　　　　　　　　　　　${str}`;

					theLine.push(strToPush.trimEnd());
				}
				string.push(theLine.join("\n"));
			}

		const filepath = path.join(app.getPath("temp"), `TREM_Report_${id}.txt`);
		fs.writeFileSync(filepath, string.join("\n"), { encoding: "utf-8" });
		shell.openPath(filepath);
		setTimeout(() => fs.rmSync(filepath), 500);
	},
	/**
	 * @param {EarthquakeReport[]} oldlist
	 * @param {EarthquakeReport[]} newlist
	 */
	_updateReports(oldlist, newlist) {
		const removed = oldlist.filter(v => !newlist.includes(v));
		const added = newlist.filter(v => !oldlist.includes(v));
		const keys = [...this.cache.keys()];

		this._clearMap();

		for (const report of removed)
			this._hideItem(document.getElementById(report.identifier));

		for (const report of added)
			this._showItem(document.getElementById(report.identifier));

		for (const report of newlist)
			this._markers.push(L.marker(
				[report.epicenterLat, report.epicenterLon],
				{
					icon: L.divIcon({
						html      : TREM.Resources.icon.cross,
						iconSize  : [report.magnitudeValue * 4, report.magnitudeValue * 4],
						className : `epicenterIcon ${IntensityToClassString(report.data[0].areaIntensity)}`,
					}),
					opacity      : (newlist.length - newlist.indexOf(report)) / newlist.length,
					zIndexOffset : 1000 + this.cache.size - keys.indexOf(report.identifier),
				}));

		this._markersGroup = L.featureGroup(this._markers).addTo(Maps.report);
	},
	/**
	 * @param {HTMLElement} element
	 */
	_hideItem(element) {
		element.classList.add("hide");
		setTimeout(() => element.style.display = "none", 200);
	},
	/**
	 * @param {HTMLElement} element
	 * @param {HTMLElement} reference
	 */
	_showItem(element) {
		element.style.display = "";
		setTimeout(() => element.classList.remove("hide"), 10);
	},
	_focusMap(...args) {
		if (args.length) {
			this._lastFocus = [...args];
			Maps.report.fitBounds(...args);
		} else if (this._lastFocus.length)
			Maps.report.fitBounds(...this._lastFocus);
		else {
			this._lastFocus = [[[25.35, 119.4], [21.9, 122.22]], {
				paddingTopLeft: [
					this._mapPaddingLeft,
					0,
				],
			}];
			Maps.report.fitBounds(...this._lastFocus);
		}
	},
	_clearMap(resetFoucs = false) {
		if (this._markersGroup) {
			this._markersGroup.remove();
			this._markersGroup = null;
			this._markers = [];
		}
		if (resetFoucs) {
			this._lastFocus = [];
			this._focusMap();
		}
	},
	/**
	 * @param {EarthquakeReport} report
	 */
	_setupReport(report) {
		this._clearMap();

		document.getElementById("report-overview-number").innerText = report.earthquakeNo % 1000 ? report.earthquakeNo : "小區域有感地震";
		document.getElementById("report-overview-location").innerText = report.location;
		const time = new Date(`${report.originTime} GMT+08:00`);
		document.getElementById("report-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
		document.getElementById("report-overview-latitude").innerText = report.epicenterLat;
		document.getElementById("report-overview-longitude").innerText = report.epicenterLon;
		const int = `${IntensityI(report.data[0].areaIntensity)}`.split("");
		document.getElementById("report-overview-intensity").innerText = int[0];
		document.getElementById("report-overview-intensity").className = (int[1] == "+") ? "strong"
			: (int[1] == "-") ? "weak"
				: "";
		document.getElementById("report-overview-intensity-location").innerText = `${report.data[0].areaName} ${report.data[0].eqStation[0].stationName}`;
		document.getElementById("report-overview-magnitude").innerText = report.magnitudeValue;
		document.getElementById("report-overview-depth").innerText = report.depth;

		document.getElementById("report-detail-copy").value = report.identifier;
		document.getElementById("report-replay").value = report.identifier;

		const cwb_code = "EQ"
			+ report.earthquakeNo
			+ "-"
			+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
			+ (time.getDate() < 10 ? "0" : "") + time.getDate()
			+ "-"
			+ (time.getHours() < 10 ? "0" : "") + time.getHours()
			+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
			+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds();
		document.getElementById("report-cwb").value = `https://www.cwb.gov.tw/V8/C/E/EQ/${cwb_code}.html`;

		const scweb_code = ""
			+ time.getFullYear()
			+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
			+ (time.getDate() < 10 ? "0" : "") + time.getDate()
			+ (time.getHours() < 10 ? "0" : "") + time.getHours()
			+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
			+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds()
			+ (report.magnitudeValue * 10)
			+ (report.earthquakeNo - 111000 ? report.earthquakeNo - 111000 : "");
		document.getElementById("report-scweb").value = `https://scweb.cwb.gov.tw/zh-tw/earthquake/details/${scweb_code}`;

		for (const data of report.data)
			for (const eqStation of data.eqStation)
				this._markers.push(L.marker(
					[eqStation.stationLat, eqStation.stationLon],
					{
						icon: L.divIcon({
							iconSize  : [16, 16],
							className : `map-intensity-icon ${IntensityToClassString(eqStation.stationIntensity)}`,
						}),
						zIndexOffset: 100 + IntensityToClassString(eqStation.stationIntensity),
					}));

		this._markers.push(L.marker(
			[report.epicenterLat, report.epicenterLon],
			{
				icon: L.divIcon({
					html      : TREM.Resources.icon.cross,
					iconSize  : [32, 32],
					className : "epicenterIcon",
				}),
				zIndexOffset: 5000,
			}));

		this._markersGroup = L.featureGroup(this._markers).addTo(Maps.report);

		const zoomPredict = (Maps.report.getBoundsZoom(this._markersGroup.getBounds()) - Maps.report.getMinZoom()) / (Maps.report.getMaxZoom() * (1.5 ** (Maps.report.getBoundsZoom(this._markersGroup.getBounds()) - Maps.report.getMinZoom())));
		this._focusMap(this._markersGroup.getBounds(), {
			paddingTopLeft: [
				document.getElementById("map-report").offsetWidth / 2,
				document.getElementById("map-report").offsetHeight * zoomPredict,
			],
			paddingBottomRight: [
				document.getElementById("map-report").offsetWidth * zoomPredict,
				document.getElementById("map-report").offsetHeight * zoomPredict,
			],
		});
	},
};

TREM.on("viewChange", (oldView, newView) => {
	switch (oldView) {
		case "report": {
			TREM.Report.unloadReports();
			break;
		}

		default:
			break;
	}
	switch (newView) {
		case "report": {
			TREM.Report.loadReports();
			Maps.report.invalidateSize();
			break;
		}
		case "intensity": {
			Maps.intensity.invalidateSize();
			break;
		}

		default:
			break;
	}
});