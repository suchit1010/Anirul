import type { LanguageCode } from "@/types/health";

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  native: string;
  greet: string;
  inputPlaceholder: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "en", label: "English", native: "English", greet: "Hello", inputPlaceholder: "Ask Swastha AI about your health…" },
  { code: "hi", label: "Hindi", native: "हिन्दी", greet: "नमस्ते", inputPlaceholder: "स्वस्थ्य के बारे में पूछें…" },
  { code: "ta", label: "Tamil", native: "தமிழ்", greet: "வணக்கம்", inputPlaceholder: "உங்கள் ஆரோக்கியம் பற்றி கேளுங்கள்…" },
  { code: "te", label: "Telugu", native: "తెలుగు", greet: "నమస్కారం", inputPlaceholder: "మీ ఆరోగ్యం గురించి అడగండి…" },
  { code: "bn", label: "Bengali", native: "বাংলা", greet: "নমস্কার", inputPlaceholder: "আপনার স্বাস্থ্য সম্পর্কে জিজ্ঞাসা করুন…" },
  { code: "mr", label: "Marathi", native: "मराठी", greet: "नमस्कार", inputPlaceholder: "आपल्या आरोग्याबद्दल विचारा…" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", greet: "ನಮಸ್ಕಾರ", inputPlaceholder: "ನಿಮ್ಮ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಕೇಳಿ…" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", greet: "നമസ്കാരം", inputPlaceholder: "നിങ്ങളുടെ ആരോഗ്യത്തെക്കുറിച്ച് ചോദിക്കുക…" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", greet: "નમસ્તે", inputPlaceholder: "તમારા સ્વાસ્થ્ય વિશે પૂછો…" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", greet: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", inputPlaceholder: "ਆਪਣੀ ਸਿਹਤ ਬਾਰੇ ਪੁੱਛੋ…" },
];

export function getLanguageInfo(code: LanguageCode): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]!;
}
