import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive Gulf Arabic dialect rules for TTS optimization
const GULF_DIALECT_RULES = {
  // Common pronunciation fixes for Gulf Arabic TTS
  pronunciationFixes: [
    // ق (Qaf) variations - Gulf dialect often pronounces as 'g'
    { pattern: /قال/g, replacement: 'گال', note: 'qal → gal (said)' },
    { pattern: /قلب/g, replacement: 'گلب', note: 'qalb → galb (heart)' },
    { pattern: /قوي/g, replacement: 'گوي', note: 'qawi → gawi (strong)' },
    { pattern: /قريب/g, replacement: 'گريب', note: 'qarib → garib (near)' },
    { pattern: /قدام/g, replacement: 'گدام', note: 'qudam → gudam (front)' },
    { pattern: /قبل/g, replacement: 'گبل', note: 'qabl → gabl (before)' },
    { pattern: /قط/g, replacement: 'گط', note: 'qat → gat (only)' },
    
    // ك (Kaf) softening in some words - Gulf uses 'ch' sound
    { pattern: /كيف/g, replacement: 'چيف', note: 'kayf → chayf (how)' },
    { pattern: /كثير/g, replacement: 'چثير', note: 'kathir → chathir (many)' },
    { pattern: /كل شي/g, replacement: 'چل شي', note: 'kul shay → chul shay (everything)' },
    { pattern: /كذا/g, replacement: 'چذا', note: 'kadha → chadha (like this)' },
    
    // ج (Jim) variations - Gulf uses 'y' in many cases
    { pattern: /جديد/g, replacement: 'يديد', note: 'jadid → yadid (new)' },
    { pattern: /جميل/g, replacement: 'يميل', note: 'jamil → yamil (beautiful)' },
    { pattern: /جاي/g, replacement: 'ياي', note: 'jay → yay (coming)' },
    { pattern: /جنب/g, replacement: 'ينب', note: 'janb → yanb (side)' },
    
    // Common Gulf expressions
    { pattern: /الآن/g, replacement: 'الحين', note: 'al-aan → al-heen (now)' },
    { pattern: /ماذا/g, replacement: 'شنو', note: 'madha → shnu (what)' },
    { pattern: /لماذا/g, replacement: 'ليش', note: 'limadha → laysh (why)' },
    { pattern: /هذا/g, replacement: 'هذا', note: 'hadha stays (this)' },
    { pattern: /أريد/g, replacement: 'أبي', note: 'urid → abi (I want)' },
    { pattern: /أستطيع/g, replacement: 'أقدر', note: 'astati\' → agdar (I can)' },
    { pattern: /كيف حالك/g, replacement: 'شلونك', note: 'kayf halak → shlonak (how are you)' },
    { pattern: /ممتاز/g, replacement: 'زين', note: 'mumtaz → zayn (excellent)' },
    { pattern: /جيد جداً/g, replacement: 'واايد زين', note: 'jayid jidan → wayed zayn (very good)' },
    { pattern: /كثيراً/g, replacement: 'واايد', note: 'kathiran → wayed (very much)' },
  ],

  // Diacritics (Tashkeel) for clearer pronunciation
  diacriticRules: [
    // Shadda (ّ) for doubled letters
    { pattern: /([بتثجحخدذرزسشصضطظعغفقكلمنهوي])\1/g, replacement: '$1ّ', note: 'Add shadda for doubled consonants' },
    
    // Common words with essential diacritics
    { pattern: /منتج(?![\u064B-\u0652])/g, replacement: 'مُنتَج', note: 'product' },
    { pattern: /جودة(?![\u064B-\u0652])/g, replacement: 'جَودة', note: 'quality' },
    { pattern: /سعر(?![\u064B-\u0652])/g, replacement: 'سِعر', note: 'price' },
    { pattern: /عرض(?![\u064B-\u0652])/g, replacement: 'عَرض', note: 'offer' },
    { pattern: /خصم(?![\u064B-\u0652])/g, replacement: 'خَصم', note: 'discount' },
    { pattern: /توصيل(?![\u064B-\u0652])/g, replacement: 'تَوصيل', note: 'delivery' },
    { pattern: /مجاني(?![\u064B-\u0652])/g, replacement: 'مَجّاني', note: 'free' },
    { pattern: /حصري(?![\u064B-\u0652])/g, replacement: 'حَصري', note: 'exclusive' },
    { pattern: /فقط(?![\u064B-\u0652])/g, replacement: 'فَقَط', note: 'only' },
    { pattern: /الآن(?![\u064B-\u0652])/g, replacement: 'الآن', note: 'now' },
    { pattern: /سريع(?![\u064B-\u0652])/g, replacement: 'سَريع', note: 'fast' },
    { pattern: /طبيعي(?![\u064B-\u0652])/g, replacement: 'طَبيعي', note: 'natural' },
    { pattern: /أصلي(?![\u064B-\u0652])/g, replacement: 'أَصلي', note: 'original' },
    { pattern: /مضمون(?![\u064B-\u0652])/g, replacement: 'مَضمون', note: 'guaranteed' },
    { pattern: /رائع(?![\u064B-\u0652])/g, replacement: 'رائِع', note: 'amazing' },
    { pattern: /مميز(?![\u064B-\u0652])/g, replacement: 'مُميَّز', note: 'special' },
    { pattern: /نتائج(?![\u064B-\u0652])/g, replacement: 'نَتائِج', note: 'results' },
    { pattern: /فعال(?![\u064B-\u0652])/g, replacement: 'فَعّال', note: 'effective' },
    { pattern: /آمن(?![\u064B-\u0652])/g, replacement: 'آمِن', note: 'safe' },
    { pattern: /صحي(?![\u064B-\u0652])/g, replacement: 'صِحّي', note: 'healthy' },
  ],

  // TTS pause markers for natural rhythm
  pauseMarkers: [
    { pattern: /،/g, replacement: '، ', note: 'Ensure space after comma' },
    { pattern: /\.\.\./g, replacement: '... ', note: 'Add pause after ellipsis' },
    { pattern: /!/g, replacement: '! ', note: 'Add pause after exclamation' },
    { pattern: /؟/g, replacement: '؟ ', note: 'Add pause after question mark' },
    { pattern: /\n/g, replacement: '\n ', note: 'Add pause after newline' },
  ],

  // Common mispronunciation fixes for e-commerce terms
  ecommerceTerms: [
    { pattern: /COD/gi, replacement: 'كاش عند الاستلام', note: 'Cash on delivery' },
    { pattern: /٪/g, replacement: ' بالمية ', note: 'percentage symbol' },
    { pattern: /%/g, replacement: ' بالمية ', note: 'percentage symbol' },
    { pattern: /ر\.س/g, replacement: 'ريال', note: 'Saudi Riyal abbreviation' },
    { pattern: /SAR/gi, replacement: 'ريال', note: 'SAR currency' },
    { pattern: /AED/gi, replacement: 'درهم', note: 'AED currency' },
    { pattern: /KWD/gi, replacement: 'دينار', note: 'KWD currency' },
    { pattern: /24\/7/g, replacement: 'أربع وعشرين ساعة', note: '24/7 availability' },
    { pattern: /100%/g, replacement: 'مية بالمية', note: '100 percent' },
    { pattern: /50%/g, replacement: 'خمسين بالمية', note: '50 percent' },
  ],

  // Gulf-specific CTA phrases
  ctaOptimization: [
    { pattern: /اطلب الآن/g, replacement: 'أطلُب الحين', note: 'Order now (Gulf)' },
    { pattern: /اشتري الآن/g, replacement: 'أشتَري الحين', note: 'Buy now (Gulf)' },
    { pattern: /جرب مجاناً/g, replacement: 'جرِّب مجّاناً', note: 'Try free' },
    { pattern: /احصل على/g, replacement: 'خُذ', note: 'Get (Gulf)' },
    { pattern: /لا تفوت/g, replacement: 'لا تفوِّت', note: 'Don\'t miss' },
    { pattern: /العرض محدود/g, replacement: 'العَرض محدود', note: 'Limited offer' },
    { pattern: /الكمية محدودة/g, replacement: 'الكَميّة محدودة', note: 'Limited quantity' },
  ],

  // Number pronunciation
  numberPronunciation: [
    { pattern: /(\d+)\s*ريال/g, replacement: (match: string, num: string) => `${convertNumberToArabicWords(num)} ريال`, note: 'Number + Riyal' },
  ],

  // Saudi/Gulf specific brand pronunciation helpers
  brandPronunciation: [
    { pattern: /انستقرام/g, replacement: 'إِنستَقرام', note: 'Instagram' },
    { pattern: /واتساب/g, replacement: 'واتسَاب', note: 'WhatsApp' },
    { pattern: /تيك توك/g, replacement: 'تِك تُوك', note: 'TikTok' },
    { pattern: /سناب شات/g, replacement: 'سناب شات', note: 'Snapchat' },
    { pattern: /يوتيوب/g, replacement: 'يُوتيُوب', note: 'YouTube' },
  ],
};

