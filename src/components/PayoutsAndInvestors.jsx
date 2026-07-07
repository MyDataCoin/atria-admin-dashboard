import React, { useState } from 'react';
import { 
  Wallet, 
  Coins, 
  Building, 
  Calculator, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Search, 
  ArrowDownRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatVal } from '../utils';

export default function PayoutsAndInvestors({ 
  payouts, 
  setPayouts, 
  properties, 
  investors,
  currency = 'USD',
  onAddLog
}) {
  const [selectedPropId, setSelectedPropId] = useState('');
  const [totalRentInput, setTotalRentInput] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Dividends for properties based on total outstanding tokens
  const handleCalculate = (e) => {
    e.preventDefault();
    if (!selectedPropId || !totalRentInput) return;

    const prop = properties.find(p => p.id === selectedPropId);
    if (!prop) return;

    // Calculate total tokens owned by investors for this property
    let totalOutstandingTokens = 0;
    investors.forEach(inv => {
      const holding = inv.holdings.find(h => h.propertyId === prop.id);
      if (holding) {
        totalOutstandingTokens += holding.tokensOwned;
      }
    });

    // Fallback if no investors have tokens yet
    if (totalOutstandingTokens === 0) {
      totalOutstandingTokens = 10000; // default total issue
    }

    const rentAmt = Number(totalRentInput);
    const payoutPerToken = rentAmt / totalOutstandingTokens;

    setCalcResult({
      property: prop,
      totalRent: rentAmt,
      totalOutstanding: totalOutstandingTokens,
      payoutPerToken: payoutPerToken,
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Generate a payout billing registry
  const handleGenerateRegistry = () => {
    if (!calcResult) return;

    const newPayout = {
      id: `pay-${Date.now().toString().slice(-4)}`,
      propertyName: calcResult.property.name,
      propertyId: calcResult.property.id,
      amount: calcResult.totalRent,
      payoutPerToken: calcResult.payoutPerToken,
      status: 'pending',
      date: calcResult.date,
      blockchainTx: `0x${Math.random().toString(16).slice(2, 10)}...`
    };

    setPayouts([newPayout, ...payouts]);
    onAddLog(
      'Dividend Registry Formed',
      `Сформирована ведомость дивидендов по объекту "${calcResult.property.name}" на сумму ${formatVal(calcResult.totalRent, currency)}.`
    );

    setSuccessMsg('Ведомость дивидендов успешно сформирована и ожидает подтверждения.');
    setCalcResult(null);
    setTotalRentInput('');
    setSelectedPropId('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Confirm payout (simulate distributing funds via Smart Contract to verified holders)
  const handleConfirmPayout = (payId) => {
    const matched = payouts.find(p => p.id === payId);
    const updated = payouts.map(p => {
      if (p.id === payId) {
        return { ...p, status: 'confirmed', date: new Date().toISOString().split('T')[0] };
      }
      return p;
    });
    setPayouts(updated);

    onAddLog(
      'Dividend Payout Confirmed',
      `Дивиденды по объекту "${matched?.propertyName}" на сумму ${formatVal(matched?.amount || 0, currency)} УСПЕШНО НАЧИСЛЕНЫ и выплачены в кошельки инвесторов.`
    );
  };

  // Cancel Payout Registry
  const handleCancelPayout = (payId) => {
    const matched = payouts.find(p => p.id === payId);
    const updated = payouts.map(p => {
      if (p.id === payId) {
        return { ...p, status: 'failed' };
      }
      return p;
    });
    setPayouts(updated);

    onAddLog(
      'Dividend Registry Cancelled',
      `Администратор аннулировал ведомость начисления дивидендов "${matched?.propertyName}".`
    );
  };

  const filteredPayouts = payouts.filter(p => 
    p.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans text-left">
      
      {/* Title banner */}
      <div>
        <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
          Финансовое ядро платформы
        </span>
        <h2 className="text-xl font-serif font-bold text-gray-900">
          Начисление Дивидендов & Выплаты Ренты
        </h2>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded text-xs text-emerald-800 font-bold flex items-center gap-2">
          <CheckCircle size={14} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Calculator & Pending Register Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Dividend Calculator (Bento Block 1) */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs lg:col-span-5 text-left flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-150 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calculator size={15} className="text-[#A38D6D]" />
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                  Кадастровый Калькулятор Ренты
                </span>
              </div>
              <h3 className="text-base font-serif font-bold text-gray-900 mt-1">
                Расчет Дивидендов На Токен
              </h3>
            </div>

            <form onSubmit={handleCalculate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Выбрать токенизированный объект</label>
                <select
                  required
                  value={selectedPropId}
                  onChange={(e) => { setSelectedPropId(e.target.value); setCalcResult(null); }}
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-serif font-bold"
                >
                  <option value="">-- Выбрать из реестра --</option>
                  {properties.filter(p => p.status === 'active').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Сумма рентных сборов к выплате ($)</label>
                <input
                  type="number"
                  required
                  placeholder="Сумма прибыли за отчетный месяц"
                  value={totalRentInput}
                  onChange={(e) => { setTotalRentInput(e.target.value); setCalcResult(null); }}
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#111111] hover:bg-[#A38D6D] text-white text-[9px] py-2.5 rounded uppercase tracking-widest font-bold transition-all cursor-pointer"
              >
                Произвести расчет долей
              </button>
            </form>

            {/* Calculations Result Output */}
            {calcResult && (
              <div className="mt-5 p-4 bg-[#FAF8F3]/80 border border-[#A38D6D]/20 rounded space-y-3">
                <div className="flex justify-between border-b border-gray-150 pb-2">
                  <span className="font-serif font-bold text-xs text-gray-900">{calcResult.property.name}</span>
                  <span className="text-[8px] font-mono uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">
                    Расчет выполнен
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Токенов в обращении:</span>
                    <span className="font-bold text-gray-800">{calcResult.totalOutstanding.toLocaleString()} {calcResult.property.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Общая рента:</span>
                    <span className="font-bold text-gray-800">{formatVal(calcResult.totalRent, currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-dashed border-gray-200 pt-1.5">
                    <span>Выплата на 1 токен:</span>
                    <span>{formatVal(calcResult.payoutPerToken, currency)} / ATR-S</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateRegistry}
                  className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[9px] py-2 rounded uppercase tracking-widest font-bold transition-all cursor-pointer"
                >
                  Сформировать ведомость выплат
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-50 text-[10px] text-gray-400 leading-relaxed italic">
            * Дивиденды начисляются только инвесторам, прошедшим верификацию KYC и находящимся в смарт-контракте Whitelist на момент снимка состояния (Snapshot Date).
          </div>
        </div>

        {/* Right Column: Dividend Placements & Billing status (Bento Block 2) */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-150 pb-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#A38D6D] font-bold block">Реестр дивидендных распределений</span>
                <h3 className="text-base font-serif font-bold text-gray-900 mt-1">Ведомости Выплат & Погашений</h3>
              </div>

              <input
                type="text"
                placeholder="Поиск по объекту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:border-[#A38D6D]"
              />
            </div>

            <div className="space-y-3">
              {filteredPayouts.map((pay) => (
                <div key={pay.id} className="border border-gray-100 rounded p-4 bg-[#FAF8F3]/30 space-y-3 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-mono uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                        Код ведомости: {pay.id.toUpperCase()}
                      </span>
                      <h4 className="text-xs font-serif font-bold text-gray-900 mt-1">{pay.propertyName}</h4>
                    </div>

                    <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      pay.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                      pay.status === 'pending' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                      'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}>
                      {pay.status === 'confirmed' ? 'Выплачено' : pay.status === 'pending' ? 'Ожидает одобрения' : 'Аннулировано'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono border-t border-dashed border-gray-100 pt-2.5">
                    <div>
                      <span className="text-[8px] text-gray-400 block font-semibold uppercase">Сумма ренты</span>
                      <span className="font-bold text-gray-900">{formatVal(pay.amount, currency)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 block font-semibold uppercase">Дивиденд / ATR</span>
                      <span className="font-bold text-emerald-700">{formatVal(pay.payoutPerToken, currency)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 block font-semibold uppercase">Блокчейн TX</span>
                      <span className="text-gray-400 truncate block max-w-[100px]" title={pay.blockchainTx}>{pay.blockchainTx}</span>
                    </div>
                  </div>

                  {/* Actions for Pending billing */}
                  {pay.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleCancelPayout(pay.id)}
                        className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-[9px] uppercase font-bold tracking-widest py-1.5 rounded transition-all cursor-pointer text-center"
                      >
                        Отклонить
                      </button>
                      <button
                        onClick={() => handleConfirmPayout(pay.id)}
                        className="flex-1 bg-[#111111] hover:bg-[#A38D6D] text-white text-[9px] uppercase font-bold tracking-widest py-1.5 rounded transition-all cursor-pointer text-center"
                      >
                        Подтвердить и выплатить
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredPayouts.length === 0 && (
                <p className="text-xs text-gray-400 italic py-6 text-center">
                  Ведомости выплат не сформированы.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-150 text-right text-[10px] text-gray-500 font-mono flex justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-[#A38D6D]" />
              Безопасность: Депозитарный учет RWA
            </span>
            <span>Обновлено: Сегодня</span>
          </div>
        </div>

      </div>

    </div>
  );
}
