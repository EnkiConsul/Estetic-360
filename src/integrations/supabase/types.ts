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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          clinic_id: string
          created_at: string
          created_by_member_id: string | null
          happened_at: string
          id: string
          kind: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id: string
          new_status: Database["public"]["Enums"]["lead_status"] | null
          note: string | null
          previous_status: Database["public"]["Enums"]["lead_status"] | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by_member_id?: string | null
          happened_at?: string
          id?: string
          kind: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          note?: string | null
          previous_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by_member_id?: string | null
          happened_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id?: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          note?: string | null
          previous_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_fk"
            columns: ["lead_id", "clinic_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "clinic_id"]
          },
          {
            foreignKeyName: "lead_activities_member_fk"
            columns: ["created_by_member_id", "clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id", "clinic_id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_member_id: string | null
          campaign: string | null
          clinic_id: string
          converted_patient_id: string | null
          created_at: string
          created_by_member_id: string | null
          email: string | null
          email_normalized: string | null
          id: string
          interest: string | null
          last_contact_at: string | null
          loss_reason: string | null
          name: string
          next_followup_at: string | null
          phone: string | null
          phone_normalized: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_member_id?: string | null
          campaign?: string | null
          clinic_id: string
          converted_patient_id?: string | null
          created_at?: string
          created_by_member_id?: string | null
          email?: string | null
          email_normalized?: string | null
          id?: string
          interest?: string | null
          last_contact_at?: string | null
          loss_reason?: string | null
          name: string
          next_followup_at?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_member_id?: string | null
          campaign?: string | null
          clinic_id?: string
          converted_patient_id?: string | null
          created_at?: string
          created_by_member_id?: string | null
          email?: string | null
          email_normalized?: string | null
          id?: string
          interest?: string | null
          last_contact_at?: string | null
          loss_reason?: string | null
          name?: string
          next_followup_at?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_member_fk"
            columns: ["assigned_member_id", "clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id", "clinic_id"]
          },
          {
            foreignKeyName: "leads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_member_fk"
            columns: ["created_by_member_id", "clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id", "clinic_id"]
          },
          {
            foreignKeyName: "leads_patient_fk"
            columns: ["converted_patient_id", "clinic_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "clinic_id"]
          },
        ]
      }
      patients: {
        Row: {
          campaign: string | null
          clinic_id: string
          cpf: string | null
          created_at: string
          email: string | null
          email_normalized: string | null
          id: string
          name: string
          origin_lead_id: string | null
          phone: string | null
          phone_normalized: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          clinic_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          name: string
          origin_lead_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          clinic_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          name?: string
          origin_lead_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_origin_lead_fk"
            columns: ["origin_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_clinic_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_clinic_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_clinic_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_clinic_id_fkey"
            columns: ["active_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_lead_status: {
        Args: {
          p_lead_id: string
          p_loss_reason?: string
          p_new_status: Database["public"]["Enums"]["lead_status"]
          p_next_followup_at?: string
          p_note?: string
        }
        Returns: string
      }
      convert_lead_to_patient: {
        Args: {
          p_force_new?: boolean
          p_lead_id: string
          p_patient_id?: string
        }
        Returns: Json
      }
      create_clinic_with_admin: {
        Args: { p_clinic_name: string; p_full_name: string }
        Returns: string
      }
      create_lead: {
        Args: {
          p_assigned_member_id?: string
          p_campaign?: string
          p_clinic_id: string
          p_email?: string
          p_interest?: string
          p_name: string
          p_next_followup_at?: string
          p_phone?: string
          p_source?: string
        }
        Returns: string
      }
      crm_context: {
        Args: { p_clinic_id: string }
        Returns: Record<string, unknown>
      }
      find_patient_candidates: {
        Args: { p_lead_id: string }
        Returns: {
          cpf: string
          email: string
          id: string
          match_reason: string
          name: string
          phone: string
        }[]
      }
      has_clinic_role: {
        Args: {
          p_clinic_id: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      has_crm_full_access: { Args: { p_clinic_id: string }; Returns: boolean }
      is_clinic_member: { Args: { p_clinic_id: string }; Returns: boolean }
      is_clinic_professional: {
        Args: { p_clinic_id: string }
        Returns: boolean
      }
      my_membership_id: { Args: { p_clinic_id: string }; Returns: string }
      normalize_email: { Args: { p_value: string }; Returns: string }
      normalize_phone: { Args: { p_value: string }; Returns: string }
      register_lead_contact: {
        Args: {
          p_kind: Database["public"]["Enums"]["lead_activity_kind"]
          p_lead_id: string
          p_new_status?: Database["public"]["Enums"]["lead_status"]
          p_next_followup_at?: string
          p_note?: string
        }
        Returns: string
      }
      shares_clinic_with: { Args: { p_user_id: string }; Returns: boolean }
      update_lead: {
        Args: {
          p_assigned_member_id?: string
          p_campaign?: string
          p_email?: string
          p_interest?: string
          p_lead_id: string
          p_name: string
          p_next_followup_at?: string
          p_phone?: string
          p_source?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "recepcao" | "profissional" | "financeiro"
      lead_activity_kind:
        | "criacao"
        | "nota"
        | "ligacao"
        | "whatsapp"
        | "email"
        | "status"
        | "followup"
        | "perda"
        | "reabertura"
        | "conversao"
      lead_status:
        | "novo"
        | "em_contato"
        | "interessado"
        | "avaliacao_agendada"
        | "avaliacao_realizada"
        | "proposta"
        | "convertido"
        | "perdido"
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
      app_role: ["admin", "gestor", "recepcao", "profissional", "financeiro"],
      lead_activity_kind: [
        "criacao",
        "nota",
        "ligacao",
        "whatsapp",
        "email",
        "status",
        "followup",
        "perda",
        "reabertura",
        "conversao",
      ],
      lead_status: [
        "novo",
        "em_contato",
        "interessado",
        "avaliacao_agendada",
        "avaliacao_realizada",
        "proposta",
        "convertido",
        "perdido",
      ],
    },
  },
} as const
