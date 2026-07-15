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
      achievement_definitions: {
        Row: {
          base_code: string | null
          category: string
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          metric: string
          reward_amount: number | null
          sort_order: number
          threshold: number
          tier: string
          tier_level: number | null
          title: string
        }
        Insert: {
          base_code?: string | null
          category?: string
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          metric: string
          reward_amount?: number | null
          sort_order?: number
          threshold?: number
          tier?: string
          tier_level?: number | null
          title: string
        }
        Update: {
          base_code?: string | null
          category?: string
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          metric?: string
          reward_amount?: number | null
          sort_order?: number
          threshold?: number
          tier?: string
          tier_level?: number | null
          title?: string
        }
        Relationships: []
      }
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
          last_anniversary_gift_year: number | null
          last_birthday_gift_year: number | null
          last_daily_gift: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          last_anniversary_gift_year?: number | null
          last_birthday_gift_year?: number | null
          last_daily_gift?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          last_anniversary_gift_year?: number | null
          last_birthday_gift_year?: number | null
          last_daily_gift?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_completions: {
        Row: {
          challenge_id: string
          completed_at: string
          id: string
          reward_paid: boolean
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          id?: string
          reward_paid?: boolean
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          id?: string
          reward_paid?: boolean
          user_id?: string
        }
        Relationships: []
      }
      changelogs: {
        Row: {
          changes: Json | null
          created_at: string
          description: string | null
          id: string
          title: string
          version: string
        }
        Insert: {
          changes?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          version: string
        }
        Update: {
          changes?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          category: string
          created_at: string
          created_by: string | null
          front: string
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          back: string
          category?: string
          created_at?: string
          created_by?: string | null
          front: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          back?: string
          category?: string
          created_at?: string
          created_by?: string | null
          front?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      flight_license_validity: {
        Row: {
          created_at: string
          id: string
          issued_at: string | null
          updated_at: string
          user_id: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_at?: string | null
          updated_at?: string
          user_id: string
          valid_until: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_at?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string
        }
        Relationships: []
      }
      flight_licenses: {
        Row: {
          created_at: string
          flight_time: string | null
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
          flight_time?: string | null
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
          flight_time?: string | null
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
      formation_protocols: {
        Row: {
          attendance: Json | null
          created_at: string
          created_by: string
          datum: string
          id: string
          ort: string
          protokollfuehrer: string
          sections: Json | null
          titel: string
          uhrzeit: string
          untertitel: string | null
        }
        Insert: {
          attendance?: Json | null
          created_at?: string
          created_by: string
          datum: string
          id?: string
          ort?: string
          protokollfuehrer: string
          sections?: Json | null
          titel: string
          uhrzeit: string
          untertitel?: string | null
        }
        Update: {
          attendance?: Json | null
          created_at?: string
          created_by?: string
          datum?: string
          id?: string
          ort?: string
          protokollfuehrer?: string
          sections?: Json | null
          titel?: string
          uhrzeit?: string
          untertitel?: string | null
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
          pearl_color: string | null
          primary_color: string | null
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
          pearl_color?: string | null
          primary_color?: string | null
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
          pearl_color?: string | null
          primary_color?: string | null
        }
        Relationships: []
      }
      heli_data_embeds: {
        Row: {
          channel_id: string
          discord_message_id: string | null
          embed_json: Json
          id: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          discord_message_id?: string | null
          embed_json: Json
          id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          discord_message_id?: string | null
          embed_json?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_of_month: {
        Row: {
          created_at: string
          details: Json
          id: string
          month: number
          score: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          month: number
          score?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          month?: number
          score?: number
          user_id?: string
          year?: number
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      nav_order: {
        Row: {
          id: string
          nav_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          id?: string
          nav_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          id?: string
          nav_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      practical_exam_images: {
        Row: {
          caption: string | null
          created_at: string
          exam_type: string
          id: string
          image_url: string
          sort_order: number
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          exam_type: string
          id?: string
          image_url: string
          sort_order?: number
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          exam_type?: string
          id?: string
          image_url?: string
          sort_order?: number
          uploaded_by?: string | null
          uploaded_by_name?: string | null
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
          released_to_applicant: boolean
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
          released_to_applicant?: boolean
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
          released_to_applicant?: boolean
          status?: string
          ten33_deduction?: number
          total_score?: number
          uturn_deduction?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asd_join_date: string | null
          created_at: string
          dienstnummer: string | null
          discord_notifications: Json
          id: string
          image_url: string | null
          internal_dienstnummer: string | null
          is_approved: boolean
          is_blocked: boolean
          name: string
          updated_at: string
        }
        Insert: {
          asd_join_date?: string | null
          created_at?: string
          dienstnummer?: string | null
          discord_notifications?: Json
          id: string
          image_url?: string | null
          internal_dienstnummer?: string | null
          is_approved?: boolean
          is_blocked?: boolean
          name?: string
          updated_at?: string
        }
        Update: {
          asd_join_date?: string | null
          created_at?: string
          dienstnummer?: string | null
          discord_notifications?: Json
          id?: string
          image_url?: string | null
          internal_dienstnummer?: string | null
          is_approved?: boolean
          is_blocked?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          birthday: string | null
          discord_id: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          discord_id?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          discord_id?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
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
      slideshow_images: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          is_active: boolean
          name: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          name?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string | null
          sort_order?: number
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
      uebung_teilnahmen: {
        Row: {
          created_at: string
          id: string
          status: string
          uebung_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          uebung_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          uebung_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uebung_teilnahmen_uebung_id_fkey"
            columns: ["uebung_id"]
            isOneToOne: false
            referencedRelation: "uebungen"
            referencedColumns: ["id"]
          },
        ]
      }
      uebungen: {
        Row: {
          beschreibung: string | null
          created_at: string
          created_by: string
          id: string
          kategorie: string
          max_teilnehmer: number | null
          ort: string | null
          reminder_sent_at: string | null
          start_at: string
          status: string
          titel: string
          updated_at: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          created_by: string
          id?: string
          kategorie?: string
          max_teilnehmer?: number | null
          ort?: string | null
          reminder_sent_at?: string | null
          start_at: string
          status?: string
          titel: string
          updated_at?: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kategorie?: string
          max_teilnehmer?: number | null
          ort?: string | null
          reminder_sent_at?: string | null
          start_at?: string
          status?: string
          titel?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_code: string
          awarded_at: string
          id: string
          progress_value: number
          user_id: string
        }
        Insert: {
          achievement_code: string
          awarded_at?: string
          id?: string
          progress_value?: number
          user_id: string
        }
        Update: {
          achievement_code?: string
          awarded_at?: string
          id?: string
          progress_value?: number
          user_id?: string
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
      video_tutorials: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          metric: string
          reward_amount: number
          target: number
          title: string
          week_start: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          metric: string
          reward_amount?: number
          target?: number
          title: string
          week_start: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          metric?: string
          reward_amount?: number
          target?: number
          title?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_inactivity_warnings: {
        Row: {
          id: string
          missions_count: number
          pursuits_count: number
          user_id: string
          warned_at: string
          week_start: string
        }
        Insert: {
          id?: string
          missions_count?: number
          pursuits_count?: number
          user_id: string
          warned_at?: string
          week_start: string
        }
        Update: {
          id?: string
          missions_count?: number
          pursuits_count?: number
          user_id?: string
          warned_at?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_performance_rewards: {
        Row: {
          id: string
          missions_count: number
          paid_at: string
          pursuits_count: number
          triggered_by: string
          user_id: string
          week_start: string
        }
        Insert: {
          id?: string
          missions_count?: number
          paid_at?: string
          pursuits_count?: number
          triggered_by: string
          user_id: string
          week_start: string
        }
        Update: {
          id?: string
          missions_count?: number
          paid_at?: string
          pursuits_count?: number
          triggered_by?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_delete_map_items: { Args: { _user_id: string }; Returns: boolean }
      can_delete_protocols: { Args: { _user_id: string }; Returns: boolean }
      can_manage_licenses: { Args: { _user_id: string }; Returns: boolean }
      can_manage_map: { Args: { _user_id: string }; Returns: boolean }
      can_reset_stats: { Args: { _user_id: string }; Returns: boolean }
      can_review_exams: { Args: { _user_id: string }; Returns: boolean }
      can_view_hidden_password: { Args: { _user_id: string }; Returns: boolean }
      check_map_hidden_password: {
        Args: { _password: string }
        Returns: boolean
      }
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
        | "flight_applicant"
        | "flight_license"
        | "team_blue"
        | "team_red"
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
        "flight_applicant",
        "flight_license",
        "team_blue",
        "team_red",
      ],
    },
  },
} as const
