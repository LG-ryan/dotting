# DOTTING 프로덕션 런북

> 최종 서비스 운영을 위한 필수 수동 작업 및 검증 절차

---

## 📋 체크리스트 개요

| 항목 | 상태 | 담당 | 비고 |
|------|------|------|------|
| Auth 트리거 설치 | ⬜ | 관리자 | 1회 수동 |
| 환경변수 확인 | ⬜ | 관리자 | 배포 전 |
| 검증 시나리오 | ⬜ | QA | 배포 후 |

---

## 1. Auth 트리거 설치 (프로덕션 1회)

### 왜 수동인가?
Supabase는 보안상 `auth` 스키마에 대한 트리거를 마이그레이션 파일에서 직접 생성하는 것을 제한합니다. 
따라서 **Supabase Dashboard > SQL Editor**에서 수동으로 실행해야 합니다.

### 실행 SQL

```sql
-- =============================================================================
-- [프로덕션] Auth 트리거 설치
-- 
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 실행 시점: 004_orders_payments.sql 마이그레이션 적용 후 1회
-- =============================================================================

-- 기존 트리거 삭제 (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 검증 SQL (설치 후 반드시 실행)

```sql
-- =============================================================================
-- [프로덕션] 트리거 설치 검증
-- =============================================================================

-- 1) 트리거 존재 확인
SELECT 
  tgname AS trigger_name,
  pg_get_functiondef(tgfoid) AS function_def
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 예상 결과: 1개 행 반환
-- trigger_name: on_auth_user_created

-- 2) handle_new_user 함수 존재 확인
SELECT 
  proname AS function_name,
  prosrc AS function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 예상 결과: 1개 행 반환
-- function_name: handle_new_user
```

### 설치 완료 체크

- [ ] 트리거 생성 SQL 실행 완료
- [ ] 검증 SQL 실행 → 1개 행 반환 확인
- [ ] 테스트 회원가입 → public.users 자동 생성 확인

---

## 2. 환경변수 체크리스트

프로덕션 배포 전 다음 환경변수가 설정되어 있는지 확인:

| 변수명 | 용도 | 확인 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ⬜ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | ⬜ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버 전용) | ⬜ |
| `INTERNAL_API_SECRET` | 내부 API 인증 (worker 등) | ⬜ |
| `OPENAI_API_KEY` | OpenAI API 키 | ⬜ |

### 스테이징 vs 프로덕션 구분

```bash
# 스테이징
NEXT_PUBLIC_SUPABASE_URL=https://xxx-staging.supabase.co

# 프로덕션  
NEXT_PUBLIC_SUPABASE_URL=https://xxx-production.supabase.co
```

---

## 3. 검증 시나리오 (배포 후)

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

## 4. 롤백 절차

### 트리거 롤백 (문제 발생 시)

```sql
-- 트리거만 제거 (함수는 유지)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

### 전체 롤백 필요 시

1. Supabase Dashboard > Database > Backups에서 복구
2. 또는 수동으로 역순 마이그레이션

---

## 5. 문제 해결

### public.users가 생성되지 않는 경우

1. 트리거 존재 확인 (검증 SQL 실행)
2. `handle_new_user` 함수 존재 확인
3. 수동으로 users 레코드 생성:

```sql
INSERT INTO public.users (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);
```

### Admin 권한이 작동하지 않는 경우

1. `public.users` 테이블에 해당 사용자의 role이 'admin'인지 확인
2. RLS 정책 확인: `is_admin()` 함수가 올바르게 동작하는지

```sql
-- 현재 사용자가 admin인지 확인
SELECT is_admin();

-- 특정 사용자를 admin으로 설정
UPDATE public.users SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## 📝 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2026-01-11 | 초기 작성 | - |

---

> **PRD v3.2 정합**: 이 런북은 "안심/대행/끝까지 책임" 원칙에 따라 
> 운영 실수를 최소화하고 재현 가능한 검증을 보장합니다.
