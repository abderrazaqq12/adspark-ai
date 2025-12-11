// AI Video Models Data from Roadmap

export interface AIVideoModel {
  id: string;
  name: string;
  category: "video" | "avatar" | "voice" | "editing";
  bestFor: string[];
  strengths: string[];
  weaknesses: string[];
  pricing: string;
  outputQuality: string;
  speed: string;
  commercialRights: boolean;
  apiAvailable: boolean;
  lipSyncQuality?: string;
  avatarRealism?: string;
}

export interface SceneTypeRouting {
  sceneType: string;
  sceneTypeAr: string;
  recommendedModel: string;
  reason: string;
  alternativeModel?: string;
}

// Main Video Generation Models
export const videoModels: AIVideoModel[] = [
  {
    id: "sora",
    name: "OpenAI Sora",
    category: "video",
    bestFor: ["Cinematic storytelling", "Multi-scene sequences", "Natural motion"],
    strengths: ["High physics accuracy", "Character consistency", "Complex scenes"],
    weaknesses: ["Limited availability (waitlist)", "High cost"],
    pricing: "$200/month (Pro)",
    outputQuality: "1080p, 20 seconds",
    speed: "3-8 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "veo",
    name: "Google Veo 3.1",
    category: "video",
    bestFor: ["Cinematic ads", "Luxury product shots", "High-quality B-roll"],
    strengths: ["Smooth motion", "Professional realism", "Lighting control"],
    weaknesses: ["Limited access", "Unclear pricing"],
    pricing: "Under evaluation",
    outputQuality: "1080p",
    speed: "4-10 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "kieai-veo3",
    name: "Veo 3.1 (via Kie.ai)",
    category: "video",
    bestFor: ["Cinematic ads", "Text-to-video", "Image-to-video"],
    strengths: ["Affordable pricing", "99.9% uptime", "HD 1080p support", "Callbacks"],
    weaknesses: ["Point-based credits"],
    pricing: "Pay-per-use credits",
    outputQuality: "1080p HD",
    speed: "2-5 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "kieai-runway",
    name: "Runway Gen-3 (via Kie.ai)",
    category: "video",
    bestFor: ["Fashion/Lifestyle", "Style transfer", "Video-to-video"],
    strengths: ["Affordable pricing", "Stable API", "Aleph model support"],
    weaknesses: ["Point-based credits"],
    pricing: "Pay-per-use credits",
    outputQuality: "Up to 4K",
    speed: "2-4 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "kieai-luma",
    name: "Luma Dream Machine (via Kie.ai)",
    category: "video",
    bestFor: ["Cinematic scenes", "Smooth transitions", "B-roll"],
    strengths: ["Affordable pricing", "Fast generation", "Easy integration"],
    weaknesses: ["Point-based credits"],
    pricing: "Pay-per-use credits",
    outputQuality: "1080p",
    speed: "1-2 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "runway",
    name: "Runway Gen-3 Alpha",
    category: "video",
    bestFor: ["Fashion/Lifestyle", "Precise movements", "Professional content"],
    strengths: ["Precise camera control", "High quality", "Easy to use"],
    weaknesses: ["Medium speed", "High cost"],
    pricing: "$15-20/month",
    outputQuality: "Up to 4K, 10 seconds",
    speed: "2-4 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "pika",
    name: "Pika 2.1 Turbo",
    category: "video",
    bestFor: ["Fast social content", "Quick iterations", "Short clips"],
    strengths: ["Ultra fast", "Easy to use", "Mobile app"],
    weaknesses: ["Lower quality than competitors", "Limited style"],
    pricing: "$10/month",
    outputQuality: "1080p, 10-16 seconds",
    speed: "30-90 seconds",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "kling",
    name: "Kling AI",
    category: "video",
    bestFor: ["Advanced motion", "Realistic physics", "Action shots"],
    strengths: ["Realistic physics simulation", "Smooth motion"],
    weaknesses: ["May require complex prompt structure"],
    pricing: "Variable",
    outputQuality: "1080p",
    speed: "2-3 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "luma",
    name: "Luma Dream Machine 2",
    category: "video",
    bestFor: ["Cinematic scenes", "Smooth transitions", "Natural motion"],
    strengths: ["Easy UI", "Low price", "Fast results"],
    weaknesses: ["Limited video duration (5 seconds)", "Less control"],
    pricing: "$0.20 per 5 seconds",
    outputQuality: "1080p, cinematic",
    speed: "2 minutes",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "haiper",
    name: "HaiperAI",
    category: "video",
    bestFor: ["Dynamic short clips", "Fast-evolving content"],
    strengths: ["Very high speed", "Easy to use"],
    weaknesses: ["Medium quality"],
    pricing: "Subscription available",
    outputQuality: "1080p",
    speed: "Very fast",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "stability",
    name: "Stability Video Diffusion",
    category: "video",
    bestFor: ["Basic B-roll", "Experimental content"],
    strengths: ["Open source", "High customization"],
    weaknesses: ["Lower quality", "Limited documentation"],
    pricing: "Free/Open source",
    outputQuality: "576p",
    speed: "Slow",
    commercialRights: true,
    apiAvailable: true,
  },
];

