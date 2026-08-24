// src/components/banki/FinancialCalculators.tsx
import React, { useState } from 'react';
import { Calculator, TrendingUp, Home, Percent, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { soundEngine } from '../../audio/WebAudioEngine';

export const FinancialCalculators: React.FC<{ onOpenOrder: () => void }> = ({ onOpenOrder }) => {
  const [calcType, setCalcType] = useState<'credit' | 'deposit' | 'mortgage'>('credit');

  // Credit State
  const [creditAmount, setCreditAmount] = useState(500000);
  const [creditMonths, setCreditMonths] = useState(36);
  const [creditRate, setCreditRate] = useState(12.5);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState(300000);
  const [depositMonths, setDepositMonths] = useState(12);
  const [depositRate, setDepositRate] = useState(18.5);

  // Calculations
  const calcMonthlyPayment = () => {
    const monthlyRate = creditRate / 12 / 100;
    const payment = (creditAmount * monthlyRate * Math.pow(1 + monthlyRate, creditMonths)) / (Math.pow(1 + monthlyRate, creditMonths) - 1);
    return Math.round(payment);
  };

  const monthlyPayment = calcMonthlyPayment();
  const totalPayment = monthlyPayment * creditMonths;
  const overpayment = totalPayment - creditAmount;

  // Deposit Income Calculation
  const calcDepositIncome = () => {
    const income = (depositAmount * (depositRate / 100) * (depositMonths / 12));
    return Math.round(income);
  };
  const depositIncome = calcDepositIncome();

  return (
    <section className="section" id="calculators">
      <div className="container">
        <div className="editorial-section-tag">
          <Calculator size={14} />
          <span>[ИНТЕРАКТИВНЫЕ ФИНАНСОВЫЕ КАЛЬКУЛЯТОРЫ // ТЕЛЕМЕТРИЯ СТАВОК]</span>
        </div>

        <h2 className="section-hero-title">РАСЧЕТ ВЫГОДЫ В РЕАЛЬНОМ ВРЕМЕНИ</h2>
        <p className="section-hero-desc">
          Точные математические расчеты ежемесячных платежей по кредитам, доходности вкладов 
          и вероятности одобрения по актуальным тарифам банков РФ.
        </p>

        <div className="calc-master-box">
          {/* Calc Switcher Bar */}
          <div className="calc-tabs-bar">
            <button 
              className={`btn-calc-tab ${calcType === 'credit' ? 'active' : ''}`}
              onClick={() => { soundEngine.playClick(440); setCalcType('credit'); }}
            >
              <Percent size={15} />
              <span>Кредитный калькулятор</span>
            </button>
            <button 
              className={`btn-calc-tab ${calcType === 'deposit' ? 'active' : ''}`}
              onClick={() => { soundEngine.playClick(480); setCalcType('deposit'); }}
            >
              <TrendingUp size={15} />
              <span>Калькулятор вкладов</span>
            </button>
          </div>

          <div className="calc-body-grid">
            {/* Controls Sliders */}
            <div className="calc-inputs-col">
              {calcType === 'credit' ? (
                <>
                  <div className="range-field">
                    <div className="range-head">
                      <span>Сумма кредита:</span>
                      <strong>{creditAmount.toLocaleString('ru-RU')} ₽</strong>
                    </div>
                    <input 
                      type="range" 
                      min="50000" 
                      max="5000000" 
                      step="50000"
                      value={creditAmount}
                      onChange={e => setCreditAmount(Number(e.target.value))}
                    />
                    <div className="range-limits">
                      <span>50 000 ₽</span>
                      <span>5 000 000 ₽</span>
                    </div>
                  </div>

                  <div className="range-field">
                    <div className="range-head">
                      <span>Срок кредитования:</span>
                      <strong>{creditMonths} мес. ({Math.round(creditMonths / 12 * 10) / 10} г.)</strong>
                    </div>
                    <input 
                      type="range" 
                      min="6" 
                      max="84" 
                      step="6"
                      value={creditMonths}
                      onChange={e => setCreditMonths(Number(e.target.value))}
                    />
                    <div className="range-limits">
                      <span>6 мес.</span>
                      <span>84 мес. (7 лет)</span>
                    </div>
                  </div>

                  <div className="range-field">
                    <div className="range-head">
                      <span>Процентная ставка:</span>
                      <strong>{creditRate}% годовых</strong>
                    </div>
                    <input 
                      type="range" 
                      min="4.5" 
                      max="29.9" 
                      step="0.5"
                      value={creditRate}
                      onChange={e => setCreditRate(Number(e.target.value))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="range-field">
                    <div className="range-head">
                      <span>Сумма вклада:</span>
                      <strong>{depositAmount.toLocaleString('ru-RU')} ₽</strong>
                    </div>
                    <input 
                      type="range" 
                      min="10000" 
                      max="10000000" 
                      step="50000"
                      value={depositAmount}
                      onChange={e => setDepositAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="range-field">
                    <div className="range-head">
                      <span>Срок вклада:</span>
                      <strong>{depositMonths} месяцев</strong>
                    </div>
                    <input 
                      type="range" 
                      min="3" 
                      max="36" 
                      step="3"
                      value={depositMonths}
                      onChange={e => setDepositMonths(Number(e.target.value))}
                    />
                  </div>

                  <div className="range-field">
                    <div className="range-head">
                      <span>Ставка по вкладу:</span>
                      <strong>{depositRate}% годовых</strong>
                    </div>
                    <input 
                      type="range" 
                      min="8" 
                      max="22" 
                      step="0.5"
                      value={depositRate}
                      onChange={e => setDepositRate(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Results HUD Display */}
            <div className="calc-result-col">
              <div className="calc-summary-card">
                {calcType === 'credit' ? (
                  <>
                    <span className="res-lbl">Ежемесячный платеж:</span>
                    <div className="res-huge-val">{monthlyPayment.toLocaleString('ru-RU')} ₽ / мес</div>

                    <div className="res-details-list">
                      <div className="r-item">
                        <span>Сумма кредита:</span>
                        <strong>{creditAmount.toLocaleString('ru-RU')} ₽</strong>
                      </div>
                      <div className="r-item">
                        <span>Общая сумма выплат:</span>
                        <strong>{totalPayment.toLocaleString('ru-RU')} ₽</strong>
                      </div>
                      <div className="r-item">
                        <span>Начисленные проценты:</span>
                        <strong style={{ color: 'var(--accent)' }}>{overpayment.toLocaleString('ru-RU')} ₽</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="res-lbl">Доход по вкладу за срок:</span>
                    <div className="res-huge-val" style={{ color: '#00ff88' }}>
                      +{depositIncome.toLocaleString('ru-RU')} ₽
                    </div>

                    <div className="res-details-list">
                      <div className="r-item">
                        <span>Итоговая сумма к выплате:</span>
                        <strong>{(depositAmount + depositIncome).toLocaleString('ru-RU')} ₽</strong>
                      </div>
                      <div className="r-item">
                        <span>Эффективная ставка:</span>
                        <strong>{depositRate}% годовых</strong>
                      </div>
                    </div>
                  </>
                )}

                <button className="btn-studio-primary" onClick={onOpenOrder} style={{ width: '100%', marginTop: '20px' }}>
                  <Zap size={16} />
                  <span>Подобрать банк с лучшим условием</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .calc-master-box {
          background: var(--bg-surface);
          border: var(--border-width) solid var(--border-strong);
          border-radius: var(--radius-md);
          padding: clamp(20px, 4vw, 36px);
          box-shadow: var(--shadow-card);
        }
        .calc-tabs-bar {
          display: flex;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .btn-calc-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          min-height: 44px;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-calc-tab.active {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--bg-card);
        }
        .calc-body-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: clamp(24px, 4vw, 40px);
          align-items: center;
        }
        @media (max-width: 900px) {
          .calc-body-grid { grid-template-columns: 1fr; }
        }
        .calc-inputs-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .range-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .range-head {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.85rem;
        }
        .range-head strong { color: var(--accent); }
        .range-field input[type="range"] {
          width: 100%;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .range-limits {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .calc-summary-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 24px;
        }
        .res-lbl {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .res-huge-val {
          font-family: var(--font-heading);
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          font-weight: 900;
          color: var(--accent);
          margin: 6px 0 18px;
        }
        .res-details-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 14px;
        }
        .r-item {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.78rem;
        }
        .r-item span { color: var(--text-secondary); }
      `}</style>
    </section>
  );
};
