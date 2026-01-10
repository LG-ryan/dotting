import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId가 필요합니다' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component에서 호출된 경우 무시
            }
          },
        },
      }
    )

    // preview 상태의 draft 조회
    const { data: draft } = await supabase
      .from('output_drafts')
      .select('id, title, status, created_at, regeneration_count, fingerprint_message_id, fingerprint_message_count')
      .eq('session_id', sessionId)
      .eq('status', 'preview')
      .single()

    if (!draft) {
      return NextResponse.json({ 
        exists: false,
        preview: null 
      })
    }

    // 챕터 조회
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title, content, order_index')
      .eq('output_draft_id', draft.id)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ 
        exists: false,
        preview: null 
      })
    }

    return NextResponse.json({
      exists: true,
      preview: {
        draftId: draft.id,
        chapter: {
          title: chapters[0].title,
          content: chapters[0].content,
        },
        createdAt: draft.created_at,
        attempts: draft.regeneration_count || 0,
        // fingerprint (캐시 유효성 검사용)
        fingerprint: {
          messageId: draft.fingerprint_message_id,
          messageCount: draft.fingerprint_message_count,
        }
      }
    })

  } catch (error) {
    console.error('[DOTTING] Get preview error:', error)
    return NextResponse.json(
      { error: '미리보기 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
