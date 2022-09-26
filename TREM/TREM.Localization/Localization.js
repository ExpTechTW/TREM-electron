const Dictionary = require("./Dictionary.js");

class Localization {
	constructor(defaultLocale, fallbackLocale = "zh-TW") {
		this.defaultLocale = defaultLocale;
		this.fallbackLocale = Localization.availableLocales.includes(fallbackLocale) ? fallbackLocale
			: Localization.availableLocales.includes(fallbackLocale.slice(0, 2)) ? fallbackLocale.slice(0, 2)
				: fallbackLocale.startsWith("zh") ? "zh-TW"
					: "en";

		for (const locale of Localization.availableLocales)
			this[locale] = new Dictionary(locale);
	}

	static availableLocales = ["en", "ja", "kr", "ru", "zh-TW"];

	matchLocale(value) {
		value = Localization.availableLocales.includes(value) ? value
			: Localization.availableLocales.includes(value.slice(0, 2)) ? value.slice(0, 2)
				: value.startsWith("zh") ? "zh-TW"
					: "en";
		return value;
	}

	setLocale(locale) {
		this.defaultLocale = locale;
	}

	getString(id, locale) {
		return this[locale]?.get(id) ?? this[this.defaultLocale]?.get(id) ?? this[this.fallbackLocale]?.get(id);
	}
}

module.exports = Localization;