// Avatar & UGC Tools
export const avatarModels: AIVideoModel[] = [
  {
    id: "heygen",
    name: "HeyGen",
    category: "avatar",
    bestFor: ["Text-to-avatar videos", "UGC content"],
    strengths: ["Low price", "500+ avatars", "Voice cloning"],
    weaknesses: ["No local storage on free plan"],
    pricing: "$24-39/month",
    outputQuality: "High",
    speed: "5-10 minutes",
    commercialRights: true,
    apiAvailable: true,
    lipSyncQuality: "95%",
    avatarRealism: "90%",
  },
  {
    id: "synthesia",
    name: "Synthesia",
    category: "avatar",
    bestFor: ["Corporate content", "Training videos"],
    strengths: ["140+ languages", "High security", "Realism"],
    weaknesses: ["Very expensive for high volume"],
    pricing: "$18-90+/month",
    outputQuality: "Professional",
    speed: "5-15 minutes",
    commercialRights: true,
    apiAvailable: true,
    lipSyncQuality: "98%",
    avatarRealism: "95%",
  },
  {
    id: "d-id",
    name: "D-ID",
    category: "avatar",
    bestFor: ["Live portraits", "Dynamic transformation"],
    strengths: ["Transform any image", "Natural movements"],
    weaknesses: ["Less stable with some voices"],
    pricing: "$5.99-99/month",
    outputQuality: "Good",
    speed: "Fast",
    commercialRights: true,
    apiAvailable: true,
    lipSyncQuality: "85%",
    avatarRealism: "80%",
  },
  {
    id: "opus",
    name: "Opus UGC",
    category: "avatar",
    bestFor: ["Original UGC marketing content"],
    strengths: ["Mimics real UGC", "Reasonable price"],
    weaknesses: ["May not be fully realistic"],
    pricing: "$35-200/month",
    outputQuality: "Good",
    speed: "Medium",
    commercialRights: true,
    apiAvailable: true,
    lipSyncQuality: "87%",
    avatarRealism: "82%",
  },
];

// Voice Generation Tools
export const voiceModels: AIVideoModel[] = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "voice",
    bestFor: ["Professional voice generation", "Arabic voices", "Voice cloning"],
    strengths: ["Very natural voice", "32 languages", "Cloning capability"],
    weaknesses: ["May not support all Arabic dialects perfectly"],
    pricing: "$5-99+/month",
    outputQuality: "Ultra high",
    speed: "Fast",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "playht",
    name: "PlayHT",
    category: "voice",
    bestFor: ["High-definition voices"],
    strengths: ["Very realistic voice", "800+ voices"],
    weaknesses: ["Very expensive"],
    pricing: "$39-374+/year",
    outputQuality: "Very high",
    speed: "Medium",
    commercialRights: true,
    apiAvailable: true,
  },
];

// Editing Tools
export const editingModels: AIVideoModel[] = [
  {
    id: "descript",
    name: "Descript",
    category: "editing",
    bestFor: ["Text-based video editing"],
    strengths: ["Edit text = edit video", "Filler word removal"],
    weaknesses: ["May be complex for beginners"],
    pricing: "$12-24/month",
    outputQuality: "High",
    speed: "Fast",
    commercialRights: true,
    apiAvailable: false,
  },
  {
    id: "kapwing",
    name: "Kapwing AI",
    category: "editing",
    bestFor: ["Text-to-video generation", "B-roll"],
    strengths: ["Easy integration", "Multiple tools"],
    weaknesses: ["May need manual improvements"],
    pricing: "Free + $60+/month",
    outputQuality: "Good",
    speed: "Fast",
    commercialRights: true,
    apiAvailable: true,
  },
  {
    id: "veed",
    name: "VEED.IO",
    category: "editing",
    bestFor: ["Online video editing", "Subtitles"],
    strengths: ["Easy editing", "Instant translation"],
    weaknesses: ["Limited features in free version"],
    pricing: "Free + $20+/month",
    outputQuality: "Good",
    speed: "Fast",
    commercialRights: true,
    apiAvailable: true,
  },
];

