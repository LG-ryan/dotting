import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/orders/[id]/archive/status
 * 유산 상자 생성 상태 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id: orderId } = await params
  
  // 주문 확인
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      archive_status,
      archive_url,
      archive_generated_at,
      archive_started_at,
      archive_progress,
      archive_estimated_seconds
    `)
    .eq('id', orderId)
    .single()
  
  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  
  // 소유권 확인
  if (order.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  return NextResponse.json({
    orderId: order.id,
    status: order.archive_status || 'not_started',
    archiveUrl: order.archive_url,
    generatedAt: order.archive_generated_at,
    startedAt: order.archive_started_at,
    progress: order.archive_progress || 0,
    estimatedSeconds: order.archive_estimated_seconds || null,
  })
}
