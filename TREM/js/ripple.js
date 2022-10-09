(function($, window, document) {
	const $ripple = $(".md3-ripple");

	const mdripple = $("<div>", {
		class: "md3-ripple__container",
	}).hide();

	$("<span>", {
		class: "md3-ripple__circle",
	}).appendTo(mdripple);

	$ripple.on("click.ui.ripple", function(e) {
		const $this = $(this);
		const $offset = $this.offset();
		const $container = $this.find(".md3-ripple__container");
		const $circle = $container.find(".md3-ripple__circle");

		const x = e.pageX - $offset.left;
		const y = e.pageY - $offset.top;

		$circle.css({
			top  : y + "px",
			left : x + "px",
		});

		$container.show().addClass("is-active");
	});

	mdripple.on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function(e) {
		$(this).removeClass("is-active").hide();
	});

	$ripple.append(mdripple);
})($, window, document);

function ripple(element) {
	const $ripple = $(element);

	const mdripple = $("<div>", {
		class: "md3-ripple__container",
	}).hide();

	$("<span>", {
		class: "md3-ripple__circle",
	}).appendTo(mdripple);

	$ripple.on("click.ui.ripple", function(e) {
		const $this = $(this);
		const $offset = $this.offset();
		const $container = $this.find(".md3-ripple__container");
		const $circle = $container.find(".md3-ripple__circle");

		const x = e.pageX - $offset.left;
		const y = e.pageY - $offset.top;

		$circle.css({
			top  : y + "px",
			left : x + "px",
		});

		$container.show().addClass("is-active");
	});

	mdripple.on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function(e) {
		$(this).removeClass("is-active").hide();
	});

	$ripple.append(mdripple);
}