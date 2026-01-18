# 소셜 로그인 설정 가이드

> Google, Kakao 소셜 로그인 설정 방법

---

## 📋 개요

DOTTING 로그인 페이지에 다음 기능이 추가되었습니다:
- ✅ 브라우저 자동완성 (ID/PW 자동 저장)
- ✅ "로그인 상태 유지" 체크박스
- ✅ 마지막 로그인 이메일 기억
- ✅ Google 소셜 로그인
- ✅ Kakao 소셜 로그인

---

## Phase 1: Google 로그인 설정

### 1.1 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services > OAuth consent screen** 이동
   - User Type: External 선택
   - App name: `DOTTING`
   - User support email: 본인 이메일
   - Developer contact: 본인 이메일
   - Save and Continue

4. **APIs & Services > Credentials** 이동
   - **Create Credentials > OAuth client ID** 클릭
   - Application type: **Web application**
   - Name: `DOTTING Web Client`
   - Authorized redirect URIs 추가:
     ```
     https://xnxdvvakgdoanhbqwoyk.supabase.co/auth/v1/callback
     ```
   - Create 클릭

5. **Client ID**와 **Client Secret** 복사

### 1.2 Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard/project/xnxdvvakgdoanhbqwoyk) 접속
2. **Authentication > Providers** 이동
3. **Google** 찾아서 Enable 토글
4. 복사한 값 입력:
   - Client ID: (Google에서 복사한 값)
   - Client Secret: (Google에서 복사한 값)
5. **Save** 클릭

---

## Phase 2: Kakao 로그인 설정

### 2.1 Kakao Developers 설정

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션 > 애플리케이션 추가하기**
   - 앱 이름: `DOTTING`
   - 사업자명: 본인 또는 회사명
   - 앱 생성

3. **앱 설정 > 플랫폼** 이동
   - **Web 플랫폼 등록** 클릭
   - 사이트 도메인:
     ```
     http://localhost:3000
     https://your-production-domain.com
     ```

4. **제품 설정 > 카카오 로그인** 이동
   - **활성화 설정** ON
   - **Redirect URI 등록** 클릭:
     ```
     https://xnxdvvakgdoanhbqwoyk.supabase.co/auth/v1/callback
     ```

5. **제품 설정 > 카카오 로그인 > 동의항목** 이동
   - **nickname** (필수 동의)
   - **profile_image** (선택 동의)
   - **account_email** (필수 동의)

6. **앱 설정 > 앱 키** 이동
   - **REST API 키** 복사
   - **Client Secret** 생성 및 복사
     - **보안 > Client Secret** 이동
     - **코드 생성** 클릭
     - 생성된 코드 복사

### 2.2 Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard/project/xnxdvvakgdoanhbqwoyk) 접속
2. **Authentication > Providers** 이동
3. **Kakao** 찾아서 Enable 토글
4. 복사한 값 입력:
   - Client ID: (REST API 키)
   - Client Secret: (생성한 Client Secret)
5. **Save** 클릭

---

## Phase 3: 로컬 테스트

### 3.1 환경 변수 확인

`.env.local` 파일에 다음 값이 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xnxdvvakgdoanhbqwoyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.2 테스트 시나리오

1. **브라우저 자동완성 테스트**:
   - 로그인 페이지 접속
   - 이메일/비밀번호 입력 후 로그인
   - 브라우저가 "비밀번호 저장" 물어보면 저장
   - 로그아웃 후 다시 로그인 페이지 접속
   - 이메일 필드 클릭 시 자동완성 표시 확인

2. **로그인 상태 유지 테스트**:
   - "로그인 상태 유지" 체크 후 로그인
   - 브라우저 닫고 다시 열기
   - 자동으로 로그인 상태 유지 확인

3. **마지막 이메일 기억 테스트**:
   - 로그인 후 로그아웃
   - 다시 로그인 페이지 접속
   - 이메일 필드에 마지막 이메일 자동 입력 확인

4. **Google 로그인 테스트**:
   - "Google로 계속하기" 클릭
   - Google 계정 선택
   - 대시보드로 리다이렉트 확인

5. **Kakao 로그인 테스트**:
   - "Kakao로 계속하기" 클릭
   - Kakao 계정 로그인
   - 대시보드로 리다이렉트 확인

---

## Phase 4: 프로덕션 배포

### 4.1 Redirect URI 추가

#### Google Cloud Console
- Authorized redirect URIs에 프로덕션 도메인 추가:
  ```
  https://your-production-domain.com/auth/callback
  ```

#### Kakao Developers
- Redirect URI에 프로덕션 도메인 추가:
  ```
  https://your-production-domain.com/auth/callback
  ```

### 4.2 도메인 등록

#### Kakao Developers
- **앱 설정 > 플랫폼 > Web**에 프로덕션 도메인 추가

---

## 문제 해결

### Google 로그인 실패

**증상**: "redirect_uri_mismatch" 오류

**해결**:
1. Google Cloud Console의 Authorized redirect URIs 확인
2. Supabase URL이 정확한지 확인:
   ```
   https://xnxdvvakgdoanhbqwoyk.supabase.co/auth/v1/callback
   ```

### Kakao 로그인 실패

**증상**: "KOE006" 오류 (Redirect URI 불일치)

**해결**:
1. Kakao Developers의 Redirect URI 확인
2. 프로토콜(http/https) 정확히 일치하는지 확인

### 로그인 후 대시보드로 이동 안 됨

**증상**: 로그인 성공했지만 페이지 이동 없음

**해결**:
1. `/auth/callback/route.ts` 파일 존재 확인
2. 브라우저 콘솔에서 에러 확인
3. Supabase Dashboard > Authentication > Users에서 사용자 생성 확인

---

## 보안 고려사항

### Client Secret 관리
- ⚠️ Client Secret은 절대 Git에 커밋하지 않음
- ✅ Supabase Dashboard에서만 관리
- ✅ 환경 변수로 관리 불필요 (Supabase가 서버에서 처리)

### 로그인 상태 유지
- 체크 시: 세션 30일 유지
- 미체크 시: 세션 24시간 유지
- 공용 PC에서는 체크 해제 권장

### 마지막 이메일 저장
- localStorage에 이메일만 저장
- 비밀번호는 절대 저장하지 않음
- 사용자가 브라우저 데이터 삭제 시 함께 삭제됨

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-18 | 초기 작성 - Google/Kakao 로그인 + 자동완성 + 로그인 상태 유지 |
