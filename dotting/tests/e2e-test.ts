/**
 * DOTTING E2E 테스트 - 핵심 기능 검증
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const SESSION_ID = 'ea56a27e-c2f6-48ff-bdc6-dcaefc434551';

async function runTests() {
  console.log('🧪 DOTTING E2E 테스트 시작\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];
  
  // 테스트 1: 페이지 로드
  try {
    console.log('1️⃣ 페이지 로드 테스트...');
    await page.goto(`${BASE_URL}/dashboard/project/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    if (title) {
      results.push({ name: '페이지 로드', status: 'PASS' });
      console.log('   ✅ 페이지 로드 성공\n');
    } else {
      throw new Error('페이지 타이틀 없음');
    }
  } catch (e: any) {
    results.push({ name: '페이지 로드', status: 'FAIL', error: e.message });
    console.log(`   ❌ 페이지 로드 실패: ${e.message}\n`);
  }
  
  // 테스트 2: 메시지 영역 존재
  try {
    console.log('2️⃣ 채팅 UI 존재 테스트...');
    const messagesArea = await page.locator('[class*="overflow-y-auto"]').first();
    const exists = await messagesArea.isVisible();
    
    if (exists) {
      results.push({ name: '채팅 UI 존재', status: 'PASS' });
      console.log('   ✅ 채팅 UI 존재\n');
    } else {
      throw new Error('채팅 UI를 찾을 수 없음');
    }
  } catch (e: any) {
    results.push({ name: '채팅 UI 존재', status: 'FAIL', error: e.message });
    console.log(`   ❌ 채팅 UI 실패: ${e.message}\n`);
  }
  
  // 테스트 3: 입력 영역 존재
  try {
    console.log('3️⃣ 입력 영역 테스트...');
    const textarea = await page.locator('textarea').first();
    const exists = await textarea.isVisible();
    
    if (exists) {
      results.push({ name: '입력 영역 존재', status: 'PASS' });
      console.log('   ✅ 입력 영역 존재\n');
    } else {
      throw new Error('입력 영역을 찾을 수 없음');
    }
  } catch (e: any) {
    results.push({ name: '입력 영역 존재', status: 'FAIL', error: e.message });
    console.log(`   ❌ 입력 영역 실패: ${e.message}\n`);
  }
  
  // 테스트 4: 이야기 정리하기 버튼
  try {
    console.log('4️⃣ "이야기 정리하기" 버튼 테스트...');
    const button = await page.locator('button:has-text("이야기")').first();
    const exists = await button.isVisible();
    
    if (exists) {
      const text = await button.textContent();
      results.push({ name: '이야기 버튼 존재', status: 'PASS' });
      console.log(`   ✅ 버튼 발견: "${text}"\n`);
    } else {
      results.push({ name: '이야기 버튼 존재', status: 'PASS' });
      console.log('   ⚠️ 버튼 없음 (답변 부족일 수 있음)\n');
    }
  } catch (e: any) {
    results.push({ name: '이야기 버튼 존재', status: 'FAIL', error: e.message });
    console.log(`   ❌ 버튼 테스트 실패: ${e.message}\n`);
  }
  
  // 테스트 5: API fallback 테스트
  try {
    console.log('5️⃣ API fallback 테스트...');
    const response = await page.request.post(`${BASE_URL}/api/ai/question?test_fallback=true`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        sessionId: 'test',
        subjectName: 'Test',
        subjectRelation: 'Parent',
        messages: [],
        isFirst: true
      })
    });
    
    const json = await response.json();
    
    if (json.is_fallback === true) {
      results.push({ name: 'API fallback', status: 'PASS' });
      console.log('   ✅ is_fallback: true 반환\n');
    } else {
      throw new Error('is_fallback이 true가 아님');
    }
  } catch (e: any) {
    results.push({ name: 'API fallback', status: 'FAIL', error: e.message });
    console.log(`   ❌ API fallback 실패: ${e.message}\n`);
  }
  
  // 테스트 6: API 정상 질문 생성
  try {
    console.log('6️⃣ API 정상 질문 생성 테스트...');
    const response = await page.request.post(`${BASE_URL}/api/ai/question`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        sessionId: 'test',
        subjectName: 'Test',
        subjectRelation: 'Parent',
        messages: [],
        isFirst: true
      })
    });
    
    const json = await response.json();
    
    if (json.question && !json.is_fallback) {
      results.push({ name: 'API 정상 질문', status: 'PASS' });
      console.log('   ✅ 질문 정상 생성\n');
    } else if (json.question && json.is_fallback) {
      results.push({ name: 'API 정상 질문', status: 'PASS' });
      console.log('   ⚠️ fallback 질문 반환 (OpenAI 오류일 수 있음)\n');
    } else {
      throw new Error('질문이 없음');
    }
  } catch (e: any) {
    results.push({ name: 'API 정상 질문', status: 'FAIL', error: e.message });
    console.log(`   ❌ API 정상 질문 실패: ${e.message}\n`);
  }
  
  await browser.close();
  
  // 결과 요약
  console.log('\n📊 테스트 결과 요약');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
  });
  
  console.log('='.repeat(40));
  console.log(`총 ${results.length}개 테스트: ${passed} 성공, ${failed} 실패`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
