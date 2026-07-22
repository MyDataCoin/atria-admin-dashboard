import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PasswordInput from './PasswordInput';

export default function ActivitiesTimeline({
  // Server-side audit trail (read-only — the dashboard never appends to it).
  activities,
  admins,
  setAdmins,
  loading,
  error,
  onRefresh,
  onAddLog
}) {
  const [activeTab, setActiveTab] = useState('audit'); // audit, rbac
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // ALL, SUCCESS, WARNING, ALERT
  const [filterEntity, setFilterEntity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Entity types present in the loaded trail (Property, Publication, SupportTicket,
  // Deal, Investment, Compliance …). Derived, so new backend aggregates show up on
  // their own instead of needing a hardcoded list here.
  const entityTypes = [...new Set(activities.map((l) => l.entityType).filter(Boolean))].sort();

  // Form for creating new admin role (RBAC)
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    role: 'Compliance Officer',
    username: '',
    password: 'admin',
    permissions: ['AML Checking', 'KYC Verification']
  });

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.username) return;

    const added = {
      id: `admin-${Date.now()}`,
      avatar: newAdmin.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      ...newAdmin
    };

    setAdmins([...admins, added]);
    // RBAC is dashboard-local (no backend endpoint), so the server records nothing here.
    onAddLog(
      'New Administrator Registered',
      `Создан новый административный аккаунт "${newAdmin.name}".`,
      'SUCCESS',
      { local: true }
    );

    setShowAddAdmin(false);
    setNewAdmin({
      name: '',
      email: '',
      role: 'Compliance Officer',
      username: '',
      password: 'admin',
      permissions: ['AML Checking', 'KYC Verification']
    });
  };

  const togglePermission = (perm) => {
    if (newAdmin.permissions.includes(perm)) {
      setNewAdmin({
        ...newAdmin,
        permissions: newAdmin.permissions.filter(p => p !== perm)
      });
    } else {
      setNewAdmin({
        ...newAdmin,
        permissions: [...newAdmin.permissions, perm]
      });
    }
  };

  const getFilteredLogs = () => {
    return activities.filter(log => {
      const matchesSeverity = filterSeverity === 'ALL' || log.status === filterSeverity;
      const matchesEntity = filterEntity === 'ALL' || log.entityType === filterEntity;
      // Client-side search over the loaded page — the backend has no search param.
      // The raw event name is searchable even though it isn't shown as a column.
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (log.adminName || '').toLowerCase().includes(q) ||
        (log.eventType || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q);

      return matchesSeverity && matchesEntity && matchesSearch;
    });
  };

  const getLogStatusStyle = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ALERT':
        return 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Editorial Title banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Контроль безопасности & Логи операций
          </span>
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Журнал Аудита & Распределение Ролей
          </h2>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-[#F3F3F1] p-1 rounded-sm text-[10px] uppercase font-bold tracking-wider font-mono">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-800'
            }`}
          >
            Журнал Аудита
          </button>
          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer ${
              activeTab === 'rbac' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-800'
            }`}
          >
            Роли & Доступы (RBAC)
          </button>
        </div>
      </div>

      {/* TAB 1: IMMUTABLE AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
              Загрузка журнала аудита…
            </div>
          )}
          {!loading && error && (
            <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠ Журнал недоступен — показаны демо-данные. {error}
            </div>
          )}

          {/* Filters card */}
          <div className="bg-white border border-gray-150 p-4 rounded-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Поиск по журналу (исполнитель, описание)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-[#A38D6D] bg-white text-gray-900"
              />
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-[#A38D6D] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                Обновить
              </button>
            )}

            {entityTypes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Сущность:</span>
                <select
                  value={filterEntity}
                  onChange={(e) => setFilterEntity(e.target.value)}
                  className="text-[10px] p-1.5 border border-gray-200 bg-white rounded focus:outline-none focus:border-[#A38D6D] text-gray-700 font-mono"
                >
                  <option value="ALL">Все</option>
                  {entityTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Критичность:</span>
              <div className="flex gap-1 text-[8px] font-mono uppercase font-bold">
                {['ALL', 'SUCCESS', 'WARNING', 'ALERT'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-2.5 py-1 rounded cursor-pointer transition-colors border ${
                      filterSeverity === sev 
                        ? 'bg-[#111111] text-white border-black' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200'
                    }`}
                  >
                    {sev === 'ALL' ? 'Все' : sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Logs list */}
          <div className="bg-white border border-gray-100 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                    <th className="py-3 px-4 text-left">Штамп времени</th>
                    <th className="py-3 px-4 text-left">Исполнитель</th>
                    <th className="py-3 px-4 text-left">Описание</th>
                    <th className="py-3 px-4 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-mono text-[11px]">
                  {getFilteredLogs().map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-400 font-semibold whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-bold font-serif whitespace-nowrap">
                        {log.adminName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-sans leading-relaxed min-w-[300px]">
                        {log.details}
                        {log._source === 'local' && (
                          <span className="ml-2 text-[8px] font-mono uppercase text-gray-400 border border-gray-200 rounded px-1 py-0.5">
                            только сессия
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded border font-bold ${getLogStatusStyle(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {getFilteredLogs().length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                        Записи журнала аудита по заданным фильтрам не найдены.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC PANEL */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-serif font-bold text-gray-900">Административный персонал & Права доступа</h3>
              <p className="text-[11px] text-gray-400 mt-1">Ограничение доступа в соответствии со стандартами комплаенса и банковской тайны.</p>
            </div>
            <button
              onClick={() => setShowAddAdmin(true)}
              className="flex items-center gap-1 bg-[#111111] hover:bg-[#A38D6D] text-white px-3 py-1.5 rounded text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer"
            >
              <Plus size={12} />
              <span>Добавить администратора</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((adm) => (
              <div key={adm.id} className="bg-white border border-gray-100 rounded-sm p-5 space-y-4 shadow-xs relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#A38D6D]/10 text-[#A38D6D] flex items-center justify-center font-serif font-bold text-xs uppercase">
                      {adm.avatar}
                    </div>
                    <div>
                      <h4 className="text-xs font-serif font-bold text-gray-900 leading-tight">{adm.name}</h4>
                      <span className="text-[8px] uppercase font-mono font-bold text-[#A38D6D] tracking-wider block mt-0.5">{adm.role}</span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-bold font-mono">
                    АКТИВЕН
                  </span>
                </div>

                <div className="border-t border-gray-50 pt-3 space-y-2 text-[10px] font-mono">
                  <div>
                    <span className="text-[8px] text-gray-400 block font-semibold uppercase">Email</span>
                    <span className="text-gray-700 font-bold">{adm.email}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-400 block font-semibold uppercase">Логин</span>
                    <span className="text-gray-700 font-bold">{adm.username}</span>
                  </div>
                </div>

                <div className="border-t border-gray-50 pt-3">
                  <span className="text-[8px] text-gray-400 block font-semibold uppercase font-mono mb-1.5">Разрешения (Permissions)</span>
                  <div className="flex flex-wrap gap-1">
                    {adm.permissions.map((p, i) => (
                      <span key={i} className="text-[8px] font-bold uppercase tracking-wide bg-gray-50 text-gray-500 border border-gray-150 px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD ADMINISTRATOR MODAL */}
      <AnimatePresence>
        {showAddAdmin && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-2xl max-w-lg w-full p-6 text-left relative rounded-sm"
            >
              <div className="border-b border-gray-150 pb-3 mb-4">
                <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Роли доступа (RBAC)</span>
                <h3 className="text-base font-serif font-bold text-gray-900 mt-0.5">Добавить администратора платформы</h3>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">ФИО Администратора</label>
                  <input
                    type="text" required placeholder="Например: Карл фон Липпе"
                    value={newAdmin.name} onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-serif"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Email</label>
                    <input
                      type="email" required placeholder="name@atria-rwa.ch"
                      value={newAdmin.email} onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Роль / Должность</label>
                    <select
                      value={newAdmin.role} onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                    >
                      <option value="Compliance Officer">Compliance Officer</option>
                      <option value="Senior Property Asset Manager">Senior Property Asset Manager</option>
                      <option value="Smart Contract Developer">Smart Contract Developer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Имя пользователя (Логин)</label>
                    <input
                      type="text" required placeholder="karl"
                      value={newAdmin.username} onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">Пароль по умолчанию</label>
                    <PasswordInput
                      required
                      value={newAdmin.password} onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 font-mono">Области разрешений (Permissions)</label>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {[
                      'AML Checking',
                      'KYC Verification',
                      'System Management',
                      'User Control',
                      'Property Edit',
                      'Placements Control',
                      'Payout Issuance',
                      'Smart Contract Whitelisting'
                    ].map((perm) => {
                      const isChecked = newAdmin.permissions.includes(perm);
                      return (
                        <label key={perm} className="flex items-center gap-2 bg-gray-50 p-2 border border-gray-150 rounded cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm)}
                            className="accent-[#A38D6D] rounded border-gray-300"
                          />
                          <span>{perm}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setShowAddAdmin(false)}
                    className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold uppercase tracking-widest py-2 rounded transition-all text-center cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#111111] hover:bg-[#A38D6D] text-white font-bold uppercase tracking-widest py-2 rounded transition-all text-center cursor-pointer"
                  >
                    Зарегистрировать
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
