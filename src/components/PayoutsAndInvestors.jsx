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
} from 'lucide-react';
import api from '../api';
import { formatVal } from '../utils';

// A distribution is always computed against a frozen snapshot, never against live positions:
// a trade settling mid-run must not change who gets paid or how much.
const PAYOUT_PURPOSE = 'Payout';

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
 * Preparation of an investor distribution, built on the holder register.
 *
 * Deliberately stops short of moving money: how funds reach an investor — bank account or wallet —
 * is still an open product decision, and a screen reporting a payout as "выплачено" while nothing
 * has left an account is worse than one that does not offer the button. What it does is the part
 * that is settled: cut or pick the snapshot, compute each holder's share of the amount, export the
 * resulting register.
 */
export default function PayoutsAndInvestors({ properties = [], investors = [], currency = 'KGS', onAddLog }) {
  const [propertyId, setPropertyId] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [snapshot, setSnapshot] = useState(null);

  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const investorName = (id) => investors.find((i) => i.id === id)?.name ?? null;

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  const loadSnapshots = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    setSelectedSnapshotId('');
    try {
      const all = (await api.holders.snapshots(id)) ?? [];
      setSnapshots(all.filter((s) => s.purpose === PAYOUT_PURPOSE));
    } catch (err) {
      setError(err?.problem?.detail ?? err?.message ?? 'Не удалось загрузить срезы реестра.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots(propertyId);
  }, [propertyId, loadSnapshots]);

  const openSnapshot = async (id) => {
    setSelectedSnapshotId(id);
    setError(null);
    if (!id) {
      setSnapshot(null);
      return;
    }
    setBusy('open');
    try {
      setSnapshot(await api.holders.snapshot(id));
    } catch (err) {
      setError(err?.problem?.detail ?? err?.message ?? 'Не удалось открыть срез.');
    } finally {
      setBusy(null);
    }
  };

  const takeSnapshot = async () => {
    setError(null);
    setBusy('snapshot');
    try {
      const id = await api.holders.createSnapshot({ propertyId, purpose: PAYOUT_PURPOSE });
      onAddLog?.(
        'Срез реестра для выплаты',
        `Снят срез реестра держателей для расчёта выплаты по объекту «${
          properties.find((p) => p.id === propertyId)?.name ?? propertyId
        }».`
      );
      await loadSnapshots(propertyId);
      if (id) await openSnapshot(id);
    } catch (err) {
      setError(err?.problem?.detail ?? err?.message ?? 'Не удалось снять срез.');
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
      setError(err?.problem?.detail ?? err?.message ?? 'Не удалось выгрузить срез.');
    } finally {
      setBusy(null);
    }
  };

  const header = snapshot?.snapshot;
  const rows = snapshot?.rows ?? [];
  const total = Number(amount) || 0;
  const totalTokens = Number(header?.totalTokens ?? 0);
  const perToken = totalTokens > 0 ? total / totalTokens : 0;

  const visibleRows = rows.filter((r) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      r.walletAddress?.toLowerCase().includes(term)
      || (investorName(r.investorId) ?? '').toLowerCase().includes(term)
      || (r.investorId ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 font-sans text-left">
      <div>
        <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
          Подготовка выплат по реестру держателей
        </span>
        <h2 className="text-xl font-serif font-bold text-gray-900">Выплаты инвесторам</h2>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Экран готовит ведомость и ничего не перечисляет: способ выплаты — на банковский счёт или на
          кошелёк — ещё не выбран. Расчёт всегда идёт по замороженному срезу, а не по текущим позициям,
          чтобы сделка в момент начисления не меняла состав получателей.
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
                Ведомость начисления
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
                  onChange={(e) => openSnapshot(e.target.value)}
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
          </div>

          {header && (
            <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-xs">
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Срез на</dt>
                <dd className="font-mono text-gray-900">{formatDateTime(header.snapshotAtUtc)}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Держателей</dt>
                <dd className="font-mono text-gray-900">{header.addressCount}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Долей в срезе</dt>
                <dd className="font-mono text-gray-900">{totalTokens.toLocaleString('ru-RU')}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">На одну долю</dt>
                <dd className="font-mono text-gray-900">
                  {totalTokens > 0 && total > 0 ? formatVal(perToken, currency, true) : '—'}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-sm p-6 shadow-xs lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-150 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#A38D6D]" />
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                  Детализация по держателям
                </span>
              </div>
              <h3 className="text-base font-serif font-bold text-gray-900 mt-1">
                {header ? `${visibleRows.length} из ${rows.length} строк` : 'Срез не выбран'}
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
              <span className="text-xs uppercase tracking-widest font-bold">Загрузка среза…</span>
            </div>
          ) : !header ? (
            <div className="py-16 text-center text-gray-400 font-serif text-sm">
              Выберите срез реестра, чтобы увидеть, кому и сколько причитается.
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="py-16 text-center text-gray-400 font-serif text-sm">
              {search.trim() ? 'По запросу ничего не найдено.' : 'В срезе нет держателей.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Адрес</th>
                    <th className="px-3 py-2.5 text-left">Инвестор</th>
                    <th className="px-3 py-2.5 text-right">Долей</th>
                    <th className="px-3 py-2.5 text-right">Доля выпуска</th>
                    <th className="px-3 py-2.5 text-right">К начислению</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.walletAddress} className="border-t border-gray-100">
                      <td className="px-3 py-2.5 font-mono text-gray-900">{r.walletAddress}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-500">
                        {investorName(r.investorId) ?? shortId(r.investorId)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                        {Number(r.tokenCount ?? 0).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-500">
                        {(Number(r.share ?? 0) * 100).toFixed(4)} %
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                        {total > 0 ? formatVal(Number(r.tokenCount ?? 0) * perToken, currency, true) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {total > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-bold">
                      <td className="px-3 py-2.5 text-gray-500" colSpan={2}>Итого по срезу</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                        {totalTokens.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-500">100 %</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                        {formatVal(total, currency, true)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
