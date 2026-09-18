export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      assistant_runs: {
        Row: {
          actor_id: string;
          artifact_version: string;
          confidence: number | null;
          created_at: string;
          decision_summary: string;
          guild_id: string;
          id: string;
          latency_ms: number;
          notice_id: string | null;
          status: string;
        };
        Insert: {
          actor_id: string;
          artifact_version: string;
          confidence?: number | null;
          created_at?: string;
          decision_summary: string;
          guild_id: string;
          id?: string;
          latency_ms: number;
          notice_id?: string | null;
          status: string;
        };
        Update: {
          actor_id?: string;
          artifact_version?: string;
          confidence?: number | null;
          created_at?: string;
          decision_summary?: string;
          guild_id?: string;
          id?: string;
          latency_ms?: number;
          notice_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_runs_guild_id_actor_id_fkey";
            columns: ["guild_id", "actor_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["guild_id", "user_id"];
          },
          {
            foreignKeyName: "assistant_runs_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assistant_runs_guild_id_notice_id_fkey";
            columns: ["guild_id", "notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["guild_id", "id"];
          },
        ];
      };
      authors: {
        Row: {
          created_at: string;
          id: string;
          is_bot: boolean;
          source_label: string;
          source_namespace: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_bot: boolean;
          source_label: string;
          source_namespace: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_bot?: boolean;
          source_label?: string;
          source_namespace?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: {
          created_at: string;
          display_name: string | null;
          guild_id: string;
          id: string;
          source_label: string;
          visibility: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          guild_id: string;
          id?: string;
          source_label: string;
          visibility?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          guild_id?: string;
          id?: string;
          source_label?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
        ];
      };
      datasets: {
        Row: {
          created_at: string;
          id: string;
          imported_at: string;
          name: string;
          row_count: number;
          sha256: string;
          source_kind: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          imported_at?: string;
          name: string;
          row_count: number;
          sha256: string;
          source_kind?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          imported_at?: string;
          name?: string;
          row_count?: number;
          sha256?: string;
          source_kind?: string;
        };
        Relationships: [];
      };
      digests: {
        Row: {
          created_at: string;
          guild_id: string;
          id: string;
          local_date: string;
          sent_at: string | null;
          status: string;
          summary: string;
        };
        Insert: {
          created_at?: string;
          guild_id: string;
          id?: string;
          local_date: string;
          sent_at?: string | null;
          status?: string;
          summary: string;
        };
        Update: {
          created_at?: string;
          guild_id?: string;
          id?: string;
          local_date?: string;
          sent_at?: string | null;
          status?: string;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "digests_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
        ];
      };
      guilds: {
        Row: {
          created_at: string;
          id: string;
          source_label: string;
          source_namespace: string;
          timezone: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          source_label: string;
          source_namespace: string;
          timezone?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          source_label?: string;
          source_namespace?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          created_at: string;
          guild_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          guild_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          guild_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
        ];
      };
      notices: {
        Row: {
          answer_excerpt: string;
          created_at: string;
          guild_id: string;
          id: string;
          message_id: string;
          published_at: string;
          topic_key: string;
          verified_at: string;
          verified_by: string;
        };
        Insert: {
          answer_excerpt: string;
          created_at?: string;
          guild_id: string;
          id?: string;
          message_id: string;
          published_at: string;
          topic_key: string;
          verified_at?: string;
          verified_by: string;
        };
        Update: {
          answer_excerpt?: string;
          created_at?: string;
          guild_id?: string;
          id?: string;
          message_id?: string;
          published_at?: string;
          topic_key?: string;
          verified_at?: string;
          verified_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notices_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_guild_id_message_id_fkey";
            columns: ["guild_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "source_messages";
            referencedColumns: ["guild_id", "id"];
          },
          {
            foreignKeyName: "notices_guild_id_verified_by_fkey";
            columns: ["guild_id", "verified_by"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["guild_id", "user_id"];
          },
        ];
      };
      question_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          guild_id: string;
          id: string;
          idempotency_key: string;
          occurred_at: string;
          question_id: string;
          summary: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          guild_id: string;
          id?: string;
          idempotency_key: string;
          occurred_at?: string;
          question_id: string;
          summary: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          guild_id?: string;
          id?: string;
          idempotency_key?: string;
          occurred_at?: string;
          question_id?: string;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_events_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_events_guild_id_question_id_fkey";
            columns: ["guild_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["guild_id", "id"];
          },
        ];
      };
      questions: {
        Row: {
          claimed_by: string | null;
          created_at: string;
          guild_id: string;
          id: string;
          intent: string;
          message_id: string;
          resolved_at: string | null;
          status: string;
          version: number;
        };
        Insert: {
          claimed_by?: string | null;
          created_at?: string;
          guild_id: string;
          id?: string;
          intent: string;
          message_id: string;
          resolved_at?: string | null;
          status?: string;
          version?: number;
        };
        Update: {
          claimed_by?: string | null;
          created_at?: string;
          guild_id?: string;
          id?: string;
          intent?: string;
          message_id?: string;
          resolved_at?: string | null;
          status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "questions_guild_id_claimed_by_fkey";
            columns: ["guild_id", "claimed_by"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["guild_id", "user_id"];
          },
          {
            foreignKeyName: "questions_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_guild_id_message_id_fkey";
            columns: ["guild_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "source_messages";
            referencedColumns: ["guild_id", "id"];
          },
        ];
      };
      radar_alerts: {
        Row: {
          attempts: number;
          created_at: string;
          guild_id: string;
          id: string;
          question_id: string;
          sent_at: string | null;
          status: string;
          tier: number;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          guild_id: string;
          id?: string;
          question_id: string;
          sent_at?: string | null;
          status?: string;
          tier: number;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          guild_id?: string;
          id?: string;
          question_id?: string;
          sent_at?: string | null;
          status?: string;
          tier?: number;
        };
        Relationships: [
          {
            foreignKeyName: "radar_alerts_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "radar_alerts_guild_id_question_id_fkey";
            columns: ["guild_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["guild_id", "id"];
          },
        ];
      };
      run_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          run_id: string;
          safe_metadata: Json;
          sequence: number;
          summary: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          run_id: string;
          safe_metadata?: Json;
          sequence: number;
          summary: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          run_id?: string;
          safe_metadata?: Json;
          sequence?: number;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "run_events_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "assistant_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      source_messages: {
        Row: {
          attachment_count: number;
          author_id: string;
          channel_id: string;
          content: string;
          created_at: string;
          dataset_id: string;
          discord_jump_url: string | null;
          guild_id: string;
          id: string;
          mentions_bot: boolean;
          message_type: string;
          record_ordinal: number;
          reply_resolution: string;
          reply_source_label: string | null;
          reply_to_id: string | null;
          sent_at: string;
          source_char_count: number;
          source_label: string;
        };
        Insert: {
          attachment_count: number;
          author_id: string;
          channel_id: string;
          content: string;
          created_at?: string;
          dataset_id: string;
          discord_jump_url?: string | null;
          guild_id: string;
          id?: string;
          mentions_bot: boolean;
          message_type: string;
          record_ordinal: number;
          reply_resolution: string;
          reply_source_label?: string | null;
          reply_to_id?: string | null;
          sent_at: string;
          source_char_count: number;
          source_label: string;
        };
        Update: {
          attachment_count?: number;
          author_id?: string;
          channel_id?: string;
          content?: string;
          created_at?: string;
          dataset_id?: string;
          discord_jump_url?: string | null;
          guild_id?: string;
          id?: string;
          mentions_bot?: boolean;
          message_type?: string;
          record_ordinal?: number;
          reply_resolution?: string;
          reply_source_label?: string | null;
          reply_to_id?: string | null;
          sent_at?: string;
          source_char_count?: number;
          source_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_messages_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_messages_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_messages_dataset_id_guild_id_reply_to_id_fkey";
            columns: ["dataset_id", "guild_id", "reply_to_id"];
            isOneToOne: false;
            referencedRelation: "source_messages";
            referencedColumns: ["dataset_id", "guild_id", "id"];
          },
          {
            foreignKeyName: "source_messages_guild_id_channel_id_fkey";
            columns: ["guild_id", "channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["guild_id", "id"];
          },
          {
            foreignKeyName: "source_messages_guild_id_fkey";
            columns: ["guild_id"];
            isOneToOne: false;
            referencedRelation: "guilds";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_question: {
        Args: { p_expected_version: number; p_question_id: string };
        Returns: {
          claimed_by: string | null;
          created_at: string;
          guild_id: string;
          id: string;
          intent: string;
          message_id: string;
          resolved_at: string | null;
          status: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "questions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      enqueue_digests: { Args: { p_now?: string }; Returns: number };
      enqueue_radar: { Args: { p_now?: string }; Returns: number };
      import_pack: {
        Args: { p_name: string; p_records: Json; p_sha256: string };
        Returns: Json;
      };
      resolve_question: {
        Args: { p_expected_version: number; p_question_id: string };
        Returns: {
          claimed_by: string | null;
          created_at: string;
          guild_id: string;
          id: string;
          intent: string;
          message_id: string;
          resolved_at: string | null;
          status: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "questions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
