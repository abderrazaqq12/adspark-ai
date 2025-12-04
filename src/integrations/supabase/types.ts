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
          scene_type: string | null
          script_id: string | null
          status: string | null
          text: string
          thumbnail_url: string | null
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
          scene_type?: string | null
          script_id?: string | null
          status?: string | null
          text: string
          thumbnail_url?: string | null
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
          scene_type?: string | null
          script_id?: string | null
          status?: string | null
          text?: string
          thumbnail_url?: string | null
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
          api_keys: Json | null
          created_at: string | null
          default_language: string | null
          default_voice: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
          use_free_tier_only: boolean | null
          user_id: string | null
        }
        Insert: {
          api_keys?: Json | null
          created_at?: string | null
          default_language?: string | null
          default_voice?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          use_free_tier_only?: boolean | null
          user_id?: string | null
        }
        Update: {
          api_keys?: Json | null
          created_at?: string | null
          default_language?: string | null
          default_voice?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          use_free_tier_only?: boolean | null
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
      [_ in never]: never
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
