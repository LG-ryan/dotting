import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 세션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 세션 소유권 확인
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 세션 삭제 (관련 메시지, 에피소드 등은 CASCADE로 삭제되거나 soft delete)
  const { error: deleteError } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (deleteError) {
    console.error('[DOTTING] Failed to delete session:', deleteError)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
