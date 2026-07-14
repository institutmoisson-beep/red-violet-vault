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
      delivery_orders: {
        Row: {
          campaign_id: string
          created_at: string
          deadline_at: string
          delivered_at: string | null
          draw_event_id: string
          id: string
          shipping_address: string | null
          shipping_city: string | null
          shipping_phone: string | null
          status: string
          updated_at: string
          winner_user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          deadline_at?: string
          delivered_at?: string | null
          draw_event_id: string
          id?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_phone?: string | null
          status?: string
          updated_at?: string
          winner_user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          deadline_at?: string
          delivered_at?: string | null
          draw_event_id?: string
          id?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_phone?: string | null
          status?: string
          updated_at?: string
          winner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tontine_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_draw_event_id_fkey"
            columns: ["draw_event_id"]
            isOneToOne: true
            referencedRelation: "draw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_events: {
        Row: {
          broadcast_text: string | null
          campaign_id: string
          cycle_number: number
          executed_at: string
          id: string
          winner_avatar_url: string | null
          winner_draw_code: string
          winner_first_name: string | null
          winner_last_name: string | null
          winner_user_id: string
        }
        Insert: {
          broadcast_text?: string | null
          campaign_id: string
          cycle_number: number
          executed_at?: string
          id?: string
          winner_avatar_url?: string | null
          winner_draw_code: string
          winner_first_name?: string | null
          winner_last_name?: string | null
          winner_user_id: string
        }
        Update: {
          broadcast_text?: string | null
          campaign_id?: string
          cycle_number?: number
          executed_at?: string
          id?: string
          winner_avatar_url?: string | null
          winner_draw_code?: string
          winner_first_name?: string | null
          winner_last_name?: string | null
          winner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tontine_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          admin_note: string | null
          amount: number
          associated_campaign_id: string | null
          created_at: string
          currency: string
          destination_details: string | null
          gateway_id: string | null
          id: string
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          proof_screenshot_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_reference: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          associated_campaign_id?: string | null
          created_at?: string
          currency?: string
          destination_details?: string | null
          gateway_id?: string | null
          id?: string
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          proof_screenshot_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          associated_campaign_id?: string | null
          created_at?: string
          currency?: string
          destination_details?: string | null
          gateway_id?: string | null
          id?: string
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          proof_screenshot_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_associated_campaign_id_fkey"
            columns: ["associated_campaign_id"]
            isOneToOne: false
            referencedRelation: "tontine_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          account_details: string | null
          created_at: string
          deep_link_template: string | null
          id: string
          is_active: boolean
          logo: string | null
          method_key: string
          method_name: string
          network: string | null
          provider: string
          supports_recharge: boolean
          supports_withdrawal: boolean
          updated_at: string
          ussd_template_syntax: string | null
          wallet_address: string | null
        }
        Insert: {
          account_details?: string | null
          created_at?: string
          deep_link_template?: string | null
          id?: string
          is_active?: boolean
          logo?: string | null
          method_key: string
          method_name: string
          network?: string | null
          provider: string
          supports_recharge?: boolean
          supports_withdrawal?: boolean
          updated_at?: string
          ussd_template_syntax?: string | null
          wallet_address?: string | null
        }
        Update: {
          account_details?: string | null
          created_at?: string
          deep_link_template?: string | null
          id?: string
          is_active?: boolean
          logo?: string | null
          method_key?: string
          method_name?: string
          network?: string | null
          provider?: string
          supports_recharge?: boolean
          supports_withdrawal?: boolean
          updated_at?: string
          ussd_template_syntax?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          ai_fraud_notes: string | null
          ai_fraud_score: number | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          id: string
          id_card_recto_url: string | null
          id_card_verso_url: string | null
          kyc_rejection_reason: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at: string | null
          kyc_verified_at: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          preferred_currency: string | null
          preferred_language: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          ai_fraud_notes?: string | null
          ai_fraud_score?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          id: string
          id_card_recto_url?: string | null
          id_card_verso_url?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          ai_fraud_notes?: string | null
          ai_fraud_score?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          id_card_recto_url?: string | null
          id_card_verso_url?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      tontine_campaigns: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_cycle: number
          current_participants_count: number
          description: string | null
          draw_hour_utc: number
          end_date: string | null
          frequency_days: number
          id: string
          images: string[]
          installment_price: number
          max_participants: number
          next_draw_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          total_price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_cycle?: number
          current_participants_count?: number
          description?: string | null
          draw_hour_utc?: number
          end_date?: string | null
          frequency_days?: number
          id?: string
          images?: string[]
          installment_price: number
          max_participants: number
          next_draw_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
          total_price: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_cycle?: number
          current_participants_count?: number
          description?: string | null
          draw_hour_utc?: number
          end_date?: string | null
          frequency_days?: number
          id?: string
          images?: string[]
          installment_price?: number
          max_participants?: number
          next_draw_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tontine_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name_en: string
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          name_en: string
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name_en?: string
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      tontine_participants: {
        Row: {
          campaign_id: string
          draw_win_cycle_number: number | null
          has_won: boolean
          id: string
          joined_at: string
          unique_draw_code: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          draw_win_cycle_number?: number | null
          has_won?: boolean
          id?: string
          joined_at?: string
          unique_draw_code: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          draw_win_cycle_number?: number | null
          has_won?: boolean
          id?: string
          joined_at?: string
          unique_draw_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tontine_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_payments_ledger: {
        Row: {
          amount: number
          campaign_id: string
          cycle_number: number
          id: string
          note: string | null
          payment_timestamp: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          campaign_id: string
          cycle_number: number
          id?: string
          note?: string | null
          payment_timestamp?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          cycle_number?: number
          id?: string
          note?: string | null
          payment_timestamp?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_payments_ledger_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tontine_campaigns"
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
          role: Database["public"]["Enums"]["app_role"]
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          note: string | null
          reference: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          note?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          currency: string
          debt: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          currency?: string
          debt?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: string
          debt?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_campaign_participant: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      is_verified: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      campaign_status: "DRAFT" | "OPEN" | "ACTIVE" | "COMPLETED" | "CANCELLED"
      kyc_status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED"
      payment_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "PROCESSING"
        | "DISBURSED"
      transaction_type:
        | "PURCHASE"
        | "RECHARGE"
        | "WITHDRAWAL"
        | "INSTALLMENT"
        | "REFUND"
      wallet_tx_type: "CREDIT" | "DEBIT"
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
      app_role: ["admin", "user"],
      campaign_status: ["DRAFT", "OPEN", "ACTIVE", "COMPLETED", "CANCELLED"],
      kyc_status: ["PENDING_VERIFICATION", "VERIFIED", "REJECTED"],
      payment_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "PROCESSING",
        "DISBURSED",
      ],
      transaction_type: [
        "PURCHASE",
        "RECHARGE",
        "WITHDRAWAL",
        "INSTALLMENT",
        "REFUND",
      ],
      wallet_tx_type: ["CREDIT", "DEBIT"],
    },
  },
} as const
