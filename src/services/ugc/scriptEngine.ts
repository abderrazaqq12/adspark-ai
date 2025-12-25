/**
 * UGC Script Engine Service
 * AI-powered script generation with rotating marketing frameworks
 */

import type { UGCLanguage, UGCProductCategory, UGCScriptConfig } from '@/types/ugc';

// Marketing Frameworks
export type MarketingFramework = 'PAS' | 'AIDA' | 'TESTIMONIAL' | 'PROBLEM_FIRST';

export interface GeneratedScript {
    id: string;
    text: string;
    framework: MarketingFramework;
    hook: string;
    context: string;
    productUsage: string;
    benefit: string;
    cta: string;
    language: UGCLanguage;
    videoNumber: number;
}

// Framework templates for each language
const FRAMEWORK_TEMPLATES: Record<MarketingFramework, Record<UGCLanguage, {
    hooks: string[];
    contexts: string[];
    benefits: string[];
    ctas: string[];
}>> = {
    PAS: {
        ARABIC: {
            hooks: [
                'هل تعاني من هذه المشكلة؟',
                'كنت أعاني من نفس المشكلة',
                'قبل أن أجد الحل كنت محبطة',
                'لازم تشوفون هذا المنتج',
            ],
            contexts: [
                'كل يوم نفس المعاناة',
                'جربت كل شي بدون فايدة',
                'كان الوضع صعب جداً',
                'ما كنت أعرف الحل موجود',
            ],
            benefits: [
                'الآن كل شي تغير',
                'النتيجة مذهلة',
                'الفرق واضح جداً',
                'ما صدقت الفرق',
            ],
            ctas: [
                'جربوه الحين!',
                'اطلبوه قبل ما يخلص',
                'الرابط في البايو',
                'ما راح تندمون',
            ],
        },
        SPANISH: {
            hooks: [
                '¿Tienes este problema?',
                'Yo tenía el mismo problema',
                'Antes estaba frustrada',
                'Tienen que ver esto',
            ],
            contexts: [
                'Todos los días lo mismo',
                'Probé de todo sin resultados',
                'La situación era difícil',
                'No sabía que existía la solución',
            ],
            benefits: [
                'Ahora todo cambió',
                'El resultado es increíble',
                'La diferencia es clara',
                'No podía creer el cambio',
            ],
            ctas: [
                '¡Pruébalo ahora!',
                'Pídelo antes de que se agote',
                'Link en la bio',
                'No te vas a arrepentir',
            ],
        },
        ENGLISH: {
            hooks: [
                'Do you have this problem?',
                'I had the same issue',
                'I was so frustrated before',
                'You need to see this',
            ],
            contexts: [
                'Every day was a struggle',
                'I tried everything with no results',
                'The situation was tough',
                'I didn\'t know a solution existed',
            ],
            benefits: [
                'Now everything changed',
                'The results are amazing',
                'The difference is clear',
                'I couldn\'t believe the change',
            ],
            ctas: [
                'Try it now!',
                'Order before it sells out',
                'Link in bio',
                'You won\'t regret it',
            ],
        },
        FRENCH: {
            hooks: [
                'Tu as ce problème?',
                'J\'avais le même souci',
                'J\'étais tellement frustrée',
                'Tu dois voir ça',
            ],
            contexts: [
                'Chaque jour était difficile',
                'J\'ai tout essayé sans résultat',
                'La situation était dure',
                'Je ne savais pas que ça existait',
            ],
            benefits: [
                'Maintenant tout a changé',
                'Les résultats sont incroyables',
                'La différence est claire',
                'Je n\'y croyais pas',
            ],
            ctas: [
                'Essaie maintenant!',
                'Commande avant rupture',
                'Lien en bio',
                'Tu ne regretteras pas',
            ],
        },
    },
    AIDA: {
        ARABIC: {
            hooks: [
                'انتبهوا لهذا!',
                'شوفوا هذا المنتج المذهل',
                'أهم شي راح تشوفونه اليوم',
                'توقفوا هنا ثانية',
            ],
            contexts: [
                'هذا المنتج يحل مشكلة كبيرة',
                'كلنا نعاني من هذا',
                'تخيلوا لو ما تحتاجون تعانون',
                'الحل أسهل مما تتوقعون',
            ],
            benefits: [
                'راح تحبون النتيجة',
                'التأثير فوري',
                'الجودة عالية جداً',
                'ما راح تلاقون أفضل',
            ],
            ctas: [
                'اطلبوا الحين!',
                'لا تفوتوا الفرصة',
                'اضغطوا على الرابط',
                'خصم محدود!',
            ],
        },
        SPANISH: {
            hooks: [
                '¡Presta atención!',
                'Mira este producto increíble',
                'Lo más importante que verás hoy',
                'Para un momento',
            ],
            contexts: [
                'Este producto resuelve un gran problema',
                'Todos sufrimos de esto',
                'Imagina no tener que sufrir más',
                'La solución es más fácil de lo que crees',
            ],
            benefits: [
                'Te va a encantar el resultado',
                'El efecto es inmediato',
                'La calidad es increíble',
                'No encontrarás algo mejor',
            ],
            ctas: [
                '¡Ordena ahora!',
                'No pierdas la oportunidad',
                'Haz clic en el enlace',
                '¡Descuento limitado!',
            ],
        },
        ENGLISH: {
            hooks: [
                'Pay attention to this!',
                'Look at this amazing product',
                'The most important thing you\'ll see today',
                'Stop for a second',
            ],
            contexts: [
                'This product solves a big problem',
                'We all suffer from this',
                'Imagine not having to struggle anymore',
                'The solution is easier than you think',
            ],
            benefits: [
                'You\'ll love the results',
                'The effect is immediate',
                'The quality is incredible',
                'You won\'t find better',
            ],
            ctas: [
                'Order now!',
                'Don\'t miss the chance',
                'Click the link',
                'Limited discount!',
            ],
        },
        FRENCH: {
            hooks: [
                'Faites attention!',
                'Regarde ce produit incroyable',
                'La chose la plus importante aujourd\'hui',
                'Arrête-toi une seconde',
            ],
            contexts: [
                'Ce produit résout un gros problème',
                'On souffre tous de ça',
                'Imagine ne plus avoir à lutter',
                'La solution est plus simple que tu crois',
            ],
            benefits: [
                'Tu vas adorer les résultats',
                'L\'effet est immédiat',
                'La qualité est incroyable',
                'Tu ne trouveras pas mieux',
            ],
            ctas: [
                'Commande maintenant!',
                'Ne rate pas cette chance',
                'Clique sur le lien',
                'Réduction limitée!',
            ],
        },
    },
    TESTIMONIAL: {
        ARABIC: {
            hooks: [
                'لازم أشارك تجربتي معكم',
                'صدقوني لما أقول',
                'ما كنت أصدق النتيجة',
                'بعد أسبوع واحد فقط',
            ],
            contexts: [
                'كنت أعاني سنين',
                'جربت منتجات كثيرة',
                'صديقتي نصحتني بهذا',
                'كنت متردة في البداية',
            ],
            benefits: [
                'الآن أنا مختلفة تماماً',
                'النتيجة فاقت توقعاتي',
                'كل الناس لاحظوا الفرق',
                'ما أقدر أستغني عنه',
            ],
            ctas: [
                'جربوه بأنفسكم',
                'الرابط تحت',
                'ما راح تندمون أبداً',
                'شكراً لي لاحقاً',
            ],
        },
        SPANISH: {
            hooks: [
                'Tengo que compartir mi experiencia',
                'Créanme cuando les digo',
                'No podía creer el resultado',
                'Después de solo una semana',
            ],
            contexts: [
                'Sufrí por años',
                'Probé muchos productos',
                'Mi amiga me recomendó esto',
                'Estaba dudosa al principio',
            ],
            benefits: [
                'Ahora soy completamente diferente',
                'El resultado superó mis expectativas',
                'Todos notaron la diferencia',
                'No puedo vivir sin él',
            ],
            ctas: [
                'Pruébenlo ustedes mismos',
                'Link abajo',
                'No se van a arrepentir',
                'Me lo agradecerán después',
            ],
        },
        ENGLISH: {
            hooks: [
                'I have to share my experience',
                'Believe me when I say',
                'I couldn\'t believe the result',
                'After just one week',
            ],
            contexts: [
                'I struggled for years',
                'I tried so many products',
                'My friend recommended this',
                'I was skeptical at first',
            ],
            benefits: [
                'Now I\'m completely different',
                'The result exceeded my expectations',
                'Everyone noticed the difference',
                'I can\'t live without it',
            ],
            ctas: [
                'Try it yourself',
                'Link below',
                'You won\'t regret it',
                'Thank me later',
            ],
        },
        FRENCH: {
            hooks: [
                'Je dois partager mon expérience',
                'Croyez-moi quand je dis',
                'Je n\'arrivais pas à y croire',
                'Après seulement une semaine',
            ],
            contexts: [
                'J\'ai lutté pendant des années',
                'J\'ai essayé tant de produits',
                'Mon amie m\'a recommandé ça',
                'J\'étais sceptique au début',
            ],
            benefits: [
                'Maintenant je suis différente',
                'Le résultat a dépassé mes attentes',
                'Tout le monde a remarqué',
                'Je ne peux plus m\'en passer',
            ],
            ctas: [
                'Essayez vous-même',
                'Lien en dessous',
                'Vous ne regretterez pas',
                'Remerciez-moi plus tard',
            ],
        },
    },
    PROBLEM_FIRST: {
        ARABIC: {
            hooks: [
                'المشكلة اللي نعاني منها كلنا',
                'ليش ما أحد يتكلم عن هذا؟',
                'الحقيقة اللي لازم تعرفونها',
                'اكتشفت شي مهم جداً',
            ],
            contexts: [
                'هذي المشكلة تأثر على حياتنا',
                'الحل التقليدي ما يفيد',
                'بحثت كثير عن حل',
                'أخيراً لقيت الجواب',
            ],
            benefits: [
                'هذا المنتج غير كل شي',
                'الحل كان أبسط مما توقعت',
                'الفرق كان من أول استخدام',
                'ما صدقت إنه يشتغل كذا',
            ],
            ctas: [
                'الحين دوركم',
                'جربوه بأنفسكم',
                'الرابط متوفر',
                'لا تنتظرون أكثر',
            ],
        },
        SPANISH: {
            hooks: [
                'El problema que todos tenemos',
                '¿Por qué nadie habla de esto?',
                'La verdad que necesitan saber',
                'Descubrí algo muy importante',
            ],
            contexts: [
                'Este problema afecta nuestra vida',
                'La solución tradicional no sirve',
                'Busqué mucho una solución',
                'Por fin encontré la respuesta',
            ],
            benefits: [
                'Este producto cambió todo',
                'La solución era más simple',
                'La diferencia fue desde el primer uso',
                'No creía que funcionara así',
            ],
            ctas: [
                'Ahora es tu turno',
                'Pruébalo tú mismo',
                'Link disponible',
                'No esperes más',
            ],
        },
        ENGLISH: {
            hooks: [
                'The problem we all have',
                'Why isn\'t anyone talking about this?',
                'The truth you need to know',
                'I discovered something important',
            ],
            contexts: [
                'This problem affects our lives',
                'Traditional solutions don\'t work',
                'I searched a lot for an answer',
                'I finally found the solution',
            ],
            benefits: [
                'This product changed everything',
                'The solution was simpler than expected',
                'The difference was instant',
                'I couldn\'t believe it worked',
            ],
            ctas: [
                'Now it\'s your turn',
                'Try it yourself',
                'Link available',
                'Don\'t wait any longer',
            ],
        },
        FRENCH: {
            hooks: [
                'Le problème qu\'on a tous',
                'Pourquoi personne n\'en parle?',
                'La vérité que tu dois savoir',
                'J\'ai découvert quelque chose',
            ],
            contexts: [
                'Ce problème affecte notre vie',
                'Les solutions classiques ne marchent pas',
                'J\'ai beaucoup cherché',
                'J\'ai enfin trouvé la réponse',
            ],
            benefits: [
                'Ce produit a tout changé',
                'La solution était plus simple',
                'La différence était immédiate',
                'Je n\'y croyais pas',
            ],
            ctas: [
                'Maintenant c\'est ton tour',
                'Essaie toi-même',
                'Lien disponible',
                'N\'attends plus',
            ],
        },
    },
};

