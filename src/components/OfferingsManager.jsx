import React, { useState } from 'react';
import { 
  Coins, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  Flame, 
  Plus, 
  Users, 
  FileCheck, 
  ShieldCheck, 
  Compass,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatVal } from '../utils';

export default function OfferingsManager({ 
  placements, 
  setPlacements,
  properties,
  currency = 'USD',
  onAddLog
}) {
  const [selectedPlc, setSelectedPlc] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOffering, setNewOffering] = useState({
    propertyId: '',
    targetAmount: 500000,
    tokenPrice: 50,
    description: '',
    whitelistRequired: true,
  });

  const [activeTab, setActiveTab] = useState('all'); // all, active, completed, draft

  const handleCreateOffering = (e) => {
    e.preventDefault();
    if (!newOffering.propertyId) return;

    const matchedProp = properties.find(p => p.id === newOffering.propertyId);
    if (!matchedProp) return;

    const added = {
      id: `place-${Date.now().toString().slice(-4)}`,
      propertyId: newOffering.propertyId,
      propertyName: matchedProp.name,
      targetAmount: Number(newOffering.targetAmount),
      raisedAmount: 0,
      tokenSupply: Math.round(newOffering.targetAmount / newOffering.tokenPrice),
      tokenPrice: Number(newOffering.tokenPrice),
      status: 'draft',
      launchDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      investorsCount: 0,
      description: newOffering.description || `Публичное предложение долей для объекта ${matchedProp.name}.`,
      whitelistRequired: newOffering.whitelistRequired
    };

    setPlacements([...placements, added]);
    onAddLog(
      'New Offering Drafted',
      `Создано новое размещение для "${matchedProp.name}" с целевым капиталом ${formatVal(added.targetAmount, currency)}.`
    );
    setShowCreateModal(false);
  };

  const handleUpdateStatus = (id, newStatus) => {
    const matched = placements.find(p => p.id === id);
    const updated = placements.map(p => {
      if (p.id === id) {
        return { ...p, status: newStatus };
      }
      return p;
    });
    setPlacements(updated);

    onAddLog(
      'Offering Status Modified',
      `Статус размещения "${matched?.propertyName}" (Код: ${id}) изменен на [${newStatus.toUpperCase()}].`
    );

    // Sync state for detailed card
    if (selectedPlc && selectedPlc.id === id) {
      setSelectedPlc({ ...selectedPlc, status: newStatus });
    }
  };

  // Process investor refund (failed placement)
  const handleTriggerRefund = (plcId) => {
    const matched = placements.find(p => p.id === plcId);
    const updated = placements.map(p => {
      if (p.id === plcId) {
        return { ...p, status: 'failed', raisedAmount: 0, investorsCount: 0 };
      }
      return p;
    });
    setPlacements(updated);

    onAddLog(
      'Offering Refund Triggered',
      `ЗАПУЩЕН ВОЗВРАТ СРЕДСТВ ИНВЕСТОРАМ по несостоявшемуся размещению "${matched?.propertyName}". Объем возвратов: ${formatVal(matched?.raisedAmount || 0, currency)}.`
    );

    if (selectedPlc && selectedPlc.id === plcId) {
      setSelectedPlc({ ...selectedPlc, status: 'failed', raisedAmount: 0, investorsCount: 0 });
    }
  };

  // Process Token Burn / Repurchase (buyback after estate sale)
  const handleTokenBurn = (plcId) => {
    const matched = placements.find(p => p.id === plcId);
    const updated = placements.map(p => {
      if (p.id === plcId) {
        return { ...p, status: 'completed', raisedAmount: 0, investorsCount: 0 };
      }
      return p;
    });
    setPlacements(updated);

    onAddLog(
      'Token Burn & Buyback Run',
      `Запущена процедура сжигания (burn) и обратного выкупа токенов для "${matched?.propertyName}". Токены RWA изъяты из обращения.`
    );

    if (selectedPlc && selectedPlc.id === plcId) {
      setSelectedPlc({ ...selectedPlc, status: 'completed', raisedAmount: 0, investorsCount: 0 });
    }
  };

  const filteredPlacements = () => {
    if (activeTab === 'all') return placements;
    return placements.filter(p => p.status === activeTab);
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Управление офертами и офертными пулами
          </span>
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Инвестиционные Размещения & Эмиссии токенов
          </h2>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#A38D6D] text-white px-4 py-2.5 rounded text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer"
        >
          <Plus size={12} />
          <span>Создать размещение</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 gap-6 text-xs font-semibold uppercase tracking-wider font-mono">
        {[
          { id: 'all', label: 'Все выпуски' },
          { id: 'active', label: 'Активные' },
          { id: 'paused', label: 'Приостановленные' },
          { id: 'completed', label: 'Закрытые' },
          { id: 'draft', label: 'Черновики' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 border-b-2 text-[10px] transition-all cursor-pointer ${
              activeTab === tab.id ? 'border-[#A38D6D] text-[#A38D6D] font-bold' : 'border-transparent text-gray-400 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of placements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPlacements().map((plc) => {
          const pct = Math.min(100, (plc.raisedAmount / plc.targetAmount) * 100);
          return (
            <div
              key={plc.id}
              onClick={() => setSelectedPlc(plc)}
              className="bg-white border border-gray-100 hover:border-[#A38D6D] p-5 rounded-sm shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-mono uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                    Код: {plc.id.toUpperCase()}
                  </span>
                  <h3 className="text-sm font-serif font-bold text-gray-900 mt-1 leading-tight">
                    {plc.propertyName}
                  </h3>
                </div>

                <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  plc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  plc.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  plc.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  plc.status === 'draft' ? 'bg-gray-50 text-gray-700 border border-gray-100' :
                  'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {plc.status === 'active' ? 'Выпуск идет' : 
                   plc.status === 'paused' ? 'Приостановлен' : 
                   plc.status === 'completed' ? 'Завершен' : 
                   plc.status === 'draft' ? 'Черновик' : 'Несостоялся'}
                </span>
              </div>

              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {plc.description}
              </p>

              {/* Progress metrics */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-mono text-[10px] text-gray-500">
                  <span>Объем сборов:</span>
                  <span className="font-bold text-gray-800">
                    {formatVal(plc.raisedAmount, currency)} / {formatVal(plc.targetAmount, currency)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded overflow-hidden">
                  <div 
                    className="h-full bg-[#A38D6D] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-gray-400 pt-1">
                  <span>Инвесторов: {plc.investorsCount} чел.</span>
                  <span>Цель достигнута: {pct.toFixed(1)}%</span>
                </div>
              </div>

              {/* Dates & Quick Spec */}
              <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                <span>Старт: {plc.launchDate}</span>
                <span>Конец: {plc.endDate}</span>
              </div>
            </div>
          );
        })}
        {filteredPlacements().length === 0 && (
          <p className="text-xs text-gray-400 italic py-8 text-center col-span-2">
            Нет инвестиционных размещений в этой вкладке.
          </p>
        )}
      </div>

      {/* DETAILED MODAL OVERLAY */}
      <AnimatePresence>
        {selectedPlc && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-2xl max-w-lg w-full p-6 text-left relative rounded-sm"
            >
              <div className="border-b border-gray-150 pb-3 mb-4 flex justify-between items-start">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Паспорт размещения</span>
                  <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">{selectedPlc.propertyName}</h3>
                </div>
                <button 
                  onClick={() => setSelectedPlc(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-gray-500 leading-relaxed">
                  {selectedPlc.description}
                </p>

                <div className="bg-[#FAF8F3]/60 p-4 border border-gray-100 rounded grid grid-cols-2 gap-x-4 gap-y-2 font-mono">
                  <div>
                    <span className="text-[8px] uppercase text-gray-400 block font-semibold">Идентификатор</span>
                    <span className="text-gray-800 font-bold font-serif">{selectedPlc.id.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase text-gray-400 block font-semibold">Цена за ATR токен</span>
                    <span className="text-gray-800 font-bold">{formatVal(selectedPlc.tokenPrice, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase text-gray-400 block font-semibold">Общая эмиссия токенов</span>
                    <span className="text-gray-800 font-bold">{selectedPlc.tokenSupply.toLocaleString()} токенов</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase text-gray-400 block font-semibold">Квалификация Whitelist</span>
                    <span className="text-emerald-700 font-bold uppercase text-[9px] flex items-center gap-1">
                      <ShieldCheck size={11} /> KYC Smart Whitelist
                    </span>
                  </div>
                </div>

                {/* Offering controls */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">Административные команды</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPlc.status === 'paused' || selectedPlc.status === 'draft' ? (
                      <button
                        onClick={() => handleUpdateStatus(selectedPlc.id, 'active')}
                        className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer transition-all"
                      >
                        <Play size={10} />
                        <span>Запустить выпуск</span>
                      </button>
                    ) : selectedPlc.status === 'active' ? (
                      <button
                        onClick={() => handleUpdateStatus(selectedPlc.id, 'paused')}
                        className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer transition-all"
                      >
                        <Pause size={10} />
                        <span>Приостановить</span>
                      </button>
                    ) : null}

                    {selectedPlc.status === 'active' || selectedPlc.status === 'paused' ? (
                      <button
                        onClick={() => handleUpdateStatus(selectedPlc.id, 'completed')}
                        className="flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer transition-all"
                      >
                        <CheckCircle size={10} />
                        <span>Завершить успешно</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-dashed border-gray-100">
                    {/* Refund Option */}
                    {selectedPlc.status !== 'completed' && selectedPlc.status !== 'failed' && (
                      <button
                        onClick={() => handleTriggerRefund(selectedPlc.id)}
                        className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer transition-all"
                        title="Возвратить инвестиции на кошельки держателей в случае если сбор провалился"
                      >
                        <RotateCcw size={11} />
                        <span>Возврат средств</span>
                      </button>
                    )}

                    {/* Token buyback/burn option */}
                    {selectedPlc.status === 'completed' && (
                      <button
                        onClick={() => handleTokenBurn(selectedPlc.id)}
                        className="flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer transition-all col-span-2"
                        title="Выкупить и сжечь токены после продажи здания стороннему покупателю"
                      >
                        <Flame size={11} />
                        <span>Обратный выкуп & Сжигание</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                  <span className="flex items-center gap-1">
                    <FileCheck size={12} className="text-[#A38D6D]" />
                    Документы по итогам размещения готовы
                  </span>
                  <button 
                    onClick={() => {
                      onAddLog('Report Generated', `Скачан итоговый отчет размещения ${selectedPlc.id.toUpperCase()}`);
                      alert('Формирование официального отчета для государственных органов завершено. Файл CH_OFFERING_REPORT.xlsx загружен.');
                    }}
                    className="text-[#A38D6D] underline font-bold uppercase tracking-wider"
                  >
                    Экспорт реестра
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE OFFERING MODAL FORM */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-2xl max-w-lg w-full p-6 text-left relative rounded-sm"
            >
              <div className="border-b border-gray-150 pb-3 mb-4">
                <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Эмиссионный центр</span>
                <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">Новое инвестиционное размещение (Оферта)</h3>
              </div>

              <form onSubmit={handleCreateOffering} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Выберите объект недвижимости</label>
                  <select
                    required
                    value={newOffering.propertyId}
                    onChange={(e) => setNewOffering({...newOffering, propertyId: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-serif font-bold"
                  >
                    <option value="">-- Выбрать из кадастра --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Целевой капитал ($)</label>
                    <input
                      type="number" required placeholder="Например: 600000"
                      value={newOffering.targetAmount} onChange={(e) => setNewOffering({...newOffering, targetAmount: Number(e.target.value)})}
                      className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Цена токена ($)</label>
                    <input
                      type="number" required placeholder="50"
                      value={newOffering.tokenPrice} onChange={(e) => setNewOffering({...newOffering, tokenPrice: Number(e.target.value)})}
                      className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Описание выпуска</label>
                  <textarea
                    rows={3}
                    placeholder="Параметры оферты, требования к квалификации инвесторов..."
                    value={newOffering.description} onChange={(e) => setNewOffering({...newOffering, description: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded text-emerald-800 border border-emerald-100">
                  <input
                    type="checkbox"
                    id="require-white-chk"
                    checked={newOffering.whitelistRequired}
                    onChange={(e) => setNewOffering({...newOffering, whitelistRequired: e.target.checked})}
                    className="accent-emerald-700"
                  />
                  <label htmlFor="require-white-chk" className="text-[10px] font-mono font-semibold cursor-pointer">
                    Требовать нахождение в смарт-контракте Whitelist (KYC)
                  </label>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold uppercase tracking-widest py-2 rounded transition-all text-center cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#111111] hover:bg-[#A38D6D] text-white font-bold uppercase tracking-widest py-2 rounded transition-all text-center cursor-pointer"
                  >
                    Зарегистрировать выпуск
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
