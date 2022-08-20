const fs = require("node:fs");
const v8 = require("v8");
const vm = require("vm");

v8.setFlagsFromString("--no-lazy");

const compileFile = filePath => {
	if (!fs.existsSync("./js/compiled"))
		fs.mkdirSync("./js/compiled");

	console.log(`\ncompiling ${filePath}`);
	try {
		const code = fs.readFileSync(filePath, "utf-8");
		const script = new vm.Script(code);
		const bytecode = script.createCachedData();
		const outpath = filePath.replace("/js/", "/js/compiled/").replace(".js", ".jar");
		fs.writeFileSync(outpath, bytecode);
		console.log(`-> done compiling: ${outpath}`);
	} catch (error) {
		console.error(`-> ${error}`);
	}
};

compileFile("./js/earthquake.js");
compileFile("./js/dump.js");
compileFile("./js/setting.js");