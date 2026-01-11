import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGE_PRICES } from '@/lib/payment-constants'
import type { PackageType } from '@/types/database'

/**
 * POST /api/orders
 * 주문 생성 (결제 요청)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 요청 바디 파싱
  const body = await request.json()
  const { sessionId, packageType, amount } = body as {
    sessionId: string
    packageType: PackageType
    amount: number
  }
  
  if (!sessionId || !packageType) {
    return NextResponse.json({ error: 'sessionId and packageType are required' }, { status: 400 })
  }
  
  // 패키지 타입 유효성 검사
  if (!['pdf_only', 'standard', 'premium'].includes(packageType)) {
    return NextResponse.json({ error: 'Invalid packageType' }, { status: 400 })
  }
  
  // 금액 유효성 검사
  const expectedAmount = PACKAGE_PRICES[packageType]
  if (amount !== expectedAmount) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  
  // 세션 소유권 확인
  const { data: session } = await supabase
    .from('sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .single()
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  if (session.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 기존 활성 주문 확인
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .not('status', 'in', '("completed","cancelled","refunded","expired")')
    .single()
  
  if (existingOrder) {
    return NextResponse.json({ 
      error: 'ACTIVE_ORDER_EXISTS',
      message: '이미 진행 중인 주문이 있습니다.',
      orderId: existingOrder.id,
      status: existingOrder.status,
    }, { status: 409 })
  }
  
  // 주문 생성
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      package: packageType,
      amount: amount,
      status: 'pending_payment',
      payment_method: 'manual',
      payment_requested_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
  
  return NextResponse.json({
    success: true,
    orderId: order.id,
    status: order.status,
  })
}

/**
 * GET /api/orders
 * 내 주문 목록 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  
  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }
  
  const { data: orders, error } = await query
  
  if (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
  
  return NextResponse.json({ orders })
}
