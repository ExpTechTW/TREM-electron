/* global IntensityToClassString: false, reportCache: false, mapReport: true, IntensityI: false, changeView: false, replay: true, replayT: true */


TREM.Report = {
	view                  : "report-list",
	reportList            : [],
	reportListElement     : document.getElementById("report-list-container"),
	/**
	 * @type {L.Marker[]}
	 */
	_markers              : [],
	/**
	 * @type {L.FeatureGroup}
	 */
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
	unloadReports() {
		this.reportListElement.replaceChildren();
	},
	loadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) {
			const fragment = new DocumentFragment();

			this.reportList = reportCache
				.filter(v => this._filterHasNumber ? v.earthquakeNo % 1000 != 0 : true)
				.filter(v => this._filterHasReplay ? v.ID?.length : true)
				.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == 1 ? v.magnitudeValue < 4.5 : v.magnitudeValue >= 4.5 : true)
				.filter(v => this._filterIntensity ? v.data[0].areaIntensity == this._filterIntensityValue : true);

			for (const report of this.reportList)
				fragment.appendChild(this._createReportItem(report));

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
		el.querySelector(".report-list-item-time").innerText = data.originTime.replace(/-/g, "/");
		el.querySelector("button").value = data.identifier;
		el.querySelector("button").addEventListener("click", function() {
			TREM.Report.setView("report-overview", this.value);
		});
		ripple(el.querySelector("button"));
		return el;
	},
	_handleFilter(key, value) {
		const oldlist = [...this.reportList];
		this[`_${key}`] = value;
		this.reportList = reportCache
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
				this.loadReports(true);
				this._clearMap(true);
				break;
			}

			case "report-overview": {
				if (this.view == "report-list") this.unloadReports();
				this._setupReport(reportCache.find(v => v.identifier == reportIdentifier));
				break;
			}

			default:
				break;
		}

		oldView.classList.remove("show");
		newView.style.visibility = "visible";
		document.getElementById("report-detail-body").style.height = `${newView.offsetHeight}px`;
		document.getElementById("report-detail-body").style.width = `${newView.offsetWidth}px`;
		setTimeout(() => {
			if (this.view != view) oldView.style.visibility = "hidden";
			newView.classList.add("show");
			setTimeout(() => {
				document.getElementById("report-detail-body").style.height = "";
				document.getElementById("report-detail-body").style.width = "";
			}, 250);
		}, 250);

		this.view = view;
	},
	replay(id) {
		const report = reportCache.find(v => v.identifier == id);
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
	/**
	 * @param {EarthquakeReport[]} oldlist
	 * @param {EarthquakeReport[]} newlist
	 */
	_updateReports(oldlist, newlist) {
		const removed = oldlist.filter(v => !newlist.includes(v));
		const added = newlist.filter(v => !oldlist.includes(v));

		for (const report of removed)
			this._removeItem(document.getElementById(report.identifier));

		for (const report of added)
			this._addItem(this._createReportItem(report));
	},
	/**
	 * @param {HTMLElement} element
	 */
	_removeItem(element) {
		element.classList.add("hide");
		setTimeout(() => element.remove(), 200);
	},
	/**
	 * @param {HTMLElement} element
	 * @param {HTMLElement} reference
	 */
	_addItem(element) {
		element.classList.add("hide");
		const index = this.reportList.findIndex(v => v.identifier == element.id) - 1;
		const ref = document.getElementById(this.reportList[index]?.identifier)?.nextSibling;
		this.reportListElement.insertBefore(element, ref);
		setTimeout(() => element.classList.remove("hide"), 10);
	},
	_focusMap(...args) {
		if (args.length) {
			this._lastFocus = [...args];
			mapReport.fitBounds(...args);
		} else if (this._lastFocus.length)
			mapReport.fitBounds(...this._lastFocus);
		else {
			this._lastFocus = [[[25.35, 119.4], [21.9, 122.22]], {
				paddingTopLeft: [
					this._mapPaddingLeft,
					0,
				],
			}];
			mapReport.fitBounds(...this._lastFocus);
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

		document.getElementById("report-overview-number").innerText = report.earthquakeNo % 1000 == 0 ? "小區域有感地震" : report.earthquakeNo;
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
		document.getElementById("report-overview-magnitude").innerText = report.magnitudeValue;
		document.getElementById("report-overview-depth").innerText = report.depth;

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
			for (const eqStation of data.eqStation) {
				const marker = L.marker(
					[eqStation.stationLat, eqStation.stationLon],
					{
						icon: L.divIcon({
							iconSize  : [16, 16],
							className : `map-intensity-icon ${IntensityToClassString(eqStation.stationIntensity)}`,
						}),
						zIndexOffset: 100 + IntensityToClassString(eqStation.stationIntensity),
					});
				this._markers.push(marker);
			}

		this._markersGroup = L.featureGroup(this._markers).addTo(mapReport);

		const zoomPredict = (mapReport.getBoundsZoom(this._markersGroup.getBounds()) - mapReport.getMinZoom()) / (mapReport.getMaxZoom() * (1.5 ** (mapReport.getBoundsZoom(this._markersGroup.getBounds()) - mapReport.getMinZoom())));
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
			mapReport.invalidateSize();
			break;
		}

		default:
			break;
	}
});