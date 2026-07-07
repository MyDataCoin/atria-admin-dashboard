import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Search, 
  ExternalLink, 
  Mail, 
  Globe, 
  Database, 
  FileCheck,
  Lock,
  Smartphone,
  HardDrive,
  KeyRound,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CUSTODY_DETAILS = {
  'inv-1': {
    method: 'MetaMask / Trust Wallet',
    type: 'Некастодиальный кошелек',
    description: 'Самостоятельное хранение на персональном адресе инвестора. Адрес прошел криптографическую подпись и авторизован в смарт-контракте реестра долей.',
    securityLevel: 'Высокий (On-Chain)',
    category: 'non-custodial'
  },
  'inv-2': {
    method: 'Ledger Cold Storage',
    type: 'Аппаратный холодный сейф',
    description: 'Холодное хранение с физическим подтверждением транзакций. Идеально для крупных пакетов токенизированных долей RWA.',
    securityLevel: 'Максимальный (Hardware)',
    category: 'hardware'
  },
  'inv-3': {
    method: 'ATRIA Depository Custody',
    type: 'Лицензированный кастодиан',
    description: 'Депозитарное хранение под управлением кастодиального сервиса ATRIA RWA. Ключи зашифрованы в аппаратных модулях безопасности HSM.',
    securityLevel: 'Банковский уровень (HSM)',
    category: 'custodial'
  },
  'inv-4': {
    method: 'Safe Multisig (3-of-5)',
    type: 'Мультисиг-контракт Safe',
    description: 'Многоподписной смарт-контракт. Любое движение токенов требует одобрения минимум 3 назначенных уполномоченных адресов.',
    securityLevel: 'Организационный (Multisig)',
    category: 'multisig'
  },
  'inv-5': {
    method: 'Direct Book-Entry Ledger',
    type: 'Гос. депозитарный учет КР',
    description: 'Прямая запись в депозитарную книгу ЗАО «Центральный Депозитарий Кыргызской Республики». Токены заблокированы на специальном гос-счете.',
    securityLevel: 'Государственный стандарт',
    category: 'state'
  },
};

