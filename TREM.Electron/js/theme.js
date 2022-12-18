let accent, is_dark;
const tinycolor = require("tinycolor2");

const setThemeColor = (color, dark) => {
  if (typeof color == "string") accent = color;

  if (dark != undefined) is_dark = dark;
  import("../node_modules/@material/material-color-utilities/dist/index.js").then(m => {
    // Get the theme from a hex color
    const theme = m.themeFromSourceColor(m.argbFromHex((typeof color == "boolean") ? accent : color));

    // Print out the theme as JSON
    // console.log(JSON.stringify(theme, null, 2));

    // Apply the theme to the body by updating custom properties for material tokens
    // document.body.style = "";
    if (typeof color == "boolean") {
      m.applyTheme(theme, { target: document.body, dark: color });

      if (color) {
        if (!document.body.classList.contains("darkmode"))
          document.body.classList.add("darkmode");
      } else if (document.body.classList.contains("darkmode")) {
        document.body.classList.remove("darkmode");
      }
    } else {
      m.applyTheme(theme, { target: document.body, dark: dark ?? is_dark });

      if (dark ?? is_dark) {
        if (!document.body.classList.contains("darkmode"))
          document.body.classList.add("darkmode");
      } else if (document.body.classList.contains("darkmode")) {
        document.body.classList.remove("darkmode");
      }
    }
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

    colors.surface1 = tinycolor.mix(colors.surface, colors.primary, 5).toHexString();
    colors.surface2 = tinycolor.mix(colors.surface, colors.primary, 8).toHexString();
    colors.surface3 = tinycolor.mix(colors.surface, colors.primary, 11).toHexString();
    colors.surface4 = tinycolor.mix(colors.surface, colors.primary, 12).toHexString();
    colors.surface5 = colors.surface4;
    colors.surface6 = tinycolor.mix(colors.surface, colors.primary, 14).toHexString();

    resolve(colors);
  }));