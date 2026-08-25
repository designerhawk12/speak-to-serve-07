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
      ai_runs: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          appeal_id: string | null
          confidence: number | null
          created_at: string
          grievance_id: string | null
          id: string
          input_summary: string | null
          model_label: string | null
          requested_by: string | null
          run_kind: string
          suggestion: Json
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          appeal_id?: string | null
          confidence?: number | null
          created_at?: string
          grievance_id?: string | null
          id?: string
          input_summary?: string | null
          model_label?: string | null
          requested_by?: string | null
          run_kind: string
          suggestion?: Json
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          appeal_id?: string | null
          confidence?: number | null
          created_at?: string
          grievance_id?: string | null
          id?: string
          input_summary?: string | null
          model_label?: string | null
          requested_by?: string | null
          run_kind?: string
          suggestion?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_events: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          appeal_id: string
          citizen_visible: boolean
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
          organization_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          appeal_id: string
          citizen_visible?: boolean
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          title?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          appeal_id?: string
          citizen_visible?: boolean
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_events_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appeals: {
        Row: {
          appellate_organization_id: string | null
          citizen_id: string
          created_at: string
          decided_at: string | null
          decision_reasons: string | null
          decision_summary: string | null
          filed_at: string
          grievance_id: string
          grounds: string
          id: string
          reference_number: string
          requested_relief: string | null
          reviewer_id: string | null
          state: Database["public"]["Enums"]["appeal_state"]
          updated_at: string
        }
        Insert: {
          appellate_organization_id?: string | null
          citizen_id: string
          created_at?: string
          decided_at?: string | null
          decision_reasons?: string | null
          decision_summary?: string | null
          filed_at?: string
          grievance_id: string
          grounds: string
          id?: string
          reference_number?: string
          requested_relief?: string | null
          reviewer_id?: string | null
          state?: Database["public"]["Enums"]["appeal_state"]
          updated_at?: string
        }
        Update: {
          appellate_organization_id?: string | null
          citizen_id?: string
          created_at?: string
          decided_at?: string | null
          decision_reasons?: string | null
          decision_summary?: string | null
          filed_at?: string
          grievance_id?: string
          grounds?: string
          id?: string
          reference_number?: string
          requested_relief?: string | null
          reviewer_id?: string | null
          state?: Database["public"]["Enums"]["appeal_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_appellate_organization_id_fkey"
            columns: ["appellate_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          citizen_visible: boolean
          created_at: string
          description: string | null
          event_type: string
          grievance_id: string
          id: string
          metadata: Json
          organization_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          citizen_visible?: boolean
          created_at?: string
          description?: string | null
          event_type: string
          grievance_id: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          title?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          citizen_visible?: boolean
          created_at?: string
          description?: string | null
          event_type?: string
          grievance_id?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_request_items: {
        Row: {
          created_at: string
          description: string | null
          document_id: string | null
          id: string
          is_required: boolean
          label: string
          request_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_id?: string | null
          id?: string
          is_required?: boolean
          label: string
          request_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_id?: string | null
          id?: string
          is_required?: boolean
          label?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_request_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          created_at: string
          due_at: string | null
          fulfilled_at: string | null
          grievance_id: string
          id: string
          organization_id: string | null
          reason: string | null
          requested_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          fulfilled_at?: string | null
          grievance_id: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          requested_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          fulfilled_at?: string | null
          grievance_id?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          requested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          citizen_visible: boolean
          created_at: string
          doc_kind: string | null
          file_name: string
          grievance_id: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          citizen_visible?: boolean
          created_at?: string
          doc_kind?: string | null
          file_name: string
          grievance_id: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          citizen_visible?: boolean
          created_at?: string
          doc_kind?: string | null
          file_name?: string
          grievance_id?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
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
      feedback: {
        Row: {
          citizen_id: string
          comments: string | null
          confirmation: Database["public"]["Enums"]["citizen_confirmation_state"]
          created_at: string
          grievance_id: string
          id: string
          satisfaction_rating: number | null
          updated_at: string
        }
        Insert: {
          citizen_id: string
          comments?: string | null
          confirmation: Database["public"]["Enums"]["citizen_confirmation_state"]
          created_at?: string
          grievance_id: string
          id?: string
          satisfaction_rating?: number | null
          updated_at?: string
        }
        Update: {
          citizen_id?: string
          comments?: string | null
          confirmation?: Database["public"]["Enums"]["citizen_confirmation_state"]
          created_at?: string
          grievance_id?: string
          id?: string
          satisfaction_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
        ]
      }
      grievance_categories: {
        Row: {
          code: string
          created_at: string
          default_organization_id: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          plain_language_hint: string | null
          sla_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_organization_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          plain_language_hint?: string | null
          sla_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_organization_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          plain_language_hint?: string | null
          sla_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grievance_categories_default_organization_id_fkey"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievance_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "grievance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      grievances: {
        Row: {
          administrative_state: Database["public"]["Enums"]["administrative_state"]
          appellate_organization_id: string | null
          assigned_officer_id: string | null
          category_id: string | null
          citizen_confirmation_state: Database["public"]["Enums"]["citizen_confirmation_state"]
          citizen_id: string
          closed_at: string | null
          created_at: string
          disposed_at: string | null
          district_name: string | null
          id: string
          location_text: string | null
          organization_id: string | null
          original_text: string
          outcome_state: Database["public"]["Enums"]["outcome_state"]
          registration_number: string
          requested_outcome: string | null
          short_title: string
          sla_due_at: string | null
          state_name: string | null
          submitted_at: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          administrative_state?: Database["public"]["Enums"]["administrative_state"]
          appellate_organization_id?: string | null
          assigned_officer_id?: string | null
          category_id?: string | null
          citizen_confirmation_state?: Database["public"]["Enums"]["citizen_confirmation_state"]
          citizen_id: string
          closed_at?: string | null
          created_at?: string
          disposed_at?: string | null
          district_name?: string | null
          id?: string
          location_text?: string | null
          organization_id?: string | null
          original_text: string
          outcome_state?: Database["public"]["Enums"]["outcome_state"]
          registration_number?: string
          requested_outcome?: string | null
          short_title?: string
          sla_due_at?: string | null
          state_name?: string | null
          submitted_at?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          administrative_state?: Database["public"]["Enums"]["administrative_state"]
          appellate_organization_id?: string | null
          assigned_officer_id?: string | null
          category_id?: string | null
          citizen_confirmation_state?: Database["public"]["Enums"]["citizen_confirmation_state"]
          citizen_id?: string
          closed_at?: string | null
          created_at?: string
          disposed_at?: string | null
          district_name?: string | null
          id?: string
          location_text?: string | null
          organization_id?: string | null
          original_text?: string
          outcome_state?: Database["public"]["Enums"]["outcome_state"]
          registration_number?: string
          requested_outcome?: string | null
          short_title?: string
          sla_due_at?: string | null
          state_name?: string | null
          submitted_at?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "grievances_appellate_organization_id_fkey"
            columns: ["appellate_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_assigned_officer_id_fkey"
            columns: ["assigned_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "grievance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_cluster_members: {
        Row: {
          cluster_id: string
          created_at: string
          grievance_id: string
          id: string
          similarity: number | null
        }
        Insert: {
          cluster_id: string
          created_at?: string
          grievance_id: string
          id?: string
          similarity?: number | null
        }
        Update: {
          cluster_id?: string
          created_at?: string
          grievance_id?: string
          id?: string
          similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_cluster_members_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "issue_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_cluster_members_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_clusters: {
        Row: {
          case_count: number
          category_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          case_count?: number
          category_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          case_count?: number
          category_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_clusters_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "grievance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_clusters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          citizen_visible: boolean
          created_at: string
          grievance_id: string
          id: string
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["actor_type"]
        }
        Insert: {
          body: string
          citizen_visible?: boolean
          created_at?: string
          grievance_id: string
          id?: string
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["actor_type"]
        }
        Update: {
          body?: string
          citizen_visible?: boolean
          created_at?: string
          grievance_id?: string
          id?: string
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["actor_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_required: boolean
          appeal_id: string | null
          body: string | null
          created_at: string
          grievance_id: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_required?: boolean
          appeal_id?: string | null
          body?: string | null
          created_at?: string
          grievance_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_required?: boolean
          appeal_id?: string | null
          body?: string | null
          created_at?: string
          grievance_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string
          contact_email: string | null
          created_at: string
          id: string
          is_appellate_office: boolean
          level: Database["public"]["Enums"]["org_level"]
          name: string
          parent_id: string | null
          state_name: string | null
          updated_at: string
        }
        Insert: {
          code: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_appellate_office?: boolean
          level?: Database["public"]["Enums"]["org_level"]
          name: string
          parent_id?: string | null
          state_name?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_appellate_office?: boolean
          level?: Database["public"]["Enums"]["org_level"]
          name?: string
          parent_id?: string | null
          state_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          full_name: string
          id: string
          organization_id: string | null
          phone: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id: string
          organization_id?: string | null
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resolutions: {
        Row: {
          action_taken: string
          authored_by: string | null
          created_at: string
          effective_from: string | null
          grievance_id: string
          id: string
          is_interim: boolean
          organization_id: string | null
          outcome_claimed: Database["public"]["Enums"]["outcome_state"]
          updated_at: string
        }
        Insert: {
          action_taken: string
          authored_by?: string | null
          created_at?: string
          effective_from?: string | null
          grievance_id: string
          id?: string
          is_interim?: boolean
          organization_id?: string | null
          outcome_claimed?: Database["public"]["Enums"]["outcome_state"]
          updated_at?: string
        }
        Update: {
          action_taken?: string
          authored_by?: string | null
          created_at?: string
          effective_from?: string | null
          grievance_id?: string
          id?: string
          is_interim?: boolean
          organization_id?: string | null
          outcome_claimed?: Database["public"]["Enums"]["outcome_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolutions_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      actor_type: "citizen" | "officer" | "system" | "ai_advisor"
      administrative_state:
        | "DRAFT"
        | "SUBMITTED"
        | "ROUTING"
        | "ROUTED"
        | "ASSIGNED"
        | "UNDER_EXAMINATION"
        | "CLARIFICATION_REQUIRED"
        | "CITIZEN_RESPONSE_RECEIVED"
        | "ACTION_IN_PROGRESS"
        | "INTERIM_RESPONSE"
        | "RESOLUTION_PROVIDED"
        | "DISPOSED"
        | "APPEAL_FILED"
        | "APPEAL_UNDER_REVIEW"
        | "APPEAL_DECIDED"
        | "CLOSED"
      app_role: "citizen" | "gro" | "nodal" | "appellate" | "platform_admin"
      appeal_state:
        | "FILED"
        | "UNDER_REVIEW"
        | "DECIDED"
        | "REJECTED"
        | "WITHDRAWN"
      citizen_confirmation_state:
        | "NOT_REQUESTED"
        | "AWAITING_CONFIRMATION"
        | "CONFIRMED_RESOLVED"
        | "PARTIALLY_RESOLVED"
        | "NOT_RESOLVED"
      org_level:
        | "central_ministry"
        | "central_department"
        | "state"
        | "district"
        | "local_body"
        | "appellate_cell"
      outcome_state:
        | "UNKNOWN"
        | "UNRESOLVED"
        | "PARTIALLY_RESOLVED"
        | "RESOLUTION_PROPOSED"
        | "RESOLVED"
      urgency_level: "routine" | "time_sensitive" | "urgent"
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
      actor_type: ["citizen", "officer", "system", "ai_advisor"],
      administrative_state: [
        "DRAFT",
        "SUBMITTED",
        "ROUTING",
        "ROUTED",
        "ASSIGNED",
        "UNDER_EXAMINATION",
        "CLARIFICATION_REQUIRED",
        "CITIZEN_RESPONSE_RECEIVED",
        "ACTION_IN_PROGRESS",
        "INTERIM_RESPONSE",
        "RESOLUTION_PROVIDED",
        "DISPOSED",
        "APPEAL_FILED",
        "APPEAL_UNDER_REVIEW",
        "APPEAL_DECIDED",
        "CLOSED",
      ],
      app_role: ["citizen", "gro", "nodal", "appellate", "platform_admin"],
      appeal_state: [
        "FILED",
        "UNDER_REVIEW",
        "DECIDED",
        "REJECTED",
        "WITHDRAWN",
      ],
      citizen_confirmation_state: [
        "NOT_REQUESTED",
        "AWAITING_CONFIRMATION",
        "CONFIRMED_RESOLVED",
        "PARTIALLY_RESOLVED",
        "NOT_RESOLVED",
      ],
      org_level: [
        "central_ministry",
        "central_department",
        "state",
        "district",
        "local_body",
        "appellate_cell",
      ],
      outcome_state: [
        "UNKNOWN",
        "UNRESOLVED",
        "PARTIALLY_RESOLVED",
        "RESOLUTION_PROPOSED",
        "RESOLVED",
      ],
      urgency_level: ["routine", "time_sensitive", "urgent"],
    },
  },
} as const
