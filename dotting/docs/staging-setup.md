# DOTTING 스테이징 환경 설정 가이드

> 운영 실수 최소화를 위한 체계적 설정 절차

---

## 📋 개요

| 항목 | 값 |
|------|-----|
| SSOT 위치 | `dotting/supabase/migrations/` |
| CLI 실행 위치 | `dotting/` 폴더 |
| 스테이징 방식 | 별도 Vercel Project + 별도 Supabase Project |

---

## Phase 0: 사전 확인

### 마이그레이션 규칙 (절대 깨면 안 됨)

- [x] SSOT: `dotting/supabase/migrations/`에만 마이그레이션 존재
- [x] 번호 규칙: `00001_init.sql` → `00002_print_orders.sql` → `00003_orders_payments.sql`
- [x] **중간 삽입 금지**: 새 마이그레이션은 항상 다음 번호로만 추가
- [x] **번호 수정/재정렬 금지**

### 현재 마이그레이션 목록

```
supabase/migrations/
├── 00001_init.sql           # 기본 스키마 (users, sessions, messages, episodes, compilations 등)
├── 00002_print_orders.sql   # User roles + Print orders
└── 00003_orders_payments.sql # Orders/Payments (PRD v3.2 선결제)
```

---

## Phase 1: 스테이징 Supabase 프로젝트 생성

### 1.1 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. **New Project** 클릭
3. 프로젝트 이름: `dotting-staging` (또는 팀 규칙에 맞게)
4. 데이터베이스 비밀번호 설정 (안전하게 보관)
5. Region: Seoul (`ap-northeast-1`) 권장

### 1.2 키 복사

프로젝트 생성 후 **Settings > API**에서 다음 값 복사:

| 키 | 용도 |
|----|------|
| `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role secret` | `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 public 노출 금지) |

### 1.3 Project Reference 확인

- **Settings > General**에서 `Reference ID` 확인
- 예: `abcdefghijkl` (supabase link에 사용)

---

## Phase 2: Supabase CLI 연결

### 2.1 CLI 설치 확인

```bash
supabase --version
# v1.x.x 이상 필요
```

설치가 안 되어 있으면:

```bash
# Windows (scoop)
scoop install supabase

# macOS
brew install supabase/tap/supabase

# npm
npm install -g supabase
```

### 2.2 로그인

```bash
supabase login
```

### 2.3 프로젝트 연결

```bash
# 반드시 dotting/ 폴더에서 실행
cd dotting

# 스테이징 프로젝트 연결
supabase link --project-ref <STAGING_PROJECT_REF>
```

### 2.4 연결 확인

```bash
supabase db pull
# 또는
supabase projects list
```

---

## Phase 3: 마이그레이션 적용

### 3.1 마이그레이션 상태 확인

```bash
# dotting/ 폴더에서 실행
supabase db diff
```

### 3.2 마이그레이션 적용

```bash
# 모든 마이그레이션 순서대로 적용
supabase db push
```

### 3.3 적용 확인

Supabase Dashboard > **SQL Editor**에서 실행:

```sql
-- 테이블 존재 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 예상 결과: users, sessions, messages, orders, claims 등 전체 테이블 목록
```

---

## Phase 4: Seed 및 트리거 설치

### 4.1 Seed 실행

```bash
# dotting/ 폴더에서 실행 (권장)
supabase db seed
```

**권한 문제로 CLI 실패 시 → Dashboard SQL Editor에서 seed.sql 수동 실행**

1. Supabase Dashboard > **SQL Editor** 열기
2. `supabase/seed.sql` 내용 복사/붙여넣기
3. **Run** 실행

> ⚠️ 어떤 방식이든 트리거 미설치 시 `EXCEPTION`으로 실패합니다. 성공하면 `NOTICE` 메시지 확인.

### 4.2 트리거 설치 확인

```sql
-- 트리거 존재 확인
SELECT tgname AS trigger_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 예상 결과: 1개 행 (트리거가 있으면)
```

만약 트리거가 없으면 seed.sql의 WARNING 메시지 확인 후 수동 설치:

```sql
-- auth 트리거 수동 설치
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Phase 5: 스테이징 Vercel 설정

