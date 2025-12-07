import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Default prompts for each function
const DEFAULT_PROMPTS: Record<string, string> = {
  product_content: `You are a top-performing digital marketer with deep experience in product positioning, emotional copywriting, and conversion-optimized messaging.

📦 Based on the product name, product description, ingredients, and any available features or benefits:
{{ product_name }}
{{ product_description }}

🎯 Your Task:
Analyze the product and extract the most persuasive, value-driven insights. Return your answer in three clear sections:

1. Problems Solved
2. Customer Value
3. Marketing Angles

- Give me the results in arabic language`,

  landing_page_content: `You are a senior Arabic eCommerce conversion copywriter, trained on the marketing frameworks of Alex Hormozi and Russell Brunson.

📥 You Will Receive:
Product Name: {{ product_name }}
Description: {{ product_description }}

🎯 Your Goal:
Create a high-converting, emotionally resonant Arabic product description tailored for Saudi eCommerce shoppers.`,

  voiceover_scripts: `You are a professional digital marketer and UGC ad specialist who has created over 1,000 high-performing video ad scripts for eCommerce brands targeting the Saudi market.

Generate 10 unique 30-second ad scripts, written in spoken Saudi Arabic dialect — designed for Snapchat or TikTok.`,

  product_name: `استخدم الصيغة التالية لإنشاء اسم المنتج

أسم المنتج + المكون الرئيسي + فوائده`,

  image_generation: `Act as a professional product photographer. Generate 6 high-quality square images (1:1 format) for the product. The product is targeted at Saudi Arabian men and women aged 30+.`,

  image_prompt_builder: `Generate 6 high-quality square (1:1) images for an eCommerce store using the attached product image. The product targets Saudi Arabian customers aged 34+.`,

  product_description: `📝 Prompt لإنشاء وصف تسويقي لمنتج باللغة العربية موجهًا لعملاء السعودية`,

  heygen_emotion: `Realism and dynamism - Realistic animations, emotional storytelling
Mouth & Lip Sync, Hands & Arms, Head & Torso, Eyes & Brows`,

  avatar_women_35: `Generate a realistic full-body or half-body avatar of a 35-year-old Saudi Arabian woman, standing or sitting naturally, suitable for 9:16 vertical format.`,

  avatar_women_product: `Generate a realistic full-body or half-body avatar of a 35-year-old Saudi Arabian woman, dressed in traditional attire, holding a product.`,

  avatar_men_55: `Generate a hyper-realistic full-body avatar of a 55-year-old Saudi Arabian man, styled and posed in a way that looks indistinguishable from a real human photograph.`,

  landing_page_builder: `Design a modern, mobile-first landing page for an eCommerce product in Saudi Arabic dialect (dir="rtl", right-aligned text).`,

  hero_ui_landing: `Create a modern, mobile-first landing page in Saudi Arabic dialect language for an eCommerce product.`,

  brand_creation: `You are a Brand Creator Expert. Your job is to take the product information I provide and build out a complete brand document.`,

  sora_video: `Create a high-quality 9:16 TikTok-style product video. No voiceover or on-screen text. Focus entirely on visual storytelling.`,

  product_title: `Write one single product title that is emotionally compelling and makes the reader want to buy the product immediately.`,

  heygen_agent: `You are a professional UGC video ad creator specialized in eCommerce and COD businesses in Saudi Arabia.`,

  product_animation: `Create a high-quality product animation video using the provided product photo. Premium studio look with elegant slow motion + cinematic lighting.`,
};

interface UseStudioPromptsReturn {
  prompts: Record<string, string>;
  loading: boolean;
  error: string | null;
  getPrompt: (functionName: string, variables?: Record<string, string>) => string;
  refreshPrompts: () => Promise<void>;
}

export function useStudioPrompts(): UseStudioPromptsReturn {
  const [prompts, setPrompts] = useState<Record<string, string>>(DEFAULT_PROMPTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPrompts(DEFAULT_PROMPTS);
        return;
      }

      const { data: settings, error: fetchError } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const savedPrompts = (settings?.preferences as Record<string, any>)?.studio_prompts || {};

      // Merge default prompts with saved prompts (saved takes priority)
      const mergedPrompts = { ...DEFAULT_PROMPTS };
      Object.entries(savedPrompts).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          mergedPrompts[key] = value;
        }
      });

      setPrompts(mergedPrompts);
    } catch (err) {
      console.error("Error loading studio prompts:", err);
      setError(err instanceof Error ? err.message : "Failed to load prompts");
      setPrompts(DEFAULT_PROMPTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  /**
   * Get a prompt by function name, optionally replacing variables
   * @param functionName - The function name (e.g., 'image_generation', 'voiceover_scripts')
   * @param variables - Optional object with variable replacements (e.g., { product_name: 'My Product' })
   * @returns The prompt string with variables replaced
   */
  const getPrompt = useCallback((functionName: string, variables?: Record<string, string>): string => {
    let prompt = prompts[functionName] || DEFAULT_PROMPTS[functionName] || "";

    // Replace variables if provided
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        // Replace both {{ variable }} and {{variable}} formats
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        prompt = prompt.replace(regex, value);
      });
    }

    return prompt;
  }, [prompts]);

  return {
    prompts,
    loading,
    error,
    getPrompt,
    refreshPrompts: loadPrompts,
  };
}

// Export function types for Studio components
export type StudioPromptFunction = 
  | 'product_content'
  | 'landing_page_content'
  | 'voiceover_scripts'
  | 'product_name'
  | 'image_generation'
  | 'image_prompt_builder'
  | 'product_description'
  | 'heygen_emotion'
  | 'avatar_women_35'
  | 'avatar_women_product'
  | 'avatar_men_55'
  | 'landing_page_builder'
  | 'hero_ui_landing'
  | 'brand_creation'
  | 'sora_video'
  | 'product_title'
  | 'heygen_agent'
  | 'product_animation';
