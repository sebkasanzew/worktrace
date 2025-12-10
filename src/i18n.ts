import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import bg from "./locales/bg.json"
import de from "./locales/de.json"
import en from "./locales/en.json"
import fr from "./locales/fr.json"
import hi from "./locales/hi.json"
import pl from "./locales/pl.json"
import ru from "./locales/ru.json"
import uk from "./locales/uk.json"

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources: {
      en: {
        translation: en,
      },
      de: {
        translation: de,
      },
      hi: {
        translation: hi,
      },
      ru: {
        translation: ru,
      },
      uk: {
        translation: uk,
      },
      fr: {
        translation: fr,
      },
      bg: {
        translation: bg,
      },
      pl: {
        translation: pl,
      },
    },
    fallbackLng: "en",
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  })

export default i18n
