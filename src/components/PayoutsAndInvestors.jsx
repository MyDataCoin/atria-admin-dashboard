import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  Camera,
  Download,
  Info,
  AlertTriangle,
  Loader2,
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Lock,
} from 'lucide-react';
import api from '../api';
import { formatVal } from '../utils';

// A distribution is always computed against a frozen snapshot, never against live positions:
// a trade settling mid-run must not change who gets paid or how much.
const PAYOUT_PURPOSE = 'Payout';

const RUN_STATUS = {
  Draft: { label: 'Черновик', icon: Clock, badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  Approved: { label: 'Открыто к выплате', icon: ShieldCheck, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  Completed: { label: 'Закрыто', icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled: { label: 'Отменено', icon: Ban, badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const ITEM_STATUS = {
  Pending: { label: 'К выплате', className: 'text-gray-500' },
  Paid: { label: 'Выплачено', className: 'text-emerald-700' },
  Failed: { label: 'Не доставлено', className: 'text-rose-700' },
};

const KIND_LABEL = { Dividend: 'Доход', CapitalReturn: 'Возврат капитала' };
const METHOD_LABEL = { BankTransfer: 'Банковский перевод', Wallet: 'На кошелёк' };

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

const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');

/**
 * Distributions to the holders of an issue.
 *
 * The arithmetic lives on the server, against a frozen snapshot — this screen does not divide the
 * amount itself. Showing a second, independently rounded set of numbers beside the authoritative
 * ones would be worse than showing none: the operator would have two answers to "what does this
 * holder get" and no way to tell which one the payment will follow.
 *
 * A run is created as a draft that authorises nothing, opens for settlement only after a second
 * person approves it, and records what each payment came back with. The platform still does not move
 * money; what it holds is what is owed, who authorised it, and the evidence it was paid.
 */
export default function PayoutsAndInvestors({ properties = [], investors = [], currency = 'KGS', onAddLog }) {
  const [propertyId, setPropertyId] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');

  const [kind, setKind] = useState('Dividend');
  const [method, setMethod] = useState('BankTransfer');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const investorName = (id) => investors.find((i) => i.id === id)?.name ?? null;
  const propertyName = (id) => properties.find((p) => p.id === id)?.name ?? id;
  const fail = (err, fallback) => setError(err?.problem?.detail ?? err?.message ?? fallback);

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  const loadForProperty = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    setSelectedRunId('');
    setSelectedSnapshotId('');
    try {
      const [allSnapshots, allRuns] = await Promise.all([
        api.holders.snapshots(id),
        api.payouts.list(id),
      ]);
      setSnapshots((allSnapshots ?? []).filter((s) => s.purpose === PAYOUT_PURPOSE));
      setRuns(allRuns ?? []);
    } catch (err) {
      fail(err, 'Не удалось загрузить срезы и распределения.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForProperty(propertyId);
  }, [propertyId, loadForProperty]);

  const openRun = async (id) => {
    setSelectedRunId(id);
    setError(null);
    if (!id) {
      setDetail(null);
      return;
    }
    setBusy('open');
    try {
      setDetail(await api.payouts.get(id));
    } catch (err) {
      fail(err, 'Не удалось открыть распределение.');
    } finally {
      setBusy(null);
    }
  };

  // Re-read after every change rather than patching locally: the server owns the arithmetic and the
  // state machine, and a screen that guesses at the outcome of a payment is the one thing this
  // screen must not do.
  const refresh = async () => {
    const [allRuns, current] = await Promise.all([
      api.payouts.list(propertyId),
      selectedRunId ? api.payouts.get(selectedRunId) : Promise.resolve(null),
    ]);
    setRuns(allRuns ?? []);
    if (current) setDetail(current);
  };

  const takeSnapshot = async () => {
    setError(null);
    setBusy('snapshot');
    try {
      const id = await api.holders.createSnapshot({ propertyId, purpose: PAYOUT_PURPOSE });
      onAddLog?.(
        'Срез реестра для выплаты',
        `Снят срез реестра держателей для расчёта выплаты по объекту «${propertyName(propertyId)}».`
      );
      const all = await api.holders.snapshots(propertyId);
      setSnapshots((all ?? []).filter((s) => s.purpose === PAYOUT_PURPOSE));
      if (id) setSelectedSnapshotId(id);
    } catch (err) {
      fail(err, 'Не удалось снять срез.');
    } finally {
      setBusy(null);
    }
  };

  const createRun = async () => {
    setError(null);
    setBusy('create');
    try {
      const id = await api.payouts.create({
        snapshotId: selectedSnapshotId,
        kind,
        method,
        declaredAmount: Number(amount),
        currency,
        note: note.trim() || null,
      });
      onAddLog?.(
        'Расчёт распределения',
        `Рассчитано распределение ${formatVal(Number(amount), currency, true)} по объекту `
          + `«${propertyName(propertyId)}». Выплаты откроются после второго подтверждения.`
      );
      setAmount('');
      setNote('');
      await loadForProperty(propertyId);
      if (id) await openRun(id);
    } catch (err) {
      fail(err, 'Не удалось рассчитать распределение.');
    } finally {
      setBusy(null);
    }
  };

  const requestApproval = async () => {
    setError(null);
    setBusy('approval');
    try {
      await api.governance.request('PayoutRun', selectedRunId, detail?.run?.note ?? null);
      onAddLog?.(
        'Запрошено подтверждение выплаты',
        `Распределение по объекту «${propertyName(propertyId)}» отправлено на второе подтверждение.`
      );
    } catch (err) {
      fail(err, 'Не удалось запросить подтверждение.');
    } finally {
      setBusy(null);
    }
  };

  const settleItem = async (item) => {
    const reference = window.prompt(
      `Основание платежа для ${item.walletAddress} на ${formatVal(item.amount, currency, true)}:`
    );
    if (!reference?.trim()) return;

    setError(null);
    setBusy(item.id);
    try {
      await api.payouts.settle(selectedRunId, item.id, reference.trim());
      await refresh();
    } catch (err) {
      fail(err, 'Не удалось отметить выплату.');
    } finally {
      setBusy(null);
    }
  };

  const failItem = async (item) => {
    const reason = window.prompt(`Почему платёж держателю ${item.walletAddress} не прошёл?`);
    if (!reason?.trim()) return;

    setError(null);
    setBusy(item.id);
    try {
      await api.payouts.fail(selectedRunId, item.id, reason.trim());
      await refresh();
    } catch (err) {
      fail(err, 'Не удалось отметить неудачу.');
    } finally {
      setBusy(null);
    }
  };

  const completeRun = async () => {
    setError(null);
    setBusy('complete');
    try {
      await api.payouts.complete(selectedRunId);
      onAddLog?.(
        'Распределение закрыто',
        `Распределение по объекту «${propertyName(propertyId)}» закрыто.`
      );
      await refresh();
    } catch (err) {
      fail(err, 'Не удалось закрыть распределение.');
    } finally {
      setBusy(null);
    }
  };

  const cancelRun = async () => {
    const reason = window.prompt('Почему распределение отменяется?');
    if (!reason?.trim()) return;

    setError(null);
    setBusy('cancel');
    try {
      await api.payouts.cancel(selectedRunId, reason.trim());
      await refresh();
    } catch (err) {
      fail(err, 'Не удалось отменить распределение.');
    } finally {
      setBusy(null);
    }
  };

  const downloadSnapshot = async () => {
    if (!selectedSnapshotId) return;
    setError(null);
    setBusy('export');
    try {
      const response = await api.holders.exportSnapshot(selectedSnapshotId);
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"';]+)"?/i.exec(disposition);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = match?.[1] ?? `holder-snapshot-${selectedSnapshotId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      fail(err, 'Не удалось выгрузить срез.');
    } finally {
      setBusy(null);
    }
  };

  const run = detail?.run;
  const items = detail?.items ?? [];
  const runStatus = RUN_STATUS[run?.status] ?? RUN_STATUS.Draft;
  const RunStatusIcon = runStatus.icon;
  const canSettle = run?.status === 'Approved';

  const visibleItems = items.filter((i) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      i.walletAddress?.toLowerCase().includes(term)
      || (investorName(i.investorId) ?? '').toLowerCase().includes(term)
      || (i.investorId ?? '').toLowerCase().includes(term)
    );
  });

  const canCreate = selectedSnapshotId && Number(amount) > 0 && busy !== 'create';

  return (
    <div className="space-y-8 font-sans text-left">
      <div>
        <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
          Распределения по реестру держателей
        </span>
        <h2 className="text-xl font-serif font-bold text-gray-900">Выплаты инвесторам</h2>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Платформа не перечисляет деньги: она считает, кому и сколько причитается по замороженному
          срезу, держит расчёт за вторым подтверждением и фиксирует основание каждого платежа. Пока
          распределение не подтверждено вторым человеком, оно никого ни к чему не обязывает.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs lg:col-span-5 space-y-4">
          <div className="border-b border-gray-150 pb-3">
            <div className="flex items-center gap-2">
              <Calculator size={15} className="text-[#A38D6D]" />
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                Новое распределение
              </span>
            </div>
            <h3 className="text-base font-serif font-bold text-gray-900 mt-1">Расчёт на срез реестра</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Объект
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                id="payout-property"
                className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-serif font-bold"
              >
                {properties.length === 0 && <option value="">Объектов нет</option>}
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.city ? `${p.name} (${p.city})` : p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Срез реестра для выплаты
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedSnapshotId}
                  onChange={(e) => setSelectedSnapshotId(e.target.value)}
                  disabled={loading}
                  id="payout-snapshot"
                  className="flex-1 p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-mono"
                >
                  <option value="">— выбрать срез —</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDateTime(s.snapshotAtUtc)} · {s.addressCount} адресов
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={!propertyId || busy === 'snapshot'}
                  id="payout-take-snapshot"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Снять новый срез на текущий момент"
                >
                  {busy === 'snapshot' ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  Срез
                </button>
              </div>
              {!loading && snapshots.length === 0 && (
                <p className="mt-1 text-[10px] text-gray-400">
                  Срезов для выплаты по этому объекту ещё нет — снимите первый.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                  Вид
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  id="payout-kind"
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                >
                  <option value="Dividend">{KIND_LABEL.Dividend}</option>
                  <option value="CapitalReturn">{KIND_LABEL.CapitalReturn}</option>
                </select>
              </div>
              <div>
                <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                  Способ выплаты
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  id="payout-method"
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                >
                  <option value="BankTransfer">{METHOD_LABEL.BankTransfer}</option>
                  <option value="Wallet">{METHOD_LABEL.Wallet}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Сумма к распределению
              </label>
              <input
                type="number"
                min="0"
                placeholder="Сумма за отчётный период"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                id="payout-amount"
                className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[8px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Назначение
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Например: дивиденды за II квартал 2026"
                id="payout-note"
                className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
              />
            </div>

            <button
              type="button"
              onClick={createRun}
              disabled={!canCreate}
              id="payout-create"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy === 'create' ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
              Рассчитать распределение
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
              Распределения по объекту
            </span>
            {loading ? (
              <div className="py-4 flex items-center gap-2 text-gray-400 text-xs">
                <Loader2 size={12} className="animate-spin" /> Загрузка…
              </div>
            ) : runs.length === 0 ? (
              <p className="text-[11px] text-gray-400 font-serif">Распределений ещё не было.</p>
            ) : (
              <ul className="space-y-1.5">
                {runs.map((r) => {
                  const style = RUN_STATUS[r.status] ?? RUN_STATUS.Draft;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => openRun(r.id)}
                        id={`payout-run-${r.id}`}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                          selectedRunId === r.id
                            ? 'border-[#A38D6D] bg-[#A38D6D]/5'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-mono text-xs text-gray-900">
                            {formatVal(r.declaredAmount, r.currency, true)}
                          </span>
                          <span className="block text-[10px] text-gray-400">
                            срез {formatDateTime(r.snapshotAtUtc)} · {r.paidCount}/{r.holderCount} выплачено
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${style.badge}`}>
                          {style.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-150 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#A38D6D]" />
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                  Ведомость выплаты
                </span>
              </div>
              <h3 className="text-base font-serif font-bold text-gray-900 mt-1">
                {run ? `${visibleItems.length} из ${items.length} держателей` : 'Распределение не выбрано'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Адрес или инвестор"
                  id="payout-search"
                  className="pl-8 pr-3 py-2 w-52 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#A38D6D]"
                />
              </div>
              <button
                type="button"
                onClick={downloadSnapshot}
                disabled={!selectedSnapshotId || busy === 'export'}
                id="payout-export"
                title="Выгрузить выбранный срез реестра"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:border-[#A38D6D] hover:text-[#A38D6D] disabled:opacity-50 cursor-pointer"
              >
                {busy === 'export' ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                CSV
              </button>
            </div>
          </div>

          {busy === 'open' ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin text-[#A38D6D]" />
              <span className="text-xs uppercase tracking-widest font-bold">Загрузка распределения…</span>
            </div>
          ) : !run ? (
            <div className="py-16 text-center text-gray-400 font-serif text-sm">
              Выберите распределение слева или рассчитайте новое.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${runStatus.badge}`}>
                  <RunStatusIcon size={11} />
                  {runStatus.label}
                </span>

                <div className="flex items-center gap-2">
                  {run.status === 'Draft' && (
                    <>
                      <button
                        type="button"
                        onClick={requestApproval}
                        disabled={busy === 'approval'}
                        id="payout-request-approval"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#111111] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black disabled:opacity-50 cursor-pointer"
                      >
                        {busy === 'approval' ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                        Запросить подтверждение
                      </button>
                      <button
                        type="button"
                        onClick={cancelRun}
                        disabled={busy === 'cancel'}
                        id="payout-cancel"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                      >
                        <Ban size={11} />
                        Отменить
                      </button>
                    </>
                  )}
                  {run.status === 'Approved' && (
                    <button
                      type="button"
                      onClick={completeRun}
                      disabled={busy === 'complete'}
                      id="payout-complete"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {busy === 'complete' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Закрыть распределение
                    </button>
                  )}
                </div>
              </div>

              {run.status === 'Draft' && (
                <div className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                  <Lock size={12} className="mt-0.5 shrink-0" />
                  Расчёт готов, но никого ни к чему не обязывает. Отметки о выплате станут доступны
                  после того, как распределение подтвердит второй человек.
                </div>
              )}

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-gray-100 pb-4">
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Объявлено</dt>
                  <dd className="font-mono text-gray-900">{formatVal(run.declaredAmount, run.currency, true)}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Выплачено</dt>
                  <dd className="font-mono text-emerald-700">{formatVal(run.paidAmount, run.currency, true)}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Остаток</dt>
                  <dd className="font-mono text-gray-900">{formatVal(run.outstandingAmount, run.currency, true)}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Способ</dt>
                  <dd className="font-mono text-gray-900">{METHOD_LABEL[run.method] ?? run.method}</dd>
                </div>
              </dl>

              {visibleItems.length === 0 ? (
                <div className="py-16 text-center text-gray-400 font-serif text-sm">
                  {search.trim() ? 'По запросу ничего не найдено.' : 'В распределении нет держателей.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Адрес</th>
                        <th className="px-3 py-2.5 text-left">Инвестор</th>
                        <th className="px-3 py-2.5 text-right">Долей</th>
                        <th className="px-3 py-2.5 text-right">К выплате</th>
                        <th className="px-3 py-2.5 text-left">Состояние</th>
                        <th className="px-3 py-2.5 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((i) => {
                        const status = ITEM_STATUS[i.status] ?? ITEM_STATUS.Pending;
                        return (
                          <tr key={i.id} className="border-t border-gray-100">
                            <td className="px-3 py-2.5 font-mono text-gray-900">{i.walletAddress}</td>
                            <td className="px-3 py-2.5 font-mono text-gray-500">
                              {investorName(i.investorId) ?? shortId(i.investorId)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                              {Number(i.tokenCount ?? 0).toLocaleString('ru-RU')}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                              {formatVal(i.amount, run.currency, true)}
                            </td>
                            <td className={`px-3 py-2.5 font-mono ${status.className}`}>
                              {status.label}
                              {i.settlementReference && (
                                <span className="block text-[10px] text-gray-400">{i.settlementReference}</span>
                              )}
                              {i.failureReason && i.status === 'Failed' && (
                                <span className="block text-[10px] text-rose-400">{i.failureReason}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              {canSettle && i.status !== 'Paid' && (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => settleItem(i)}
                                    disabled={busy === i.id}
                                    id={`payout-settle-${i.id}`}
                                    title="Отметить выплаченным"
                                    className="rounded p-1 text-gray-400 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
                                  >
                                    {busy === i.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => failItem(i)}
                                    disabled={busy === i.id}
                                    id={`payout-fail-${i.id}`}
                                    title="Платёж не прошёл"
                                    className="rounded p-1 text-gray-400 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                                  >
                                    <XCircle size={13} />
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-bold">
                        <td className="px-3 py-2.5 text-gray-500" colSpan={2}>Итого</td>
                        <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                          {Number(run.totalTokens ?? 0).toLocaleString('ru-RU')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                          {formatVal(run.declaredAmount, run.currency, true)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