// Scene Type to Model Routing
export const sceneRouting: SceneTypeRouting[] = [
  {
    sceneType: "talking_head",
    sceneTypeAr: "Talking Head Avatar",
    recommendedModel: "HeyGen",
    reason: "High-quality lip-sync, 500+ avatars",
    alternativeModel: "Synthesia",
  },
  {
    sceneType: "product_closeup",
    sceneTypeAr: "Product Close-Up (Beauty)",
    recommendedModel: "Google Veo 3.1",
    reason: "Professional lighting, fine details",
    alternativeModel: "Runway Gen-3",
  },
  {
    sceneType: "gadget_demo",
    sceneTypeAr: "Gadget Demo (Motion)",
    recommendedModel: "Pika 2.1",
    reason: "Clear motion, high speed for A/B testing",
    alternativeModel: "Kling AI",
  },
  {
    sceneType: "unboxing",
    sceneTypeAr: "Unboxing Sequence",
    recommendedModel: "Runway Gen-3",
    reason: "Precise motion control",
    alternativeModel: "Luma Dream Machine",
  },
  {
    sceneType: "cinematic",
    sceneTypeAr: "Lifestyle Cinematic",
    recommendedModel: "Sora",
    reason: "Cinematic quality, physics accuracy",
    alternativeModel: "Veo 3.1",
  },
  {
    sceneType: "broll",
    sceneTypeAr: "B-roll Smooth",
    recommendedModel: "Luma Dream Machine 2",
    reason: "Smooth transitions, easy to use",
    alternativeModel: "Kie.ai Luma",
  },
  {
    sceneType: "fast_social",
    sceneTypeAr: "Fast Social Clip",
    recommendedModel: "Pika 2.1",
    reason: "Ultra fast, good quality",
    alternativeModel: "HaiperAI",
  },
  {
    sceneType: "complex_physics",
    sceneTypeAr: "Complex Physics",
    recommendedModel: "Kling AI",
    reason: "Realistic physics simulation",
    alternativeModel: "Sora",
  },
  {
    sceneType: "kieai_affordable",
    sceneTypeAr: "Affordable Premium Quality",
    recommendedModel: "Kie.ai Veo 3.1",
    reason: "Professional quality at lower cost via Kie.ai",
    alternativeModel: "Kie.ai Runway",
  },
  {
    sceneType: "testimonial",
    sceneTypeAr: "Testimonial (Natural)",
    recommendedModel: "HeyGen",
    reason: "Natural movements, stability",
    alternativeModel: "Opus UGC",
  },
  {
    sceneType: "fashion",
    sceneTypeAr: "Fashion Motion",
    recommendedModel: "Runway Gen-3",
    reason: "Precise movements, professional quality",
    alternativeModel: "Veo 3.1",
  },
];

// Video types for routing - Full list
export const videoTypes = [
  // UGC & Social Proof
  { id: "ugc_review", name: "User-Generated Content (UGC) Review", category: "UGC & Social Proof" },
  { id: "before_after", name: "Before & After", category: "UGC & Social Proof" },
  { id: "testimonial", name: "Testimonial/Interview", category: "UGC & Social Proof" },
  { id: "unboxing", name: "Unboxing Video", category: "UGC & Social Proof" },
  { id: "social_proof", name: "Social Proof/Quote Montage", category: "UGC & Social Proof" },
  { id: "day_in_life", name: "Day in the Life Integration", category: "UGC & Social Proof" },
  // Product Focused & Educational
  { id: "pas", name: "Problem/Agitate/Solve (PAS)", category: "Product & Educational" },
  { id: "product_demo", name: "Product Demonstration", category: "Product & Educational" },
  { id: "explainer", name: "Explainer Video (Animated or Live)", category: "Product & Educational" },
  { id: "listicle", name: "3 Reasons Why / Listicle Ad", category: "Product & Educational" },
  { id: "comparison", name: "Comparison/VS Ad", category: "Product & Educational" },
  { id: "stop_motion", name: "Stop-Motion/Flat Lay", category: "Product & Educational" },
  { id: "behind_scenes", name: "Behind-the-Scenes/How It's Made", category: "Product & Educational" },
  // Creative & Engagement Hooks
  { id: "trendjacking", name: "Trendjacking/Sound-Based Ad", category: "Creative & Engagement" },
  { id: "pov", name: "POV (Point of View) Ad", category: "Creative & Engagement" },
  { id: "skit", name: "Skit/Roleplay Ad", category: "Creative & Engagement" },
  { id: "interactive", name: "Interactive Video Ad", category: "Creative & Engagement" },
  { id: "mascot", name: "Hyper-Casual Animation/Mascot Ad", category: "Creative & Engagement" },
  { id: "cinematic", name: "Cinematic/High Production Value Ad", category: "Creative & Engagement" },
  { id: "question_hook", name: "Question Hook Ad", category: "Creative & Engagement" },
  { id: "influencer", name: "Influencer Collaboration", category: "Creative & Engagement" },
];

// Export formats
export const exportFormats = [
  { id: "9:16", name: "9:16 (TikTok/Reels)", width: 1080, height: 1920 },
  { id: "1:1", name: "1:1 (Instagram Square)", width: 1080, height: 1080 },
  { id: "16:9", name: "16:9 (YouTube)", width: 1920, height: 1080 },
];

// Cost tiers
export const costTiers = {
  starter: {
    name: "Starter",
    monthlyBudget: "$30-60",
    tools: ["HeyGen", "ElevenLabs", "Kapwing"],
    videosPerMonth: "15-25",
    costPerVideo: "$8-13",
  },
  professional: {
    name: "Professional",
    monthlyBudget: "$150-250",
    tools: ["Sora", "Veo 3.1", "Runway Gen-3", "ElevenLabs"],
    videosPerMonth: "50+",
    costPerVideo: "$3-5",
  },
  enterprise: {
    name: "Enterprise (Automated)",
    monthlyBudget: "$50-100",
    tools: ["n8n", "HeyGen API", "ElevenLabs API", "Kapwing API"],
    videosPerMonth: "300+",
    costPerVideo: "$0.15-0.30",
  },
};
