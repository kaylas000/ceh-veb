// src/components/banki/FinancialCatalog.tsx
import React, { useState } from 'react';
import { Search, Filter, ArrowRight, Check, Zap } from 'lucide-react';
import { BankOffer, BANK_OFFERS, BANK_CATEGORIES } from '../../data/bankiData';
import { soundEngine } from '../../audio/WebAudioEngine';

interface CatalogProps {
  onSelectOffer: (offer: BankOffer) => void;
}

export const FinancialCatalog: React.FC<CatalogProps> = ({ onSelectOffer }) => {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOffers = BANK_OFFERS.filter(offer => {
    const matchCat = selectedCat === 'all' || offer.category.includes(selectedCat) || (selectedCat === 'karty' && (offer.category === 'debet' || offer.category === 'kredit'));
    const matchSearch = offer.name.toLowerCase().includes(searchQuery.toLowerCase()) || offer.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <section className="section" id="catalog">
      <div className="container">
        <div className="editorial-section-tag">
          <span>[КАТАЛОГ ФИНАНСОВЫХ ПРОДУКТОВ // РЕЕСТР ВЫГОДНЫХ СТАВОК]</span>
        </div>

        <h2 className="section-hero-title">ВИТРИНА БАНКОВСКИХ ПРОДУКТОВ</h2>
        <p className="section-hero-desc">
          Полный каталог актуальных предложений: дебетовые карты с максимальным кешбэком, 
          вклады с высокой доходностью, займы 0% и кредиты с низкой ставкой.
        </p>

        {/* Filter Controls Bar */}
        <div className="catalog-filter-bar">
          <div className="search-input-wrap">
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Поиск по названию банка или продукта..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="category-pills-scroll">
            {BANK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`btn-cat-chip ${selectedCat === cat.id ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playClick(450);
                  setSelectedCat(cat.id);
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="catalog-cards-grid">
          {filteredOffers.map((offer) => (
            <div 
              key={offer.id} 
              className="catalog-product-card"
              style={{ borderColor: offer.color || 'var(--border)' }}
              onClick={() => onSelectOffer(offer)}
            >
              <div className="c-card-top">
                <div className="c-brand" style={{ color: offer.color }}>
                  <span className="b-dot" style={{ background: offer.color }} />
                  <span>{offer.brand}</span>
                </div>
                <span className="c-cat">{offer.category.toUpperCase()}</span>
              </div>

              <h4 className="c-title">{offer.title}</h4>

              <div className="c-params-list">
                {offer.params.map((p, i) => (
                  <div key={i} className="c-param-row">
                    <span className="p-lbl">{p.lbl}:</span>
                    <strong style={{ color: offer.color }}>{p.val}</strong>
                  </div>
                ))}
              </div>

              <div className="c-card-bottom">
                <button className="btn-card-open" style={{ borderColor: offer.color }}>
                  <span>Подробнее</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .catalog-filter-bar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 30px;
        }
        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px 18px;
        }
        .search-input-wrap input {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.9rem;
        }
        .category-pills-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
        }
        .btn-cat-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          min-height: 40px;
          background: var(--bg-surface);
          border: var(--border-width) solid var(--border);
          border-radius: 20px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.76rem;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cat-chip.active {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--bg-card);
        }
        .catalog-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }
        .catalog-product-card {
          background: var(--bg-card);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .catalog-product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.8);
        }
        .c-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .c-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: bold;
        }
        .b-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .c-cat {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .c-title {
          font-size: 1.1rem;
          margin: 0;
          color: #ffffff;
          line-height: 1.2;
        }
        .c-params-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0,0,0,0.35);
          border-radius: 6px;
          padding: 10px 12px;
          font-family: var(--font-mono);
          font-size: 0.76rem;
        }
        .c-param-row {
          display: flex;
          justify-content: space-between;
        }
        .c-param-row .p-lbl { color: var(--text-secondary); }
        .btn-card-open {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid;
          border-radius: 6px;
          color: #ffffff;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          cursor: pointer;
        }
      `}</style>
    </section>
  );
};
