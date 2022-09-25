const Dictionary = require("./Dictionary.js");

class Localization {
	constructor(defaultLocale, fallbackLocale = "zh-TW") {
		const availableLocales = ["en", "ja", "ru", "zh-TW"];
		this.defaultLocale = defaultLocale;
		this.fallbackLocale = availableLocales.includes(fallbackLocale) ? fallbackLocale
			: availableLocales.includes(fallbackLocale.slice(0, 2)) ? fallbackLocale.slice(0, 2)
				: "zh-TW";

		for (const locale of availableLocales)
			this[locale] = new Dictionary(locale);
	}

	getString(id, locale) {
		return this[locale]?.get(id) ?? this[this.defaultLocale]?.get(id) ?? this[this.fallbackLocale]?.get(id);
	}
}

module.exports = Localization;
