import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Hourglass,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../api';
import { formatVal } from '../utils';

// The five lifecycle states of an application. There is no payment step: an application is
// reserved, then an operator approves or rejects it, the investor cancels it, or the
// reservation lapses on its own.
const STATUS = {
  Reserved: { label: 'Резерв', icon: Clock, badge: 'bg-amber-500 text-white border-amber-600/40' },
  Active: { label: 'Активна', icon: CheckCircle2, badge: 'bg-emerald-600 text-white border-emerald-700/40' },
  Rejected: { label: 'Отклонена', icon: XCircle, badge: 'bg-rose-600 text-white border-rose-700/40' },
  Cancelled: { label: 'Отменена', icon: Ban, badge: 'bg-gray-500 text-white border-gray-600/40' },
  Expired: { label: 'Истекла', icon: Hourglass, badge: 'bg-gray-400 text-white border-gray-500/40' },
  Annulled: { label: 'Отклонена', icon: XCircle, badge: 'bg-rose-600 text-white border-rose-700/40' },
};

const FILTERS = [
  { id: 'Reserved', label: 'Ждут решения' },
  { id: 'Active', label: 'Активные' },
  { id: 'Annulled', label: 'Отклонённые' },
  { id: 'Expired', label: 'Истёкшие' },
  { id: 'Cancelled', label: 'Отменённые' },
  { id: 'Rejected', label: 'Отклонённые ранее' },
  { id: '', label: 'Все' },
];

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Time left on a reservation, as a short phrase; null once it has lapsed. */
function timeLeft(reservedUntilUtc) {
  if (!reservedUntilUtc) return null;
  const ms = new Date(reservedUntilUtc).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  }
  if (hours >= 1) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  return `${Math.max(1, Math.floor(ms / 60_000))} мин`;
}

/**
 * The operator's application queue: confirm or decline with a reason, and see how long each
 * reservation is still held. An application creates itself in Reserved — nothing here starts
 * one, the operator only decides them.
 */
