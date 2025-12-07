import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  ChevronDown, 
  Save, 
  Loader2, 
  Image, 
  Video, 
  Mic, 
  Globe, 
  User, 
  Sparkles,
  Pencil,
  Package,
  Layout
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudioPrompt {
  id: string;
  name: string;
  function: string;
  prompt: string;
  description: string;
  icon: React.ReactNode;
}

const DEFAULT_PROMPTS: Omit<StudioPrompt, 'id'>[] = [
  {
    name: "Product Marketing Angles",
    function: "product_content",
    description: "Used in Studio Step 2 - Product Content to generate marketing angles",
    icon: <Sparkles className="w-4 h-4" />,
    prompt: `You are a top-performing digital marketer with deep experience in product positioning, emotional copywriting, and conversion-optimized messaging.

📦 Based on the product name, product description, ingredients, and any available features or benefits:
{{ product_name }}
{{ product_description }}

🎯 Your Task:
Analyze the product and extract the most persuasive, value-driven insights. Return your answer in three clear sections:

1. Problems Solved
Identify every pain point this product addresses, including:

Functional problems (e.g. acne, joint pain, lack of energy)

Emotional struggles (e.g. low confidence, frustration, embarrassment)

Hidden/secondary problems the customer may not express but deeply feels

Think like the customer. What are they Googling at 2 AM? What discomfort are they silently enduring?

2. Customer Value
List all the emotional and practical transformations the customer will experience after using the product:

Tangible results (e.g. smoother skin, better sleep, stronger joints)

Emotional outcomes (e.g. confidence, peace of mind, feeling attractive)

Unique product benefits tied to ingredients or formulation

Highlight what makes this product worth buying now, not later.

3. Marketing Angles
List all high-converting marketing angles that can be used for ads, landing pages, or emails:

Problem/Solution

Social Proof / Testimonials

Urgency / Scarcity

Ingredient Superiority

Authority / Expert-Backed

Aspirational / Lifestyle Transformation

Before/After Visuals

Emotional storytelling (relatable, identity-based)

Include angles for both logical buyers and emotional impulse buyers.

- Give me the results in arabic language`
  },
  {
    name: "Landing Page Content",
    function: "landing_page_content",
    description: "Used in Studio Step 4 - Landing Page Generator for Arabic copy",
    icon: <Globe className="w-4 h-4" />,
    prompt: `You are a senior Arabic eCommerce conversion copywriter, trained on the marketing frameworks of Alex Hormozi and Russell Brunson, and with experience writing 1,000+ product descriptions and landing pages that generated millions in revenue — especially for COD (Cash-on-Delivery) businesses in Saudi Arabia.

You specialize in:

Writing high-converting Arabic product copy

Emotional, benefit-driven sales language

Understanding the psychology of Saudi online shoppers

📥 You Will Receive:
Product Name: {{ product_name }}

Description: {{ product_description }}

Link 1: {{ product_link_1 }}

Link 2: {{ product_link_2 }}

🎯 Your Goal:
Create a high-converting, emotionally resonant Arabic product description tailored for Saudi eCommerce shoppers, optimized for mobile landing pages, and aligned with COD business conversion best practices.

🔍 Extract and Analyze the Following:
Product Title – clear, relevant, and emotionally appealing

Unique Selling Proposition (USP) – what makes it irresistible?

Problem It Solves / Desire It Fulfills – connect with buyer's pain or aspiration

Target Audience – who needs this most? Who should avoid it?

Key Benefits & Features – emotional bullet points, not dry specs

Usage Instructions – if needed, explain simply

Technical Details – size, weight, origin, materials, shelf life, etc.

🧱 Structure to Follow:
🧲 Attention-Grabbing Headline

Must contain big promise or bold benefit

Should spark curiosity, urgency, or emotion

✅ Benefit-Driven Bullet Points (4–6 Max)

Each point highlights emotional payoff

Start with verbs or bold keywords if helpful

📦 How to Use It (if applicable)

2–4 short steps written like you're guiding a friend

📊 Technical & Practical Details

Include size, quantity, origin, usage, and shelf life

🚀 Final Call to Action

Persuasive, localized phrasing with subtle urgency

Avoid hard selling – aim for emotional encouragement

📏 Rules & Voice Guidelines:
✅ Write in simple, clear, conversational Arabic (Gulf/Saudi-friendly)

✅ Maintain natural rhythm, as if you're talking to a friend or family

✅ Highlight the offer value and what the user gets

✅ Keep paragraphs short and easy to skim on mobile

✅ Use emotion and storytelling, not just logic

✅ Follow structure strictly — no HTML, no brand mentions

❌ Do not copy raw data or translate literally — always adapt and sell

💡 Alex Hormozi-style Copy Hints (Built-In):
Emphasize value stacking: combine benefit + bonus + emotional payoff

Tap into desires: beauty, health, family, comfort, pride, relief

Overcome objections silently by highlighting results, ease of use, or safety

Use contrast: "Before vs After", "Without this vs With this"

📤 Output Format:
Return the final product description in plain Arabic text with:

Strong formatting: bullet points ✅, clear sections 📦, short paragraphs

No labels like "Product Title" — just the actual usable content

Fully ready to paste into a Google Sheet or store page`
  },
  {
    name: "Voiceover Scripts",
    function: "voiceover_scripts",
    description: "Used in Studio Step 5 - Voiceover for generating video ad scripts",
    icon: <Mic className="w-4 h-4" />,
    prompt: `You are a **professional digital marketer and UGC ad specialist** who has created over **1,000 high-performing video ad scripts** for eCommerce brands targeting the **Saudi market**.

You specialize in **short-form video ads** (Snapchat/TikTok) that achieve **60%+ CTR** by combining deep emotional hooks, localized Saudi dialect, and performance-tested ad angles.

---

### 🎯 Your Task:

Based on the product description I'll provide, generate **10 unique 30-second ad scripts**, written in **spoken Saudi Arabic dialect** — designed for **Snapchat or TikTok**.

---

### 🧱 Script Structure (per each of the 10):

1. **Hook** (First 3 seconds):
   Start with a powerful attention-grabbing line using **one of these angles**:

   * Emotional pain or problem
   * Relatable everyday situation
   * Curiosity-driven question
   * Promise or shocking stat
   * Jealousy/FOMO
   * Quick story or confession
   * Season/event context (e.g., Ramadan, travel, weddings, hot weather...)

2. **Main Message**:
   Show how the product solves a **clear problem** or fulfills a **deep desire**. Highlight the **key benefits** and **USP** extracted from the product description. Use emotional, natural language that makes the viewer feel:
   "This product was made for me."

3. **Call to Action + Buying Triggers**:
   End with a strong, emotionally driven CTA and clearly mention the **sales triggers**:

   * ✅ Free Shipping
   * ✅ Cash on Delivery
   * ✅ Return & Exchange Guarantee

   Vary how you say these across scripts to avoid repetition:

   * "اطلبه الآن والتوصيل علينا."
   * "تدفع وقت الاستلام، لا تحويل ولا بطاقة."
   * "وعندك ضمان، ترجع أو تبدّل بدون تعقيد."
الدفع كاش او عن طريق الشبكة
---

### 📌 Guidelines:

* Use **spoken Saudi dialect**, not Modern Standard Arabic
* Do **not** use emojis or unnatural expressions
* Keep punctuation minimal and clean (periods, commas only)
* Use **partial diacritics** (تشكيل جزئي) for words that might be mispronounced in audio
* Do **not** mention the product name at the beginning — place it naturally later in the script
* Make each script feel like a **natural UGC ad** — as if a real person is sharing their experience

---

### 🔁 Summary for AI:

* Generate 10 short video ad scripts
* Each script is 30 seconds max
* Use a different creative angle for each one
* Make it sound local, natural, and relatable to Saudi viewers
* Build in emotional storytelling, benefits, trust triggers, and a strong CTA
* Based on only the product description you receive`
  },
  {
    name: "Product Name Generator",
    function: "product_name",
    description: "Used to generate compelling product names",
    icon: <Package className="w-4 h-4" />,
    prompt: `استخدم الصيغة التالية لإنشاء اسم المنتج

أسم المنتج (مثلا كريم أو سيروم ) + المكون الرئيسي أو الاسم الموجود في المنتج أو البراند (مثلا الكولاجين، الزنك،..) + فوائده (مثلا  للتجاعيد، خشونة الركبة...)`
  },
  {
    name: "Image Generation",
    function: "image_generation",
    description: "Used in Studio Step 3 - Image Generation for product photos",
    icon: <Image className="w-4 h-4" />,
    prompt: `Act as a professional product photographer or creative studio producer. Generate 6 high-quality square images (1:1 format) for the product [product_name]. The product is targeted at Saudi Arabian men and women aged 30+. 

📌 Conditions:
- Do NOT change the product's language, design, or color — keep it exactly as provided
- Do NOT add any text or labels into the images
- Maintain realism, clarity, and cultural relevance

🎯 Output: 6 different types of images for eCommerce usage

1. **Individual/Studio Shot**  
   - Clean white or light-neutral background  
   - The product alone in the center  
   - Soft shadows and clear lighting  
   - Minimalistic and elegant presentation

2. **Lifestyle/In-Context Shot**  
   - The product placed in a realistic Saudi environment (e.g., bedroom, bathroom, vanity, office desk, gym, or living room)  
   - Shown in use or within reach of a man or woman in traditional attire (hijab, niqab, or thobe)  
   - Natural, soft lighting

3. **Packaging Shot**  
   - White or neutral background  
   - Focus on packaging and label details  
   - If possible, show open version to reveal contents  
   - Product centered with soft shadow depth

4. **Hero Shot**  
   - Dramatic or elegant background match with product color
   - Strong lighting on product to highlight shape and features  
   - Optional: held by hand in traditional clothing sleeve  
   - Premium, eye-catching visual

5. **Flat Lay Photography**  
   - Top-down view with the product centered on a Saudi-inspired fabric  
   - Surrounding items that match the product's category (e.g. skincare, wellness, tech, lifestyle)  
   - Well-balanced, clean layout

6. **Before/After or Use Case Style (Optional Visual Transformation)**  
   - Only if applicable: Split into left (problem), center (product), right (improved state)  
   - Neutral clean background, no text  
   - Subtle visual cues showing benefit of the product if suitable

✅ All images must look realistic, clean, and optimized for eCommerce or social media. Respect Saudi culture and aesthetics throughout.`
  },
  {
    name: "Image Prompt Builder",
    function: "image_prompt_builder",
    description: "Advanced image prompt for eCommerce product photos",
    icon: <Image className="w-4 h-4" />,
    prompt: `Generate 6 high-quality square (1:1) images for an eCommerce store using the attached product image. The product targets Saudi Arabian customers (women, men, or both) aged 34+, and should be presented in a realistic and culturally appropriate manner.

📌 Global Rules:
- Always place the product clearly and realistically in the center
- Don't modify the attached product image (no color or language changes)
- No added text or logos
- Reflect the Saudi market: include traditional attire like hijab, niqab, khimar for women, and thobe, ghutra, or shmagh for men
- Use appropriate context based on general product use (not all are cosmetics or anti-aging)
- Avoid unrealistic effects — keep the product realistic and usable

📷 Image Concepts:

1. **Studio Product Shot 
   - Clean white background  
   - Optional: Show before/after if the product has a visible result (e.g. body, home use, skincare)  
   - Center: Product clearly displayed  
   - Lighting: Balanced, soft shadows

2. **Lifestyle/In-Context Image**  
   - Product in a real-life Saudi setting (e.g., bedroom, bathroom, living room, desk, gym, vanity, or car — depending on product category)  
   - A person (man or woman) nearby using or interacting with it naturally  
   - Clothing matches local culture  
   - Mood: Comfortable and authentic

3. **Packaging & Detail Shot**  
   - White or neutral background  
   - Focus on packaging details and clarity (peel-off, open bottle, ingredient texture if applicable)  
   - Light shadows to add depth  
   - No human model

4. **Hero Shot (Highlighting Premium Appeal)**  
   - Dark or elegant background  
   - Product glowing softly or lit with spotlight  
   - Held by a hand wearing traditional attire (if applicable)  
   - Focus is on luxury, quality, or function

5. **Flat Lay Photography**  
   - Top-down view on a clean, culturally styled fabric  
   - Product centered  
   - Surrounding items should fit product category:  
     - Beauty: pins, mirror, oud, skincare  
     - Wellness: miswak, rosary, oils  
     - Tech/Home: keys, organizer, phone  
     - Kitchen: spices, utensils  
   - Balanced layout, no clutter

6. **Transformation or Use Case Visual (No Text)**  
   - Split into three vertical parts  
   - Left: Before use or common problem  
   - Center: Product only  
   - Right: After use or improved state  
   - Keep design clean, light, and focused

✅ Ensure the final result is versatile for eCommerce platforms, advertising, and social media targeting the Saudi market.`
  },
  {
    name: "Product Description",
    function: "product_description",
    description: "Generate marketing product descriptions in Arabic",
    icon: <FileText className="w-4 h-4" />,
    prompt: `📝 Prompt لإنشاء وصف تسويقي لمنتج:

Product Title: [اسم المنتج]

المطلوب:
أنشئ وصفًا تسويقيًا باللغة العربية موجهًا لعملاء السعودية بأسلوب بسيط وسهل الفهم، يتّبع القالب المعتمد في 90% من المحادثات السابقة. يجب أن يشمل الوصف:

1. عنوان افتتاحي قوي وجذاب يبرز ميزة أو فائدة رئيسية مباشرة (بدون عناوين مثل "جذب الانتباه").
2. جملة تمهيدية قصيرة (Subheadline) تدعم العنوان وتوضح قيمة إضافية.
3. نقطة وسيلة الإعلام: اكتب \`VIDEO OR IMAGE HERE\` للاحتفاظ بمكان الوسائط مهما كان نوعها.
4. قائمة بالمميزات والفوائد (Bullet Points) بصيغة مباشرة ومقنعة، تركز على:
   - ما يميّز المنتج عن المنافسين (Unique Selling Points).
   - كيف يحل مشكلة العميل أو يحسّن حياته اليومية.
   - عناصر تُحفّز العاطفة (راحة، ثقة، شباب، قوة، نتائج ملموسة).
5. فقرة مختصرة عن طريقة الاستخدام أو التطبيق العملي.
6. تفاصيل المنتج التقنية (التكوين، الحجم، المكونات الفعالة، بلد الصنع، مدة الصلاحية) في قائمة بسيطة.
7. دعوة للشراء (Call to Action) مباشرة تُحفّز القارئ على اتخاذ خطوة (شراء الآن، اغتنم العرض المحدود، احصل على خصم اليوم).

التعليمات الخاصة:
- لا تستخدم HTML أو عناوين عامة.
- اجعل اللهجة مألوفة في السوق السعودي.
- حافظ على تنسيق النقاط والفقرات واضحًا.
- ركّز على عناصر الـ FOMO والـ Social Proof عند الاقتضاء.
- قدّم مثالًا واقعيًا (مثل نسبة نجاح أو اختبار مستخدم) إذا توفر.`
  },
  {
    name: "HeyGen AI Emotion",
    function: "heygen_emotion",
    description: "Avatar animation and emotion settings for HeyGen",
    icon: <User className="w-4 h-4" />,
    prompt: `Realism and dynamism
Realistic animations, emotional storytelling
Mouth & Lip Sync  
  • Perfectly synchronized lip movements matching phonemes.  
  • Micro-smiles at sentence ends to convey warmth.  
  • Slight lip parting during pauses ("uh," "hmm") for realism.  
Hands & Arms  
  • Slow, open-palm gestures aligned with explanations
  • One-hand chop gesture to punctuate strong calls to action.  
  • Casual resting of one hand near waist between sentences. 
Head & Torso  
  • Gentle, natural head nods on key phrases (every 2–3 seconds).  
  • Slight, imperceptible head tilts to the left/right when shifting topics.  
  • Subtle lean-in toward camera when conveying important points.  
Eyes & Brows  
  • Regular, rhythmic eye blinks (~1.5–2 sec intervals).  
  • Soft, downward glance when pausing or transitioning.  
  • Quick, deliberate eyebrow raises on surprise or emphasis words ("imagine," "now," "exclusive").`
  },
  {
    name: "Avatar - Women 35",
    function: "avatar_women_35",
    description: "Generate realistic Saudi woman avatar for video",
    icon: <User className="w-4 h-4" />,
    prompt: `Generate a realistic full-body or half-body avatar of a 35-year-old Saudi Arabian woman, standing or sitting naturally, not too close to the camera, suitable for 9:16 vertical format.

She should be wearing traditional Saudi attire like a black abaya and neutral-colored hijab (or niqab), styled modestly and naturally. Her expression should be calm, friendly, or slightly engaged (like she's talking or about to speak). Hands can be relaxed or gesturing gently.

Use a natural indoor background such as a living room, showroom, or modern Saudi interior. Lighting should be natural or soft artificial, with clear but not overly sharp facial features—avoid perfection that gives away AI. No direct eye contact, and avoid camera-focused poses.

The image should be in 9:16 vertical format, not close-up, with space around the face and shoulders to allow for later video movement/voice syncing. Do not add text or filters.`
  },
  {
    name: "Avatar Women + Product",
    function: "avatar_women_product",
    description: "Generate woman avatar holding product",
    icon: <User className="w-4 h-4" />,
    prompt: `Generate a realistic full-body or half-body avatar of a 35-year-old Saudi Arabian woman, dressed in traditional attire (e.g., black abaya with hijab or niqab). She should appear relaxed and natural, not too close to the camera, in a 9:16 vertical format.

She should be holding a product in one or both hands (The product images is an attachment). The product should be clearly visible but not overly posed — the gesture should feel casual, like she's showing or about to explain it.

Use a natural indoor setting, like a living room, dressing table, or bathroom. Lighting should be natural or softly lit. The facial expression should be gentle, friendly, or speaking-like. Do not show exaggerated facial features. Avoid too much symmetry or perfection to prevent AI detection.

Leave enough space around the head and body so the avatar can be animated later without being cropped. No text or branding in the image.`
  },
  {
    name: "Avatar - Men 55",
    function: "avatar_men_55",
    description: "Generate realistic Saudi man avatar for video",
    icon: <User className="w-4 h-4" />,
    prompt: `✅ Ultra-Realistic Avatar Generation Prompt (Saudi Man, 55 Years Old, 9:16 Format)
Generate a hyper-realistic full-body avatar of a 55-year-old Saudi Arabian man, styled and posed in a way that looks indistinguishable from a real human photograph.

👤 Subject Details:
Age: 55 years old

Nationality: Saudi Arabian

Ethnicity: Middle Eastern – Arabian complexion

Facial Features: Natural skin texture, slight wrinkles, mature face structure, facial hair optional

Pose: Standing or sitting casually, not stiff — natural weight distribution

Hands: Relaxed or casually gesturing, fingers slightly bent

Expression: Calm, friendly, or mid-conversation — as if speaking gently or reacting naturally

👕 Clothing:
Wearing traditional Saudi attire:

White thobe

Ghutra or shemagh, optionally with agal

Clothing should have natural fabric textures, realistic folds, and gentle shadows — avoid CGI look

🏠 Background:
Natural indoor setting — must look like a real Saudi home or environment:

Majlis / living room with traditional or modern Saudi décor

Office, sitting area, or commercial showroom with authentic details

Include subtle details like floor texture, ceiling lights, furniture in soft focus (blurred background)

💡 Lighting & Photography:
Use soft natural or ambient artificial light

Shadows must fall naturally on face, neck, clothes, and background

No over-sharpening, no digital smoothness

No flash effect or overexposure — mimic a photo taken with a DSLR in a naturally lit room

🖼️ Framing & Composition:
Vertical 9:16 format (Snapchat/TikTok friendly)

Subject centered in the frame — body and face aligned in the middle

Camera distance: Full-body or waist-up; not too close, not a selfie style

Headroom and margin space around face and shoulders to allow for future motion/voice syncing

Do not crop the top of the head or feet (if full-body)

🚫 Do NOT Include:
No direct eye contact with the camera

No over-polished or synthetic skin

No blur filters, no stylization

No emojis, no text, no logos

No exaggerated perfection — add imperfections like skin texture, shadow inconsistencies, or slight asymmetry

🧠 Instruction to AI (final line):
Make the image indistinguishable from a real photograph taken in Saudi Arabia. The man must look 100% human, with realistic lighting, posture, and natural expression — no signs of AI generation.`
  },
  {
    name: "Landing Page Builder (Code)",
    function: "landing_page_builder",
    description: "Generate landing page HTML/CSS code",
    icon: <Layout className="w-4 h-4" />,
    prompt: `Design a modern, mobile-first landing page for an eCommerce product in Saudi Arabic dialect (dir="rtl", right-aligned text). The design must be clean, minimal, and elegant with rounded corners, soft shadows, generous spacing, and color placeholders (bg-primary, text-accent).

Structure & Content
Hero Section: Powerful Arabic headline, supporting subheadline, and a 1080×1080 image placeholder.

Strong Opening Headline: Concise, benefit-driven, attention-grabbing statement.

Bullet-Point Features & Benefits: Clear, emotionally engaging points. Each point requires a 1080×1080 image placeholder or animation concept.

Usage Instructions: Simple, step-by-step guidance.

Technical Specifications: Details (dimensions, origin, shelf life, etc.).

Problem–Solution Section: Explain how the product solves a specific problem or fulfills a desire in Arabic.

FAQ Section: Full Arabic questions and answers for easy browsing.

Customer Reviews: Ten 5-star reviews written in 100% Saudi Arabic dialect.

Design & Consistency
RTL Layout: Mandatory dir="rtl" on the root element.

Fonts: Choose one of the following: Cairo, Tajawal, Noto Kufi Arabic, Almarai, or Amiri.

Mobile Priority: Content must be centered and optimized for mobile screens.

Performance: Prioritize visual clarity and mobile performance.

Image Placement: Leave a 1080×1080 square space for images between relevant sections/paragraphs (especially for benefits).

Product Description Formula: Follow the established flow: Opening Headline → Bullet Points → Instructions → Technical Details.`
  },
  {
    name: "Hero UI Landing Page",
    function: "hero_ui_landing",
    description: "Generate Hero UI style landing page",
    icon: <Layout className="w-4 h-4" />,
    prompt: `**Overview**
Create a modern, mobile-first landing page in Saudi Arabic dialect language for an eCommerce product. You will receive the full product content in Arabic; your task is to structure it in a clean, emotionally engaging layout that feels natural, modern, and conversion-focused.

---

**Right-to-Left Layout**
The entire page must use an RTL structure. Apply \`dir="rtl"\` on your root element and align all text to the right to ensure proper Arabic flow.

---

**Fonts**
Choose from elegant, Arabic-friendly typefaces that support readability and style:

* Cairo
* Tajawal
* Noto Kufi Arabic
* Almarai
* Amiri

---

**Design Style**
Your design should be clean, minimal, and elegant. Use:

* Rounded corners and soft shadows for a modern look
* Generous padding and vertical spacing to improve readability
* Placeholder classes for colors (e.g., \`bg-primary\`, \`text-accent\`) so the final palette can be applied later

---

**Sections to Include**
Structure the page with the following components, filling in the Arabic content provided:

1. **Hero Section**
   A powerful Arabic headline, a supporting subheadline, and an image placeholder.

2. **Strong Opening Headline**
   A concise, benefit-driven statement that immediately grabs attention.

3. **Bullet-Point Features & Benefits**
   Clear, emotionally engaging points that highlight what makes the product irresistible.

4. **Usage Instructions**
   Simple, step-by-step guidance for how to use the product.

5. **Technical Specifications**
   Details such as dimensions, origin, and shelf life.

6. **Problem–Solution Section**
   Explain in Arabic how the product solves a specific problem or fulfills a desire.

7. **FAQ Section**
   Full Arabic questions and answers presented in a layout for easy browsing.


8. add Ten reviews of product with 5 stars 100% saudi arabia dialect language
---

**Proven Product Description Structure**
Follow this established formula for every product description:

1. **Strong Opening Headline**
2. **Bullet Points** – features and benefits
3. **Usage Instructions** – step-by-step as needed
4. **Technical Details** – origin, volume, usage, shelf life

---

**Final Notes**
ensure consistency and leverage built-in responsiveness. Prioritize visual clarity, mobile performance, and Arabic RTL alignment to drive conversions.

Generate the code for my design with no scrolling.

The <iframe> must have scrolling="no" and no visible scrollbars.

Wrap it in a container with overflow: hidden; so nothing can slide.

Make it responsive`
  },
  {
    name: "Brand Creation",
    function: "brand_creation",
    description: "Create complete brand document from product info",
    icon: <Sparkles className="w-4 h-4" />,
    prompt: `You are a **Brand Creator Expert**. Your job is to take the product information I provide and build out a complete brand document following this structure:

1. **Product Overview**  
   - Product Name:  
   - Tagline/Slogan (Optional):  
   - Category/Market:  
   - Brief Description:  
   - Release Date/Availability:  
   - Current Status:  

2. **Problem & Solution (Value Proposition)**  
   - Problem Your Product Solves:  
   - Your Product's Solution:  
   - Unique Selling Proposition (USP):  

3. **Key Features & Functionality**  
   - Feature 1:  
     - Benefit(s):  
     - Description:  
   - Feature 2:  
     - Benefit(s):  
     - Description:  
   - Feature 3:  
     - Benefit(s):  
     - Description:  
   - (Add more features as needed)  
   - Technical Specifications (if applicable):  

4. **Target Audience**  
   - Primary Audience:  
   - Secondary Audience (Optional):  
   - User Persona(s) (Optional):  

5. **Pricing & Packaging**  
   - Price:  
   - Pricing Model:  
   - Available Packages/Tiers:  
   - What's Included:  
   - Warranty/Guarantee (if applicable):  

6. **Marketing & Sales Information**  
   - Key Messaging/Talking Points:  
   - Call to Action (CTA):  
   - Distribution Channels:  
   - Marketing Channels:  
   - Sales Collateral (Optional):  

7. **Support & Resources**  
   - Customer Support Options:  
   - Documentation:  
   - Community/Forum (Optional):  
   - Known Issues/Limitations (Internal Use):  

8. **Vision & Future (Optional)**  
   - Future Enhancements/Roadmap:  
   - Long-term Vision for the Product:  

9. **Contact Information**  
   - Product Manager/Lead:  
   - Marketing Contact:  
   - General Inquiries:  

Also, **in your process** follow the Double Diamond framework from the example video:  
- **Discover:** research & customer insights  
- **Define:** synthesize & clarify vision  
- **Develop:** create mood boards, key visuals, voice & tone  
- **Deliver:** finalize identity guidelines and rollout plan`
  },
  {
    name: "Sora Video Creation",
    function: "sora_video",
    description: "Create product video using Sora AI",
    icon: <Video className="w-4 h-4" />,
    prompt: `Create a high-quality 9:16 TikTok-style product video showing a [cream product name] designed for [target skin concern or benefit, e.g., wrinkle removal, joint pain relief, skin whitening, etc.].

Visual style should match the product's nature and market:

Use scenes that visually represent the product's effects or ingredients (e.g., healthy glowing skin, soothing sensation, natural botanicals, or clinical skincare setting).

Include close-ups of the product texture (creamy, smooth, gel-like), packaging, and gentle application to skin (face, body, joints, etc.).

Show models who represent the ideal user (based on product description), such as [women aged 30–50, Saudi hijabi women, mature men, etc.].

The setting should align with the product (e.g., bathroom vanity, spa, clinic, home skincare routine).

No voiceover or on-screen text.
Focus entirely on visual storytelling that highlights the transformation, usage process, and emotional impact of the product.

Keep the video under 30 seconds. Lighting should be soft and flattering. Emphasize realism and authenticity over perfection.`
  },
  {
    name: "Product Title Generator",
    function: "product_title",
    description: "Generate compelling product titles",
    icon: <Pencil className="w-4 h-4" />,
    prompt: `Write one single product title that is emotionally compelling and makes the reader want to buy the product immediately. The title should combine:

Value: What the product does (clear benefit or feature)

Results: What happens when the customer uses it (visible change, improvement, or transformation)

Emotion: How the user feels after using it (confidence, happiness, empowerment, etc.)

Guidelines:

Must be one complete, powerful sentence.

Do not use emojis.

No exclamation marks unless absolutely necessary.

Use simple, clear, emotionally charged words that match the target customer.

It should feel like a promise of transformation, not just a product name.`
  },
  {
    name: "HeyGen Agent",
    function: "heygen_agent",
    description: "Create UGC-style video ads with HeyGen avatars",
    icon: <Video className="w-4 h-4" />,
    prompt: `You are a professional UGC video ad creator specialized in eCommerce and COD (Cash-on-Delivery) businesses in Saudi Arabia.
You create Snapchat/TikTok-style short ads that feel authentic, emotional, and use spoken Saudi Arabic dialect.

🎯 Inputs I Will Provide

Product photos and short clips

Avatar images/video

Pre-written scripts (in Arabic or English)

Your Task

Select or adapt one of the provided scripts into a 20–30 second spoken Saudi Arabic voiceover.

Build a natural UGC-style ad video using the uploaded visuals + avatar.

Ensure the final video feels like a real Saudi customer's testimonial/recommendation.

🧱 Structure for Each Ad

Hook (First 3 Seconds)

Use emotional pain, frustration, curiosity, FOMO, or seasonal context.

Example: "صدقيني، أنا كنت مثلك…" ("Trust me, I was just like you…")

Main Message

Present the problem → solution → emotional benefits.

Emphasize quick results, ease of use, and trust.

Include light social proof ("شفت كثير يستخدمونه", "حتى أختي لاحظت الفرق").

Call to Action (Last 5–7 Seconds)

Rotate COD-friendly CTAs:

"Order now, free delivery."

"Pay on delivery, cash or card."

"Easy return & exchange if it doesn't suit you."

📌 Style Guidelines

Spoken Saudi dialect, not Modern Standard Arabic.

Tone: Friendly, emotional, conversational.

Performance (Heygen Avatar):

Micro-smiles, natural pauses, hand gestures, slight head tilts, soft blinks.

Subtle lean-in on important phrases.

Cultural fit: Saudi attire (abaya, hijab, thobe, ghutra) and realistic home settings.

Authentic UGC look: must feel like a personal phone-recorded review.

No heavy editing, filters, or unrealistic visuals.

🔁 Output Requirements
Generate 3–5 ad variations per product, each with:

Final Saudi Arabic script (20–30s, natural flow).

Simple shot plan (5–7 clips: product, avatar, lifestyle, packaging).

Cover text (3–5 Arabic words, bold & curiosity-driven).

Final video output in 9:16 format.`
  },
  {
    name: "Product Animation",
    function: "product_animation",
    description: "Create premium product animation videos",
    icon: <Video className="w-4 h-4" />,
    prompt: `Create a high-quality product animation video using the provided product photo.
The video should be aesthetic, premium, and visually clean, using smooth camera motion, macro close-ups, soft studio lighting, and realistic textures.

PRODUCT DETAILS:
- Product: [اسم المنتج]
- Main function: [ماذا يفعل المنتج]
- Usage: [كيف يُستخدم المنتج]
- Target audience: Saudi market

VIDEO STYLE:
- Premium studio look
- Elegant slow motion + cinematic lighting
- White, beige, or luxury dark background depending on product feel
- Soft shadows + high dynamic range

SHOT PLAN:
1. **Hero Shot**
   - Start with a close-up macro shot of the product rotating slowly.
   - Add soft rim light to highlight edges and packaging details.

2. **Functional Shot**
   - Show a realistic animation demonstrating what the product does.
   - Example:
     - If cream → show texture spreading smoothly على البشرة، لقطة واقعية.
     - If spray → show mist spray particles in slow motion.
     - If supplement → particles dissolving أو الانتقال داخل الجسم بطريقة إبداعية.
     - If device → show the technology effect as subtle glowing lines.

3. **Benefit Animation**
   - Visualize the product benefit clearly:
     - Hydration → water molecules absorbing into the skin.
     - Pain relief → red pain area turning calm blue.
     - Whitening → dark spot fading into smooth even tone.
     - Cleaning → dirt/pollution being removed.

4. **Usage Demonstration**
   - A short animation showing how to apply or use the product.

5. **Final Hero Ending**
   - Product centered, clean background, elegant glow.
   - Add short text overlay:
     - "[أفضل حل لـ …]"
     - "صيغة فاخرة"
     - "نتائج سريعة"

NOTES:
- Keep video between 6–12 seconds.
- No humans unless necessary — only hands if needed.
- Keep the product visually identical to the provided photo.`
  }
];

