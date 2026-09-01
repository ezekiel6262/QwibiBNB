export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type JobStatus =
  | "queued"
  | "planning"
  | "fetching"
  | "computing"
  | "composing"
  | "attesting"
  | "delivered"
  | "failed";

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          user_id: string;
          service: string;
          status: JobStatus;
          prompt: string | null;
          inputs: Json;
          plan: Json | null;
          error: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          service: string;
          status?: JobStatus;
          prompt?: string | null;
          inputs?: Json;
          plan?: Json | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [];
      };
      deliverables: {
        Row: {
          id: string;
          job_id: string;
          file_path: string;
          file_type: string;
          attestation_hash: string | null;
          manifest: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          file_path: string;
          file_type: string;
          attestation_hash?: string | null;
          manifest?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deliverables"]["Insert"]>;
        Relationships: [];
      };
      wallet_statements: {
        Row: {
          id: string;
          job_id: string;
          addresses: string[];
          chain_coverage: string[];
          period_start: string | null;
          period_end: string | null;
          summary: Json;
        };
        Insert: {
          id?: string;
          job_id: string;
          addresses: string[];
          chain_coverage?: string[];
          period_start?: string | null;
          period_end?: string | null;
          summary?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["wallet_statements"]["Insert"]>;
        Relationships: [];
      };
      transactions_cache: {
        Row: {
          id: string;
          address: string;
          chain: string;
          tx_hash: string;
          block_time: string;
          direction: string;
          counterparty: string | null;
          asset: string;
          amount: number;
          usd_value: number | null;
          classification: string | null;
          source: string;
          raw: Json;
        };
        Insert: {
          id?: string;
          address: string;
          chain: string;
          tx_hash: string;
          block_time: string;
          direction: string;
          counterparty?: string | null;
          asset: string;
          amount: number;
          usd_value?: number | null;
          classification?: string | null;
          source: string;
          raw?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["transactions_cache"]["Insert"]>;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          user_id: string;
          service: string;
          config: Json;
          cron: string;
          next_run: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service: string;
          config?: Json;
          cron: string;
          next_run?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedules"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
