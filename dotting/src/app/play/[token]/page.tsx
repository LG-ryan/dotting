import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { sortByMomentIndex, type UniversalMessage } from '@/types/database'

/**
 * DOTTING 오디오 플레이어 페이지
 * 
 * Zero Friction 진입:
 * - 앱 설치 불필요
 * - 로그인 불필요
 * - QR 스캔 → 즉시 재생
 * 
 * 유니버설 디자인:
 * - 시니어: 명확한 UI, 56px 버튼
 * - 젊은 세대: 정갈한 디자인, 즉시 스킵
 */

interface PageProps {
  params: {
    token: string
  }
}

/**
 * 서버 컴포넌트: 토큰 검증 및 데이터 로딩
 */
export default async function AudioPlayerPage({ params }: PageProps) {
  const { token } = params
  
  // 토큰 형식 검증 (32자 hex)
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
    notFound()
  }
  
  const supabase = await createServerClient()
  
  // 1. 플레이리스트 조회
  const { data: playlist, error: playlistError } = await supabase
    .from('audio_playlists')
    .select('*')
    .eq('share_token', token)
    .single()
  
  if (playlistError || !playlist) {
    notFound()
  }
  
  // 2. 만료 확인
  if (playlist.expires_at) {
    const expiresAt = new Date(playlist.expires_at)
    if (expiresAt < new Date()) {
      return <ExpiredPage speakerName={playlist.speaker_name} />
    }
  }
  
  // 3. 간직할 순간 메시지 조회
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .in('id', playlist.moment_message_ids)
  
  if (messagesError || !messages || messages.length === 0) {
    return <ErrorPage error="audio_load_failed" />
  }
  
  // 4. 순간 순서대로 정렬
  const sortedMoments = sortByMomentIndex(messages as UniversalMessage[])
  
  // 5. 재생 횟수 증가 (비동기, 실패해도 진행)
  supabase.rpc('increment_playlist_play_count', { 
    p_share_token: token 
  }).then(() => {
    console.log('[DOTTING] Play count incremented')
  }).catch((err) => {
    console.warn('[DOTTING] Failed to increment play count:', err)
  })
  
  // 6. 클라이언트 컴포넌트로 전달
  return (
    <AudioMomentPlayerWrapper
      playlist={playlist}
      moments={sortedMoments}
      packageType={playlist.package_type as 'story' | 'heritage'}
    />
  )
}

/**
 * 만료된 플레이리스트 페이지
 */
function ExpiredPage({ speakerName }: { speakerName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--dotting-soft-cream)] px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--dotting-warm-amber)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--dotting-warm-amber)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-[var(--dotting-deep-navy)] mb-3">
            링크가 만료되었습니다
          </h1>
          
          <p className="text-[17px] text-[var(--dotting-muted-gray)] leading-[1.7]">
            {speakerName}님의 목소리는<br />
            책을 주문하신 분께 요청하시면<br />
            다시 들으실 수 있습니다.
          </p>
        </div>
        
        <div className="p-4 bg-[var(--dotting-warm-gold)]/30 rounded-xl border border-[var(--dotting-warm-amber)]/20">
          <p className="text-[13px] text-[var(--dotting-muted-gray)]">
            💡 책과 함께 전달된 USB 메모리나<br />
            다운로드한 파일로 영구 보관 가능합니다
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 에러 페이지
 */
function ErrorPage({ error }: { error: string }) {
  const messages = {
    audio_load_failed: {
      title: '목소리를 불러올 수 없습니다',
      description: '네트워크 연결을 확인하고\n다시 시도해주세요.',
    },
    network_error: {
      title: '연결이 끊겼습니다',
      description: '인터넷 연결을 확인하고\n새로고침해주세요.',
    },
  }
  
  const message = messages[error as keyof typeof messages] || messages.audio_load_failed
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--dotting-soft-cream)] px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--dotting-rose-pink)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--dotting-rose-pink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-[var(--dotting-deep-navy)] mb-3">
            {message.title}
          </h1>
          
          <p className="text-[17px] text-[var(--dotting-muted-gray)] leading-[1.7] whitespace-pre-line">
            {message.description}
          </p>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="w-full h-14 bg-[var(--dotting-deep-navy)] text-white font-semibold rounded-xl
                     hover:bg-[#2A4A6F] active:scale-[0.97] transition-all"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}

/**
 * 클라이언트 컴포넌트 래퍼 (동적 import)
 */
async function AudioMomentPlayerWrapper(props: any) {
  const AudioMomentPlayer = (await import('@/components/audio/AudioMomentPlayer')).default
  return <AudioMomentPlayer {...props} />
}

/**
 * 메타데이터 생성
 */
export async function generateMetadata({ params }: PageProps) {
  const { token } = params
  
  const supabase = await createServerClient()
  const { data: playlist } = await supabase
    .from('audio_playlists')
    .select('speaker_name, package_type')
    .eq('share_token', token)
    .single()
  
  if (!playlist) {
    return {
      title: 'DOTTING - 목소리를 간직하다',
    }
  }
  
  return {
    title: `${playlist.speaker_name}님의 목소리 - DOTTING`,
    description: `${playlist.speaker_name}님이 간직하고 싶었던 소중한 순간들을 들어보세요.`,
    openGraph: {
      title: `${playlist.speaker_name}님의 목소리`,
      description: '모든 이야기는 계속됩니다',
      type: 'website',
    },
  }
}
