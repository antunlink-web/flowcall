import { useLanguage } from "./useLanguage";
import { appTranslations, AppTranslations } from "@/lib/app-translations";

export function useTranslation(): AppTranslations & { lang: "en" | "hr"; setLang: (l: "en" | "hr") => void } {
  const { lang, setLang } = useLanguage();
  return { ...appTranslations[lang], lang, setLang };
}
