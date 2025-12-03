export interface Project {
  id: string;
  user_id: string;
  name: string;
  product_name: string | null;
  language: string;
  output_count: number;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  language: string;
  raw_text: string;
  hooks: string[] | null;
  tone: string | null;
  style: string | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Scene {
  id: string;
  script_id: string;
  index: number;
  text: string;
  scene_type: 'hook' | 'problem' | 'solution' | 'social_proof' | 'cta' | 'broll' | 'avatar' | 'product' | 'testimonial' | 'transition';
  visual_prompt: string | null;
  engine_id: string | null;
  engine_name: string | null;
  duration_sec: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  video_url: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIEngine {
  id: string;
  name: string;
  type: 'avatar' | 'text_to_video' | 'image_to_video' | 'template_based' | 'voice';
  supports_free_tier: boolean;
  pricing_model: 'free' | 'free_tier' | 'pay_per_use' | 'subscription';
  max_duration_sec: number;
  supported_ratios: string[];
  api_base_url: string | null;
  api_key_env: string | null;
  status: 'active' | 'disabled' | 'coming_soon';
  description: string | null;
  priority_score: number;
  config: Record<string, any>;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  user_id: string | null;
  name: string;
  template_text: string;
  variables: string[];
  language: string;
  category: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoOutput {
  id: string;
  project_id: string;
  script_id: string | null;
  final_video_url: string | null;
  format: string;
  duration_sec: number | null;
  has_subtitles: boolean;
  has_watermark: boolean;
  metadata: Record<string, any>;
  status: string;
  created_at: string;
}
