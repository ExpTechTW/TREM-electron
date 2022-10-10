/* global IntensityToClassString: false, reportCache: false, mapReport: true, IntensityI: false */
TREM.Report = {
	view                  : "report-list",
	reportList            : [],
	reportListElement     : document.getElementById("report-list-container"),
	_filterHasReplay      : false,
	_filterHasNumber      : false,
	_filterMagnitude      : false,
	_filterMagnitudeValue : 2,
	_filterIntensity      : false,
	_filterIntensityValue : 4,
	_reportItemTemplate   : document.getElementById("template-report-list-item"),
	unloadReports() {
		this.reportListElement.replaceChildren();
	},
	loadReports() {
		const fragment = new DocumentFragment();

		this.reportList = reportCache
			.filter(v => this._filterHasNumber ? v.earthquakeNo % 1000 != 0 : true)
			.filter(v => this._filterHasReplay ? v.ID?.length : true)
			.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == 1 ? v.magnitudeValue < 4.5 : v.magnitudeValue >= 4.5 : true)
			.filter(v => this._filterIntensity ? v.data[0].areaIntensity == this._filterIntensityValue : true);

		for (const report of this.reportList)
			fragment.appendChild(this._createReportItem(report));

		this.reportListElement.appendChild(fragment);
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
			set_report_overview = 0;
			TREM.Report.setView("report-overview", this.value);
			ReportClick(data.originTime, this.value);
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
		if (this.view == view) return;
		const oldView = document.getElementById(this.view);
		const newView = document.getElementById(view);

		document.getElementById("report-detail-body").style.height = `${oldView.offsetHeight}px`;
		document.getElementById("report-detail-body").style.width = `${oldView.offsetWidth}px`;

		switch (view) {
			case "report-list": {
				this.loadReports();
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
			oldView.style.visibility = "hidden";
			newView.classList.add("show");
			setTimeout(() => {
				document.getElementById("report-detail-body").style.height = "";
				document.getElementById("report-detail-body").style.width = "";
			}, 400);
		}, 400);

		this.view = view;
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
	/**
	 * @param {EarthquakeReport} report
	 */
	_setupReport(report) {
		if (report.ID.length != 0) {
			document.getElementById("replayOverviewButton").style.display = "block"
			document.getElementById("replayOverviewButton").onclick = function(){
				replayOverviewButton(report);
			};
		}else{
			document.getElementById("replayOverviewButton").style.display = "none"
		}
		if (set_report_overview != 0) {
			document.getElementById("reportOverviewButton").onclick = function(){
				backindexButton();
			};
		}else{
			document.getElementById("reportOverviewButton").onclick = function(){
				reportOverviewButton();
			};
		}
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