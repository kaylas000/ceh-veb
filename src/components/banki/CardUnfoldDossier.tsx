// src/components/banki/CardUnfoldDossier.tsx
import React, { useState } from 'react';
import { X, Check, ShieldCheck, Sparkles, ArrowRight, ExternalLink, Zap } from 'lucide-react';
import { BankOffer } from '../../data/bankiData';
import confetti from 'canvas-confetti';
import { soundEngine } from '../../audio/WebAudioEngine';

interface CardUnfoldProps {
  offer: BankOffer | null;
  onClose: () => void;
}

export const CardUnfoldDossier: React.FC<CardUnfoldProps> = ({ offer, onClose }) => {
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [isApplied, setIsApplied] = useState(false);

  if (!offer) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: x * 12, y: -y * 12 });
  };

  const handleApply = () => {
    soundEngine.playCinematicImpact();
    setIsApplied(true);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="dossier-modal-overlay" onClick={onClose}>
      <div 
        className="dossier-3d-stage"
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMouseTilt({ x: 0, y: 0 })}
        style={{
          transform: `rotateY(${mouseTilt.x}deg) rotateX(${mouseTilt.y}deg)`
        }}
      >
        <button className="btn-close-dossier" onClick={onClose}>✕</button>

        {isApplied ? (
          <div className="applied-success-card">
            <div className="success-badge">✓</div>
            <h3>Заявка успешно отправлена в {offer.brand}!</h3>
            <p>Менеджер банка свяжется с вами в течение 5 минут для подтверждения условий.</p>
            <div className="offer-summary-pill" style={{ borderColor: offer.color }}>
              Продукт: <strong>{offer.title}</strong> ({offer.brand})
            </div>
            <button className="btn-studio-primary" onClick={onClose} style={{ marginTop: '20px' }}>
              Вернуться к витрине
            </button>
          </div>
        ) : (
          <div className="dossier-layers-wrapper" style={{ borderColor: offer.color }}>
            {/* Layer 1: Front Header Brand Plate */}
            <div className="layer-front-plate">
              <div className="dossier-top-bar">
                <div className="dossier-brand-title" style={{ color: offer.color }}>
                  <span className="brand-dot-pulse" style={{ background: offer.color }} />
                  <span>{offer.brand}</span>
                </div>
                <span className="dossier-badge-hit">ОФИЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ</span>
              </div>

              <h2 className="dossier-product-name">{offer.title}</h2>
              <p className="dossier-full-name">{offer.name}</p>

              {/* Highlight Parameters Grid */}
              <div className="dossier-params-columns">
                {offer.params.map((p, idx) => (
                  <div key={idx} className="param-column-box">
                    <span className="p-val" style={{ color: offer.color }}>{p.val}</span>
                    <span className="p-lbl">{p.lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer 2: Middle Conditions Sheet */}
            <div className="layer-middle-sheet">
              <h4>📋 Условия и преимущества продукта</h4>
              <ul className="conditions-checklist">
                {offer.conditions.map((c, i) => (
                  <li key={i}>
                    <Check size={15} color="#00ff88" style={{ flexShrink: 0 }} />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Layer 3: Back Requirements & Pulsing Action CTA */}
            <div className="layer-back-action">
              <div className="docs-note">
                <strong>Требуемые документы:</strong>
                <p>{offer.documents.join(' • ')}</p>
              </div>

              <div className="dossier-cta-row">
                <button 
                  className="btn-apply-pulsing"
                  style={{ background: offer.color || 'var(--accent)' }}
                  onClick={handleApply}
                >
                  <Zap size={18} />
                  <span>Оформить онлайн с решением за 2 мин</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dossier-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(25px);
          z-index: 1000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(14px, 3vw, 30px);
          perspective: 1200px;
        }
        .dossier-3d-stage {
          position: relative;
          max-width: 720px;
          width: 100%;
          transition: transform 0.15s ease-out;
          transform-style: preserve-3d;
        }
        .btn-close-dossier {
          position: absolute;
          top: -45px;
          right: 0;
          color: #ffffff;
          font-size: 24px;
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dossier-layers-wrapper {
          background: rgba(14, 16, 22, 0.96);
          border: 2px solid;
          border-radius: 20px;
          padding: clamp(20px, 4vw, 36px);
          box-shadow: 0 35px 80px rgba(0, 0, 0, 0.95);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .dossier-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .dossier-brand-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 0.9rem;
          text-transform: uppercase;
        }
        .brand-dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dossier-badge-hit {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 3px 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .dossier-product-name {
          font-size: clamp(1.4rem, 2.5vw, 2rem);
          line-height: 1.1;
          margin-bottom: 4px;
          color: #ffffff;
        }
        .dossier-full-name {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 18px;
        }
        .dossier-params-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
        }
        .param-column-box {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
        }
        .param-column-box .p-val {
          display: block;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
        }
        .param-column-box .p-lbl {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .layer-middle-sheet {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 18px;
        }
        .layer-middle-sheet h4 {
          font-size: 0.9rem;
          margin-bottom: 12px;
          color: #ffffff;
        }
        .conditions-checklist {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .conditions-checklist li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .layer-back-action {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .docs-note {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .docs-note strong { color: var(--text-primary); margin-right: 6px; }
        .btn-apply-pulsing {
          width: 100%;
          min-height: 52px;
          padding: 14px 24px;
          border-radius: 12px;
          color: #000000;
          font-family: var(--font-mono);
          font-weight: 800;
          font-size: clamp(0.85rem, 0.8rem + 0.3vw, 0.95rem);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .btn-apply-pulsing:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(255,255,255,0.2);
        }
        .applied-success-card {
          background: var(--bg-card);
          border: 2px solid #00ff88;
          border-radius: 20px;
          padding: 40px 24px;
          text-align: center;
        }
        .success-badge {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(0, 255, 136, 0.2);
          border: 2px solid #00ff88;
          color: #00ff88;
          font-size: 28px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }
        .offer-summary-pill {
          display: inline-block;
          margin-top: 14px;
          padding: 8px 16px;
          background: var(--bg-primary);
          border: 1px solid;
          border-radius: 20px;
          font-family: var(--font-mono);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};
