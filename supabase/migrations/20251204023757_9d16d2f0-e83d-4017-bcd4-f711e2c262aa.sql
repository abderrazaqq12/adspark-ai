-- Insert all AI engines with proper categorization
-- First, delete existing engines to replace with comprehensive list
DELETE FROM public.ai_engines;

-- Text-to-Video Engines
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('Runway Gen-3', 'text_to_video', 'High-quality cinematic video generation with advanced motion control', 'pay_per_use', false, 16, ARRAY['16:9', '9:16', '1:1'], 'https://api.runwayml.com', 'RUNWAY_API_KEY', 95, 'active', '{"specialty": "cinematic", "quality": "ultra"}'),
('Pika Labs', 'text_to_video', 'Creative and animated video generation with artistic styles', 'free_tier', true, 4, ARRAY['16:9', '9:16', '1:1'], 'https://api.pika.art', 'PIKA_API_KEY', 85, 'active', '{"specialty": "animated", "quality": "high"}'),
('Hailuo AI', 'text_to_video', 'Fast video generation with realistic motion and expressions', 'free_tier', true, 5, ARRAY['16:9', '9:16', '1:1'], 'https://api.hailuoai.video', 'HAILUO_API_KEY', 80, 'active', '{"specialty": "realistic_motion", "quality": "high"}'),
('Kling AI', 'text_to_video', 'High-quality AI video with long duration support up to 2 minutes', 'pay_per_use', false, 120, ARRAY['16:9', '9:16', '1:1'], 'https://api.klingai.com', 'KLING_API_KEY', 90, 'active', '{"specialty": "long_form", "quality": "ultra"}'),
('Vidu', 'text_to_video', 'Text-to-video with character consistency and story continuity', 'pay_per_use', false, 8, ARRAY['16:9', '9:16', '1:1'], 'https://api.vidu.com', 'VIDU_API_KEY', 75, 'active', '{"specialty": "character_consistency", "quality": "high"}'),
('LTX Studio', 'text_to_video', 'AI filmmaking platform for professional video creation', 'pay_per_use', false, 30, ARRAY['16:9', '9:16', '1:1', '4:3'], 'https://api.ltx.studio', 'LTX_API_KEY', 85, 'active', '{"specialty": "filmmaking", "quality": "ultra"}'),
('Wan Video', 'text_to_video', 'Fast and efficient text-to-video generation', 'free_tier', true, 5, ARRAY['16:9', '9:16', '1:1'], 'https://api.wan.video', 'WAN_API_KEY', 70, 'active', '{"specialty": "fast_generation", "quality": "medium"}'),
('SkyReels', 'text_to_video', 'Cinematic video generation with dramatic effects', 'pay_per_use', false, 10, ARRAY['16:9', '9:16', '1:1'], 'https://api.skyreels.ai', 'SKYREELS_API_KEY', 75, 'active', '{"specialty": "cinematic", "quality": "high"}'),
('Seedance', 'text_to_video', 'Dance and motion-focused video generation', 'pay_per_use', false, 15, ARRAY['16:9', '9:16', '1:1'], 'https://api.seedance.net', 'SEEDANCE_API_KEY', 70, 'active', '{"specialty": "dance_motion", "quality": "high"}'),
('Higgsfield', 'text_to_video', 'Personalized AI video creation with face animation', 'pay_per_use', false, 10, ARRAY['16:9', '9:16', '1:1'], 'https://api.higgsfield.ai', 'HIGGSFIELD_API_KEY', 75, 'active', '{"specialty": "personalized", "quality": "high"}');

