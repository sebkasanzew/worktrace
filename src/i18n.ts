import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import ar from "./locales/ar.json"
import bg from "./locales/bg.json"
import bn from "./locales/bn.json"
import de from "./locales/de.json"
import en from "./locales/en.json"
import es from "./locales/es.json"
import fr from "./locales/fr.json"
import hi from "./locales/hi.json"
import hu from "./locales/hu.json"
import id from "./locales/id.json"
import it from "./locales/it.json"
import ja from "./locales/ja.json"
import ko from "./locales/ko.json"
import pl from "./locales/pl.json"
import ptBR from "./locales/pt-BR.json"
import ptPT from "./locales/pt-PT.json"
import ru from "./locales/ru.json"
import tr from "./locales/tr.json"
import uk from "./locales/uk.json"
import vi from "./locales/vi.json"
import zhHans from "./locales/zh-Hans.json"

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
      en: { translation: en },
      de: { translation: de },
      hi: { translation: hi },
      ru: { translation: ru },
      uk: { translation: uk },
      fr: { translation: fr },
      bg: { translation: bg },
      pl: { translation: pl },
      es: { translation: es },
      "zh-Hans": { translation: zhHans },
      "pt-BR": { translation: ptBR },
      ar: { translation: ar },
      ja: { translation: ja },
      ko: { translation: ko },
      tr: { translation: tr },
      vi: { translation: vi },
      id: { translation: id },
      bn: { translation: bn },
      "pt-PT": { translation: ptPT },
      hu: { translation: hu },
      it: { translation: it },
    },
    fallbackLng: "en",
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  })

export default i18n
