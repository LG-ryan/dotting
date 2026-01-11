// Supabase Database Types
// Version: 1.6 (Orders & Payments)
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

// User Role Types (v1.5)
export type UserRole = 'user' | 'admin' | 'operator'

// Print Order Status Types (v1.5)
export type PrintOrderStatus = 
  | 'pending'        // 인쇄 대기 (approved_for_print 직후)
  | 'printing'       // 인쇄 진행 중
  | 'shipped'        // 발송 완료
  | 'delivered'      // 배송 완료
  | 'claim_opened'   // 클레임 접수
  | 'claim_resolved' // 클레임 해결

// Order & Payment Types (v1.6)
export type PackageType = 'pdf_only' | 'standard' | 'premium'

export type OrderStatus =
  | 'pending_payment'  // 결제 대기
  | 'paid'             // 결제 완료 (LLM 비용 발생 허용)
  | 'in_production'    // 제작 중 (인터뷰→컴파일→PDF)
  | 'ready_to_ship'    // 인쇄 완료, 배송 대기
  | 'shipped'          // 배송 중
  | 'delivered'        // 배송 완료
  | 'completed'        // 완료
  | 'refunded'         // 환불 완료
  | 'cancelled'        // 취소됨
  | 'expired'          // 결제 기한 만료

export type PaymentMethod = 'manual' | 'toss' | 'kakao' | 'card'

export type ClaimStatus = 'opened' | 'in_review' | 'resolved' | 'rejected'

export type ClaimType = 
  | 'print_defect'     // 인쇄 불량
  | 'shipping_damage'  // 배송 파손
  | 'wrong_delivery'   // 오배송
  | 'content_error'    // 내용 오류
  | 'other'            // 기타

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
      print_orders: {
        Row: {
          id: string
          compilation_id: string
          status: PrintOrderStatus
          // 배송 정보
          recipient_name: string
          recipient_phone: string
          shipping_address: string
          shipping_address_detail: string | null
          postal_code: string
          // 송장 정보
          tracking_carrier: string | null
          tracking_number: string | null
          // 클레임 정보
          claim_reason: string | null
          claim_resolution: string | null
          // 관리 정보
          admin_note: string | null
          processed_by: string | null
          // 타임스탬프
          created_at: string
          updated_at: string
          shipped_at: string | null
          delivered_at: string | null
          claim_opened_at: string | null
          claim_resolved_at: string | null
        }
        Insert: {
          id?: string
          compilation_id: string
          status?: PrintOrderStatus
          recipient_name: string
          recipient_phone: string
          shipping_address: string
          shipping_address_detail?: string | null
          postal_code: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          claim_reason?: string | null
          claim_resolution?: string | null
          admin_note?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
          shipped_at?: string | null
          delivered_at?: string | null
          claim_opened_at?: string | null
          claim_resolved_at?: string | null
        }
        Update: {
          id?: string
          compilation_id?: string
          status?: PrintOrderStatus
          recipient_name?: string
          recipient_phone?: string
          shipping_address?: string
          shipping_address_detail?: string | null
          postal_code?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          claim_reason?: string | null
          claim_resolution?: string | null
          admin_note?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
          shipped_at?: string | null
          delivered_at?: string | null
          claim_opened_at?: string | null
          claim_resolved_at?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          session_id: string  // session = project in DOTTING
          package: PackageType
          amount: number
          status: OrderStatus
          payment_method: PaymentMethod | null
          payment_note: string | null
          payment_requested_at: string | null
          paid_at: string | null
          progress: Json
          recipient_name: string | null
          shipping_address: string | null
          shipping_phone: string | null
          tracking_carrier: string | null
          tracking_number: string | null
          shipped_at: string | null
          delivered_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          refunded_at: string | null
          refund_amount: number | null
          refund_reason: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          package: PackageType
          amount: number
          status?: OrderStatus
          payment_method?: PaymentMethod | null
          payment_note?: string | null
          payment_requested_at?: string | null
          paid_at?: string | null
          progress?: Json
          recipient_name?: string | null
          shipping_address?: string | null
          shipping_phone?: string | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          package?: PackageType
          amount?: number
          status?: OrderStatus
          payment_method?: PaymentMethod | null
          payment_note?: string | null
          payment_requested_at?: string | null
          paid_at?: string | null
          progress?: Json
          recipient_name?: string | null
          shipping_address?: string | null
          shipping_phone?: string | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      order_status_logs: {
        Row: {
          id: string
          order_id: string
          from_status: OrderStatus | null
          to_status: OrderStatus
          changed_by: string | null
          reason: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          from_status?: OrderStatus | null
          to_status: OrderStatus
          changed_by?: string | null
          reason?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          from_status?: OrderStatus | null
          to_status?: OrderStatus
          changed_by?: string | null
          reason?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      claims: {
        Row: {
          id: string
          order_id: string
          type: ClaimType
          status: ClaimStatus
          description: string
          attachments: Json
          resolution: string | null
          resolved_by: string | null
          resolved_at: string | null
          compensation_type: string | null
          compensation_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          type: ClaimType
          status?: ClaimStatus
          description: string
          attachments?: Json
          resolution?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          compensation_type?: string | null
          compensation_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          type?: ClaimType
          status?: ClaimStatus
          description?: string
          attachments?: Json
          resolution?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          compensation_type?: string | null
          compensation_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      claim_logs: {
        Row: {
          id: string
          claim_id: string
          from_status: ClaimStatus | null
          to_status: ClaimStatus
          changed_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          from_status?: ClaimStatus | null
          to_status: ClaimStatus
          changed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          claim_id?: string
          from_status?: ClaimStatus | null
          to_status?: ClaimStatus
          changed_by?: string | null
          note?: string | null
          created_at?: string
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

// Order & Payment 관련 타입 (v1.6)
export type Order = Tables<'orders'>
export type OrderStatusLog = Tables<'order_status_logs'>
export type Claim = Tables<'claims'>
export type ClaimLog = Tables<'claim_logs'>
