import { createContext, useContext, useState, useEffect } from 'react'
import { translations, RTL_LANGS } from '../i18n/translations'

const STORAGE_KEY = 'جيب_lang'
const DEFAULT_LANG = 'en'

const LanguageContext = createContext(null)

function getNested(obj, path) {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return path
    current = current[key]
  }
  return current != null ? current : path
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved && translations[saved] ? saved : DEFAULT_LANG
    } catch {
      return DEFAULT_LANG
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {}
    document.documentElement.lang = lang
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = (newLang) => {
    if (translations[newLang]) setLangState(newLang)
  }

  const t = (key) => getNested(translations[lang] || translations.en, key)

  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'

  const value = { lang, setLang, t, dir }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
