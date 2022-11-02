const axios = require("axios");

module.exports = function(url, cb) {
	const CancelToken = axios.CancelToken;
	let cancel;
	setTimeout(() => {
		cancel();
	}, 2500);
	axios({
		method      : "get",
		url         : url,
		cancelToken : new CancelToken((c) => {
			cancel = c;
		}),
	}).then((response) => {
		cb(false, response.data);
	}).catch((err) => {
		cb(true);
	});
};