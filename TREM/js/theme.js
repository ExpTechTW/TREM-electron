let accent, is_dark;
const setThemeColor = (color, dark) => {
	if (color?.startsWith("#")) accent = color;
	if (dark != undefined) is_dark = dark;
	import("../node_modules/@material/material-color-utilities/dist/index.js").then(m => {
		// Get the theme from a hex color
		const theme = m.themeFromSourceColor(m.argbFromHex((typeof color == "boolean") ? accent : color));

		// Print out the theme as JSON
		// console.log(JSON.stringify(theme, null, 2));

		// Apply the theme to the body by updating custom properties for material tokens
		document.body.style = "";
		if (typeof color == "boolean")
			m.applyTheme(theme, { target: document.body, dark: color });
		else
			m.applyTheme(theme, { target: document.body, dark: dark ?? is_dark });
	});
};

const getThemeColors = (color, dark) =>
	new Promise((resolve) => import("../node_modules/@material/material-color-utilities/dist/index.js").then(m => {
	// Get the theme from a hex color
		const theme = m.themeFromSourceColor(m.argbFromHex(color));
		const scheme = theme.schemes[dark ? "dark" : "light"];
		const colors = {};
		for (const [key, value] of Object.entries(scheme.toJSON()))
			colors[key] = m.hexFromArgb(value);
		resolve(colors);
	}));