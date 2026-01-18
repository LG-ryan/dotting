import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/orders/[id]/archive/generate
 * 유산 상자(ZIP) 생성 트리거
 */
export async function POST(
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
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      session_id,
      package,
      status,
      archive_url,
      archive_generated_at
    `)
    .eq('id', orderId)
    .single()
  
  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  
  // 소유권 확인
  if (order.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Heritage(premium) 패키지만 허용
  if (order.package !== 'premium') {
    return NextResponse.json({ 
      error: 'Archive is only available for Heritage package' 
    }, { status: 403 })
  }
  
  // 주문 상태 확인 (편집 승인 완료 필요)
  const { data: compilation } = await supabase
    .from('compilations')
    .select('id, status, pdf_url')
    .eq('session_id', order.session_id)
    .single()
  
  if (!compilation || compilation.status !== 'approved_for_pdf' || !compilation.pdf_url) {
    return NextResponse.json({ 
      error: 'Compilation must be approved and PDF generated first' 
    }, { status: 400 })
  }
  
  // 이미 생성된 아카이브가 있는지 확인
  if (order.archive_url && order.archive_generated_at) {
    // 재생성 여부 확인
    const { regenerate } = await request.json().catch(() => ({ regenerate: false }))
    
    if (!regenerate) {
      return NextResponse.json({
        success: true,
        status: 'already_exists',
        archiveUrl: order.archive_url,
        generatedAt: order.archive_generated_at,
      })
    }
  }
  
  // 아카이브 생성 상태 업데이트
  await supabase
    .from('orders')
    .update({
      archive_status: 'generating',
      archive_started_at: new Date().toISOString(),
      archive_progress: 0,
      archive_estimated_seconds: null,
    })
    .eq('id', orderId)
  
  // Background Job 트리거 (실제로는 큐 시스템 사용)
  // 현재는 간단히 별도 API 호출로 처리
  try {
    // Worker API 호출 (내부 API)
    const workerUrl = new URL('/api/orders/[id]/archive/worker', request.url)
    workerUrl.pathname = workerUrl.pathname.replace('[id]', orderId)
    
    // 비동기로 Worker 실행 (응답 기다리지 않음)
    fetch(workerUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
    }).catch(err => {
      console.error('Worker trigger failed:', err)
    })
    
    return NextResponse.json({
      success: true,
      status: 'generating',
      orderId: orderId,
      message: '유산 상자를 준비하고 있습니다',
    })
  } catch (error) {
    console.error('Archive generation trigger failed:', error)
    
    // 상태 롤백
    await supabase
      .from('orders')
      .update({
        archive_status: 'failed',
      })
      .eq('id', orderId)
    
    return NextResponse.json({ 
      error: 'Failed to trigger archive generation' 
    }, { status: 500 })
  }
}
