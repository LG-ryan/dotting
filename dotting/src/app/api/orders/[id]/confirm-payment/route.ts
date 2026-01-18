import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPaymentConfirmedEmail } from '@/lib/email/send-payment-confirmed'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()

  // 1. 주문 정보 조회
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      session_id,
      package,
      status,
      users (
        email,
        name
      ),
      sessions (
        subject_name
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // 2. 이미 결제 완료된 주문인지 확인
  if (order.status === 'paid') {
    return NextResponse.json({ message: 'Already confirmed' }, { status: 200 })
  }

  // 3. 주문 상태를 'paid'로 변경
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('[DOTTING] Failed to update order status:', updateError)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  // 4. 이메일 발송 (비동기)
  try {
    await sendPaymentConfirmedEmail({
      userEmail: (order.users as any)?.email || '',
      userName: (order.users as any)?.name || '고객',
      orderId: order.id,
      packageType: order.package,
      subjectName: (order.sessions as any)?.subject_name || '대상자',
      sessionId: order.session_id,
    })
  } catch (emailError) {
    // 이메일 발송 실패해도 주문 상태는 유지
    console.error('[DOTTING] Failed to send email:', emailError)
  }

  return NextResponse.json({
    success: true,
    message: 'Payment confirmed and email sent',
  })
}
