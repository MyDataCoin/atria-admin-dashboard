import React, { useState, useEffect } from 'react';
import { Menu, ShieldAlert, Clock, Info } from 'lucide-react';

export default function Header({ 
  onMenuToggle, 
  adminUser, 
  activePlacementsCount, 
  currency = 'USD',
  onCurrencyChange,
  sysLogsCount
}) {
  const [kgTime, setKgTime] = useState('');

  useEffect(() => {
    // Kyrgyzstan time clock tick (Asia/Bishkek)
    const updateTime = () => {
      const now = new Date();
      // Format to Asia/Bishkek timezone
      const formatted = now.toLocaleTimeString('ru-RU', {
        timeZone: 'Asia/Bishkek',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setKgTime(formatted);
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold font-mono">
              Владелец реестра • ATRIA
            </span>
          </div>
          <h2 className="text-sm font-serif italic text-gray-900 mt-1">
            Панель управления эмиссией RWA-токенов
          </h2>
        </div>
      </div>

      {/* Right side: quick indicators */}
      <div className="flex items-center gap-5 lg:gap-8 text-right">
        {/* Kyrgyzstan local time clock */}
        <div className="hidden md:flex items-center gap-2 bg-[#FBFBFA] border border-gray-100 py-1.5 px-3 rounded text-gray-500 font-mono text-[10px] tracking-wider uppercase">
          <Clock size={12} className="text-[#A38D6D]" />
          <span>БИШКЕК, KG:</span>
          <span className="font-bold text-gray-800">{kgTime}</span>
        </div>

        {/* Currency Display */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
            Валюта отчетов
          </span>
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-gray-800 py-0.5">
            KGS (с)
          </span>
        </div>

        {/* Active Stats readout */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
            Регистрация RWA
          </span>
          <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            {activePlacementsCount} АКТИВНЫХ ВЫПУСКОВ
          </span>
        </div>

        {/* Security / Whitelist Quick info */}
        <div className="hidden lg:flex flex-col items-end border-l border-gray-100 pl-6 text-left">
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-[#A38D6D]" />
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
              Безопасность
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-700 font-semibold">
            KYC Smart Whitelist
          </span>
        </div>
      </div>
    </header>
  );
}
