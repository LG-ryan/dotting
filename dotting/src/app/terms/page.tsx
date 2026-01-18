'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
                        <Link href="/">
                            <Button variant="ghost" size="sm">홈</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="pt-28 pb-20 px-6">
                <article className="max-w-3xl mx-auto">
                    <header className="mb-12">
                        <p className="text-sm font-medium tracking-widest text-[var(--dotting-warm-amber)] mb-4">
                            TERMS OF SERVICE
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold text-[var(--dotting-deep-navy)] mb-4">
                            이용약관
                        </h1>
                        <p className="text-[var(--dotting-muted-gray)]">
                            최종 수정일: 2026년 1월 12일
                        </p>
                    </header>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">제1조 (목적)</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                                이 약관은 DOTTING(이하 "회사")이 제공하는 인생책 제작 서비스(이하 "서비스")의 이용과 관련하여
                                회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">제2조 (정의)</h2>
                            <ul className="list-disc pl-6 text-[var(--dotting-muted-gray)] space-y-2">
                                <li>"서비스"란 회사가 제공하는 인터뷰 기반 책 제작 서비스를 의미합니다.</li>
                                <li>"이용자"란 이 약관에 따라 서비스를 이용하는 회원을 의미합니다.</li>
                                <li>"콘텐츠"란 이용자가 서비스를 통해 생성한 인터뷰 내용, 텍스트, 이미지 등을 의미합니다.</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">제3조 (서비스의 제공)</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed mb-4">
                                회사는 다음과 같은 서비스를 제공합니다:
                            </p>
                            <ul className="list-disc pl-6 text-[var(--dotting-muted-gray)] space-y-2">
                                <li>인터뷰 기반 이야기 수집 서비스</li>
                                <li>이야기 편집 및 책 제작 서비스</li>
                                <li>PDF 및 실물 책 제공 서비스</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">제4조 (결제 및 환불)</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                                서비스 이용 요금은 PDF 확정 시 결제됩니다. 실물 책은 PDF 확정 후 별도 주문하실 수 있습니다.
                                환불 정책은 서비스 진행 상황에 따라 달라질 수 있으며, 자세한 내용은 고객센터로 문의해 주시기 바랍니다.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">제5조 (저작권)</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                                이용자가 제공한 콘텐츠의 저작권은 이용자에게 귀속됩니다.
                                회사는 서비스 제공 목적으로만 해당 콘텐츠를 이용하며, 이용자의 동의 없이 제3자에게 제공하지 않습니다.
                            </p>
                        </section>
                    </div>

                    <div className="mt-16 pt-8 border-t border-[var(--dotting-border)]">
                        <Link href="/" className="text-[var(--dotting-warm-amber)] hover:underline">
                            ← 홈으로 돌아가기
                        </Link>
                    </div>
                </article>
            </main>

            {/* Footer */}
            <footer className="py-8 px-6 bg-[#0F1F2E]">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-sm text-white/40">© 2026 DOTTING. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
