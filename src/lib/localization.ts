// Dynamic Localization Engine for FlowScale AI
// Handles language, market, audience, and cultural adaptations

export type Language = 'ar' | 'en' | 'es' | 'fr' | 'de' | 'pt';
export type Market = 'sa' | 'ae' | 'kw' | 'ma' | 'eu' | 'us' | 'latam';
export type Audience = 'men' | 'women' | 'both' | 'kids' | 'elderly' | 'athletes' | 'beauty' | 'tech' | 'pets' | 'health' | 'parents' | 'custom';

export interface LocalizationContext {
  language: Language;
  market: Market;
  audience: Audience;
  persona?: string;
  customPrompt?: string;
  niche?: string;
}

export interface CulturalProfile {
  tone: string;
  ctaStyle: string;
  hookStyle: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  emotionalLevel: 'subtle' | 'moderate' | 'intense';
  trustSignals: string[];
  visualStyle: string;
  complianceNotes: string[];
}

// Market-specific cultural profiles
export const MARKET_PROFILES: Record<Market, CulturalProfile> = {
  sa: {
    tone: 'emotional, trust-building, family-oriented',
    ctaStyle: 'direct with COD emphasis',
    hookStyle: 'dramatic problem-solution',
    urgencyLevel: 'high',
    emotionalLevel: 'intense',
    trustSignals: ['COD available', 'fast delivery', 'quality guarantee', 'family approved'],
    visualStyle: 'warm, elegant, culturally appropriate',
    complianceNotes: ['hijab for women models', 'modest clothing', 'Arabic RTL layout']
  },
  ae: {
    tone: 'luxurious, aspirational, modern',
    ctaStyle: 'premium with exclusivity',
    hookStyle: 'lifestyle transformation',
    urgencyLevel: 'medium',
    emotionalLevel: 'moderate',
    trustSignals: ['premium quality', 'fast UAE delivery', 'luxury experience'],
    visualStyle: 'sleek, modern, premium',
    complianceNotes: ['culturally sensitive imagery', 'Arabic RTL option']
  },
  kw: {
    tone: 'refined, quality-focused',
    ctaStyle: 'elegant and direct',
    hookStyle: 'benefit-focused',
    urgencyLevel: 'medium',
    emotionalLevel: 'moderate',
    trustSignals: ['Kuwait delivery', 'quality assurance'],
    visualStyle: 'clean, professional',
    complianceNotes: ['Arabic RTL option', 'Gulf dialect']
  },
  ma: {
    tone: 'warm, community-oriented',
    ctaStyle: 'friendly and accessible',
    hookStyle: 'relatable stories',
    urgencyLevel: 'medium',
    emotionalLevel: 'moderate',
    trustSignals: ['local delivery', 'trusted quality'],
    visualStyle: 'vibrant, authentic',
    complianceNotes: ['French/Arabic bilingual option', 'Moroccan dialect']
  },
  eu: {
    tone: 'clean, elegant, minimalistic',
    ctaStyle: 'soft, non-pushy',
    hookStyle: 'quality and sustainability',
    urgencyLevel: 'low',
    emotionalLevel: 'subtle',
    trustSignals: ['EU quality standards', 'eco-friendly', 'GDPR compliant'],
    visualStyle: 'minimalist, sophisticated',
    complianceNotes: ['GDPR compliance', 'multiple language support']
  },
  us: {
    tone: 'confident, lifestyle-focused',
    ctaStyle: 'action-oriented',
    hookStyle: 'transformation story',
    urgencyLevel: 'high',
    emotionalLevel: 'moderate',
    trustSignals: ['free shipping', 'money-back guarantee', 'social proof'],
    visualStyle: 'bold, aspirational',
    complianceNotes: ['FTC disclosure requirements']
  },
  latam: {
    tone: 'high-energy, dramatic, emotional',
    ctaStyle: 'urgent with discounts',
    hookStyle: 'emotional pain points',
    urgencyLevel: 'high',
    emotionalLevel: 'intense',
    trustSignals: ['fast delivery', 'best price', 'quality imported'],
    visualStyle: 'vibrant, dynamic, expressive',
    complianceNotes: ['Spanish variations by country']
  }
};

