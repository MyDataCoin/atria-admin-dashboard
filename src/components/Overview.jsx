import React, { useState } from 'react';
import {
  Building,
  Coins,
  Users,
  Wallet,
  Send,
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Medal,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatVal } from '../utils';

// Realtor tier from completed-deal count, relative to the leader:
//   #1 (most completed) → Топ; some completed → Профессионал; none/very few → Новичок.
function realtorTier(closedDeals, maxClosed) {
  if (maxClosed > 0 && closedDeals === maxClosed) {
    return { label: 'Топ', cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: Award };
  }
  if (closedDeals > 0) {
    return { label: 'Профессионал', cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Medal };
  }
  return { label: 'Новичок', cls: 'bg-gray-50 text-gray-500 border-gray-200', Icon: Sparkles };
}

export default function Overview({
  stats,
  properties,
  placements,
  payouts,
  realtors = [],
  realtorsLoading = false,
  realtorsError = '',
  currency = 'USD',
  onNavigate,
  onAddLog
}) {
  const rankedRealtors = [...realtors].sort(
    (a, b) => (b.closedDeals || 0) - (a.closedDeals || 0)
  );
  const maxClosed = rankedRealtors.reduce((m, r) => Math.max(m, r.closedDeals || 0), 0);

  const [showQuickNotify, setShowQuickNotify] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyGroup, setNotifyGroup] = useState('all');
  const [notifyContent, setNotifyContent] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  const handleSendNotification = (e) => {
    e.preventDefault();
    if (!notifyTitle || !notifyContent) return;
    
    onAddLog(
      'System Notification Sent',
      `Глобальное уведомление "${notifyTitle}" отправлено группе [${notifyGroup.toUpperCase()}].`
    );

    setNotifySuccess(true);
    setTimeout(() => {
      setNotifySuccess(false);
      setShowQuickNotify(false);
      setNotifyTitle('');
      setNotifyContent('');
    }, 2500);
  };

  const dashboardCards = [
    {
      id: 'objects',
      label: 'Объекты в реестре',
      value: properties.length,
      icon: Building,
      desc: 'Токенизированные здания и виллы',
      subtext: `${properties.filter(p => p.status === 'active').length} активных в управлении`,
      color: 'border-l-4 border-amber-600'
    },
    {
      id: 'investments',
      label: 'Объем инвестиций RWA',
      // Real invested volume from the backend, already in its own currency — shown as-is
      // (not through formatVal, which would apply an FX rate and inflate it).
      value: `${Math.round(stats.totalInvestedVolume || 0).toLocaleString('en-US')} ${stats.investedCurrency || currency}`,
      icon: Coins,
      desc: 'Привлеченный капитал',
      subtext: `${stats.totalInvestors} инвесторов в реестре`,
      color: 'border-l-4 border-amber-800'
    },
    {
      id: 'investors',
      label: 'База инвесторов',
      value: stats.totalInvestors,
      icon: Users,
      desc: 'KYC-верифицированные аккаунты',
      subtext: `${stats.kycVerificationRate}% успешной верификации`,
      color: 'border-l-4 border-emerald-600'
    },
    {
      id: 'payouts',
      label: 'Выплачено дивидендов',
      value: formatVal(stats.payoutsDistributed, currency),
      icon: Wallet,
      desc: 'Дистрибуция рентного дохода',
      subtext: `${payouts.filter(p => p.status === 'confirmed').length} закрытых ведомостей`,
      color: 'border-l-4 border-blue-600'
    }
  ];

  // How well each property sells: share of its token supply already taken.
  // sold = totalTokens − availableTokens; pct = sold / totalTokens.
  // Only offerings still on sale — sold-out/closed ones (archived, 100% taken) are
  // excluded: "how it sells" is only meaningful while it's actually being sold.
  const salesRanking = properties
    .filter((p) => p.status === 'active')
    .map((p) => {
      const total = p.totalTokens ?? 0;
      const available = p.availableTokens ?? total;
      const sold = Math.max(0, total - available);
      const pct = total > 0 ? (sold / total) * 100 : 0;
      return { id: p.id, name: p.name, city: p.city, sold, total, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  const bestSellers = salesRanking.filter((p) => p.pct > 0).slice(0, 5);
  // Worst = lowest sales among properties that are actually on sale (have supply).
  const worstSellers = [...salesRanking]
    .filter((p) => p.total > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  return (
    <div className="space-y-8 font-sans">
      
      {/* Top Welcome Title & Slogan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-100 p-6 rounded-sm shadow-xs text-left">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Рабочая область
          </span>
          <h1 className="text-2xl font-serif font-semibold text-gray-900">
            Добро пожаловать в ATRIA RWA AG
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Система позволяет управлять эмиссией токенизированного имущества, регистрировать залоги, проводить проверку инвесторов (KYC/AML) и начислять выплаты в соответствии с законодательством Кыргызской Республики.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setShowQuickNotify(true)}
            className="flex items-center gap-1.5 cursor-pointer bg-[#111111] hover:bg-[#A38D6D] text-white px-3.5 py-2 rounded text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            <Send size={11} />
            <span>Уведомить инвесторов</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {dashboardCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`bg-white p-5 rounded-sm border border-gray-100 shadow-xs flex flex-col justify-between min-h-[130px] text-left relative overflow-hidden ${card.color}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-bold">
                  {card.label}
                </span>
                <div className="text-gray-400">
                  <Icon size={15} />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-2xl font-bold text-[#1A1A1A] block font-mono">
                  {card.value}
                </span>
                <div className="mt-1 flex flex-col">
                  <span className="text-[10px] font-semibold text-gray-800">{card.desc}</span>
                  <span className="text-[9px] text-gray-400 mt-0.5">{card.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Quick Notify Modals */}
      <AnimatePresence>
        {showQuickNotify && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-xl max-w-lg w-full p-6 text-left relative rounded-sm"
            >
              <div className="border-b border-gray-150 pb-3 mb-4">
                <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Инструмент оповещений</span>
                <h3 className="text-lg font-serif font-bold text-gray-900 mt-0.5">Создать рассылку для инвесторов</h3>
              </div>

              {notifySuccess ? (
                <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                  <CheckCircle size={36} className="text-emerald-600 animate-bounce" />
                  <p className="text-sm font-bold text-gray-900">Уведомление успешно сформировано</p>
                  <p className="text-xs text-gray-500">Система разослала пуш и email всем подходящим инвесторам в блокчейн-сети.</p>
                </div>
              ) : (
                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Получатели</label>
                    <select
                      value={notifyGroup}
                      onChange={(e) => setNotifyGroup(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 roundedbg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                    >
                      <option value="all">Все инвесторы платформы (148)</option>
                      <option value="active">Только держатели активных токенов (94)</option>
                      <option value="whitelist">Только новые верифицированные адреса (24)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Заголовок сообщения</label>
                    <input 
                      type="text"
                      required
                      placeholder="Например: Обновление кадастровой стоимости..."
                      value={notifyTitle}
                      onChange={(e) => setNotifyTitle(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Содержимое уведомления</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Текст уведомления, поддерживающий базовую разметку..."
                      value={notifyContent}
                      onChange={(e) => setNotifyContent(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickNotify(false)}
                      className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer text-center"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#111111] hover:bg-[#A38D6D] text-white text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer text-center"
                    >
                      Отправить push-уведомление
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid: Investment Trends & Fast placements summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Property sales ranking */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs text-left lg:col-span-7 flex flex-col">
          <div className="flex justify-between items-center border-b border-gray-150 pb-3">
            <div>
              <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Продажи по объектам</span>
              <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">
                Какая недвижимость продаётся лучше
              </h3>
            </div>
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">% выкупленных долей</span>
          </div>

          {salesRanking.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-10 text-center">Нет объектов для анализа.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Best sellers */}
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold font-mono flex items-center gap-1.5 mb-3">
                  <TrendingUp size={12} /> Лидеры продаж
                </span>
                {bestSellers.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Пока никто не продаёт активно.</p>
                ) : (
                  <div className="space-y-3">
                    {bestSellers.map((p) => (
                      <div key={p.id}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-bold text-gray-900 truncate pr-2" title={p.name}>{p.name}</span>
                          <span className="text-[11px] font-mono font-bold text-emerald-700 shrink-0">{p.pct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded" style={{ width: `${Math.min(100, p.pct)}%` }} />
                        </div>
                        <span className="text-[8px] text-gray-400 font-mono mt-0.5 block">
                          {p.sold.toLocaleString()} / {p.total.toLocaleString()} токенов
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Worst sellers */}
              <div>
                <span className="text-[9px] uppercase tracking-wider text-rose-700 font-bold font-mono flex items-center gap-1.5 mb-3">
                  <TrendingDown size={12} /> Продаётся хуже
                </span>
                <div className="space-y-3">
                  {worstSellers.map((p) => (
                    <div key={p.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-gray-900 truncate pr-2" title={p.name}>{p.name}</span>
                        <span className="text-[11px] font-mono font-bold text-gray-500 shrink-0">{p.pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded overflow-hidden">
                        <div className="h-full bg-[#A38D6D] rounded" style={{ width: `${Math.min(100, Math.max(2, p.pct))}%` }} />
                      </div>
                      <span className="text-[8px] text-gray-400 font-mono mt-0.5 block">
                        {p.sold.toLocaleString()} / {p.total.toLocaleString()} токенов
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Placements Summary (Bento box 2) */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs text-left lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-150 pb-3 mb-3">
              <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Сводный статус размещений</span>
              <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">Активные оферты выпуска</h3>
            </div>

            <div className="space-y-4">
              {placements.map((plc) => {
                const pct = Math.min(100, (plc.raisedAmount / plc.targetAmount) * 100);
                return (
                  <div key={plc.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 leading-tight">
                          {plc.propertyName}
                        </h4>
                        <span className="text-[8px] text-gray-400 font-mono block mt-0.5">
                          Код выпуска: {plc.id.toUpperCase()} • Цена: {formatVal(plc.tokenPrice, currency)}/ATR
                        </span>
                      </div>
                      <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        plc.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        plc.status === 'paused' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {plc.status === 'active' ? 'Выпуск идет' : plc.status === 'paused' ? 'Приостановлен' : 'Успешно закрыт'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 mb-1">
                        <span>Прогресс сбора капитала:</span>
                        <span className="font-bold text-gray-800">
                          {formatVal(plc.raisedAmount, currency)} / {formatVal(plc.targetAmount, currency)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1 rounded overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            plc.status === 'paused' ? 'bg-amber-500' : 'bg-[#A38D6D]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Realtor leaderboard */}
      <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs text-left">
        <div className="flex justify-between items-center border-b border-gray-150 pb-3 mb-4">
          <div>
            <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Реферальная сеть</span>
            <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">Статистика по риелторам</h3>
          </div>
          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Рейтинг по завершённым сделкам</span>
        </div>

        {realtorsLoading ? (
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 py-6">
            <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
            Загрузка статистики риелторов…
          </div>
        ) : realtorsError ? (
          <p className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠ Статистика риелторов недоступна. {realtorsError}
          </p>
        ) : rankedRealtors.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-6 text-center">Пока нет данных по риелторам.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono border-b border-gray-100">
                  <th className="py-2 px-3 text-left w-10">#</th>
                  <th className="py-2 px-3 text-left">Риелтор</th>
                  <th className="py-2 px-3 text-center">Завершённых сделок</th>
                  <th className="py-2 px-3 text-center">Всего сделок</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankedRealtors.map((r, idx) => {
                  const tier = realtorTier(r.closedDeals || 0, maxClosed);
                  const TierIcon = tier.Icon;
                  return (
                    <tr key={r.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-gray-900 font-serif block">{r.fullName || 'Риелтор'}</span>
                        {r.companyName && (
                          <span className="text-[9px] text-gray-400 font-mono">{r.companyName}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-900">{r.closedDeals || 0}</td>
                      <td className="py-3 px-3 text-center font-mono text-gray-500">{r.totalDeals ?? '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${tier.cls}`}>
                          <TierIcon size={11} /> {tier.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low-Priority State Indicators - Compliance reassurance block */}
      <section className="bg-[#111111] text-white p-6 rounded-sm text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[#A38D6D]" />
            <span className="text-[9px] tracking-wider font-mono uppercase text-[#A38D6D] font-bold">
              БЕЗУПРЕЧНЫЙ ЛОГ АУДИТА
            </span>
          </div>
          <h4 className="text-sm font-serif text-white font-medium">Защита от изменений</h4>
          <p className="text-[10px] text-gray-400 leading-relaxed max-w-3xl">
            Действия администраторов логируются в локальный неизменяемый журнал (Audit Log), дублирующийся на выделенный сервер соответствия стандартам финансового контроля.
          </p>
        </div>
      </section>

    </div>
  );
}
