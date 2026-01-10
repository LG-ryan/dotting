/**
 * Vitest 글로벌 설정
 * 
 * 핵심 역할: 프로덕션 DB 접근 차단
 * 모든 테스트 실행 전에 이 파일이 먼저 실행됨
 */

import { beforeAll } from 'vitest'

// ============================================
// 프로덕션 차단 가드 (절대 건드리지 마세요)
// ============================================

const ALLOWED_SUPABASE_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  // Supabase CLI 기본 포트
  'localhost:54321',
  '127.0.0.1:54321',
  // 테스트 전용 프로젝트 (필요시 추가)
  // 'xxx-test-project.supabase.co',
]

function guardNoProd() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  // URL이 설정되어 있고, 허용 목록에 없으면 차단
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl)
      const host = url.host.toLowerCase()
      
      const isAllowed = ALLOWED_SUPABASE_HOSTS.some(allowed => 
        host === allowed || host.startsWith(allowed)
      )
      
      if (!isAllowed) {
        console.error('=' .repeat(60))
        console.error('🚨 프로덕션 DB 접근 차단됨!')
        console.error('=' .repeat(60))
        console.error(`현재 SUPABASE_URL: ${supabaseUrl}`)
        console.error('')
        console.error('테스트는 로컬 Supabase에서만 실행 가능합니다.')
        console.error('1. supabase start 로 로컬 DB 실행')
        console.error('2. .env.test.local 에 로컬 URL 설정')
        console.error('=' .repeat(60))
        
        throw new Error(
          `[GUARD] 프로덕션 DB 테스트 금지!\n` +
          `URL: ${supabaseUrl}\n` +
          `허용된 호스트: ${ALLOWED_SUPABASE_HOSTS.join(', ')}`
        )
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('[GUARD]')) {
        throw e
      }
      // URL 파싱 실패는 무시 (로컬 테스트에서는 URL이 없을 수 있음)
    }
  }
  
  // 정책 2: 키가 있으면 더 엄격
  // Service Role Key가 있는데 URL이 허용 목록이 아니면 즉시 차단
  if (serviceRoleKey) {
    if (!supabaseUrl) {
      // 키는 있는데 URL이 없으면 위험 신호
      throw new Error(
        '[GUARD] SERVICE_ROLE_KEY가 설정됐지만 SUPABASE_URL이 없습니다.\n' +
        '로컬 Supabase를 실행하고 .env.test.local을 설정하세요.'
      )
    }
    
    try {
      const url = new URL(supabaseUrl)
      const host = url.host.toLowerCase()
      const isAllowed = ALLOWED_SUPABASE_HOSTS.some(allowed => 
        host === allowed || host.startsWith(allowed)
      )
      
      if (!isAllowed) {
        throw new Error(
          `[GUARD] 원격 DB + SERVICE_ROLE_KEY 조합 금지!\n` +
          `URL: ${supabaseUrl}\n` +
          `이 조합은 프로덕션 데이터를 손상시킬 수 있습니다.`
        )
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('[GUARD]')) {
        throw e
      }
    }
  }
}

// 모든 테스트 전에 가드 실행
beforeAll(() => {
  guardNoProd()
  console.log('✅ 프로덕션 가드 통과 (로컬/허용된 환경)')
})

// 테스트 환경 표시
console.log('🧪 Vitest 테스트 환경 시작')
console.log(`   Node: ${process.version}`)
console.log(`   SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '(미설정 - Unit 테스트만 가능)'}`)