// Language display names
export const LANGUAGE_NAMES: Record<Language, { native: string; english: string }> = {
  ar: { native: 'العربية', english: 'Arabic' },
  en: { native: 'English', english: 'English' },
  es: { native: 'Español', english: 'Spanish' },
  fr: { native: 'Français', english: 'French' },
  de: { native: 'Deutsch', english: 'German' },
  pt: { native: 'Português', english: 'Portuguese' }
};

// Market display names
export const MARKET_NAMES: Record<Market, { name: string; flag: string }> = {
  sa: { name: 'Saudi Arabia', flag: '🇸🇦' },
  ae: { name: 'UAE', flag: '🇦🇪' },
  kw: { name: 'Kuwait', flag: '🇰🇼' },
  ma: { name: 'Morocco', flag: '🇲🇦' },
  eu: { name: 'Europe', flag: '🇪🇺' },
  us: { name: 'USA', flag: '🇺🇸' },
  latam: { name: 'Latin America', flag: '🌎' }
};

// Audience display names
export const AUDIENCE_NAMES: Record<Audience, string> = {
  men: 'Men',
  women: 'Women',
  both: 'Both Genders',
  kids: 'Kids',
  elderly: 'Elderly',
  athletes: 'Athletes',
  beauty: 'Beauty Enthusiasts',
  tech: 'Tech Buyers',
  pets: 'Pet Owners',
  health: 'Health Seekers',
  parents: 'Parents',
  custom: 'Custom Persona'
};

// Voice profiles by language
export const VOICE_PROFILES: Record<Language, { id: string; name: string; accent: string }[]> = {
  ar: [
    { id: 'saudi_male', name: 'Ahmed (Saudi)', accent: 'Gulf/Saudi' },
    { id: 'saudi_female', name: 'Fatima (Saudi)', accent: 'Gulf/Saudi' },
    { id: 'egyptian_male', name: 'Mohamed (Egyptian)', accent: 'Egyptian' },
    { id: 'neutral_ar', name: 'Layla (Neutral)', accent: 'MSA' }
  ],
  en: [
    { id: 'american_male', name: 'James (American)', accent: 'American' },
    { id: 'american_female', name: 'Sarah (American)', accent: 'American' },
    { id: 'british_male', name: 'Oliver (British)', accent: 'British' },
    { id: 'british_female', name: 'Emma (British)', accent: 'British' }
  ],
  es: [
    { id: 'mexican_male', name: 'Carlos (Mexican)', accent: 'Mexican' },
    { id: 'mexican_female', name: 'Maria (Mexican)', accent: 'Mexican' },
    { id: 'castilian_male', name: 'Pablo (Castilian)', accent: 'Castilian' },
    { id: 'castilian_female', name: 'Sofia (Castilian)', accent: 'Castilian' }
  ],
  fr: [
    { id: 'parisian_male', name: 'Pierre (Parisian)', accent: 'Parisian' },
    { id: 'parisian_female', name: 'Amélie (Parisian)', accent: 'Parisian' },
    { id: 'canadian_fr', name: 'Jean (Canadian)', accent: 'Canadian French' }
  ],
  de: [
    { id: 'german_male', name: 'Hans (German)', accent: 'Standard German' },
    { id: 'german_female', name: 'Anna (German)', accent: 'Standard German' }
  ],
  pt: [
    { id: 'brazilian_male', name: 'João (Brazilian)', accent: 'Brazilian' },
    { id: 'brazilian_female', name: 'Ana (Brazilian)', accent: 'Brazilian' },
    { id: 'portuguese_pt', name: 'Miguel (Portugal)', accent: 'European Portuguese' }
  ]
};

