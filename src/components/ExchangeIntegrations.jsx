import React, { useState } from 'react';
import { 
  LineChart, 
  Share2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Globe, 
  FileCheck, 
  Terminal,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatVal } from '../utils';

export default function ExchangeIntegrations({ 
  integrations, 
  setIntegrations, 
  onAddLog 
}) {
  const [syncingId, setSyncingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});

  const handleToggleIntegration = (intId) => {
    const matched = integrations.find(i => i.id === intId);
    const wasActive = matched?.status === 'connected';
    const newStatus = wasActive ? 'disconnected' : 'connected';

    const updated = integrations.map(i => {
      if (i.id === intId) {
        return { ...i, status: newStatus };
      }
      return i;
    });
    setIntegrations(updated);

    onAddLog(
      wasActive ? 'Integration Offline' : 'Integration Online',
      `Связь с системой "${matched?.name}" ${wasActive ? 'ПРИОСТАНОВЛЕНА' : 'УСПЕШНО НАСТРОЕНА'}.`
    );
  };

  const handleRunSync = (intId) => {
    const matched = integrations.find(i => i.id === intId);
    setSyncingId(intId);
    
    // Simulate real server websocket syncing
    setTimeout(() => {
      setSyncingId(null);
      setSyncStatus({ ...syncStatus, [intId]: 'Синхронизация завершена. 0 ошибок.' });
      onAddLog(
        'Integration Synced',
        `Проведена принудительная синхронизация ордеров и вайтлистов с системой "${matched?.name}".`
      );
      
      // Clear msg after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => {
          const cpy = { ...prev };
          delete cpy[intId];
          return cpy;
        });
      }, 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Title banner */}
      <div>
        <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
          Ликвидность & Вторичные биржевые рынки
        </span>
        <h2 className="text-xl font-serif font-bold text-gray-900">
          Внешние Интеграции & Шлюзы Ордеров
        </h2>
      </div>

      {/* Block telemetry and statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-5 rounded-sm shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold font-mono">Blockchain Node Telemetry</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xl font-bold font-mono text-gray-900 block mt-2">ETH-Mainnet / Arb-1</span>
          <span className="text-[10px] text-gray-500 font-mono mt-1 block">Текущая высота блока: #20,192,822 (Цуг Нода)</span>
        </div>

        <div className="bg-white border border-gray-100 p-5 rounded-sm shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold font-mono">FIX Protocol Gateways</span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">ONLINE</span>
          </div>
          <span className="text-xl font-bold font-mono text-gray-900 block mt-2">FIX 4.4 Feed</span>
          <span className="text-[10px] text-gray-500 font-mono mt-1 block">Задержка пинга: 4 мс • Поток маркетмейкеров</span>
        </div>

        <div className="bg-white border border-gray-100 p-5 rounded-sm shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold font-mono">Whitelist Syncer Pool</span>
            <span className="text-[9px] font-bold text-gray-400">SYNCED</span>
          </div>
          <span className="text-xl font-bold font-mono text-gray-900 block mt-2">148 кошельков</span>
          <span className="text-[10px] text-gray-500 font-mono mt-1 block">Все KYC-verified инвесторы синхронизированы в сети</span>
        </div>
      </div>

      {/* Integrations Table */}
      <div className="bg-white border border-gray-100 rounded-sm overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-150">
          <h3 className="text-sm font-serif font-bold text-gray-900">Подключенные торговые терминалы и шлюзы</h3>
        </div>

        <div className="divide-y divide-gray-50">
          {integrations.map((int) => {
            const isConnected = int.status === 'connected';
            const isSyncing = syncingId === int.id;
            
            return (
              <div key={int.id} className="p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hover:bg-gray-50/50 transition-colors text-left">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded bg-[#FAF8F3]/80 border flex items-center justify-center text-[#A38D6D] shrink-0 ${
                    isConnected ? 'border-[#A38D6D]' : 'border-gray-200 opacity-60'
                  }`}>
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 font-serif leading-tight">{int.name}</h4>
                      <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        isConnected ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isConnected ? 'Связь активна' : 'Отключено'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 max-w-xl">{int.description}</p>
                    <span className="text-[9px] text-gray-400 font-mono block mt-1.5 uppercase">Тип: {int.type} • Токен синхронизации: {int.apiKeyMask}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-2 shrink-0">
                  <div className="flex gap-2">
                    {isConnected && (
                      <button
                        onClick={() => handleRunSync(int.id)}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#A38D6D] hover:text-[#A38D6D] text-gray-700 px-3 py-1.5 rounded text-[9px] uppercase font-bold tracking-widest font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{isSyncing ? 'Синхронизация...' : 'Синхронизировать'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleIntegration(int.id)}
                      className={`text-[9px] uppercase font-bold tracking-widest py-1.5 px-3 rounded cursor-pointer transition-all ${
                        isConnected 
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                          : 'bg-[#111111] hover:bg-[#A38D6D] text-white'
                      }`}
                    >
                      {isConnected ? 'Отключить связь' : 'Подключить'}
                    </button>
                  </div>

                  {syncStatus[int.id] && (
                    <span className="text-[8px] font-mono font-bold text-emerald-600 block mt-1 text-center md:text-right">
                      {syncStatus[int.id]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* compliance and system guidelines warning block */}
      <section className="bg-[#111111] text-white p-5 rounded-sm">
        <div className="flex items-start gap-4">
          <Terminal className="text-[#A38D6D] shrink-0 mt-0.5" size={16} />
          <div className="space-y-1.5">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-[#A38D6D]">
              СИСТЕМА БИРЖЕВОГО АВТОМАТА (ROUTING ENGINES)
            </h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Вторичное обращение токенов RWA строго лимитировано: все ордера на продажу и покупку, поступающие через шлюзы FIX, проходят обязательный пре-комплаенс контроль. Смарт-контракты автоматически аннулируют сделки, если хотя бы один из участников не имеет верифицированного статуса в децентрализованном смарт вайтлисте.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
