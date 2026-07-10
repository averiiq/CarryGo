export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          full_name: string | null;
          phone: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          profile_completed_at: string | null;
          rating: number;
          total_deliveries: number;
          total_trips: number;
          verified: boolean;
          push_token: string | null;
          kyc_status: Database['public']['Enums']['kyc_status'];
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          user_rating: number;
          from_city: string;
          to_city: string;
          date: string;
          time: string;
          vehicle_type: Database['public']['Enums']['vehicle_type'];
          available_capacity: number;
          price_per_kg: number;
          status: Database['public']['Enums']['trip_status'];
          created_at: string;
          updated_at: string;
        };
      };
      parcels: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          from_city: string;
          to_city: string;
          category: Database['public']['Enums']['parcel_category'];
          description: string;
          delivery_date: string | null;
          weight: number;
          price_offer: number;
          image_url: string | null;
          status: Database['public']['Enums']['parcel_status'];
          created_at: string;
          updated_at: string;
        };
      };
      requests: {
        Row: {
          id: string;
          parcel_id: string;
          trip_id: string;
          sender_id: string;
          sender_name: string;
          traveller_id: string;
          traveller_name: string;
          status: Database['public']['Enums']['request_status'];
          price: number;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          request_id: string;
          pickup_confirmed: boolean;
          pickup_confirmed_at: string | null;
          delivery_confirmed: boolean;
          delivery_confirmed_at: string | null;
          traveller_lat: number | null;
          traveller_lng: number | null;
          location_updated_at: string | null;
          status: Database['public']['Enums']['delivery_status'];
          created_at: string;
          updated_at: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          request_id: string;
          participant_ids: string[];
          participant_names: Json;
          route: string;
          parcel_description: string;
          last_message_text: string | null;
          last_message_sender_id: string | null;
          last_message_at: string | null;
          last_message_read: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          sender_name: string;
          text: string;
          read: boolean;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          request_id: string;
          sender_id: string;
          traveller_id: string;
          amount: number;
          status: Database['public']['Enums']['payment_status'];
          locked_at: string;
          released_at: string | null;
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: Database['public']['Enums']['notification_type'];
          related_id: string | null;
          read: boolean;
          created_at: string;
        };
      };
      user_devices: {
        Row: {
          id: string;
          user_id: string;
          device_key: string;
          expo_push_token: string;
          platform: string | null;
          app_version: string | null;
          failure_count: number;
          invalidated_at: string | null;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
      };
      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string;
          user_device_id: string;
          expo_ticket_id: string | null;
          expo_receipt_id: string | null;
          status: string;
          attempt_count: number;
          last_error: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          checked_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          request_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
      };
      route_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          from_city: string;
          to_city: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      kyc_sessions: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          id_type: string;
          provider: string;
          provider_session_id: string | null;
          status: Database['public']['Enums']['kyc_status'];
          created_at: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_delivery: {
        Args: { p_request_id: string };
        Returns: Database['public']['Tables']['deliveries']['Row'];
      };
      verify_delivery_otp: {
        Args: { p_delivery_id: string; p_otp: string };
        Returns: undefined;
      };
      upsert_user_device: {
        Args: {
          p_device_key: string;
          p_expo_push_token: string;
          p_platform?: string | null;
          p_app_version?: string | null;
        };
        Returns: string;
      };
      notify_route_subscribers: {
        Args: {
          p_listing_type: string;
          p_listing_id: string;
          p_from_city: string;
          p_to_city: string;
          p_title: string;
          p_body: string;
        };
        Returns: number;
      };
      send_chat_message_command: {
        Args: {
          p_conversation_id: string;
          p_text: string;
        };
        Returns: Database['public']['Tables']['messages']['Row'];
      };
      create_kyc_session: {
        Args: { p_user_id: string; p_full_name: string; p_id_type: string };
        Returns: undefined;
      };
    };
    Enums: {
      kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected';
      user_role: 'sender' | 'traveller' | 'both';
      vehicle_type: 'bike' | 'car' | 'bus' | 'train' | 'flight';
      trip_status: 'active' | 'completed' | 'cancelled';
      parcel_category: 'documents' | 'electronics' | 'clothing' | 'food' | 'medicine' | 'other';
      parcel_status: 'open' | 'matched' | 'in_transit' | 'delivered' | 'failed';
      request_status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'failed';
      delivery_status: 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
      payment_status: 'locked' | 'released' | 'refunded';
      notification_type: 'new_request' | 'request_accepted' | 'request_rejected' | 'delivery_otp' | 'rating' | 'general' | 'route_match' | 'chat_message';
    };
  };
};
