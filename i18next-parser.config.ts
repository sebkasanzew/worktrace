import type { UserConfig } from "i18next-parser"

const config: UserConfig = {
  contextSeparator: "_",
  createOldCatalogs: false,
  defaultNamespace: "translation",
  defaultValue: "",
  indentation: 2,
  keepRemoved: false,
  keySeparator: false,
  lexers: {
    hbs: ["HandlebarsLexer"],
    handlebars: ["HandlebarsLexer"],
    htm: ["HTMLLexer"],
    html: ["HTMLLexer"],
    mjs: ["JavascriptLexer"],
    js: ["JavascriptLexer"],
    ts: ["JavascriptLexer"],
    jsx: ["JsxLexer"],
    tsx: ["JsxLexer"],
    default: ["JavascriptLexer"],
  },
  lineEnding: "auto",
  locales: ["en", "de"],
  namespaceSeparator: false,
  output: "src/locales/$LOCALE.json",
  pluralSeparator: "_",
  input: ["src/**/*.{js,jsx,ts,tsx}"],
  sort: true,
  verbose: true,
  failOnWarnings: false,
  failOnUpdate: false,
}

export default config
