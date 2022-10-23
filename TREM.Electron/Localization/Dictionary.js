const fs = require("node:fs");
const path = require("node:path");

class Dictionary extends Map {
	constructor(locale) {
		super();
		const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, `./dict/${locale}.json`)));
		for (const key in raw)
			this.set(key, raw[key]);
	}
}

module.exports = Dictionary;