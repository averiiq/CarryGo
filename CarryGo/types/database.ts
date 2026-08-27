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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          action: string
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_id: string
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempted_at: string
          email: string
          id: string
          success: boolean
        }
        Insert: {
          attempt_type: string
          attempted_at?: string
          email: string
          id?: string
          success?: boolean
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          email?: string
          id?: string
          success?: boolean
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_read: boolean
          last_message_sender_id: string | null
          last_message_text: string | null
          parcel_description: string
          participant_ids: string[]
          participant_names: Json
          request_id: string
          route: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_read?: boolean
          last_message_sender_id?: string | null
          last_message_text?: string | null
          parcel_description?: string
          participant_ids: string[]
          participant_names?: Json
          request_id: string
          route?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_read?: boolean
          last_message_sender_id?: string | null
          last_message_text?: string | null
          parcel_description?: string
          participant_ids?: string[]
          participant_names?: Json
          request_id?: string
          route?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          delivery_confirmed: boolean
          delivery_confirmed_at: string | null
          id: string
          location_updated_at: string | null
          otp_attempt_count: number
          otp_hash: string | null
          otp_locked_until: string | null
          pickup_confirmed: boolean
          pickup_confirmed_at: string | null
          request_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          traveller_lat: number | null
          traveller_lng: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_confirmed?: boolean
          delivery_confirmed_at?: string | null
          id?: string
          location_updated_at?: string | null
          otp_attempt_count?: number
          otp_hash?: string | null
          otp_locked_until?: string | null
          pickup_confirmed?: boolean
          pickup_confirmed_at?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          traveller_lat?: number | null
          traveller_lng?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_confirmed?: boolean
          delivery_confirmed_at?: string | null
          id?: string
          location_updated_at?: string | null
          otp_attempt_count?: number
          otp_hash?: string | null
          otp_locked_until?: string | null
          pickup_confirmed?: boolean
          pickup_confirmed_at?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          traveller_lat?: number | null
          traveller_lng?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          document_type: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          session_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          document_type: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          session_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          document_type?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          session_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kyc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_review_history: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          reason: string | null
          reviewer_id: string
          session_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string | null
          reviewer_id: string
          session_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string | null
          reviewer_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_review_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kyc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_sessions: {
        Row: {
          address_proof_url: string | null
          created_at: string
          document_url: string | null
          full_name: string
          id: string
          id_back_url: string | null
          id_type: string
          provider: string
          provider_session_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submission_attempt: number
          user_id: string
        }
        Insert: {
          address_proof_url?: string | null
          created_at?: string
          document_url?: string | null
          full_name: string
          id?: string
          id_back_url?: string | null
          id_type: string
          provider?: string
          provider_session_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submission_attempt?: number
          user_id: string
        }
        Update: {
          address_proof_url?: string | null
          created_at?: string
          document_url?: string | null
          full_name?: string
          id?: string
          id_back_url?: string | null
          id_type?: string
          provider?: string
          provider_session_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submission_attempt?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_name: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          sender_name: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          sender_name?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          checked_at: string | null
          created_at: string
          delivered_at: string | null
          expo_receipt_id: string | null
          expo_ticket_id: string | null
          id: string
          last_error: string | null
          notification_id: string
          sent_at: string | null
          status: string
          updated_at: string
          user_device_id: string
        }
        Insert: {
          attempt_count?: number
          checked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          expo_receipt_id?: string | null
          expo_ticket_id?: string | null
          id?: string
          last_error?: string | null
          notification_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_device_id: string
        }
        Update: {
          attempt_count?: number
          checked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          expo_receipt_id?: string | null
          expo_ticket_id?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_device_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_user_device_id_fkey"
            columns: ["user_device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          related_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          related_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verification_attempts: {
        Row: {
          attempted_otp_hash: string
          created_at: string
          delivery_id: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempted_otp_hash: string
          created_at?: string
          delivery_id: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempted_otp_hash?: string
          created_at?: string
          delivery_id?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "otp_verification_attempts_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otp_verification_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          attempt_count: number
          available_at: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
          topic: string
        }
        Insert: {
          attempt_count?: number
          available_at?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          topic: string
        }
        Update: {
          attempt_count?: number
          available_at?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          topic?: string
        }
        Relationships: []
      }
      parcels: {
        Row: {
          category: Database["public"]["Enums"]["parcel_category"]
          created_at: string
          delivery_date: string | null
          description: string
          from_city: string
          id: string
          image_url: string | null
          price_offer: number
          status: Database["public"]["Enums"]["parcel_status"]
          to_city: string
          updated_at: string
          user_city: string | null
          user_id: string
          user_name: string
          weight: number
        }
        Insert: {
          category: Database["public"]["Enums"]["parcel_category"]
          created_at?: string
          delivery_date?: string | null
          description: string
          from_city: string
          id?: string
          image_url?: string | null
          price_offer: number
          status?: Database["public"]["Enums"]["parcel_status"]
          to_city: string
          updated_at?: string
          user_city?: string | null
          user_id: string
          user_name: string
          weight: number
        }
        Update: {
          category?: Database["public"]["Enums"]["parcel_category"]
          created_at?: string
          delivery_date?: string | null
          description?: string
          from_city?: string
          id?: string
          image_url?: string | null
          price_offer?: number
          status?: Database["public"]["Enums"]["parcel_status"]
          to_city?: string
          updated_at?: string
          user_city?: string | null
          user_id?: string
          user_name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          locked_at: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          released_at: string | null
          request_id: string
          sender_id: string
          status: Database["public"]["Enums"]["payment_status"]
          traveller_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          locked_at?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          released_at?: string | null
          request_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          traveller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          locked_at?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          released_at?: string | null
          request_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          traveller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_traveller_id_fkey"
            columns: ["traveller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          from_user_id: string
          id: string
          rating: number
          request_id: string
          to_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          rating: number
          request_id: string
          to_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          rating?: number
          request_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          parcel_id: string
          price: number
          sender_id: string
          sender_name: string
          status: Database["public"]["Enums"]["request_status"]
          traveller_id: string
          traveller_name: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          parcel_id: string
          price: number
          sender_id: string
          sender_name: string
          status?: Database["public"]["Enums"]["request_status"]
          traveller_id: string
          traveller_name: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          parcel_id?: string
          price?: number
          sender_id?: string
          sender_name?: string
          status?: Database["public"]["Enums"]["request_status"]
          traveller_id?: string
          traveller_name?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_traveller_id_fkey"
            columns: ["traveller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      route_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          from_city: string
          id: string
          to_city: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          from_city: string
          id?: string
          to_city: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          from_city?: string
          id?: string
          to_city?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          available_capacity: number
          created_at: string
          date: string
          from_city: string
          id: string
          price_per_kg: number
          status: Database["public"]["Enums"]["trip_status"]
          time: string
          to_city: string
          updated_at: string
          user_city: string | null
          user_id: string
          user_name: string
          user_rating: number
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          available_capacity: number
          created_at?: string
          date: string
          from_city: string
          id?: string
          price_per_kg: number
          status?: Database["public"]["Enums"]["trip_status"]
          time: string
          to_city: string
          updated_at?: string
          user_city?: string | null
          user_id: string
          user_name: string
          user_rating?: number
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          available_capacity?: number
          created_at?: string
          date?: string
          from_city?: string
          id?: string
          price_per_kg?: number
          status?: Database["public"]["Enums"]["trip_status"]
          time?: string
          to_city?: string
          updated_at?: string
          user_city?: string | null
          user_id?: string
          user_name?: string
          user_rating?: number
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_key: string
          expo_push_token: string
          failure_count: number
          id: string
          invalidated_at: string | null
          last_seen_at: string
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_key: string
          expo_push_token: string
          failure_count?: number
          id?: string
          invalidated_at?: string | null
          last_seen_at?: string
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_key?: string
          expo_push_token?: string
          failure_count?: number
          id?: string
          invalidated_at?: string | null
          last_seen_at?: string
          platform?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          city: string | null
          created_at: string
          current_city: string | null
          current_lat: number | null
          current_lng: number | null
          email: string
          full_name: string | null
          id: string
          joined_at: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          location_updated_at: string | null
          phone: string | null
          profile_completed_at: string | null
          push_token: string | null
          rating: number
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["account_status"]
          system_role: Database["public"]["Enums"]["system_role"]
          total_deliveries: number
          total_trips: number
          updated_at: string
          username: string | null
          verified: boolean
        }
        Insert: {
          city?: string | null
          created_at?: string
          current_city?: string | null
          current_lat?: number | null
          current_lng?: number | null
          email: string
          full_name?: string | null
          id: string
          joined_at?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          location_updated_at?: string | null
          phone?: string | null
          profile_completed_at?: string | null
          push_token?: string | null
          rating?: number
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["account_status"]
          system_role?: Database["public"]["Enums"]["system_role"]
          total_deliveries?: number
          total_trips?: number
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Update: {
          city?: string | null
          created_at?: string
          current_city?: string | null
          current_lat?: number | null
          current_lng?: number | null
          email?: string
          full_name?: string | null
          id?: string
          joined_at?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          location_updated_at?: string | null
          phone?: string | null
          profile_completed_at?: string | null
          push_token?: string | null
          rating?: number
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["account_status"]
          system_role?: Database["public"]["Enums"]["system_role"]
          total_deliveries?: number
          total_trips?: number
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_api_rate_limit: {
        Args: { p_action: string; p_user_id: string }
        Returns: boolean
      }
      check_auth_rate_limit: {
        Args: { p_email: string; p_type: string }
        Returns: boolean
      }
      check_username_available: {
        Args: { check_username: string; exclude_user_id?: string }
        Returns: boolean
      }
      cleanup_api_rate_limits: { Args: never; Returns: undefined }
      cleanup_auth_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      complete_delivery_command: {
        Args: { p_delivery_id: string; p_otp: string }
        Returns: {
          created_at: string
          delivery_confirmed: boolean
          delivery_confirmed_at: string
          id: string
          pickup_confirmed: boolean
          pickup_confirmed_at: string
          request_id: string
          status: Database["public"]["Enums"]["delivery_status"]
        }[]
      }
      confirm_delivery_pickup: {
        Args: { p_delivery_id: string }
        Returns: {
          created_at: string
          delivery_confirmed: boolean
          delivery_confirmed_at: string
          id: string
          pickup_confirmed: boolean
          pickup_confirmed_at: string
          request_id: string
          status: Database["public"]["Enums"]["delivery_status"]
        }[]
      }
      create_delivery: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          delivery_confirmed: boolean
          delivery_confirmed_at: string
          id: string
          pickup_confirmed: boolean
          pickup_confirmed_at: string
          request_id: string
          status: Database["public"]["Enums"]["delivery_status"]
        }[]
      }
      create_kyc_session: {
        Args: { p_full_name: string; p_id_type: string; p_user_id: string }
        Returns: undefined
      }
      create_request_command: {
        Args: {
          p_message?: string
          p_parcel_id: string
          p_price: number
          p_trip_id: string
        }
        Returns: {
          created_at: string
          id: string
          message: string
          parcel_id: string
          price: number
          sender_id: string
          sender_name: string
          status: Database["public"]["Enums"]["request_status"]
          traveller_id: string
          traveller_name: string
          trip_id: string
          updated_at: string
        }[]
      }
      emit_domain_event: {
        Args: {
          p_actor_id: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_payload?: Json
          p_topic: string
        }
        Returns: undefined
      }
      enforce_rate_limit: {
        Args: { p_action: string; p_user_id: string }
        Returns: undefined
      }
      generate_delivery_otp: {
        Args: never
        Returns: {
          otp_hash: string
          otp_plaintext: string
        }[]
      }
      generate_delivery_otp_hash: { Args: never; Returns: string }
      get_delivery_otp_status: {
        Args: { p_delivery_id: string }
        Returns: {
          attempts_remaining: number
          is_locked: boolean
          locked_until: string
          max_attempts: number
        }[]
      }
      get_system_role: {
        Args: never
        Returns: Database["public"]["Enums"]["system_role"]
      }
      increment_counter: {
        Args: { p_column: string; p_user_id: string }
        Returns: undefined
      }
      notify_route_subscribers: {
        Args: {
          p_body: string
          p_from_city: string
          p_listing_id: string
          p_listing_type: string
          p_title: string
          p_to_city: string
        }
        Returns: number
      }
      process_outbox_events: { Args: { p_limit?: number }; Returns: number }
      record_api_action: {
        Args: { p_action: string; p_user_id: string }
        Returns: undefined
      }
      record_auth_attempt: {
        Args: { p_email: string; p_success?: boolean; p_type: string }
        Returns: undefined
      }
      refund_payment_atomic: {
        Args: { p_actor_id: string; p_payment_id: string }
        Returns: boolean
      }
      release_payment_atomic: {
        Args: { p_actor_id: string; p_payment_id: string }
        Returns: boolean
      }
      send_chat_message_command: {
        Args: { p_conversation_id: string; p_text: string }
        Returns: {
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_name: string
          text: string
        }[]
      }
      submit_manual_kyc: {
        Args: { p_document_url: string; p_full_name: string; p_id_type: string }
        Returns: {
          address_proof_url: string | null
          created_at: string
          document_url: string | null
          full_name: string
          id: string
          id_back_url: string | null
          id_type: string
          provider: string
          provider_session_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submission_attempt: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_rating_command: {
        Args: {
          p_comment?: string
          p_rating: number
          p_request_id: string
          p_to_user_id: string
        }
        Returns: {
          comment: string
          created_at: string
          from_user_id: string
          id: string
          rating: number
          request_id: string
          to_user_id: string
        }[]
      }
      transition_request_status: {
        Args: {
          p_next_status: Database["public"]["Enums"]["request_status"]
          p_request_id: string
        }
        Returns: {
          created_at: string
          id: string
          message: string
          parcel_id: string
          price: number
          sender_id: string
          sender_name: string
          status: Database["public"]["Enums"]["request_status"]
          traveller_id: string
          traveller_name: string
          trip_id: string
          updated_at: string
        }[]
      }
      upsert_user_device: {
        Args: {
          p_app_version?: string
          p_device_key: string
          p_expo_push_token: string
          p_platform?: string
        }
        Returns: string
      }
      verify_delivery_otp: {
        Args: { p_delivery_id: string; p_otp: string }
        Returns: {
          delivery: Json
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      account_status: "active" | "banned"
      delivery_status:
        | "awaiting_pickup"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "failed"
      kyc_status: "pending" | "submitted" | "approved" | "rejected"
      notification_type:
        | "new_request"
        | "request_accepted"
        | "request_rejected"
        | "delivery_otp"
        | "rating"
        | "general"
        | "route_match"
        | "chat_message"
      parcel_category:
        | "documents"
        | "electronics"
        | "clothing"
        | "food"
        | "medicine"
        | "other"
      parcel_status: "open" | "matched" | "in_transit" | "delivered" | "failed"
      payment_status: "locked" | "released" | "refunded"
      request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "completed"
        | "failed"
      system_role: "user" | "support_agent" | "admin"
      trip_status: "active" | "completed" | "cancelled"
      user_role: "sender" | "traveller" | "both"
      vehicle_type: "bike" | "car" | "bus" | "train" | "flight"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "banned"],
      delivery_status: [
        "awaiting_pickup",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
      ],
      kyc_status: ["pending", "submitted", "approved", "rejected"],
      notification_type: [
        "new_request",
        "request_accepted",
        "request_rejected",
        "delivery_otp",
        "rating",
        "general",
        "route_match",
        "chat_message",
      ],
      parcel_category: [
        "documents",
        "electronics",
        "clothing",
        "food",
        "medicine",
        "other",
      ],
      parcel_status: ["open", "matched", "in_transit", "delivered", "failed"],
      payment_status: ["locked", "released", "refunded"],
      request_status: [
        "pending",
        "accepted",
        "rejected",
        "cancelled",
        "completed",
        "failed",
      ],
      system_role: ["user", "support_agent", "admin"],
      trip_status: ["active", "completed", "cancelled"],
      user_role: ["sender", "traveller", "both"],
      vehicle_type: ["bike", "car", "bus", "train", "flight"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
