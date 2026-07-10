import React, { useState } from 'react';
import { 
  Building, 
  Coins, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  Send, 
  ShieldCheck, 
  Plus, 
  Activity,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatVal } from '../utils';

export default function Overview({ 
  stats, 
  properties, 
  placements, 
  payouts, 
  currency = 'USD',
  onNavigate,
  onAddLog
}) {
  const [showQuickNotify, setShowQuickNotify] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyGroup, setNotifyGroup] = useState('all');
  const [notifyContent, setNotifyContent] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  const [showQuickAudit, setShowQuickAudit] = useState(false);
  const [auditWallet, setAuditWallet] = useState('');
  const [auditResult, setAuditResult] = useState(null);

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

  const handleRunKYCAudit = (e) => {
    e.preventDefault();
    if (!auditWallet) return;

    // Simulate smart contract and sanction lookup
    const isPEP = auditWallet.toLowerCase().includes('pep') || auditWallet.startsWith('0x8823');
    const isSanctioned = auditWallet.toLowerCase().includes('sdn') || auditWallet.startsWith('0xf8e') || auditWallet.startsWith('0x8823');
    
    let score = 'Passed';
    let msg = 'Кошелек успешно прошел проверку. Подозрительной активности в смарт-контрактах RWA не обнаружено.';
    let level = 'green';

    if (isSanctioned) {
      score = 'Sanction Blocked';
      msg = 'ВНИМАНИЕ: Адрес совпал со списком SDN OFAC / Секторальными санкциями SECO Switzerland!';
      level = 'red';
    } else if (isPEP) {
      score = 'PEP Flagged';
      msg = 'ВНИМАНИЕ: Адрес классифицирован как кошелек Политически Значимого Лица (PEP) или родственников первой линии.';
      level = 'yellow';
    }

    setAuditResult({
      wallet: auditWallet,
      score,
      msg,
      level,
      date: new Date().toLocaleString('ru-RU')
    });

    onAddLog(
      'KYC/AML Wallet Audit Run',
      `Проведен скрининг адреса ${auditWallet.substring(0, 10)}... Результат: ${score}`
    );
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
      value: formatVal(stats.totalInvestedVolume, currency),
      icon: Coins,
      desc: 'Привлеченный капитал',
      subtext: `Ср. доходность ${stats.averageYieldRoi.toFixed(2)}% ROI`,
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

  // Visual simulated chart data points
  const points = [120, 180, 150, 290, 210, 310, 420];
  const chartWidth = 500;
  const chartHeight = 120;
  // Calculate SVG line path
  const svgPath = points.map((p, i) => {
    const x = (i / (points.length - 1)) * chartWidth;
    const y = chartHeight - (p / 450) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const svgArea = `${svgPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

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
          
          <button
            onClick={() => setShowQuickAudit(true)}
            className="flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 hover:border-[#A38D6D] text-gray-800 hover:text-[#A38D6D] px-3.5 py-2 rounded text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            <ShieldCheck size={11} />
            <span>Экспресс AML-скрининг</span>
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

      {/* AML Express Audit Modal */}
      <AnimatePresence>
        {showQuickAudit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-xl max-w-lg w-full p-6 text-left relative rounded-sm"
            >
              <div className="border-b border-gray-150 pb-3 mb-4 flex justify-between items-start">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-rose-700 font-bold block">Комплаенс и Санкции</span>
                  <h3 className="text-lg font-serif font-bold text-gray-900 mt-0.5 font-sans">Экспресс-проверка адреса AML/PEP</h3>
                </div>
                <button 
                  onClick={() => { setShowQuickAudit(false); setAuditResult(null); setAuditWallet(''); }}
                  className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  Закрыть
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Быстрый скрининг криптокошельков на принадлежность к санкционным спискам (OFAC, SECO, EU, UN) и PEP-базам.
                </p>

                <form onSubmit={handleRunKYCAudit} className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      required
                      placeholder="Вставьте HEX-адрес кошелька (0x...) или имя"
                      value={auditWallet}
                      onChange={(e) => setAuditWallet(e.target.value)}
                      className="flex-1 text-xs p-2.5 border border-gray-200 rounded font-mono bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                    />
                    <button
                      type="submit"
                      className="bg-[#111111] hover:bg-[#A38D6D] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded transition-all cursor-pointer"
                    >
                      Проверить
                    </button>
                  </div>
                  <div className="flex gap-4 text-[9px] text-gray-400 font-mono">
                    <span className="cursor-pointer underline" onClick={() => setAuditWallet('0x8823FB819DC2C182A9C0E3A20B19A2D0E8B19B27')}>Пример PEP (Амаль)</span>
                    <span className="cursor-pointer underline" onClick={() => setAuditWallet('0xf8E12A109D439CE230D8D902B3019A82C0E1B098')}>Пример Санкций (SDN)</span>
                    <span className="cursor-pointer underline" onClick={() => setAuditWallet('0x7F2C9A3F3B4E1D8B8D2A4F6E6B1c2D3e4F5a6B7c')}>Чистый адрес (Жан-Пьер)</span>
                  </div>
                </form>

                {auditResult && (
                  <div className={`p-4 border rounded ${
                    auditResult.level === 'green' ? 'bg-emerald-50 border-emerald-200' :
                    auditResult.level === 'yellow' ? 'bg-amber-50 border-amber-200' :
                    'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold font-mono tracking-wider truncate max-w-[250px]">
                        Адрес: {auditResult.wallet}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        auditResult.level === 'green' ? 'bg-emerald-100 text-emerald-800' :
                        auditResult.level === 'yellow' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {auditResult.score}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      auditResult.level === 'green' ? 'text-emerald-900' :
                      auditResult.level === 'yellow' ? 'text-amber-900' :
                      'text-rose-900'
                    } leading-relaxed font-semibold`}>
                      {auditResult.msg}
                    </p>
                    <div className="mt-3 pt-2 border-t border-black/5 text-[8px] text-gray-400 font-mono flex justify-between">
                      <span>База данных: Refinitiv World-Check / Chainalysis API</span>
                      <span>Дата: {auditResult.date}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid: Investment Trends & Fast placements summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Investment Growth Chart (Bento box 1) */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs text-left lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <div>
                <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Динамика притока средств</span>
                <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">
                  Тренды капитализации платформы
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-600 font-mono bg-emerald-50 px-2.5 py-1 rounded">
                +14.2% Ср./мес
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Динамика привлечения средств в инвестиционные пулы оферт за последние 6 месяцев (в миллионах USD).
            </p>

            {/* Simulated Custom High Fidelity SVG Chart */}
            <div className="mt-6 relative">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-[150px] overflow-visible"
              >
                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#F1F1ED" strokeDasharray="4 4" />
                <line x1="0" y1="60" x2={chartWidth} y2="60" stroke="#F1F1ED" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="#F1F1ED" strokeDasharray="4 4" />

                {/* Fill area */}
                <path d={svgArea} fill="url(#chartGrad)" opacity="0.15" />

                {/* Stroke line path */}
                <path d={svgPath} fill="none" stroke="#A38D6D" strokeWidth="2.5" />

                {/* Data point circles */}
                {points.map((p, i) => {
                  const x = (i / (points.length - 1)) * chartWidth;
                  const y = chartHeight - (p / 450) * chartHeight;
                  return (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={x} cy={y} r="4" fill="#A38D6D" />
                      <circle cx={x} cy={y} r="8" fill="transparent" stroke="#A38D6D" strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </g>
                  );
                })}

                {/* Definitions */}
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A38D6D" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                </defs>
              </svg>

              {/* X Axis labels */}
              <div className="flex justify-between text-[8px] text-gray-400 font-mono mt-3 uppercase tracking-wider">
                <span>Январь ($1.2M)</span>
                <span>Февраль ($1.8M)</span>
                <span>Март ($1.5M)</span>
                <span>Апрель ($2.9M)</span>
                <span>Май ($2.1M)</span>
                <span>Июнь ($3.1M)</span>
                <span>Июль ($4.2M)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span className="flex items-center gap-1">
              <FileCheck size={12} className="text-[#A38D6D]" />
              Все данные защищены аудитом Ernst & Young
            </span>
          </div>
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

          <div className="pt-4 border-t border-gray-100 text-center">
            <button
              onClick={() => onNavigate('offerings')}
              className="w-full py-2 border border-dashed border-gray-300 hover:border-[#A38D6D] hover:text-[#A38D6D] text-gray-500 rounded text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer"
            >
              Управлять офертами и возвратами средств →
            </button>
          </div>
        </div>

      </div>

      {/* Low-Priority State Indicators - Compliance reassurance block */}
      <section className="bg-[#111111] text-white p-6 rounded-sm text-left">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#A38D6D]" />
              <span className="text-[9px] tracking-wider font-mono uppercase text-[#A38D6D] font-bold">
                СМАРТ-КОНТРАКТЫ И ГАРАНТИИ
              </span>
            </div>
            <h4 className="text-sm font-serif text-white font-medium">Белый список (Whitelist) и Эмиссия</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Все криптоадреса покупателей автоматически верифицируются через API-интеграцию с провайдерами KYC. Незарегистрированные кошельки блокируются на уровне смарт-контракта Ethereum/Arbitrum.
            </p>
          </div>

          <div className="space-y-1 md:border-l md:border-white/10 md:pl-6">
            <div className="flex items-center gap-2">
              <Building size={14} className="text-[#A38D6D]" />
              <span className="text-[9px] tracking-wider font-mono uppercase text-[#A38D6D] font-bold">
                ЗАЛОГОВОЕ ОБЕСПЕЧЕНИЕ
              </span>
            </div>
            <h4 className="text-sm font-serif text-white font-medium">Администрирование залога</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Выпуски токенизированных долей имеют 100% залоговое покрытие реальным имуществом, зафиксированное в Кадастровой палате под управлением независимого попечителя (Pledge Trustee).
            </p>
          </div>

          <div className="space-y-1 md:border-l md:border-white/10 md:pl-6">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#A38D6D]" />
              <span className="text-[9px] tracking-wider font-mono uppercase text-[#A38D6D] font-bold">
                БЕЗУПРЕЧНЫЙ ЛОГ АУДИТА
              </span>
            </div>
            <h4 className="text-sm font-serif text-white font-medium">Защита от изменений</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Действия администраторов логируются в локальный неизменяемый журнал (Audit Log), дублирующийся на выделенный сервер соответствия стандартам финансового контроля.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
