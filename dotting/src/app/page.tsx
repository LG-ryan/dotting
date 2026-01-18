'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/ui/user-menu';
import { createBrowserClient } from '@supabase/ssr';

// 스크롤 애니메이션 훅
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 스크롤 애니메이션 활성화
  useScrollReveal();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserEmail(user?.email || '');
      setCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);
      setUserEmail(session?.user?.email || '');
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--dotting-border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="dotting-wordmark dotting-wordmark--lg cursor-pointer">
            <span className="dotting-wordmark-d">D</span>
            <span className="dotting-wordmark-otting">OTTING</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/why">
              <Button variant="ghost" size="sm">도팅 스토리</Button>
            </Link>
            {!checkingAuth && (
              isLoggedIn ? (
                <UserMenu userEmail={userEmail} />
              ) : (
                <Link href="/login">
                  <Button size="sm" className="bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F]">도팅 로그인</Button>
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - 프리미엄 */}
      <section className="pt-28 pb-20 lg:pb-24 px-6 min-h-[85vh] flex items-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* 텍스트 영역 */}
            <div className="text-center lg:text-left max-w-lg mx-auto lg:mx-0 animate-fade-in-up">
              <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-8 flex items-center justify-center lg:justify-start gap-3">
                <span>모든 이야기는 계속된다</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/60" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
                </span>
              </p>

              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold font-serif leading-[1.15] mb-8 text-[var(--dotting-deep-navy)]">
                소중한 이야기를<br />
                <span className="relative inline-block">
                  <span className="relative z-10">한 권의 책</span>
                  <span
                    className="absolute bottom-1 left-0 w-full h-3 -z-0 opacity-30"
                    style={{ backgroundColor: 'var(--dotting-warm-amber)' }}
                  />
                </span>
                으로
              </h1>

              <p className="text-lg md:text-xl text-[var(--dotting-muted-gray)] mb-12 leading-relaxed">
                이야기만 들려주세요. 아름다운 책으로 엮어드릴게요.<br className="hidden sm:block" />
                당신의 목소리가 가장 특별한 유산이 됩니다.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/signup">
                  <Button size="xl" className="w-full sm:w-auto">
                    지금 시작하기
                  </Button>
                </Link>
                <a href="#sample">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto">
                    샘플 먼저 볼게요
                  </Button>
                </a>
              </div>

              <p className="text-sm text-[var(--dotting-muted-gray)]">
                샘플 먼저 보기 (무료) · 선결제 후 인터뷰 시작
              </p>
            </div>

            {/* 실사 이미지 + DOTTING 오버레이 */}
            <div className="relative flex justify-center lg:justify-end order-first lg:order-last animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] shadow-2xl">
                  <Image
                    src="/images/hero-book.jpg"
                    alt="소중한 이야기가 담긴 책"
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
                    className="object-cover object-[center_55%]"
                  />
                  {/* DOTTING 샘플 책 오버레이 - 강화 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--dotting-deep-navy)] via-[var(--dotting-deep-navy)]/40 to-transparent" />



                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-[10px] tracking-widest mb-2 text-[var(--dotting-warm-amber)] flex items-center gap-2">
                      <span>DOTTING SAMPLE</span>
                      <span className="flex gap-0.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                      </span>
                    </p>
                    <h4 className="text-lg font-serif leading-tight mb-1">어머니의 이야기</h4>
                    <p className="text-xs text-white/60">1952 - 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Who - 1문장 */}
      <section className="py-12 px-6 bg-white border-b border-[var(--dotting-border)]">
        <div className="max-w-4xl mx-auto text-center reveal">
          <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
            <span className="text-[var(--dotting-deep-navy)] font-medium">부모님</span>뿐 아니라
            <span className="text-[var(--dotting-deep-navy)] font-medium"> 나</span>,
            <span className="text-[var(--dotting-deep-navy)] font-medium">반려동물</span>,
            <span className="text-[var(--dotting-deep-navy)] font-medium">떠나보낸 분</span>까지—
            모든 이야기가 한 권의 책이 됩니다.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 lg:py-28 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 reveal">
            <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
              PROCESS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-6">
              이렇게 만들어집니다
            </h2>
            <p className="text-[var(--dotting-muted-gray)] max-w-md mx-auto leading-relaxed">
              복잡한 건 저희가 할게요.<br />이야기만 들려주세요.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
            {[
              { step: '1', title: '시작하기', desc: '누구의 이야기인지 선택하고 시작하세요.' },
              { step: '2', title: '대화하기', desc: '편하게 답해주세요. 대화가 이야기가 됩니다.' },
              { step: '3', title: '책 완성', desc: '이야기가 아름답게 정리되어 책이 됩니다.' },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[1px] bg-[var(--dotting-border)]" />
                )}
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10 bg-[var(--dotting-soft-cream)]/50 border-2 border-[var(--dotting-warm-amber)]">
                  <span className="text-xl font-bold text-[var(--dotting-warm-amber)]">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-[var(--dotting-deep-navy)]">
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

      {/* Benefits - 체크리스트 (How It Works 직후) */}
      <section className="py-12 px-6 bg-[var(--dotting-warm-gray)] border-y border-[var(--dotting-border)]">
        <div className="max-w-3xl mx-auto reveal">
          <h3 className="text-center text-base font-semibold text-[var(--dotting-deep-navy)] mb-6">
            무엇을 받게 되나요
          </h3>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-10">
            {['PDF 다운로드', '실물 하드커버 책', '2회 무료 수정'].map((item, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2">
                <span className="text-[var(--dotting-warm-amber)]">✓</span>
                <span className="text-[var(--dotting-muted-gray)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Preview - 결과물 신뢰의 핵심 */}
      <section id="sample" className="py-24 lg:py-28 px-6 bg-[var(--dotting-soft-cream)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-4">
              이런 책이 만들어집니다
            </h2>
            <p className="text-[var(--dotting-muted-gray)] mb-8">
              실제 완성된 샘플을 확인해보세요
            </p>
            {/* Social Proof */}
            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className="text-2xl font-bold text-[var(--dotting-warm-amber)]">120+</p>
                <p className="text-xs text-[var(--dotting-muted-gray)]">완성된 이야기</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--dotting-warm-amber)]">50시간+</p>
                <p className="text-xs text-[var(--dotting-muted-gray)]">인터뷰 시간</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--dotting-warm-amber)]">4.9/5</p>
                <p className="text-xs text-[var(--dotting-muted-gray)]">만족도</p>
              </div>
            </div>
          </div>

          {/* 책 3종 갤러리 */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { title: '어머니의 이야기', subtitle: '인생의 지혜를 담아', year: '1952 - 2024', color: '#1E3A5F' },
              { title: '우리 강아지 복실이', subtitle: '함께한 시간을 영원히', year: '2015 - 2023', color: '#5A7A5A' },
              { title: '나의 20대', subtitle: '나를 위한 기록', year: '2000 - 2010', color: '#6B5A7A' },
            ].map((book, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="relative mb-4" style={{ perspective: '800px' }}>
                  <div
                    className="w-44 h-60 md:w-48 md:h-64 rounded-r-md shadow-xl transition-transform hover:scale-105 cursor-pointer"
                    style={{
                      transform: 'rotateY(-8deg)',
                      background: `linear-gradient(145deg, ${book.color} 0%, ${book.color}dd 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 p-5 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] tracking-widest mb-2 text-[var(--dotting-warm-amber)]">DOTTING</p>
                        <h4 className="text-base font-serif text-white leading-tight">{book.title}</h4>
                      </div>
                      <div>
                        <div className="w-10 h-0.5 mb-2 bg-[var(--dotting-warm-amber)]/60" />
                        <p className="text-[10px] text-white/50">{book.year}</p>
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
                <p className="text-sm text-[var(--dotting-muted-gray)]">{book.subtitle}</p>
              </div>
            ))}
          </div>

          {/* 내지 상세 미리보기 */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* 펼쳐진 내지 */}
              <div className="relative">
                <div className="flex shadow-2xl rounded-lg overflow-hidden">
                  <div className="w-1/2 bg-[#FDFBF8] p-5 md:p-6 min-h-[260px] border-r border-gray-100 relative">
                    <p className="text-[10px] tracking-widest mb-3 text-[var(--dotting-warm-amber)]">CHAPTER 2</p>
                    <h4 className="text-base font-serif mb-3 text-[var(--dotting-deep-navy)]">첫 번째 집</h4>
                    <p className="text-[13px] leading-[1.9] font-serif text-[var(--dotting-muted-gray)]">
                      신혼 시절, 단칸방에서 시작했어요. 아침마다 시장에서 사오던 따뜻한 두부의 온기가 아직도 손끝에 남은 것 같아요...
                    </p>
                    <p className="absolute bottom-4 left-5 text-[10px] text-gray-300">24</p>
                  </div>
                  <div className="w-1/2 bg-[#FDFBF8] p-5 md:p-6 min-h-[260px] relative">
                    <p className="text-[13px] leading-[1.9] font-serif text-[var(--dotting-muted-gray)]">
                      아침마다 시장에 가서 두부를 사오던 일, 저녁이면 함께 라디오를 듣던 일.
                      그 작은 방이 우리에겐 세상 전부였어요.
                    </p>
                    <p className="absolute bottom-4 right-5 text-[10px] text-gray-300">25</p>
                  </div>
                </div>
              </div>

              {/* 샘플 인용 + 스펙 */}
              <div>
                <p className="text-sm font-medium text-[var(--dotting-warm-amber)] mb-4 flex items-center gap-2">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-current" />
                    <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                    <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                  </span>
                  샘플 발췌
                </p>
                <blockquote className="text-xl md:text-2xl font-serif leading-relaxed mb-6 text-[var(--dotting-deep-navy)]">
                  "그때가 제일 행복했어요. 가난했지만, 퇴근길 남편의 손에 들린 귤 한 봉지면 온 세상을 다 가진 것 같았죠."
                </blockquote>
                <p className="text-sm text-[var(--dotting-muted-gray)] leading-relaxed mb-8">
                  이야기 속 진심이 그대로 담깁니다.<br />
                  말투, 감정, 당시의 분위기까지 책으로 옮겨집니다.
                </p>

                {/* 통계 */}
                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-100">
                  <div>
                    <p className="text-2xl font-bold text-[var(--dotting-deep-navy)]">50~100</p>
                    <p className="text-xs text-[var(--dotting-muted-gray)]">페이지 분량</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--dotting-deep-navy)]">20+</p>
                    <p className="text-xs text-[var(--dotting-muted-gray)]">개의 이야기</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--dotting-deep-navy)]">3</p>
                    <p className="text-xs text-[var(--dotting-muted-gray)]">개의 챕터</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--dotting-muted-gray)]/60 mt-2">*샘플 기준, 실제 분량은 대화에 따라 달라집니다</p>

                {/* 제본 스펙 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                    <span className="text-[var(--dotting-muted-gray)]">A5 사이즈 (148×210mm)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                    <span className="text-[var(--dotting-muted-gray)]">하드커버 양장</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                    <span className="text-[var(--dotting-muted-gray)]">무광 코팅</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                    <span className="text-[var(--dotting-muted-gray)]">고급 모조지 120g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust + Testimonial 통합 */}
      <section className="py-24 lg:py-28 px-6 bg-[var(--dotting-warm-gray)]">
        <div className="max-w-4xl mx-auto">
          {/* Testimonial */}
          <div className="text-center mb-20 reveal">
            <div className="flex justify-center gap-1 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
            </div>
            <blockquote className="text-2xl md:text-3xl font-medium font-serif leading-relaxed mb-6 text-[var(--dotting-deep-navy)]">
              &ldquo;엄마의 이야기를 책으로 만들어드렸어요.<br />
              가족 모두가 가장 소중하게 여기는 선물이 됐습니다.&rdquo;
            </blockquote>
            <p className="text-[var(--dotting-muted-gray)]">— 이OO님, 베타 테스터</p>
          </div>

          {/* Trust */}
          <div className="grid sm:grid-cols-3 gap-6 reveal">
            {[
              {
                title: '철저한 보안',
                desc: '소중한 이야기는 암호화되어 안전하게 보관됩니다',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )
              },
              {
                title: '직접 수정',
                desc: '인쇄 전 검토 및 수정 가능',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                )
              },
              {
                title: '끝까지 책임',
                desc: '제작부터 배송까지',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                )
              },
            ].map((item, index) => (
              <div key={index} className="text-center p-6 bg-[var(--dotting-soft-cream)] rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 text-[var(--dotting-warm-amber)]">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2 text-[var(--dotting-deep-navy)]">{item.title}</h3>
                <p className="text-sm text-[var(--dotting-muted-gray)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prologue - Free Preview */}
      <section className="py-16 px-6 bg-white border-y border-[var(--dotting-border)]">
        <div className="max-w-4xl mx-auto text-center reveal">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-3">
            Prologue
          </h3>
          <p className="text-[var(--dotting-muted-gray)] mb-8">
            프롤로그 - 이야기의 시작<br />
            완성된 샘플 책을 무료로 열람하고, 질문 3개를 미리 확인해보세요
          </p>
          <a href="#sample">
            <Button variant="outline" size="lg">
              무료 샘플 보기
            </Button>
          </a>
        </div>
      </section>

      {/* Pricing - 3 Packages */}
      <section id="pricing" className="py-20 px-6 bg-[var(--dotting-soft-cream)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
              PRICING
            </p>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-6">
              나에게 맞는 패키지 선택하기
            </h2>
            <p className="text-[var(--dotting-muted-gray)]">
              얼리버드 특가로 만나보세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Essay */}
            <div className="bg-white rounded-3xl p-8 border border-[var(--dotting-border)] shadow-lg relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
                </div>
              </div>
              <h3 className="text-xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-2">Essay</h3>
              <p className="text-sm text-[var(--dotting-muted-gray)] mb-6">에세이 - 담백한 수필</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold text-[var(--dotting-deep-navy)]">39,000원</span>
                <span className="text-sm text-[var(--dotting-muted-gray)] line-through">59,000원</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>도팅 편집 PDF</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>무제한 디지털 열람</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>영구 클라우드 보관</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>2회 무료 수정</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" size="lg" className="w-full">
                  시작하기
                </Button>
              </Link>
            </div>

            {/* Story - 추천 */}
            <div className="bg-white rounded-3xl p-8 border-2 border-[var(--dotting-warm-amber)] shadow-2xl relative transform md:scale-105">
              <div className="absolute top-0 right-0 bg-[var(--dotting-warm-amber)] text-white text-xs font-bold px-4 py-2 rounded-bl-xl">
                EARLY BIRD
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]/30" />
                </div>
              </div>
              <h3 className="text-xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-2">Story</h3>
              <p className="text-sm text-[var(--dotting-muted-gray)] mb-6">스토리 - 완성된 이야기</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold text-[var(--dotting-deep-navy)]">99,000원</span>
                <span className="text-sm text-[var(--dotting-muted-gray)] line-through">149,000원</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>프리미엄 하드커버 1권</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span><strong>오디오 QR 코드</strong> (목소리 보존)</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>도팅 프리미엄 편집 PDF</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>친환경 프리미엄 패키징</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>3회 무료 수정</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>무료 배송</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="celebration" size="lg" className="w-full">
                  지금 시작하기
                </Button>
              </Link>
            </div>

            {/* Heritage */}
            <div className="bg-white rounded-3xl p-8 border border-[var(--dotting-border)] shadow-lg relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dotting-warm-amber)]" />
                </div>
              </div>
              <h3 className="text-xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-2">Heritage</h3>
              <p className="text-sm text-[var(--dotting-muted-gray)] mb-6">헤리티지 - 세대를 넘는 유산</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold text-[var(--dotting-deep-navy)]">199,000원</span>
                <span className="text-sm text-[var(--dotting-muted-gray)] line-through">299,000원</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>프리미엄 하드커버 2권</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span><strong>특별 각인 서비스</strong> (헌정사)</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>오디오 QR 코드</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>티저 오디오 클립 (30초)</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span><strong>VIP 패스트트랙</strong></span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>친환경 프리미엄 패키징</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>5회 무료 수정</span>
                </li>
                <li className="flex items-start gap-2 text-[var(--dotting-deep-navy)]">
                  <span className="text-[var(--dotting-warm-amber)] mt-0.5">✓</span>
                  <span>무료 배송</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" size="lg" className="w-full">
                  시작하기
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-[var(--dotting-muted-gray)] mt-8">
            샘플 책 무료 열람 · 선결제 후 나만의 책 제작
          </p>
        </div>
      </section>

      {/* FAQ - 3개 아코디언 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto reveal">
          <h3 className="text-center text-xl font-semibold font-serif text-[var(--dotting-deep-navy)] mb-10">
            자주 묻는 질문
          </h3>
          <div className="space-y-4">
            {[
              { q: '결제는 언제 하나요?', a: '패키지 선택 후 먼저 결제해주시면, 인터뷰 링크가 생성됩니다. 결제 완료 후 인터뷰를 시작하실 수 있어요. (샘플 책 열람은 무료입니다)' },
              { q: '스마트폰 사용이 익숙하지 않으셔도 괜찮나요?', a: '네, 걱정하지 마세요. 자녀분이 보내드린 링크를 누르기만 하면 바로 대화가 시작됩니다. 복잡한 설치나 가입 없이 카카오톡 하듯이 편하게 이야기하실 수 있습니다.' },
              { q: '내 이야기는 언제까지 보관되나요?', a: '완성된 책(PDF)은 1년간 안전하게 보관되어 언제든 다시 보실 수 있습니다. 단, 인터뷰 녹음 파일은 개인정보 보호를 위해 책 제작 완료 30일 후 자동으로 삭제됩니다.' },
            ].map((faq, idx) => (
              <details key={idx} className="group bg-white rounded-xl border border-[var(--dotting-border)]">
                <summary className="px-6 py-4 cursor-pointer flex items-center justify-between font-medium text-[var(--dotting-deep-navy)] hover:bg-gray-50 rounded-xl">
                  {faq.q}
                  <span className="text-[var(--dotting-warm-amber)] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-6 pb-4 text-sm text-[var(--dotting-muted-gray)] leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-[var(--dotting-muted-gray)]">
            더 궁금하신 점이 있으신가요? <a href="mailto:hello@dotting.kr" className="text-[var(--dotting-warm-amber)] hover:underline">hello@dotting.kr</a>로 문의해주세요.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-28 px-6 bg-[var(--dotting-deep-navy)] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, var(--dotting-warm-amber) 0%, transparent 50%)`,
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10 reveal">
          <div className="flex justify-center gap-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)]" />
            <span className="w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)]/60" />
            <span className="w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)]/30" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-serif text-white mb-8 leading-tight">
            소중한 이야기,<br />지금 시작하세요
          </h2>

          <Link href="/signup">
            <Button variant="celebration" size="xl" className="shadow-2xl px-12">
              지금 시작하기
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#0F1F2E]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="dotting-wordmark dotting-wordmark--md dotting-wordmark--white">
              <span className="dotting-wordmark-d">D</span>
              <span className="dotting-wordmark-otting">OTTING</span>
            </Link>
            <div className="flex gap-6 text-sm text-white/50">
              <Link href="/why" className="hover:text-white transition-colors">도팅 스토리</Link>
              <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
            </div>
          </div>

          <div className="mt-8 pt-8 text-center border-t border-white/10">

            <p className="text-xs text-white/30">© 2026 DOTTING. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
