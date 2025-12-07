export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_engines: {
        Row: {
          api_base_url: string | null
          api_key_env: string | null
          config: Json | null
          cost_tier: string | null
          created_at: string | null
          description: string | null
          id: string
          max_duration_sec: number | null
          name: string
          pricing_model: string | null
          priority_score: number | null
          status: string | null
          supported_ratios: string[] | null
          supports_free_tier: boolean | null
          type: string
        }
        Insert: {
          api_base_url?: string | null
          api_key_env?: string | null
          config?: Json | null
          cost_tier?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_duration_sec?: number | null
          name: string
          pricing_model?: string | null
          priority_score?: number | null
          status?: string | null
          supported_ratios?: string[] | null
          supports_free_tier?: boolean | null
          type: string
        }
        Update: {
          api_base_url?: string | null
          api_key_env?: string | null
          config?: Json | null
          cost_tier?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_duration_sec?: number | null
          name?: string
          pricing_model?: string | null
          priority_score?: number | null
          status?: string | null
          supported_ratios?: string[] | null
          supports_free_tier?: boolean | null
          type?: string
        }
        Relationships: []
      }
      audio_tracks: {
        Row: {
          created_at: string | null
          duration_sec: number | null
          fade_in_ms: number | null
          fade_out_ms: number | null
          file_url: string
          id: string
          name: string
          script_id: string | null
          start_time_sec: number | null
          track_type: string | null
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          duration_sec?: number | null
          fade_in_ms?: number | null
          fade_out_ms?: number | null
          file_url: string
          id?: string
          name: string
          script_id?: string | null
          start_time_sec?: number | null
          track_type?: string | null
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          duration_sec?: number | null
          fade_in_ms?: number | null
          fade_out_ms?: number | null
          file_url?: string
          id?: string
          name?: string
          script_id?: string | null
          start_time_sec?: number | null
          track_type?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_tracks_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_jobs: {
        Row: {
          completed_at: string | null
          completed_videos: number | null
          created_at: string | null
          error_message: string | null
          id: string
          language: string | null
          pricing_tier: string | null
          product_description: string | null
          product_image_url: string | null
          product_name: string
          progress: Json | null
          project_id: string | null
          scripts_count: number | null
          started_at: string | null
          status: string | null
          total_videos: number | null
          user_id: string
          variations_per_scene: number | null
        }
        Insert: {
          completed_at?: string | null
          completed_videos?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          language?: string | null
          pricing_tier?: string | null
          product_description?: string | null
          product_image_url?: string | null
          product_name: string
          progress?: Json | null
          project_id?: string | null
          scripts_count?: number | null
          started_at?: string | null
          status?: string | null
          total_videos?: number | null
          user_id: string
          variations_per_scene?: number | null
        }
        Update: {
          completed_at?: string | null
          completed_videos?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          language?: string | null
          pricing_tier?: string | null
          product_description?: string | null
          product_image_url?: string | null
          product_name?: string
          progress?: Json | null
          project_id?: string | null
          scripts_count?: number | null
          started_at?: string | null
          status?: string | null
          total_videos?: number | null
          user_id?: string
          variations_per_scene?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_usage_analytics: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          duration_ms: number | null
          engine_id: string | null
          engine_name: string
          error_message: string | null
          id: string
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          duration_ms?: number | null
          engine_id?: string | null
          engine_name: string
          error_message?: string | null
          id?: string
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          duration_ms?: number | null
          engine_id?: string | null
          engine_name?: string
          error_message?: string | null
          id?: string
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engine_usage_analytics_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "ai_engines"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_queue: {
        Row: {
          attempts: number | null
          callback_data: Json | null
          completed_at: string | null
          created_at: string | null
          engine_id: string | null
          error_message: string | null
          external_job_id: string | null
          id: string
          max_attempts: number | null
          priority: number | null
          scene_id: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          callback_data?: Json | null
          completed_at?: string | null
          created_at?: string | null
          engine_id?: string | null
          error_message?: string | null
          external_job_id?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          scene_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          callback_data?: Json | null
          completed_at?: string | null
          created_at?: string | null
          engine_id?: string | null
          error_message?: string | null
          external_job_id?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          scene_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_queue_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "ai_engines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_queue_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_jobs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json | null
          job_type: string
          max_attempts: number | null
          output_data: Json | null
          project_id: string | null
          scene_id: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type: string
          max_attempts?: number | null
          output_data?: Json | null
          project_id?: string | null
          scene_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type?: string
          max_attempts?: number | null
          output_data?: Json | null
          project_id?: string | null
          scene_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_jobs_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          credits: number | null
          email: string | null
          id: string
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number | null
          email?: string | null
          id: string
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number | null
          email?: string | null
          id?: string
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          name: string
          output_count: number | null
          pipeline_status: Json | null
          product_name: string | null
          settings: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          name: string
          output_count?: number | null
          pipeline_status?: Json | null
          product_name?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          name?: string
          output_count?: number | null
          pipeline_status?: Json | null
          product_name?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          language: string | null
          name: string
          template_text: string
          updated_at: string | null
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          language?: string | null
          name: string
          template_text: string
          updated_at?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          language?: string | null
          name?: string
          template_text?: string
          updated_at?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      scenes: {
        Row: {
          created_at: string | null
          duration_sec: number | null
          engine_id: string | null
          engine_name: string | null
          id: string
          index: number
          metadata: Json | null
          quality_score: number | null
          requires_visual_prompt: boolean | null
          retry_count: number | null
          scene_type: string | null
          script_id: string | null
          status: string | null
          text: string
          thumbnail_url: string | null
          transition_duration_ms: number | null
          transition_type: string | null
          updated_at: string | null
          video_url: string | null
          visual_prompt: string | null
        }
        Insert: {
          created_at?: string | null
          duration_sec?: number | null
          engine_id?: string | null
          engine_name?: string | null
          id?: string
          index: number
          metadata?: Json | null
          quality_score?: number | null
          requires_visual_prompt?: boolean | null
          retry_count?: number | null
          scene_type?: string | null
          script_id?: string | null
          status?: string | null
          text: string
          thumbnail_url?: string | null
          transition_duration_ms?: number | null
          transition_type?: string | null
          updated_at?: string | null
          video_url?: string | null
          visual_prompt?: string | null
        }
        Update: {
          created_at?: string | null
          duration_sec?: number | null
          engine_id?: string | null
          engine_name?: string | null
          id?: string
          index?: number
          metadata?: Json | null
          quality_score?: number | null
          requires_visual_prompt?: boolean | null
          retry_count?: number | null
          scene_type?: string | null
          script_id?: string | null
          status?: string | null
          text?: string
          thumbnail_url?: string | null
          transition_duration_ms?: number | null
          transition_type?: string | null
          updated_at?: string | null
          video_url?: string | null
          visual_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "ai_engines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          created_at: string | null
          hooks: string[] | null
          id: string
          language: string | null
          metadata: Json | null
          project_id: string | null
          raw_text: string
          status: string | null
          style: string | null
          tone: string | null
        }
        Insert: {
          created_at?: string | null
          hooks?: string[] | null
          id?: string
          language?: string | null
          metadata?: Json | null
          project_id?: string | null
          raw_text: string
          status?: string | null
          style?: string | null
          tone?: string | null
        }
        Update: {
          created_at?: string | null
          hooks?: string[] | null
          id?: string
          language?: string | null
          metadata?: Json | null
          project_id?: string | null
          raw_text?: string
          status?: string | null
          style?: string | null
          tone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_api_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subtitles: {
        Row: {
          created_at: string | null
          end_time_ms: number
          id: string
          scene_id: string | null
          start_time_ms: number
          style: Json | null
          text: string
        }
        Insert: {
          created_at?: string | null
          end_time_ms: number
          id?: string
          scene_id?: string | null
          start_time_ms: number
          style?: Json | null
          text: string
        }
        Update: {
          created_at?: string | null
          end_time_ms?: number
          id?: string
          scene_id?: string | null
          start_time_ms?: number
          style?: Json | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtitles_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          ai_operator_enabled: boolean | null
          api_keys: Json | null
          created_at: string | null
          default_language: string | null
          default_voice: string | null
          id: string
          preferences: Json | null
          pricing_tier: string | null
          updated_at: string | null
          use_free_tier_only: boolean | null
          use_n8n_backend: boolean | null
          user_id: string | null
        }
        Insert: {
          ai_operator_enabled?: boolean | null
          api_keys?: Json | null
          created_at?: string | null
          default_language?: string | null
          default_voice?: string | null
          id?: string
          preferences?: Json | null
          pricing_tier?: string | null
          updated_at?: string | null
          use_free_tier_only?: boolean | null
          use_n8n_backend?: boolean | null
          user_id?: string | null
        }
        Update: {
          ai_operator_enabled?: boolean | null
          api_keys?: Json | null
          created_at?: string | null
          default_language?: string | null
          default_voice?: string | null
          id?: string
          preferences?: Json | null
          pricing_tier?: string | null
          updated_at?: string | null
          use_free_tier_only?: boolean | null
          use_n8n_backend?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      video_outputs: {
        Row: {
          created_at: string | null
          duration_sec: number | null
          final_video_url: string | null
          format: string | null
          has_subtitles: boolean | null
          has_watermark: boolean | null
          id: string
          metadata: Json | null
          project_id: string | null
          script_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          duration_sec?: number | null
          final_video_url?: string | null
          format?: string | null
          has_subtitles?: boolean | null
          has_watermark?: boolean | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          script_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          duration_sec?: number | null
          final_video_url?: string | null
          format?: string | null
          has_subtitles?: boolean | null
          has_watermark?: boolean | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          script_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_outputs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_api_key: { Args: { p_provider: string }; Returns: boolean }
      get_my_api_key_providers: {
        Args: never
        Returns: {
          is_active: boolean
          provider: string
        }[]
      }
      toggle_api_key_active: {
        Args: { p_is_active: boolean; p_provider: string }
        Returns: boolean
      }
      upsert_secure_api_key: {
        Args: {
          p_encrypted_key: string
          p_is_active?: boolean
          p_provider: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
