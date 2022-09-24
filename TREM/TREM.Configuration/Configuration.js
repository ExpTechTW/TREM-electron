const Constants = require("../TREM.Constants/Constants");
const EventEmitter = require("node:events");
const chokidar = require("chokidar");
const fs = require("node:fs");
const path = require("node:path");

class Configuration extends EventEmitter {
	constructor(app) {
		super();
		try {
			this._folder = path.join(app.getPath("userData"));
			this._path = path.join(app.getPath("userData"), "settings.json");
			if (!fs.existsSync(this._path))
				fs.writeFileSync(this._path, JSON.stringify(Object.keys(Constants.Default_Configurations).reduce((acc, key) => {
					acc[key] = Constants.Default_Configurations[key].value;
					return acc;
				}, {}), null, 2), { encoding: "utf-8" });

			this._data = JSON.parse(fs.readFileSync(this._path, { encoding: "utf-8" }));

			this.backup();

			for (let i = 0,
				k = Object.keys(this._data),
				dk = Object.keys(Constants.Default_Configurations),
				n = dk.length; i < n; i++)
				if (dk.includes(k[i])) {
					const dki = dk.indexOf(k[i]);
					if (typeof this._data[k[i]] != typeof Constants.Default_Configurations[dk[dki]].value)
						this._data[k[i]] = Constants.Default_Configurations[dk[dki]].value;
				} else
					delete this._data[k[i]];

			this.save();

			const thisClass = this;
			this._proxy = new Proxy(this._data, {
				set(target, key, value) {
					target[key] = value;
					thisClass.save();
				},
			});
			this._watcher = chokidar.watch(this._path).on("change", () => {
				try {
					const _newData = fs.readFileSync(this._path, { encoding: "utf-8" });
					if (JSON.stringify(this._data, null, 2) == _newData) return;
					this._data = JSON.parse(_newData);
					this.emit("update", this._data);
				} catch (error) {
					this.emit("error", error);
				}
			});
		} catch (error) {
			console.error(error);
			app.exit(1);
		}
	}

	get data() {
		return this._proxy;
	}

	get path() {
		return this._path;
	}

	backup() {
		const files = fs.readdirSync(this._folder).filter(filename => filename.startsWith("backup~") && filename.endsWith(".json"));
		if (files.length)
			for (const file of files)
				fs.rmSync(path.join(this._folder, file));

		fs.writeFileSync(path.join(this._folder, `backup~${Date.now()}_settings.json`), JSON.stringify(this._data, null, 2), { encoding: "utf-8" });
	}

	save() {
		fs.writeFileSync(this._path, JSON.stringify(this._data, null, 2), { encoding: "utf-8" });
	}
}

module.exports = Configuration;