const toggleNav = state => {
	if (state == undefined) {
		$("#nav-rail").toggleClass("hide");
		state = !$("#nav-rail").hasClass("hide");
	} else if (state)
		$("#nav-rail").removeClass("hide");
	else
		$("#nav-rail").addClass("hide");

	$("#togglenav_btn span").text(state ? "first_page" : "start");
};

const changeView = (args, el, event) => {
	if (event instanceof KeyboardEvent && event?.key !== "Enter" && event?.key !== " ")
		return;

	const currentel = $(".view.show");
	const changeel = $(`#${args}`);

	if (changeel.attr("id") == currentel.attr("id")) return;

	const currentnav = $(".active");
	currentnav.removeClass("active");
	$(el)?.addClass("active");

	currentel.fadeOut(100).removeClass("show").show();
	changeel.delay(100).hide().addClass("show").fadeIn(200);
};

const { desktopCapturer } = require("@electron/remote");

document.addEventListener("keyup", (event) => {
	if (event.key == "F12")
		ipcRenderer.send("screenshot");
}, false);