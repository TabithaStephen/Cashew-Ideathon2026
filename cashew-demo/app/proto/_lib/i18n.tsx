'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { strings, type Lang, type StringKey } from './strings';

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
}>({ lang: 'en', setLang: () => {}, t: (key) => strings.en[key] });

const STORAGE_KEY = 'cashew-proto-lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'ta' || saved === 'en') setLangState(saved);
    } catch {
      // Storage can be blocked. English is a fine default.
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Language still applies for this page view.
    }
  }, []);

  const t = useCallback((key: StringKey) => strings[lang][key], [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <div className="mf" lang={lang}>
        {children}
      </div>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
