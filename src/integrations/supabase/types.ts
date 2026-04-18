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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      athlete_kits: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          image_url: string | null
          items: Json | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          image_url?: string | null
          items?: Json | null
          name: string
          price?: number
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          image_url?: string | null
          items?: Json | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_kits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_race_state: {
        Row: {
          created_at: string
          current_segment_id: string | null
          current_segment_index: number
          finish_status: string | null
          finish_time: string | null
          id: string
          lap_count: number | null
          last_updated: string
          official_time_ms: number | null
          penalties: number | null
          registration_id: string
          rep_count: number | null
          review_note: string | null
          reviewed_by: string | null
          start_time: string | null
          status: string
          total_time_ms: number | null
        }
        Insert: {
          created_at?: string
          current_segment_id?: string | null
          current_segment_index?: number
          finish_status?: string | null
          finish_time?: string | null
          id?: string
          lap_count?: number | null
          last_updated?: string
          official_time_ms?: number | null
          penalties?: number | null
          registration_id: string
          rep_count?: number | null
          review_note?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: string
          total_time_ms?: number | null
        }
        Update: {
          created_at?: string
          current_segment_id?: string | null
          current_segment_index?: number
          finish_status?: string | null
          finish_time?: string | null
          id?: string
          lap_count?: number | null
          last_updated?: string
          official_time_ms?: number | null
          penalties?: number | null
          registration_id?: string
          rep_count?: number | null
          review_note?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: string
          total_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_race_state_current_segment_id_fkey"
            columns: ["current_segment_id"]
            isOneToOne: false
            referencedRelation: "race_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_race_state_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          age_type: string | null
          created_at: string
          event_id: string
          gender_requirement: string | null
          id: string
          max_age: number | null
          min_age: number | null
          mixed_config: Json | null
          name: string
          price: number
          race_type_id: string | null
          stage_id: string | null
          team_size: number | null
        }
        Insert: {
          age_type?: string | null
          created_at?: string
          event_id: string
          gender_requirement?: string | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          mixed_config?: Json | null
          name: string
          price?: number
          race_type_id?: string | null
          stage_id?: string | null
          team_size?: number | null
        }
        Update: {
          age_type?: string | null
          created_at?: string
          event_id?: string
          gender_requirement?: string | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          mixed_config?: Json | null
          name?: string
          price?: number
          race_type_id?: string | null
          stage_id?: string | null
          team_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_race_type_id_fkey"
            columns: ["race_type_id"]
            isOneToOne: false
            referencedRelation: "race_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "event_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_tracks: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          focus_description: string | null
          id: string
          image_url: string | null
          name: string
          order_index: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          focus_description?: string | null
          id?: string
          image_url?: string | null
          name: string
          order_index?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          focus_description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          discount_events_percent: number | null
          discount_next_challenge_percent: number | null
          free_discount_events_percent: number | null
          free_discount_next_challenge_percent: number | null
          id: string
          is_paid: boolean
          judge_workout_id: string | null
          mission_type: string | null
          paid_discount_events_percent: number | null
          paid_discount_next_challenge_percent: number | null
          physical_reward_description: string | null
          physical_reward_image_url: string | null
          physical_reward_name: string | null
          price: number | null
          reward_badge_url: string | null
          reward_text: string | null
          sequence_order: number | null
          social_validation_account: string | null
          social_validation_hashtags: string[] | null
          social_validation_instructions: string | null
          title: string
          track_id: string | null
          type: string
          uaix_reward: number | null
          unlock_criteria: string | null
          unlocks_next_challenge: boolean | null
          validation_types: string[] | null
          virtual_badge_description: string | null
          virtual_badge_name: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          discount_events_percent?: number | null
          discount_next_challenge_percent?: number | null
          free_discount_events_percent?: number | null
          free_discount_next_challenge_percent?: number | null
          id?: string
          is_paid?: boolean
          judge_workout_id?: string | null
          mission_type?: string | null
          paid_discount_events_percent?: number | null
          paid_discount_next_challenge_percent?: number | null
          physical_reward_description?: string | null
          physical_reward_image_url?: string | null
          physical_reward_name?: string | null
          price?: number | null
          reward_badge_url?: string | null
          reward_text?: string | null
          sequence_order?: number | null
          social_validation_account?: string | null
          social_validation_hashtags?: string[] | null
          social_validation_instructions?: string | null
          title: string
          track_id?: string | null
          type: string
          uaix_reward?: number | null
          unlock_criteria?: string | null
          unlocks_next_challenge?: boolean | null
          validation_types?: string[] | null
          virtual_badge_description?: string | null
          virtual_badge_name?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          discount_events_percent?: number | null
          discount_next_challenge_percent?: number | null
          free_discount_events_percent?: number | null
          free_discount_next_challenge_percent?: number | null
          id?: string
          is_paid?: boolean
          judge_workout_id?: string | null
          mission_type?: string | null
          paid_discount_events_percent?: number | null
          paid_discount_next_challenge_percent?: number | null
          physical_reward_description?: string | null
          physical_reward_image_url?: string | null
          physical_reward_name?: string | null
          price?: number | null
          reward_badge_url?: string | null
          reward_text?: string | null
          sequence_order?: number | null
          social_validation_account?: string | null
          social_validation_hashtags?: string[] | null
          social_validation_instructions?: string | null
          title?: string
          track_id?: string | null
          type?: string
          uaix_reward?: number | null
          unlock_criteria?: string | null
          unlocks_next_challenge?: boolean | null
          validation_types?: string[] | null
          virtual_badge_description?: string | null
          virtual_badge_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "challenge_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          active: boolean | null
          code: string
          coupon_type: string | null
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          event_id: string
          id: string
          max_uses: number | null
          payment_link: string | null
          payment_link_with_kit: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          coupon_type?: string | null
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          event_id: string
          id?: string
          max_uses?: number | null
          payment_link?: string | null
          payment_link_with_kit?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          coupon_type?: string | null
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          event_id?: string
          id?: string
          max_uses?: number | null
          payment_link?: string | null
          payment_link_with_kit?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          assigned_station: string | null
          created_at: string
          event_id: string
          id: string
          role: Database["public"]["Enums"]["race_staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_station?: string | null
          created_at?: string
          event_id: string
          id?: string
          role?: Database["public"]["Enums"]["race_staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_station?: string | null
          created_at?: string
          event_id?: string
          id?: string
          role?: Database["public"]["Enums"]["race_staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_stages: {
        Row: {
          created_at: string
          description: string | null
          distance_meters: number | null
          event_id: string
          id: string
          lap_count: number | null
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          distance_meters?: number | null
          event_id: string
          id?: string
          lap_count?: number | null
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          distance_meters?: number | null
          event_id?: string
          id?: string
          lap_count?: number | null
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_stages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          checkin_method:
            | Database["public"]["Enums"]["race_checkin_method"]
            | null
          created_at: string
          date: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          location: string
          partner_payment_link: string | null
          partner_payment_link_with_kit: string | null
          race_status: string | null
          status: string | null
          title: string
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          checkin_method?:
            | Database["public"]["Enums"]["race_checkin_method"]
            | null
          created_at?: string
          date: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          location: string
          partner_payment_link?: string | null
          partner_payment_link_with_kit?: string | null
          race_status?: string | null
          status?: string | null
          title: string
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          checkin_method?:
            | Database["public"]["Enums"]["race_checkin_method"]
            | null
          created_at?: string
          date?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string
          partner_payment_link?: string | null
          partner_payment_link_with_kit?: string | null
          race_status?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          created_at: string
          event_name: string | null
          id: string
          image_url: string
          order_index: number | null
          title: string
        }
        Insert: {
          created_at?: string
          event_name?: string | null
          id?: string
          image_url: string
          order_index?: number | null
          title: string
        }
        Update: {
          created_at?: string
          event_name?: string | null
          id?: string
          image_url?: string
          order_index?: number | null
          title?: string
        }
        Relationships: []
      }
      heat_lane_assignments: {
        Row: {
          created_at: string
          heat_id: string
          id: string
          lane_number: number
          registration_id: string | null
        }
        Insert: {
          created_at?: string
          heat_id: string
          id?: string
          lane_number: number
          registration_id?: string | null
        }
        Update: {
          created_at?: string
          heat_id?: string
          id?: string
          lane_number?: number
          registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heat_lane_assignments_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_lane_assignments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      heats: {
        Row: {
          category_id: string
          created_at: string
          event_id: string
          id: string
          lane_count: number
          start_time: string
          started_at: string | null
          status: string
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          event_id: string
          id?: string
          lane_count?: number
          start_time: string
          started_at?: string | null
          status?: string
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          event_id?: string
          id?: string
          lane_count?: number
          start_time?: string
          started_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "heats_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_athletes: {
        Row: {
          bib_number: number | null
          category_id: string | null
          created_at: string
          email: string | null
          event_id: string
          final_time: string | null
          full_name: string
          id: string
          phone: string | null
          stage_id: string | null
        }
        Insert: {
          bib_number?: number | null
          category_id?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          final_time?: string | null
          full_name: string
          id?: string
          phone?: string | null
          stage_id?: string | null
        }
        Update: {
          bib_number?: number | null
          category_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          final_time?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_athletes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_athletes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_athletes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "event_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_configs: {
        Row: {
          config: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_missions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          recurrence: string | null
          reward_amount: number
          submission_type: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          recurrence?: string | null
          reward_amount?: number
          submission_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          recurrence?: string | null
          reward_amount?: number
          submission_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          coupon_code: string
          created_at: string
          current_balance: number
          display_name: string | null
          featured_image_url: string | null
          id: string
          instagram_handle: string | null
          is_public: boolean
          lifetime_earnings: number
          public_bio: string | null
          specialty: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code: string
          created_at?: string
          current_balance?: number
          display_name?: string | null
          featured_image_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_public?: boolean
          lifetime_earnings?: number
          public_bio?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string
          created_at?: string
          current_balance?: number
          display_name?: string | null
          featured_image_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_public?: boolean
          lifetime_earnings?: number
          public_bio?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_rewards: {
        Row: {
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_submissions: {
        Row: {
          admin_feedback: string | null
          created_at: string
          id: string
          mission_id: string
          proof_content: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_feedback?: string | null
          created_at?: string
          id?: string
          mission_id: string
          proof_content?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_feedback?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          proof_content?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_submissions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "partner_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          category: string
          created_at: string
          description: string | null
          discount_rule: string | null
          id: string
          logo_url: string | null
          name: string
          website_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          discount_rule?: string | null
          id?: string
          logo_url?: string | null
          name: string
          website_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          discount_rule?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      price_batch_categories: {
        Row: {
          batch_id: string
          category_id: string
          created_at: string
          id: string
        }
        Insert: {
          batch_id: string
          category_id: string
          created_at?: string
          id?: string
        }
        Update: {
          batch_id?: string
          category_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_batch_categories_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "price_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_batch_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      price_batches: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string
          end_date: string | null
          event_id: string
          id: string
          max_registrations: number | null
          name: string
          order_index: number | null
          payment_link: string | null
          pix_key: string | null
          price: number
          stage_id: string | null
          start_date: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          event_id: string
          id?: string
          max_registrations?: number | null
          name: string
          order_index?: number | null
          payment_link?: string | null
          pix_key?: string | null
          price?: number
          stage_id?: string | null
          start_date?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          event_id?: string
          id?: string
          max_registrations?: number | null
          name?: string
          order_index?: number | null
          payment_link?: string | null
          pix_key?: string | null
          price?: number
          stage_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_batches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_batches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "race_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          instagram: string | null
          phone: string | null
          strava_access_token: string | null
          strava_athlete_id: string | null
          strava_connected: boolean | null
          strava_refresh_token: string | null
          strava_token_expires_at: string | null
          team: string | null
          training_location_name: string | null
          uaix_balance: number | null
          updated_at: string
          whatsapp_notifications: boolean | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          instagram?: string | null
          phone?: string | null
          strava_access_token?: string | null
          strava_athlete_id?: string | null
          strava_connected?: boolean | null
          strava_refresh_token?: string | null
          strava_token_expires_at?: string | null
          team?: string | null
          training_location_name?: string | null
          uaix_balance?: number | null
          updated_at?: string
          whatsapp_notifications?: boolean | null
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          phone?: string | null
          strava_access_token?: string | null
          strava_athlete_id?: string | null
          strava_connected?: boolean | null
          strava_refresh_token?: string | null
          strava_token_expires_at?: string | null
          team?: string | null
          training_location_name?: string | null
          uaix_balance?: number | null
          updated_at?: string
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      race_checkins: {
        Row: {
          checkin_time: string
          created_at: string
          id: string
          method: string
          processed_by: string | null
          registration_id: string
        }
        Insert: {
          checkin_time?: string
          created_at?: string
          id?: string
          method?: string
          processed_by?: string | null
          registration_id: string
        }
        Update: {
          checkin_time?: string
          created_at?: string
          id?: string
          method?: string
          processed_by?: string | null
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_checkins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      race_segments: {
        Row: {
          created_at: string
          id: string
          is_finish_line: boolean | null
          lap_count: number | null
          name: string
          order_index: number
          race_type_id: string
          reps_per_tap: number | null
          target_value: number | null
          time_cap_seconds: number | null
          updated_at: string
          validation_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_finish_line?: boolean | null
          lap_count?: number | null
          name: string
          order_index?: number
          race_type_id: string
          reps_per_tap?: number | null
          target_value?: number | null
          time_cap_seconds?: number | null
          updated_at?: string
          validation_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_finish_line?: boolean | null
          lap_count?: number | null
          name?: string
          order_index?: number
          race_type_id?: string
          reps_per_tap?: number | null
          target_value?: number | null
          time_cap_seconds?: number | null
          updated_at?: string
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_segments_race_type_id_fkey"
            columns: ["race_type_id"]
            isOneToOne: false
            referencedRelation: "race_types"
            referencedColumns: ["id"]
          },
        ]
      }
      race_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          order_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_teams: {
        Row: {
          captain_user_id: string
          category_id: string
          created_at: string
          event_id: string
          id: string
          status: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          captain_user_id: string
          category_id: string
          created_at?: string
          event_id: string
          id?: string
          status?: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          captain_user_id?: string
          category_id?: string
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          batch_id: string | null
          bib_number: number | null
          captain_id: string | null
          category_id: string
          coupon_id: string | null
          created_at: string
          event_id: string
          heat_id: string | null
          id: string
          imported_athlete_id: string | null
          kit_id: string | null
          payment_method: string | null
          race_type_id: string | null
          start_time: string | null
          status: string
          team_id: string | null
          team_status: string | null
          total_paid: number | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          bib_number?: number | null
          captain_id?: string | null
          category_id: string
          coupon_id?: string | null
          created_at?: string
          event_id: string
          heat_id?: string | null
          id?: string
          imported_athlete_id?: string | null
          kit_id?: string | null
          payment_method?: string | null
          race_type_id?: string | null
          start_time?: string | null
          status?: string
          team_id?: string | null
          team_status?: string | null
          total_paid?: number | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          bib_number?: number | null
          captain_id?: string | null
          category_id?: string
          coupon_id?: string | null
          created_at?: string
          event_id?: string
          heat_id?: string | null
          id?: string
          imported_athlete_id?: string | null
          kit_id?: string | null
          payment_method?: string | null
          race_type_id?: string | null
          start_time?: string | null
          status?: string
          team_id?: string | null
          team_status?: string | null
          total_paid?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "price_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_imported_athlete_id_fkey"
            columns: ["imported_athlete_id"]
            isOneToOne: false
            referencedRelation: "imported_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "athlete_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_race_type_id_fkey"
            columns: ["race_type_id"]
            isOneToOne: false
            referencedRelation: "race_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "registration_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          created_at: string
          id: string
          recorded_by: string | null
          registration_id: string
          station_id: string
          updated_at: string
          valid: boolean | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_by?: string | null
          registration_id: string
          station_id: string
          updated_at?: string
          valid?: boolean | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          recorded_by?: string | null
          registration_id?: string
          station_id?: string
          updated_at?: string
          valid?: boolean | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_completion_logs: {
        Row: {
          caller_role: string
          completed_at: string
          created_at: string
          id: string
          lap_number: number
          registration_id: string
          segment_id: string | null
          segment_order: number
        }
        Insert: {
          caller_role?: string
          completed_at?: string
          created_at?: string
          id?: string
          lap_number?: number
          registration_id: string
          segment_id?: string | null
          segment_order: number
        }
        Update: {
          caller_role?: string
          completed_at?: string
          created_at?: string
          id?: string
          lap_number?: number
          registration_id?: string
          segment_id?: string | null
          segment_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "segment_completion_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_completion_logs_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "race_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          active: boolean | null
          category: string
          colors: string[] | null
          created_at: string
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          name: string
          price: number
          sizes: string[] | null
          stock: number
          uaix_discount_percent: number | null
          uaix_free_threshold: number | null
          uaix_max_coins: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string
          colors?: string[] | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sizes?: string[] | null
          stock?: number
          uaix_discount_percent?: number | null
          uaix_free_threshold?: number | null
          uaix_max_coins?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string
          colors?: string[] | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sizes?: string[] | null
          stock?: number
          uaix_discount_percent?: number | null
          uaix_free_threshold?: number | null
          uaix_max_coins?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stage_stations: {
        Row: {
          created_at: string
          id: string
          order_index: number
          stage_id: string
          station_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          stage_id: string
          station_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          stage_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_stations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "event_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_stations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          order_index: number
          type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
          order_index: number
          type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          order_index?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_usage: {
        Row: {
          created_at: string
          id: string
          photo_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      training_locations: {
        Row: {
          address: string
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          instagram: string | null
          is_partner: boolean | null
          lat: number
          lng: number
          name: string
          photo_url: string | null
          status: string
          whatsapp: string | null
        }
        Insert: {
          address: string
          city: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram?: string | null
          is_partner?: boolean | null
          lat: number
          lng: number
          name: string
          photo_url?: string | null
          status?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram?: string | null
          is_partner?: boolean | null
          lat?: number
          lng?: number
          name?: string
          photo_url?: string | null
          status?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          created_at: string
          description: string | null
          download_url: string | null
          features: Json | null
          id: string
          image_url: string | null
          price: number
          title: string
          trainer_name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_url?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          price?: number
          title: string
          trainer_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          download_url?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          price?: number
          title?: string
          trainer_name?: string | null
        }
        Relationships: []
      }
      uaix_transactions: {
        Row: {
          amount: number
          challenge_id: string | null
          created_at: string
          description: string | null
          id: string
          type: string
          user_challenge_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          challenge_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_challenge_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          challenge_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_challenge_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uaix_transactions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uaix_transactions_user_challenge_id_fkey"
            columns: ["user_challenge_id"]
            isOneToOne: false
            referencedRelation: "user_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          completion_time: string | null
          created_at: string
          id: string
          invalidated_at: string | null
          invalidated_reason: string | null
          proof_url: string | null
          reps_count: number | null
          social_proof_link: string | null
          status: string
          uaix_granted: number | null
          user_id: string
          validated_at: string | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          completion_time?: string | null
          created_at?: string
          id?: string
          invalidated_at?: string | null
          invalidated_reason?: string | null
          proof_url?: string | null
          reps_count?: number | null
          social_proof_link?: string | null
          status?: string
          uaix_granted?: number | null
          user_id: string
          validated_at?: string | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          completion_time?: string | null
          created_at?: string
          id?: string
          invalidated_at?: string | null
          invalidated_reason?: string | null
          proof_url?: string | null
          reps_count?: number | null
          social_proof_link?: string | null
          status?: string
          uaix_granted?: number | null
          user_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          id: string
          plan_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          plan_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          plan_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tracks: {
        Row: {
          completed_at: string | null
          current_challenge_index: number | null
          enrolled_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_challenge_index?: number | null
          enrolled_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_challenge_index?: number | null
          enrolled_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "challenge_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          available_variables: string[] | null
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          template: string
          updated_at: string
        }
        Insert: {
          available_variables?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          template: string
          updated_at?: string
        }
        Update: {
          available_variables?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      experience_leaderboard: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          last_activity: string | null
          metric_count: number | null
          metric_value: string | null
          rank: number | null
          ranking_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_team_member_registration: {
        Args: {
          p_category_id: string
          p_event_id: string
          p_team_id: string
          p_user_id: string
        }
        Returns: string
      }
      cancel_heat_start: { Args: { _heat_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_staff: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      start_heat_batch: { Args: { _heat_id: string }; Returns: boolean }
      validate_segment: {
        Args: {
          _caller_role?: string
          _registration_id: string
          _segment_order: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "user"
        | "staff"
        | "admin"
        | "lane_judge"
        | "head_judge"
        | "squad"
        | "race_director"
        | "judge"
      race_checkin_method: "staff_only" | "athlete_only" | "hybrid"
      race_entry_type:
        | "start"
        | "lap"
        | "rep_add"
        | "rep_sub"
        | "finish"
        | "dnf"
      race_publication_status: "provisional" | "under_review" | "official"
      race_segment_type: "distance" | "reps" | "checkpoint" | "duration" | "run"
      race_staff_role: "judge"
      race_validation_method:
        | "auto_judge"
        | "manual_judge"
        | "device_nfc"
        | "device_camera"
        | "hybrid"
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
        "user",
        "staff",
        "admin",
        "lane_judge",
        "head_judge",
        "squad",
        "race_director",
        "judge",
      ],
      race_checkin_method: ["staff_only", "athlete_only", "hybrid"],
      race_entry_type: ["start", "lap", "rep_add", "rep_sub", "finish", "dnf"],
      race_publication_status: ["provisional", "under_review", "official"],
      race_segment_type: ["distance", "reps", "checkpoint", "duration", "run"],
      race_staff_role: ["judge"],
      race_validation_method: [
        "auto_judge",
        "manual_judge",
        "device_nfc",
        "device_camera",
        "hybrid",
      ],
    },
  },
} as const
