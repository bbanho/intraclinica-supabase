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
      access_request: {
        Row: {
          clinic_id: string
          clinic_name: string
          created_at: string | null
          id: string
          reason: string | null
          requested_role_id: string
          requester_user_id: string | null
          status: string | null
        }
        Insert: {
          clinic_id: string
          clinic_name: string
          created_at?: string | null
          id?: string
          reason?: string | null
          requested_role_id: string
          requester_user_id?: string | null
          status?: string | null
        }
        Update: {
          clinic_id?: string
          clinic_name?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          requested_role_id?: string
          requester_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_request_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_request_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
        ]
      }
      actor: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["actor_type"]
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["actor_type"]
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["actor_type"]
        }
        Relationships: [
          {
            foreignKeyName: "actor_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user: {
        Row: {
          actor_id: string | null
          assigned_room: string | null
          email: string | null
          iam_bindings: Json | null
          id: string
          role: string | null
        }
        Insert: {
          actor_id?: string | null
          assigned_room?: string | null
          email?: string | null
          iam_bindings?: Json | null
          id: string
          role?: string | null
        }
        Update: {
          actor_id?: string | null
          assigned_room?: string | null
          email?: string | null
          iam_bindings?: Json | null
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_user_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actor"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment: {
        Row: {
          appointment_date: string
          clinic_id: string
          doctor_actor_id: string | null
          id: string
          patient_id: string
          patient_name: string
          priority: string | null
          room_number: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          appointment_date: string
          clinic_id: string
          doctor_actor_id?: string | null
          id?: string
          patient_id: string
          patient_name: string
          priority?: string | null
          room_number?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          appointment_date?: string
          clinic_id?: string
          doctor_actor_id?: string | null
          id?: string
          patient_id?: string
          patient_name?: string
          priority?: string | null
          room_number?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_doctor_actor_id_fkey"
            columns: ["doctor_actor_id"]
            isOneToOne: false
            referencedRelation: "actor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          plan: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          plan?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          plan?: string | null
          status?: string | null
        }
        Relationships: []
      }
      clinical_record: {
        Row: {
          clinic_id: string
          content: string
          doctor_actor_id: string | null
          id: string
          patient_id: string
          timestamp: string | null
          type: Database["public"]["Enums"]["record_type"] | null
        }
        Insert: {
          clinic_id: string
          content: string
          doctor_actor_id?: string | null
          id?: string
          patient_id: string
          timestamp?: string | null
          type?: Database["public"]["Enums"]["record_type"] | null
        }
        Update: {
          clinic_id?: string
          content?: string
          doctor_actor_id?: string | null
          id?: string
          patient_id?: string
          timestamp?: string | null
          type?: Database["public"]["Enums"]["record_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_record_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_record_doctor_actor_id_fkey"
            columns: ["doctor_actor_id"]
            isOneToOne: false
            referencedRelation: "actor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_record_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id"]
          },
        ]
      }
      patient: {
        Row: {
          birth_date: string | null
          clinic_id: string
          cpf: string | null
          gender: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          clinic_id: string
          cpf?: string | null
          gender?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          clinic_id?: string
          cpf?: string | null
          gender?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "actor"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_recipe: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          procedure_type_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          procedure_type_id: string
          quantity?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          procedure_type_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedure_recipe_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_recipe_procedure_type_id_fkey"
            columns: ["procedure_type_id"]
            isOneToOne: false
            referencedRelation: "procedure_type"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_type: {
        Row: {
          active: boolean | null
          clinic_id: string
          code: string | null
          created_at: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          clinic_id: string
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          active?: boolean | null
          clinic_id?: string
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedure_type_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
        ]
      }
      product: {
        Row: {
          avg_cost_price: number | null
          barcode: string | null
          category: string | null
          clinic_id: string
          current_stock: number | null
          deleted: boolean | null
          description: string | null
          id: string
          min_stock: number | null
          name: string
          price: number
          unit: string
        }
        Insert: {
          avg_cost_price?: number | null
          barcode?: string | null
          category?: string | null
          clinic_id: string
          current_stock?: number | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          min_stock?: number | null
          name: string
          price: number
          unit?: string
        }
        Update: {
          avg_cost_price?: number | null
          barcode?: string | null
          category?: string | null
          clinic_id?: string
          current_stock?: number | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          price?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post: {
        Row: {
          clinic_id: string
          content: string
          created_at: string | null
          id: string
          platform: string | null
          title: string
        }
        Insert: {
          clinic_id: string
          content: string
          created_at?: string | null
          id?: string
          platform?: string | null
          title: string
        }
        Update: {
          clinic_id?: string
          content?: string
          created_at?: string | null
          id?: string
          platform?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transaction: {
        Row: {
          actor_id: string | null
          clinic_id: string
          id: string
          notes: string | null
          product_id: string
          reason: string | null
          record_id: string | null
          timestamp: string | null
          total_qty: number
          type: string | null
        }
        Insert: {
          actor_id?: string | null
          clinic_id: string
          id?: string
          notes?: string | null
          product_id: string
          reason?: string | null
          record_id?: string | null
          timestamp?: string | null
          total_qty: number
          type?: string | null
        }
        Update: {
          actor_id?: string | null
          clinic_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          reason?: string | null
          record_id?: string | null
          timestamp?: string | null
          total_qty?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transaction_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transaction_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transaction_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_appointment: {
        Args: {
          p_clinic_id: string
          p_date: string
          p_doctor_actor_id: string
          p_patient_id: string
          p_priority?: string
          p_room_number?: string
          p_status?: string
        }
        Returns: {
          appointment_date: string
          clinic_id: string
          doctor_actor_id: string | null
          id: string
          patient_id: string
          patient_name: string
          priority: string | null
          room_number: string | null
          status: string | null
          timestamp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "appointment"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      add_clinical_record: {
        Args: {
          p_clinic_id: string
          p_content: string
          p_doctor_actor_id: string
          p_patient_id: string
          p_type?: string
        }
        Returns: {
          clinic_id: string
          content: string
          doctor_actor_id: string | null
          id: string
          patient_id: string
          timestamp: string | null
          type: Database["public"]["Enums"]["record_type"] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clinical_record"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      add_stock_movement: {
        Args: {
          p_actor_id?: string
          p_clinic_id: string
          p_notes?: string
          p_product_id: string
          p_qty: number
          p_reason?: string
          p_type: string
        }
        Returns: {
          actor_id: string | null
          clinic_id: string
          id: string
          notes: string | null
          product_id: string
          reason: string | null
          record_id: string | null
          timestamp: string | null
          total_qty: number
          type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "stock_transaction"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_patient_with_actor: {
        Args: {
          p_birth_date: string
          p_clinic_id: string
          p_cpf: string
          p_gender: string
          p_name: string
        }
        Returns: Json
      }
      create_user_with_actor: {
        Args: {
          p_assigned_room: string
          p_clinic_id: string
          p_email: string
          p_iam_bindings: Json
          p_name: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
      has_permission: {
        Args: { required_permission: string; target_clinic_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      perform_procedure: {
        Args: {
          p_clinic_id: string
          p_notes?: string
          p_patient_id: string
          p_procedure_type_id: string
          p_professional_id: string
        }
        Returns: string
      }
      update_user_with_actor: {
        Args: {
          p_assigned_room: string
          p_iam_bindings: Json
          p_name: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      actor_type: "USER" | "PATIENT" | "VENDOR" | "CLINIC"
      contact_type: "WhatsApp" | "Fixo" | "Email" | "Telegram"
      fin_status: "PAID" | "PENDING" | "CANCELED"
      fin_type: "REVENUE" | "EXPENSE"
      key_type: "PUBLISHABLE" | "SECRET"
      record_type: "EVOLUCAO" | "RECEITA" | "EXAME" | "TRIAGEM"
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
      actor_type: ["USER", "PATIENT", "VENDOR", "CLINIC"],
      contact_type: ["WhatsApp", "Fixo", "Email", "Telegram"],
      fin_status: ["PAID", "PENDING", "CANCELED"],
      fin_type: ["REVENUE", "EXPENSE"],
      key_type: ["PUBLISHABLE", "SECRET"],
      record_type: ["EVOLUCAO", "RECEITA", "EXAME", "TRIAGEM"],
    },
  },
} as const
