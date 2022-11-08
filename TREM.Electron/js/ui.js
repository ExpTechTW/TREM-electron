document.addEventListener("keydown", (event) => {
	if (event.key == "F11")
		ipcRenderer.send("toggleFullscreen");

	if (event.ctrlKey && event.shiftKey && event.key.toLocaleLowerCase() == "i")
		ipcRenderer.send("openDevtool");
});

const toggleNav = state => {
	if (state == undefined) {
		$("#nav-rail").toggleClass("hide");
		state = !$("#nav-rail").hasClass("hide");
	} else if (state) {
		$("#nav-rail").removeClass("hide");
	} else {
		$("#nav-rail").addClass("hide");
	}

	$("#togglenav_btn span.material-symbols-rounded").text(state ? "first_page" : "start");
};

document.addEventListener("keyup", (event) => {
	if (event.key == "F12")
		ipcRenderer.send("screenshot");
}, false);