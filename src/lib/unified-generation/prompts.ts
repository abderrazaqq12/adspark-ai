/**
 * Unified Prompt Management
 * Single prompt used across all execution modes
 */

import { UnifiedInput } from './types';

export const UNIFIED_LANDING_PAGE_PROMPT = `You are a senior Arabic eCommerce conversion expert and front-end page compiler.

Your task is to generate a FULL production-ready landing page for a COD eCommerce product in Saudi Arabia.

You MUST follow these steps internally and return ALL outputs in a single JSON response.

────────────────────────
INPUT DATA
────────────────────────
Product Title:
{{product_title}}

Product Description:
{{product_description}}

Target Market:
Saudi Arabia (KSA)

Language:
Saudi Arabic dialect

Direction:
RTL (dir="rtl")

────────────────────────
INTERNAL STEPS (DO NOT SKIP)
────────────────────────

STEP 1: Generate Marketing Angles
- Identify pain points
- Emotional triggers
- Lifestyle desires
- Objections
- Trust elements

STEP 2: Generate Landing Page Text Content
Follow this structure strictly:
1. Strong opening headline (benefit-driven)
2. Subheadline (supporting promise)
3. Bullet-point benefits (emotional)
4. Usage instructions
5. Technical specifications
6. Problem → Solution section
7. FAQ (minimum 6 questions)
8. Customer reviews (10 reviews, Saudi dialect)

STEP 3: Compile HTML Landing Page
Rules:
- Output CLEAN HTML ONLY
- Mobile-first
- RTL layout
- Use semantic HTML
- Rounded cards
- Soft shadows
- Generous spacing
- Placeholder image blocks (1080x1080)
- No external JS frameworks
- Inline CSS allowed
- Font: Tajawal or Cairo
- Use color variables:
  --bg-primary
  --text-accent
  --card-bg

────────────────────────
OUTPUT FORMAT (STRICT)
────────────────────────
Return ONLY valid JSON with this structure:

{
  "marketingAngles": {
    "painPoints": [],
    "desires": [],
    "emotionalHooks": [],
    "trustBuilders": []
  },
  "sections": {
    "hero": { "headline": "", "subheadline": "" },
    "features": [],
    "benefits": [],
    "problemSolution": { "problem": "", "solution": "" },
    "usage": [],
    "technicalDetails": [],
    "faq": [],
    "reviews": [],
    "cta": { "text": "", "subtext": "" }
  },
  "html": "<!DOCTYPE html>...</html>"
}

DO NOT add explanations.
DO NOT add markdown.
DO NOT add comments outside JSON.`;

export function buildPrompt(input: UnifiedInput, customPrompt?: string): string {
  const basePrompt = customPrompt || UNIFIED_LANDING_PAGE_PROMPT;
  
  return basePrompt
    .replace('{{product_title}}', input.product.title)
    .replace('{{product_description}}', input.product.description)
    .replace('{{locale}}', input.locale || 'ar-SA');
}

export function getPromptForExecution(input: UnifiedInput, customPrompt?: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are a senior Arabic eCommerce conversion expert. Generate production-ready landing pages in JSON format only.`;
  
  const userPrompt = buildPrompt(input, customPrompt);
  
  return { systemPrompt, userPrompt };
}
