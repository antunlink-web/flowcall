import { useLanguage, AppLang } from "./useLanguage";
import { appTranslations } from "@/lib/app-translations";

type TranslationKeys = keyof typeof appTranslations.en;
type TranslationValues = { [K in TranslationKeys]: string };

export function useTranslation(): TranslationValues & { lang: AppLang; setLang: (l: AppLang) => void } {
  const { lang, setLang } = useLanguage();
  return { ...appTranslations[lang], lang, setLang } as TranslationValues & { lang: AppLang; setLang: (l: AppLang) => void };
}