// Dynamic CTA templates by market
export const CTA_TEMPLATES: Record<Market, Record<Language, string[]>> = {
  sa: {
    ar: ['اطلبه الآن… الدفع عند الاستلام', 'احصل عليه الآن!', 'اشتري الآن بضمان كامل'],
    en: ['Order Now – Cash on Delivery', 'Get Yours Today!', 'Buy Now with Full Guarantee'],
    es: ['Ordena Ahora – Pago Contra Entrega', 'Consigue el Tuyo Hoy!'],
    fr: ['Commandez Maintenant – Paiement à la Livraison', 'Obtenez le Vôtre!'],
    de: ['Jetzt Bestellen – Nachnahme Möglich', 'Holen Sie sich Ihres!'],
    pt: ['Peça Agora – Pagamento na Entrega', 'Garanta o Seu!']
  },
  us: {
    ar: ['اطلب الآن – شحن مجاني'],
    en: ['Order Now – Free Shipping', 'Get Started Today!', 'Buy Now, Pay Later'],
    es: ['Ordena Ahora – Envío Gratis', '¡Comienza Hoy!'],
    fr: ['Commandez – Livraison Gratuite', 'Commencez Maintenant!'],
    de: ['Jetzt Bestellen – Kostenloser Versand'],
    pt: ['Peça Agora – Frete Grátis']
  },
  eu: {
    ar: ['اطلب الآن'],
    en: ['Order Now – Fast EU Delivery', 'Shop Sustainably'],
    es: ['Ordena Ahora – Envío Rápido UE'],
    fr: ['Commandez – Livraison Rapide UE', 'Achetez Durable'],
    de: ['Jetzt Bestellen – Schnelle EU-Lieferung', 'Nachhaltig Einkaufen'],
    pt: ['Peça Agora – Entrega Rápida UE']
  },
  ae: {
    ar: ['اطلب الآن للإمارات', 'توصيل سريع للإمارات'],
    en: ['Order Now – UAE Express Delivery', 'Get Premium Quality'],
    es: ['Ordena Ahora – Entrega Express EAU'],
    fr: ['Commandez – Livraison Express EAU'],
    de: ['Jetzt Bestellen – VAE Express'],
    pt: ['Peça Agora – Entrega Express EAU']
  },
  kw: {
    ar: ['اطلب الآن للكويت', 'توصيل سريع للكويت'],
    en: ['Order Now – Kuwait Delivery', 'Get Yours in Kuwait'],
    es: ['Ordena Ahora – Entrega Kuwait'],
    fr: ['Commandez – Livraison Koweït'],
    de: ['Jetzt Bestellen – Kuwait Lieferung'],
    pt: ['Peça Agora – Entrega Kuwait']
  },
  ma: {
    ar: ['اطلب الآن للمغرب'],
    en: ['Order Now – Morocco Delivery'],
    es: ['Ordena Ahora – Entrega Marruecos'],
    fr: ['Commandez Maintenant – Livraison Maroc', 'Obtenez le Vôtre au Maroc!'],
    de: ['Jetzt Bestellen – Marokko Lieferung'],
    pt: ['Peça Agora – Entrega Marrocos']
  },
  latam: {
    ar: ['اطلب الآن'],
    en: ['Order Now – Fast LatAm Shipping'],
    es: ['¡Ordena Ahora! – Envío Rápido', '¡No Te Lo Pierdas!', '¡Compra Ya con Descuento!'],
    fr: ['Commandez Maintenant!'],
    de: ['Jetzt Bestellen!'],
    pt: ['Peça Agora! – Envio Rápido', 'Compre Já com Desconto!']
  }
};

