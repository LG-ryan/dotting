-- =====================================================
-- Migration: Add Dedication and Suggestions System
-- =====================================================
-- Description: Final Seal (헌정사) 시스템을 위한 필드 추가
-- - dedication: 사용자가 선택하거나 직접 작성한 헌정사
-- - dedication_suggestions: DOTTING Core Engine이 생성한 3가지 제안 (경애/추억/계승)
-- - dedication_generation_cost: 헌정사 생성 토큰 수 (비용 추적)
-- - dedication_generated_at: 헌정사 제안 생성 시각
-- =====================================================

-- orders 테이블에 헌정사 관련 필드 추가
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS dedication TEXT,
ADD COLUMN IF NOT EXISTS dedication_suggestions JSONB,
ADD COLUMN IF NOT EXISTS dedication_generation_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dedication_generated_at TIMESTAMPTZ;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.dedication 
IS 'Heritage 패키지 헌정사 (사용자 입력 또는 선택)';

COMMENT ON COLUMN orders.dedication_suggestions 
IS '도팅 헌정사 제안 3종 (경애/추억/계승) - DOTTING Core Engine 생성';

COMMENT ON COLUMN orders.dedication_generation_cost 
IS '헌정사 생성 토큰 수 (비용 추적, Q&A와 분리)';

COMMENT ON COLUMN orders.dedication_generated_at 
IS '헌정사 제안 생성 시각';

-- dedication_suggestions JSON 구조 예시:
-- {
--   "suggestions": [
--     {
--       "type": "respect",
--       "label": "경애(敬愛)",
--       "text": "엄마의 목소리를 영원히",
--       "keywords": ["목소리", "영원"]
--     },
--     {
--       "type": "memory",
--       "label": "추억(追憶)",
--       "text": "남대문 가죽구두처럼 오래도록",
--       "keywords": ["남대문", "가죽구두"]
--     },
--     {
--       "type": "legacy",
--       "label": "계승(繼承)",
--       "text": "이 이야기를 자녀에게",
--       "keywords": ["이야기", "자녀"]
--     }
--   ],
--   "generated_at": "2026-01-18T10:30:00Z",
--   "token_count": 700,
--   "engine": "DOTTING Core v1.0"
-- }
