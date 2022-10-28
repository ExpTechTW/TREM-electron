/* global Maps: false, IntensityToClassString: false, Maps.intensity: true, IntensityI: false, changeView: false, replay: true, replayT: true */

TREM.intensity = {
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
};