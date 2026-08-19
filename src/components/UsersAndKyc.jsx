import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { mapInvestorHoldingFromApi, mapKycStatus } from '../api/mappers';
import { ShieldCheck, Search, Mail, ShieldAlert, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UsersAndKyc({
  investors, 
  setInvestors,
  highlightInvestorId = null,
  onHighlightHandled,
  onAddLog
}) {
  const [selectedInv, setSelectedInv] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pulling a provider decision for one investor at a time; holds that investor's id while it runs.
  const [syncingId, setSyncingId] = useState(null);
  const [syncError, setSyncError] = useState('');

  // Portfolio for the opened investor. `null` = not loaded yet (show a loader);
  // an array (possibly empty) = loaded. The registry list has no holdings, so the
  // card fetches them per investor from GET /users/{id}/investments.
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioError, setPortfolioError] = useState('');

  useEffect(() => {
    if (!selectedInv) return;
    // Prefer holdings already on the record (demo fallback); otherwise fetch by id.
    if (Array.isArray(selectedInv.holdings) && selectedInv.holdings.length > 0) {
      setPortfolio(selectedInv.holdings);
      setPortfolioError('');
      return;
    }
    let cancelled = false;
    setPortfolio(null);
    setPortfolioError('');
    api.admin
      .investorPortfolio(selectedInv.id)
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : rows?.items || [];
        setPortfolio(
          list
            .map(mapInvestorHoldingFromApi)
            .filter((h) => !h.status || String(h.status).toLowerCase() === 'active')
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setPortfolio([]);
        setPortfolioError(err?.message || 'Не удалось загрузить портфель');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedInv]);

  // Переход из реестра держателей: снимаем поиск, чтобы строка точно попала в список,
  // прокручиваем к ней и держим подсветку несколько секунд.
  const [highlightedId, setHighlightedId] = useState(null);
  const onHighlightHandledRef = useRef(onHighlightHandled);
  onHighlightHandledRef.current = onHighlightHandled;

  useEffect(() => {
    if (!highlightInvestorId) return;
    setSearchQuery('');
    setHighlightedId(highlightInvestorId);

    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`investor-row-${highlightInvestorId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    const clearTimer = setTimeout(() => {
      setHighlightedId(null);
      onHighlightHandledRef.current?.();
    }, 6000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
    // onHighlightHandled намеренно не в зависимостях: родитель передаёт стрелку,
    // и таймеры перезапускались бы на каждый рендер.
  }, [highlightInvestorId]);

  const filteredInvestors = investors.filter(inv => {
    if (!searchQuery) return true;
    return (inv.name || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  /**
   * Asks the KYC provider what it decided about this investor's verification.
   *
   * The decision normally arrives on a webhook, but Didit drops an event after five failed
   * deliveries — and then a verification the person really did pass sits in UnderReview with
   * nothing on our side to say why. This is how an operator gets that profile unstuck without
   * approving it blind: the provider is asked, and whatever it answers is what gets applied.
   */
  const syncKyc = async (inv) => {
    if (!inv.kycProfileId || syncingId) return;
    setSyncingId(inv.id);
    setSyncError('');
    try {
      const profile = await api.kyc.sync(inv.kycProfileId);
      const status = mapKycStatus(profile?.status) || 'Pending';
      setInvestors?.((prev) =>
        prev.map((row) => (row.id === inv.id ? { ...row, kycStatus: status, name: profile?.fullName || row.name } : row)),
      );
      onAddLog?.(
        status === 'Approved'
          ? `KYC подтверждён у провайдера: ${profile?.fullName || inv.name}`
          : `Статус KYC у провайдера: ${status} (${inv.name})`,
      );
    } catch (err) {
      setSyncError(err?.problem?.detail ?? err?.message ?? 'Не удалось получить решение провайдера.');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Upper Title banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Депозитарный учет долей RWA • Кыргызская Республика
          </span>
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Реестр Инвесторов
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Все инвесторы являются верифицированными гражданами КР. Покупка активов без прохождения KYC технически заблокирована смарт-контрактами оферты.
          </p>
        </div>

        {/* Action readouts */}
        <div className="flex bg-[#F3F3F1] p-1 rounded-sm text-[10px] uppercase font-bold tracking-wider font-mono">
          <span className="px-3 py-1 bg-white text-gray-900 rounded-sm shadow-xs font-bold">
            Инвесторов в реестре: {investors.length}
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white border border-gray-150 p-4 rounded-sm text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Поиск по ФИО инвестора..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-[#A38D6D] bg-white text-gray-900"
          />
        </div>
      </div>

      {syncError && (
        <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] text-rose-700">
          {syncError}
        </div>
      )}

      {/* Main Table List */}
      <div className="bg-white border border-gray-100 rounded-sm overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                <th className="py-3 px-4 text-left">ФИО / Контакты</th>
                <th className="py-3 px-4 text-center">KYC / Верификация</th>
                <th className="py-3 px-4 text-center">Суммарный объем долей</th>
                <th className="py-3 px-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvestors.map((inv) => {
                const totalTokens = (inv.holdings || []).reduce((sum, h) => sum + (h.tokensOwned || 0), 0);

                return (
                  <tr
                    key={inv.id}
                    id={`investor-row-${inv.id}`}
                    className={`hover:bg-gray-50/50 transition-colors duration-500 ${
                      highlightedId === inv.id ? 'bg-[#A38D6D]/12 ring-1 ring-inset ring-[#A38D6D]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-left">
                      <span className="font-bold text-gray-950 font-serif block">{inv.name}</span>
                      <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                        <Mail size={10} /> {inv.email}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {inv.kycStatus === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          <ShieldCheck size={11} /> KYC пройден
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          <ShieldAlert size={11} /> Не пройден
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-[11px] font-bold text-gray-800">
                      {totalTokens.toLocaleString()} ATR-S
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInv(inv)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-[#A38D6D] hover:text-white rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                        >
                          <span>Детали</span>
                        </button>
                        {inv.kycStatus !== 'Approved' && inv.kycProfileId && (
                          <button
                            onClick={() => syncKyc(inv)}
                            disabled={syncingId === inv.id}
                            title="Запросить решение у провайдера KYC"
                            className="p-1.5 rounded border border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] disabled:opacity-50 cursor-pointer"
                          >
                            {syncingId === inv.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvestors.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 italic font-mono">
                    Инвесторы по заданным комплаенс-критериям не обнаружены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER / OVERLAY MODAL */}
      <AnimatePresence>
        {selectedInv && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-200 shadow-2xl max-w-lg w-full p-6 text-left relative rounded-sm"
              >
                <div className="border-b border-gray-150 pb-3 mb-4 flex justify-between items-start">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Карточка инвестора</span>
                    <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">{selectedInv.name}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedInv(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Portfolio breakdown */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">Приобретенные доли (RWA Portfolio)</span>
                      {Array.isArray(portfolio) && portfolio.length > 0 && (
                        <span className="text-[9px] font-mono text-gray-500">
                          Итого: {portfolio.reduce((s, h) => s + (h.tokensOwned || 0), 0).toLocaleString()} ATR-S · {portfolio.length} об.
                        </span>
                      )}
                    </div>

                    {portfolio === null ? (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 py-2">
                        <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
                        Загрузка портфеля…
                      </div>
                    ) : portfolio.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        {portfolioError ? `Портфель недоступен. ${portfolioError}` : 'Портфель инвестора пуст.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {/* Column header */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-2.5 text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                          <span>Объект</span>
                          <span className="text-right w-16">Токены</span>
                          <span className="text-right w-12">Доля</span>
                          <span className="text-right w-20">Сумма</span>
                        </div>
                        {portfolio.map((h, idx) => (
                          <div
                            key={h.propertyId || idx}
                            className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center p-2.5 bg-gray-50 border border-gray-150 rounded text-xs font-mono"
                          >
                            <span className="font-bold text-gray-800 truncate" title={h.propertyName}>{h.propertyName}</span>
                            <span className="text-right w-16 font-bold text-[#A38D6D]">{(h.tokensOwned || 0).toLocaleString()}</span>
                            <span className="text-right w-12 text-gray-600">
                              {h.sharePercent != null ? `${Number(h.sharePercent).toFixed(2)}%` : '—'}
                            </span>
                            <span className="text-right w-20 text-gray-700 font-semibold">
                              {h.amount != null ? `${Number(h.amount).toLocaleString()} ${h.currency}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
