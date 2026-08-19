import React, { useEffect, useState, useCallback } from 'react';
import api from './api';
import {
  mapInvestorFromApi,
  mapRealtorStatFromApi,
  mapAdminFromApi,
  mapAuditLogFromApi,
  mapAppealFromApi,
} from './api/mappers';
import PasswordInput from './components/PasswordInput';
import {
  ShieldAlert,
  Ban,
  KeyRound,
  LogOut,
  Search,
  RefreshCw,
  Users,
  Briefcase,
  Activity,
  UserPlus,
  Inbox,
  MessageCircle,
  Mail,
  Phone,
  Wand2,
  Copy,
  Check,
} from 'lucide-react';
import { generateOneTimePassword, copyToClipboard } from './utils';

// Super-admin workspace: moderate investors and realtors (ban/unban) and manage
// admin/realtor passwords (reset). Authentication and role routing live in the
// root App shell; this is mounted only for a superadmin account.
//
// The backend has NONE of these operations yet (superadmin role, ban, password routes —
// all missing; see BACKEND-SUPERADMIN.md). Every action calls the proposed endpoint and
// surfaces the failure inline, so the moment the backend ships them, this works as-is.
// Бэкенд отдаёт UTC без суффикса — без 'Z' браузер прочитает это как локальное время.
function formatFeedbackDate(iso) {
  if (!iso) return '—';
  const raw = /([Zz]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  return new Date(raw).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SuperAdminApp({ currentUser, onLogout }) {
  const [tab, setTab] = useState('investors'); // investors | realtors | admins
  const [query, setQuery] = useState('');

  const [investors, setInvestors] = useState([]);
  const [realtors, setRealtors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [appeals, setAppeals] = useState([]);
  // Вопросы из формы обратной связи на публичном сайте: почтой они никуда не уходят, читаем здесь.
  const [feedback, setFeedback] = useState([]);
  const [feedbackHandledShown, setFeedbackHandledShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Per-row action state: { [id]: 'banning' | 'resetting' | ... } and last result text.
  const [busy, setBusy] = useState({});
  const [flash, setFlash] = useState(null); // { id, kind: 'ok'|'err', text }

  // Ban-reason modal: which row is being banned + the reason text.
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState('');

  // Регистрация нового аккаунта: одна модалка на два вида — 'realtor' и 'admin'.
  const [showRegister, setShowRegister] = useState(false);
  const [regKind, setRegKind] = useState('realtor');
  const [reg, setReg] = useState({ username: '', password: '', fullName: '', companyName: '', phoneNumber: '' });
  const [regBusy, setRegBusy] = useState(false);
  // Сгенерированный пароль показываем открытым текстом: суперадмину его нужно передать человеку,
  // а второй раз он его уже нигде не увидит.
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordCopyFailed, setPasswordCopyFailed] = useState(false);
  const [regResult, setRegResult] = useState(null); // { kind: 'ok'|'err', text }

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.admin.listInvestors(),
      api.admin.realtorStats(),
      api.superadmin.listAdmins(),
      api.audit.query({ pageSize: 200 }),
      api.superadmin.listAppeals(),
      api.feedback.list(),
    ])
      .then(([inv, rea, adm, aud, app, fb]) => {
        if (inv.status === 'fulfilled') {
          const rows = Array.isArray(inv.value) ? inv.value : inv.value?.items || [];
          setInvestors(rows.filter((u) => u.status != null).map(mapInvestorFromApi));
        }
        if (rea.status === 'fulfilled') {
          const rows = Array.isArray(rea.value) ? rea.value : rea.value?.items || [];
          setRealtors(rows.map(mapRealtorStatFromApi));
        }
        if (adm.status === 'fulfilled') {
          const rows = Array.isArray(adm.value) ? adm.value : adm.value?.items || [];
          // Hide the super admin itself — it must not ban or reset its own password.
          // Match on the logged-in user's id, with a username fallback.
          setAdmins(
            rows
              .map(mapAdminFromApi)
              .filter(
                (a) =>
                  a.id !== currentUser?.id &&
                  a.username?.toLowerCase() !== 'superadmin' &&
                  a.username?.toLowerCase() !== (currentUser?.username || '').toLowerCase()
              )
          );
        }
        if (aud.status === 'fulfilled') {
          const rows = Array.isArray(aud.value) ? aud.value : aud.value?.items || [];
          setAuditLogs(rows.map(mapAuditLogFromApi));
        }
        if (app.status === 'fulfilled') {
          const rows = Array.isArray(app.value) ? app.value : app.value?.items || [];
          setAppeals(rows.map(mapAppealFromApi));
        }
        if (fb.status === 'fulfilled') {
          const rows = Array.isArray(fb.value) ? fb.value : fb.value?.items || [];
          setFeedback(rows);
        }
        // Only a hard error on both is worth a banner; partial data still renders.
        // A 403 here is a backend authorization gap (SuperAdmin not allowed to read
        // /users & /realtors/stats), not an empty registry — say so explicitly.
        if (inv.status === 'rejected' && rea.status === 'rejected') {
          const s = inv.reason?.status;
          setError(
            s === 403
              ? 'Бэкенд не даёт супер-админу читать реестр (403). Нужно открыть SuperAdmin доступ к GET /users и /realtors/stats.'
              : inv.reason?.message || 'Не удалось загрузить пользователей'
          );
        } else {
          setError('');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRowBusy = (id, state) => setBusy((b) => ({ ...b, [id]: state }));

  // Хелп-деск: новые вопросы отделены от разобранных, счётчик на вкладке считает только новые.
  const openFeedback = feedback.filter((f) => !f.handledAtUtc);
  const handledFeedback = feedback.filter((f) => f.handledAtUtc);

  const markFeedbackHandled = (row) =>
    runAction(
      row.id,
      'feedback',
      () => api.feedback.markHandled(row.id),
      'Обращение отмечено как обработанное',
      { reload: true }
    );

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
    if (row.status === 'Blocked') {
      // Unban is immediate — no reason needed.
      runAction(row.id, 'unban', () => api.superadmin.unbanUser(row.id), 'Аккаунт разблокирован', {
        reload: true,
      });
    } else {
      // Ban asks for a reason first — it's shown to the user on the blocked screen.
      setBanTarget(row);
      setBanReason('');
    }
  };

  const confirmBan = () => {
    const row = banTarget;
    setBanTarget(null);
    runAction(
      row.id,
      'ban',
      () => api.superadmin.banUser(row.id, banReason.trim() || undefined),
      'Аккаунт заблокирован',
      { reload: true }
    );
  };

  const resetPassword = (row) =>
    runAction(row.id, 'reset', () => api.superadmin.resetPassword(row.id), (res) => {
      const pwd = res?.temporaryPassword;
      return pwd ? `Новый пароль: ${pwd}` : 'Пароль сброшен';
    });

  const submitRegister = async (e) => {
    e.preventDefault();
    if (!reg.username.trim() || !reg.password.trim() || !reg.fullName.trim() || regBusy) return;
    setRegBusy(true);
    setRegResult(null);
    const fullName = reg.fullName.trim();
    try {
      if (regKind === 'admin') {
        await api.superadmin.registerAdmin({
          username: reg.username.trim(),
          fullName,
          password: reg.password,
        });
      } else {
        await api.superadmin.registerRealtor({
          username: reg.username.trim(),
          password: reg.password,
          fullName,
          companyName: reg.companyName.trim() || null,
          phoneNumber: reg.phoneNumber.trim() || null,
        });
      }
      setRegResult({
        kind: 'ok',
        text: `${regKind === 'admin' ? 'Администратор' : 'Риелтор'} «${fullName}» создан. `
          + 'Пароль разовый — при первом входе аккаунт попросит сменить его.',
      });
      setReg({ username: '', password: '', fullName: '', companyName: '', phoneNumber: '' });
      load(); // обновляем список
    } catch (err) {
      const text =
        err?.status === 409
          ? 'Такой логин уже занят.'
          : err?.status === 400
            ? (err?.problem?.detail
              ?? 'Пароль слишком простой: минимум 6 символов, заглавная и строчная буква, цифра и спецсимвол.')
            : err?.message || 'Регистрация недоступна на бэкенде';
      setRegResult({ kind: 'err', text });
    } finally {
      setRegBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const nameOf = (r) => (r.fullName || r.name || '').toLowerCase();
  const source = tab === 'investors' ? investors : tab === 'realtors' ? realtors : admins;
  const shown = source.filter((r) => !q || nameOf(r).includes(q));

  // id -> display name, built from everyone we've loaded, so audit rows about a user
  // (ban/unban/appeal) can show the person's name instead of just their role.
  const nameById = React.useMemo(() => {
    const m = {};
    for (const r of [...investors, ...realtors, ...admins]) {
      if (r.id) m[r.id] = r.fullName || r.name || '';
    }
    return m;
  }, [investors, realtors, admins]);

  // The backend's audit summary carries only the role ("Заблокирован аккаунт (Realtor)").
  // If we can resolve the affected user's id to a name, append it.
  const auditText = (log) => {
    const name = log.entityId && nameById[log.entityId];
    if (!name) return log.details;
    // Don't double up if the summary already contains the name.
    if (log.details.includes(name)) return log.details;
    // Ban/unban: replace the trailing "(Role)" with the name; keep any ": reason" tail.
    if (/^(Заблокирован|Разблокирован) аккаунт/.test(log.details)) {
      return log.details.replace(/\((?:Investor|Realtor|Admin|[^)]*)\)/, name);
    }
    // Appeals and everything else: prefix the name.
    return `${name}: ${log.details}`;
  };

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
            <button
              onClick={() => setTab('admins')}
              className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'admins' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={12} /> Админы ({admins.length})
            </button>
            <button
              onClick={() => setTab('audit')}
              className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'audit' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity size={12} /> Аудит ({auditLogs.length})
            </button>
            <button
              onClick={() => setTab('appeals')}
              className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'appeals' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Inbox size={12} /> Обращения ({appeals.length})
            </button>
            <button
              onClick={() => setTab('feedback')}
              className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'feedback' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageCircle size={12} /> Обратная связь ({openFeedback.length})
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

          <div className="flex items-center gap-3">
            {(tab === 'realtors' || tab === 'admins') && (
              <button
                onClick={() => {
                  setRegKind(tab === 'admins' ? 'admin' : 'realtor');
                  setShowRegister(true);
                  setRegResult(null);
                  setGeneratedPassword('');
                  setPasswordCopied(false);
                  setPasswordCopyFailed(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[9px] font-mono uppercase font-bold tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all cursor-pointer"
              >
                <UserPlus size={12} />
                {tab === 'admins' ? 'Создать администратора' : 'Зарегистрировать риелтора'}
              </button>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-white disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Обновить
            </button>
          </div>
        </div>

        {/* Audit journal */}
        {tab === 'audit' && (
          <div className="bg-[#141414] border border-white/10 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">
                    <th className="py-3 px-4 text-left">Время</th>
                    <th className="py-3 px-4 text-left">Исполнитель</th>
                    <th className="py-3 px-4 text-left">Описание</th>
                    <th className="py-3 px-4 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {auditLogs
                    .map((log) => ({ log, text: auditText(log) }))
                    .filter(({ log, text }) => !q || `${log.adminName} ${text}`.toLowerCase().includes(q))
                    .map(({ log, text }) => (
                      <tr key={log.id} className="hover:bg-white/5">
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-3 px-4 text-white font-serif font-bold whitespace-nowrap">{log.adminName}</td>
                        <td className="py-3 px-4 text-gray-300 font-sans">{text}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded border ${
                              log.status === 'ALERT'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : log.status === 'WARNING'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {!loading && auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-gray-500 italic font-mono text-[11px]">
                        Журнал пуст.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Appeals from blocked users */}
        {tab === 'appeals' && (
          <div className="space-y-3">
            {appeals
              .filter((a) => !q || `${a.username} ${a.fullName} ${a.message}`.toLowerCase().includes(q))
              .map((a) => (
                <div key={a.id} className="bg-[#141414] border border-white/10 rounded-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white font-serif text-sm">
                      {a.fullName}
                      {a.username && a.username !== a.fullName && (
                        <span className="text-gray-500 font-mono text-[10px] ml-2">@{a.username}</span>
                      )}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">{a.createdAt}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{a.message}</p>
                </div>
              ))}
            {!loading && appeals.length === 0 && (
              <div className="bg-[#141414] border border-white/10 rounded-sm py-10 text-center text-gray-500 italic font-mono text-[11px]">
                Обращений нет.
              </div>
            )}
          </div>
        )}

        {/* Хелп-деск: вопросы из формы обратной связи на публичном сайте */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFeedbackHandledShown(false)}
                className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  !feedbackHandledShown ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                Новые ({openFeedback.length})
              </button>
              <button
                onClick={() => setFeedbackHandledShown(true)}
                className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  feedbackHandledShown ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                Обработанные ({handledFeedback.length})
              </button>
              <span className="text-[9px] font-mono text-gray-500 ml-auto">
                Письма никуда не уходят — обращения читаются здесь. Записи старше 90 дней удаляются автоматически.
              </span>
            </div>

            {(feedbackHandledShown ? handledFeedback : openFeedback)
              .filter((f) => !q || `${f.fullName} ${f.email} ${f.phone} ${f.message}`.toLowerCase().includes(q))
              .map((f) => (
                <div key={f.id} className="bg-[#141414] border border-white/10 rounded-sm p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <span className="font-bold text-white font-serif text-sm block">{f.fullName}</span>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10px] font-mono text-gray-400">
                        {f.email && (
                          <a href={`mailto:${f.email}`} className="flex items-center gap-1.5 hover:text-white">
                            <Mail size={11} /> {f.email}
                          </a>
                        )}
                        {f.phone && (
                          <a
                            href={`tel:${String(f.phone).replace(/[^\d+]/g, '')}`}
                            className="flex items-center gap-1.5 hover:text-white"
                          >
                            <Phone size={11} /> {f.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-gray-500 shrink-0">
                      {formatFeedbackDate(f.createdAtUtc)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{f.message}</p>

                  {f.handledAtUtc ? (
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-mono uppercase font-bold tracking-wider text-emerald-400">
                      <Check size={11} /> Обработано · {formatFeedbackDate(f.handledAtUtc)}
                    </span>
                  ) : (
                    <button
                      onClick={() => markFeedbackHandled(f)}
                      disabled={busy[f.id] === 'feedback'}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
                    >
                      <Check size={11} />
                      {busy[f.id] === 'feedback' ? 'Отмечаем…' : 'Отметить обработанным'}
                    </button>
                  )}
                </div>
              ))}

            {!loading && (feedbackHandledShown ? handledFeedback : openFeedback).length === 0 && (
              <div className="bg-[#141414] border border-white/10 rounded-sm py-10 text-center text-gray-500 italic font-mono text-[11px]">
                {feedbackHandledShown ? 'Обработанных обращений нет.' : 'Новых обращений нет.'}
              </div>
            )}
          </div>
        )}

        {/* Users table (investors / realtors / admins) */}
        {(tab === 'investors' || tab === 'realtors' || tab === 'admins') && (
        <div className="bg-[#141414] border border-white/10 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">
                  <th className="py-3 px-4 text-left">
                    {tab === 'investors' ? 'Инвестор' : tab === 'realtors' ? 'Риелтор' : 'Администратор'}
                  </th>
                  <th className="py-3 px-4 text-left">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((row) => {
                  const isRealtor = tab === 'realtors';
                  const isAdmin = tab === 'admins';
                  const blocked = row.status === 'Blocked';
                  const rowBusy = busy[row.id];
                  const showFlash = flash && flash.id === row.id;
                  // Passwords exist only for admins and realtors; investors log in via
                  // phone-OTP and have none, so no reset/restore for them.
                  const canManagePassword = isRealtor || isAdmin;
                  // У риелтора логин важнее компании: именно его называют при сбросе пароля,
                  // поэтому он идёт первым, а компания остаётся рядом, если она указана.
                  const subtitle = isRealtor
                    ? [row.username && `@${row.username}`, row.companyName].filter(Boolean).join(' · ') || 'Риелтор'
                    : isAdmin
                      ? row.username || row.email || 'Администратор'
                      : row.phone || row.email || '—';
                  return (
                    <tr key={row.id} className="hover:bg-white/5 align-top">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white font-serif block">
                          {row.fullName || row.name}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">{subtitle}</span>
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

                          {canManagePassword && (
                            <button
                              onClick={() => resetPassword(row)}
                              disabled={!!rowBusy}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold tracking-wider border border-white/15 text-gray-300 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <KeyRound size={11} />
                              {rowBusy === 'reset' ? '…' : 'Сбросить пароль'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && shown.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-gray-500 italic font-mono text-[11px]">
                      {tab === 'investors'
                        ? 'Инвесторы не найдены.'
                        : tab === 'realtors'
                          ? 'Риелторы не найдены.'
                          : 'Администраторы не найдены.'}
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
        )}
      </main>

      {/* Ban-reason modal */}
      {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setBanTarget(null)}
        >
          <div
            className="bg-[#141414] border border-rose-500/20 rounded-sm w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
              <Ban size={16} className="text-rose-400" />
              <h3 className="font-serif text-base text-white">
                Заблокировать: {banTarget.fullName || banTarget.name}
              </h3>
            </div>
            <label className="block text-[8px] uppercase font-bold tracking-wider text-gray-500 font-mono mb-1">
              Причина блокировки
            </label>
            <textarea
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Например: нарушение правил платформы…"
              className="w-full text-xs p-3 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-rose-400/50 resize-none"
            />
            <p className="text-[9px] text-gray-500 font-mono mt-1.5">
              Причина будет показана пользователю на экране блокировки.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setBanTarget(null)}
                className="flex-1 border border-white/15 text-gray-400 hover:bg-white/5 text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={confirmBan}
                className="flex-1 bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer"
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Регистрация риелтора / администратора */}
      {showRegister && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRegister(false)}
        >
          <div
            className="bg-[#141414] border border-white/10 rounded-sm w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-serif text-base text-white flex items-center gap-2">
                <UserPlus size={16} className="text-rose-400" />
                {regKind === 'admin' ? 'Новый администратор' : 'Новый риелтор'}
              </h3>
              <button
                onClick={() => setShowRegister(false)}
                className="text-gray-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitRegister} className="space-y-3 text-xs">
              {[
                { k: 'fullName', label: 'ФИО *' },
                { k: 'username', label: 'Логин *' },
                { k: 'password', label: 'Разовый пароль *', isPassword: true },
                // Компания и телефон — только у риелтора; у админа этих полей в аккаунте нет.
                ...(regKind === 'admin'
                  ? []
                  : [{ k: 'companyName', label: 'Компания' }, { k: 'phoneNumber', label: 'Телефон' }]),
              ].map((f) => {
                const inputCls =
                  'w-full p-2.5 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-rose-400/50 font-mono';
                return (
                  <div key={f.k} className="space-y-1">
                    <label className="block text-[8px] uppercase font-bold tracking-wider text-gray-500 font-mono">
                      {f.label}
                    </label>
                    {f.isPassword ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <PasswordInput
                              value={reg[f.k]}
                              onChange={(e) => {
                                setReg((r) => ({ ...r, [f.k]: e.target.value }));
                                setGeneratedPassword('');
                              }}
                              className={inputCls}
                              iconClassName="text-gray-500 hover:text-white"
                              placeholder=""
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const pwd = generateOneTimePassword();
                              setReg((r) => ({ ...r, password: pwd }));
                              setGeneratedPassword(pwd);
                              setPasswordCopied(false);
                              setPasswordCopyFailed(false);
                            }}
                            title="Сгенерировать пароль"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded border border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
                          >
                            <Wand2 size={12} /> Сгенерировать
                          </button>
                        </div>

                        {generatedPassword && (
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-3 py-2">
                            <code className="flex-1 font-mono text-[12px] text-emerald-300 break-all select-all">
                              {generatedPassword}
                            </code>
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await copyToClipboard(generatedPassword);
                                setPasswordCopied(ok);
                                setPasswordCopyFailed(!ok);
                              }}
                              title="Скопировать"
                              className="shrink-0 text-gray-400 hover:text-white cursor-pointer"
                            >
                              {passwordCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>
                        )}

                        {passwordCopyFailed && (
                          <p className="text-[9px] font-mono text-amber-400">
                            Браузер не дал доступ к буферу обмена — выделите пароль и скопируйте вручную.
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={reg[f.k]}
                        onChange={(e) => setReg((r) => ({ ...r, [f.k]: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                  </div>
                );
              })}

              <p className="text-[9px] text-gray-500 font-mono leading-relaxed">
                Пароль разовый: минимум 6 символов, заглавная и строчная буква, цифра и спецсимвол.
                При первом входе аккаунт не пустит в панель, пока не сменит его на свой.
              </p>

              {regResult && (
                <p className={`text-[10px] font-mono ${regResult.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {regResult.kind === 'ok' ? '✓ ' : '⚠ '}
                  {regResult.text}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="flex-1 border border-white/15 text-gray-400 hover:bg-white/5 text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={regBusy}
                  className="flex-1 bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 disabled:opacity-50 text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer"
                >
                  {regBusy ? 'Регистрируем…' : 'Зарегистрировать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
