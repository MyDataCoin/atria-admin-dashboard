import React, { useState, useEffect } from 'react';
import { 
  Handshake, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Link, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Coins, 
  DollarSign, 
  User, 
  X, 
  Building,
  RefreshCw,
  AlertCircle,
  FileText,
  Printer,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getTimelineSteps = (deal) => {
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return '';
    }
  };

  const steps = [];

  // Step 1: Сделка создана
  steps.push({
    title: 'Сделка создана в CRM',
    desc: 'Сделка зарегистрирована в системе брокера',
    status: 'completed',
    date: formatDateTime(deal.createdAt) || 'Выполнено'
  });

  // Step 2: Документы брокера подписаны
  if (deal.refLink) {
    steps.push({
      title: 'Договор со стороны брокера подписан',
      desc: 'Реферальный смарт-контракт опубликован, документы подписаны брокером',
      status: 'completed',
      date: 'Цифровая подпись'
    });
  } else {
    steps.push({
      title: 'Подписание договора со стороны брокера',
      desc: 'Ожидается генерация реф-ссылки для активации смарт-контракта брокером',
      status: 'active',
      date: 'Нужна подпись'
    });
  }

  // Step 3: Договор инвестора подписан
  if (deal.status === 'success') {
    steps.push({
      title: 'Договор со стороны инвестора подписан',
      desc: 'Инвестор верифицировал смарт-контракт и подписал соглашение о долях',
      status: 'completed',
      date: 'Подписано'
    });
  } else if (deal.status === 'rejected') {
    steps.push({
      title: 'Договор инвестора отклонен',
      desc: 'Инвестор отклонил подписание или вышел из сделки',
      status: 'failed',
      date: 'Отклонено'
    });
  } else {
    if (deal.refLink) {
      steps.push({
        title: 'Ожидание подписи инвестора',
        desc: 'Ожидается подписание договора инвестором по реферальной ссылке',
        status: 'active',
        date: 'В ожидании'
      });
    } else {
      steps.push({
        title: 'Подписание договора со стороны инвестора',
        desc: 'Станет доступно после публикации смарт-контракта брокером',
        status: 'locked',
        date: 'Ожидание'
      });
    }
  }

  // Step 4: Оплата токенов инвестором
  if (deal.status === 'success') {
    steps.push({
      title: 'Оплата токенов инвестором',
      desc: 'Инвестор оплатил токенизированные доли недвижимости',
      status: 'completed',
      date: 'Оплачено'
    });
  } else if (deal.status === 'rejected') {
    steps.push({
      title: 'Оплата токенов отменена',
      desc: 'Транзакция отменена из-за аннулирования реферальной ссылки',
      status: 'failed',
      date: 'Отменено'
    });
  } else {
    steps.push({
      title: 'Оплата токенов инвестором',
      desc: 'Покупка токенизированных долей через децентрализованный платежный шлюз',
      status: 'locked',
      date: 'Ожидание'
    });
  }

  // Step 5: Расчет и выплата комиссии
  if (deal.status === 'success') {
    steps.push({
      title: 'Комиссия начислена',
      desc: `Комиссионные ${deal.realtorPercent}% зачислены по завершении сделки`,
      status: 'completed',
      date: 'Начислено'
    });
  } else if (deal.status === 'rejected') {
    steps.push({
      title: 'Сделка аннулирована',
      desc: 'Начисление комиссии невозможно: сделка переведена в архив',
      status: 'failed',
      date: 'В архиве'
    });
  } else {
    steps.push({
      title: 'Начисление комиссии брокера',
      desc: `Ожидается зачисление комиссионных ${deal.realtorPercent}% по завершении сделки`,
      status: 'locked',
      date: 'Ожидание'
    });
  }

  return steps;
};

