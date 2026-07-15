import React, { useState, useEffect } from 'react';
import { Menu, Clock, Building } from 'lucide-react';

export default function Header({
  onMenuToggle,
  adminUser, // represents current realtor
  propertiesCount = 0,
  dealsCount = 0
}) {
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setLocalTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-35 shrink-0">
      {/* Left side: mobile toggle & greeting title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#1A1A1A] hover:bg-[#F3F3F1] rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
          id="mobile-menu-toggle"
        >
          <Menu size={22} />
        </button>
        
        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-[#A38D6D] font-bold font-mono">
              Кабинет партнера • ATRIA REAL ESTATE
            </span>
          </div>
          <h2 className="text-sm font-serif italic text-gray-900 mt-1">
            Здравствуйте, {adminUser ? adminUser.name : 'Риелтор'}
          </h2>
        </div>
      </div>

      {/* Right side: quick indicators */}
      <div className="flex items-center gap-5 lg:gap-8 text-right">
        {/* Local time clock */}
        <div className="hidden md:flex items-center gap-2 bg-[#FBFBFA] border border-gray-100 py-1.5 px-3 rounded text-gray-500 font-mono text-[10px] tracking-wider uppercase">
          <Clock size={12} className="text-[#A38D6D]" />
          <span>ПОРТАЛ:</span>
          <span className="font-bold text-gray-800">{localTime}</span>
        </div>

        {/* Total Properties Indicator */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
            Всего объектов
          </span>
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-gray-800 py-0.5 px-2 bg-gray-50 rounded border border-gray-100">
            {propertiesCount}
          </span>
        </div>

        {/* Мои сделки — сумму дохода API не отдаёт, показываем число сделок */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
            Мои сделки
          </span>
          <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
            {dealsCount.toLocaleString('ru-RU')}
          </span>
        </div>

      </div>
    </header>
  );
}