// Generate localized prompt context
export function generatePromptContext(ctx: LocalizationContext): string {
  const profile = MARKET_PROFILES[ctx.market];
  const langName = LANGUAGE_NAMES[ctx.language];
  const marketName = MARKET_NAMES[ctx.market];
  const audienceName = AUDIENCE_NAMES[ctx.audience];
  
  return `
LOCALIZATION CONTEXT:
- Language: ${langName.english} (${langName.native})
- Target Market: ${marketName.name} ${marketName.flag}
- Target Audience: ${audienceName}
- Persona: ${ctx.persona || 'General consumer'}
- Niche: ${ctx.niche || 'E-commerce'}

CULTURAL REQUIREMENTS:
- Tone: ${profile.tone}
- CTA Style: ${profile.ctaStyle}
- Hook Style: ${profile.hookStyle}
- Urgency Level: ${profile.urgencyLevel}
- Emotional Level: ${profile.emotionalLevel}
- Trust Signals: ${profile.trustSignals.join(', ')}
- Visual Style: ${profile.visualStyle}
- Compliance: ${profile.complianceNotes.join(', ')}

${ctx.customPrompt ? `CUSTOM INSTRUCTIONS:\n${ctx.customPrompt}` : ''}

All outputs must be culturally appropriate for ${marketName.name} and written in ${langName.english}.
${ctx.language === 'ar' ? 'Use RTL text direction. Use Gulf/Saudi dialect for spoken content.' : ''}
`.trim();
}

// Generate visual prompt modifiers based on context
export function generateVisualPromptModifiers(ctx: LocalizationContext, sceneType: string): string {
  const profile = MARKET_PROFILES[ctx.market];
  const modifiers: string[] = [];
  
  // Market-specific visual modifiers
  if (ctx.market === 'sa' || ctx.market === 'ae' || ctx.market === 'kw') {
    if (ctx.audience === 'women') {
      modifiers.push('woman wearing hijab', 'modest elegant clothing');
    }
    modifiers.push('warm middle-eastern aesthetic', 'luxurious setting');
  }
  
  if (ctx.market === 'eu') {
    modifiers.push('minimalist european style', 'clean modern aesthetic');
  }
  
  if (ctx.market === 'latam') {
    modifiers.push('vibrant colorful setting', 'dynamic energy');
  }
  
  if (ctx.market === 'us') {
    modifiers.push('american lifestyle', 'aspirational setting');
  }
  
  // Audience-specific modifiers
  if (ctx.audience === 'men') {
    modifiers.push('male model', 'masculine aesthetic');
  } else if (ctx.audience === 'women') {
    modifiers.push('female model', 'feminine aesthetic');
  } else if (ctx.audience === 'athletes') {
    modifiers.push('athletic person', 'fitness setting', 'energetic mood');
  } else if (ctx.audience === 'beauty') {
    modifiers.push('beauty setting', 'soft lighting', 'skincare aesthetic');
  } else if (ctx.audience === 'tech') {
    modifiers.push('modern tech setting', 'sleek gadgets', 'professional lighting');
  }
  
  modifiers.push(profile.visualStyle);
  
  return modifiers.join(', ');
}

// Get localized output metadata
export function getOutputMetadata(ctx: LocalizationContext) {
  const profile = MARKET_PROFILES[ctx.market];
  
  return {
    language: ctx.language,
    market: ctx.market,
    audience: ctx.audience,
    persona: ctx.persona || 'general',
    region_culture_profile: profile.tone,
    cta_style: profile.ctaStyle,
    hook_style: profile.hookStyle,
    visual_style: profile.visualStyle,
    urgency_level: profile.urgencyLevel,
    emotional_level: profile.emotionalLevel
  };
}

// Check if language requires RTL
export function isRTL(language: Language): boolean {
  return language === 'ar';
}

// Get default voice for language and market
export function getDefaultVoice(language: Language, market: Market): string {
  const voices = VOICE_PROFILES[language];
  if (!voices || voices.length === 0) return 'default';
  
  // Try to match market-specific accent
  if (market === 'sa' && language === 'ar') {
    const saudiVoice = voices.find(v => v.accent.includes('Saudi'));
    if (saudiVoice) return saudiVoice.id;
  }
  
  if (market === 'latam' && language === 'es') {
    const mexicanVoice = voices.find(v => v.accent.includes('Mexican'));
    if (mexicanVoice) return mexicanVoice.id;
  }
  
  return voices[0].id;
}
