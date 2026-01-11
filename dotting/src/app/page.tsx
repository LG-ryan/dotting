'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@supabase/ssr';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 인증 상태 확인
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setCheckingAuth(false);
    };

    checkAuth();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const faqs = [
    {
      q: '어떤 이야기를 담을 수 있나요?',
      a: '부모님의 인생 이야기, 나 자신의 기록, 반려동물과의 추억, 떠나보낸 분에 대한 기억, 연인이나 친구와의 이야기 등 모든 소중한 이야기를 담을 수 있어요.',
    },
    {
      q: '얼마나 걸리나요?',
      a: '함께하기 모드는 2~3시간이면 충분해요. 여유 모드는 2~4주에 걸쳐 천천히 진행할 수도 있습니다.',
    },
    {
      q: '어떤 질문을 하나요?',
      a: '삶의 중요한 순간들을 자연스럽게 여쭤봅니다. 어린 시절, 전환점, 소중한 관계 등 대화 흐름에 따라 질문이 깊어집니다.',
    },
    {
      q: '수정이 가능한가요?',
      a: '네, 완성 전에 미리보기에서 내용을 확인하고 직접 수정하실 수 있어요. 2회까지 무료 수정이 가능합니다.',
    },
    {
      q: '환불은 어떻게 되나요?',
      a: 'PDF 다운로드 전에는 100% 환불 가능합니다. 실물 책은 인쇄 불량에 한해 교환해드립니다.',
    },
    {
      q: '데이터는 안전한가요?',
      a: '모든 데이터는 암호화되어 저장되며, 음성 녹음 원본은 텍스트 변환 후 30일 뒤 자동 삭제됩니다. 원하시면 즉시 삭제도 가능해요.',
    },
  ];

  const storyTypes = [
    { label: '부모님의 이야기', desc: '인생의 지혜를 책으로' },
    { label: '나의 이야기', desc: '나를 위한 기록' },
    { label: '반려동물과의 추억', desc: '함께한 시간을 영원히' },
    { label: '떠나보낸 분', desc: '소중한 기억을 간직' },
    { label: '연인, 친구', desc: '우리만의 이야기' },
  ];

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)]">
      {/* Navigation - 조용한 럭셔리 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--dotting-border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* 로고 - 정교화된 워드마크 */}
          <Link href="/" className="dotting-wordmark dotting-wordmark--lg">
            <span className="dotting-wordmark-d">D</span>
            <span className="dotting-wordmark-otting">OTTING</span>
          </Link>
          {!checkingAuth && (
            isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">내 프로젝트</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Hero Section - "조용한 럭셔리 + 책의 질감" */}
      <section className="pt-32 pb-20 px-6 min-h-[90vh] flex items-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* 텍스트 영역 - 더 여유있는 레이아웃 */}
            <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
              {/* 시그니처 */}
              <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-6">
                모든 이야기는 계속된다 ●●●
              </p>
              
              {/* 메인 헤드라인 - Serif 느낌 */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.2] mb-8 text-[var(--dotting-deep-navy)]">
                부모님의 이야기를<br />
                <span className="relative inline-block">
                  <span className="relative z-10">한 권의 책</span>
                  <span 
                    className="absolute bottom-1 left-0 w-full h-3 -z-0 opacity-30"
                    style={{ backgroundColor: 'var(--dotting-warm-amber)' }}
                  />
                </span>
                으로
          </h1>
              
              {/* 서브카피 - 간결하게 */}
              <p className="text-lg md:text-xl leading-relaxed text-[var(--dotting-muted-gray)] mb-10" style={{ lineHeight: '1.7' }}>
                AI가 인터뷰하고, 편집하고,<br className="hidden sm:block" />
                아름다운 책으로 완성해드려요.
              </p>
              
              {/* CTA 영역 */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                <Link href="/signup">
                  <Button size="xl" className="w-full sm:w-auto">
                    지금 시작하기
                  </Button>
                </Link>
                <a href="#sample">
                  <Button variant="secondary" size="xl" className="w-full sm:w-auto">
                    샘플 책 보기
                  </Button>
                </a>
              </div>
              
              {/* 안심 메시지 */}
              <p className="text-sm text-[var(--dotting-muted-gray)] mb-3">
                무료로 시작하세요 · 완성될 때까지 결제 없음
              </p>
              
              {/* 철학 페이지 링크 */}
              <Link 
                href="/why" 
                className="text-sm text-[var(--dotting-warm-amber)] hover:underline underline-offset-4"
              >
                왜 DOTTING인가요? →
              </Link>
            </div>
            
            {/* 책 목업 영역 - 미니멀 2.5D 스타일 */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                {/* 부드러운 배경 글로우 */}
                <div 
                  className="absolute inset-0 -m-8 rounded-3xl opacity-30"
                  style={{ 
                    background: 'radial-gradient(circle at 50% 50%, var(--dotting-warm-amber) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                  }}
                />
                
                {/* 책 목업 컨테이너 */}
                <div className="relative" style={{ perspective: '1200px' }}>
                  {/* 메인 책 */}
                  <div 
                    className="relative w-64 h-[340px] md:w-72 md:h-[380px] rounded-r-lg dotting-book-shadow"
                    style={{ 
                      transform: 'rotateY(-12deg) rotateX(2deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* 책 표지 */}
                    <div 
                      className="absolute inset-0 rounded-r-lg p-8 flex flex-col justify-between overflow-hidden"
                      style={{ 
                        background: 'linear-gradient(145deg, #1A365D 0%, #2D4A6F 100%)',
                      }}
                    >
                      {/* 미묘한 텍스처 오버레이 */}
                      <div 
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        }}
                      />
                      
                      <div className="relative z-10">
                        <p className="text-xs tracking-[0.2em] mb-4 text-[var(--dotting-warm-amber)] font-medium">
                          DOTTING
                        </p>
                        <h3 className="text-2xl md:text-[1.75rem] dotting-serif text-white leading-tight font-medium">
                          엄마의<br />
                          이야기
                        </h3>
                      </div>
                      
                      <div className="relative z-10">
                        <div className="w-12 h-[1px] mb-4 bg-[var(--dotting-warm-amber)]/60" />
                        <p className="text-sm text-white/50 tracking-wide">2026</p>
                      </div>
                    </div>
                    
                    {/* 책 등 (페이지 두께) */}
                    <div 
                      className="absolute left-0 top-0 w-4 h-full"
                      style={{ 
                        background: 'linear-gradient(90deg, #F5F0E8 0%, #E8E0D8 50%, #1A365D 100%)',
                        transform: 'translateX(-100%) rotateY(90deg)',
                        transformOrigin: 'right center',
                      }}
                    />
                  </div>
                  
                  {/* 내지 프리뷰 - 더 세련되게 */}
                  <div 
                    className="absolute -right-6 top-10 w-52 h-64 md:w-60 md:h-72 bg-white rounded-sm shadow-xl p-6 hidden md:block"
                    style={{ 
                      transform: 'rotate(5deg) translateZ(-10px)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* 페이지 헤더 */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <p className="text-[10px] tracking-widest text-[var(--dotting-warm-amber)] uppercase">Chapter 1</p>
                      <p className="text-[10px] text-gray-300">12</p>
                    </div>
                    
                    {/* 챕터 타이틀 */}
                    <h4 className="dotting-serif text-base text-[var(--dotting-deep-navy)] mb-3 font-medium">
                      어린 시절
                    </h4>
                    
                    {/* 본문 미리보기 */}
                    <p className="text-[13px] leading-[1.8] text-[var(--dotting-muted-gray)]" style={{ fontFamily: 'var(--font-sans)' }}>
                      "아버지는 늘 새벽에 일어나셨다. 
                      아직 해가 뜨기 전, 
                      고요한 부엌에서 
                      커피 향이..."
                    </p>
                  </div>
                </div>
                
                {/* 샘플 이미지 표기 */}
                <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-gray-400">
                  샘플 이미지
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Types - 더 미니멀하게 */}
      <section className="py-12 bg-white border-y border-[var(--dotting-border)]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {storyTypes.map((type, index) => (
              <div key={index} className="text-center group cursor-default">
                <p className="font-medium text-[var(--dotting-deep-navy)] group-hover:text-[var(--dotting-warm-amber)] transition-colors">
                  {type.label}
                </p>
                <p className="text-sm text-[var(--dotting-muted-gray)]">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - 더 여유있는 레이아웃 */}
      <section className="py-24 px-6 bg-[var(--dotting-soft-cream)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
              PROCESS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--dotting-deep-navy)] mb-4">
              이렇게 만들어집니다
            </h2>
            <p className="text-[var(--dotting-muted-gray)] max-w-md mx-auto" style={{ lineHeight: '1.7' }}>
              복잡한 건 저희가 다 합니다.<br />이야기만 들려주세요.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '1', title: '프로젝트 시작', desc: '누구의 이야기인지 선택하고, 링크를 생성하세요.' },
              { step: '2', title: '대화하기', desc: '자연스러운 질문에 편하게 답해주세요. 대화가 이야기가 됩니다.' },
              { step: '3', title: '책 완성', desc: '이야기가 자동으로 정리되어 아름다운 책이 됩니다.' },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative">
                {/* 연결선 */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[1px] bg-[var(--dotting-border)]" />
                )}
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 bg-white border-2 border-[var(--dotting-warm-amber)]"
                >
                  <span className="text-xl font-bold text-[var(--dotting-warm-amber)]">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-3 text-[var(--dotting-deep-navy)]">
                  {item.title}
                </h3>
                <p className="text-[var(--dotting-muted-gray)] text-sm leading-relaxed max-w-[200px] mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Preview */}
      <section id="sample" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: '#1E3A5F' }}>
            이런 책이 만들어집니다
          </h2>
          <p className="text-center mb-12 max-w-xl mx-auto" style={{ color: '#5A6978' }}>
            실제 완성된 샘플을 확인해보세요
          </p>
          
          {/* 책 3종 갤러리 */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { title: '어머니의 이야기', year: '1952 - 2024', color: '#1E3A5F' },
              { title: '우리 강아지 복실이', year: '2015 - 2023', color: '#5A7A5A' },
              { title: '나의 20대', year: '2000 - 2010', color: '#6B5A7A' },
            ].map((book, idx) => (
              <div key={idx} className="flex justify-center">
                <div className="relative" style={{ perspective: '800px' }}>
                  <div 
                    className="w-44 h-60 md:w-52 md:h-72 rounded-r-md shadow-xl transition-transform hover:scale-105"
                    style={{ 
                      transform: 'rotateY(-8deg)',
                      background: `linear-gradient(145deg, ${book.color} 0%, ${book.color}dd 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                      <div>
                        <p className="text-xs tracking-widest mb-2" style={{ color: '#D4A574' }}>DOTTING</p>
                        <h4 className="text-lg font-serif text-white leading-tight">{book.title}</h4>
                      </div>
                      <div>
                        <div className="w-12 h-0.5 mb-2" style={{ backgroundColor: '#D4A574' }} />
                        <p className="text-xs text-white/60">{book.year}</p>
                      </div>
                    </div>
                    {/* 책 등 */}
                    <div 
                      className="absolute left-0 top-0 w-3 h-full rounded-l-sm"
                      style={{ 
                        background: `linear-gradient(90deg, ${book.color}88 0%, ${book.color} 100%)`,
                        transform: 'translateX(-100%) rotateY(90deg)',
                        transformOrigin: 'right center',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 내지 샘플 */}
          <div className="rounded-3xl p-8 md:p-12" style={{ backgroundColor: '#FDF8F3' }}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* 펼쳐진 내지 */}
              <div className="relative">
                <div className="flex shadow-2xl rounded-lg overflow-hidden">
                  {/* 왼쪽 페이지 */}
                  <div className="w-1/2 bg-white p-6 md:p-8 min-h-[280px]" style={{ borderRight: '1px solid #E8E0D8' }}>
                    <p className="text-xs mb-4" style={{ color: '#D4A574' }}>Chapter 2</p>
                    <h4 className="text-lg font-serif mb-4" style={{ color: '#1E3A5F' }}>첫 번째 집</h4>
                    <p className="text-sm leading-relaxed font-serif" style={{ color: '#5A6978' }}>
                      신혼 시절, 단칸방에서 시작했어요. 창문으로 들어오는 햇살이 참 따뜻했어요...
                    </p>
                    <p className="absolute bottom-6 left-6 text-xs" style={{ color: '#B0B8C0' }}>24</p>
                  </div>
                  {/* 오른쪽 페이지 */}
                  <div className="w-1/2 bg-white p-6 md:p-8 min-h-[280px]">
                    <p className="text-sm leading-relaxed font-serif" style={{ color: '#5A6978' }}>
                      아침마다 시장에 가서 두부를 사오던 일, 저녁이면 함께 라디오를 듣던 일. 
                      그 작은 방이 우리에겐 세상 전부였어요.
                    </p>
                    <p className="absolute bottom-6 right-6 text-xs" style={{ color: '#B0B8C0' }}>25</p>
                  </div>
                </div>
                <p className="text-center text-sm mt-4" style={{ color: '#8B6F47' }}>
                  A5 사이즈 · 하드커버 · 무광 코팅
                </p>
              </div>
              
              {/* 샘플 인용 */}
              <div>
                <p className="font-medium mb-3" style={{ color: '#D4A574' }}>●●● 샘플 발췌</p>
                <blockquote className="text-xl md:text-2xl font-serif leading-relaxed mb-6" style={{ color: '#1E3A5F' }}>
                  "그때가 제일 행복했어요. 아무것도 없던 시절이었지만, 함께여서 충분했어요."
                </blockquote>
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#5A6978' }}>
                  <p>
                    이야기 속 진심이 그대로 담깁니다. 
                    말투, 감정, 당시의 분위기까지 
                    책으로 옮겨집니다.
                  </p>
                </div>
                <div className="mt-8 pt-6 flex items-center gap-6" style={{ borderTop: '1px solid #E8E0D8' }}>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>50~100</p>
                    <p className="text-xs" style={{ color: '#8B6F47' }}>페이지 분량</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>20+</p>
                    <p className="text-xs" style={{ color: '#8B6F47' }}>개의 이야기</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>3</p>
                    <p className="text-xs" style={{ color: '#8B6F47' }}>개의 챕터</p>
                  </div>
                </div>
                <p className="mt-4 text-xs" style={{ color: '#B0B8C0' }}>
                  *샘플 기준이며, 실제 분량은 대화에 따라 달라집니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-6" style={{ backgroundColor: '#F5F0EA' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10" style={{ color: '#1E3A5F' }}>
            안심하고 맡겨주세요
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { 
                title: '데이터 보안', 
                desc: '모든 데이터는 암호화 저장. 음성은 변환 후 30일 뒤 자동 삭제.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A574' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              },
              { 
                title: '직접 수정 가능', 
                desc: '인쇄 전 미리보기에서 직접 검토하고 수정할 수 있어요.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A574' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )
              },
              { 
                title: '끝까지 책임', 
                desc: '실물 책 제작부터 배송까지. 인쇄 불량은 무조건 교환.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A574' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: 'rgba(212, 165, 116, 0.15)' }}
                >
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#1E3A5F' }}>{item.title}</h3>
                <p className="text-sm" style={{ color: '#5A6978' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: '#1E3A5F' }}>
            가격 안내
          </h2>
          <p className="text-center mb-12 max-w-xl mx-auto" style={{ color: '#5A6978' }}>
            실물 책이 포함된 패키지로, 선물의 가치를 높여드립니다
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* PDF Only */}
            <div className="rounded-2xl p-8" style={{ backgroundColor: '#FDF8F3', border: '1px solid #E8E0D8' }}>
              <p className="font-medium mb-2" style={{ color: '#8B6F47' }}>PDF 전용</p>
              <p className="text-3xl font-bold mb-1" style={{ color: '#1E3A5F' }}>79,000원</p>
              <p className="text-sm mb-6" style={{ color: '#5A6978' }}>실물 책 미포함</p>
              <ul className="space-y-3 mb-8" style={{ color: '#5A6978' }}>
                {['PDF 다운로드', '20개 이야기', '2회 무료 수정'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#8B6F47' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full py-3 text-center font-medium rounded-full transition-colors hover:bg-white/50"
                style={{ color: '#1E3A5F', border: '1px solid #1E3A5F' }}
              >
                선택하기
              </Link>
            </div>
            
            {/* Standard - Recommended */}
            <div 
              className="rounded-2xl p-8 relative"
              style={{ backgroundColor: 'rgba(212, 165, 116, 0.1)', border: '2px solid #D4A574' }}
            >
              <div 
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-sm font-medium px-4 py-1 rounded-full"
                style={{ backgroundColor: '#D4A574' }}
              >
                추천
              </div>
              <p className="font-medium mb-2" style={{ color: '#D4A574' }}>정식 패키지</p>
              <p className="text-3xl font-bold mb-1" style={{ color: '#1E3A5F' }}>149,000원</p>
              <p className="text-sm mb-6" style={{ color: '#5A6978' }}>하드커버 1권 포함</p>
              <ul className="space-y-3 mb-8" style={{ color: '#5A6978' }}>
                {['PDF + 하드커버 책 1권', '20개 이야기 (50페이지+)', '2회 무료 수정', '무료 배송'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#D4A574' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full py-3 text-center font-semibold rounded-full transition-all hover:opacity-90"
                style={{ backgroundColor: '#D4A574', color: '#1E3A5F' }}
              >
                선택하기
              </Link>
            </div>
            
            {/* Premium */}
            <div className="rounded-2xl p-8" style={{ backgroundColor: '#FDF8F3', border: '1px solid #E8E0D8' }}>
              <p className="font-medium mb-2" style={{ color: '#8B6F47' }}>프리미엄 패키지</p>
              <p className="text-3xl font-bold mb-1" style={{ color: '#1E3A5F' }}>199,000원</p>
              <p className="text-sm mb-6" style={{ color: '#5A6978' }}>하드커버 2권 포함</p>
              <ul className="space-y-3 mb-8" style={{ color: '#5A6978' }}>
                {['PDF + 하드커버 책 2권', '30개+ 이야기 (100페이지+)', '3회 무료 수정', '무료 배송'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#8B6F47' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full py-3 text-center font-medium rounded-full transition-colors hover:bg-white/50"
                style={{ color: '#1E3A5F', border: '1px solid #1E3A5F' }}
              >
                선택하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6" style={{ backgroundColor: 'rgba(212, 165, 116, 0.1)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6" style={{ color: '#D4A574' }}>
            <span className="text-4xl">●●●</span>
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium leading-relaxed mb-6" style={{ color: '#1E3A5F' }}>
            &ldquo;아버지가 돌아가시기 전에 이 책을 만들어드렸어요.<br />
            지금은 이 책이 아버지를 기억하는 가장 소중한 방법이에요.&rdquo;
          </blockquote>
          <p style={{ color: '#5A6978' }}>
            — 김OO님, 서울
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: '#1E3A5F' }}>
            자주 묻는 질문
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid #E8E0D8' }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between bg-white transition-colors hover:bg-stone-50"
                >
                  <span className="font-medium" style={{ color: '#1E3A5F' }}>{faq.q}</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#8B6F47' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4" style={{ backgroundColor: '#FDF8F3', borderTop: '1px solid #E8E0D8' }}>
                    <p className="leading-relaxed" style={{ color: '#5A6978' }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - 더 임팩트 있게 */}
      <section className="py-24 px-6 bg-[var(--dotting-deep-navy)] relative overflow-hidden">
        {/* 배경 패턴 */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, var(--dotting-warm-amber) 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, var(--dotting-warm-amber) 0%, transparent 50%)`,
          }}
        />
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-6">
            ●●●
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            소중한 이야기,<br />지금 시작하세요
          </h2>
          <p className="mb-10 text-lg text-white/60">
            모든 이야기는 계속된다
          </p>
          <Link href="/signup">
            <Button variant="celebration" size="xl" className="shadow-2xl">
              지금 시작하기
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer - 조용한 럭셔리 + ●●● 시그니처 */}
      <footer className="py-12 px-6 bg-[#0F1F2E]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* 로고 - 정교화된 워드마크 */}
            <Link href="/" className="dotting-wordmark dotting-wordmark--md dotting-wordmark--white">
              <span className="dotting-wordmark-d">D</span>
              <span className="dotting-wordmark-otting">OTTING</span>
            </Link>
            <div className="flex gap-6 text-sm text-white/50">
              <a href="#" className="hover:text-white transition-colors">이용약관</a>
              <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
              <a href="#" className="hover:text-white transition-colors">문의하기</a>
            </div>
          </div>
          
          {/* 시그니처 영역 */}
          <div className="mt-8 pt-8 text-center border-t border-white/10">
            {/* ●●● 시그니처 */}
            <div className="flex justify-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/60" />
            </div>
            <p className="text-sm text-white/40 mb-1">모든 이야기는 계속된다</p>
            <p className="text-xs text-white/30">© 2026 DOTTING. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
