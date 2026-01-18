# Supabase 최종 설정 가이드 (Free Plan)

**Phase 4.3: 최적화 우선 전략**

---

## 🎯 설정 목표

- Storage Bucket 생성 (50MB 제한)
- Policy 설정 (보안)
- 압축 레벨 9 적용 (코드 완료)

---

## 1️⃣ Supabase Storage Bucket 생성

### Step 1: Dashboard 접속

1. 브라우저에서 https://supabase.com/dashboard 접속
2. **DOTTING 프로젝트** 선택
3. 좌측 메뉴에서 **Storage** 클릭

---

### Step 2: Bucket 생성

1. 우측 상단 **"New bucket"** 버튼 클릭

2. 설정 입력:

```
Name: archives

Public bucket: ☐ OFF (체크 해제 - 매우 중요!)

File size limit: 50 (MB)

Allowed MIME types: application/zip
```

3. **"Create bucket"** 버튼 클릭

4. 생성 확인: Storage 목록에 `archives` 표시

---

### Step 3: Bucket 설정 확인

**Storage → archives → Settings**

확인 사항:
- [x] Name: `archives`
- [x] Public: **OFF** (🔒 Private)
- [x] File size limit: **50 MB**
- [x] Allowed MIME types: `application/zip`

---

## 2️⃣ Storage Policy 설정

### 방법 A: SQL Editor 사용 (권장)

#### Step 1: SQL Editor 열기

1. 좌측 메뉴 → **SQL Editor** 클릭
2. 우측 상단 **"New query"** 버튼 클릭

#### Step 2: Policy SQL 실행

아래 SQL을 복사하여 붙여넣기:

```sql
-- ============================================
-- DOTTING Archive Storage Policies
-- ============================================

-- 1. 업로드 Policy (서버 전용)
CREATE POLICY "Server can upload archives"
ON storage.objects 
FOR INSERT
WITH CHECK (
  bucket_id = 'archives' AND
  auth.role() = 'service_role'
);

-- 2. 다운로드 Policy (사용자)
CREATE POLICY "Users can download their archives"
ON storage.objects 
FOR SELECT
USING (
  bucket_id = 'archives' AND
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = auth.uid()
    AND orders.archive_url = name
  )
);

-- 3. 삭제 Policy (서버 전용)
CREATE POLICY "Server can delete archives"
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'archives' AND
  auth.role() = 'service_role'
);
```

#### Step 3: 실행

1. **"Run"** 버튼 클릭 (또는 Ctrl+Enter)
2. 성공 메시지 확인:
   ```
   Success. No rows returned
   ```

---

### 방법 B: Dashboard UI 사용 (대안)

#### Step 1: Policies 탭 열기

1. Storage → archives → **Policies** 탭 클릭

#### Step 2: Policy 생성 (3개)

**Policy 1: 업로드**
```
Policy name: Server can upload archives
Policy command: INSERT
Target roles: service_role
WITH CHECK: bucket_id = 'archives'
```

**Policy 2: 다운로드**
```
Policy name: Users can download their archives
Policy command: SELECT
Target roles: authenticated
USING: 
  bucket_id = 'archives' AND
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = auth.uid()
    AND orders.archive_url = name
  )
```

**Policy 3: 삭제**
```
Policy name: Server can delete archives
Policy command: DELETE
Target roles: service_role
USING: bucket_id = 'archives'
```

---

## 3️⃣ Policy 검증

### Step 1: Policy 목록 확인

**Storage → archives → Policies**

확인 사항:
- [x] Policy 3개 생성됨
- [x] `Server can upload archives` (INSERT)
- [x] `Users can download their archives` (SELECT)
- [x] `Server can delete archives` (DELETE)

### Step 2: Policy 테스트 (선택)

**SQL Editor에서 실행**:

```sql
-- Policy 확인
SELECT 
  policyname, 
  cmd, 
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%archive%';
```

