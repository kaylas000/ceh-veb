// src/co/BankiApp.tsx
import React, { useState, useEffect } from "react";
import { BankOffer, BANK_OFFERS, BANK_CATEGORIES } from "../data/bankiData";
import { Banki3DCarousel } from "../components/banki/Banki3DCarousel";
import { CardUnfoldDossier } from "../components/banki/CardUnfoldDossier";
import { FinancialCalculators } from "../components/banki/FinancialCalculators";
import { FinancialCatalog } from "../components/banki/FinancialCatalog";
import { ArrowLeft, Sparkles, ShieldCheck, Zap, Download } from "lucide-react";

export default function BankiApp() {
  const [selectedOffer, setSelectedOffer] = useState<BankOffer | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen bg-[#07080c] text-[#f4f4f8] font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* Top Brand Bar */}
      <header className="sticky top-0 z-50 border-b border-[#d4af37]/20 bg-[#07080c]/90 backdrop-blur-xl px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="#/"
              className="inline-flex items-center gap-2 rounded border border-[#d4af37]/30 bg-[#0f1118] px-3 py-1.5 font-mono text-xs text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#d4af37]/10"
            >
              <ArrowLeft size={14} />
              <span>← В ЦЕХ</span>
            </a>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-[#d4af37]">PRJ-02 // БОЕВОЙ ПРОЕКТ</span>
              <h1 className="font-bold text-base sm:text-lg tracking-wider text-white">ВСЕ-БАНКИ · ФИНАНСОВЫЙ БУТИК</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-0.5 font-mono text-[10px] text-green-400">
              ✓ ПРИНЯТ G4 · EXIT 0
            </span>
            <a
              href="#calculators"
              className="rounded bg-[#d4af37] px-4 py-1.5 font-mono text-xs font-bold text-black transition hover:bg-[#f3e5ab]"
            >
              Калькулятор
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero Section with Video Background & Poster */}
        <section className="relative overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#12141e] to-[#08090d] p-6 sm:p-12 shadow-2xl">
          <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-screen">
            <video
              src="./hero-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1 font-mono text-xs text-[#d4af37]">
              <Sparkles size={13} />
              <span>ПРЕМИАЛЬНЫЙ ФИНАНСОВЫЙ БУТИК НОЧЬЮ</span>
            </div>

            <h2 className="mt-4 font-bold text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight text-white">
              ВИТРИНА ВЫГОДНЫХ <br />
              <span className="text-[#d4af37] drop-shadow-[0_0_25px_rgba(212,175,55,0.35)]">БАНКОВСКИХ СТАВОК</span>
            </h2>

            <p className="mt-4 text-base sm:text-lg text-gray-300 leading-relaxed">
              52 проверенных банковских продукта: дебетовые карты с кешбэком до 15%, вклады до 20% годовых, 
              займы 0% без переплат и кредиты с онлайн-одобрением за 2 минуты.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="#3d-boutique"
                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 font-mono text-sm font-bold text-black transition hover:bg-[#f3e5ab] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                <span>3D Витрина хитов</span>
                <Zap size={16} />
              </a>
              <a
                href="#catalog"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-mono text-sm text-white transition hover:border-[#d4af37] hover:text-[#d4af37]"
              >
                <span>Весь каталог (52)</span>
              </a>
            </div>
          </div>
        </section>

        {/* 3D Boutique Carousel */}
        <section id="3d-boutique" className="mt-12 sm:mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d4af37]/20 pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#d4af37]">3D Ring Boutique</p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Кольцевая 3D-витрина хитов</h3>
            </div>
            <p className="font-mono text-xs text-gray-400">Кликните по карте, чтобы раскрыть 3D-досье</p>
          </div>

          <Banki3DCarousel onSelectOffer={(offer) => setSelectedOffer(offer)} />
        </section>

        {/* Financial Calculators */}
        <div className="mt-12 sm:mt-16">
          <FinancialCalculators onOpenOrder={() => {}} />
        </div>

        {/* Full Financial Catalog */}
        <div className="mt-12 sm:mt-16">
          <FinancialCatalog onSelectOffer={(offer) => setSelectedOffer(offer)} />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 bg-[#050609] px-4 py-8 text-center font-mono text-xs text-gray-500">
        <p>© 2026 ВСЕ-БАНКИ · Финансовая витрина. Собрано в студии ЦЕХ по стандартам Zero-Slop.</p>
      </footer>

      {/* 3D Dossier Modal */}
      <CardUnfoldDossier offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
    </div>
  );
}
