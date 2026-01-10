# DOTTING 테스트 가이드

## 테스트 구조

```
tests/
├── setup.ts              # 프로덕션 가드 (필수)
├── README.md             # 이 문서
└── integration/          # DB Integration 테스트 (로컬 Supabase 필요)
    └── (비어있음 - 로컬 DB 준비 후 추가)

src/lib/__tests__/
└── interview-os.test.ts  # Unit 테스트
```

## 실행 방법

### Unit 테스트 (안전 - DB 연결 없음)

```bash
npm run test           # 1회 실행
npm run test:watch     # 변경 감지 모드
npm run test:coverage  # 커버리지 리포트
```

### Integration 테스트 (로컬 Supabase 필요)

⚠️ **프로덕션 DB에서 절대 테스트하지 마세요!**

프로덕션 가드가 자동으로 차단하지만, 안전을 위해 로컬 환경만 사용하세요.

---

## 로컬 Supabase 설정

### 1. Supabase CLI 설치

```bash
npm install -g supabase
```

### 2. 로컬 DB 시작

```bash
cd dotting
supabase init        # 최초 1회
supabase start       # 로컬 DB 실행
```

### 3. 마이그레이션 적용

```bash
supabase db reset    # 스키마 + 시드 적용
```

### 4. 환경 변수 설정

`.env.test.local` 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...  # supabase start 출력에서 복사
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # supabase start 출력에서 복사
```

### 5. Integration 테스트 실행

```bash
npm run test:integration  # (추후 추가)
```

---

## 프로덕션 가드

`tests/setup.ts`에서 자동으로 실행됩니다.

### 허용된 호스트

```typescript
const ALLOWED_SUPABASE_HOSTS = [
  'localhost',
  '127.0.0.1',
  'localhost:54321',
  '127.0.0.1:54321',
]
```

### 테스트 전용 Supabase 프로젝트 추가

프로덕션과 분리된 테스트 프로젝트를 사용하려면:

```typescript
const ALLOWED_SUPABASE_HOSTS = [
  // ... 기존 로컬 호스트
  'your-test-project.supabase.co',  // 테스트 전용 프로젝트
]
```

---

## 테스트 종류

| 종류 | 위치 | DB 필요 | 실행 명령 |
|------|------|---------|-----------|
| Unit | `src/lib/__tests__/` | ❌ | `npm run test` |
| Integration | `tests/integration/` | ✅ 로컬 | (추후) |
| E2E | `tests/e2e/` | ✅ 로컬 | (추후) |

---

## CI 설정 (추후)

GitHub Actions에서 테스트 실행 시:

1. Supabase CLI로 로컬 DB 실행
2. 마이그레이션 적용
3. 테스트 실행
4. 실패 시 PR 머지 차단

```yaml
# .github/workflows/test.yml (예시)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: npm ci
      - run: npm test
```
