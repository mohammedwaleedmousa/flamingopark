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
          related_order_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_order_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_order_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          event_type: string
          id: number
          metadata: Json | null
          order_id: string | null
          path: string | null
          product_id: string | null
          referrer: string | null
          session_id: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          value: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          id?: number
          metadata?: Json | null
          order_id?: string | null
          path?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          id?: number
          metadata?: Json | null
          order_id?: string | null
          path?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: number
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip_address?: string | null
        }
        Relationships: []
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
      brand_sections: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_sections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          countries: string[] | null
          created_at: string
          description: string | null
          hero_image: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          description?: string | null
          hero_image?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          description?: string | null
          hero_image?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          countries: string[] | null
          created_at: string
          description_ar: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_ar: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_ar: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      customer_notifications: {
        Row: {
          body: string
          broadcast: boolean
          country: string | null
          created_at: string
          customer_id: string | null
          customer_phone: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body: string
          broadcast?: boolean
          country?: string | null
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          broadcast?: boolean
          country?: string | null
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      expense_categories: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method_id: string | null
          receipt_url: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payment_method_fk"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          id: string
          is_posted: boolean
          reference: string | null
          source_id: string | null
          source_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
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
      inventory_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string | null
          product_name: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string
          reference: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity_after: number
          quantity_before?: number
          quantity_change: number
          reason: string
          reference?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string
          reference?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          country?: string
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
      payment_methods: {
        Row: {
          account_id: string | null
          code: string
          created_at: string
          details: Json | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          code: string
          created_at?: string
          details?: Json | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          code?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settlements: {
        Row: {
          actual_amount: number
          created_at: string
          created_by: string | null
          difference: number | null
          expected_amount: number
          id: string
          notes: string | null
          payment_method_id: string | null
          settlement_date: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          created_at?: string
          created_by?: string | null
          difference?: number | null
          expected_amount?: number
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          settlement_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          created_at?: string
          created_by?: string | null
          difference?: number | null
          expected_amount?: number
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          settlement_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_settlements_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          country: string
          created_at: string
          customer_name: string
          id: string
          images: string[] | null
          is_approved: boolean | null
          product_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          country: string
          created_at?: string
          customer_name: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          product_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          country?: string
          created_at?: string
          customer_name?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          accessories: Json | null
          brand: string
          category: string
          color_variants: Json
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
          color_variants?: Json
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
          color_variants?: Json
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          order_number: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string
          refund_method: string
          refund_number: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          refund_method?: string
          refund_number?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          refund_method?: string
          refund_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      transaction_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
