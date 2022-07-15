const setThemeColor = (color, dark) => {
	import("../node_modules/@material/material-color-utilities/dist/index.js").then(m => {
	// Get the theme from a hex color
		const theme = m.themeFromSourceColor(m.argbFromHex(color));

		// Print out the theme as JSON
		// console.log(JSON.stringify(theme, null, 2));

		// Apply the theme to the body by updating custom properties for material tokens
		document.body.style = "";
		m.applyTheme(theme, { target: document.body, dark });
	});
};