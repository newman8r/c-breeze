export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      api_keys: {
        Row: {
          created_at: string
          description: string
          employee_id: string
          id: string
          key_hash: string
          key_last_four: string
          last_used_at: string | null
          metadata: Json | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          employee_id: string
          id?: string
          key_hash: string
          key_last_four: string
          last_used_at?: string | null
          metadata?: Json | null
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          status: string
        }
        Update: {
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          key_hash?: string
          key_last_four?: string
          last_used_at?: string | null
          metadata?: Json | null
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_description: string | null
          action_meta: Json | null
          action_type: Database["public"]["Enums"]["action_type"]
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          ai_metadata: Json | null
          client_info: Json | null
          created_at: string
          details_after: Json | null
          details_before: Json | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          event_id: string
          ip_address: unknown | null
          organization_id: string | null
          related_resources: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          session_id: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action_description?: string | null
          action_meta?: Json | null
          action_type: Database["public"]["Enums"]["action_type"]
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          ai_metadata?: Json | null
          client_info?: Json | null
          created_at?: string
          details_after?: Json | null
          details_before?: Json | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          event_id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          related_resources?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action_description?: string | null
          action_meta?: Json | null
          action_type?: Database["public"]["Enums"]["action_type"]
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          ai_metadata?: Json | null
          client_info?: Json | null
          created_at?: string
          details_after?: Json | null
          details_before?: Json | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          event_id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          related_resources?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact_info: Json | null
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          name: string
          organization_id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          name: string
          organization_id: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string
          organization_id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_root_admin: boolean | null
          last_login_at: string | null
          last_name: string | null
          name: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          skills: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_root_admin?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          name?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          skills?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_root_admin?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          name?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          skills?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invitee_email: string
          invitee_name: string | null
          is_accepted: boolean | null
          is_invalidated: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invitee_email: string
          invitee_name?: string | null
          is_accepted?: boolean | null
          is_invalidated?: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invitee_email?: string
          invitee_name?: string | null
          is_accepted?: boolean | null
          is_invalidated?: boolean | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contact_info: Json
          created_at: string
          created_by: string
          id: string
          name: string
          settings: Json
          slug: string | null
        }
        Insert: {
          contact_info?: Json
          created_at?: string
          created_by: string
          id?: string
          name: string
          settings?: Json
          slug?: string | null
        }
        Update: {
          contact_info?: Json
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["tag_type"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          type?: Database["public"]["Enums"]["tag_type"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          type?: Database["public"]["Enums"]["tag_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_ai_generated: boolean | null
          is_private: boolean | null
          metadata: Json | null
          organization_id: string
          origin: Database["public"]["Enums"]["message_origin"]
          responding_to_id: string | null
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_private?: boolean | null
          metadata?: Json | null
          organization_id: string
          origin?: Database["public"]["Enums"]["message_origin"]
          responding_to_id?: string | null
          sender_id?: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_private?: boolean | null
          metadata?: Json | null
          organization_id?: string
          origin?: Database["public"]["Enums"]["message_origin"]
          responding_to_id?: string | null
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_responding_to_id_fkey"
            columns: ["responding_to_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string
          created_by: string | null
          tag_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          tag_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          customer_id: string
          description: string
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          satisfaction_rating: number | null
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          customer_id: string
          description: string
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_statistics: {
        Row: {
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: {
          _invitation_id: string
          _user_id: string
        }
        Returns: undefined
      }
      create_initial_admin: {
        Args: {
          org_id: string
          admin_user_id: string
          admin_email: string
        }
        Returns: string
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_key: string
          key_hash: string
          key_last_four: string
        }[]
      }
      get_current_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: {
          contact_info: Json
          created_at: string
          created_by: string
          id: string
          name: string
          settings: Json
          slug: string | null
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: {
          role: Database["public"]["Enums"]["user_role"]
          is_root_admin: boolean
          organization_id: string
        }[]
      }
      get_user_organizations: {
        Args: {
          _user_id: string
        }
        Returns: {
          org_id: string
        }[]
      }
      get_user_role: {
        Args: {
          _user_id: string
          _org_id: string
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          _organization_id?: string
          _actor_id?: string
          _actor_type?: Database["public"]["Enums"]["actor_type"]
          _ip_address?: unknown
          _user_agent?: string
          _action_type?: Database["public"]["Enums"]["action_type"]
          _action_description?: string
          _action_meta?: Json
          _resource_type?: Database["public"]["Enums"]["resource_type"]
          _resource_id?: string
          _related_resources?: Json
          _details_before?: Json
          _details_after?: Json
          _ai_metadata?: Json
          _session_id?: string
          _request_id?: string
          _client_info?: Json
          _duration_ms?: number
          _severity?: Database["public"]["Enums"]["severity_level"]
          _status?: string
          _error_code?: string
          _error_message?: string
        }
        Returns: string
      }
      update_employee_names: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      verify_api_key: {
        Args: {
          key_to_verify: string
        }
        Returns: {
          is_valid: boolean
          organization_id: string
          employee_id: string
        }[]
      }
    }
    Enums: {
      action_type: "create" | "read" | "update" | "delete" | "execute" | "other"
      actor_type: "employee" | "customer" | "ai" | "system"
      message_origin:
        | "ticket"
        | "email"
        | "chat"
        | "sms"
        | "phone"
        | "api"
        | "other"
      message_sender_type: "employee" | "customer" | "system" | "ai"
      resource_type:
        | "system"
        | "organization"
        | "employee"
        | "customer"
        | "ticket"
        | "tag"
        | "invitation"
        | "profile"
        | "user_settings"
        | "api_key"
      severity_level: "info" | "warning" | "error" | "critical"
      tag_type: "system" | "custom"
      user_role: "customer" | "employee" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

