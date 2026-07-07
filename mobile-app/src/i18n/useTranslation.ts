import { useState, useCallback, useEffect } from 'react'
import { Language, getTranslation, type TranslationKeys } from './translations'

let globalLanguage: Language = 'am'
const listeners = new Set<() => void>()

const enFonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semiBold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
} as const

const amFonts = {
  regular: 'Kefa',
  medium: 'Kefa',
  semiBold: 'Kefa-Bold',
  bold: 'Kefa-Bold',
} as const

export function useTranslation() {
  const [lang, setLang] = useState<Language>(globalLanguage)

  useEffect(() => {
    const listener = () => setLang(globalLanguage)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const setLanguage = useCallback((l: Language) => {
    globalLanguage = l
    listeners.forEach((fn) => fn())
  }, [])

  const toggleLanguage = useCallback(() => {
    const next: Language = globalLanguage === 'en' ? 'am' : 'en'
    setLanguage(next)
  }, [setLanguage])

  const t = getTranslation(lang)
  const fonts = lang === 'am' ? amFonts : enFonts

  return {
    t,
    lang,
    setLanguage,
    toggleLanguage,
    fonts,
  }
}
