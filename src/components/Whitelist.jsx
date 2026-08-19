import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListChecks,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Hourglass,
  Layers,
  Coins,
  Ban,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import api from '../api';

// Where a purchase request stands on the way to being minted. A request appears here the moment the
// investor presses buy — nothing on this screen creates one.
const STATUS = {
  Pending: { label: 'Ждёт одобрения', icon: Clock, badge: 'bg-amber-500 text-white border-amber-600/40' },
  Ready: { label: 'Готов к минту', icon: CheckCircle2, badge: 'bg-sky-600 text-white border-sky-700/40' },
  Batched: { label: 'В списке', icon: Layers, badge: 'bg-indigo-600 text-white border-indigo-700/40' },
  Minted: { label: 'Заминчен', icon: Coins, badge: 'bg-emerald-600 text-white border-emerald-700/40' },
  Excluded: { label: 'Выбыл', icon: XCircle, badge: 'bg-gray-400 text-white border-gray-500/40' },
};

const FILTERS = [
  { id: 'Ready', label: 'Готовы к минту' },
  { id: 'Pending', label: 'Ждут одобрения' },
  { id: 'Batched', label: 'В списках' },
  { id: 'Minted', label: 'Заминчены' },
  { id: 'Excluded', label: 'Выбывшие' },
  { id: '', label: 'Все' },
];

