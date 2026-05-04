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
      alert_rejections: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          responder_id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          responder_id: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          responder_id?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          accepted_at: string | null
          address: string | null
          assigned_responder_id: string | null
          created_at: string
          description: string
          dispatch_attempts: number
          id: string
          last_dispatched_at: string
          lat: number
          lng: number
          priority: Database["public"]["Enums"]["alert_priority"]
          rating: number | null
          rating_comment: string | null
          responder_marked_solved: boolean
          solved_at: string | null
          status: Database["public"]["Enums"]["alert_status"]
          updated_at: string
          user_id: string
          user_marked_solved: boolean
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          assigned_responder_id?: string | null
          created_at?: string
          description: string
          dispatch_attempts?: number
          id?: string
          last_dispatched_at?: string
          lat: number
          lng: number
          priority?: Database["public"]["Enums"]["alert_priority"]
          rating?: number | null
          rating_comment?: string | null
          responder_marked_solved?: boolean
          solved_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          updated_at?: string
          user_id: string
          user_marked_solved?: boolean
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          assigned_responder_id?: string | null
          created_at?: string
          description?: string
          dispatch_attempts?: number
          id?: string
          last_dispatched_at?: string
          lat?: number
          lng?: number
          priority?: Database["public"]["Enums"]["alert_priority"]
          rating?: number | null
          rating_comment?: string | null
          responder_marked_solved?: boolean
          solved_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          updated_at?: string
          user_id?: string
          user_marked_solved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alerts_assigned_responder_id_fkey"
            columns: ["assigned_responder_id"]
            isOneToOne: false
            referencedRelation: "responders"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          alert_id: string
          chain_id: number | null
          created_at: string
          description: string | null
          file_hash: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          ipfs_cid: string
          ipfs_url: string
          status: Database["public"]["Enums"]["evidence_status"]
          title: string | null
          tx_hash: string | null
          updated_at: string
          uploaded_by: string
          uploader_role: Database["public"]["Enums"]["app_role"]
          wallet_address: string | null
        }
        Insert: {
          alert_id: string
          chain_id?: number | null
          created_at?: string
          description?: string | null
          file_hash: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ipfs_cid: string
          ipfs_url: string
          status?: Database["public"]["Enums"]["evidence_status"]
          title?: string | null
          tx_hash?: string | null
          updated_at?: string
          uploaded_by: string
          uploader_role: Database["public"]["Enums"]["app_role"]
          wallet_address?: string | null
        }
        Update: {
          alert_id?: string
          chain_id?: number | null
          created_at?: string
          description?: string | null
          file_hash?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ipfs_cid?: string
          ipfs_url?: string
          status?: Database["public"]["Enums"]["evidence_status"]
          title?: string | null
          tx_hash?: string | null
          updated_at?: string
          uploaded_by?: string
          uploader_role?: Database["public"]["Enums"]["app_role"]
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          area: string | null
          avatar_url: string | null
          cnic: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          role_intent: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          cnic?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          role_intent?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          cnic?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          role_intent?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      responders: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          is_active: boolean
          location_updated_at: string | null
          rating: number
          rejection_reason: string | null
          request_message: string | null
          reviewed_at: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["responder_status"]
          total_responses: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_active?: boolean
          location_updated_at?: string | null
          rating?: number
          rejection_reason?: string | null
          request_message?: string | null
          reviewed_at?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["responder_status"]
          total_responses?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_active?: boolean
          location_updated_at?: string | null
          rating?: number
          rejection_reason?: string | null
          request_message?: string | null
          reviewed_at?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["responder_status"]
          total_responses?: number
          updated_at?: string
          user_id?: string
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
      auto_redispatch_alerts: { Args: never; Returns: undefined }
      ensure_account_setup: {
        Args: {
          _address?: string
          _area?: string
          _cnic?: string
          _display_name?: string
          _phone?: string
          _role_intent?: string
          _wallet_address?: string
        }
        Returns: undefined
      }
      get_my_profile: {
        Args: never
        Returns: {
          address: string | null
          area: string | null
          avatar_url: string | null
          cnic: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          role_intent: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_roles: {
        Args: never
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_priority: "low" | "medium" | "high" | "critical"
      alert_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "solved"
        | "rejected"
        | "cancelled"
      app_role: "user" | "responder" | "admin"
      evidence_status: "pending" | "verified" | "failed"
      responder_status: "pending" | "approved" | "rejected" | "suspended"
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
      alert_priority: ["low", "medium", "high", "critical"],
      alert_status: [
        "pending",
        "accepted",
        "in_progress",
        "solved",
        "rejected",
        "cancelled",
      ],
      app_role: ["user", "responder", "admin"],
      evidence_status: ["pending", "verified", "failed"],
      responder_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
