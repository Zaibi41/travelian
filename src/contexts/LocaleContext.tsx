import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CurrencyCode = "PKR" | "USD" | "SAR" | "AED" | "EUR" | "GBP";
export type LanguageCode = "en" | "ur" | "ar";

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string; rate: number }[] = [
  { code: "PKR", symbol: "PKR", label: "Pakistani Rupee", rate: 278 },
  { code: "USD", symbol: "USD", label: "US Dollar", rate: 1 },
  { code: "SAR", symbol: "SAR", label: "Saudi Riyal", rate: 3.75 },
  { code: "AED", symbol: "AED", label: "UAE Dirham", rate: 3.67 },
  { code: "EUR", symbol: "EUR", label: "Euro", rate: 0.92 },
  { code: "GBP", symbol: "GBP", label: "British Pound", rate: 0.79 },
];

export const LANGUAGES: { code: LanguageCode; label: string; native: string; rtl?: boolean }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ur", label: "Urdu", native: "Urdu", rtl: true },
  { code: "ar", label: "Arabic", native: "Arabic", rtl: true },
];

interface LocaleContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  formatPrice: (usd: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(
    () => (localStorage.getItem("travelian.currency") as CurrencyCode) || "PKR",
  );
  const [language, setLanguageState] = useState<LanguageCode>(
    () => (localStorage.getItem("travelian.language") as LanguageCode) || "en",
  );

  const setCurrency = (c: CurrencyCode) => {
    localStorage.setItem("travelian.currency", c);
    setCurrencyState(c);
  };
  const setLanguage = (l: LanguageCode) => {
    localStorage.setItem("travelian.language", l);
    setLanguageState(l);
  };

  useEffect(() => {
    const lang = LANGUAGES.find(l => l.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = lang?.rtl ? "rtl" : "ltr";
  }, [language]);

  const formatPrice = (usd: number) => {
    const c = CURRENCIES.find(x => x.code === currency)!;
    const amount = Math.round(usd * c.rate);
    return `${c.code} ${amount.toLocaleString()}`;
  };

  return (
    <LocaleContext.Provider value={{ currency, setCurrency, language, setLanguage, formatPrice }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
