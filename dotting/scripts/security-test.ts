/**
 * 보안 테스트 스크립트
 * 
 * 실행: npx ts-node scripts/security-test.ts
 */

const BASE_URL = 'http://localhost:3000';

async function testUnauthorizedAccess() {
  console.log('\n🔐 보안 테스트 시작\n');
  console.log('=' .repeat(50));

  // 테스트 1: 로그인 없이 호출
  console.log('\n📋 테스트 1: 인증 없이 API 호출');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'fake-session-id-12345',
        subjectName: '테스트',
        subjectRelation: '부모님',
        messages: [],
        isFirst: true
      })
    });

    const body = await response.json().catch(() => null);
    
    console.log(`Status: ${response.status}`);
    console.log(`Body:`, JSON.stringify(body, null, 2));
    
    if (response.status === 401) {
      console.log('✅ 통과! 인증 없이 접근 차단됨');
    } else {
      console.log('❌ 실패! 예상: 401, 실제:', response.status);
    }
  } catch (error) {
    console.log('❌ 요청 실패:', error);
  }

  // 테스트 2: 존재하지 않는 세션 (인증 필요)
  console.log('\n📋 테스트 2: 존재하지 않는 세션 ID');
  console.log('-'.repeat(50));
  console.log('⚠️  이 테스트는 인증된 쿠키가 필요합니다.');
  console.log('   브라우저에서 직접 테스트해주세요.');

  console.log('\n' + '='.repeat(50));
  console.log('🏁 테스트 완료\n');
}

testUnauthorizedAccess();
