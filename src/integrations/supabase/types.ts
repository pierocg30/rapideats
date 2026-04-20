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
      circuit_state: {
        Row: {
          failures: number
          opened_at: string | null
          service: string
          status: Database["public"]["Enums"]["circuit_status"]
          successes: number
          updated_at: string
          window_start: string
        }
        Insert: {
          failures?: number
          opened_at?: string | null
          service: string
          status?: Database["public"]["Enums"]["circuit_status"]
          successes?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          failures?: number
          opened_at?: string | null
          service?: string
          status?: Database["public"]["Enums"]["circuit_status"]
          successes?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      dlq: {
        Row: {
          attempts: number
          consumer: string
          created_at: string
          error: string | null
          event_id: string | null
          id: string
          next_retry_at: string | null
          payload: Json
          topic: string
        }
        Insert: {
          attempts?: number
          consumer: string
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          next_retry_at?: string | null
          payload: Json
          topic: string
        }
        Update: {
          attempts?: number
          consumer?: string
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          topic?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          available: boolean
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          name: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          name: string
        }
        Update: {
          available?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          aggregate_id: string | null
          created_at: string
          headers: Json
          id: string
          payload: Json
          topic: string
        }
        Insert: {
          aggregate_id?: string | null
          created_at?: string
          headers?: Json
          id?: string
          payload?: Json
          topic: string
        }
        Update: {
          aggregate_id?: string | null
          created_at?: string
          headers?: Json
          id?: string
          payload?: Json
          topic?: string
        }
        Relationships: []
      }
      gps_pings: {
        Row: {
          created_at: string
          driver_id: string | null
          id: number
          lat: number
          lng: number
          order_id: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: number
          lat: number
          lng: number
          order_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: number
          lat?: number
          lng?: number
          order_id?: string
        }
        Relationships: []
      }
      matching_state: {
        Row: {
          expires_at: string
          matched_at: string | null
          order_id: string
          payment_done: boolean
          restaurant_done: boolean
        }
        Insert: {
          expires_at?: string
          matched_at?: string | null
          order_id: string
          payment_done?: boolean
          restaurant_done?: boolean
        }
        Update: {
          expires_at?: string
          matched_at?: string | null
          order_id?: string
          payment_done?: boolean
          restaurant_done?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          delivery_address: string | null
          driver_id: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          eta_minutes: number | null
          id: string
          items: Json
          notes: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          restaurant_id: string | null
          restaurant_name: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          delivery_address?: string | null
          driver_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          eta_minutes?: number | null
          id?: string
          items?: Json
          notes?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          restaurant_id?: string | null
          restaurant_name: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          delivery_address?: string | null
          driver_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          eta_minutes?: number | null
          id?: string
          items?: Json
          notes?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          restaurant_id?: string | null
          restaurant_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      processed_events: {
        Row: {
          consumer: string
          event_id: string
          processed_at: string
        }
        Insert: {
          consumer: string
          event_id: string
          processed_at?: string
        }
        Update: {
          consumer?: string
          event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          restaurant_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          restaurant_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          category: string
          created_at: string
          delivery_fee: number
          delivery_minutes: number
          id: string
          image_url: string | null
          lat: number
          lng: number
          name: string
          rating: number
        }
        Insert: {
          category: string
          created_at?: string
          delivery_fee?: number
          delivery_minutes?: number
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          name: string
          rating?: number
        }
        Update: {
          category?: string
          created_at?: string
          delivery_fee?: number
          delivery_minutes?: number
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          name?: string
          rating?: number
        }
        Relationships: []
      }
      saga_executions: {
        Row: {
          context: Json
          created_at: string
          current_step: number
          id: string
          order_id: string | null
          saga_type: string
          status: Database["public"]["Enums"]["saga_status"]
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_step?: number
          id?: string
          order_id?: string | null
          saga_type: string
          status?: Database["public"]["Enums"]["saga_status"]
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_step?: number
          id?: string
          order_id?: string | null
          saga_type?: string
          status?: Database["public"]["Enums"]["saga_status"]
          updated_at?: string
        }
        Relationships: []
      }
      saga_steps: {
        Row: {
          created_at: string
          error: string | null
          id: string
          name: string
          output: Json | null
          saga_id: string
          status: string
          step_index: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          name: string
          output?: Json | null
          saga_id: string
          status: string
          step_index: number
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          name?: string
          output?: Json | null
          saga_id?: string
          status?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "saga_steps_saga_id_fkey"
            columns: ["saga_id"]
            isOneToOne: false
            referencedRelation: "saga_executions"
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
      circuit_status: "closed" | "open" | "half_open"
      order_status:
        | "created"
        | "payment_pending"
        | "payment_processed"
        | "restaurant_confirmed"
        | "matched"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "refunded"
      saga_status: "running" | "completed" | "failed" | "compensated"
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
      circuit_status: ["closed", "open", "half_open"],
      order_status: [
        "created",
        "payment_pending",
        "payment_processed",
        "restaurant_confirmed",
        "matched",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
        "refunded",
      ],
      saga_status: ["running", "completed", "failed", "compensated"],
    },
  },
} as const
