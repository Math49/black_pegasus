import localFont from "next/font/local";

// Polices locales (docs/handoff/assets/fonts). Chaque famille est découpée en deux
// sous-ensembles (latin / latin-ext) qui partagent le même nom de famille que tokens.css.
// next/font exige des valeurs littérales : les plages unicode sont recopiées de fonts.css.

export const montserrat = localFont({
  src: [
    { path: "../../public/fonts/montserrat-latin-500-normal.woff2", weight: "500" },
    { path: "../../public/fonts/montserrat-latin-600-normal.woff2", weight: "600" },
    { path: "../../public/fonts/montserrat-latin-700-normal.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--font-montserrat",
  declarations: [
    { prop: "font-family", value: "Montserrat" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const montserratExt = localFont({
  src: [
    { path: "../../public/fonts/montserrat-latin-ext-500-normal.woff2", weight: "500" },
    { path: "../../public/fonts/montserrat-latin-ext-600-normal.woff2", weight: "600" },
    { path: "../../public/fonts/montserrat-latin-ext-700-normal.woff2", weight: "700" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-montserrat-ext",
  declarations: [
    { prop: "font-family", value: "Montserrat" },
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

export const manrope = localFont({
  src: [
    { path: "../../public/fonts/manrope-latin-400-normal.woff2", weight: "400" },
    { path: "../../public/fonts/manrope-latin-500-normal.woff2", weight: "500" },
    { path: "../../public/fonts/manrope-latin-600-normal.woff2", weight: "600" },
    { path: "../../public/fonts/manrope-latin-700-normal.woff2", weight: "700" },
    { path: "../../public/fonts/manrope-latin-800-normal.woff2", weight: "800" },
  ],
  display: "swap",
  variable: "--font-manrope",
  declarations: [
    { prop: "font-family", value: "Manrope" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const manropeExt = localFont({
  src: [
    { path: "../../public/fonts/manrope-latin-ext-400-normal.woff2", weight: "400" },
    { path: "../../public/fonts/manrope-latin-ext-500-normal.woff2", weight: "500" },
    { path: "../../public/fonts/manrope-latin-ext-600-normal.woff2", weight: "600" },
    { path: "../../public/fonts/manrope-latin-ext-700-normal.woff2", weight: "700" },
    { path: "../../public/fonts/manrope-latin-ext-800-normal.woff2", weight: "800" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-manrope-ext",
  declarations: [
    { prop: "font-family", value: "Manrope" },
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

export const variablesPolices = [montserrat, montserratExt, manrope, manropeExt]
  .map((p) => p.variable)
  .join(" ");