// Helper function to convert numbers to Arabic words
function convertNumberToArabicWords(num: string): string {
  const number = parseInt(num);
  if (isNaN(number)) return num;
  
  const arabicNumbers: Record<number, string> = {
    0: 'صفر', 1: 'واحد', 2: 'اثنين', 3: 'ثلاثة', 4: 'أربعة', 5: 'خمسة',
    6: 'ستة', 7: 'سبعة', 8: 'ثمانية', 9: 'تسعة', 10: 'عشرة',
    11: 'أحد عشر', 12: 'اثنا عشر', 20: 'عشرين', 30: 'ثلاثين',
    40: 'أربعين', 50: 'خمسين', 100: 'مية', 200: 'ميتين', 500: 'خمسمية',
    1000: 'ألف',
  };
  
  if (arabicNumbers[number]) return arabicNumbers[number];
  if (number < 100) return num; // Keep as number for complex cases
  return num;
}

// Apply all Gulf dialect rules
function applyGulfDialectRules(text: string, includeDialectConversion: boolean = true): {
  text: string;
  appliedRules: string[];
} {
  let result = text;
  const appliedRules: string[] = [];

  // Apply diacritics first (always)
  for (const rule of GULF_DIALECT_RULES.diacriticRules) {
    if (rule.pattern.test(result)) {
      result = result.replace(rule.pattern, rule.replacement);
      appliedRules.push(`Diacritic: ${rule.note}`);
    }
  }

  // Apply e-commerce term fixes (always)
  for (const rule of GULF_DIALECT_RULES.ecommerceTerms) {
    if (rule.pattern.test(result)) {
      result = result.replace(rule.pattern, rule.replacement);
      appliedRules.push(`E-commerce: ${rule.note}`);
    }
  }

  // Apply pause markers (always)
  for (const rule of GULF_DIALECT_RULES.pauseMarkers) {
    result = result.replace(rule.pattern, rule.replacement);
  }

  // Apply CTA optimization (always)
  for (const rule of GULF_DIALECT_RULES.ctaOptimization) {
    if (rule.pattern.test(result)) {
      result = result.replace(rule.pattern, rule.replacement);
      appliedRules.push(`CTA: ${rule.note}`);
    }
  }

  // Apply brand pronunciation (always)
  for (const rule of GULF_DIALECT_RULES.brandPronunciation) {
    if (rule.pattern.test(result)) {
      result = result.replace(rule.pattern, rule.replacement);
      appliedRules.push(`Brand: ${rule.note}`);
    }
  }

  // Apply Gulf dialect pronunciation (only if enabled)
  if (includeDialectConversion) {
    for (const rule of GULF_DIALECT_RULES.pronunciationFixes) {
      if (rule.pattern.test(result)) {
        result = result.replace(rule.pattern, rule.replacement);
        appliedRules.push(`Pronunciation: ${rule.note}`);
      }
    }
  }

  return { text: result, appliedRules };
}

