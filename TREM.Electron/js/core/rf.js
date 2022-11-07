/* eslint-disable no-empty-function */
const axios = require("axios");
const fetch = require("node-fetch");

module.exports = async function([key], cb) {
	const controller = new AbortController();
	setTimeout(() => {
		controller.abort();
	}, 500);
	let ans = await fetch(`http://rexisstudio.tplinkdns.com:8787/cgi-bin/get_record.py?timestamp=${key}`, { signal: controller.signal }).catch((err) => {});

	if (controller.signal.aborted || ans == undefined) {
		cb(true);
		return;
	}

	ans = await ans.json();
	cb(false, ans);
};