// Rotate through frameworks
const FRAMEWORK_ORDER: MarketingFramework[] = ['PAS', 'AIDA', 'TESTIMONIAL', 'PROBLEM_FIRST'];

/**
 * Generate scripts for a batch of videos
 */
export async function generateScripts(params: {
    productName: string;
    productBenefit: string;
    productCategory?: UGCProductCategory;
    language: UGCLanguage;
    videoCount: number;
}): Promise<GeneratedScript[]> {
    const { productName, productBenefit, language, videoCount } = params;

    const scripts: GeneratedScript[] = [];

    for (let i = 0; i < videoCount; i++) {
        // Rotate framework
        const framework = FRAMEWORK_ORDER[i % FRAMEWORK_ORDER.length];
        const templates = FRAMEWORK_TEMPLATES[framework][language] || FRAMEWORK_TEMPLATES[framework].ENGLISH;

        // Pick random variations within each section to ensure uniqueness
        const hookIndex = i % templates.hooks.length;
        const contextIndex = (i + 1) % templates.contexts.length;
        const benefitIndex = (i + 2) % templates.benefits.length;
        const ctaIndex = i % templates.ctas.length;

        const hook = templates.hooks[hookIndex];
        const context = templates.contexts[contextIndex];
        const benefit = templates.benefits[benefitIndex];
        const cta = templates.ctas[ctaIndex];

        // Construct full script with product name insertion
        const fullText = `${hook}\n\n${context}\n\n${productName} - ${productBenefit}\n\n${benefit}\n\n${cta}`;

        scripts.push({
            id: `script-${Date.now()}-${i}`,
            text: fullText,
            framework,
            hook,
            context,
            productUsage: `${productName} - ${productBenefit}`,
            benefit,
            cta,
            language,
            videoNumber: i + 1,
        });
    }

    return scripts;
}

/**
 * Validate script quality and compliance
 */
export function validateScript(script: GeneratedScript): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check minimum length
    if (script.text.length < 50) {
        issues.push('Script too short');
    }

    // Check for required sections
    if (!script.hook || script.hook.length < 10) {
        issues.push('Hook too weak');
    }

    if (!script.cta || script.cta.length < 5) {
        issues.push('CTA missing or too short');
    }

    // Check for banned words (add policy compliance)
    const bannedWords = ['guarantee', 'cure', 'miracle', '100%', 'risk-free'];
    const lowerText = script.text.toLowerCase();
    for (const word of bannedWords) {
        if (lowerText.includes(word)) {
            issues.push(`Contains policy-violating word: ${word}`);
        }
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}

/**
 * Get framework display name
 */
export function getFrameworkDisplayName(framework: MarketingFramework): string {
    const names: Record<MarketingFramework, string> = {
        PAS: 'Problem-Agitate-Solution',
        AIDA: 'Attention-Interest-Desire-Action',
        TESTIMONIAL: 'Personal Testimonial',
        PROBLEM_FIRST: 'Problem-First Approach',
    };
    return names[framework];
}
