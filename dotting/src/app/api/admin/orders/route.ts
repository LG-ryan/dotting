import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types/database'

/**
 * GET /api/admin/orders
 * 관리자용 주문 목록 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 관리자 권한 확인
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!userData || !['admin', 'operator'].includes(userData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 필터 파라미터
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as OrderStatus | null
  
  // 주문 조회 쿼리
  let query = supabase
    .from('orders')
    .select(`
      *,
      session:sessions (
        id,
        subject_name,
        subject_relation,
        user:users (
          id,
          email,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data: orders, error } = await query
  
  if (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
  
  return NextResponse.json({ orders })
}
