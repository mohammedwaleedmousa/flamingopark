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
      admin_approval_requests: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          id: string
          payload: Json
          request_type: string
          requested_at: string
          requested_by: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json
          request_type: string
          requested_at?: string
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json
          request_type?: string
          requested_at?: string
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_change_revisions: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
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
      admin_preferences: {
        Row: {
          created_at: string
          dashboard_layout: Json
          favorite_routes: string[]
          preferences: Json
          quick_actions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_layout?: Json
          favorite_routes?: string[]
          preferences?: Json
          quick_actions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_layout?: Json
          favorite_routes?: string[]
          preferences?: Json
          quick_actions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          permission?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          ends_at: string | null
          id: string
          image_position_x: number | null
          image_position_y: number | null
          image_url: string
          image_zoom: number | null
          is_active: boolean | null
          page_content: string | null
          page_content_ar: string | null
          page_slug: string | null
          page_title_ar: string | null
          sort_order: number | null
          starts_at: string | null
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
          ends_at?: string | null
          id?: string
          image_position_x?: number | null
          image_position_y?: number | null
          image_url: string
          image_zoom?: number | null
          is_active?: boolean | null
          page_content?: string | null
          page_content_ar?: string | null
          page_slug?: string | null
          page_title_ar?: string | null
          sort_order?: number | null
          starts_at?: string | null
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
          ends_at?: string | null
          id?: string
          image_position_x?: number | null
          image_position_y?: number | null
          image_url?: string
          image_zoom?: number | null
          is_active?: boolean | null
          page_content?: string | null
          page_content_ar?: string | null
          page_slug?: string | null
          page_title_ar?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          subtitle_ar?: string | null
          title?: string
          title_ar?: string
        }
        Relationships: []
      }
      brand_banners: {
        Row: {
          brand_page_id: string
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link: string | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          brand_page_id: string
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_page_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_banners_brand_page_id_fkey"
            columns: ["brand_page_id"]
            isOneToOne: false
            referencedRelation: "brand_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_categories: {
        Row: {
          brand_id: string
          category_id: string
          created_at: string
          id: string
        }
        Insert: {
          brand_id: string
          category_id: string
          created_at?: string
          id?: string
        }
        Update: {
          brand_id?: string
          category_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_filters: {
        Row: {
          brand_id: string | null
          created_at: string | null
          filter_type: string
          id: string
          is_active: boolean | null
          name: string
          options: Json
          section_id: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          filter_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          options?: Json
          section_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          filter_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          options?: Json
          section_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_filters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_filters_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "brand_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_pages: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          hero_image: string | null
          id: string
          is_active: boolean | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          hero_image?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          hero_image?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_pages_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_section_pages: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          section_id: string | null
          slug: string | null
          title: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          section_id?: string | null
          slug?: string | null
          title?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          section_id?: string | null
          slug?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_section_pages_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "brand_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_section_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_section_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_section_products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "brand_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_sections: {
        Row: {
          brand_id: string | null
          brand_page_id: string
          category_name: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          brand_page_id: string
          category_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          brand_page_id?: string
          category_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
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
          {
            foreignKeyName: "brand_sections_brand_page_id_fkey"
            columns: ["brand_page_id"]
            isOneToOne: false
            referencedRelation: "brand_pages"
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
      campaign_pages: {
        Row: {
          badge_text: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          description: string | null
          description_ar: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          mobile_image_url: string | null
          page_type: string
          product_ids: string[]
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          starts_at: string | null
          title: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          description_ar?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          mobile_image_url?: string | null
          page_type?: string
          product_ids?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          starts_at?: string | null
          title: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          description_ar?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          mobile_image_url?: string | null
          page_type?: string
          product_ids?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          starts_at?: string | null
          title?: string
          title_ar?: string
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
      countries: {
        Row: {
          code: string
          created_at: string
          default_currency: string | null
          flag_emoji: string | null
          is_active: boolean
          is_featured: boolean
          name_ar: string
          name_en: string
          phone_code: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_currency?: string | null
          flag_emoji?: string | null
          is_active?: boolean
          is_featured?: boolean
          name_ar: string
          name_en: string
          phone_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_currency?: string | null
          flag_emoji?: string | null
          is_active?: boolean
          is_featured?: boolean
          name_ar?: string
          name_en?: string
          phone_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
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
      currencies: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          is_base: boolean
          name_ar: string
          name_en: string
          rate_to_base: number
          sort_order: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          is_base?: boolean
          name_ar: string
          name_en: string
          rate_to_base?: number
          sort_order?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          is_base?: boolean
          name_ar?: string
          name_en?: string
          rate_to_base?: number
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line1: string
          city: string
          created_at: string
          customer_id: string | null
          id: string
          is_default: boolean
          label: string
          notes: string | null
          phone: string
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          city: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          city?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_assistant_rate_limits: {
        Row: {
          client_hash: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          client_hash: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          client_hash?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      customer_carts: {
        Row: {
          abandoned_at: string | null
          cart_value: number
          converted_order_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          item_count: number
          items: Json
          last_activity_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          cart_value?: number
          converted_order_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          item_count?: number
          items?: Json
          last_activity_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          cart_value?: number
          converted_order_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          item_count?: number
          items?: Json
          last_activity_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_carts_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_internal_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          is_pinned: boolean
          note: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          is_pinned?: boolean
          note: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          is_pinned?: boolean
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_internal_notes_customer_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_login_limits: {
        Row: {
          attempt_count: number
          phone_key: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempt_count?: number
          phone_key: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          attempt_count?: number
          phone_key?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      customer_notification_states: {
        Row: {
          is_deleted: boolean
          is_read: boolean
          notification_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_deleted?: boolean
          is_read?: boolean
          notification_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_deleted?: boolean
          is_read?: boolean
          notification_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_notifications: {
        Row: {
          body: string | null
          broadcast: boolean | null
          country: string | null
          created_at: string | null
          customer_id: string | null
          customer_phone: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          related_order_id: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          broadcast?: boolean | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          related_order_id?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          broadcast?: boolean | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          related_order_id?: string | null
          title?: string
          type?: string | null
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
      customer_sessions: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          token: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          password_hash: string | null
          phone: string
          region: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          password_hash?: string | null
          phone: string
          region?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          password_hash?: string | null
          phone?: string
          region?: string | null
          updated_at?: string
          user_id?: string | null
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
          service_scope: string
        }
        Insert: {
          base_fee?: number
          country: string
          created_at?: string
          delivery_days?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          service_scope?: string
        }
        Update: {
          base_fee?: number
          country?: string
          created_at?: string
          delivery_days?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          service_scope?: string
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
          amount_base: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          currency_mode: string
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
          amount_base?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          currency_mode?: string
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
          amount_base?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          currency_mode?: string
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
            foreignKeyName: "expenses_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
          amount_base: number | null
          created_at: string
          created_by: string | null
          currency_code: string | null
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
          amount_base?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
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
          amount_base?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
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
          inventory_sku_id: string | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          product_quantity_after: number | null
          product_quantity_before: number | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string
          reference: string | null
          total_cost: number | null
          unit_cost: number | null
          variant_label: string | null
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_sku_id?: string | null
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          product_quantity_after?: number | null
          product_quantity_before?: number | null
          quantity_after: number
          quantity_before?: number
          quantity_change: number
          reason: string
          reference?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          variant_label?: string | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_sku_id?: string | null
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          product_quantity_after?: number | null
          product_quantity_before?: number | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string
          reference?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_inventory_sku_id_fkey"
            columns: ["inventory_sku_id"]
            isOneToOne: false
            referencedRelation: "inventory_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_skus: {
        Row: {
          color_hex: string | null
          color_hex2: string | null
          color_name: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          product_id: string
          size: string | null
          stock_quantity: number
          updated_at: string
          variant_key: string
        }
        Insert: {
          color_hex?: string | null
          color_hex2?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          product_id: string
          size?: string | null
          stock_quantity?: number
          updated_at?: string
          variant_key: string
        }
        Update: {
          color_hex?: string | null
          color_hex2?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          product_id?: string
          size?: string | null
          stock_quantity?: number
          updated_at?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_skus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          file_name: string
          file_url: string
          id: string
          order_id: string | null
          order_number: string
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          file_name: string
          file_url: string
          id?: string
          order_id?: string | null
          order_number: string
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          file_name?: string
          file_url?: string
          id?: string
          order_id?: string | null
          order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          customer_id: string | null
          customer_phone: string | null
          delivered_at: string | null
          id: string
          last_error: string | null
          notification_id: string
          payload: Json | null
          read_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          notification_id: string
          payload?: Json | null
          read_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string
          payload?: Json | null
          read_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "customer_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          apply_to_all: boolean
          badge_text: string | null
          countries: string[] | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          description: string | null
          description_ar: string | null
          discount_code: string | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          mobile_image_url: string | null
          offer_type: string
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
          apply_to_all?: boolean
          badge_text?: string | null
          countries?: string[] | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          description_ar?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          mobile_image_url?: string | null
          offer_type?: string
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
          apply_to_all?: boolean
          badge_text?: string | null
          countries?: string[] | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          description_ar?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          mobile_image_url?: string | null
          offer_type?: string
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
      order_internal_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          note: string
          order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note: string
          order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note?: string
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_internal_notes_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_submission_limits: {
        Row: {
          day_count: number
          day_started_at: string
          identity_key: string
          updated_at: string
          window_count: number
          window_started_at: string
        }
        Insert: {
          day_count?: number
          day_started_at?: string
          identity_key: string
          updated_at?: string
          window_count?: number
          window_started_at?: string
        }
        Update: {
          day_count?: number
          day_started_at?: string
          identity_key?: string
          updated_at?: string
          window_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          country: string
          coupon_code: string | null
          created_at: string
          currency_code: string | null
          currency_mode: string
          customer_address: string
          customer_city: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          customer_region: string | null
          delivery_company_id: string | null
          delivery_fee: number
          discount_amount: number | null
          exchange_rate_snapshot: number | null
          id: string
          invoice_review_note: string | null
          invoice_review_status: string
          invoice_reviewed_at: string | null
          invoice_reviewed_by: string | null
          invoice_url: string | null
          items: Json
          order_number: string
          owner_user_id: string | null
          payment_method: string
          status: string
          stock_reserved_at: string | null
          subtotal: number
          total: number
          total_base: number | null
          tracking_token: string | null
          tracking_token_hash: string | null
          updated_at: string
        }
        Insert: {
          country?: string
          coupon_code?: string | null
          created_at?: string
          currency_code?: string | null
          currency_mode?: string
          customer_address: string
          customer_city?: string | null
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          customer_region?: string | null
          delivery_company_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          exchange_rate_snapshot?: number | null
          id?: string
          invoice_review_note?: string | null
          invoice_review_status?: string
          invoice_reviewed_at?: string | null
          invoice_reviewed_by?: string | null
          invoice_url?: string | null
          items?: Json
          order_number: string
          owner_user_id?: string | null
          payment_method: string
          status?: string
          stock_reserved_at?: string | null
          subtotal: number
          total: number
          total_base?: number | null
          tracking_token?: string | null
          tracking_token_hash?: string | null
          updated_at?: string
        }
        Update: {
          country?: string
          coupon_code?: string | null
          created_at?: string
          currency_code?: string | null
          currency_mode?: string
          customer_address?: string
          customer_city?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          customer_region?: string | null
          delivery_company_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          exchange_rate_snapshot?: number | null
          id?: string
          invoice_review_note?: string | null
          invoice_review_status?: string
          invoice_reviewed_at?: string | null
          invoice_reviewed_by?: string | null
          invoice_url?: string | null
          items?: Json
          order_number?: string
          owner_user_id?: string | null
          payment_method?: string
          status?: string
          stock_reserved_at?: string | null
          subtotal?: number
          total?: number
          total_base?: number | null
          tracking_token?: string | null
          tracking_token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
          country: string
          coupon_code: string | null
          created_at: string
          currency_code: string | null
          customer_address: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          delivery_fee: number
          discount_amount: number | null
          exchange_rate_snapshot: number | null
          id: string
          invoice_url: string | null
          items: Json
          order_number: string
          original_order_id: string
          payment_method: string
          status: string
          subtotal: number
          total: number
          total_base: number | null
        }
        Insert: {
          archived_at?: string
          country: string
          coupon_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_address: string
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          delivery_fee?: number
          discount_amount?: number | null
          exchange_rate_snapshot?: number | null
          id?: string
          invoice_url?: string | null
          items?: Json
          order_number: string
          original_order_id: string
          payment_method: string
          status?: string
          subtotal: number
          total: number
          total_base?: number | null
        }
        Update: {
          archived_at?: string
          country?: string
          coupon_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_address?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          delivery_fee?: number
          discount_amount?: number | null
          exchange_rate_snapshot?: number | null
          id?: string
          invoice_url?: string | null
          items?: Json
          order_number?: string
          original_order_id?: string
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          total_base?: number | null
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
      product_brand_filters: {
        Row: {
          filter_id: string
          id: string
          product_id: string
        }
        Insert: {
          filter_id: string
          id?: string
          product_id: string
        }
        Update: {
          filter_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_brand_filters_filter_id_fkey"
            columns: ["filter_id"]
            isOneToOne: false
            referencedRelation: "brand_filters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_brand_filters_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          cost_price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          cost_price?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          cost_price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answer_ar: string | null
          author: string
          content: string
          content_ar: string
          created_at: string | null
          helpful_count: number | null
          id: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          answer_ar?: string | null
          author: string
          content: string
          content_ar: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          answer_ar?: string | null
          author?: string
          content?: string
          content_ar?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          country: string
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          images: string[] | null
          is_approved: boolean | null
          product_id: string
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          country?: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          product_id: string
          rating: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          country?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accessories: Json | null
          audience: string | null
          brand: string | null
          brand_id: string | null
          category: string | null
          category_id: string | null
          color_variants: Json
          cost_price: number | null
          countries: string[] | null
          created_at: string
          description: string | null
          description_ar: string | null
          discount: number | null
          features: Json | null
          has_quality_variants: boolean
          has_sizes: boolean | null
          home_collections: string[]
          id: string
          images: string[] | null
          in_stock: boolean | null
          is_active: boolean | null
          is_best_seller: boolean | null
          is_featured: boolean | null
          name: string
          name_ar: string
          original_price: number | null
          price: number | null
          quality_variants: Json
          return_policy: string | null
          section_ids: string[] | null
          size_price_rule_id: string | null
          sizes: string[] | null
          slug: string
          sort_order: number | null
          specs: Json
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          accessories?: Json | null
          audience?: string | null
          brand?: string | null
          brand_id?: string | null
          category?: string | null
          category_id?: string | null
          color_variants?: Json
          cost_price?: number | null
          countries?: string[] | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          discount?: number | null
          features?: Json | null
          has_quality_variants?: boolean
          has_sizes?: boolean | null
          home_collections?: string[]
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_active?: boolean | null
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          name: string
          name_ar: string
          original_price?: number | null
          price?: number | null
          quality_variants?: Json
          return_policy?: string | null
          section_ids?: string[] | null
          size_price_rule_id?: string | null
          sizes?: string[] | null
          slug: string
          sort_order?: number | null
          specs?: Json
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          accessories?: Json | null
          audience?: string | null
          brand?: string | null
          brand_id?: string | null
          category?: string | null
          category_id?: string | null
          color_variants?: Json
          cost_price?: number | null
          countries?: string[] | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          discount?: number | null
          features?: Json | null
          has_quality_variants?: boolean
          has_sizes?: boolean | null
          home_collections?: string[]
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_active?: boolean | null
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_ar?: string
          original_price?: number | null
          price?: number | null
          quality_variants?: Json
          return_policy?: string | null
          section_ids?: string[] | null
          size_price_rule_id?: string | null
          sizes?: string[] | null
          slug?: string
          sort_order?: number | null
          specs?: Json
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_size_price_rule_id_fkey"
            columns: ["size_price_rule_id"]
            isOneToOne: false
            referencedRelation: "size_price_rules"
            referencedColumns: ["id"]
          },
        ]
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
          admin_notes: string | null
          amount: number
          amount_base: number | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          inventory_restore_result: Json
          inventory_restored_at: string | null
          inventory_restored_by: string | null
          items: Json
          notes: string | null
          order_id: string | null
          order_number: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string
          refund_method: string
          refund_number: string
          refund_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          amount_base?: number | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          inventory_restore_result?: Json
          inventory_restored_at?: string | null
          inventory_restored_by?: string | null
          items?: Json
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          refund_method?: string
          refund_number?: string
          refund_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          amount_base?: number | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          inventory_restore_result?: Json
          inventory_restored_at?: string | null
          inventory_restored_by?: string | null
          items?: Json
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          refund_method?: string
          refund_number?: string
          refund_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "refunds_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
      size_price_rules: {
        Row: {
          adjustments: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          adjustments?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          adjustments?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
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
      whatsapp_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          template_key: string | null
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_apply_product_classification: {
        Args: { p_patch: Json; p_product_id: string }
        Returns: Json
      }
      admin_catalog_health: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          is_active: boolean
          issue_count: number
          issues: string[]
          name: string
          name_ar: string
          slug: string
          updated_at: string
        }[]
      }
      admin_catalog_health_summary: { Args: never; Returns: Json }
      admin_create_product_draft_from_excel: {
        Args: { p_row: Json }
        Returns: string
      }
      admin_duplicate_product: {
        Args: { p_product_id: string }
        Returns: string
      }
      admin_quick_update_product: {
        Args: { p_patch: Json; p_product_id: string }
        Returns: Json
      }
      admin_undo_product_revision: {
        Args: { p_revision_id: string }
        Returns: Json
      }
      admin_update_inventory_sku_from_excel: {
        Args: { p_sku_id: string; p_stock_quantity: number }
        Returns: Json
      }
      admin_zero_quality_variant_stock: {
        Args: { p_variants: Json }
        Returns: Json
      }
      admin_zero_variant_stock: { Args: { p_variants: Json }; Returns: Json }
      apply_inventory_adjustment: {
        Args: {
          p_adjustment_type: string
          p_inventory_sku_id?: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reason: string
          p_reference?: string
        }
        Returns: {
          adjustment_type: string
          created_at: string
          created_by: string | null
          id: string
          inventory_sku_id: string | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          product_quantity_after: number | null
          product_quantity_before: number | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string
          reference: string | null
          total_cost: number | null
          unit_cost: number | null
          variant_label: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventory_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_legacy_customer: {
        Args: { _password: string; _phone: string; _user_id: string }
        Returns: {
          avatar_url: string
          country: string
          created_at: string
          id: string
          name: string
          phone: string
          region: string
          user_id: string
        }[]
      }
      consume_customer_assistant_rate_limit: {
        Args: {
          p_client_hash: string
          p_limit?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      coupon_usage_summary: {
        Args: never
        Returns: {
          code: string
          last_used_at: string
          usage_count: number
        }[]
      }
      create_manual_journal_entry: {
        Args: {
          p_currency_code: string
          p_description: string
          p_entry_date: string
          p_lines: Json
          p_reference: string
        }
        Returns: string
      }
      create_refund_request: {
        Args: {
          p_amount: number
          p_currency_code: string
          p_customer_id: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_notes: string
          p_order_id: string
          p_order_number: string
          p_reason: string
          p_refund_method: string
          p_refund_type: string
        }
        Returns: string
      }
      create_secure_order: {
        Args: {
          p_country: string
          p_coupon_code?: string
          p_currency_code: string
          p_currency_mode: string
          p_customer_address: string
          p_customer_city: string
          p_customer_id: string
          p_customer_name: string
          p_customer_notes: string
          p_customer_phone: string
          p_customer_region: string
          p_delivery_fee: number
          p_discount_amount?: number
          p_exchange_rate_snapshot: number
          p_items: Json
          p_payment_method: string
          p_subtotal: number
          p_total: number
          p_total_base: number
        }
        Returns: Json
      }
      create_secure_order_v2: {
        Args: {
          p_country: string
          p_coupon_code?: string
          p_currency_code: string
          p_currency_mode: string
          p_customer_address: string
          p_customer_city: string
          p_customer_name: string
          p_customer_notes: string
          p_customer_phone: string
          p_customer_region: string
          p_delivery_company_id?: string
          p_items: Json
          p_payment_method: string
        }
        Returns: Json
      }
      currency_usage_summary: {
        Args: never
        Returns: {
          code: string
          country_count: number
          expense_count: number
          order_count: number
          refund_count: number
          transaction_count: number
        }[]
      }
      current_customer_id: { Args: never; Returns: string }
      customer_login: {
        Args: { _password: string; _phone: string }
        Returns: {
          avatar_url: string
          country: string
          id: string
          name: string
          phone: string
          region: string
        }[]
      }
      customer_register: {
        Args: {
          _country: string
          _name: string
          _password: string
          _phone: string
          _region?: string
        }
        Returns: {
          avatar_url: string
          country: string
          id: string
          name: string
          phone: string
          region: string
        }[]
      }
      customer_self: {
        Args: { _id: string; _phone: string }
        Returns: {
          avatar_url: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          password_hash: string | null
          phone: string
          region: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      customer_update_self: {
        Args: {
          _avatar_url: string
          _id: string
          _name: string
          _phone: string
          _region: string
        }
        Returns: {
          avatar_url: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          password_hash: string | null
          phone: string
          region: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_coupon_safe: { Args: { p_coupon_id: string }; Returns: undefined }
      delete_currency_safe: { Args: { p_code: string }; Returns: undefined }
      delete_product_from_inventory: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      delete_refund_safe: { Args: { p_refund_id: string }; Returns: undefined }
      get_inventory_summary: {
        Args: never
        Returns: {
          active_products: number
          inventory_value: number
          low_stock: number
          out_of_stock: number
          sku_tracked: number
          total_products: number
          total_units: number
        }[]
      }
      get_order_by_tracking: {
        Args: { p_order_number: string; p_phone: string }
        Returns: {
          country: string
          coupon_code: string | null
          created_at: string
          currency_code: string | null
          currency_mode: string
          customer_address: string
          customer_city: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          customer_region: string | null
          delivery_company_id: string | null
          delivery_fee: number
          discount_amount: number | null
          exchange_rate_snapshot: number | null
          id: string
          invoice_review_note: string | null
          invoice_review_status: string
          invoice_reviewed_at: string | null
          invoice_reviewed_by: string | null
          invoice_url: string | null
          items: Json
          order_number: string
          owner_user_id: string | null
          payment_method: string
          status: string
          stock_reserved_at: string | null
          subtotal: number
          total: number
          total_base: number | null
          tracking_token: string | null
          tracking_token_hash: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_order_tracking: {
        Args: { p_order_number: string; p_tracking_token: string }
        Returns: Json
      }
      get_product_review_summary: {
        Args: { p_product_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      get_product_size_price_adjustment: {
        Args: { p_product_id: string; p_size: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      mark_stale_customer_carts: { Args: never; Returns: number }
      rebuild_product_variant_stock: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      record_purchase_analytics: {
        Args: {
          p_device?: string
          p_order_id: string
          p_path?: string
          p_referrer?: string
          p_session_id?: string
          p_tracking_token: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: boolean
      }
      replace_product_inventory_skus: {
        Args: { p_items: Json; p_product_id: string }
        Returns: number
      }
      reverse_journal_entry: {
        Args: {
          p_entry_date: string
          p_reason: string
          p_transaction_id: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_product_inventory_from_skus: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      update_refund_status: {
        Args: { p_admin_note?: string; p_refund_id: string; p_status: string }
        Returns: undefined
      }
      validate_customer_coupon: { Args: { p_code: string }; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
