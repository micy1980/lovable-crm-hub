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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_licenses: {
        Row: {
          company_id: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          license_key: string | null
          max_users: number
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          company_id: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          license_key?: string | null
          max_users: number
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          company_id?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          license_key?: string | null
          max_users?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          amount_huf: number | null
          category: string | null
          cost_date: string
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          exchange_rate_id: string | null
          id: string
          project_id: string
          quantity: number | null
          rate: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_huf?: number | null
          category?: string | null
          cost_date: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          exchange_rate_id?: string | null
          id?: string
          project_id: string
          quantity?: number | null
          rate?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_huf?: number | null
          category?: string | null
          cost_date?: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          exchange_rate_id?: string | null
          id?: string
          project_id?: string
          quantity?: number | null
          rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          owner_company_id: string
          partner_id: string | null
          project_id: string | null
          sales_id: string | null
          title: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          owner_company_id: string
          partner_id?: string | null
          project_id?: string | null
          sales_id?: string | null
          title: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          owner_company_id?: string
          partner_id?: string | null
          project_id?: string | null
          sales_id?: string | null
          title?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          currency_from: string
          currency_to: string
          id: string
          rate: number
          rate_date: string
        }
        Insert: {
          created_at?: string | null
          currency_from: string
          currency_to?: string
          id?: string
          rate: number
          rate_date: string
        }
        Update: {
          created_at?: string | null
          currency_from?: string
          currency_to?: string
          id?: string
          rate?: number
          rate_date?: string
        }
        Relationships: []
      }
      locked_accounts: {
        Row: {
          id: string
          locked_at: string
          locked_by_system: boolean
          locked_until: string | null
          reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          locked_at?: string
          locked_by_system?: boolean
          locked_until?: string | null
          reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          locked_at?: string
          locked_by_system?: boolean
          locked_until?: string | null
          reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_time: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempt_time?: string
          email: string
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_time?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          previous_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      master_data: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          order_index: number | null
          type: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          order_index?: number | null
          type: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          order_index?: number | null
          type?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          address: string | null
          category: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          can_delete: boolean | null
          can_view_logs: boolean | null
          created_at: string | null
          default_company_id: string | null
          deleted_at: string | null
          email: string
          family_name: string | null
          full_name: string | null
          given_name: string | null
          id: string
          is_active: boolean | null
          language: string | null
          must_change_password: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_code: string | null
        }
        Insert: {
          can_delete?: boolean | null
          can_view_logs?: boolean | null
          created_at?: string | null
          default_company_id?: string | null
          deleted_at?: string | null
          email: string
          family_name?: string | null
          full_name?: string | null
          given_name?: string | null
          id: string
          is_active?: boolean | null
          language?: string | null
          must_change_password?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_code?: string | null
        }
        Update: {
          can_delete?: boolean | null
          can_view_logs?: boolean | null
          created_at?: string | null
          default_company_id?: string | null
          deleted_at?: string | null
          email?: string
          family_name?: string | null
          full_name?: string | null
          given_name?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          must_change_password?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_company_id_fkey"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          owner_user_id: string | null
          responsible1_user_id: string | null
          responsible2_user_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          responsible1_user_id?: string | null
          responsible2_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          responsible1_user_id?: string | null
          responsible2_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible1_user_id_fkey"
            columns: ["responsible1_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible2_user_id_fkey"
            columns: ["responsible2_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          business_unit: string | null
          company_id: string
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          expected_close_date: string | null
          expected_value: number | null
          id: string
          name: string
          partner_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_unit?: string | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          name: string
          partner_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_unit?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          name?: string
          partner_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          deadline: string | null
          deleted_at: string | null
          description: string | null
          id: string
          project_id: string | null
          responsible_user_id: string | null
          sales_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          responsible_user_id?: string | null
          sales_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          responsible_user_id?: string | null
          sales_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_permissions: {
        Row: {
          can_delete: boolean
          can_edit_master_data: boolean
          can_view_logs: boolean
          company_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit_master_data?: boolean
          can_view_logs?: boolean
          company_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit_master_data?: boolean
          can_view_logs?: boolean
          company_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_active_locks_duration: {
        Args: { _new_minutes: number }
        Returns: undefined
      }
      can_add_seat: { Args: { _company_id: string }; Returns: boolean }
      can_user_delete_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_edit_master_data_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_view_logs_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_locks: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      count_recent_failed_attempts: {
        Args: { _email: string; _minutes: number }
        Returns: number
      }
      generate_license_key: { Args: never; Returns: string }
      get_account_lock_settings: {
        Args: never
        Returns: {
          auto_unlock_minutes: number
          failed_window_minutes: number
          max_attempts: number
        }[]
      }
      get_admin_company_ids: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
        }[]
      }
      get_admin_company_ids_new: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
        }[]
      }
      get_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: string
      }
      get_company_used_seats: { Args: { _company_id: string }; Returns: number }
      get_locked_accounts_with_details: {
        Args: never
        Returns: {
          id: string
          locked_at: string
          locked_by_system: boolean
          locked_until: string
          reason: string
          unlocked_at: string
          unlocked_by: string
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
      get_locked_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_account_locked: { Args: { _user_id: string }; Returns: boolean }
      is_account_locked_by_email: { Args: { _email: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin_new: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_license_effective: {
        Args: { _company_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      lock_account_for_email: {
        Args: { _email: string; _minutes: number; _reason: string }
        Returns: undefined
      }
      unlock_account_by_user_id: {
        Args: { _unlocked_by: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      company_role: "ADMIN" | "NORMAL" | "VIEWER"
      user_role: "super_admin" | "admin" | "normal" | "viewer"
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
      company_role: ["ADMIN", "NORMAL", "VIEWER"],
      user_role: ["super_admin", "admin", "normal", "viewer"],
    },
  },
} as const
