// Complete ISO 3166-1 alpha-2 country list
// Source of truth for all country selections in FlowScale

export interface Country {
  code: string;
  name: string;
  flag: string;
  region: string;
}

// Complete list of all countries with ISO codes
export const COUNTRIES: Country[] = [
  // A
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', region: 'Asia' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', region: 'Europe' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', region: 'Africa' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', region: 'Europe' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', region: 'Africa' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', region: 'Americas' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'Americas' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', region: 'Asia' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', region: 'Asia' },
  // B
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', region: 'Americas' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', region: 'Asia' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', region: 'Asia' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', region: 'Americas' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', region: 'Europe' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', region: 'Americas' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', region: 'Africa' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', region: 'Asia' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', region: 'Americas' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', region: 'Europe' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', region: 'Africa' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'Americas' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', region: 'Asia' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', region: 'Europe' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', region: 'Africa' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', region: 'Africa' },
  // C
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', region: 'Asia' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', region: 'Africa' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'Americas' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', region: 'Africa' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', region: 'Africa' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', region: 'Africa' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'Americas' },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'Americas' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲', region: 'Africa' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', region: 'Africa' },
  { code: 'CD', name: 'Congo (DRC)', flag: '🇨🇩', region: 'Africa' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', region: 'Americas' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', region: 'Europe' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', region: 'Americas' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe' },
  // D
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', region: 'Africa' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', region: 'Americas' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', region: 'Americas' },
  // E
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', region: 'Americas' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', region: 'Americas' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', region: 'Africa' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', region: 'Africa' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', region: 'Europe' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', region: 'Africa' },
  // F
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', region: 'Oceania' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  // G
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', region: 'Africa' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', region: 'Africa' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', region: 'Asia' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', region: 'Americas' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', region: 'Americas' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', region: 'Africa' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', region: 'Africa' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', region: 'Americas' },
  // H
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', region: 'Americas' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', region: 'Americas' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', region: 'Europe' },
  // I
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', region: 'Europe' },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', region: 'Asia' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', region: 'Asia' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Asia' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  // J
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', region: 'Americas' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', region: 'Asia' },
  // K
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', region: 'Asia' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', region: 'Oceania' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵', region: 'Asia' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'Asia' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', region: 'Asia' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', region: 'Asia' },
  // L
  { code: 'LA', name: 'Laos', flag: '🇱🇦', region: 'Asia' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', region: 'Europe' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', region: 'Asia' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', region: 'Africa' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', region: 'Africa' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', region: 'Africa' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', region: 'Europe' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', region: 'Europe' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', region: 'Europe' },
  // M
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', region: 'Africa' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', region: 'Africa' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', region: 'Asia' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', region: 'Africa' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', region: 'Europe' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', region: 'Oceania' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷', region: 'Africa' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', region: 'Africa' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'Americas' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', region: 'Oceania' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', region: 'Europe' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', region: 'Europe' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', region: 'Asia' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', region: 'Europe' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', region: 'Africa' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', region: 'Africa' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', region: 'Asia' },
  // N
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', region: 'Africa' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', region: 'Oceania' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', region: 'Asia' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', region: 'Americas' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', region: 'Europe' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
  // O
  { code: 'OM', name: 'Oman', flag: '🇴🇲', region: 'Asia' },
  // P
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', region: 'Oceania' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', region: 'Asia' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', region: 'Americas' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', region: 'Oceania' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', region: 'Americas' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', region: 'Americas' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'Asia' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
  // Q
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', region: 'Asia' },
  // R
  { code: 'RO', name: 'Romania', flag: '🇷🇴', region: 'Europe' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', region: 'Africa' },
  // S
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', region: 'Americas' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', region: 'Americas' },
  { code: 'VC', name: 'Saint Vincent', flag: '🇻🇨', region: 'Americas' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', region: 'Oceania' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', region: 'Europe' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹', region: 'Africa' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Asia' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', region: 'Africa' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', region: 'Europe' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', region: 'Africa' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', region: 'Africa' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', region: 'Europe' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', region: 'Europe' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', region: 'Oceania' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', region: 'Africa' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', region: 'Africa' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', region: 'Asia' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', region: 'Africa' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', region: 'Americas' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', region: 'Asia' },
  // T
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'Asia' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', region: 'Asia' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', region: 'Asia' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', region: 'Africa' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', region: 'Oceania' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', region: 'Americas' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', region: 'Africa' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'Asia' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', region: 'Asia' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', region: 'Oceania' },
  // U
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'Africa' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', region: 'Europe' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Asia' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'Americas' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', region: 'Americas' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', region: 'Asia' },
  // V
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', region: 'Oceania' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', region: 'Europe' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', region: 'Americas' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia' },
  // Y
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', region: 'Asia' },
  // Z
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', region: 'Africa' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', region: 'Africa' },
];

// Helper functions
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name || code;
}

export function getCountryFlag(code: string): string {
  return getCountryByCode(code)?.flag || '🌍';
}

export function searchCountries(query: string): Country[] {
  const lowerQuery = query.toLowerCase();
  return COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.code.toLowerCase().includes(lowerQuery)
  );
}

// Language list (unchanged from before, but centralized here)
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
];

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGES.find(l => l.code === code);
}

export function getLanguageName(code: string): string {
  return getLanguageByCode(code)?.name || code;
}

export function isRTL(languageCode: string): boolean {
  return ['ar', 'he', 'fa', 'ur'].includes(languageCode);
}