export default function StudioPrompts() {
  const [prompts, setPrompts] = useState<StudioPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const savedPrompts = (settings?.preferences as Record<string, any>)?.studio_prompts || {};

      // Merge default prompts with saved prompts
      const mergedPrompts = DEFAULT_PROMPTS.map((defaultPrompt, index) => ({
        ...defaultPrompt,
        id: `prompt_${index}`,
        prompt: savedPrompts[defaultPrompt.function] || defaultPrompt.prompt,
      }));

      setPrompts(mergedPrompts);
      
      // Initialize edited prompts
      const initialEdits: Record<string, string> = {};
      mergedPrompts.forEach(p => {
        initialEdits[p.function] = p.prompt;
      });
      setEditedPrompts(initialEdits);
    } catch (error) {
      console.error("Error loading prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const savePrompts = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current preferences
      const { data: settings } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentPrefs = (settings?.preferences as Record<string, any>) || {};
      
      // Update with studio prompts
      const updatedPrefs = {
        ...currentPrefs,
        studio_prompts: editedPrompts,
      };

      const { error } = await supabase
        .from("user_settings")
        .update({ preferences: updatedPrefs })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setPrompts(prev => prev.map(p => ({
        ...p,
        prompt: editedPrompts[p.function] || p.prompt,
      })));

      toast.success("Prompts saved successfully");
    } catch (error) {
      console.error("Error saving prompts:", error);
      toast.error("Failed to save prompts");
    } finally {
      setSaving(false);
    }
  };

  const togglePrompt = (id: string) => {
    setExpandedPrompts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updatePrompt = (functionName: string, value: string) => {
    setEditedPrompts(prev => ({ ...prev, [functionName]: value }));
  };

  const resetPrompt = (functionName: string) => {
    const defaultPrompt = DEFAULT_PROMPTS.find(p => p.function === functionName);
    if (defaultPrompt) {
      setEditedPrompts(prev => ({ ...prev, [functionName]: defaultPrompt.prompt }));
      toast.success("Prompt reset to default");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Studio Prompts
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize the AI prompts used in each Studio step. Each prompt is linked to a specific function.
            </CardDescription>
          </div>
          <Button onClick={savePrompts} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save All Prompts
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.map((prompt) => (
          <Collapsible key={prompt.id} open={expandedPrompts[prompt.id]}>
            <CollapsibleTrigger 
              className="w-full"
              onClick={() => togglePrompt(prompt.id)}
            >
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    {prompt.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">{prompt.name}</p>
                    <p className="text-xs text-muted-foreground">{prompt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {prompt.function}
                  </Badge>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedPrompts[prompt.id] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 border border-t-0 border-border rounded-b-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    Function: <code className="bg-muted px-1 py-0.5 rounded text-xs">{prompt.function}</code>
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => resetPrompt(prompt.function)}
                  >
                    Reset to Default
                  </Button>
                </div>
                <Textarea
                  value={editedPrompts[prompt.function] || ""}
                  onChange={(e) => updatePrompt(prompt.function, e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter your custom prompt..."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
