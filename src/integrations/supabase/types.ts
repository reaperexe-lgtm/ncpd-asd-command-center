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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      application_bans: {
        Row: {
          created_at: string
          from_date: string
          id: string
          name: string
          reason: string | null
          to_date: string
        }
        Insert: {
          created_at?: string
          from_date: string
          id?: string
          name: string
          reason?: string | null
          to_date: string
        }
        Update: {
          created_at?: string
          from_date?: string
          id?: string
          name?: string
          reason?: string | null
          to_date?: string
        }
        Relationships: []
      }
      asd_applicant_progress: {
        Row: {
          applicant_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          module_id: string
          notes: string | null
          time_value: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          module_id: string
          notes?: string | null
          time_value?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          module_id?: string
          notes?: string | null
          time_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asd_applicant_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "asd_training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      asd_training_modules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          has_time_field: boolean
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          has_time_field?: boolean
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          has_time_field?: boolean
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      casino_balances: {
        Row: {
          balance: number
          id: string
          last_daily_gift: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          last_daily_gift?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          last_daily_gift?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flight_licenses: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          license_date: string
          name: string
          status: string
          team: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          license_date?: string
          name: string
          status?: string
          team: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          license_date?: string
          name?: string
          status?: string
          team?: string
          unit?: string | null
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          id: string
          player_name: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_name: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_name?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      gangs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          erkennungsmerkmale: string | null
          hood: string | null
          id: string
          image_url: string | null
          location: string | null
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          erkennungsmerkmale?: string | null
          hood?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          erkennungsmerkmale?: string | null
          hood?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      mission_vehicles: {
        Row: {
          custom_model: string | null
          id: string
          license_plate: string | null
          mission_id: string
          model: string
          neon_color: string | null
          owner_info: string | null
          pearl_color: string | null
          primary_color: string | null
          secondary_color: string | null
          vehicle_type: string
          xenon: boolean | null
        }
        Insert: {
          custom_model?: string | null
          id?: string
          license_plate?: string | null
          mission_id: string
          model: string
          neon_color?: string | null
          owner_info?: string | null
          pearl_color?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          vehicle_type: string
          xenon?: boolean | null
        }
        Update: {
          custom_model?: string | null
          id?: string
          license_plate?: string | null
          mission_id?: string
          model?: string
          neon_color?: string | null
          owner_info?: string | null
          pearl_color?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          vehicle_type?: string
          xenon?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_vehicles_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          co_pilot: string | null
          created_at: string
          created_by: string
          custom_location: string | null
          description: string | null
          gang_id: string | null
          gang_info: string | null
          hostages_count: number
          id: string
          left_gunner: string | null
          location_type: string
          pilot: string | null
          protokollschreiber: string | null
          right_gunner: string | null
          suspects_count: number
          tatzeit: string
        }
        Insert: {
          co_pilot?: string | null
          created_at?: string
          created_by: string
          custom_location?: string | null
          description?: string | null
          gang_id?: string | null
          gang_info?: string | null
          hostages_count?: number
          id?: string
          left_gunner?: string | null
          location_type: string
          pilot?: string | null
          protokollschreiber?: string | null
          right_gunner?: string | null
          suspects_count?: number
          tatzeit?: string
        }
        Update: {
          co_pilot?: string | null
          created_at?: string
          created_by?: string
          custom_location?: string | null
          description?: string | null
          gang_id?: string | null
          gang_info?: string | null
          hostages_count?: number
          id?: string
          left_gunner?: string | null
          location_type?: string
          pilot?: string | null
          protokollschreiber?: string | null
          right_gunner?: string | null
          suspects_count?: number
          tatzeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_settings: {
        Row: {
          allowed: boolean
          id: string
          permission_key: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          id?: string
          permission_key: string
          role: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          id?: string
          permission_key?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      practical_exam_results: {
        Row: {
          candidate_dienstnummer: string
          candidate_name: string
          checked_locations: Json
          created_at: string
          exam_type: string
          examiner_id: string
          examiner_name: string | null
          himmelsrichtung_deduction: number
          id: string
          location_score: number
          max_score: number
          notes: string | null
          status: string
          ten33_deduction: number
          total_score: number
          uturn_deduction: number
        }
        Insert: {
          candidate_dienstnummer: string
          candidate_name: string
          checked_locations?: Json
          created_at?: string
          exam_type?: string
          examiner_id: string
          examiner_name?: string | null
          himmelsrichtung_deduction?: number
          id?: string
          location_score?: number
          max_score?: number
          notes?: string | null
          status?: string
          ten33_deduction?: number
          total_score?: number
          uturn_deduction?: number
        }
        Update: {
          candidate_dienstnummer?: string
          candidate_name?: string
          checked_locations?: Json
          created_at?: string
          exam_type?: string
          examiner_id?: string
          examiner_name?: string | null
          himmelsrichtung_deduction?: number
          id?: string
          location_score?: number
          max_score?: number
          notes?: string | null
          status?: string
          ten33_deduction?: number
          total_score?: number
          uturn_deduction?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dienstnummer: string | null
          discord_id: string | null
          id: string
          image_url: string | null
          is_approved: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dienstnummer?: string | null
          discord_id?: string | null
          id: string
          image_url?: string | null
          is_approved?: boolean
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dienstnummer?: string | null
          discord_id?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pursuit_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          pursuit_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          pursuit_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          pursuit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pursuit_photos_pursuit_id_fkey"
            columns: ["pursuit_id"]
            isOneToOne: false
            referencedRelation: "pursuits"
            referencedColumns: ["id"]
          },
        ]
      }
      pursuits: {
        Row: {
          co_pilot: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          left_gunner: string | null
          license_plate: string | null
          pilot: string | null
          pursuer: string
          pursuit_date: string
          right_gunner: string | null
          supporters: string | null
          vehicle_model: string | null
        }
        Insert: {
          co_pilot?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          left_gunner?: string | null
          license_plate?: string | null
          pilot?: string | null
          pursuer: string
          pursuit_date?: string
          right_gunner?: string | null
          supporters?: string | null
          vehicle_model?: string | null
        }
        Update: {
          co_pilot?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          left_gunner?: string | null
          license_plate?: string | null
          pilot?: string | null
          pursuer?: string
          pursuit_date?: string
          right_gunner?: string | null
          supporters?: string | null
          vehicle_model?: string | null
        }
        Relationships: []
      }
      reset_requests: {
        Row: {
          created_at: string
          id: string
          reason: string
          requested_by: string
          reset_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          requested_by: string
          reset_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          requested_by?: string
          reset_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      stats_resets: {
        Row: {
          id: string
          reset_at: string
          reset_by: string | null
          reset_type: string
        }
        Insert: {
          id?: string
          reset_at?: string
          reset_by?: string | null
          reset_type: string
        }
        Update: {
          id?: string
          reset_at?: string
          reset_by?: string | null
          reset_type?: string
        }
        Relationships: []
      }
      team_license_limits: {
        Row: {
          id: string
          max_licenses: number
          team: string
        }
        Insert: {
          id?: string
          max_licenses?: number
          team: string
        }
        Update: {
          id?: string
          max_licenses?: number
          team?: string
        }
        Relationships: []
      }
      theory_exam_questions: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          points: number
          question: string
          solution: string | null
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          points?: number
          question: string
          solution?: string | null
          sort_order?: number
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          points?: number
          question?: string
          solution?: string | null
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      theory_exam_results: {
        Row: {
          answers: Json
          created_at: string
          dienstnummer: string
          id: string
          max_score: number
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          status: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          dienstnummer: string
          id?: string
          max_score?: number
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          dienstnummer?: string
          id?: string
          max_score?: number
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_delete_protocols: { Args: { _user_id: string }; Returns: boolean }
      can_manage_licenses: { Args: { _user_id: string }; Returns: boolean }
      can_reset_stats: { Args: { _user_id: string }; Returns: boolean }
      can_review_exams: { Args: { _user_id: string }; Returns: boolean }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "director"
        | "co_director"
        | "supervisor"
        | "ausbilder"
        | "trial_ausbilder"
        | "member"
        | "trial_member"
        | "admin"
        | "asd_applicant"
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
    Enums: {
      app_role: [
        "director",
        "co_director",
        "supervisor",
        "ausbilder",
        "trial_ausbilder",
        "member",
        "trial_member",
        "admin",
        "asd_applicant",
      ],
    },
  },
} as const
