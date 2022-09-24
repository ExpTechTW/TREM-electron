const fps = document.getElementById("fps");
let startTime = Date.now();
let frame = 0;

console.log(process.argv);
ipcRenderer.on("perf", () => {
	(function tick() {
		const time = Date.now();
		frame++;
		if (time - startTime > 1000) {
			fps.innerHTML = (frame / ((time - startTime) / 1000)).toFixed(1);
			startTime = time;
			frame = 0;
		}
		window.requestAnimationFrame(tick);
	})();

	document.getElementById("performance-detail").style.display = "grid";
});
