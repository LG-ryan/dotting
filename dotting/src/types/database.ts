// Supabase Database Types
// Version: 1.1 (Security & Soft Delete Fix)
// 스키마 기반 자동 생성 권장: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ENUM Types
export type SessionStatus = 'draft' | 'in_progress' | 'completed'
export type SessionMode = 'relaxed' | 'dday' | 'together'
export type MessageRole = 'ai' | 'user'
export type InputType = 'text' | 'voice'
export type OutputStatus = 'preview' | 'draft' | 'reviewed' | 'finalized' | 'locked'
export type EditorType = 'child' | 'ai'

// Episode ENUM Types (v1.2)
export type EpisodeTheme = 
  | 'childhood'
  | 'adolescence'
  | 'early_adulthood'
  | 'career'
  | 'marriage'
  | 'parenting'
  | 'turning_point'
  | 'hardship'
  | 'joy'
  | 'reflection'
  | 'legacy'

export type EpisodeInclusion = 'candidate' | 'core' | 'supporting' | 'appendix' | 'excluded'

// Compilation ENUM Types (v1.3)
export type CompilationIntent = 'preview' | 'final'
export type CompilationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type ParagraphType = 'grounded' | 'connector' | 'editorial' | 'intro' | 'outro'

// Review Status ENUM Types (v1.4)
export type ReviewStatus = 
  | 'pending_review'
  | 'needs_fixes'
  | 'approved_for_edit'
  | 'approved_for_pdf'
  | 'approved_for_print'
  | 'printed'
  | 'print_failed'