export default function Applications({ properties = [], investors = [], currency = 'KGS', onAddLog }) {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('Reserved');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // The decline dialog: a reason is mandatory, so declining is never a bare click.

  // Аннулирование: причина обязательна, а «были ли деньги» знает только оператор — расчёты
  // идут вне платформы, вывести это из данных нельзя.
  const [annullingId, setAnnullingId] = useState(null);
  const [annulReason, setAnnulReason] = useState('');
  const [annulRefund, setAnnulRefund] = useState(true);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name ?? 'Объект недвижимости';
  const investorName = (id) =>
    investors.find((i) => i.id === id)?.name ?? investors.find((i) => i.id === id)?.fullName ?? null;

  const load = useCallback(async (nextStatus) => {
    setLoading(true);
    setLoadError(null);
    try {
      setApplications((await api.investments.list({ status: nextStatus || undefined, take: 200 })) ?? []);
    } catch (err) {
      setLoadError(err?.problem?.detail ?? err?.message ?? 'Не удалось загрузить заявки.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const approve = async (app) => {
    setActionError(null);
    setBusyId(app.id);
    try {
      await api.investments.approve(app.id);
      onAddLog?.(`Заявка подтверждена: ${propertyName(app.propertyId)}, ${app.tokenCount} долей`);
      await load(status);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось подтвердить заявку.');
    } finally {
      setBusyId(null);
    }
  };

  const annul = async () => {
    const id = annullingId;
    if (!annulReason.trim()) return;

    setActionError(null);
    setBusyId(id);
    try {
      await api.investments.annul(id, annulReason.trim(), annulRefund);
      onAddLog?.(`Заявка отклонена: ${annulReason.trim()}`);
      setAnnullingId(null);
      setAnnulReason('');
      setAnnulRefund(true);
      await load(status);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось отклонить заявку.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = applications.filter((app) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      propertyName(app.propertyId).toLowerCase().includes(term)
      || (investorName(app.investorId) ?? '').toLowerCase().includes(term)
      || app.investorId?.toLowerCase().includes(term)
      || app.id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
            Заявки на приобретение долей
          </span>
          <h4 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-[#A38D6D]" />
            Очередь заявок
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Объект, инвестор или id"
              id="applications-search"
              className="pl-9 pr-3 py-2 w-64 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#A38D6D]"
            />
          </div>
          <button
            onClick={() => load(status)}
            id="applications-refresh"
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] transition-colors cursor-pointer"
            title="Обновить"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            onClick={() => setStatus(f.id)}
            id={`applications-filter-${f.id || 'all'}`}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
              status === f.id
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#A38D6D]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 size={26} className="animate-spin text-[#A38D6D]" />
          <span className="text-xs uppercase tracking-widest font-bold">Загрузка заявок…</span>
        </div>
      ) : loadError ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle size={26} className="text-rose-500" />
          <span className="text-sm font-serif font-bold text-gray-900">Не удалось загрузить заявки</span>
          <span className="text-xs text-gray-500 max-w-md">{loadError}</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-gray-400 font-serif">
          {search.trim() ? 'По запросу ничего не найдено.' : 'Заявок в этом статусе нет.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((app) => {
            const style = STATUS[app.status] ?? STATUS.Reserved;
            const StatusIcon = style.icon;
            const remaining = app.status === 'Reserved' ? timeLeft(app.reservedUntilUtc) : null;
            const lapsed = app.status === 'Reserved' && !remaining;

            return (
              <article
                key={app.id}
                id={`application-${app.id}`}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h5 className="font-serif text-base font-bold text-gray-900">
                      {propertyName(app.propertyId)}
                    </h5>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                      {investorName(app.investorId) ?? `Инвестор ${app.investorId?.slice(0, 8)}…`}
                      {' · подана '}
                      {formatDateTime(app.createdAtUtc)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
                  >
                    <StatusIcon size={12} />
                    {style.label}
                  </span>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Долей</dt>
                    <dd className="font-mono text-gray-900">
                      {Number(app.tokenCount ?? 0).toLocaleString('ru-RU')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Сумма</dt>
                    <dd className="font-mono text-gray-900">{formatVal(app.amount, currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Цена доли</dt>
                    <dd className="font-mono text-gray-900">{formatVal(app.pricePerToken, currency)}</dd>
                  </div>
                  {app.status === 'Reserved' && (
                    <div>
                      <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                        Резерв держится до
                      </dt>
                      <dd className="font-mono text-gray-900">
                        {formatDateTime(app.reservedUntilUtc)}
                        {remaining
                          ? <span className="text-amber-600"> · осталось {remaining}</span>
                          : <span className="text-rose-600"> · срок вышел</span>}
                      </dd>
                    </div>
                  )}
                </dl>

                {app.status === 'Rejected' && (
                  <p className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                    <span className="font-bold">Причина отклонения: </span>
                    {app.rejectionReason ?? 'не указана'}
                  </p>
                )}

                {lapsed && (
                  <p className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                    Срок резерва вышел — заявка погаснет сама, доли вернутся в пул объекта.
                  </p>
                )}

                {app.status === 'Annulled' && (
                  <p className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                    <span className="font-bold">Причина отклонения: </span>
                    {app.rejectionReason ?? 'не указана'}
                  </p>
                )}

                {(app.status === 'Reserved' || app.status === 'Active') && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {app.status === 'Reserved' && (
                    <button
                      onClick={() => approve(app)}
                      disabled={busyId === app.id}
                      id={`approve-application-${app.id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === app.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Подтвердить
                    </button>
                    )}
                    {/* Отклонение доступно и для активной заявки: это единственный способ
                        убрать ошибочную или тестовую строку так, чтобы доли вернулись в пул. */}
                    <button
                      onClick={() => {
                        setAnnullingId(app.id);
                        setAnnulReason('');
                        setAnnulRefund(app.status === 'Active');
                        setActionError(null);
                      }}
                      disabled={busyId === app.id}
                      id={`reject-application-${app.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle size={12} />
                      Отклонить
                    </button>
                  </div>
                )}

              </article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {annullingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setAnnullingId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4 text-left"
            >
              <div>
                <h5 className="font-serif text-lg font-bold text-gray-900">Отклонить заявку</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Доли вернутся в пул выпуска, а если
                  заявка была активной — реестр перестанет их считать и уже выпущенные будут сожжены.
                </p>
              </div>

              <textarea
                value={annulReason}
                onChange={(e) => setAnnulReason(e.target.value)}
                rows={3}
                autoFocus
                id="annul-reason-input"
                placeholder="Например: тестовая заявка, задвоение"
                className="w-full rounded-lg border border-gray-200 p-3 text-xs focus:outline-none focus:border-[#A38D6D]"
              />

              {/* Прошли ли деньги — знает только оператор: расчёты идут вне платформы. */}
              <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annulRefund}
                  onChange={(e) => setAnnulRefund(e.target.checked)}
                  id="annul-record-refund"
                  className="mt-0.5 accent-[#A38D6D] cursor-pointer"
                />
                <span>
                  Записать обязательство по возврату средств
                  <span className="block text-[11px] text-gray-400">
                    Снимите галочку, только если по заявке деньги не поступали — иначе долг перед
                    инвестором нигде не будет зафиксирован.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setAnnullingId(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:border-gray-400 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={annul}
                  disabled={!annulReason.trim() || busyId === annullingId}
                  id="confirm-reject-application"
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {busyId === annullingId ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  Отклонить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
