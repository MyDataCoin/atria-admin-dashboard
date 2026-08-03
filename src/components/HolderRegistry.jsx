import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Camera,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import api from '../api';

// Why a snapshot was taken. A payout run and a regulatory statement drawn on the same date are
// separate, independently auditable snapshots — hence the choice at cut time.
const PURPOSES = [
  { id: 'Payout', label: 'Для выплаты' },
  { id: 'Reporting', label: 'Для отчётности' },
];

const SOURCE_LABEL = { OurRecords: 'Наши записи', Chain: 'Сеть' };

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
const sharePercent = (share) => `${(Number(share ?? 0) * 100).toFixed(4)} %`;

/**
 * The holder register of an issue: who holds what now, the frozen snapshots of who held what at a
 * given cut, and the CSV the operator hands to a regulator.
 *
 * The register is per issue, so everything here hangs off the selected property.
 */
export default function HolderRegistry({ properties = [], onAddLog }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [search, setSearch] = useState('');

  const [registry, setRegistry] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [openSnapshot, setOpenSnapshot] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [purpose, setPurpose] = useState('Reporting');

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  const load = useCallback(async (id, term) => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [positions, cuts] = await Promise.all([
        api.holders.registry(id, term || undefined),
        api.holders.snapshots(id),
      ]);
      setRegistry(positions ?? []);
      setSnapshots(cuts ?? []);
    } catch (err) {
      setLoadError(err?.problem?.detail ?? err?.message ?? 'Не удалось загрузить реестр.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOpenSnapshot(null);
    load(propertyId, search);
    // Re-reading on every keystroke would hammer the API; the search is submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, load]);

  const takeSnapshot = async () => {
    setActionError(null);
    setBusy('snapshot');
    try {
      await api.holders.createSnapshot({ propertyId, purpose });
      onAddLog?.(`Снят срез реестра держателей (${purpose === 'Payout' ? 'для выплаты' : 'для отчётности'})`);
      await load(propertyId, search);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось снять срез.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (snapshotId) => {
    setActionError(null);
    setBusy(snapshotId);
    try {
      const response = await api.holders.exportSnapshot(snapshotId);
      const blob = await response.blob();

      // The file name comes from the server so the download carries the issue and the cut.
      const disposition = response.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"';]+)"?/i.exec(disposition);
      const fileName = match?.[1] ?? `holder-snapshot-${snapshotId}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось выгрузить срез.');
    } finally {
      setBusy(null);
    }
  };

  const openCut = async (snapshotId) => {
    setActionError(null);
    setBusy(snapshotId);
    try {
      setOpenSnapshot(await api.holders.snapshot(snapshotId));
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось открыть срез.');
    } finally {
      setBusy(null);
    }
  };

  const totalTokens = registry.reduce((sum, p) => sum + Number(p.tokenCount ?? 0), 0);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
            Кто держит доли выпуска
          </span>
          <h4 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-[#A38D6D]" />
            Реестр держателей
          </h4>
        </div>

        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          id="registry-property"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#A38D6D]"
        >
          {properties.length === 0 && <option value="">Объектов нет</option>}
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{actionError}</span>
        </div>
      )}

      {openSnapshot ? (
        <SnapshotDetail snapshot={openSnapshot} onBack={() => setOpenSnapshot(null)} />
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(propertyId, search);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Адрес кошелька или id инвестора"
                id="registry-search"
                className="pl-9 pr-3 py-2 w-80 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#A38D6D]"
              />
            </div>
            <button
              type="submit"
              id="registry-search-submit"
              className="rounded-lg border border-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:border-[#A38D6D] hover:text-[#A38D6D] cursor-pointer"
            >
              Найти
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); load(propertyId, ''); }}
              id="registry-refresh"
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] cursor-pointer"
              title="Сбросить и обновить"
            >
              <RefreshCw size={14} />
            </button>

            <div className="ml-auto flex items-center gap-2">
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                id="snapshot-purpose"
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#A38D6D]"
              >
                {PURPOSES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={!propertyId || busy === 'snapshot'}
                id="take-snapshot"
                className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy === 'snapshot' ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                Снять срез
              </button>
            </div>
          </form>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={26} className="animate-spin text-[#A38D6D]" />
              <span className="text-xs uppercase tracking-widest font-bold">Загрузка реестра…</span>
            </div>
          ) : loadError ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle size={26} className="text-rose-500" />
              <span className="text-sm font-serif font-bold text-gray-900">Не удалось загрузить реестр</span>
              <span className="text-xs text-gray-500 max-w-md">{loadError}</span>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h5 className="font-serif text-base font-bold text-gray-900">Текущие держатели</h5>
                  <span className="text-[11px] font-mono text-gray-400">
                    {registry.length} адресов · {totalTokens.toLocaleString('ru-RU')} долей
                  </span>
                </div>

                {registry.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 font-serif">
                    {search.trim() ? 'По запросу ничего не найдено.' : 'По этому выпуску держателей пока нет.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                        <tr>
                          <th className="px-4 py-3 text-left">Адрес</th>
                          <th className="px-4 py-3 text-right">Долей</th>
                          <th className="px-4 py-3 text-left">Инвестор</th>
                          <th className="px-4 py-3 text-left">Белый список</th>
                          <th className="px-4 py-3 text-left">Источник</th>
                          <th className="px-4 py-3 text-left">Сверено</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registry.map((p) => (
                          <tr key={p.walletAddress} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-mono text-gray-900">{p.walletAddress}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">
                              {Number(p.tokenCount ?? 0).toLocaleString('ru-RU')}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-500">
                              {p.investorId ? shortId(p.investorId) : (
                                // No link to an investor is a signal to investigate, not a
                                // steady state: every holder is a wallet we allowlisted.
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <ShieldAlert size={12} /> не связан
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {p.isAllowlisted ? (
                                <span className="text-emerald-600 font-bold">в списке</span>
                              ) : (
                                // A delisted address can still hold shares — we hold no keys and
                                // cannot claw them back. Such a holder belongs here, flagged.
                                <span className="text-rose-600 font-bold">исключён</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{SOURCE_LABEL[p.source] ?? p.source}</td>
                            <td className="px-4 py-3 font-mono text-gray-400">{formatDateTime(p.lastSyncedAtUtc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h5 className="font-serif text-base font-bold text-gray-900">Срезы реестра</h5>

                {snapshots.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 font-serif">
                    Срезов по этому выпуску ещё нет.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                        <tr>
                          <th className="px-4 py-3 text-left">Срез на</th>
                          <th className="px-4 py-3 text-left">Назначение</th>
                          <th className="px-4 py-3 text-right">Адресов</th>
                          <th className="px-4 py-3 text-right">Долей</th>
                          <th className="px-4 py-3 text-left">Блок</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {snapshots.map((s) => (
                          <tr key={s.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-mono text-gray-900">{formatDateTime(s.snapshotAtUtc)}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {PURPOSES.find((p) => p.id === s.purpose)?.label ?? s.purpose}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">{s.addressCount}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">
                              {Number(s.totalTokens ?? 0).toLocaleString('ru-RU')}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-400">
                              {s.blockNumber ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openCut(s.id)}
                                  disabled={busy === s.id}
                                  id={`open-snapshot-${s.id}`}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:border-[#A38D6D] hover:text-[#A38D6D] disabled:opacity-50 cursor-pointer"
                                >
                                  Открыть
                                </button>
                                <button
                                  onClick={() => download(s.id)}
                                  disabled={busy === s.id}
                                  id={`export-snapshot-${s.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:border-[#A38D6D] hover:text-[#A38D6D] disabled:opacity-50 cursor-pointer"
                                >
                                  {busy === s.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                                  CSV
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** A frozen snapshot with its rows. Immutable by construction — there is nothing to edit here. */
function SnapshotDetail({ snapshot, onBack }) {
  const header = snapshot.snapshot ?? {};
  const rows = snapshot.rows ?? [];

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        id="snapshot-back"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#A38D6D] cursor-pointer"
      >
        <ArrowLeft size={12} /> К реестру
      </button>

      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <h5 className="font-serif text-base font-bold text-gray-900">
          Срез на {formatDateTime(header.snapshotAtUtc)}
        </h5>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Назначение</dt>
            <dd className="text-gray-900">
              {PURPOSES.find((p) => p.id === header.purpose)?.label ?? header.purpose}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Адресов</dt>
            <dd className="font-mono text-gray-900">{header.addressCount}</dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Всего долей</dt>
            <dd className="font-mono text-gray-900">
              {Number(header.totalTokens ?? 0).toLocaleString('ru-RU')}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Блок сети</dt>
            <dd className="font-mono text-gray-900">{header.blockNumber ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Адрес</th>
              <th className="px-4 py-3 text-right">Долей</th>
              <th className="px-4 py-3 text-right">Доля выпуска</th>
              <th className="px-4 py-3 text-left">Инвестор</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.walletAddress} className="border-t border-gray-100">
                <td className="px-4 py-3 font-mono text-gray-900">{r.walletAddress}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">
                  {Number(r.tokenCount ?? 0).toLocaleString('ru-RU')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{sharePercent(r.share)}</td>
                <td className="px-4 py-3 font-mono text-gray-500">
                  {r.investorId ? shortId(r.investorId) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
