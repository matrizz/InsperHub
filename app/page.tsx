import type { Metadata } from "next";
import Image from "next/image";
import { Fraunces, Inter } from "next/font/google";

const fraunces = Fraunces({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
    variable: "--font-display",
});

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-body",
});

export const metadata: Metadata = {
    title: "Vesper — companheiro de referência para artistas",
    description:
        "Vesper reúne ficha de personagem, busca de referências, IA com visão e um moodboard num só lugar, pra você parar de caçar inspiração espalhada por dez abas.",
};

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <div className="group relative border border-[#2B2E4A]/15 bg-[#FBF8F3] p-7 transition hover:border-[#2B2E4A]/30">
            <div className="mb-5 text-[#2B2E4A]">{icon}</div>
            <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[#171B3D]">{title}</h3>
            <p className="font-[family-name:var(--font-body)] text-sm leading-relaxed text-[#2B2E4A]/70">
                {description}
            </p>
        </div>
    );
}

function IconChecklist() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="5" y="3" width="18" height="22" rx="1" />
            <path d="M9 9h10M9 13.5h10M9 18h6" strokeLinecap="round" />
            <path d="M9 9l-1.5 1.5L6 9" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
        </svg>
    );
}

function IconChat() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h15A2.5 2.5 0 0 1 24 6.5v10A2.5 2.5 0 0 1 21.5 19H12l-5 5v-5H6.5A2.5 2.5 0 0 1 4 16.5v-10Z" strokeLinejoin="round" />
            <path d="M19.5 8.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" strokeLinejoin="round" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="12" cy="12" r="8" />
            <path d="M18 18l6 6" strokeLinecap="round" />
            <path d="M12 8.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z" strokeLinejoin="round" />
        </svg>
    );
}

function IconBoard() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3.5" y="5" width="21" height="18" rx="1" />
            <rect x="7" y="8.5" width="7" height="6" />
            <rect x="16" y="8.5" width="5" height="4" />
            <rect x="7" y="16.5" width="5" height="4" />
            <rect x="14" y="14.5" width="7" height="6" />
        </svg>
    );
}

function RingDivider() {
    return (
        <div className="relative mx-auto h-16 w-16">
            <svg viewBox="0 0 64 64" fill="none" stroke="#2B2E4A" strokeWidth="1">
                <circle cx="32" cy="32" r="30" opacity="0.35" />
                <path d="M32 4v6M32 54v6M4 32h6M54 32h6" strokeLinecap="round" opacity="0.5" />
            </svg>
        </div>
    );
}

