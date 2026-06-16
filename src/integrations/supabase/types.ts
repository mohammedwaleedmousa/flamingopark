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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_beneficiary_id: string | null
          related_order_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_beneficiary_id?: string | null
          related_order_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_beneficiary_id?: string | null
          related_order_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_related_beneficiary_id_fkey"
            columns: ["related_beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          countries: string[] | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          cta_text_ar: string | null
          id: string
          image_position_x: number | null
          image_position_y: number | null
          image_url: string
          image_zoom: number | null
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          subtitle_ar: string | null
          title: string
          title_ar: string
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          cta_text_ar?: string | null
          id?: string
          image_position_x?: number | null
          image_position_y?: number | null
          image_url: string
          image_zoom?: number | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          subtitle_ar?: string | null
          title: string
          title_ar: string
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          cta_text_ar?: string | null
          id?: string
          image_position_x?: number | null
          image_position_y?: number | null
          image_url?: string
          image_zoom?: number | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          subtitle_ar?: string | null
          title?: string
          title_ar?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          code: string
          commission_percentage: number
          country: string | null
          created_at: string
          discount_percentage: number
          email: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          name: string
          password_hash: string | null
          phone: string | null
          registered_at: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          commission_percentage?: number
          country?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          name: string
          password_hash?: string | null
          phone?: string | null
          registered_at?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          commission_percentage?: number
          country?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          name?: string
          password_hash?: string | null
          phone?: string | null
          registered_at?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      beneficiary_visits: {
        Row: {
          beneficiary_id: string
          converted_to_order: boolean | null
          id: string
          order_id: string | null
          visited_at: string
          visitor_info: string | null
          visitor_ip: string | null
        }
        Insert: {
          beneficiary_id: string
          converted_to_order?: boolean | null
          id?: string
          order_id?: string | null
          visited_at?: string
          visitor_info?: string | null
          visitor_ip?: string | null
        }
        Update: {
          beneficiary_id?: string
          converted_to_order?: boolean | null
          id?: string
          order_id?: string | null
          visited_at?: string
          visitor_info?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_visits_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_visits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          countries: string[] | null
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          countries: string[] | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_ar: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_ar: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      certification_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      cod_regions: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean | null
          region_name: string
          region_name_ar: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          region_name: string
          region_name_ar: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          region_name?: string
          region_name_ar?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          countries: string[] | null
          created_at: string
          id: string
          is_active: boolean | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          type?: string
          updated_at?: string
          value?: number
        }
        Update: {
          code?: string
          countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_companies: {
        Row: {
          base_fee: number
          country: string
          created_at: string
          delivery_days: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          base_fee?: number
          country: string
          created_at?: string
          delivery_days?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          base_fee?: number
          country?: string
          created_at?: string
          delivery_days?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          countries: string[] | null
          created_at: string
          filter_type: string | null
          id: string
          is_active: boolean | null
          max_products: number | null
          section_type: string
          show_view_all: boolean | null
          sort_order: number | null
          title: string
          title_ar: string
          updated_at: string
          view_all_link: string | null
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          filter_type?: string | null
          id?: string
          is_active?: boolean | null
          max_products?: number | null
          section_type?: string
          show_view_all?: boolean | null
          sort_order?: number | null
          title: string
          title_ar: string
          updated_at?: string
          view_all_link?: string | null
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          filter_type?: string | null
          id?: string
          is_active?: boolean | null
          max_products?: number | null
          section_type?: string
          show_view_all?: boolean | null
          sort_order?: number | null
          title?: string
          title_ar?: string
          updated_at?: string
          view_all_link?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          countries: string[] | null
          created_at: string
          description: string | null
          description_ar: string | null
          discount_code: string | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          product_ids: string[] | null
          sort_order: number | null
          start_date: string | null
          subtitle: string | null
          subtitle_ar: string | null
          title: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          product_ids?: string[] | null
          sort_order?: number | null
          start_date?: string | null
          subtitle?: string | null
          subtitle_ar?: string | null
          title: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          product_ids?: string[] | null
          sort_order?: number | null
          start_date?: string | null
          subtitle?: string | null
          subtitle_ar?: string | null
          title?: string
          title_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      offers_settings: {
        Row: {
          countdown_end_date: string | null
          countries: string[] | null
          id: string
          page_subtitle: string | null
          page_title: string | null
          promo_banner_text: string | null
          show_countdown: boolean | null
          show_promo_banner: boolean | null
          updated_at: string
        }
        Insert: {
          countdown_end_date?: string | null
          countries?: string[] | null
          id?: string
          page_subtitle?: string | null
          page_title?: string | null
          promo_banner_text?: string | null
          show_countdown?: boolean | null
          show_promo_banner?: boolean | null
          updated_at?: string
        }
        Update: {
          countdown_end_date?: string | null
          countries?: string[] | null
          id?: string
          page_subtitle?: string | null
          page_title?: string | null
          promo_banner_text?: string | null
          show_countdown?: boolean | null
          show_promo_banner?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          beneficiary_code: string | null
          beneficiary_commission: number | null
          beneficiary_id: string | null
          country: string
          coupon_code: string | null
          created_at: string
          customer_address: string
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          delivery_company_id: string | null
          delivery_fee: number
          discount_amount: number | null
          id: string
          invoice_url: string | null
          items: Json
          order_number: string
          payment_method: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          beneficiary_code?: string | null
          beneficiary_commission?: number | null
          beneficiary_id?: string | null
          country: string
          coupon_code?: string | null
          created_at?: string
          customer_address: string
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          delivery_company_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          id?: string
          invoice_url?: string | null
          items?: Json
          order_number: string
          payment_method: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          beneficiary_code?: string | null
          beneficiary_commission?: number | null
          beneficiary_id?: string | null
          country?: string
          coupon_code?: string | null
          created_at?: string
          customer_address?: string
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          delivery_company_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          id?: string
          invoice_url?: string | null
          items?: Json
          order_number?: string
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_company_id_fkey"
            columns: ["delivery_company_id"]
            isOneToOne: false
            referencedRelation: "delivery_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_archive: {
        Row: {
          archived_at: string
          beneficiary_code: string | null
          beneficiary_commission: number | null
          beneficiary_id: string | null
          country: string
          coupon_code: string | null
          created_at: string
          customer_address: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          delivery_fee: number
          discount_amount: number | null
          id: string
          invoice_url: string | null
          items: Json
          order_number: string
          original_order_id: string
          payment_method: string
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          archived_at?: string
          beneficiary_code?: string | null
          beneficiary_commission?: number | null
          beneficiary_id?: string | null
          country: string
          coupon_code?: string | null
          created_at?: string
          customer_address: string
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          delivery_fee?: number
          discount_amount?: number | null
          id?: string
          invoice_url?: string | null
          items?: Json
          order_number: string
          original_order_id: string
          payment_method: string
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          archived_at?: string
          beneficiary_code?: string | null
          beneficiary_commission?: number | null
          beneficiary_id?: string | null
          country?: string
          coupon_code?: string | null
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          delivery_fee?: number
          discount_amount?: number | null
          id?: string
          invoice_url?: string | null
          items?: Json
          order_number?: string
          original_order_id?: string
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          country: string
          created_at: string
          customer_name: string
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          country: string
          created_at?: string
          customer_name: string
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          country?: string
          created_at?: string
          customer_name?: string
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          accessories: Json | null
          brand: string
          category: string
          cost_price: number | null
          countries: string[] | null
          created_at: string
          description: string | null
          description_ar: string | null
          discount: number | null
          features: Json | null
          has_sizes: boolean | null
          id: string
          images: string[] | null
          in_stock: boolean | null
          is_active: boolean | null
          is_best_seller: boolean | null
          is_featured: boolean | null
          name: string
          name_ar: string
          original_price: number | null
          price: number
          section_ids: string[] | null
          sizes: string[] | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          accessories?: Json | null
          brand: string
          category: string
          cost_price?: number | null
          countries?: string[] | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          discount?: number | null
          features?: Json | null
          has_sizes?: boolean | null
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_active?: boolean | null
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          name: string
          name_ar: string
          original_price?: number | null
          price: number
          section_ids?: string[] | null
          sizes?: string[] | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          accessories?: Json | null
          brand?: string
          category?: string
          cost_price?: number | null
          countries?: string[] | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          discount?: number | null
          features?: Json | null
          has_sizes?: boolean | null
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_active?: boolean | null
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_ar?: string
          original_price?: number | null
          price?: number
          section_ids?: string[] | null
          sizes?: string[] | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          country: string
          created_at: string
          customer_name: string
          id: string
          is_approved: boolean | null
          message: string
          message_ar: string | null
          rating: number
        }
        Insert: {
          country: string
          created_at?: string
          customer_name: string
          id?: string
          is_approved?: boolean | null
          message: string
          message_ar?: string | null
          rating: number
        }
        Update: {
          country?: string
          created_at?: string
          customer_name?: string
          id?: string
          is_approved?: boolean | null
          message?: string
          message_ar?: string | null
          rating?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: string
          content_ar: string
          created_at: string
          description: string | null
          id: string
          key: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          content_ar?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_ar?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