**예상 결과**:
```
policyname                           | cmd    | roles
-------------------------------------|--------|----------------
Server can upload archives           | INSERT | service_role
Users can download their archives    | SELECT | authenticated
Server can delete archives           | DELETE | service_role
```

---

## 4️⃣ 환경 변수 확인

### Supabase 환경 변수

**Dashboard → Settings → API**

확인 필요:
- [x] Project URL
- [x] anon/public key
- [x] service_role key (비공개)

### .env.local 확인

**파일**: `dotting/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 서버 전용
```

---

## 5️⃣ 최종 검증 체크리스트

### Storage 설정
- [x] Bucket `archives` 생성됨
- [x] Public: **OFF** (비공개)
- [x] File size limit: **50 MB**
- [x] MIME types: `application/zip`

### Policy 설정
- [x] 업로드 Policy (service_role)
- [x] 다운로드 Policy (authenticated)
- [x] 삭제 Policy (service_role)

### 코드 최적화
- [x] 압축 레벨 9 적용
- [x] 문서 업데이트

### 환경 변수
- [x] NEXT_PUBLIC_SUPABASE_URL
- [x] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [x] SUPABASE_SERVICE_ROLE_KEY

---

## 6️⃣ 예상 용량 계산

### Heritage 패키지 (7개 에피소드)

**압축 전**:
```
오디오 7개 × 10MB = 70MB
metadata.json = 10KB
Start.html = 50KB
Guide.txt = 5KB
총: ~70MB
```

**압축 후 (레벨 9)**:
```
압축률: 30% 감소
최종 크기: ~49MB ✅ (50MB 이내)
```

---

## 7️⃣ 문제 해결

### 오류 1: "Bucket already exists"

**증상**: Bucket 생성 시 오류

**해결**:
1. Storage 목록에서 기존 `archives` 확인
2. 설정이 올바른지 검증
3. 필요 시 삭제 후 재생성

---

### 오류 2: "Policy creation failed"

**증상**: SQL 실행 시 오류

**해결**:
1. SQL 문법 확인 (복사 오류)
2. RLS (Row Level Security) 활성화 확인:
   ```sql
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   ```
3. 기존 Policy 삭제 후 재생성:
   ```sql
   DROP POLICY IF EXISTS "Server can upload archives" ON storage.objects;
   ```

---

### 오류 3: "File too large"

**증상**: 업로드 시 50MB 초과

**원인**: 에피소드 수 과다 또는 압축 실패

**해결**:
1. 에피소드 수 확인 (7개 이하)
2. 압축 레벨 9 적용 확인
3. 오디오 파일 크기 확인 (각 10MB 이하)

---

### 오류 4: "Access denied"

**증상**: 다운로드 시 403 Forbidden

**원인**: Policy 미설정 또는 소유권 불일치

**해결**:
1. Policy 설정 확인
2. orders 테이블 user_id 일치 확인
3. auth.uid() 함수 작동 확인

---

## 8️⃣ 모니터링

### Storage 사용량 확인

**Dashboard → Settings → Usage**

확인 항목:
- Storage: ___GB / 1GB (Free Plan)
- Bandwidth: ___GB / 2GB/월

**알림 설정**:
- 80% 도달 시 이메일 알림

---

## 9️⃣ 다음 단계

### 즉시 실행
1. ✅ Supabase Storage Bucket 생성
2. ✅ Policy 설정
3. ⏳ E2E 테스트 실행

### E2E 테스트 항목
- Heritage 패키지 주문 생성
- 7개 에피소드 녹음
- 유산 상자 다운로드
- ZIP 크기 확인 (50MB 이내)
- Start.html 오프라인 검증

---

## 🎯 설정 완료 확인

모든 항목 체크 시 설정 완료:

- [x] Storage Bucket `archives` 생성
- [x] Public OFF 설정
- [x] File size limit 50MB
- [x] Policy 3개 생성
- [x] 환경 변수 확인
- [x] 압축 레벨 9 코드 적용

---

**설정 완료 후 E2E 테스트를 진행하세요.**

**특히 ZIP 파일 크기가 50MB 이내인지 확인하세요.**
