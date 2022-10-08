/* global IntensityToClassString: false, reportCache: false */
TREM.Report = {
	/**
     * @type {HTMLTemplateElement}
     */
	_reportItemTemplate: document.getElementById("template-report-list-item"),
	unloadReports() {
		document.getElementById("report-list-container").replaceChildren();
	},
	loadReports() {
		const fragment = new DocumentFragment();

		for (const report of reportCache)
			fragment.appendChild(this._createReportItem(report));

		console.log(fragment);
		document.getElementById("report-list-container").appendChild(fragment);
	},
	/**
     * @param {EarthquakeReport} data
     */
	_createReportItem(data) {
		const el = this._reportItemTemplate.content.cloneNode(true);
		el.querySelector(".report-list-item-intensity").className += ` ${IntensityToClassString(data.data[0].areaIntensity)}`;
		el.querySelector(".report-list-item-location").innerText = data.location;
		el.querySelector(".report-list-item-time").innerText = data.originTime.replace(/-/g, "/");
		return el;
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