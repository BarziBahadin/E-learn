import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales, useLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import catalog from '../../translations/ckb-IQ.catalog.json';

export type LanguagePreference = 'device' | 'en' | 'ckb';
export type AppLanguage = 'en' | 'ckb';

const STORAGE_KEY = 'e-lern.language-preference';
const soraniByEnglish = new Map(catalog.entries.map((entry) => [entry.english, entry.kurdish]));
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const partialTranslations = [...soraniByEnglish.entries()]
  .filter(([english, kurdish]) => kurdish && english.length >= 3 && english.length <= 64 && !/[.!?]/.test(english))
  .sort(([left], [right]) => right.length - left.length)
  .map(([english, kurdish]) => ({
    kurdish,
    pattern: new RegExp(`(?<![A-Za-z])${escapeRegExp(english)}(?![A-Za-z])`, 'g'),
  }));
const partialTranslationCache = new Map<string, string>();

type I18nContextValue = {
  direction: 'ltr' | 'rtl';
  language: AppLanguage;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => Promise<void>;
  translate: (source: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function languageFromDevice(languageCode?: string | null): AppLanguage {
  return languageCode === 'ckb' || languageCode === 'ku' ? 'ckb' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locales = useLocales();
  const [preference, setPreferenceState] = useState<LanguagePreference>('device');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'device' || stored === 'en' || stored === 'ckb') setPreferenceState(stored);
    }).catch(() => undefined);
  }, []);

  const deviceLanguage = languageFromDevice(locales[0]?.languageCode ?? getLocales()[0]?.languageCode);
  const language = preference === 'device' ? deviceLanguage : preference;
  const direction = language === 'ckb' ? 'rtl' : 'ltr';

  const setPreference = useCallback(async (next: LanguagePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const translate = useCallback((source: string) => {
    if (language === 'en') return source;
    const trimmed = source.trim();
    if (!trimmed) return source;
    const translated = soraniByEnglish.get(trimmed);
    if (translated) return `${source.slice(0, source.indexOf(trimmed))}${translated}${source.slice(source.indexOf(trimmed) + trimmed.length)}`;

    const cached = partialTranslationCache.get(source);
    if (cached) return cached;
    let result = source;
    for (const { kurdish, pattern } of partialTranslations) {
      result = result.replace(pattern, kurdish);
    }
    result = result
      .replace(/\bIQD\b/g, 'د.ع')
      .replace(/(\d+)h\b/g, '$1 کاتژمێر')
      .replace(/(\d+)m\b/g, '$1 خولەک')
      .replace(/\bmin\b/g, 'خولەک');
    partialTranslationCache.set(source, result);
    return result;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({ direction, language, preference, setPreference, translate }),
    [direction, language, preference, setPreference, translate],
  );

  const webDirection = Platform.OS === 'web' ? { dir: direction } : {};
  return (
    <I18nContext.Provider value={value}>
      <View {...webDirection} style={{ direction, flex: 1 }}>{children}</View>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('I18nProvider is missing.');
  return value;
}
