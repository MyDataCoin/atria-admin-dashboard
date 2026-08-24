import React, { useMemo, useState } from 'react';
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
  Sparkles,
  Home,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatVal } from '../utils';
import PropertyDetailPanel from './PropertyDetailPanel';

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
  buildings = [],
  placements,
  payouts,
  realtors = [],
  realtorsLoading = false,
  realtorsError = '',
  currency = 'KGS',
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
      value: `${Math.round(stats.totalInvestedVolume || 0).toLocaleString('ru-RU')} ${stats.investedCurrency || currency}`,
      icon: Coins,
      desc: 'Привлеченный капитал',
      subtext: `${stats.totalInvestors} инвесторов в реестре`,
      color: 'border-l-4 border-amber-800'
    },
    {
      id: 'investors',
      label: 'База инвесторов',
      // Вся база, а не только прошедшие KYC: зарегистрированный без верификации — тоже инвестор,
      // и как раз разрыв между этими двумя числами показывает, сколько людей застряло на проверке.
      value: stats.totalInvestors,
      icon: Users,
      desc: 'Все зарегистрированные аккаунты',
      subtext: stats.kycVerificationRate == null
        ? 'KYC: данных пока нет'
        : `${stats.kycApprovedInvestors ?? 0} с пройденным KYC · ${stats.kycVerificationRate}%`,
      color: 'border-l-4 border-emerald-600'
    },
    {
      id: 'payouts',
      label: 'Выплачено дивидендов',
      // The payout module does not exist yet, so there is nothing distributed to report. Showing a
      // number here would be inventing one; the card stays, empty and honest, until it is built.
      value: '—',
      icon: Wallet,
      desc: 'Дистрибуция рентного дохода',
      subtext: 'Модуль выплат ещё не подключён',
      color: 'border-l-4 border-blue-600'
    }
  ];

  // Как продаётся объект. Доли выпускаются на помещение, но оператор смотрит на дом целиком:
  // помещения одного здания складываем в один ряд, а отдельные объекты остаются сами по себе.
  const buildingNameById = useMemo(
    () => Object.fromEntries(buildings.map((b) => [b.id, b.name])),
    [buildings]
  );

  const unitLabel = (p) => (p.unitNumber ? `${p.name} · №${p.unitNumber}` : p.name);

  const salesGroups = useMemo(() => {
    const groups = new Map();

    for (const p of properties.filter((x) => x.status === 'active')) {
      const key = p.buildingId || `standalone-${p.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          isBuilding: !!p.buildingId,
          name: p.buildingId ? (buildingNameById[p.buildingId] || 'Здание') : p.name,
          city: p.city || '',
          units: [],
        });
      }
      const total = p.totalTokens ?? 0;
      const available = p.availableTokens ?? total;
      const sold = Math.max(0, total - available);
      const price = p.tokenPrice ?? 0;
      const group = groups.get(key);
      group.currency = group.currency || p.currency || currency;
      group.units.push({
        id: p.id,
        name: unitLabel(p),
        sold,
        total,
        raised: sold * price,
        target: total * price,
        pct: total > 0 ? (sold / total) * 100 : 0,
      });
    }

    const list = [...groups.values()]
      .map((g) => {
        const sold = g.units.reduce((sum, u) => sum + u.sold, 0);
        const total = g.units.reduce((sum, u) => sum + u.total, 0);
        const raised = g.units.reduce((sum, u) => sum + u.raised, 0);
        const target = g.units.reduce((sum, u) => sum + u.target, 0);
        const ranked = [...g.units].sort((a, b) => b.pct - a.pct);
        return {
          ...g,
          sold,
          total,
          raised,
          target,
          pct: total > 0 ? (sold / total) * 100 : 0,
          units: ranked,
          best: ranked[0],
          worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
        };
      })
      .sort((a, b) => b.pct - a.pct);

    // Доля объекта в собранных деньгах: сам по себе процент выкупа не говорит, кто приносит выручку —
    // 50% маленького выпуска и 5% большого стоят очень по-разному.
    const raisedAll = list.reduce((sum, g) => sum + g.raised, 0);
    return list.map((g) => ({
      ...g,
      shareOfRaised: raisedAll > 0 ? (g.raised / raisedAll) * 100 : 0,
    }));
  }, [properties, buildingNameById, currency]);

  // Итог по всем объектам в продаже — шапка блока.
  const salesTotals = useMemo(() => {
    const sold = salesGroups.reduce((sum, g) => sum + g.sold, 0);
    const total = salesGroups.reduce((sum, g) => sum + g.total, 0);
    const raised = salesGroups.reduce((sum, g) => sum + g.raised, 0);
    const target = salesGroups.reduce((sum, g) => sum + g.target, 0);
    return {
      sold,
      total,
      raised,
      target,
      pct: total > 0 ? (sold / total) * 100 : 0,
      units: salesGroups.reduce((sum, g) => sum + g.units.length, 0),
      currency: salesGroups[0]?.currency || currency,
    };
  }, [salesGroups, currency]);

  // Какие группы раскрыты (показывают помещения внутри).
  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleGroup = (key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Объект, карточку которого раскрыли из сводки. Панель открывается прямо здесь: уводить
  // человека в раздел объектов ради просмотра — лишний переход, из которого ещё надо вернуться.
  const [openPropertyId, setOpenPropertyId] = useState(null);
  const openProperty = openPropertyId ? properties.find((p) => p.id === openPropertyId) : null;

  const placementStatus = (status) =>
    status === 'active'
      ? { label: 'Выпуск идет', cls: 'bg-emerald-50 text-emerald-700' }
      : status === 'paused'
        ? { label: 'Приостановлен', cls: 'bg-amber-50 text-amber-700' }
        : { label: 'Успешно закрыт', cls: 'bg-blue-50 text-blue-700' };

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

          {/* Сводка по всему, что сейчас в продаже: проценты по объектам читаются только на её фоне. */}
          {salesGroups.length > 0 && (
            <div className="grid grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden mt-4">
              {[
                {
                  label: 'В продаже',
                  value: `${salesGroups.length}`,
                  hint: `${salesTotals.units} помещений`,
                },
                {
                  label: 'Выкуплено долей',
                  value: `${salesTotals.pct.toFixed(1)}%`,
                  hint: `${salesTotals.sold.toLocaleString('ru-RU')} из ${salesTotals.total.toLocaleString('ru-RU')}`,
                },
                {
                  label: 'Привлечено',
                  value: `${Math.round(salesTotals.raised).toLocaleString('ru-RU')} ${salesTotals.currency}`,
                  hint: `цель ${Math.round(salesTotals.target).toLocaleString('ru-RU')} ${salesTotals.currency}`,
                },
              ].map((m) => (
                <div key={m.label} className="bg-white px-3 py-3">
                  <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">
                    {m.label}
                  </span>
                  <span className="text-sm font-mono font-bold text-gray-900 block mt-1 truncate" title={m.value}>
                    {m.value}
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 block truncate" title={m.hint}>
                    {m.hint}
                  </span>
                </div>
              ))}
            </div>
          )}

          {salesGroups.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-10 text-center">Нет объектов в продаже.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {salesGroups.map((g, idx) => {
                const isLeader = idx === 0 && g.pct > 0;
                const isLaggard = salesGroups.length > 1 && idx === salesGroups.length - 1;
                const expanded = !!expandedGroups[g.key];

                return (
                  <div
                    key={g.key}
                    className={`rounded-lg border transition-colors ${
                      isLeader ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-300 w-4 shrink-0">
                              {idx + 1}
                            </span>
                            {g.isBuilding ? (
                              <Building size={13} className="text-[#A38D6D] shrink-0" />
                            ) : (
                              <Home size={13} className="text-[#A38D6D] shrink-0" />
                            )}
                            <h4 className="text-sm font-serif font-bold text-gray-900 truncate" title={g.name}>
                              {g.name}
                            </h4>
                            {isLeader && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                <TrendingUp size={9} /> Лидер продаж
                              </span>
                            )}
                            {isLaggard && !isLeader && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                <TrendingDown size={9} /> Слабее всех
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-gray-400 block mt-1 ml-6 truncate">
                            {[g.city, g.isBuilding ? `${g.units.length} помещений в продаже` : 'отдельный объект']
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-lg font-mono font-bold ${isLeader ? 'text-emerald-700' : 'text-gray-900'}`}>
                            {g.pct.toFixed(1)}%
                          </span>
                          <span className="block text-[8px] font-mono text-gray-400">
                            {g.sold.toLocaleString('ru-RU')} / {g.total.toLocaleString('ru-RU')} долей
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLeader ? 'bg-emerald-500' : 'bg-[#A38D6D]'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(g.pct > 0 ? 2 : 0, g.pct))}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-2 text-[9px] font-mono text-gray-500">
                        <span>
                          Привлечено{' '}
                          <span className="font-bold text-gray-900">
                            {Math.round(g.raised).toLocaleString('ru-RU')} {g.currency}
                          </span>{' '}
                          из {Math.round(g.target).toLocaleString('ru-RU')} {g.currency}
                        </span>
                        {g.shareOfRaised > 0 && (
                          <span className="text-gray-400">
                            {g.shareOfRaised.toFixed(0)}% всех продаж
                          </span>
                        )}
                      </div>

                      {/* У здания интересен не только дом целиком, но и какая именно квартира тянет продажи. */}
                      {g.isBuilding && g.best && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] ml-6">
                          <span className="text-gray-500">
                            Лучше всего:{' '}
                            <span className="font-bold text-gray-900">{g.best.name}</span>{' '}
                            <span className="font-mono text-emerald-700">{g.best.pct.toFixed(1)}%</span>
                          </span>
                          {g.worst && (
                            <span className="text-gray-500">
                              Хуже всего:{' '}
                              <span className="font-bold text-gray-900">{g.worst.name}</span>{' '}
                              <span className="font-mono text-gray-500">{g.worst.pct.toFixed(1)}%</span>
                            </span>
                          )}
                        </div>
                      )}

                      {g.units.length > 1 && (
                        <button
                          onClick={() => toggleGroup(g.key)}
                          className="mt-2 ml-6 inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-[#A38D6D] cursor-pointer"
                        >
                          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          {expanded ? 'Свернуть' : `Показать помещения (${g.units.length})`}
                        </button>
                      )}
                    </div>

                    {expanded && g.units.length > 1 && (
                      <div className="border-t border-gray-100 px-4 py-3 space-y-2.5 bg-gray-50/50 rounded-b-lg">
                        {g.units.map((u) => (
                          <div key={u.id}>
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[11px] text-gray-700 truncate pr-2" title={u.name}>
                                {u.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-gray-600 shrink-0">
                                {u.pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200/70 h-1 rounded overflow-hidden">
                              <div
                                className="h-full bg-[#A38D6D] rounded"
                                style={{ width: `${Math.min(100, Math.max(u.pct > 0 ? 2 : 0, u.pct))}%` }}
                              />
                            </div>
                            <span className="text-[8px] text-gray-400 font-mono mt-0.5 block">
                              {u.sold.toLocaleString('ru-RU')} / {u.total.toLocaleString('ru-RU')} долей ·{' '}
                              {Math.round(u.raised).toLocaleString('ru-RU')} {g.currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Placements Summary (Bento box 2) */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs text-left lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-150 pb-3 mb-3">
              <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Сводный статус размещений</span>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">Активные оферты выпуска</h3>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('properties')}
                    className="text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-[#A38D6D] cursor-pointer shrink-0"
                  >
                    Все объекты
                  </button>
                )}
              </div>
              <p className="text-[9px] font-mono text-gray-400 mt-1">
                Нажмите на выпуск — откроется карточка объекта
              </p>
            </div>

            <div className="space-y-1">
              {placements.map((plc) => {
                const pct = Math.min(100, (plc.raisedAmount / plc.targetAmount) * 100);
                const status = placementStatus(plc.status);
                return (
                  // Строка — кнопка: подробности выпуска живут в модалке, чтобы колонка со
                  // сводкой оставалась сводкой и в неё помещались все размещения сразу.
                  <button
                    key={plc.id}
                    type="button"
                    onClick={() => setOpenPropertyId(plc.propertyId)}
                    className="w-full text-left border-b border-gray-50 last:border-0 py-3 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 leading-tight truncate">
                          {plc.propertyName}
                        </h4>
                        <span className="text-[8px] text-gray-400 font-mono block mt-0.5 truncate">
                          {plc.id.toUpperCase()} • {formatVal(plc.tokenPrice, currency)}/ATR
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded ${status.cls}`}>
                          {status.label}
                        </span>
                        <ChevronRight size={13} className="text-gray-300" />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 h-1 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            plc.status === 'paused' ? 'bg-amber-500' : 'bg-[#A38D6D]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-gray-700 shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </button>
                );
              })}
              {placements.length === 0 && (
                <p className="text-xs text-gray-400 italic py-8 text-center">Размещений пока нет.</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Карточка объекта, раскрытая из сводки размещений */}
      <AnimatePresence>
        {openProperty && (
          <PropertyDetailPanel
            property={openProperty}
            buildingName={openProperty.buildingId ? buildingNameById[openProperty.buildingId] || '' : ''}
            onClose={() => setOpenPropertyId(null)}
          />
        )}
      </AnimatePresence>

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
