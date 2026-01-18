'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
                            PRIVACY POLICY
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold text-[var(--dotting-deep-navy)] mb-4">
                            개인정보처리방침
                        </h1>
                        <p className="text-[var(--dotting-muted-gray)]">
                            최종 수정일: 2026년 1월 12일
                        </p>
                    </header>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">1. 수집하는 개인정보</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed mb-4">
                                DOTTING은 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:
                            </p>
                            <ul className="list-disc pl-6 text-[var(--dotting-muted-gray)] space-y-2">
                                <li>필수: 이메일 주소, 이름</li>
                                <li>선택: 전화번호, 배송지 주소 (실물 책 주문 시)</li>
                                <li>서비스 이용 기록: 인터뷰 내용, 생성된 콘텐츠</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">2. 개인정보의 이용 목적</h2>
                            <ul className="list-disc pl-6 text-[var(--dotting-muted-gray)] space-y-2">
                                <li>서비스 제공 및 운영</li>
                                <li>책 제작 및 배송</li>
                                <li>고객 문의 응대</li>
                                <li>서비스 개선 및 신규 서비스 개발</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">3. 개인정보의 보관 및 파기</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                                프로젝트 완료 후 30일이 지나면 관련 데이터는 자동으로 삭제됩니다.
                                이용자는 언제든지 즉시 삭제를 요청할 수 있습니다.
                                단, 법령에 따라 보관이 필요한 정보는 해당 기간 동안 보관됩니다.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">4. 개인정보의 안전성 확보</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                                모든 개인정보는 암호화되어 저장됩니다.
                                회사는 개인정보 보호를 위해 기술적, 관리적 보호조치를 취하고 있습니다.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">5. 이용자의 권리</h2>
                            <ul className="list-disc pl-6 text-[var(--dotting-muted-gray)] space-y-2">
                                <li>개인정보 열람 요청</li>
                                <li>개인정보 정정 요청</li>
                                <li>개인정보 삭제 요청</li>
                                <li>개인정보 처리 정지 요청</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-semibold text-[var(--dotting-deep-navy)] mb-4">6. 문의처</h2>
                            <p className="text-[var(--dotting-muted-gray)] leading-relaxed">
                                개인정보 관련 문의: <a href="mailto:hello@dotting.kr" className="text-[var(--dotting-warm-amber)] hover:underline">hello@dotting.kr</a>
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