export type ChangedByType = 'user' | 'system' | 'admin'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          subject_name: string
          subject_relation: string
          mode: SessionMode
          mode_config: Json
          status: SessionStatus
          share_token: string | null
          share_token_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_name: string
          subject_relation: string
          mode?: SessionMode
          mode_config?: Json
          status?: SessionStatus
          share_token?: string | null
          share_token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_name?: string
          subject_relation?: string
          mode?: SessionMode
          mode_config?: Json
          status?: SessionStatus
          share_token?: string | null
          share_token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: MessageRole
          content: string
          input_type: InputType
          audio_url: string | null
          order_index: number
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          role: MessageRole
          content: string
          input_type?: InputType
          audio_url?: string | null
          order_index: number
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          role?: MessageRole
          content?: string
          input_type?: InputType
          audio_url?: string | null
          order_index?: number
          created_at?: string
          deleted_at?: string | null
        }
      }
      context_snapshots: {
        Row: {
          id: string
          session_id: string
          version: number
          is_current: boolean
          key_facts: Json
          emotional_moments: Json
          topics_covered: Json
          topics_remaining: Json
          next_topic_suggestion: string | null
          last_message_id: string | null
          created_at: string
          updated_at: string  // 추가됨
        }
        Insert: {
          id?: string
          session_id: string
          version?: number
          is_current?: boolean
          key_facts?: Json
          emotional_moments?: Json
          topics_covered?: Json
          topics_remaining?: Json
          next_topic_suggestion?: string | null
          last_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          version?: number
          is_current?: boolean
          key_facts?: Json
          emotional_moments?: Json
          topics_covered?: Json
          topics_remaining?: Json
          next_topic_suggestion?: string | null
          last_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      emotional_events: {
        Row: {
          id: string
          session_id: string
          message_id: string
          context_snapshot_id: string | null
          detected_emotion: string
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          message_id: string
          context_snapshot_id?: string | null
          detected_emotion: string
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          message_id?: string
          context_snapshot_id?: string | null
          detected_emotion?: string
          confidence?: number | null
          created_at?: string
        }
      }
      output_drafts: {
        Row: {
          id: string
          session_id: string
          title: string | null
          status: OutputStatus
          locked_at: string | null  // 추가됨
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          title?: string | null
          status?: OutputStatus
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          title?: string | null
          status?: OutputStatus
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          output_draft_id: string
          order_index: number
          title: string | null
          content: string | null
          source_message_ids: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          output_draft_id: string
          order_index: number
          title?: string | null
          content?: string | null
          source_message_ids?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          output_draft_id?: string
          order_index?: number
          title?: string | null
          content?: string | null
          source_message_ids?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      edit_history: {
        Row: {
          id: string
          chapter_id: string
          edited_by: EditorType
          before_content: string | null
          after_content: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          chapter_id: string
          edited_by: EditorType
          before_content?: string | null
          after_content?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          chapter_id?: string
          edited_by?: EditorType
          before_content?: string | null
          after_content?: string | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      episodes: {
        Row: {
          id: string
          session_id: string
          order_index: number
          title: string | null
          theme: EpisodeTheme
          time_period: string | null
          source_message_ids: string[]  // UUID[]
          summary: string
          content: string | null
          inclusion_status: EpisodeInclusion
          emotional_weight: number
          has_turning_point: boolean
          has_reflection: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          order_index: number
          title?: string | null
          theme: EpisodeTheme
          time_period?: string | null
          source_message_ids?: string[]
          summary: string
          content?: string | null
          inclusion_status?: EpisodeInclusion
          emotional_weight?: number
          has_turning_point?: boolean
          has_reflection?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          order_index?: number
          title?: string | null
          theme?: EpisodeTheme
          time_period?: string | null
          source_message_ids?: string[]
          summary?: string
          content?: string | null
          inclusion_status?: EpisodeInclusion
          emotional_weight?: number
          has_turning_point?: boolean
          has_reflection?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      compilations: {
        Row: {
          id: string
          session_id: string
          version: number
          intent: CompilationIntent
          status: CompilationStatus
          preferred_structure: string | null
          chapter_count_min: number
          chapter_count_max: number
          paragraphs_per_chapter_min: number
          paragraphs_per_chapter_max: number
          editor_notes: string | null
          idempotency_key: string | null
          progress: Json  // { phase, percent, message, updated_at }
          result_meta: Json | null
          error_message: string | null
          error_detail: Json | null  // 실패 시 상세 정보
          review_status: ReviewStatus  // 검수 상태 (비즈니스 플로우)
          pdf_snapshot_at: string | null  // PDF 스냅샷 시점
          pdf_snapshot_version: number | null  // PDF 스냅샷 버전
          pdf_confirmed_at: string | null  // PDF 확인 시점
          pdf_confirmed_by: string | null  // PDF 확인자 (자녀)
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          version: number
          intent: CompilationIntent
          status?: CompilationStatus
          preferred_structure?: string | null
          chapter_count_min?: number
          chapter_count_max?: number
          paragraphs_per_chapter_min?: number
          paragraphs_per_chapter_max?: number
          editor_notes?: string | null
          idempotency_key?: string | null
          progress?: Json
          result_meta?: Json | null
          error_message?: string | null
          error_detail?: Json | null
          review_status?: ReviewStatus
          pdf_snapshot_at?: string | null
          pdf_snapshot_version?: number | null
          pdf_confirmed_at?: string | null
          pdf_confirmed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          version?: number
          intent?: CompilationIntent
          status?: CompilationStatus
          preferred_structure?: string | null
          chapter_count_min?: number
          chapter_count_max?: number
          paragraphs_per_chapter_min?: number
          paragraphs_per_chapter_max?: number
          editor_notes?: string | null
          idempotency_key?: string | null
          progress?: Json
          result_meta?: Json | null
          error_message?: string | null
          error_detail?: Json | null
          review_status?: ReviewStatus
          pdf_snapshot_at?: string | null
          pdf_snapshot_version?: number | null
          pdf_confirmed_at?: string | null
          pdf_confirmed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      compilation_episode_inclusions: {
        Row: {
          id: string
          compilation_id: string
          episode_id: string
          inclusion_status: EpisodeInclusion
          decision_reason: string | null
          signals: Json
        }
        Insert: {
          id?: string
          compilation_id: string
          episode_id: string
          inclusion_status: EpisodeInclusion
          decision_reason?: string | null
          signals?: Json
        }
        Update: {
          id?: string
          compilation_id?: string
          episode_id?: string
          inclusion_status?: EpisodeInclusion
          decision_reason?: string | null
          signals?: Json
        }
      }
      compiled_chapters: {
        Row: {
          id: string
          compilation_id: string
          order_index: number
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          compilation_id: string
          order_index: number
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          compilation_id?: string
          order_index?: number
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      compiled_paragraphs: {
        Row: {
          id: string
          chapter_id: string
          order_index: number
          content: string
          paragraph_type: ParagraphType
          revision: number
          is_hidden: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chapter_id: string
          order_index: number
          content: string
          paragraph_type?: ParagraphType
          revision?: number
          is_hidden?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chapter_id?: string
          order_index?: number
          content?: string
          paragraph_type?: ParagraphType
          revision?: number
          is_hidden?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      compiled_paragraph_sources: {
        Row: {
          id: string
          paragraph_id: string
          episode_id: string
          message_ids: string[]  // UUID[]
        }
        Insert: {
          id?: string
          paragraph_id: string
          episode_id: string
          message_ids?: string[]
        }
        Update: {
          id?: string
          paragraph_id?: string
          episode_id?: string
          message_ids?: string[]
        }
      }
      compiled_paragraph_edits: {
        Row: {
          id: string
          paragraph_id: string
          edited_by_type: 'user' | 'ai'
          edited_by_user_id: string | null
          before_content: string | null
          after_content: string | null
          edit_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          paragraph_id: string
          edited_by_type: 'user' | 'ai'
          edited_by_user_id?: string | null
          before_content?: string | null
          after_content?: string | null
          edit_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          paragraph_id?: string
          edited_by_type?: 'user' | 'ai'
          edited_by_user_id?: string | null
          before_content?: string | null
          after_content?: string | null
          edit_reason?: string | null
          created_at?: string
        }
      }
      ai_regen_jobs: {
        Row: {
          id: string
          compilation_id: string
          target_chapter_id: string | null
          target_paragraph_id: string | null
          status: CompilationStatus
          options: Json | null
          result_paragraph_id: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          compilation_id: string
          target_chapter_id?: string | null
          target_paragraph_id?: string | null
          status?: CompilationStatus
          options?: Json | null
          result_paragraph_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          compilation_id?: string
          target_chapter_id?: string | null
          target_paragraph_id?: string | null
          status?: CompilationStatus
          options?: Json | null
          result_paragraph_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      review_status_logs: {
        Row: {
          id: string
          compilation_id: string
          from_status: ReviewStatus | null
          to_status: ReviewStatus
          changed_by: string | null  // 자녀(구매자) UUID
          changed_by_type: ChangedByType
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compilation_id: string
          from_status?: ReviewStatus | null
          to_status: ReviewStatus
          changed_by?: string | null
          changed_by_type: ChangedByType
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compilation_id?: string
          from_status?: ReviewStatus | null
          to_status?: ReviewStatus
          changed_by?: string | null
          changed_by_type?: ChangedByType
          reason?: string | null
          created_at?: string
        }
      }
      compiled_paragraph_snapshots: {
        Row: {
          id: string
          compilation_id: string
          pdf_snapshot_version: number
          paragraph_id: string
          chapter_order_index: number
          paragraph_order_index: number
          content: string
          paragraph_type: ParagraphType
          is_hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          compilation_id: string
          pdf_snapshot_version: number
          paragraph_id: string
          chapter_order_index: number
          paragraph_order_index: number
          content: string
          paragraph_type: ParagraphType
          is_hidden: boolean
          created_at?: string
        }
        Update: {
          id?: string
          compilation_id?: string
          pdf_snapshot_version?: number
          paragraph_id?: string
          chapter_order_index?: number
          paragraph_order_index?: number
          content?: string
          paragraph_type?: ParagraphType
          is_hidden?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      create_context_snapshot: {
        Args: {
          p_session_id: string
          p_key_facts: Json
          p_emotional_moments: Json
          p_topics_covered: Json
          p_topics_remaining: Json
          p_next_topic_suggestion: string
          p_last_message_id: string
        }
        Returns: string
      }
      get_session_by_share_token: {
        Args: {
          p_token: string
        }
        Returns: {
          id: string
          subject_name: string
          subject_relation: string
          mode: SessionMode
          mode_config: Json
          status: SessionStatus
        }[]
      }
      insert_message_by_token: {
        Args: {
          p_token: string
          p_role: MessageRole
          p_content: string
          p_input_type?: InputType
          p_audio_url?: string | null
        }
        Returns: string
      }
      get_messages_by_token: {
        Args: {
          p_token: string
        }
        Returns: {
          id: string
          role: MessageRole
          content: string
          input_type: InputType
          order_index: number
          created_at: string
        }[]
      }
    }
  }
}

// 편의 타입
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']

// 자주 사용하는 타입 별칭
export type User = Tables<'users'>
export type Session = Tables<'sessions'>
export type Message = Tables<'messages'>
export type ContextSnapshot = Tables<'context_snapshots'>
export type EmotionalEvent = Tables<'emotional_events'>
export type OutputDraft = Tables<'output_drafts'>
export type Chapter = Tables<'chapters'>
export type EditHistory = Tables<'edit_history'>
export type Episode = Tables<'episodes'>

// Compilation 관련 타입 (v1.3)
export type Compilation = Tables<'compilations'>
export type CompilationEpisodeInclusion = Tables<'compilation_episode_inclusions'>
export type CompiledChapter = Tables<'compiled_chapters'>
export type CompiledParagraph = Tables<'compiled_paragraphs'>
export type CompiledParagraphSource = Tables<'compiled_paragraph_sources'>
export type CompiledParagraphEdit = Tables<'compiled_paragraph_edits'>
export type AiRegenJob = Tables<'ai_regen_jobs'>

// Review Status 관련 타입 (v1.4)
export type ReviewStatusLog = Tables<'review_status_logs'>

// PDF Snapshot 관련 타입 (v1.5)
export type CompiledParagraphSnapshot = Tables<'compiled_paragraph_snapshots'>