export default function LandingPage() {
    return (
        <div
            className={`${fraunces.variable} ${inter.variable} min-h-screen bg-[#F6EFE6] font-[family-name:var(--font-body)] text-[#171B3D]`}
        >
            <style>{`
        @keyframes vesper-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes vesper-twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
        .vesper-rise {
          animation: vesper-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .vesper-rise { animation: none; }
          .vesper-star { animation: none !important; }
        }
      `}</style>

            <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
                <div className="flex items-center gap-2.5">
                    <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
                    <span className="font-[family-name:var(--font-display)] text-lg tracking-wide">Vesper</span>
                </div>
                <a
                    href="#comecar"
                    className="border border-[#171B3D] px-4 py-2 text-sm tracking-wide transition hover:bg-[#171B3D] hover:text-[#F2E9DD]"
                >
                    Entrar
                </a>
            </header>

            <section className="relative overflow-hidden px-6 pb-24 pt-10 sm:pb-32 sm:pt-16">
                <svg
                    className="pointer-events-none absolute left-1/2 top-0 -z-0 hidden -translate-x-1/2 sm:block"
                    width="1100"
                    height="1100"
                    viewBox="0 0 1100 1100"
                    fill="none"
                >
                    <circle cx="550" cy="380" r="520" stroke="#2B2E4A" strokeWidth="1" opacity="0.15" />
                    <circle cx="550" cy="380" r="430" stroke="#2B2E4A" strokeWidth="1" opacity="0.1" />
                </svg>

                <div className="relative mx-auto max-w-2xl text-center">
                    <div className="vesper-rise mx-auto mb-8 h-40 w-40 sm:h-48 sm:w-48">
                        <Image
                            src="/logo.png"
                            alt="Vesper, raposa branca sentada sob um céu estrelado dentro de um anel de constelação"
                            width={400}
                            height={400}
                            priority
                            className="h-full w-full object-contain"
                        />
                    </div>

                    <p
                        className="vesper-rise mb-4 text-xs uppercase tracking-[0.3em] text-[#2B2E4A]/60"
                        style={{ animationDelay: "0.1s" }}
                    >
                        Companheira de referência
                    </p>

                    <h1
                        className="vesper-rise font-[family-name:var(--font-display)] text-4xl leading-[1.15] sm:text-5xl"
                        style={{ animationDelay: "0.2s" }}
                    >
                        Você já sabe quem é seu personagem.
                        <br />
                        <em className="italic text-[#2B2E4A]">Vesper ajuda a enxergar como ele é.</em>
                    </h1>

                    <p
                        className="vesper-rise mx-auto mt-6 max-w-md text-base leading-relaxed text-[#2B2E4A]/75"
                        style={{ animationDelay: "0.3s" }}
                    >
                        O tema, a personalidade, a pose — isso você já tem na cabeça. O que falta é a paleta certa,
                        a roupa que combina, a referência que você não sabia que precisava. Vesper busca, conversa
                        e organiza tudo isso num único quadro.
                    </p>

                    <div
                        className="vesper-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                        style={{ animationDelay: "0.4s" }}
                    >
                        <a
                            id="comecar"
                            href="/mainboard"
                            className="bg-[#171B3D] px-7 py-3 text-sm tracking-wide text-[#F2E9DD] transition hover:bg-[#2B2E4A]"
                        >
                            Começar a criar
                        </a>
                        <a
                            href="#como-funciona"
                            className="px-7 py-3 text-sm tracking-wide text-[#2B2E4A] underline decoration-[#2B2E4A]/30 underline-offset-4 transition hover:decoration-[#2B2E4A]"
                        >
                            Ver como funciona
                        </a>
                    </div>
                </div>
            </section>

            <section className="border-y border-[#2B2E4A]/10 bg-[#171B3D] px-6 py-20 text-[#F2E9DD]">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="font-[family-name:var(--font-display)] text-2xl italic leading-relaxed sm:text-3xl">
                        &ldquo;Não consigo achar uma roupa que combine com o tema. Uma paleta legal. Um penteado
                        que faça sentido.&rdquo;
                    </p>
                    <p className="mt-6 text-sm uppercase tracking-[0.25em] text-[#F2E9DD]/50">
                        Todo artista já pensou isso, dez abas depois
                    </p>
                </div>
            </section>

            <section className="px-6 py-24">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-14 text-center">
                        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#2B2E4A]/60">O que tem no quadro</p>
                        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
                            Quatro ferramentas, um lugar só
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FeatureCard
                            icon={<IconChecklist />}
                            title="Ficha do personagem"
                            description="Nome, idade, personalidade, estilo — o contexto que alimenta tudo o resto. Preencha uma vez, use em toda busca e conversa."
                        />
                        <FeatureCard
                            icon={<IconChat />}
                            title="Chat com visão"
                            description="Pergunta sobre paletas, roupas e acessórios, manda uma imagem de referência e recebe sugestões que já consideram seu personagem."
                        />
                        <FeatureCard
                            icon={<IconSearch />}
                            title="Busca de referências"
                            description="Ilustração e fan art de verdade, não banco de foto genérico. A IA sugere as palavras-chave certas a partir da sua ficha."
                        />
                        <FeatureCard
                            icon={<IconBoard />}
                            title="Moodboard livre"
                            description="Arraste imagens de qualquer lugar — da busca, de outro site, do computador — e monte o quadro do seu jeito."
                        />
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="border-t border-[#2B2E4A]/10 bg-[#FBF8F3] px-6 py-24">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-16 text-center">
                        <RingDivider />
                        <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
                            Como a Vesper guia você
                        </h2>
                    </div>

                    <ol className="space-y-14">
                        <li className="flex gap-6 sm:gap-10">
                            <span className="shrink-0 font-[family-name:var(--font-display)] text-3xl italic text-[#2B2E4A]/40">
                                I
                            </span>
                            <div>
                                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl">Descreva seu personagem</h3>
                                <p className="max-w-md text-sm leading-relaxed text-[#2B2E4A]/70">
                                    Preencha a ficha com o que você já sabe. Não precisa ser tudo — dá pra completar
                                    aos poucos, conforme as ideias chegam.
                                </p>
                            </div>
                        </li>
                        <li className="flex gap-6 sm:gap-10">
                            <span className="shrink-0 font-[family-name:var(--font-display)] text-3xl italic text-[#2B2E4A]/40">
                                II
                            </span>
                            <div>
                                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl">Busque e converse</h3>
                                <p className="max-w-md text-sm leading-relaxed text-[#2B2E4A]/70">
                                    Puxe referências reais ou pergunte direto pra IA. As duas já sabem quem é seu
                                    personagem, então as sugestões vêm no contexto certo.
                                </p>
                            </div>
                        </li>
                        <li className="flex gap-6 sm:gap-10">
                            <span className="shrink-0 font-[family-name:var(--font-display)] text-3xl italic text-[#2B2E4A]/40">
                                III
                            </span>
                            <div>
                                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl">Monte o quadro</h3>
                                <p className="max-w-md text-sm leading-relaxed text-[#2B2E4A]/70">
                                    Arraste o que ficou bom pro moodboard. Ele guarda tudo, do jeito que você deixou,
                                    pra quando voltar a desenhar.
                                </p>
                            </div>
                        </li>
                    </ol>
                </div>
            </section>

            <section className="relative overflow-hidden px-6 py-28 text-center">
                <svg
                    className="pointer-events-none absolute left-1/2 top-1/2 -z-0 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
                    width="700"
                    height="700"
                    viewBox="0 0 700 700"
                    fill="none"
                >
                    <circle cx="350" cy="350" r="330" stroke="#2B2E4A" strokeWidth="1" opacity="0.12" />
                </svg>

                <div className="relative mx-auto max-w-lg">
                    <h2 className="font-[family-name:var(--font-display)] text-3xl italic sm:text-4xl">
                        Sua próxima referência está a um clique.
                    </h2>
                    <a
                        href="#"
                        className="mt-8 inline-block bg-[#171B3D] px-8 py-3.5 text-sm tracking-wide text-[#F2E9DD] transition hover:bg-[#2B2E4A]"
                    >
                        Começar de graça
                    </a>
                </div>
            </section>

            <footer className="border-t border-[#2B2E4A]/10 px-6 py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-[#2B2E4A]/50 sm:flex-row">
                    <span>© {new Date().getFullYear()} Vesper</span>
                    <span>Feito pra quem já teve dez abas abertas procurando referência</span>
                </div>
            </footer>
        </div>
    );
}