// Grammar and structure validation
async function validateScript(text: string, language: string, apiKey: string): Promise<{
  correctedText: string;
  issues: string[];
}> {
  const systemPrompt = `You are an Arabic script validator and editor for video advertisements.
Your task is to:
1. Fix grammar and spelling errors
2. Ensure logical flow and structure
3. Verify CTA clarity and effectiveness
4. Remove any hallucinations or factually incorrect claims
5. Ensure the script is suitable for voice-over (natural speech patterns)

Language: ${language === 'ar' ? 'Arabic (Gulf/Saudi dialect preferred)' : language}

Return ONLY a JSON object with:
{
  "correctedText": "the corrected script text",
  "issues": ["list of issues found and fixed"]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Validate and correct this script:\n\n${text}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI validation failed:', response.status);
      return { correctedText: text, issues: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        correctedText: parsed.correctedText || text,
        issues: parsed.issues || [],
      };
    }
    
    return { correctedText: text, issues: [] };
  } catch (error) {
    console.error('Script validation error:', error);
    return { correctedText: text, issues: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      contentType = 'script',
      language = 'ar',
      checks = ['grammar', 'vocalization'],
      includeDialectConversion = true,
    } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`[arabic-vocalization] Processing ${contentType} with checks: ${checks.join(', ')}`);

    let correctedText = content;
    let vocalizedText = content;
    const allIssues: string[] = [];
    const appliedRules: string[] = [];

    // Step 1: Grammar and structure validation
    if (checks.includes('grammar') || checks.includes('logic') || checks.includes('cta') || checks.includes('hallucination')) {
      const validation = await validateScript(content, language, LOVABLE_API_KEY);
      correctedText = validation.correctedText;
      allIssues.push(...validation.issues);
    }

    // Step 2: Arabic vocalization and Gulf dialect optimization
    if (checks.includes('arabic_vocalization') || checks.includes('vocalization')) {
      const vocalization = applyGulfDialectRules(correctedText, includeDialectConversion);
      vocalizedText = vocalization.text;
      appliedRules.push(...vocalization.appliedRules);
    } else {
      vocalizedText = correctedText;
    }

    console.log(`[arabic-vocalization] Applied ${appliedRules.length} rules, found ${allIssues.length} issues`);

    return new Response(JSON.stringify({
      success: true,
      originalText: content,
      correctedText,
      vocalizedText,
      issues: allIssues,
      appliedRules,
      dialectRulesApplied: includeDialectConversion,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in arabic-vocalization:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