export default function DealsView({
  properties = [],
  deals = [],
  dealsLoading = false,
  dealsError = '',
  onCreateDeal,
  onAddLog,
  onAddNotification,
  currentRealtor
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createPending, setCreatePending] = useState(false);
  const [showIncomeCertificateModal, setShowIncomeCertificateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'success', 'rejected'

  // Form states for creating a deal
  const [selectedPropId, setSelectedPropId] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('3.0');

  // State for copied status notification
  const [copiedId, setCopiedId] = useState(null);

  // Countdown timer trigger - forces rerenders for ticking active links
  const [timeTicker, setTimeTicker] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Copy link handler
  const handleCopyLink = (dealId, linkText) => {
    navigator.clipboard.writeText(linkText);
    setCopiedId(dealId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to check and get link countdown status.
  // Срок жизни ссылки задаёт сервер (expiresAt), локально ничего не считаем.
  const getLinkCountdownStatus = (deal) => {
    if (!deal.refLink || !deal.expiresAt) return null;
    const remainingMs = deal.expiresAt - Date.now();

    if (remainingMs <= 0) {
      return { expired: true, text: 'Истекла' };
    }

    const totalSecs = Math.floor(remainingMs / 1000);
    const totalMins = Math.floor(totalSecs / 60);
    const totalHours = Math.floor(totalMins / 60);
    const days = Math.floor(totalHours / 24);

    const remHours = totalHours % 24;
    const remMins = totalMins % 60;

    let timeText = '';
    if (days > 0) {
      timeText = `${days} д. ${remHours} ч.`;
    } else if (remHours > 0) {
      timeText = `${remHours} ч. ${remMins} мин.`;
    } else {
      const remSecs = totalSecs % 60;
      timeText = `${remMins} мин. ${remSecs} сек.`;
    }

    return { expired: false, text: `Активна (осталось ${timeText})` };
  };

  // Create new deal handler — сервер сразу возвращает сделку с реф-ссылкой.
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!selectedPropId || createPending) return;

    const property = properties.find(p => String(p.id) === String(selectedPropId));
    if (!property) return;

    setCreatePending(true);
    setCreateError('');
    try {
      await onCreateDeal(property.id, parseFloat(commissionPercent) || 3.0);
      onAddLog(`Создана реферальная сделка для объекта "${property.name}" с комиссией ${commissionPercent}%`, 'create');
      setSelectedPropId('');
      setCommissionPercent('3.0');
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err.message || 'Не удалось создать сделку.');
    } finally {
      setCreatePending(false);
    }
  };

  // Симуляция покупки инвестором убрана: реальный статус сделки (matched/expired)
  // определяет сервер, когда по реф-ссылке приходит инвестиция. Данных о конкретном
  // инвесторе, купленных токенах и сумме комиссии API не отдаёт.

  return (
    <div className="space-y-8 font-sans pb-10">
      
      {/* Header Block */}
      <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-xs text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Работа с инвесторами & реферальная сеть
          </span>
          <h1 className="text-2xl font-serif font-semibold text-gray-900 flex items-center gap-2">
            <Handshake className="text-[#A38D6D]" size={24} />
            Мои сделки
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Создавайте смарт-сделки для объектов из каталога, генерируйте реферальные ссылки для инвесторов (активны 2 недели) и отслеживайте начисление ваших брокерских комиссий.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 self-start md:self-center shrink-0">
          <button
            onClick={() => setShowIncomeCertificateModal(true)}
            className="flex items-center justify-center gap-2 cursor-pointer bg-white border border-gray-200 hover:border-[#A38D6D] text-gray-700 hover:text-[#A38D6D] px-5 py-3 rounded-sm text-xs uppercase font-bold tracking-widest transition-all shadow-xs"
          >
            <FileText size={15} className="text-[#A38D6D]" />
            <span>Справка о доходе</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 cursor-pointer bg-[#111111] hover:bg-[#A38D6D] text-white px-5 py-3 rounded-sm text-xs uppercase font-bold tracking-widest transition-all shadow-xs"
          >
            <Plus size={15} />
            <span>Новая сделка</span>
          </button>
        </div>
      </div>

      {/* Deals List */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-150 pb-4">
          <div className="text-left">
            <h3 className="font-serif text-base font-semibold text-gray-900">Активные и закрытые сделки</h3>
            <p className="text-[10px] text-gray-400">Список ваших брокерских пулов</p>
          </div>

          {/* Status filter tabs/tags */}
          <div className="flex flex-wrap items-center gap-1 bg-stone-50 p-1 rounded border border-gray-200 self-start sm:self-center">
            {[
              { id: 'all', label: 'Все сделки', count: deals.length },
              { id: 'pending', label: 'В ожидании', count: deals.filter(d => d.status === 'pending').length },
              { id: 'success', label: 'Успешно', count: deals.filter(d => d.status === 'success').length },
              { id: 'rejected', label: 'Отклоненные', count: deals.filter(d => d.status === 'rejected').length },
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`cursor-pointer px-3 py-1.5 rounded text-[9px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-[#111111] text-white shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900 bg-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#A38D6D] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {dealsError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-sm">
            {dealsError}
          </div>
        )}

        {dealsLoading ? (
          <div className="bg-white border border-dashed border-gray-200 p-12 text-center rounded-sm text-xs text-gray-400">
            Загрузка сделок из ATRIA API...
          </div>
        ) : deals.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 p-12 text-center rounded-sm">
            <Handshake size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Сделок пока нет</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Нажмите кнопку «Новая сделка» выше, чтобы выбрать объект недвижимости, задать свою комиссию и сгенерировать токенизированную ссылку для инвесторов.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-[#A38D6D] border border-gray-200 px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition-colors"
            >
              <Plus size={12} />
              <span>Создать первую сделку</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const filteredDeals = deals.filter(deal => statusFilter === 'all' || deal.status === statusFilter);
              
              if (filteredDeals.length === 0) {
                return (
                  <div className="col-span-1 md:col-span-2 bg-white border border-dashed border-gray-200 p-12 text-center rounded-sm">
                    <Handshake size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-600">Сделок со статусом «{
                      statusFilter === 'pending' ? 'В ожидании' : statusFilter === 'success' ? 'Успешно' : 'Отклоненные'
                    }» не найдено</p>
                    <p className="text-xs text-gray-400 mt-1">Попробуйте выбрать другой фильтр или создать новую сделку.</p>
                  </div>
                );
              }

              return filteredDeals.map((deal) => {
                const countdown = getLinkCountdownStatus(deal);
                const isExpired = countdown?.expired;
                // Данные объекта берём из каталога по propertyId — сделка API их не дублирует.
                const prop = properties.find(p => String(p.id) === String(deal.propertyId));
                const propName = prop?.name || 'Объект недвижимости';
                const propImage = prop?.images?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800';

                return (
                  <div 
                    key={deal.id}
                    className={`bg-white border rounded-sm p-5 space-y-4 flex flex-col justify-between transition-shadow hover:shadow-xs relative text-left ${
                      deal.status === 'success' ? 'border-emerald-100 shadow-xs' : deal.status === 'rejected' ? 'border-rose-150 bg-stone-50/10' : 'border-gray-150'
                    }`}
                  >
                    {/* Status Badge - NO delete button allowed */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      {deal.status === 'success' ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                          <CheckCircle2 size={10} />
                          Успешно
                        </span>
                      ) : deal.status === 'rejected' ? (
                        <span className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                          <X size={10} />
                          Отклонено
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                          <Clock size={10} />
                          Ожидание
                        </span>
                      )}
                    </div>

                    {/* Core Info */}
                    <div className="space-y-3.5">
                      <div className="flex gap-3 items-start pr-12">
                        <img
                          src={propImage}
                          alt={propName}
                          className="w-12 h-12 object-cover rounded-sm border border-gray-150 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1 font-mono">
                            <Building size={9} />
                            Объект недвижимости
                          </span>
                          <h4 className="text-xs font-serif font-bold text-gray-900 truncate mt-0.5" title={propName}>
                            {propName}
                          </h4>
                          {prop?.address && (
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                              {prop.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Commission Info Strip */}
                      <div className="bg-[#FBFBFA] p-3 rounded-sm border border-gray-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block text-[8px] text-gray-400 uppercase tracking-wider font-bold">Комиссия с покупки инвестора</span>
                          <span className="font-mono font-bold text-[#A38D6D] text-sm">{deal.realtorPercent}%</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-gray-400 uppercase tracking-wider font-bold">Статус выплаты</span>
                          <span className="font-semibold text-gray-700 font-mono">
                            {deal.status === 'success' ? 'Зачислено' : deal.status === 'rejected' ? 'Отклонено' : 'В ожидании'}
                          </span>
                        </div>
                      </div>

                      {/* Link Section — реф-ссылка приходит с сервера при создании сделки */}
                      {deal.status === 'pending' ? (
                        <div className="space-y-2">
                          {deal.refLink ? (
                            <div className="space-y-2">
                              {countdown && (
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-bold uppercase font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                    isExpired
                                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  }`}>
                                    <Clock size={9} />
                                    {countdown.text}
                                  </span>
                                </div>
                              )}

                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  readOnly
                                  value={deal.refLink}
                                  className={`w-full font-mono text-[9px] p-2 bg-gray-50 border border-gray-200 rounded text-gray-600 focus:outline-none ${
                                    isExpired ? 'opacity-50 line-through' : ''
                                  }`}
                                />
                                <button
                                  onClick={() => handleCopyLink(deal.id, deal.refLink)}
                                  className="cursor-pointer bg-gray-100 border border-gray-200 hover:border-gray-400 text-gray-700 p-2 rounded transition-colors"
                                  title="Копировать реф ссылку"
                                >
                                  {copiedId === deal.id ? (
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">ОК</span>
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>

                              <p className="text-[8px] text-gray-400 font-mono">
                                Сделка завершится автоматически, когда инвестор вложится по этой ссылке.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 font-mono">
                              Реферальная ссылка формируется...
                            </p>
                          )}
                        </div>
                      ) : deal.status === 'rejected' ? (
                        /* Rejected State — API отдаёт только статус, деталей инвестора нет */
                        <div className="bg-rose-50/40 p-3.5 border border-rose-100/70 rounded-sm space-y-2.5">
                          <div className="flex items-center gap-1 text-rose-800 text-[9px] font-bold uppercase tracking-wider border-b border-rose-100/50 pb-1.5">
                            <X size={12} className="text-rose-600" />
                            <span>Сделка не состоялась</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                            <div>
                              <span className="block text-[8px] text-gray-400 uppercase font-mono">Процент комиссии</span>
                              <span className="font-semibold text-gray-800 font-mono block mt-0.5">{deal.realtorPercent}%</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-rose-700 font-bold uppercase font-mono">Статус</span>
                              <span className="font-semibold text-rose-700 block mt-0.5 text-[10px]">Ссылка истекла / аннулирована</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Success State — инвестиция по ссылке подтверждена сервером */
                        <div className="bg-emerald-50/40 p-3.5 border border-emerald-100/70 rounded-sm space-y-2.5">
                          <div className="flex items-center gap-1 text-emerald-800 text-[9px] font-bold uppercase tracking-wider border-b border-emerald-100/50 pb-1.5">
                            <Coins size={12} className="text-emerald-600" />
                            <span>Инвестиция по ссылке подтверждена</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                            <div>
                              <span className="block text-[8px] text-gray-400 uppercase font-mono">Процент за сделку</span>
                              <span className="font-semibold text-gray-800 font-mono block mt-0.5">{deal.realtorPercent}%</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-emerald-700 font-bold uppercase font-mono">Статус</span>
                              <span className="font-semibold text-emerald-700 block mt-0.5 text-[10px]">Комиссия начислена</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Compliance Timeline */}
                    <div className="pt-4 border-t border-gray-150 space-y-3.5 mt-3">
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block font-mono">
                        Ход выполнения сделки • Compliance Timeline
                      </span>
                      <div className="space-y-3">
                        {getTimelineSteps(deal).map((step, sIdx, arr) => {
                          let iconBg = 'bg-stone-100 text-gray-400 border border-gray-200';
                          let iconEl = <Lock size={8} />;
                          let textColor = 'text-gray-400';
                          let descColor = 'text-gray-400';
                          let badgeStyle = 'text-gray-400 bg-stone-50 border border-stone-100';

                          if (step.status === 'completed') {
                            iconBg = 'bg-emerald-500 text-white';
                            iconEl = <CheckCircle2 size={9} />;
                            textColor = 'text-gray-800 font-medium';
                            descColor = 'text-gray-500';
                            badgeStyle = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
                          } else if (step.status === 'active') {
                            iconBg = 'bg-[#A38D6D] text-white animate-pulse';
                            iconEl = <Clock size={9} />;
                            textColor = 'text-gray-950 font-semibold';
                            descColor = 'text-gray-600';
                            badgeStyle = 'text-[#A38D6D] bg-[#A38D6D]/5 border border-[#A38D6D]/15';
                          } else if (step.status === 'failed') {
                            iconBg = 'bg-rose-500 text-white';
                            iconEl = <X size={9} />;
                            textColor = 'text-rose-900 line-through';
                            descColor = 'text-rose-600/80';
                            badgeStyle = 'text-rose-700 bg-rose-50 border border-rose-100';
                          }

                          return (
                            <div key={sIdx} className="flex gap-2.5 items-start relative text-[11px]">
                              {/* Connector Line */}
                              {sIdx < arr.length - 1 && (
                                <div className={`absolute left-2 top-4 w-[1px] h-full -ml-[0.5px] ${
                                  step.status === 'completed' && arr[sIdx+1].status !== 'locked' 
                                    ? 'bg-emerald-200' 
                                    : 'border-l border-dashed border-gray-200'
                                }`} style={{ height: 'calc(100% + 12px)' }} />
                              )}

                              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-[8px] z-10 ${iconBg}`}>
                                {iconEl}
                              </div>

                              <div className="min-w-0 flex-1 leading-normal">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <p className={`text-[11px] font-medium leading-tight ${textColor}`}>{step.title}</p>
                                  <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${badgeStyle}`}>
                                    {step.date}
                                  </span>
                                </div>
                                <p className={`text-[9px] mt-0.5 leading-relaxed ${descColor}`}>{step.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* MODAL 1: Create Deal Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-150 shadow-2xl max-w-md w-full text-left rounded-sm flex flex-col overflow-hidden"
            >
              <div className="bg-[#111111] px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold font-mono block">Маркетплейс</span>
                  <h3 className="text-sm font-serif font-bold text-white uppercase tracking-wider mt-0.5">
                    Новая реферальная сделка
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateDeal} className="p-6 space-y-4 text-xs text-gray-700">
                {createError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] p-2.5 rounded">
                    {createError}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                    Выберите объект недвижимости *
                  </label>
                  <select
                    required
                    value={selectedPropId}
                    onChange={(e) => setSelectedPropId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-[#FBFBFA]"
                  >
                    <option value="">-- Выберите объект из каталога --</option>
                    {/* Реф-сделку можно создать только на объект, открытый для инвестиций */}
                    {properties.filter(p => p.apiStatus === 'open' || !p.apiStatus).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.city ? ` (${p.city})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[8px] text-gray-400 mt-1">
                    Доступны только объекты, открытые для инвестиций.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                    Ваш комиссионный процент (%) *
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0.1" 
                      max="20" 
                      required
                      placeholder="Например: 3.5"
                      value={commissionPercent} 
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-[#FBFBFA] font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400">%</span>
                  </div>
                  <p className="text-[8px] text-gray-400 mt-1">
                    Этот процент будет использоваться для автоматического расчета начислений при токенизированных покупках.
                  </p>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-150 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="cursor-pointer bg-white border border-gray-200 hover:border-gray-400 text-gray-600 px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={createPending}
                    className="cursor-pointer bg-[#A38D6D] hover:bg-[#8e7b5e] disabled:opacity-60 disabled:cursor-wait text-white px-5 py-2 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-colors shadow-xs"
                  >
                    {createPending ? 'Создание...' : 'Создать сделку'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Income Certificate Modal */}
      <AnimatePresence>
        {showIncomeCertificateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-150 shadow-2xl max-w-2xl w-full text-left rounded-sm flex flex-col overflow-hidden my-8"
            >
              {/* Modal header with non-printable close controls */}
              <div className="bg-[#111111] px-6 py-4 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="text-[#A38D6D]" size={18} />
                  <h3 className="text-sm font-serif font-bold text-white uppercase tracking-wider">
                    Справка о доходах брокера
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 cursor-pointer bg-[#A38D6D] hover:bg-[#8e7b5e] text-white px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition-colors"
                  >
                    <Printer size={12} />
                    <span>Печать / PDF</span>
                  </button>
                  <button
                    onClick={() => setShowIncomeCertificateModal(false)}
                    className="text-white/60 hover:text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Certificate content starts here */}
              <div className="p-8 space-y-6 md:p-10 relative bg-white overflow-hidden text-gray-800" id="income-certificate">
                
                {/* Print specific CSS override */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #income-certificate, #income-certificate * {
                      visibility: visible !important;
                    }
                    #income-certificate {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                    }
                  }
                `}} />

                {/* Micro branding watermark */}
                <div className="absolute -right-12 -bottom-12 opacity-[0.03] text-stone-900 pointer-events-none select-none">
                  <Handshake size={320} />
                </div>

                {/* Headings */}
                <div className="border-b border-gray-200 pb-5 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#A38D6D] block font-mono">
                      ATRIA REAL ESTATE LTD
                    </span>
                    <h2 className="font-serif text-xl font-bold uppercase tracking-tight text-gray-900">
                      Справка о брокерском доходе
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Документ № ATR-INC-{new Date().getFullYear()}-{Math.floor(100000 + Math.random() * 900000)}
                    </p>
                  </div>
                  <div className="text-left md:text-right text-[10px] text-gray-500 font-mono space-y-0.5 leading-relaxed">
                    <p className="font-bold text-gray-700">Лицензированный брокер RWA</p>
                    <p>Atria Crypto-Property Portal</p>
                    <p>Лимассол, Кипр</p>
                    <p>support@atria-rwa.io</p>
                  </div>
                </div>

                {/* Date & Realtor Info block */}
                <div className="bg-stone-50/50 border border-stone-100 p-4 rounded-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                  <div className="space-y-1.5">
                    <span className="text-[8px] uppercase font-bold text-gray-400 font-mono block">Информация о получателе</span>
                    <p className="text-gray-900 font-semibold font-serif text-sm">
                      {currentRealtor?.name || 'Анна Демидова'}
                    </p>
                    <p className="text-gray-600">
                      Статус: <span className="font-semibold text-[#A38D6D]">Главный брокер Atria</span>
                    </p>
                    {currentRealtor?.email && (
                      <p className="text-gray-500 font-mono text-[10px]">{currentRealtor.email}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 text-left md:text-right md:justify-end flex flex-col">
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 font-mono block">Период формирования</span>
                      <p className="text-gray-900 font-medium">С 01.01.2026 по {new Date().toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 font-mono block">Дата выдачи справки</span>
                      <p className="text-gray-900 font-medium font-mono text-[11px]">{new Date().toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </div>

                {/* Table of closed deals */}
                <div className="space-y-2.5">
                  <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-gray-900">
                    Реестр успешных токенизированных сделок
                  </h4>

                  <div className="border border-gray-150 rounded-sm overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100/80 border-b border-gray-150 text-[9px] uppercase font-bold text-gray-500 font-mono">
                          <th className="p-3">Объект недвижимости</th>
                          <th className="p-3 text-right">Комиссия %</th>
                          <th className="p-3 text-right">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {deals.filter(d => d.status === 'success').length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-6 text-center text-gray-400 font-medium italic">
                              Успешных закрытых сделок за отчетный период не обнаружено.
                            </td>
                          </tr>
                        ) : (
                          deals.filter(d => d.status === 'success').map((deal, idx) => {
                            const prop = properties.find(p => String(p.id) === String(deal.propertyId));
                            return (
                              <tr key={deal.id || idx} className="hover:bg-stone-50/40">
                                <td className="p-3">
                                  <p className="font-bold text-gray-900">{prop?.name || 'Объект недвижимости'}</p>
                                  <p className="text-[9px] text-gray-400 font-mono mt-0.5">ID: {deal.id}</p>
                                </td>
                                <td className="p-3 text-right font-mono text-gray-700">
                                  {deal.realtorPercent}%
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                  Начислено
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Aggregate values & official totals block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-dashed border-gray-200">
                  <div className="text-[10px] text-gray-400 leading-relaxed space-y-1 text-left">
                    <p className="font-bold text-gray-500">Правовой статус документа:</p>
                    <p>Данная справка сформирована автоматически на основании верифицированных записей в блокчейн-реестре смарт-контрактов ATRIA RWA на дату выгрузки.</p>
                    <p>Комиссионные начисления выплачиваются в евро на зарегистрированные реквизиты брокера в течение 5 рабочих дней после закрытия пула.</p>
                  </div>

                  <div className="bg-[#A38D6D]/5 border border-[#A38D6D]/15 p-4 rounded-sm flex flex-col justify-center space-y-2 text-right">
                    <div className="flex justify-between items-center border-t border-dashed border-[#A38D6D]/30 pt-2 text-sm">
                      <span className="font-sans font-bold text-gray-900">Всего закрытых сделок:</span>
                      <span className="font-mono font-black text-emerald-700 text-base">
                        {deals.filter(d => d.status === 'success').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signature, Stamp & Seal Row */}
                <div className="pt-8 flex justify-between items-center text-xs">
                  <div className="text-left space-y-1">
                    <p className="font-bold text-gray-700 font-serif">Ответственное лицо:</p>
                    <p className="text-gray-500">Кристоф Георгиу</p>
                    <p className="text-[9px] text-gray-400 font-mono">Руководитель Compliance ATRIA</p>
                  </div>

                  {/* Aesthetic stamp vector layout */}
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    {/* The Stamp ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#A38D6D]/60 flex items-center justify-center animate-[spin_40s_linear_infinite]">
                      <div className="w-[102px] h-[102px] rounded-full border border-double border-[#A38D6D]/40" />
                    </div>
                    {/* Inner stamp content */}
                    <div className="text-center text-[#A38D6D]/80 font-mono text-[7px] leading-tight select-none rotate-12">
                      <p className="font-bold tracking-widest text-[8px] text-[#A38D6D]">ATRIA RWA</p>
                      <p className="text-[6px]">COMPLIANCE</p>
                      <p className="font-bold mt-1 text-emerald-700">APPROVED</p>
                      <p className="text-[5px] mt-0.5">{new Date().getFullYear()}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Close Button print-hidden */}
              <div className="bg-stone-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-150 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowIncomeCertificateModal(false)}
                  className="cursor-pointer bg-white border border-gray-200 hover:border-gray-400 text-gray-700 px-5 py-2 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-colors"
                >
                  Закрыть окно
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