// Lifecycle of a batch handed to the exchange.
const LIST_STATUS = {
  Draft: { label: 'Черновик', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  Sent: { label: 'Передан бирже', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Executed: { label: 'Исполнен', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled: { label: 'Отменён', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

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
const fmtTokens = (n) =>
  Number(n ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Pulls the server's file name out of the response so the download carries the batch number. */
async function downloadResponse(response, fallbackName) {
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="?([^"';]+)"?/i.exec(disposition);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * The whitelist queue of an issue and the mint lists built from it.
 *
 * Everything hangs off the selected issue: shares are minted on that issue's own permissioned
 * contract, so a batch spanning two issues has no single contract to be executed against.
 */
export default function Whitelist({ properties = [], onAddLog }) {
  // Пустая строка = все выпуски. Именно так экран и открывается: заявка приходит по любому
  // объекту, и заставлять оператора угадывать, по какому именно, — способ её не увидеть.
  const [propertyId, setPropertyId] = useState('');
  const [status, setStatus] = useState('Ready');

  const [entries, setEntries] = useState([]);
  const [mintLists, setMintLists] = useState([]);
  const [openList, setOpenList] = useState(null);

  // Requests ticked for the next batch. Cleared whenever the queue is re-read, so a stale tick can
  // never carry a request that has since been batched by someone else into a second list.
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(null);

  // The cancel dialog: a reason is mandatory, so calling a batch off is never a bare click.
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async (id, statusFilter) => {
    setLoading(true);
    setLoadError(null);
    setSelected([]);
    try {
      const [queue, lists] = await Promise.all([
        api.whitelist.entries(id || undefined, statusFilter || undefined),
        api.whitelist.mintLists(id || undefined),
      ]);
      setEntries(queue ?? []);
      setMintLists(lists ?? []);
    } catch (err) {
      setLoadError(err?.problem?.detail ?? err?.message ?? 'Не удалось загрузить whitelist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOpenList(null);
    load(propertyId, status);
  }, [propertyId, status, load]);

  // Only these can go into a batch: approved, not already in one, and with an address to mint to.
  const mintable = useMemo(
    () => entries.filter((e) => e.status === 'Ready' && e.walletAddress),
    [entries],
  );

  const selectedTokens = useMemo(
    () =>
      mintable
        .filter((e) => selected.includes(e.id))
        .reduce((sum, e) => sum + Number(e.tokenCount ?? 0), 0),
    [mintable, selected],
  );

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () =>
    setSelected((prev) => (prev.length === mintable.length ? [] : mintable.map((e) => e.id)));

  const createList = async () => {
    setActionError(null);
    setBusy('create');
    try {
      // An empty selection means "everything ready" — the server resolves it, so the batch is built
      // from what is mintable at that instant rather than from what this screen last saw.
      await api.whitelist.createMintList(propertyId, selected, note.trim() || undefined);
      onAddLog?.(
        `Сформирован список на минт: ${selected.length || mintable.length} адресов`,
      );
      setNote('');
      await load(propertyId, status);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось сформировать список.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (list) => {
    setActionError(null);
    setBusy(list.id);
    try {
      await downloadResponse(await api.whitelist.exportMintList(list.id), `mint-list-${list.number}.csv`);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось выгрузить список.');
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (list, action, verb) => {
    setActionError(null);
    setBusy(list.id);
    try {
      await action(list.id);
      onAddLog?.(`Список на минт ${list.number}: ${verb}`);
      await load(propertyId, status);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Действие не удалось.');
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = async () => {
    const list = mintLists.find((l) => l.id === cancellingId);
    if (!list || !cancelReason.trim()) return;

    setActionError(null);
    setBusy(list.id);
    try {
      await api.whitelist.cancelMintList(list.id, cancelReason.trim());
      onAddLog?.(`Список на минт ${list.number} отменён: ${cancelReason.trim()}`);
      setCancellingId(null);
      setCancelReason('');
      await load(propertyId, status);
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось отменить список.');
    } finally {
      setBusy(null);
    }
  };

  const openDetail = async (id) => {
    setActionError(null);
    setBusy(id);
    try {
      setOpenList(await api.whitelist.mintList(id));
    } catch (err) {
      setActionError(err?.problem?.detail ?? err?.message ?? 'Не удалось открыть список.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
            Заявки на покупку → списки на минт → биржа
          </span>
          <h4 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
            <ListChecks size={18} className="text-[#A38D6D]" />
            Whitelist
          </h4>
        </div>

        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          id="whitelist-property"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#A38D6D]"
        >
          <option value="">Все выпуски</option>
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

      {openList ? (
        <MintListDetail list={openList} onBack={() => setOpenList(null)} />
      ) : loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 size={26} className="animate-spin text-[#A38D6D]" />
          <span className="text-xs uppercase tracking-widest font-bold">Загрузка whitelist…</span>
        </div>
      ) : loadError ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle size={26} className="text-rose-500" />
          <span className="text-sm font-serif font-bold text-gray-900">Не удалось загрузить whitelist</span>
          <span className="text-xs text-gray-500 max-w-md">{loadError}</span>
        </div>
      ) : (
        <>
          {/* ---- The queue ---- */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id || 'all'}
                  onClick={() => setStatus(f.id)}
                  id={`whitelist-filter-${f.id || 'all'}`}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border cursor-pointer transition-colors
                    ${status === f.id
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D]'}
                  `}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => load(propertyId, status)}
                id="whitelist-refresh"
                className="ml-auto p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] cursor-pointer"
                title="Обновить"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="flex items-baseline justify-between">
              <h5 className="font-serif text-base font-bold text-gray-900">Заявки в whitelist</h5>
              <span className="text-[11px] font-mono text-gray-400">
                {entries.length} заявок · готовых к минту — {mintable.length}
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-serif">
                По этому выпуску заявок в таком статусе нет.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          id="whitelist-select-all"
                          checked={mintable.length > 0 && selected.length === mintable.length}
                          onChange={toggleAll}
                          disabled={mintable.length === 0}
                          className="cursor-pointer accent-[#A38D6D]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-left">Выпуск</th>
                      <th className="px-4 py-3 text-left">Адрес кошелька</th>
                      <th className="px-4 py-3 text-right">Долей</th>
                      <th className="px-4 py-3 text-left">Инвестор</th>
                      <th className="px-4 py-3 text-left">Заявка подана</th>
                      <th className="px-4 py-3 text-left">Список</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => {
                      const meta = STATUS[e.status] ?? STATUS.Pending;
                      const Icon = meta.icon;
                      const selectable = e.status === 'Ready' && Boolean(e.walletAddress);

                      return (
                        <tr key={e.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(e.id)}
                              onChange={() => toggle(e.id)}
                              disabled={!selectable}
                              className="cursor-pointer accent-[#A38D6D] disabled:cursor-not-allowed"
                              title={selectable ? 'Включить в список на минт' : 'Заявка не готова к минту'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${meta.badge}`}
                            >
                              <Icon size={10} />
                              {meta.label}
                            </span>
                            {e.exclusionReason && (
                              <div className="mt-1 text-[10px] text-gray-400 max-w-[220px]">
                                {e.exclusionReason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{e.propertyName ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-gray-900">
                            {e.walletAddress ?? (
                              // No address means nothing to mint to. The request is still tracked —
                              // an invisible one is a problem nobody can fix.
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <ShieldAlert size={12} /> нет кошелька
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-900">
                            {fmtTokens(e.tokenCount)}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-500">{shortId(e.investorId)}</td>
                          <td className="px-4 py-3 font-mono text-gray-400">
                            {formatDateTime(e.requestedAtUtc)}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-500">
                            {e.mintListNumber ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ---- Assembling the next batch ---- */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <input
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder="Комментарий к списку (необязательно)"
                id="mint-list-note"
                className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-[#A38D6D]"
              />
              <span className="text-[11px] font-mono text-gray-500">
                {!propertyId
                  ? 'выберите выпуск — батч минтится на его контракте'
                  : selected.length > 0
                    ? `${selected.length} заявок · ${fmtTokens(selectedTokens)} долей`
                    : `все готовые: ${mintable.length} заявок`}
              </span>
              <button
                type="button"
                onClick={createList}
                disabled={!propertyId || mintable.length === 0 || busy === 'create'}
                id="create-mint-list"
                className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy === 'create' ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                Сформировать список на минт
              </button>
            </div>
          </section>

          {/* ---- The batches ---- */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h5 className="font-serif text-base font-bold text-gray-900">Списки на минт</h5>
              <span className="text-[11px] font-mono text-gray-400">{mintLists.length} списков</span>
            </div>

            {mintLists.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-serif">
                Списков на минт по этому выпуску пока нет.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left">Номер</th>
                      <th className="px-4 py-3 text-left">Выпуск</th>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-right">Адресов</th>
                      <th className="px-4 py-3 text-right">Долей</th>
                      <th className="px-4 py-3 text-left">Создан</th>
                      <th className="px-4 py-3 text-left">Передан</th>
                      <th className="px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mintLists.map((l) => {
                      const meta = LIST_STATUS[l.status] ?? LIST_STATUS.Draft;
                      const working = busy === l.id;

                      return (
                        <React.Fragment key={l.id}>
                          <tr className="border-t border-gray-100">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => openDetail(l.id)}
                                className="font-mono font-bold text-gray-900 hover:text-[#A38D6D] cursor-pointer"
                              >
                                {l.number}
                              </button>
                              {l.note && <div className="text-[10px] text-gray-400 mt-0.5">{l.note}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{l.propertyName ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${meta.badge}`}
                              >
                                {meta.label}
                              </span>
                              {l.cancellationReason && (
                                <div className="mt-1 text-[10px] text-gray-400 max-w-[220px]">
                                  {l.cancellationReason}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">{l.itemCount}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">
                              {fmtTokens(l.totalTokens)}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-400">{formatDateTime(l.createdAtUtc)}</td>
                            <td className="px-4 py-3 font-mono text-gray-400">{formatDateTime(l.sentAtUtc)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => download(l)}
                                  disabled={working}
                                  title="Выгрузить CSV для биржи"
                                  className="p-1.5 rounded border border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] disabled:opacity-50 cursor-pointer"
                                >
                                  {working ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                </button>

                                {l.status === 'Draft' && (
                                  <button
                                    onClick={() => runAction(l, api.whitelist.markSent, 'передан бирже')}
                                    disabled={working}
                                    title="Отметить переданным бирже"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-indigo-200 text-indigo-700 text-[9px] font-bold uppercase tracking-wider hover:bg-indigo-50 disabled:opacity-50 cursor-pointer"
                                  >
                                    <Send size={11} /> Передан
                                  </button>
                                )}

                                {l.status === 'Sent' && (
                                  <button
                                    onClick={() => runAction(l, api.whitelist.markExecuted, 'исполнен биржей')}
                                    disabled={working}
                                    title="Биржа заминтила батч"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
                                  >
                                    <Coins size={11} /> Исполнен
                                  </button>
                                )}

                                {(l.status === 'Draft' || l.status === 'Sent') && (
                                  <button
                                    onClick={() => { setCancellingId(l.id); setCancelReason(''); }}
                                    disabled={working}
                                    title="Отменить список"
                                    className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                                  >
                                    <Ban size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {cancellingId === l.id && (
                            <tr className="border-t border-gray-100 bg-rose-50/40">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    value={cancelReason}
                                    onChange={(ev) => setCancelReason(ev.target.value)}
                                    placeholder="Причина отмены — обязательна"
                                    id={`cancel-reason-${l.id}`}
                                    className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-rose-200 text-xs bg-white focus:outline-none focus:border-rose-400"
                                  />
                                  <button
                                    onClick={confirmCancel}
                                    disabled={!cancelReason.trim() || working}
                                    className="px-4 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    Отменить список
                                  </button>
                                  <button
                                    onClick={() => { setCancellingId(null); setCancelReason(''); }}
                                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:border-gray-300 cursor-pointer"
                                  >
                                    Не отменять
                                  </button>
                                </div>
                                {l.status === 'Sent' && (
                                  <p className="mt-2 text-[10px] text-gray-500">
                                    Батч уже у биржи — отмена вернёт заявки в пул готовых к минту,
                                    но биржу нужно уведомить отдельно.
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** A batch with its lines — exactly what the exchange is handed, on screen. */
function MintListDetail({ list, onBack }) {
  const header = list?.mintList ?? {};
  const items = list?.items ?? [];
  const meta = LIST_STATUS[header.status] ?? LIST_STATUS.Draft;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#A38D6D] cursor-pointer"
      >
        <ArrowLeft size={12} /> К спискам
      </button>

      <div className="rounded-xl border border-gray-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Номер" value={header.number} mono />
        <Field label="Статус" value={meta.label} />
        <Field label="Адресов" value={header.itemCount} mono />
        <Field label="Долей" value={fmtTokens(header.totalTokens)} mono />
        <Field label="Сеть" value={header.tokenChain || '—'} mono />
        <Field label="Контракт" value={header.tokenContractAddress || '—'} mono />
        <Field label="Передан бирже" value={formatDateTime(header.sentAtUtc)} mono />
        <Field label="Исполнен" value={formatDateTime(header.executedAtUtc)} mono />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Адрес кошелька</th>
              <th className="px-4 py-3 text-right">Долей</th>
              <th className="px-4 py-3 text-left">Инвестор</th>
              <th className="px-4 py-3 text-left">Заявка</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.whitelistEntryId} className="border-t border-gray-100">
                <td className="px-4 py-3 font-mono text-gray-900">{i.walletAddress}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{fmtTokens(i.tokenCount)}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{shortId(i.investorId)}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{shortId(i.investmentId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">{label}</span>
      <span className={`text-xs text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}
