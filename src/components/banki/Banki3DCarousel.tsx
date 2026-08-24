// src/components/banki/Banki3DCarousel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { BankOffer, BANK_OFFERS } from '../../data/bankiData';

interface Banki3DCarouselProps {
  onSelectOffer: (offer: BankOffer) => void;
}

export const Banki3DCarousel: React.FC<Banki3DCarouselProps> = ({ onSelectOffer }) => {
  // Top showcase hit offers
  const featuredOffers = BANK_OFFERS.slice(0, 10);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const autoRotateRef = useRef<any>(null);

  const total = featuredOffers.length;

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  // Auto rotation when not dragging
  useEffect(() => {
    autoRotateRef.current = setInterval(() => {
      if (!isDragging) {
        nextCard();
      }
    }, 4500);

    return () => clearInterval(autoRotateRef.current);
  }, [isDragging, total]);

  const handlePointerDown = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setDragOffset(0);
    clearInterval(autoRotateRef.current);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - startX;
    setDragOffset(delta);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset > 60) {
      prevCard();
    } else if (dragOffset < -60) {
      nextCard();
    }
    setDragOffset(0);
  };

  return (
    <div className="banki-carousel-stage">
      {/* Visual Ambient Light & Vignette */}
      <div className="stage-ambient-glow" />

      {/* 3D Ring Viewport */}
      <div 
        className="carousel-3d-track"
        onMouseDown={e => handlePointerDown(e.clientX)}
        onMouseMove={e => handlePointerMove(e.clientX)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={e => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={e => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerUp}
      >
        {featuredOffers.map((offer, index) => {
          // Calculate 3D Ring offset
          let offset = index - activeIndex;
          if (offset < -Math.floor(total / 2)) offset += total;
          if (offset > Math.floor(total / 2)) offset -= total;

          const isCurrent = offset === 0;
          const absOffset = Math.abs(offset);

          // Only render visible cards in ring (-3..+3)
          if (absOffset > 3) return null;

          const translateX = offset * 260 + (isDragging ? dragOffset * 0.8 : 0);
          const translateZ = -absOffset * 140;
          const rotateY = -offset * 26;
          const scale = 1 - absOffset * 0.12;
          const opacity = 1 - absOffset * 0.28;
          const blur = absOffset * 3;

          return (
            <div
              key={offer.id}
              className={`bank-card-3d-tile ${isCurrent ? 'active-center' : ''}`}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity: opacity,
                filter: `blur(${blur}px)`,
                borderColor: offer.color || 'var(--accent)',
                boxShadow: isCurrent 
                  ? `0 20px 50px rgba(0,0,0,0.9), 0 0 35px ${offer.color || 'var(--accent)'}44` 
                  : '0 10px 30px rgba(0,0,0,0.8)'
              }}
              onClick={() => {
                if (isCurrent) {
                  onSelectOffer(offer);
                } else {
                  setActiveIndex(index);
                }
              }}
            >
              {/* Card Face */}
              <div className="card-top-row">
                <div className="card-brand-tag" style={{ color: offer.color }}>
                  <span className="brand-dot" style={{ background: offer.color }} />
                  <span>{offer.brand}</span>
                </div>
                <span className="category-pill">{offer.category.toUpperCase()}</span>
              </div>

              <h3 className="card-product-title">{offer.title}</h3>

              {/* Main 2-3 Metric Highlights (Glow Figures) */}
              <div className="card-metrics-grid">
                {offer.params.slice(0, 3).map((p, pIdx) => (
                  <div key={pIdx} className="metric-cell">
                    <span className="m-val" style={{ color: offer.color }}>{p.val}</span>
                    <span className="m-lbl">{p.lbl}</span>
                  </div>
                ))}
              </div>

              {/* Action Trigger */}
              <div className="card-bottom-action">
                <button className="btn-unfold-dossier" style={{ borderColor: offer.color }}>
                  <span>Раскрыть досье продукта</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Chevrons */}
      <div className="carousel-nav-arrows">
        <button className="btn-arrow-prev" onClick={prevCard} aria-label="Предыдущий продукт">
          <ChevronLeft size={22} />
        </button>
        <div className="carousel-dots-indicator">
          {featuredOffers.map((_, i) => (
            <span 
              key={i} 
              className={`dot ${activeIndex === i ? 'active' : ''}`}
              onClick={() => setActiveIndex(i)} 
            />
          ))}
        </div>
        <button className="btn-arrow-next" onClick={nextCard} aria-label="Следующий продукт">
          <ChevronRight size={22} />
        </button>
      </div>

      <style>{`
        .banki-carousel-stage {
          position: relative;
          width: 100%;
          height: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          perspective: 1200px;
          overflow: hidden;
          margin: 30px 0 50px;
          user-select: none;
        }
        .stage-ambient-glow {
          position: absolute;
          width: 500px;
          height: 300px;
          background: radial-gradient(circle at center, rgba(212, 175, 55, 0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }
        .carousel-3d-track {
          position: relative;
          width: 100%;
          height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-style: preserve-3d;
          z-index: 2;
          cursor: grab;
        }
        .carousel-3d-track:active {
          cursor: grabbing;
        }
        .bank-card-3d-tile {
          position: absolute;
          width: clamp(280px, 85vw, 360px);
          height: 320px;
          background: rgba(16, 18, 26, 0.92);
          backdrop-filter: blur(20px);
          border: 2px solid;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease, filter 0.45s ease;
          cursor: pointer;
        }
        .bank-card-3d-tile.active-center {
          z-index: 10;
        }
        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-brand-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .category-pill {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          padding: 2px 8px;
          border-radius: 20px;
          background: rgba(255,255,255,0.06);
          color: var(--text-secondary);
        }
        .card-product-title {
          font-size: clamp(1.2rem, 1.1rem + 0.4vw, 1.45rem);
          line-height: 1.15;
          margin: 8px 0;
          color: #ffffff;
        }
        .card-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 10px;
        }
        .metric-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .m-val {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
        }
        .m-lbl {
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .card-bottom-action {
          display: flex;
        }
        .btn-unfold-dossier {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid;
          border-radius: 8px;
          color: #ffffff;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-unfold-dossier:hover {
          background: rgba(255,255,255,0.1);
        }
        .carousel-nav-arrows {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 20px;
          z-index: 5;
        }
        .btn-arrow-prev, .btn-arrow-next {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-arrow-prev:hover, .btn-arrow-next:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .carousel-dots-indicator {
          display: flex;
          gap: 6px;
        }
        .carousel-dots-indicator .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.2s;
        }
        .carousel-dots-indicator .dot.active {
          background: var(--accent);
          width: 22px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
