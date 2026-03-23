import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppLang = "en" | "hr";

interface LanguageContextType {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
}

const LanguageContext = createContext<LanguageContextType>({ lang: "en", setLang: () => {} });

function detectBrowserLang(): AppLang {
  const stored = localStorage.getItem("flowcall_lang");
  if (stored === "hr" || stored === "en") return stored;

  const nav = navigator.language || (navigator as any).userLanguage || "";
  if (nav.startsWith("hr")) return "hr";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(detectBrowserLang);

  const setLang = (l: AppLang) => {
    localStorage.setItem("flowcall_lang", l);
    setLangState(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
