'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@supabase/ssr';

export default function WhyPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--dotting-border)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-[var(--dotting-deep-navy)]">
            DOTTING
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

      {/* Main Content - 편집자의 선언문 */}
      <main className="pt-24 pb-20">
        <article className="max-w-2xl mx-auto px-6">
          
          {/* 오프닝 */}
          <header className="text-center mb-16">
            <p className="text-sm tracking-widest text-[var(--dotting-warm-amber)] mb-6">
              WHY DOTTING
            </p>
            <h1 className="dotting-serif text-3xl md:text-4xl text-[var(--dotting-deep-navy)] font-medium leading-tight">
              우리는 흩어진 대화를<br />
              한 권의 책으로 탈고합니다
            </h1>
          </header>

          {/* 문제 - 공감 */}
          <section className="mb-16">
            <div className="border-l-2 border-[var(--dotting-warm-amber)]/30 pl-6 py-2">
              <p className="text-lg text-[var(--dotting-deep-navy)] leading-relaxed mb-4">
                부모님과 나눈 대화는 녹음해도 녹음일 뿐,<br />
                카톡에 남긴 기록은 채팅일 뿐,<br />
                결국 책이 되지 않습니다.
              </p>
              <p className="text-[var(--dotting-muted-gray)]">
                우리는 이 문제를 풀고 싶었습니다.
              </p>
            </div>
          </section>

          {/* 우리의 방식 - 3 Step */}
          <section className="mb-16">
            <h2 className="text-sm tracking-widest text-[var(--dotting-warm-amber)] mb-8 text-center">
              OUR PROCESS
            </h2>
            
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-[var(--dotting-deep-navy)] flex items-center justify-center">
                  <span className="text-[var(--dotting-deep-navy)] font-medium">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--dotting-deep-navy)] mb-1">
                    인터뷰
                  </h3>
                  <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                    AI가 편하게 질문하고, 부모님은 그냥 대답만 하면 됩니다.
                    녹음도, 타이핑도 부담 없이.
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-[var(--dotting-deep-navy)] flex items-center justify-center">
                  <span className="text-[var(--dotting-deep-navy)] font-medium">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--dotting-deep-navy)] mb-1">
                    에피소드
                  </h3>
                  <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                    흩어진 대답을 하나의 이야기로 엮습니다.
                    시간 순서, 감정의 흐름, 챕터로.
                  </p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-[var(--dotting-deep-navy)] flex items-center justify-center">
                  <span className="text-[var(--dotting-deep-navy)] font-medium">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--dotting-deep-navy)] mb-1">
                    탈고
                  </h3>
                  <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                    좋은 책은 덧붙이는 게 아니라 덜어내는 것.
                    군더더기 없이 깔끔하게 마무리합니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 철학 - 3 카드 */}
          <section className="mb-16">
            <h2 className="text-sm tracking-widest text-[var(--dotting-warm-amber)] mb-8 text-center">
              WHAT WE BELIEVE
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 text-center border border-[var(--dotting-border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--dotting-soft-cream)] flex items-center justify-center mx-auto mb-4">
                  <span className="text-[var(--dotting-warm-amber)]">●</span>
                </div>
                <h3 className="font-semibold text-[var(--dotting-deep-navy)] mb-2">
                  따뜻한 편집실
                </h3>
                <p className="text-sm text-[var(--dotting-muted-gray)]">
                  전문적이지만 부담 없는,<br />
                  편집자 같은 대화
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 text-center border border-[var(--dotting-border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--dotting-soft-cream)] flex items-center justify-center mx-auto mb-4">
                  <span className="text-[var(--dotting-warm-amber)]">●</span>
                </div>
                <h3 className="font-semibold text-[var(--dotting-deep-navy)] mb-2">
                  조용한 럭셔리
                </h3>
                <p className="text-sm text-[var(--dotting-muted-gray)]">
                  과하지 않게, 절제된 아름다움
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 text-center border border-[var(--dotting-border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--dotting-soft-cream)] flex items-center justify-center mx-auto mb-4">
                  <span className="text-[var(--dotting-warm-amber)]">●</span>
                </div>
                <h3 className="font-semibold text-[var(--dotting-deep-navy)] mb-2">
                  책의 질감
                </h3>
                <p className="text-sm text-[var(--dotting-muted-gray)]">
                  디지털이지만<br />
                  종이책처럼 읽히는 경험
                </p>
              </div>
            </div>
          </section>

          {/* 신뢰 */}
          <section className="mb-16">
            <h2 className="text-sm tracking-widest text-[var(--dotting-warm-amber)] mb-8 text-center">
              TRUST
            </h2>
            
            <div className="bg-white rounded-xl p-6 border border-[var(--dotting-border)]">
              <ul className="space-y-4 text-[var(--dotting-muted-gray)]">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--dotting-ocean-teal)] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>모든 데이터는 암호화되어 저장됩니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--dotting-ocean-teal)] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>완성된 책은 오직 당신의 것입니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--dotting-ocean-teal)] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>원하시면 언제든 데이터를 삭제할 수 있습니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--dotting-ocean-teal)] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>공유 링크는 받는 분만 볼 수 있습니다</span>
                </li>
              </ul>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <div className="flex justify-center gap-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)]" />
              <span className="w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)]" />
              <span className="w-2 h-2 rounded-full bg-[var(--dotting-warm-amber)]" />
            </div>
            
            <p className="text-[var(--dotting-muted-gray)] mb-6">
              모든 이야기는 계속된다
            </p>
            
            <Link href="/signup">
              <Button size="xl">
                지금 시작하기
              </Button>
            </Link>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--dotting-border)]">
        <div className="max-w-3xl mx-auto text-center">
          <Link href="/" className="text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)]">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </footer>
    </div>
  );
}
