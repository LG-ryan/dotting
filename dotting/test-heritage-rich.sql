-- =====================================================
-- Heritage(Premium) 패키지 풍부한 테스트 데이터
-- 실제 책 제작 가능한 수준의 데이터
-- =====================================================
-- Messages: 100개 (50개 질문 + 50개 답변)
-- Episodes: 50개 (다양한 테마)
-- Chapters: 12개
-- Paragraphs: 120개 (챕터당 10개)
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
  -- 사용자 ID
  SELECT id INTO v_user_id FROM public.users WHERE email = 'ryan_jj@naver.com';
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  -- Session
  INSERT INTO sessions (user_id, subject_name, subject_relation, mode, status, created_at)
  VALUES (v_user_id, '어머니', '모친', 'relaxed', 'completed', NOW() - INTERVAL '30 days')
  RETURNING id INTO v_session_id;

  RAISE NOTICE '✓ Session 생성: %', v_session_id;

  -- Messages (100개: 50개 질문 + 50개 답변)
  FOR i IN 1..50 LOOP
    -- AI 질문
    INSERT INTO messages (session_id, role, content, order_index, meta, created_at)
    VALUES (
      v_session_id,
      'ai',
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
      i * 2 - 1,
      '{}',
      NOW() - (51 - i) * INTERVAL '12 hours'
    );

    -- 사용자 답변
    INSERT INTO messages (session_id, role, content, order_index, meta, created_at)
    VALUES (
      v_session_id,
      'user',
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
      i * 2,
      '{}',
      NOW() - (51 - i) * INTERVAL '12 hours' + INTERVAL '10 minutes'
    );
  END LOOP;

  RAISE NOTICE '✓ Messages 생성: 100개';

  -- Episodes (50개: 풍부한 이야기)
  FOR i IN 1..50 LOOP
    INSERT INTO episodes (session_id, order_index, theme, summary, content, inclusion_status, created_at)
    VALUES (
      v_session_id,
      i,
      v_themes[(i % 11) + 1],
      CASE 
        WHEN i <= 5 THEN '어린 시절 에피소드 ' || i
        WHEN i <= 10 THEN '청소년기 에피소드 ' || (i-5)
        WHEN i <= 15 THEN '청년 시절 에피소드 ' || (i-10)
        WHEN i <= 20 THEN '직장 생활 에피소드 ' || (i-15)
        WHEN i <= 25 THEN '결혼 생활 에피소드 ' || (i-20)
        WHEN i <= 30 THEN '자녀 양육 에피소드 ' || (i-25)
        WHEN i <= 35 THEN '인생 전환점 에피소드 ' || (i-30)
        WHEN i <= 40 THEN '시련 극복 에피소드 ' || (i-35)
        WHEN i <= 45 THEN '행복했던 순간 에피소드 ' || (i-40)
        ELSE '후손에게 전하는 메시지 ' || (i-45)
      END,
      CASE 
        WHEN i = 1 THEN '1965년 남대문 시장에서 처음 가죽구두를 사던 날. 어머니 손을 잡고 시장 골목을 누비던 기억이 생생합니다. 구두 가게 아저씨의 친절한 미소와 새 신발을 신고 집에 돌아가던 길의 행복함이 아직도 마음속에 남아있습니다.'
        WHEN i = 2 THEN '초등학교 운동회 날, 달리기에서 1등을 했던 기억이 나요. 부모님이 응원해주시던 모습과 상을 받았을 때의 자랑스러움이 지금도 생생합니다.'
        WHEN i = 3 THEN '할머니 댁에서 보낸 여름방학. 마당에서 친구들과 물놀이를 하고, 저녁이면 할머니가 들려주시던 옛날이야기를 들으며 잠들던 시간들이 그립습니다.'
        WHEN i = 4 THEN '첫 자전거를 배우던 날. 넘어지고 다쳐도 포기하지 않고 연습했던 기억이 나요. 드디어 혼자 탈 수 있게 되었을 때의 성취감은 말로 표현할 수 없었습니다.'
        WHEN i = 5 THEN '가족 여행으로 간 바닷가. 처음 본 바다의 광활함에 놀랐고, 모래성을 쌓으며 놀던 시간이 너무 행복했어요.'
        WHEN i = 6 THEN '중학교 입학식 날. 새로운 교복을 입고 설레는 마음으로 학교에 갔던 기억이 나요. 새로운 친구들을 만나고 선생님들을 뵙던 순간이 생생합니다.'
        WHEN i = 7 THEN '학교 합창대회에서 우리 반이 1등을 했던 날. 친구들과 함께 연습하고 준비했던 시간들이 소중한 추억으로 남아있습니다.'
        WHEN i = 8 THEN '첫 소풍 날. 친구들과 함께 도시락을 먹고 놀던 시간이 너무 즐거웠어요. 그날 찍은 사진은 아직도 앨범에 보관하고 있습니다.'
        WHEN i = 9 THEN '중학교 졸업식. 3년간의 추억을 뒤로하고 새로운 시작을 준비하던 순간이었어요. 친구들과 헤어지는 게 아쉬웠지만 새로운 도전에 대한 기대도 컸습니다.'
        WHEN i = 10 THEN '고등학교 시절 도서관에서 친구들과 공부하던 기억. 시험 기간이면 밤늦게까지 함께 공부하고 서로 격려하며 지냈던 시간들이 그립습니다.'
        WHEN i = 11 THEN '첫 직장 면접을 보던 날. 긴장되고 떨렸지만 최선을 다했어요. 합격 통보를 받았을 때의 기쁨은 아직도 잊을 수 없습니다.'
        WHEN i = 12 THEN '첫 출근 날. 새로운 환경에 적응하느라 힘들었지만, 선배들의 도움으로 잘 적응할 수 있었어요. 첫 월급을 받았을 때의 감격은 말로 표현할 수 없었습니다.'
        WHEN i = 13 THEN '회사에서 첫 프로젝트를 맡았을 때. 책임감과 부담감이 컸지만, 팀원들과 협력하며 성공적으로 마쳤습니다. 그 경험이 저를 성장시켰어요.'
        WHEN i = 14 THEN '승진 발표를 받던 날. 그동안의 노력이 인정받는 순간이었어요. 가족들에게 좋은 소식을 전했을 때 모두가 기뻐해주셨습니다.'
        WHEN i = 15 THEN '해외 출장을 갔던 경험. 처음 가본 외국에서 새로운 문화를 경험하고 많은 것을 배웠습니다. 그 경험이 제 시야를 넓혀주었어요.'
        WHEN i = 16 THEN '남편과 처음 만난 날. 친구 소개로 만났는데 첫인상부터 좋았어요. 대화가 잘 통하고 편안한 느낌이 들었습니다.'
        WHEN i = 17 THEN '프러포즈를 받던 날. 레스토랑에서 식사를 하던 중 갑자기 무릎을 꿇고 청혼하던 남편의 모습이 아직도 생생해요. 너무 감동적이어서 눈물이 났습니다.'
        WHEN i = 18 THEN '결혼 준비를 하던 시간들. 웨딩드레스를 고르고, 예식장을 정하고, 하객 명단을 작성하던 모든 순간이 행복했어요.'
        WHEN i = 19 THEN '결혼식 날. 하얀 웨딩드레스를 입고 버진로드를 걷던 순간, 남편과 서약을 나누던 순간이 인생에서 가장 아름다운 순간이었습니다.'
        WHEN i = 20 THEN '신혼여행으로 간 제주도. 남편과 단둘이 보낸 시간이 너무 행복했어요. 아름다운 풍경을 보며 미래를 꿈꾸던 시간들이 그립습니다.'
        WHEN i = 21 THEN '첫째 임신 소식을 들었을 때. 믿기지 않아서 여러 번 확인했어요. 생명을 품고 있다는 사실에 감사하고 설레었습니다.'
        WHEN i = 22 THEN '첫째가 태어난 날. 10개월간의 기다림 끝에 만난 아기의 모습에 눈물이 났어요. 작은 손을 꼭 잡았던 순간을 평생 잊지 못할 거예요.'
        WHEN i = 23 THEN '첫째가 처음으로 엄마라고 불렀던 순간. 세상에서 가장 아름다운 말을 들은 것 같았어요. 그 순간의 감동은 말로 표현할 수 없습니다.'
        WHEN i = 24 THEN '첫째의 첫 돌잔치. 가족과 친구들이 모여 축하해주셨어요. 아기가 돌잡이에서 책을 잡았을 때 모두가 기뻐했습니다.'
        WHEN i = 25 THEN '둘째가 태어났을 때. 첫째와는 또 다른 감동이었어요. 두 아이의 엄마가 되어 책임감도 커졌지만 행복도 배가 되었습니다.'
        WHEN i = 26 THEN '아이들의 유치원 입학식. 작은 교복을 입은 모습이 너무 귀여웠어요. 엄마 손을 놓고 교실로 들어가는 뒷모습을 보며 뭉클했습니다.'
        WHEN i = 27 THEN '가족 여행으로 간 놀이공원. 아이들이 즐거워하는 모습을 보며 저도 행복했어요. 온 가족이 함께한 시간이 소중한 추억으로 남았습니다.'
        WHEN i = 28 THEN '첫째의 초등학교 입학식. 큰 가방을 메고 학교에 가는 모습이 대견했어요. 새로운 시작을 응원하며 격려해주었습니다.'
        WHEN i = 29 THEN '아이들과 함께 요리를 하던 시간. 서툴지만 열심히 따라 하는 모습이 사랑스러웠어요. 함께 만든 음식을 먹으며 대화를 나누던 시간이 행복했습니다.'
        WHEN i = 30 THEN '둘째의 학예회. 무대에서 열심히 공연하는 모습을 보며 눈물이 났어요. 아이가 자라는 모습을 보며 뿌듯함을 느꼈습니다.'
        WHEN i = 31 THEN '서울로 이사를 결정했을 때. 낯선 환경이 두렵기도 했지만 가족의 미래를 위해 용기를 냈어요. 그 결정이 우리 가족을 더 단단하게 만들었습니다.'
        WHEN i = 32 THEN '새 집으로 이사한 날. 짐을 정리하며 새로운 시작을 준비했어요. 온 가족이 함께 힘을 모아 집을 꾸미던 시간이 즐거웠습니다.'
        WHEN i = 33 THEN '직장을 옮기기로 결정했을 때. 오랜 고민 끝에 내린 결정이었어요. 새로운 도전이 두렵기도 했지만 성장할 수 있는 기회라고 생각했습니다.'
        WHEN i = 34 THEN '부모님을 모시기로 결정했을 때. 쉽지 않은 결정이었지만 가족의 의미를 다시 생각하게 되었어요. 함께 사는 시간이 소중한 추억으로 남았습니다.'
        WHEN i = 35 THEN '사업을 시작하기로 결정했을 때. 안정적인 직장을 그만두는 게 두려웠지만 꿈을 이루고 싶었어요. 가족의 응원이 큰 힘이 되었습니다.'
        WHEN i = 36 THEN '아버지가 돌아가셨을 때. 인생에서 가장 힘든 시기였어요. 하지만 가족들이 서로 의지하며 극복했습니다.'
        WHEN i = 37 THEN '사업이 어려웠던 시기. 경제적으로 힘들었지만 가족들이 함께 노력하며 이겨냈어요. 그 경험이 우리를 더 강하게 만들었습니다.'
        WHEN i = 38 THEN '건강이 안 좋았던 시기. 병원을 오가며 치료받던 시간이 힘들었어요. 가족의 사랑과 격려가 회복하는 데 큰 힘이 되었습니다.'
        WHEN i = 39 THEN '자녀가 사고를 당했을 때. 가슴이 철렁했지만 다행히 큰 부상은 없었어요. 그 일을 계기로 가족의 소중함을 다시 깨달았습니다.'
        WHEN i = 40 THEN '경제적 위기를 극복했던 경험. 빚을 갚기 위해 온 가족이 힘을 모았어요. 어려움을 함께 이겨내며 가족의 유대감이 더 깊어졌습니다.'
        WHEN i = 41 THEN '첫째의 대학 합격 소식. 그동안의 노력이 결실을 맺는 순간이었어요. 온 가족이 함께 기뻐하며 축하했습니다.'
        WHEN i = 42 THEN '가족 여행으로 간 유럽. 평생 꿈꾸던 여행이었어요. 아름다운 풍경과 문화를 경험하며 가족과 함께한 시간이 너무 행복했습니다.'
        WHEN i = 43 THEN '결혼 25주년 기념일. 남편과 함께 보낸 세월을 돌아보며 감사했어요. 자녀들이 준비한 깜짝 파티에 감동받았습니다.'
        WHEN i = 44 THEN '손주가 태어난 날. 생명의 신비로움을 다시 느꼈어요. 할머니가 된다는 것에 감사하고 행복했습니다.'
        WHEN i = 45 THEN '온 가족이 모인 명절. 여러 세대가 함께 모여 이야기를 나누고 음식을 나눠 먹던 시간이 행복했어요. 가족의 소중함을 다시 느꼈습니다.'
        WHEN i = 46 THEN '후손들에게 전하고 싶은 첫 번째 메시지: 서로 사랑하고 존중하며 살아가세요. 가족이 가장 소중한 거예요.'
        WHEN i = 47 THEN '후손들에게 전하고 싶은 두 번째 메시지: 힘들 때는 서로 의지하고, 기쁠 때는 함께 나누세요. 그것이 가족의 힘입니다.'
        WHEN i = 48 THEN '후손들에게 전하고 싶은 세 번째 메시지: 꿈을 포기하지 마세요. 노력하면 반드시 이룰 수 있습니다.'
        WHEN i = 49 THEN '후손들에게 전하고 싶은 네 번째 메시지: 건강을 소중히 여기세요. 건강이 있어야 행복도 있습니다.'
        ELSE '후손들에게 전하고 싶은 마지막 메시지: 이 이야기가 여러분에게 작은 힘이 되길 바랍니다. 사랑합니다.'
      END,
      'core',
      NOW() - (51 - i) * INTERVAL '12 hours'
    );
  END LOOP;

  v_episode_ids := ARRAY(SELECT id FROM episodes WHERE session_id = v_session_id ORDER BY order_index);

  RAISE NOTICE '✓ Episodes 생성: 50개';

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

  RAISE NOTICE '✓ Compilation 생성: %', v_compilation_id;

  -- Compilation Episode Inclusions (50개 모두 포함)
  FOR i IN 1..50 LOOP
    INSERT INTO compilation_episode_inclusions (compilation_id, episode_id, inclusion_status, decision_reason)
    VALUES (v_compilation_id, v_episode_ids[i], 'core', 'Core memory for premium book');
  END LOOP;

  RAISE NOTICE '✓ Episode Inclusions 생성: 50개';

  -- Compiled Chapters (12개)
  FOR i IN 1..12 LOOP
    INSERT INTO compiled_chapters (compilation_id, order_index, title, created_at)
    VALUES (v_compilation_id, i, v_chapter_titles[i], NOW() - INTERVAL '10 days');
  END LOOP;

  v_chapter_ids := ARRAY(SELECT id FROM compiled_chapters WHERE compilation_id = v_compilation_id ORDER BY order_index);

  RAISE NOTICE '✓ Chapters 생성: 12개';

  -- Compiled Paragraphs (120개: 챕터당 10개)
  FOR i IN 1..120 LOOP
    INSERT INTO compiled_paragraphs (chapter_id, order_index, content, paragraph_type, created_at)
    VALUES (
      v_chapter_ids[(i-1) / 10 + 1],
      ((i-1) % 10) + 1,
      (SELECT content FROM episodes WHERE session_id = v_session_id ORDER BY order_index LIMIT 1 OFFSET (i-1) % 50),
      'grounded',
      NOW() - INTERVAL '10 days'
    );
  END LOOP;

  RAISE NOTICE '✓ Paragraphs 생성: 120개';

  -- Order (Premium 패키지)
  INSERT INTO orders (user_id, session_id, package, amount, status, paid_at, created_at)
  VALUES (v_user_id, v_session_id, 'premium', 299000, 'paid', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_order_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Premium 패키지 풍부한 테스트 데이터 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User: % (ryan_jj@naver.com)', v_user_id;
  RAISE NOTICE 'Session: % (어머니)', v_session_id;
  RAISE NOTICE 'Order: % (299,000원, premium)', v_order_id;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Messages: 100개 (50 질문 + 50 답변)';
  RAISE NOTICE 'Episodes: 50개 (풍부한 이야기)';
  RAISE NOTICE 'Chapters: 12개';
  RAISE NOTICE 'Paragraphs: 120개 (챕터당 10개)';
  RAISE NOTICE '========================================';
  RAISE NOTICE '이제 실제 책 제작이 가능한 수준입니다!';
  RAISE NOTICE '========================================';

END $$;
