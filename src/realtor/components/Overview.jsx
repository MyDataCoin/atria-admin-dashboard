import React from 'react';
import { 
  Building, 
  Users,
  DollarSign,
  ArrowUpRight, 
  MessageSquare,
  Bell,
  Activity,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import PropertiesList from './PropertiesList';

export default function Overview({
  properties = [],
  investorCount = null,
  deals = [],
  notifications = [],
  realtorActions = [],
  onNavigate,
  onAddPropertyClick,
  onPropertySelect,
  setProperties,
  onAddLog,
  currentRealtor,
  onAddNotification,
  selectedPropId,
  setSelectedPropId
}) {

  // Calculate dynamic stats from properties list
  const totalCount = properties.length;

  // Заработок риелтора = сумма комиссий по успешным сделкам.
  // API пока не отдаёт сумму комиссии (в сделке только процент), поэтому
  // фактически выходит 0 сом, пока данных нет. Считаем честно, без выдумки.
  const totalCommissionEarned = deals
    .filter((d) => d.status === 'success')
    .reduce((sum, d) => sum + Number(d.commissionEarned || 0), 0);

  // Всё показываем в сомах (KGS).
  const formatMoney = (val) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KGS', maximumFractionDigits: 0 })
      .format(val || 0)
      .replace('KGS', 'сом');
  };

  const statCards = [
    {
      id: 'total',
      label: 'Всего объектов',
      value: totalCount,
      icon: Building,
      desc: 'Объекты в управлении Atria',
      subtext: 'Актуальные позиции',
      color: 'border-l-4 border-neutral-600',
      bg: 'bg-neutral-50/30'
    },
    {
      id: 'investors',
      label: 'База инвесторов',
      // Реальное число из ATRIA API; «—» пока грузится или если недоступно.
      value: investorCount != null ? investorCount.toLocaleString('ru-RU') : '—',
      icon: Users,
      desc: 'Зарегистрировано в целом',
      subtext: 'По данным ATRIA API',
      color: 'border-l-4 border-amber-500',
      bg: 'bg-amber-50/10'
    },
    {
      id: 'volume',
      label: 'Заработано комиссий',
      value: formatMoney(totalCommissionEarned),
      icon: DollarSign,
      desc: 'По успешным сделкам',
      subtext: 'Начислено риелтору',
      color: 'border-l-4 border-emerald-500',
      bg: 'bg-emerald-50/10'
    }
  ];

  return (
    <div className="space-y-8 font-sans">
      
      {/* Welcome Banner */}
      <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Резюме деятельности
          </span>
          <h1 className="text-2xl font-serif font-semibold text-gray-900">
            Кабинет Подачи объектов & CRM
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Управляйте портфелем недвижимости для токенизации RWA. Подавайте новые виллы, коммерческие объекты и бутик-отели, загружайте юридические/оценочные документы, отслеживайте комплаенс-статусы и отвечайте на запросы управляющей компании в режиме реального времени.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('notifications')}
            className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 hover:border-[#A38D6D] text-gray-800 hover:text-[#A38D6D] px-4 py-2.5 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            <Bell size={13} className="text-gray-400" />
            <span>Уведомления</span>
          </button>
        </div>
      </div>

      {/* 3 Statistics Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`bg-white p-5 rounded-sm border border-gray-100 shadow-xs flex flex-col justify-between min-h-[130px] text-left relative overflow-hidden ${card.bg} ${card.color}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[8px] uppercase tracking-[0.15em] text-gray-400 font-bold block leading-snug">
                  {card.label}
                </span>
                <div className="text-gray-400 shrink-0">
                  <Icon size={14} />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-2xl font-bold text-[#1A1A1A] block font-mono leading-none">
                  {card.value}
                </span>
                <div className="mt-1 flex flex-col">
                  <span className="text-[9px] font-semibold text-gray-700 truncate">{card.desc}</span>
                  <span className="text-[8px] text-gray-400 mt-0.5 font-mono">{card.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Catalog of all properties directly on the main page */}
      <div className="border-t border-gray-100 pt-8">
        <PropertiesList 
          properties={properties}
          deals={deals}
          setProperties={setProperties}
          onAddLog={onAddLog}
          currentRealtor={currentRealtor}
          onAddNotification={onAddNotification}
          selectedPropId={selectedPropId}
          setSelectedPropId={setSelectedPropId}
        />
      </div>
    </div>
  );
}
