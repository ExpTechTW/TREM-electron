const fetch = require("node-fetch");

module.exports = async function([ReplayTime, key], cb) {
	const controller = new AbortController();
	setTimeout(() => {
		controller.abort();
	}, 950);
	let ans = await fetch(`https://exptech.com.tw/api/v1/trem/RTS?time=${ReplayTime}&key=${key}`, { signal: controller.signal }).catch((err) => void 0);
	if (controller.signal.aborted || ans == undefined) {
		cb(true);
		return;
	}
	ans = await ans.json();
	cb(false, ans);
};