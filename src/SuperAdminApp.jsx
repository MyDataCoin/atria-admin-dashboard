import React, { useEffect, useState, useCallback } from 'react';
import api from './api';
import { mapInvestorFromApi, mapRealtorStatFromApi } from './api/mappers';
import {
  ShieldAlert,
  Ban,
  RotateCcw,
  KeyRound,
  LogOut,
  Search,
  RefreshCw,
  Users,
  Briefcase,
} from 'lucide-react';

// Super-admin workspace: moderate investors and realtors (ban/unban) and manage
// admin/realtor passwords (reset/restore). Authentication and role routing live in the
// root App shell; this is mounted only for a superadmin account.
//
// The backend has NONE of these operations yet (superadmin role, ban, password routes —
// all missing; see BACKEND-SUPERADMIN.md). Every action calls the proposed endpoint and
// surfaces the failure inline, so the moment the backend ships them, this works as-is.
export default function SuperAdminApp({ currentUser, onLogout }) {
  const [tab, setTab] = useState('investors'); // investors | realtors
  const [query, setQuery] = useState('');

  const [investors, setInvestors] = useState([]);
  const [realtors, setRealtors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Per-row action state: { [id]: 'banning' | 'resetting' | ... } and last result text.
  const [busy, setBusy] = useState({});
  const [flash, setFlash] = useState(null); // { id, kind: 'ok'|'err', text }

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([api.admin.listInvestors(), api.admin.realtorStats()])
      .then(([inv, rea]) => {
        if (inv.status === 'fulfilled') {
          const rows = Array.isArray(inv.value) ? inv.value : inv.value?.items || [];
          setInvestors(rows.filter((u) => u.status != null).map(mapInvestorFromApi));
        }
        if (rea.status === 'fulfilled') {
          const rows = Array.isArray(rea.value) ? rea.value : rea.value?.items || [];
          setRealtors(rows.map(mapRealtorStatFromApi));
        }
        // Only a hard error on both is worth a banner; partial data still renders.
        setError(
          inv.status === 'rejected' && rea.status === 'rejected'
            ? inv.reason?.message || 'Не удалось загрузить пользователей'
            : ''
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRowBusy = (id, state) => setBusy((b) => ({ ...b, [id]: state }));

  // `okText` may be a string or a fn(result) -> string. `reload` re-reads the list
  // afterwards (needed only when the blocked flag changed).
  const runAction = async (id, kind, fn, okText, { reload: doReload = false } = {}) => {
    setRowBusy(id, kind);
    setFlash(null);
    try {
      const result = await fn();
      setFlash({ id, kind: 'ok', text: typeof okText === 'function' ? okText(result) : okText });
      if (doReload) load(); // re-read so the blocked flag reflects the server
    } catch (err) {
      setFlash({ id, kind: 'err', text: err?.message || 'Операция недоступна на бэкенде' });
    } finally {
      setRowBusy(id, null);
    }
  };

  const banToggle = (row) => {
    const blocked = row.status === 'Blocked';
    runAction(
      row.id,
      blocked ? 'unban' : 'ban',
      () => (blocked ? api.superadmin.unbanUser(row.id) : api.superadmin.banUser(row.id)),
      blocked ? 'Аккаунт разблокирован' : 'Аккаунт заблокирован',
      { reload: true }
    );
  };

  const resetPassword = (row) =>
    runAction(row.id, 'reset', () => api.superadmin.resetPassword(row.id), (res) => {
      const pwd = res?.temporaryPassword;
      return pwd ? `Новый пароль: ${pwd}` : 'Пароль сброшен';
    });

  const restorePassword = (row) =>
    runAction(row.id, 'restore', () => api.superadmin.restorePassword(row.id), 'Доступ восстановлен');

  const q = query.trim().toLowerCase();
  const shownInvestors = investors.filter((r) => !q || (r.name || '').toLowerCase().includes(q));
  const shownRealtors = realtors.filter((r) => !q || (r.fullName || '').toLowerCase().includes(q));

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-gray-200 font-sans">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-[#141414] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert size={18} className="text-rose-400" />
          </div>
          <div>
            <h1 className="font-serif text-lg tracking-wide text-white">ATRIA · Super Admin</h1>
            <span className="text-[9px] uppercase tracking-widest text-rose-400/80 font-mono font-bold">
              Модерация и безопасность
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-gray-400">{currentUser?.name || 'Super Admin'}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut size={13} /> Выйти
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Capability note — the backend contract these actions depend on */}
        <div className="text-[10px] font-mono text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded px-3 py-2 leading-relaxed">
          Панель супер-администратора: блокировка инвесторов и риелторов, сброс и
          восстановление паролей. Действия отправляются на бэкенд; если операция ещё не
          реализована — под строкой появится причина.
        </div>

        {error && (
          <div className="text-[11px] font-mono text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded px-3 py-2">
            ⚠ {error}
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex bg-white/5 p-1 rounded-sm text-[10px] uppercase font-bold tracking-wider font-mono">
            <button
              onClick={() => setTab('investors')}
              className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'investors' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={12} /> Инвесторы ({investors.length})
            </button>
            <button
              onClick={() => setTab('realtors')}
              className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'realtors' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Briefcase size={12} /> Риелторы ({realtors.length})
            </button>
          </div>

          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени…"
              className="w-full text-xs pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-rose-400/50 text-white"
            />
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-white disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Обновить
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#141414] border border-white/10 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">
                  <th className="py-3 px-4 text-left">{tab === 'investors' ? 'Инвестор' : 'Риелтор'}</th>
                  <th className="py-3 px-4 text-left">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(tab === 'investors' ? shownInvestors : shownRealtors).map((row) => {
                  const isRealtor = tab === 'realtors';
                  const blocked = row.status === 'Blocked';
                  const rowBusy = busy[row.id];
                  const showFlash = flash && flash.id === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-white/5 align-top">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white font-serif block">
                          {isRealtor ? row.fullName : row.name}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {isRealtor ? row.companyName || 'Риелтор' : row.phone || row.email || '—'}
                        </span>
                        {showFlash && (
                          <span
                            className={`mt-1 block text-[9px] font-mono ${
                              flash.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {flash.kind === 'ok' ? '✓ ' : '⚠ '}
                            {flash.text}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
                            Заблокирован
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => banToggle(row)}
                            disabled={!!rowBusy}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold tracking-wider border transition-all cursor-pointer disabled:opacity-50 ${
                              blocked
                                ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                            }`}
                          >
                            <Ban size={11} />
                            {rowBusy === 'ban' || rowBusy === 'unban'
                              ? '…'
                              : blocked
                                ? 'Разблокировать'
                                : 'Заблокировать'}
                          </button>

                          <button
                            onClick={() => resetPassword(row)}
                            disabled={!!rowBusy}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold tracking-wider border border-white/15 text-gray-300 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <KeyRound size={11} />
                            {rowBusy === 'reset' ? '…' : 'Сбросить пароль'}
                          </button>

                          <button
                            onClick={() => restorePassword(row)}
                            disabled={!!rowBusy}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold tracking-wider border border-white/15 text-gray-300 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw size={11} />
                            {rowBusy === 'restore' ? '…' : 'Восстановить'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading &&
                  (tab === 'investors' ? shownInvestors : shownRealtors).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-gray-500 italic font-mono text-[11px]">
                        {tab === 'investors' ? 'Инвесторы не найдены.' : 'Риелторы не найдены.'}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 px-4 py-3 border-t border-white/5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Загрузка…
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
