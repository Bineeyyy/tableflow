export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          slug: Database["public"]["Enums"]["menu_category_slug"]
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          slug: Database["public"]["Enums"]["menu_category_slug"]
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          slug?: Database["public"]["Enums"]["menu_category_slug"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          closed_at: string | null
          created_by: string | null
          guests: number
          id: string
          notes: string | null
          opened_at: string
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_id: string | null
          total: number
        }
        Insert: {
          closed_at?: string | null
          created_by?: string | null
          guests?: number
          id?: string
          notes?: string | null
          opened_at?: string
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          total?: number
        }
        Update: {
          closed_at?: string | null
          created_by?: string | null
          guests?: number
          id?: string
          notes?: string | null
          opened_at?: string
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          party_size: number
          reserved_date: string
          reserved_time: string
          restaurant_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          table_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          party_size: number
          reserved_date: string
          reserved_time: string
          restaurant_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          reserved_date?: string
          reserved_time?: string
          restaurant_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_members: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          created_at: string
          current_guests: number
          id: string
          label: string | null
          number: number
          pos_x: number
          pos_y: number
          restaurant_id: string
          seated_at: string | null
          seats: number
          shape: Database["public"]["Enums"]["table_shape"]
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          current_guests?: number
          id?: string
          label?: string | null
          number: number
          pos_x?: number
          pos_y?: number
          restaurant_id: string
          seated_at?: string | null
          seats?: number
          shape?: Database["public"]["Enums"]["table_shape"]
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          current_guests?: number
          id?: string
          label?: string | null
          number?: number
          pos_x?: number
          pos_y?: number
          restaurant_id?: string
          seated_at?: string | null
          seats?: number
          shape?: Database["public"]["Enums"]["table_shape"]
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          operating_hours: Json | null
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["restaurant_plan"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          operating_hours?: Json | null
          owner_id: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          operating_hours?: Json | null
          owner_id?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          livemode: boolean
          received_at: string
          type: string
        }
        Insert: {
          id: string
          livemode: boolean
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          livemode?: boolean
          received_at?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      has_restaurant_access: { Args: { r_id: string }; Returns: boolean }
    }
    Enums: {
      member_role: "owner" | "manager" | "staff"
      menu_category_slug: "starters" | "mains" | "salads" | "desserts" | "drinks"
      order_status: "open" | "closed" | "cancelled"
      reservation_status: "pending" | "confirmed" | "seated" | "completed" | "cancelled"
      restaurant_plan: "free" | "pro" | "enterprise"
      table_shape: "round" | "square" | "rectangle"
      table_status: "available" | "occupied"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]

// Convenience row types
export type Profile         = Tables<"profiles">
export type Restaurant      = Tables<"restaurants">
export type RestaurantMember = Tables<"restaurant_members">
export type RestaurantTable = Tables<"restaurant_tables">
export type Order           = Tables<"orders">
export type MenuCategory    = Tables<"menu_categories">
export type MenuItem        = Tables<"menu_items">
export type Reservation     = Tables<"reservations">

export const Constants = {
  public: {
    Enums: {
      member_role: ["owner", "manager", "staff"],
      menu_category_slug: ["starters", "mains", "salads", "desserts", "drinks"],
      order_status: ["open", "closed", "cancelled"],
      reservation_status: ["pending", "confirmed", "seated", "completed", "cancelled"],
      restaurant_plan: ["free", "pro", "enterprise"],
      table_shape: ["round", "square", "rectangle"],
      table_status: ["available", "occupied"],
    },
  },
} as const
