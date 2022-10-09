/* global IntensityToClassString: false, reportCache: false */
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
		const el = document.importNode(this._reportItemTemplate.content, true).querySelector(".report-list-item");
		el.id = data.identifier;
		el.className += ` ${IntensityToClassString(data.data[0].areaIntensity)}`;
		el.querySelector(".report-list-item-location").innerText = data.location;
		el.querySelector(".report-list-item-time").innerText = data.originTime.replace(/-/g, "/");
		el.querySelector("button").value = data.identifier;
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
	_setView(view, report) {
		const oldView = document.getElementById(this.view);
		const newView = document.getElementById(view);
		if (oldView.classList.contains("show"))
			oldView.classList.remove("show");
		if (!newView.classList.contains("show"))
			newView.classList.add("show");

		switch (view) {
			case "report-list": {
				this.loadReports();
				break;
			}

			case "report-overview": {
				if (this.view == "report-list") this.unloadReports();

				break;
			}

			default:
				break;
		}
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
			break;
		}

		default:
			break;
	}
});