### 5.1 새 Vercel Project 생성

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. **Add New > Project**
3. Git 레포지토리 연결 (같은 레포지토리)
4. 프로젝트 이름: `dotting-staging`

### 5.2 환경변수 설정

**Settings > Environment Variables**에서 추가:

| 변수명 | Environment | 값 |
|--------|-------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | 스테이징 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | 스테이징 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | 스테이징 service_role key |
| `INTERNAL_API_SECRET` | Production, Preview, Development | 랜덤 생성 (openssl rand -hex 32) |
| `OPENAI_API_KEY` | Production, Preview, Development | OpenAI API 키 |

### 5.3 도메인 설정

1. **Settings > Domains**
2. `staging.dotting.xyz` 추가 (또는 팀 규칙)
3. DNS 설정 (Vercel이 안내하는 대로)

### 5.4 배포

```bash
git push origin main
# 또는 Vercel Dashboard에서 수동 Deploy
```

---

## Phase 6: 검증 시나리오

### 시나리오 A: Paid 전 (결제 게이트)

| 단계 | 기대 결과 | 확인 |
|------|----------|------|
| 1. 새 프로젝트 생성 | 성공 | ⬜ |
| 2. 응답자 링크 접근 | 페이지 로드 성공 | ⬜ |
| 3. 질문 생성 시도 | 403 에러 + "결제 대기" 안내 | ⬜ |
| 4. 미리보기 시도 | 403 에러 | ⬜ |
| 5. 컴파일 시도 | 403 에러 | ⬜ |

### 시나리오 B: Paid 후 (정상 흐름)

| 단계 | 기대 결과 | 확인 |
|------|----------|------|
| 1. Admin에서 주문 상태 → `paid` 전이 | 성공 + 로그 생성 | ⬜ |
| 2. 응답자 질문 생성 | 성공 | ⬜ |
| 3. 인터뷰 진행 | 정상 동작 | ⬜ |
| 4. 미리보기 생성 | 성공 | ⬜ |
| 5. 컴파일 시작 | 성공 | ⬜ |

### 시나리오 C: Admin 상태 전이

| 단계 | 기대 결과 | 확인 |
|------|----------|------|
| 1. `/admin/orders` 접근 (admin 계정) | 주문 목록 표시 | ⬜ |
| 2. `pending_payment` → `paid` 전이 | 성공 | ⬜ |
| 3. `paid` → `shipped` 전이 (송장 없이) | 실패 (송장 필수) | ⬜ |
| 4. `paid` → `shipped` 전이 (송장 포함) | 성공 | ⬜ |
| 5. `order_status_logs` 확인 | 모든 전이 기록됨 | ⬜ |

---

## 문제 해결

### CLI 연결 실패

```bash
# 캐시 초기화
supabase stop
rm -rf .supabase/

# 다시 연결
supabase link --project-ref <REF>
```

### 마이그레이션 적용 실패

1. 오류 메시지 확인
2. Supabase Dashboard > SQL Editor에서 개별 파일 수동 실행
3. `supabase db reset` (⚠️ 데이터 전체 삭제됨)

### 트리거 설치 실패

- Supabase는 `auth` 스키마에 대한 직접 트리거 생성을 제한할 수 있음
- Dashboard SQL Editor에서 수동 실행 필요
- 자세한 내용: `docs/runbook-production.md` 참조

---

## 다음 단계

스테이징 검증 완료 후:

1. [ ] 프로덕션 Supabase 프로젝트에 동일 마이그레이션 적용
2. [ ] 프로덕션 런북 따라 트리거 수동 설치
3. [ ] 프로덕션 검증 시나리오 수행

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-11 | 초기 작성 - SSOT 통합, Phase 0~6 정의 |
