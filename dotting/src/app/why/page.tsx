'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export default function StoryPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [checkingAuth, setCheckingAuth] = useState(true);

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
              <Button variant="ghost" size="sm" className="text-[var(--dotting-warm-amber)]">도팅 스토리</Button>
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

      {/* Hero - Brand Philosophy */}
      <section className="pt-32 pb-20 lg:pb-28 px-6 min-h-[70vh] flex items-center justify-center text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto animate-fade-in-up relative z-10 py-10">
          <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-8">
            OUR PHILOSOPHY
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold font-serif leading-[1.2] mb-10 text-[var(--dotting-deep-navy)]">
            당신의 삶에 찍힌<br />
            수많은 점들을 잇습니다
          </h1>
          <p className="text-lg md:text-xl text-[var(--dotting-muted-gray)] leading-relaxed max-w-2xl mx-auto">
            도팅(Dotting)은 흩어진 기억의 점들을 이어<br />
            하나의 아름다운 선으로 완성합니다.<br />
            <br />
            당신의 이야기가 마침표로 끝나지 않고,<br />
            영원히 이어지는 감동이 되도록 합니다.
          </p>
        </div>
      </section>

      {/* Philosophy Detail */}
      <section className="py-24 px-6 bg-white border-y border-[var(--dotting-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center reveal">
            <div className="relative pl-8 border-l-2 border-[var(--dotting-warm-amber)]/30">
              <h2 className="text-3xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-6">
                기억은 점이고,<br />
                이야기는 선입니다
              </h2>
              <p className="text-[var(--dotting-muted-gray)] leading-relaxed text-lg mb-8">
                우리는 살아가며 수많은 순간을 마주합니다.<br />
                하지만 기록되지 않은 순간은 시간이 지나면<br />
                희미해지는 점으로 남을 뿐입니다.<br />
                <br />
                도팅은 그 점들을 연결하여<br />
                세상에 단 하나뿐인 유산으로 남깁니다.
              </p>
            </div>
            {/* Visual: Subtle Line Art */}
            <div className="relative h-64 md:h-80 flex items-center justify-center bg-[var(--dotting-soft-cream)] rounded-2xl overflow-hidden">
              <div className="w-full h-px bg-[var(--dotting-warm-amber)]/30 relative">
                <div className="absolute top-1/2 left-[20%] w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)] -translate-y-1/2" />
                <div className="absolute top-1/2 left-[50%] w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)] -translate-y-1/2" />
                <div className="absolute top-1/2 left-[80%] w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)] -translate-y-1/2" />
              </div>
              <p className="absolute bottom-6 text-xs tracking-widest text-[var(--dotting-muted-gray)]">CONNECTING MOMENTS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology (How we do it) */}
      <section className="py-24 lg:py-28 px-6 bg-[var(--dotting-soft-cream)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 reveal">
            <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
              METHODOLOGY
            </p>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-6">
              가장 깊은 이야기를<br />꺼내는 방법
            </h2>
            <p className="text-[var(--dotting-muted-gray)] max-w-md mx-auto leading-relaxed break-keep">
              단순한 질문이 아닙니다.<br />
              심리학 기반의 대화 설계로 잊고 있던 기억까지 찾아드립니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 reveal">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--dotting-border)]">
              <h3 className="text-xl font-serif font-bold text-[var(--dotting-deep-navy)] mb-4">심리학 기반 대화 설계</h3>
              <p className="text-[var(--dotting-muted-gray)] leading-relaxed text-sm break-keep">
                단순한 사실 나열이 아닌, 그 당시의 감정과 의미를 재발견하도록 돕는 전문적인 대화 모델을 사용합니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--dotting-border)]">
              <h3 className="text-xl font-serif font-bold text-[var(--dotting-deep-navy)] mb-4">맞춤형 페르소나</h3>
              <p className="text-[var(--dotting-muted-gray)] leading-relaxed text-sm break-keep">
                당신의 성향에 맞춰 대화가 자연스럽게 흘러갑니다.
                오랜 친구처럼, 때로는 손자/손녀처럼 편안하게 다가갑니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--dotting-border)]">
              <h3 className="text-xl font-serif font-bold text-[var(--dotting-deep-navy)] mb-4">맥락적 탐구</h3>
              <p className="text-[var(--dotting-muted-gray)] leading-relaxed text-sm break-keep">
                "그때 기분이 어떠셨어요?", "그 말씀은 어떤 의미인가요?"
                꼬리에 꼬리를 무는 질문으로 이야기의 깊이를 더합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Process (Standard Plan) */}
      <section className="py-24 lg:py-28 px-6 bg-white border-y border-[var(--dotting-border)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 reveal">
            <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
              PROCESS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-6">
              이렇게 진행됩니다
            </h2>
            <p className="text-[var(--dotting-muted-gray)] max-w-md mx-auto leading-relaxed break-keep">
              도팅 스탠다드 플랜 기준 진행 과정입니다.<br />
              복잡한 과정은 저희가 맡을게요. 편안하게 추억만 떠올리세요.
            </p>
          </div>

          <div className="relative reveal">
            {/* Vertical Line */}
            <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-[var(--dotting-border)] -translate-x-1/2" />

            <div className="space-y-20">
              {[
                {
                  step: '01',
                  title: '결제 및 설정',
                  desc: <>스탠다드 플랜 결제 후, 인터뷰 대상자(부모님, 본인 등)를 설정합니다.<br className="hidden md:block" />설정이 완료되면 대화를 시작할 수 있는 전용 링크가 생성됩니다.</>,
                },
                {
                  step: '02',
                  title: '이야기 나누기',
                  desc: <>전용 링크로 도팅과 대화를 시작합니다. 정해진 시간은 없습니다.<br className="hidden md:block" />편안한 장소와 시간에 카카오톡 하듯 이야기를 들려주세요.</>,
                },
                {
                  step: '03',
                  title: '이야기 완성',
                  desc: <>대화가 끝나면 흩어진 기억이 <strong>하나의 이야기</strong>로 완성됩니다.<br className="hidden md:block" />보내주신 사진과 함께 편집된 시안을 인쇄 전 미리 확인하실 수 있습니다.</>,
                },
                {
                  step: '04',
                  title: '제작 및 배송',
                  desc: <>확정된 시안으로 최고급 하드커버 양장본을 제작합니다.<br className="hidden md:block" />세상에 단 하나뿐인 당신의 이야기가 댁으로 안전하게 배송됩니다.</>,
                },
              ].map((item, index) => (
                <div key={index} className={`relative flex flex-col md:flex-row gap-8 md:gap-0 items-start md:items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  {/* Content */}
                  <div className={`flex-1 md:w-1/2 pl-20 md:pl-0 text-left ${index % 2 === 0 ? 'md:pl-24 md:text-left' : 'md:pr-24 md:text-right'}`}>
                    <div className={`flex flex-col ${index % 2 === 0 ? 'items-start' : 'items-start md:items-end'}`}>
                      <span className="inline-block px-3 py-1 rounded-full bg-[var(--dotting-soft-cream)] text-[var(--dotting-warm-amber)] text-xs font-bold mb-3 border border-[var(--dotting-warm-amber)]/20">
                        STEP {item.step}
                      </span>
                      <h3 className="text-xl font-bold text-[var(--dotting-deep-navy)] mb-3 break-keep">{item.title}</h3>
                      <p className="text-[var(--dotting-muted-gray)] text-sm leading-relaxed whitespace-pre-wrap break-keep">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-[28px] md:left-1/2 w-4 h-4 rounded-full bg-white border-4 border-[var(--dotting-warm-amber)] -translate-x-1/2 z-10 shadow-sm" />

                  {/* Empty Space for Layout Balance */}
                  <div className="hidden md:block flex-1 md:w-1/2" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-[var(--dotting-muted-gray)]/60 mt-20">
            * 위 과정은 스탠다드 플랜 기준이며, 상품에 따라 세부 과정이 달라질 수 있습니다.
          </p>
        </div>
      </section>

      {/* Trust & Stats */}
      <section className="py-24 lg:py-28 px-6 bg-[var(--dotting-warm-gray)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
              OUR PROMISE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-12">
              우리의 약속
            </h2>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--dotting-border)]">
                <p className="text-3xl font-bold text-[var(--dotting-warm-amber)] mb-1">120+</p>
                <p className="text-sm text-[var(--dotting-deep-navy)] font-medium">완성된 이야기</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--dotting-border)]">
                <p className="text-3xl font-bold text-[var(--dotting-warm-amber)] mb-1">50h+</p>
                <p className="text-sm text-[var(--dotting-deep-navy)] font-medium">평균 인터뷰 시간</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--dotting-border)]">
                <p className="text-3xl font-bold text-[var(--dotting-warm-amber)] mb-1">4.9</p>
                <p className="text-sm text-[var(--dotting-deep-navy)] font-medium">고객 만족도</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 reveal">
              {[
                { title: '철저한 보안', desc: '소중한 이야기는 암호화되어 안전하게 보관됩니다', icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
                { title: '직접 수정', desc: '인쇄 전 검토 및 수정 가능', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125' },
                { title: '끝까지 책임', desc: '제작부터 배송까지', icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z' }
              ].map((item, index) => (
                <div key={index} className="text-center p-6 bg-white rounded-2xl border border-[var(--dotting-border)]">
                  <div className="w-12 h-12 rounded-full bg-[var(--dotting-soft-cream)] flex items-center justify-center mx-auto mb-4 text-[var(--dotting-warm-amber)]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2 text-[var(--dotting-deep-navy)]">{item.title}</h3>
                  <p className="text-sm text-[var(--dotting-muted-gray)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
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
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-serif text-white mb-8 leading-tight">
            당신의 이야기도<br />
            계속되어야 합니다
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
