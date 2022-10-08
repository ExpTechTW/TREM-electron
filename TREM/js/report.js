/* global IntensityToClassString: false, reportCache: false */
TREM.Report = {
	view                  : "list",
	_filterHasReplay      : false,
	_filterHasNumber      : false,
	_filterMagnitude      : false,
	_filterMagnitudeValue : false,
	_filterIntensity      : false,
	_filterIntensityValue : false,
	_reportItemTemplate   : document.getElementById("template-report-list-item"),
	unloadReports() {
		document.getElementById("report-list-container").replaceChildren();
	},
	loadReports() {
		const fragment = new DocumentFragment();
		const reports = reportCache
			.filter(v => this._filterHasNumber ? v.earthquakeNo % 1000 != 0 : true)
			.filter(v => this._filterHasReplay ? v.ID?.length : true)
			.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == 1 ? v.magnitudeValue < 4 : v.magnitudeValue >= 4 : true)
			.filter(v => this._filterIntensity ? v.data[0].areaIntensity == this._filterIntensityValue : true);

		for (const report of reports)
			fragment.appendChild(this._createReportItem(report));

		document.getElementById("report-list-container").appendChild(fragment);
	},
	_createReportItem(data) {
		const el = this._reportItemTemplate.content.cloneNode(true);
		el.querySelector(".report-list-item").className += ` ${IntensityToClassString(data.data[0].areaIntensity)}`;
		el.querySelector(".report-list-item-location").innerText = data.location;
		el.querySelector(".report-list-item-time").innerText = data.originTime.replace(/-/g, "/");
		return el;
	},
	_handleFilter(key, value) {
		this[`_${key}`] = value;
		this.unloadReports();
		this.loadReports();
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