-- Avatar & UGC Engines
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('HeyGen', 'avatar', 'Professional AI avatar video generation with lip sync', 'pay_per_use', false, 300, ARRAY['16:9', '9:16', '1:1'], 'https://api.heygen.com', 'HEYGEN_API_KEY', 95, 'active', '{"specialty": "professional_avatar", "quality": "ultra"}'),
('Elai.io', 'avatar', 'AI avatar video creation from text scripts', 'pay_per_use', false, 300, ARRAY['16:9', '9:16', '1:1'], 'https://apis.elai.io', 'ELAI_API_KEY', 85, 'active', '{"specialty": "text_to_avatar", "quality": "high"}'),
('Arcads', 'avatar', 'UGC-style ad video generation with AI actors', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.arcads.ai', 'ARCADS_API_KEY', 90, 'active', '{"specialty": "ugc_ads", "quality": "ultra"}'),
('Creatify', 'avatar', 'AI-powered ad creative generation with avatars', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.creatify.ai', 'CREATIFY_API_KEY', 88, 'active', '{"specialty": "ad_creative", "quality": "high"}'),
('Jogg AI', 'avatar', 'AI avatar marketing video generation', 'pay_per_use', false, 120, ARRAY['16:9', '9:16', '1:1'], 'https://api.jogg.ai', 'JOGG_API_KEY', 80, 'active', '{"specialty": "marketing_avatar", "quality": "high"}'),
('TwinAds', 'avatar', 'AI digital twin avatar for advertising', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.twinads.app', 'TWINADS_API_KEY', 75, 'active', '{"specialty": "digital_twin", "quality": "high"}'),
('Vidnoz', 'avatar', 'AI avatar video maker with templates', 'free_tier', true, 180, ARRAY['16:9', '9:16', '1:1'], 'https://api.vidnoz.com', 'VIDNOZ_API_KEY', 70, 'active', '{"specialty": "template_avatar", "quality": "medium"}'),
('CelebifyAI', 'avatar', 'Celebrity-style avatar video creation', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.celebifyai.com', 'CELEBIFY_API_KEY', 65, 'active', '{"specialty": "celebrity_style", "quality": "high"}'),
('OmniHuman', 'avatar', 'Ultra-realistic human avatar generation', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.omnihuman1.org', 'OMNIHUMAN_API_KEY', 85, 'active', '{"specialty": "realistic_human", "quality": "ultra"}'),
('Hedra', 'avatar', 'AI character and portrait video generation', 'pay_per_use', false, 30, ARRAY['16:9', '9:16', '1:1'], 'https://api.hedra.com', 'HEDRA_API_KEY', 80, 'active', '{"specialty": "character_portrait", "quality": "high"}');

-- Image-to-Video Engines
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('Leonardo AI', 'image_to_video', 'Image generation and animation with motion', 'free_tier', true, 4, ARRAY['16:9', '9:16', '1:1'], 'https://cloud.leonardo.ai', 'LEONARDO_API_KEY', 85, 'active', '{"specialty": "image_animation", "quality": "high"}'),
('Fal AI', 'image_to_video', 'Fast image-to-video with multiple models', 'pay_per_use', false, 5, ARRAY['16:9', '9:16', '1:1'], 'https://api.fal.ai', 'FAL_API_KEY', 80, 'active', '{"specialty": "fast_i2v", "quality": "high"}'),
('Flux AI', 'image_to_video', 'Image-to-video transformation with effects', 'pay_per_use', false, 5, ARRAY['16:9', '9:16', '1:1'], 'https://api.flux-ai.io', 'FLUX_API_KEY', 75, 'active', '{"specialty": "transformation", "quality": "high"}'),
('Flora Fauna', 'image_to_video', 'Product image animation and lifestyle videos', 'pay_per_use', false, 10, ARRAY['16:9', '9:16', '1:1'], 'https://api.florafauna.ai', 'FLORAFAUNA_API_KEY', 80, 'active', '{"specialty": "product_animation", "quality": "high"}'),
('NanoBanana', 'image_to_video', 'Gemini-powered image-to-video generation', 'free', true, 5, ARRAY['16:9', '9:16', '1:1'], NULL, NULL, 90, 'active', '{"specialty": "gemini_powered", "quality": "high"}');

-- Template & Editing Engines
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('Pictory', 'template_based', 'Script to video with professional templates', 'subscription', false, 600, ARRAY['16:9', '9:16', '1:1'], 'https://api.pictory.ai', 'PICTORY_API_KEY', 85, 'active', '{"specialty": "script_to_video", "quality": "high"}'),
('Quso AI', 'template_based', 'Social media video automation with AI', 'subscription', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.quso.ai', 'QUSO_API_KEY', 75, 'active', '{"specialty": "social_media", "quality": "medium"}'),
('TopView', 'template_based', 'AI video ads generation from URLs', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.topview.ai', 'TOPVIEW_API_KEY', 80, 'active', '{"specialty": "url_to_video", "quality": "high"}'),
('FlexClip', 'template_based', 'Template-based video editor with AI', 'subscription', true, 600, ARRAY['16:9', '9:16', '1:1'], 'https://api.flexclip.com', 'FLEXCLIP_API_KEY', 70, 'active', '{"specialty": "template_editor", "quality": "medium"}'),
('Fliki', 'template_based', 'Text to video with AI voiceover', 'subscription', true, 300, ARRAY['16:9', '9:16', '1:1'], 'https://api.fliki.ai', 'FLIKI_API_KEY', 80, 'active', '{"specialty": "text_voiceover", "quality": "high"}'),
('InVideo', 'template_based', 'AI video creation platform with templates', 'subscription', true, 900, ARRAY['16:9', '9:16', '1:1'], 'https://api.invideo.io', 'INVIDEO_API_KEY', 85, 'active', '{"specialty": "full_platform", "quality": "high"}'),
('Creatomate', 'template_based', 'Video automation API for developers', 'pay_per_use', false, 300, ARRAY['16:9', '9:16', '1:1', '4:5'], 'https://api.creatomate.com', 'CREATOMATE_API_KEY', 90, 'active', '{"specialty": "api_automation", "quality": "high"}'),
('JSON2Video', 'template_based', 'Programmatic video generation via JSON', 'pay_per_use', false, 300, ARRAY['16:9', '9:16', '1:1'], 'https://api.json2video.com', 'JSON2VIDEO_API_KEY', 85, 'active', '{"specialty": "programmatic", "quality": "high"}'),
('Shotstack', 'template_based', 'Cloud video editing API', 'pay_per_use', true, 300, ARRAY['16:9', '9:16', '1:1'], 'https://api.shotstack.io', 'SHOTSTACK_API_KEY', 88, 'active', '{"specialty": "cloud_editing", "quality": "high"}'),
('Wisecut', 'template_based', 'AI video editing automation', 'subscription', true, 600, ARRAY['16:9', '9:16', '1:1'], 'https://api.wisecut.ai', 'WISECUT_API_KEY', 75, 'active', '{"specialty": "auto_editing", "quality": "medium"}'),
('Zebracat', 'template_based', 'AI marketing video creator', 'subscription', true, 120, ARRAY['16:9', '9:16', '1:1'], 'https://api.zebracat.ai', 'ZEBRACAT_API_KEY', 80, 'active', '{"specialty": "marketing", "quality": "high"}'),
('Opus Pro', 'template_based', 'Long-form to short-form clip generation', 'subscription', true, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.opus.pro', 'OPUS_API_KEY', 85, 'active', '{"specialty": "clip_generation", "quality": "high"}'),
('Captions AI', 'template_based', 'AI captions and video editing', 'subscription', true, 300, ARRAY['16:9', '9:16', '1:1'], 'https://api.captions.ai', 'CAPTIONS_API_KEY', 80, 'active', '{"specialty": "captions", "quality": "high"}'),
('Nim Video', 'template_based', 'AI video summarization tool', 'subscription', true, 120, ARRAY['16:9', '9:16', '1:1'], 'https://api.nim.video', 'NIM_API_KEY', 70, 'active', '{"specialty": "summarization", "quality": "medium"}'),
('Scade Pro', 'template_based', 'AI workflow automation for video', 'subscription', false, 300, ARRAY['16:9', '9:16', '1:1'], 'https://api.scade.pro', 'SCADE_API_KEY', 75, 'active', '{"specialty": "workflow", "quality": "high"}'),
('Crayo AI', 'template_based', 'Short-form video automation', 'subscription', true, 60, ARRAY['16:9', '9:16', '1:1'], 'https://api.crayo.ai', 'CRAYO_API_KEY', 80, 'active', '{"specialty": "short_form", "quality": "high"}');

-- Voice Engines
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('ElevenLabs', 'voice', 'High-quality AI voice synthesis with emotion', 'pay_per_use', true, 600, NULL, 'https://api.elevenlabs.io', 'ELEVENLABS_API_KEY', 95, 'active', '{"specialty": "voice_synthesis", "quality": "ultra"}'),
('Flair AI', 'voice', 'AI voiceover generation with multiple voices', 'pay_per_use', true, 300, NULL, 'https://api.flair.ai', 'FLAIR_API_KEY', 75, 'active', '{"specialty": "voiceover", "quality": "high"}');

-- Coming Soon / Beta Engines
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('OpenAI Sora', 'text_to_video', 'OpenAI advanced text-to-video model', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], NULL, 'OPENAI_API_KEY', 98, 'coming_soon', '{"specialty": "cinematic", "quality": "ultra"}'),
('Google Veo', 'text_to_video', 'Google DeepMind video generation model', 'pay_per_use', false, 60, ARRAY['16:9', '9:16', '1:1'], NULL, 'GEMINI_API_KEY', 97, 'coming_soon', '{"specialty": "realistic", "quality": "ultra"}'),
('Synthesia', 'avatar', 'Enterprise AI avatar video platform', 'subscription', false, 600, ARRAY['16:9', '9:16', '1:1'], 'https://api.synthesia.io', NULL, 90, 'coming_soon', '{"specialty": "enterprise_avatar", "quality": "ultra"}'),
('Luma Dream Machine', 'text_to_video', 'Fast high-quality video generation', 'free_tier', true, 5, ARRAY['16:9', '9:16', '1:1'], 'https://api.lumalabs.ai', NULL, 88, 'coming_soon', '{"specialty": "dream_sequence", "quality": "high"}'),
('Hugging Face', 'text_to_video', 'Open-source AI video models hub', 'free', true, 10, ARRAY['16:9', '9:16', '1:1'], 'https://api-inference.huggingface.co', 'HUGGINGFACE_API_KEY', 70, 'active', '{"specialty": "open_source", "quality": "variable"}'),
('LivGen', 'text_to_video', 'Live AI video generation platform', 'pay_per_use', false, 30, ARRAY['16:9', '9:16', '1:1'], 'https://api.livgen.ai', 'LIVGEN_API_KEY', 65, 'active', '{"specialty": "live_generation", "quality": "medium"}');
