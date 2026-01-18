import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/orders/[id]/archive/download
 * 유산 상자 다운로드 (Signed URL 반환)
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
      archive_url,
      archive_status
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
  
  // 아카이브 생성 여부 확인
  if (!order.archive_url || order.archive_status !== 'ready') {
    return NextResponse.json({ 
      error: 'Archive not ready',
      status: order.archive_status || 'not_started',
    }, { status: 400 })
  }
  
  // Signed URL 생성 (1시간 유효)
  const { data: signedData, error: signError } = await supabase
    .storage
    .from('archives')
    .createSignedUrl(order.archive_url, 3600) // 1시간
  
  if (signError || !signedData) {
    console.error('Failed to create signed URL:', signError)
    return NextResponse.json({ 
      error: 'Failed to generate download URL' 
    }, { status: 500 })
  }
  
  return NextResponse.json({
    downloadUrl: signedData.signedUrl,
    expiresIn: 3600,
  })
}
