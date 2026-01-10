import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// HMAC 시크릿 (환경변수로 관리)
const TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newContent } = body

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.', success: false }, { status: 400 })
    }

    if (!newContent || !newContent.trim()) {
      return NextResponse.json({ error: '내용을 입력해주세요.', success: false }, { status: 400 })
    }

    // 토큰으로 세션 조회
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .rpc('get_session_by_share_token', { p_token: token })
    
    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 링크입니다.', success: false },
        { status: 401 }
      )
    }

    const session = sessionData[0]

    // 마지막 사용자 메시지 찾기
    const { data: lastUserMessage } = await supabaseAdmin
      .from('messages')
      .select('id, content, order_index')
      .eq('session_id', session.id)
      .eq('role', 'user')
      .is('deleted_at', null)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: '수정할 답변이 없습니다.', success: false },
        { status: 400 }
      )
    }

    const trimmedContent = newContent.trim()

    // 내용이 같으면 수정 불필요
    if (lastUserMessage.content === trimmedContent) {
      return NextResponse.json({
        success: true,
        messageId: lastUserMessage.id,
        shouldRegenerate: false,
      })
    }

    // 현재 최대 order_index 확인 (재생성 필요 여부 판단)
    const { data: maxOrderData } = await supabaseAdmin
      .from('messages')
      .select('order_index')
      .eq('session_id', session.id)
      .is('deleted_at', null)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const maxOrder = maxOrderData?.order_index || 0
    
    // 마지막 사용자 메시지 바로 다음이 최신이면 재생성 필요
    // (즉, 사용자 메시지 다음에 AI 질문 1개만 있거나 없는 경우)
    const shouldRegenerate = maxOrder <= lastUserMessage.order_index + 1

    // 토큰 해시 생성 (HMAC)
    const tokenHash = crypto
      .createHmac('sha256', TOKEN_HASH_SECRET)
      .update(token)
      .digest('hex')

    // 메시지 내용 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ content: trimmedContent })
      .eq('id', lastUserMessage.id)

    if (updateError) {
      console.error('Failed to update message:', updateError)
      return NextResponse.json(
        { error: '수정에 실패했습니다.', success: false },
        { status: 500 }
      )
    }

    // 감사 로그 저장
    const { error: logError } = await supabaseAdmin
      .from('respondent_message_edit_logs')
      .insert({
        message_id: lastUserMessage.id,
        session_id: session.id,
        before_content: lastUserMessage.content,
        after_content: trimmedContent,
        edit_type: 'edit',
        share_token_hash: tokenHash,
      })

    if (logError) {
      console.error('Failed to save edit log:', logError)
      // 로그 저장 실패는 치명적이지 않으므로 계속 진행
    }

    // 재생성이 필요하면 다음 AI 메시지 soft delete
    if (shouldRegenerate) {
      await supabaseAdmin
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('session_id', session.id)
        .gt('order_index', lastUserMessage.order_index)
        .is('deleted_at', null)
    }

    return NextResponse.json({
      success: true,
      messageId: lastUserMessage.id,
      shouldRegenerate,
    })
  } catch (error) {
    console.error('Failed to edit message:', error)
    return NextResponse.json(
      { error: '수정에 실패했습니다.', success: false },
      { status: 500 }
    )
  }
}
