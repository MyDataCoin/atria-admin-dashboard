import React from 'react';
import { Award, Calendar, ArrowUpRight, CheckSquare, MapPin, Building } from 'lucide-react';
import { motion } from 'motion/react';

export default function PublishedList({ 
  properties = [], 
  onInspectProperty,
  deals = []
}) {
  const publishedProperties = properties.filter(p => p.status === 'published');

  // Объекты приходят в своей валюте (KGS) — форматируем в сомах.
  const formatMoney = (val, currency = 'KGS') => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(val || 0)
      .replace('KGS', 'сом')
      .replace('EUR', '€');
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Реестр отправленных RWA активов
          </span>
          <h1 className="text-2xl font-serif font-semibold text-gray-900">
            Отправленные объекты
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Список объектов недвижимости, которые отправлены управляющей компании на проверку и верификацию.
          </p>
        </div>

        <div className="bg-[#A38D6D]/15 border border-[#A38D6D]/30 py-2 px-4 rounded flex items-center gap-2 shrink-0">
          <Award size={18} className="text-[#A38D6D]" />
          <div className="text-left">
            <span className="text-[8px] uppercase font-bold text-[#A38D6D] block font-mono">Всего на платформе</span>
            <span className="font-mono text-sm font-bold text-gray-900">{publishedProperties.length} ОБЪЕКТОВ</span>
          </div>
        </div>
      </div>

      {/* Grid of Published items */}
      {publishedProperties.length === 0 ? (
        <div className="bg-white border border-gray-100 py-24 rounded-sm text-center text-gray-400 text-xs">
          <CheckSquare size={28} className="mx-auto mb-3 text-gray-300" />
          В данный момент на платформе нет отправленных вами объектов. Подайте объект в разделе «Мои объекты».
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publishedProperties.map((prop) => {
            const mainImg = prop.images?.[0] || prop.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800';

            // Calculate dynamic RWA Token metrics
            const totalTokens = Math.floor(prop.price / 100);
            let baseSold = 0;
            if (prop.status === 'published' || prop.status === 'approved' || prop.status === 'review') {
              const charSum = prop.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const basePercent = 40 + (charSum % 45); // 40% to 85%
              baseSold = Math.floor((totalTokens * basePercent) / 100);
            }
            const dealSold = (deals || []).filter(d => d.propertyId === prop.id && d.status === 'success').reduce((sum, d) => sum + (d.tokensBought || 0), 0);
            const soldTokens = Math.min(baseSold + dealSold, totalTokens);
            const availableTokens = totalTokens - soldTokens;
            const soldPercent = totalTokens > 0 ? (soldTokens / totalTokens) * 100 : 0;

            return (
              <div 
                key={prop.id}
                className="bg-white border border-gray-100 rounded-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-[#A38D6D] transition-all text-left"
              >
                {/* Visual Header */}
                <div className="relative h-44 bg-gray-100">
                  <img 
                    src={mainImg} 
                    alt={prop.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  
                  <div className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-mono font-bold uppercase px-2.5 py-1 rounded">
                    Отправлен
                  </div>

                  <div className="absolute bottom-3 left-4 text-white">
                    <span className="text-[8px] uppercase tracking-widest font-mono text-[#A38D6D] font-bold bg-[#111111]/80 px-2 py-0.5 rounded">
                      {prop.type}
                    </span>
                    <h3 className="font-serif text-sm font-bold mt-1.5 line-clamp-1">
                      {prop.name}
                    </h3>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-gray-400 text-[10px] font-mono">
                      <MapPin size={10} className="text-[#A38D6D]" />
                      <span className="truncate">{prop.address || 'Не указан'}, {prop.city}, {prop.country}</span>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {prop.description}
                    </p>
                  </div>

                  <div className="space-y-3.5 border-t border-gray-100 pt-3.5">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Стоимость</span>
                        <span className="font-mono text-xs font-bold text-gray-900">{formatMoney(prop.price)}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Полезная площадь</span>
                        <span className="font-mono text-xs font-semibold text-gray-800">{prop.area} кв.м</span>
                      </div>
                    </div>

                    {/* Tokenization dynamic metrics */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-dashed border-gray-100 pt-2.5">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Цена токена</span>
                        <span className="font-mono text-[11px] font-bold text-[#A38D6D]">
                          {formatMoney(prop.tokenPrice, prop.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Уже выкуплено</span>
                        <span className="font-mono text-[10px] font-bold text-gray-700">
                          {soldTokens.toLocaleString('ru-RU')} / {totalTokens.toLocaleString('ru-RU')} RWA
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] uppercase font-bold text-gray-400 font-mono">
                        <span>Продано долей</span>
                        <span className="text-[#A38D6D] font-bold">{soldPercent.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-150/50">
                        <div 
                          className="bg-[#A38D6D] h-full rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(soldPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Publication details */}
                    <div className="flex items-center justify-between text-[10px] bg-gray-50 border border-gray-100/60 p-2 rounded-sm">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar size={11} className="text-gray-400" />
                        <span>Дата отправки:</span>
                      </div>
                      <span className="font-mono font-bold text-gray-800">
                        {prop.publishedAt || '2026-06-20'}
                      </span>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => onInspectProperty(prop)}
                      className="w-full py-2 bg-gray-900 hover:bg-[#A38D6D] text-white text-[9px] uppercase font-bold tracking-widest transition-all rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Перейти к деталям и чату</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
