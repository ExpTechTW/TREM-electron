(function($, window, document) {
	const $ripple = $(".md3-ripple");

	const mdripple = $("<div>", {
		class: "md3-ripple__container",
	});

	$("<span>", {
		class: "md3-ripple__circle",
	}).appendTo(mdripple);

	mdripple.on("click.ui.ripple", function(e) {
		const $this = $(this);
		const $offset = $this.parent().offset();
		const $circle = $this.find(".md3-ripple__circle");

		const x = e.pageX - $offset.left;
		const y = e.pageY - $offset.top;

		$circle.css({
			top  : y + "px",
			left : x + "px",
		});

		$this.addClass("is-active");
	});

	mdripple.on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function(e) {
		$(this).removeClass("is-active");
	});

	$ripple.append(mdripple);
})($, window, document);

function ripple(element) {
	const $ripple = $(element);

	const mdripple = $("<div>", {
		class: "md3-ripple__container",
	});

	$("<span>", {
		class: "md3-ripple__circle",
	}).appendTo(mdripple);

	mdripple.on("click.ui.ripple", function(e) {
		const $this = $(this);
		const $offset = $this.parent().offset();
		const $circle = $this.find(".md3-ripple__circle");

		const x = e.pageX - $offset.left;
		const y = e.pageY - $offset.top;

		$circle.css({
			top  : y + "px",
			left : x + "px",
		});

		$this.addClass("is-active");
	});

	mdripple.on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function(e) {
		$(this).removeClass("is-active");
	});

	$ripple.append(mdripple);
}