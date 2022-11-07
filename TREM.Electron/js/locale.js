const setLocale = (language) => {
	if ([
		"en",
		"ja",
		"kr",
		"ru",
		"zh-CN",
		"zh-TW",
	].includes(language)) {
		const lang = ":lang(" + language + ")";
		const hide = ":not(html)[lang]:not(" + lang + ")";
		document.querySelectorAll(hide).forEach((node) => node.style.display = "none");
		const show = "[lang]" + lang;
		document.querySelectorAll(show).forEach((node) => node.style.display = "unset");
		document.documentElement.lang = language;
	}
};