export default function UsersAndKyc({ 
  investors, 
  setInvestors,
  onAddLog
}) {
  const [selectedInv, setSelectedInv] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [custodyFilter, setCustodyFilter] = useState('ALL'); // ALL, non-custodial, hardware, custodial, multisig, state

  const filteredInvestors = investors.filter(inv => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      inv.name.toLowerCase().includes(q) ||
      inv.walletAddress.toLowerCase().includes(q);

    const custodyInfo = CUSTODY_DETAILS[inv.id] || { category: 'non-custodial' };
    const matchesCustody = custodyFilter === 'ALL' || custodyInfo.category === custodyFilter;

    return matchesSearch && matchesCustody;
  });

  const getCustodyIcon = (id) => {
    const category = CUSTODY_DETAILS[id]?.category;
    switch (category) {
      case 'hardware':
        return <HardDrive size={13} className="text-amber-600" />;
      case 'custodial':
        return <Database size={13} className="text-blue-600" />;
      case 'multisig':
        return <Layers size={13} className="text-purple-600" />;
      case 'state':
        return <FileCheck size={13} className="text-emerald-600" />;
      default:
        return <Smartphone size={13} className="text-cyan-600" />;
    }
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Upper Title banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Депозитарный учет долей RWA • Кыргызская Республика
          </span>
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Реестр Инвесторов & Способы Хранения
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Все инвесторы являются верифицированными гражданами КР. Покупка активов без прохождения KYC технически заблокирована смарт-контрактами оферты.
          </p>
        </div>

        {/* Action readouts */}
        <div className="flex bg-[#F3F3F1] p-1 rounded-sm text-[10px] uppercase font-bold tracking-wider font-mono">
          <span className="px-3 py-1 bg-white text-gray-900 rounded-sm shadow-xs font-bold">
            Активных кошельков КР: {investors.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar controls */}
      <div className="bg-white border border-gray-150 p-4 rounded-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between text-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Поиск по ФИО или адресу кошелька..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-[#A38D6D] bg-white text-gray-900"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-gray-400 font-mono">Тип хранения долей:</span>
            <select
              value={custodyFilter}
              onChange={(e) => setCustodyFilter(e.target.value)}
              className="p-1.5 border border-gray-200 rounded bg-white text-gray-900 focus:outline-none"
            >
              <option value="ALL">Все способы</option>
              <option value="non-custodial">Некастодиальные (Hot Wallet)</option>
              <option value="hardware">Аппаратные сейфы (Ledger)</option>
              <option value="custodial">Кастодиан ATRIA</option>
              <option value="multisig">Мультисиг (Safe КР)</option>
              <option value="state">Депозитарий КР (Гос-учет)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white border border-gray-100 rounded-sm overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                <th className="py-3 px-4 text-left">ФИО / Контакты</th>
                <th className="py-3 px-4 text-left">Адрес кошелька / Смарт-контракт</th>
                <th className="py-3 px-4 text-center">Гражданство</th>
                <th className="py-3 px-4 text-left">Метод хранения активов</th>
                <th className="py-3 px-4 text-center">Суммарный объем долей</th>
                <th className="py-3 px-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvestors.map((inv) => {
                const custody = CUSTODY_DETAILS[inv.id] || {
                  method: 'MetaMask / Trust Wallet',
                  type: 'Некастодиальный кошелек',
                  securityLevel: 'Высокий'
                };
                const totalTokens = inv.holdings.reduce((sum, h) => sum + h.tokensOwned, 0);

                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4 text-left">
                      <span className="font-bold text-gray-950 font-serif block">{inv.name}</span>
                      <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                        <Mail size={10} /> {inv.email}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                      <span className="hover:text-[#A38D6D] flex items-center gap-1" title={inv.walletAddress}>
                        {inv.walletAddress.slice(0, 10)}...{inv.walletAddress.slice(-8)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center text-gray-700">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        <Globe size={10} className="text-[#A38D6D]" />
                        КР
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-gray-50 border border-gray-100 rounded-sm">
                          {getCustodyIcon(inv.id)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 leading-none">{custody.type}</p>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">{custody.method}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-[11px] font-bold text-gray-800">
                      {totalTokens.toLocaleString()} ATR-S
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedInv(inv)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-[#A38D6D] hover:text-white rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                      >
                        <span>Детали</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInvestors.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic font-mono">
                    Инвесторы по заданным комплаенс-критериям не обнаружены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER / OVERLAY MODAL */}
      <AnimatePresence>
        {selectedInv && (() => {
          const custody = CUSTODY_DETAILS[selectedInv.id] || {
            method: 'MetaMask / Trust Wallet',
            type: 'Некастодиальный кошелек',
            description: 'Самостоятельное хранение на персональном адресе инвестора.',
            securityLevel: 'Высокий'
          };
          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-200 shadow-2xl max-w-lg w-full p-6 text-left relative rounded-sm"
              >
                <div className="border-b border-gray-150 pb-3 mb-4 flex justify-between items-start">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Карточка инвестора • КР</span>
                    <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">{selectedInv.name}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedInv(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Contact parameters */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[8px] uppercase text-gray-400 block font-semibold">Электронная почта</span>
                      <span className="text-gray-800 font-bold">{selectedInv.email}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-gray-400 block font-semibold">Гражданство и Паспорт</span>
                      <span className="text-gray-800 font-bold">Кыргызская Республика (КР)</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-gray-400 block font-semibold">Персональный ИНН КР</span>
                      <span className="text-gray-800 font-bold">{selectedInv.nationalID}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-gray-400 block font-semibold">Адрес Кошелька (Whitelist)</span>
                      <span className="text-gray-600 truncate block max-w-[150px]" title={selectedInv.walletAddress}>{selectedInv.walletAddress}</span>
                    </div>
                  </div>

                  {/* Custody Info */}
                  <div className="p-3 bg-[#FAF9F5] border border-amber-100 rounded">
                    <h4 className="text-[9px] uppercase tracking-wider text-[#A38D6D] font-bold font-mono flex items-center gap-1 mb-1.5">
                      {getCustodyIcon(selectedInv.id)}
                      <span>Способ удержания активов: {custody.type}</span>
                    </h4>
                    <p className="text-[11px] leading-relaxed text-gray-700">
                      {custody.description}
                    </p>
                    <div className="mt-2 pt-2 border-t border-amber-100/40 flex justify-between items-center text-[9px] font-mono text-gray-500">
                      <span>Уровень защищенности: <strong className="text-gray-700">{custody.securityLevel}</strong></span>
                      <span className="text-[#A38D6D] font-bold">On-Chain Whitelisted</span>
                    </div>
                  </div>

                  {/* Portfolio breakdown */}
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono block mb-2">Приобретенные доли (RWA Portfolio)</span>
                    <div className="space-y-2">
                      {selectedInv.holdings.map((h, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 border border-gray-150 rounded text-xs font-mono">
                          <span className="font-bold text-gray-800">{h.propertyName}</span>
                          <span className="font-bold text-[#A38D6D]">{h.tokensOwned.toLocaleString()} ATR-S</span>
                        </div>
                      ))}
                      {selectedInv.holdings.length === 0 && (
                        <p className="text-xs text-gray-400 italic">Портфель инвестора пуст.</p>
                      )}
                    </div>
                  </div>

                  {/* State verification and depository seal */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200/50 rounded text-[10.5px] leading-relaxed text-gray-600 space-y-1.5">
                      <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        Государственная верификация пройдена
                      </p>
                      <p className="text-gray-600 text-[10px]">
                        Поскольку все инвесторы платформы ATRIA RWA являются гражданами Кыргызстана, процедура KYC пройдена на государственном уровне через личную цифровую подпись (ЭЦП) или авторизацию в гос-системе «Түндүк». Это гарантирует 100% достоверность записей реестра долей.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
