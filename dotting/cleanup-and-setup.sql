-- =====================================================
-- 1단계: 기존 테스트 데이터 삭제
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE email = 'ryan_jj@naver.com';
  
  IF v_user_id IS NOT NULL THEN
    -- CASCADE로 연결된 모든 데이터 삭제
    DELETE FROM sessions WHERE user_id = v_user_id;
    DELETE FROM orders WHERE user_id = v_user_id;
    
    RAISE NOTICE '✓ 기존 테스트 데이터 삭제 완료';
  END IF;
END $$;

-- =====================================================
-- 2단계: Premium 패키지 풍부한 테스트 데이터 (결제 전)
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_compilation_id UUID;
  v_order_id UUID;
  v_episode_ids UUID[];
  v_chapter_ids UUID[];
  v_themes episode_theme[] := ARRAY['childhood', 'adolescence', 'early_adulthood', 'career', 'marriage', 'parenting', 'turning_point', 'hardship', 'joy', 'reflection', 'legacy'];
  v_chapter_titles TEXT[] := ARRAY[
    '제1장: 어린 시절의 기억',
    '제2장: 청소년기의 꿈',
    '제3장: 청년 시절의 도전',
    '제4장: 일과 보람',
    '제5장: 사랑과 결혼',
    '제6장: 자녀 양육의 기쁨',
    '제7장: 인생의 전환점',
    '제8장: 시련과 극복',
    '제9장: 행복했던 순간들',
    '제10장: 가족의 의미',
    '제11장: 인생의 지혜',
    '제12장: 후손에게 전하는 말'
  ];
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE email = 'ryan_jj@naver.com';
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  -- Session
  INSERT INTO sessions (user_id, subject_name, subject_relation, mode, status, created_at)
  VALUES (v_user_id, '어머니', '모친', 'relaxed', 'completed', NOW() - INTERVAL '30 days')
  RETURNING id INTO v_session_id;

  RAISE NOTICE '✓ Session: %', v_session_id;

  -- Messages (100개)
  FOR i IN 1..50 LOOP
    INSERT INTO messages (session_id, role, content, order_index, meta, created_at)
    VALUES (
      v_session_id, 'ai',
      CASE 
        WHEN i <= 5 THEN '어린 시절 ' || i || '번째 기억: 가장 기억에 남는 순간은 무엇인가요?'
        WHEN i <= 10 THEN '청소년기 ' || (i-5) || '번째 기억: 학교 생활은 어떠셨나요?'
        WHEN i <= 15 THEN '청년 시절 ' || (i-10) || '번째 기억: 첫 직장 생활은 어땠나요?'
        WHEN i <= 20 THEN '직장 생활 ' || (i-15) || '번째 기억: 일하면서 보람찼던 순간은?'
        WHEN i <= 25 THEN '결혼 생활 ' || (i-20) || '번째 기억: 배우자와의 추억을 말씀해주세요.'
        WHEN i <= 30 THEN '자녀 양육 ' || (i-25) || '번째 기억: 자녀를 키우면서 기억나는 순간은?'
        WHEN i <= 35 THEN '인생 전환점 ' || (i-30) || '번째: 인생에서 중요한 결정을 내렸던 순간은?'
        WHEN i <= 40 THEN '힘들었던 시기 ' || (i-35) || '번째: 어려움을 극복했던 경험을 말씀해주세요.'
        WHEN i <= 45 THEN '행복했던 순간 ' || (i-40) || '번째: 가장 행복했던 기억은 무엇인가요?'
        ELSE '후손에게 ' || (i-45) || '번째 메시지: 전하고 싶은 말씀이 있으신가요?'
      END,
      i * 2 - 1, '{}', NOW() - (51 - i) * INTERVAL '12 hours'
    );

    INSERT INTO messages (session_id, role, content, order_index, meta, created_at)
    VALUES (
      v_session_id, 'user',
      CASE 
        WHEN i <= 5 THEN '어린 시절에는 할머니 댁에서 보낸 여름방학이 가장 기억에 남아요. 마당에서 친구들과 놀던 모습, 할머니가 해주시던 수박, 그리고 저녁이면 온 가족이 모여 앉아 이야기를 나누던 시간들이 생생합니다.'
        WHEN i <= 10 THEN '중학교 때 친구들과 함께 공부하던 기억이 나요. 시험 기간이면 도서관에서 밤늦게까지 공부하고, 주말에는 함께 영화를 보러 가곤 했죠. 그때 만난 친구들과는 지금도 연락하며 지내고 있어요.'
        WHEN i <= 15 THEN '첫 직장은 작은 회사였지만 배울 게 많았어요. 선배들이 친절하게 가르쳐주셨고, 실수해도 격려해주셨죠. 첫 월급을 받았을 때의 감격은 아직도 잊을 수가 없어요.'
        WHEN i <= 20 THEN '프로젝트를 성공적으로 마쳤을 때가 가장 보람찼어요. 팀원들과 밤을 새워가며 준비했던 기억이 나네요. 고객이 만족해하시는 모습을 보며 모든 피로가 사라졌습니다.'
        WHEN i <= 25 THEN '남편과 처음 만났을 때가 기억나요. 친구 소개로 만났는데, 첫인상부터 좋았어요. 데이트할 때마다 설레었고, 프러포즈를 받았을 때는 정말 행복했습니다.'
        WHEN i <= 30 THEN '첫째가 태어났을 때 세상을 다 가진 기분이었어요. 작은 손을 꼭 잡았던 순간, 처음으로 엄마라고 불렀던 순간, 그리고 유치원에 처음 입학하던 날까지 모든 순간이 소중합니다.'
        WHEN i <= 35 THEN '서울로 이사를 결정했을 때가 인생의 큰 전환점이었어요. 낯선 환경이 두렵기도 했지만, 가족의 미래를 위해 용기를 냈죠. 그 결정이 지금의 우리를 만들었습니다.'
        WHEN i <= 40 THEN '아버지가 돌아가셨을 때가 가장 힘들었어요. 하지만 가족들이 서로 의지하며 극복했습니다. 그 시련을 통해 가족의 소중함을 더욱 깨달았어요.'
        WHEN i <= 45 THEN '손주를 처음 안았을 때가 가장 행복했어요. 생명의 신비로움과 가족이 이어진다는 것에 감사했습니다. 손주의 웃음소리가 집안을 밝게 만들어주네요.'
        ELSE '후손들에게 전하고 싶은 말은 서로 사랑하고 존중하며 살아가라는 거예요. 가족이 가장 소중한 거예요. 힘들 때는 서로 의지하고, 기쁠 때는 함께 나누세요.'
      END,
      i * 2, '{}', NOW() - (51 - i) * INTERVAL '12 hours' + INTERVAL '10 minutes'
    );
  END LOOP;

  RAISE NOTICE '✓ Messages: 100개';

  -- Episodes (50개)
  FOR i IN 1..50 LOOP
    INSERT INTO episodes (session_id, order_index, theme, summary, content, inclusion_status, created_at)
    VALUES (
      v_session_id, i, v_themes[(i % 11) + 1],
      '에피소드 ' || i || ': 어머니의 소중한 기억',
      CASE 
        WHEN i = 1 THEN '1965년 남대문 시장에서 처음 가죽구두를 사던 날. 어머니 손을 잡고 시장 골목을 누비던 기억이 생생합니다. 구두 가게 아저씨의 친절한 미소와 새 신발을 신고 집에 돌아가던 길의 행복함이 아직도 마음속에 남아있습니다.'
        WHEN i <= 10 THEN '어린 시절 에피소드 ' || i || ': 할머니 댁에서 보낸 여름방학, 초등학교 운동회, 첫 자전거 배우기, 가족 여행 등 소중한 추억들이 가득합니다. 그때의 순수했던 시간들이 지금도 마음을 따뜻하게 만들어줍니다.'
        WHEN i <= 20 THEN '청소년기 에피소드 ' || (i-10) || ': 중학교 입학식, 친구들과의 우정, 학교 합창대회, 첫 소풍, 도서관에서 공부하던 시간들. 꿈을 키우던 시기였습니다.'
        WHEN i <= 30 THEN '청년 시절 에피소드 ' || (i-20) || ': 첫 직장 면접, 첫 출근, 첫 프로젝트, 승진, 해외 출장. 사회인으로 성장하던 시간들이었습니다.'
        WHEN i <= 40 THEN '결혼과 가족 에피소드 ' || (i-30) || ': 남편과의 만남, 프러포즈, 결혼식, 신혼여행, 첫째와 둘째의 탄생. 가족을 이루며 행복을 배워갔습니다.'
        ELSE '인생의 지혜 에피소드 ' || (i-40) || ': 시련과 극복, 행복했던 순간들, 손주의 탄생, 그리고 후손들에게 전하고 싶은 메시지. 살아온 세월의 의미를 되새깁니다.'
      END,
      'core', NOW() - (51 - i) * INTERVAL '12 hours'
    );
  END LOOP;

  v_episode_ids := ARRAY(SELECT id FROM episodes WHERE session_id = v_session_id ORDER BY order_index);
  RAISE NOTICE '✓ Episodes: 50개';

  -- Compilation
  INSERT INTO compilations (
    session_id, version, intent, status, review_status, 
    pdf_snapshot_version, pdf_confirmed_at, pdf_confirmed_by, 
    created_at, completed_at
  ) VALUES (
    v_session_id, 1, 'final', 'completed', 'approved_for_pdf', 
    1, NOW() - INTERVAL '5 days', v_user_id, 
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'
  ) RETURNING id INTO v_compilation_id;

  RAISE NOTICE '✓ Compilation: %', v_compilation_id;

  -- Compilation Episode Inclusions
  FOR i IN 1..50 LOOP
    INSERT INTO compilation_episode_inclusions (compilation_id, episode_id, inclusion_status, decision_reason)
    VALUES (v_compilation_id, v_episode_ids[i], 'core', 'Core memory');
  END LOOP;

  -- Compiled Chapters
  FOR i IN 1..12 LOOP
    INSERT INTO compiled_chapters (compilation_id, order_index, title, created_at)
    VALUES (v_compilation_id, i, v_chapter_titles[i], NOW() - INTERVAL '10 days');
  END LOOP;

  v_chapter_ids := ARRAY(SELECT id FROM compiled_chapters WHERE compilation_id = v_compilation_id ORDER BY order_index);
  RAISE NOTICE '✓ Chapters: 12개';

  -- Compiled Paragraphs (120개)
  FOR i IN 1..120 LOOP
    INSERT INTO compiled_paragraphs (chapter_id, order_index, content, paragraph_type, created_at)
    VALUES (
      v_chapter_ids[(i-1) / 10 + 1],
      ((i-1) % 10) + 1,
      (SELECT content FROM episodes WHERE session_id = v_session_id ORDER BY order_index LIMIT 1 OFFSET (i-1) % 50),
      'grounded', NOW() - INTERVAL '10 days'
    );
  END LOOP;

  RAISE NOTICE '✓ Paragraphs: 120개';

  -- Order (결제 전 상태: pending_payment)
  INSERT INTO orders (user_id, session_id, package, amount, status, created_at)
  VALUES (v_user_id, v_session_id, 'premium', 299000, 'pending_payment', NOW() - INTERVAL '1 hour')
  RETURNING id INTO v_order_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 테스트 데이터 생성 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Session: % (어머니)', v_session_id;
  RAISE NOTICE 'Order: % (결제 대기 중)', v_order_id;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Messages: 100개';
  RAISE NOTICE 'Episodes: 50개';
  RAISE NOTICE 'Chapters: 12개';
  RAISE NOTICE 'Paragraphs: 120개';
  RAISE NOTICE '========================================';
  RAISE NOTICE '이제 결제 플로우부터 테스트 가능합니다!';
  RAISE NOTICE '========================================';

END $$;
