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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      channels: {
        Row: {
          category: string
          college_id: string
          created_at: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          category: string
          college_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          category?: string
          college_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          created_at: string
          description: string | null
          email_domain: string | null
          id: string
          live_active_students: number
          logo_url: string | null
          name: string
          slug: string
          total_verified_students: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          email_domain?: string | null
          id?: string
          live_active_students?: number
          logo_url?: string | null
          name: string
          slug: string
          total_verified_students?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          email_domain?: string | null
          id?: string
          live_active_students?: number
          logo_url?: string | null
          name?: string
          slug?: string
          total_verified_students?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel: string
          college_id: string
          content: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          channel?: string
          college_id: string
          content: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          channel?: string
          college_id?: string
          content?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          branch: string | null
          channel_slug: string
          college_id: string
          content: string
          created_at: string
          id: string
          location: string | null
          media_type: string | null
          media_url: string | null
          user_id: string
          voice_url: string | null
          year: string | null
        }
        Insert: {
          branch?: string | null
          channel_slug: string
          college_id: string
          content: string
          created_at?: string
          id?: string
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          user_id: string
          voice_url?: string | null
          year?: string | null
        }
        Update: {
          branch?: string | null
          channel_slug?: string
          college_id?: string
          content?: string
          created_at?: string
          id?: string
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          user_id?: string
          voice_url?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymous_username: string | null
          avatar_seed: string | null
          avatar_url: string | null
          bio: string | null
          college_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          reputation_score: number
          verification_status: string
        }
        Insert: {
          anonymous_username?: string | null
          avatar_seed?: string | null
          avatar_url?: string | null
          bio?: string | null
          college_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          reputation_score?: number
          verification_status?: string
        }
        Update: {
          anonymous_username?: string | null
          avatar_seed?: string | null
          avatar_url?: string | null
          bio?: string | null
          college_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          reputation_score?: number
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          branch: string | null
          channel: string
          college_id: string
          content: string
          created_at: string
          id: string
          user_id: string
          year: string | null
        }
        Insert: {
          branch?: string | null
          channel: string
          college_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
          year?: string | null
        }
        Update: {
          branch?: string | null
          channel?: string
          college_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          created_at: string
          file_url: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
