/**
 * DOTTING Admin Print Orders API
 * 
 * GET: 인쇄 주문 목록 조회 (관리자 전용)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PrintOrderStatus } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    // 관리자 권한 확인
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userData || !['admin', 'operator'].includes(userData.role || '')) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }
    
    // 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as PrintOrderStatus | null
    
    // 주문 목록 조회
    let query = (supabase
      .from('print_orders') as any)
      .select(`
        *,
        compilation:compilations(
          id,
          pdf_snapshot_version,
          session:sessions(
            id,
            subject_name,
            user:users(
              id,
              email,
              name
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: orders, error: fetchError } = await query
    
    if (fetchError) {
      console.error('[Admin PrintOrders] Fetch error:', fetchError)
      return NextResponse.json(
        { error: '주문 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ orders })
    
  } catch (error) {
    console.error('[Admin PrintOrders] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
