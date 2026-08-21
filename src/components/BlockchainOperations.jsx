import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Info,
} from 'lucide-react';
import api from '../api';

// Куда операция дошла. Названия совпадают с тем, что отдаёт бэкенд (lowercase).
const STATUS = {
  created: {
    label: 'В очереди',
    icon: Clock,
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  submitted: {
    label: 'Отправлена',
    icon: Send,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  confirmed: {
    label: 'Подтверждена',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  failed: {
    label: 'Сбой',
    icon: XCircle,
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const TYPE_LABELS = {
  allowlist_add: 'Белый список: добавление',
  allowlist_remove: 'Белый список: удаление',
  token_allocation: 'Выпуск долей (минт)',
  anchor_merkle_root: 'Якорение корня Меркла',
  token_pause: 'Приостановка операций',
  token_unpause: 'Возобновление операций',
  token_burn: 'Сжигание долей',
  token_forced_transfer: 'Принудительный перевод',
  collateral_report: 'Отчёт по обеспечению',
};

const FILTERS = [
  { id: 'failed', label: 'Сбои' },
  { id: 'submitted', label: 'В сети' },
  { id: 'created', label: 'В очереди' },
  { id: 'confirmed', label: 'Подтверждены' },
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

const shortHash = (hash) =>
  hash ? `${String(hash).slice(0, 10)}…${String(hash).slice(-6)}` : '—';

/**
 * Очередь блокчейн-операций.
 *
 * Кнопки «выпустить доли» здесь намеренно НЕТ. Доли появляются только как следствие одобренной
 * заявки: заявка → резерв → одобрение → белый список → минт. Эта цепочка и есть доказательство, что
 * каждая выпущенная доля соответствует конкретному инвестору и основанию; свободный минт на
 * произвольный адрес её ломает. Экран показывает, что происходит после одобрения, и где встало.
 */
export default function BlockchainOperations() {
  const [operations, setOperations] = useState([]);
  const [filter, setFilter] = useState('failed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  // Счётчик ручных обновлений: меняется по кнопке «Обновить» и после повтора операции, и только
  // затем перезапускает загрузку. Так у неё ровно один вход, а не два расходящихся пути.
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => setReloadToken((n) => n + 1);

  // Клиент сам ставит таймаут на запрос и signal наружу не принимает, поэтому отменить запрос
  // нельзя — вместо этого ответ отбрасывается, если фильтр успел смениться. Без этого частое
  // переключение вкладок оставило бы на экране результат предыдущего запроса, вернувшегося позже.
  useEffect(() => {
    let current = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await api.blockchainOperations.list(filter || undefined, 100);
        if (!current) return;
        setOperations(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!current) return;
        setError(e?.message || 'Не удалось загрузить очередь операций.');
      } finally {
        if (current) setLoading(false);
      }
    })();

    return () => {
      current = false;
    };
  }, [filter, reloadToken]);

  const handleRetry = async (id) => {
    setRetryingId(id);
    setError('');
    try {
      await api.blockchainOperations.retry(id);
      reload();
    } catch (e) {
      setError(e?.message || 'Не удалось поставить операцию в очередь заново.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Cpu size={20} className="text-[#A38D6D]" />
            Очередь блокчейн-операций
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Что платформа делает в сети и где это встало. Операции ставятся в очередь автоматически
            после одобрения заявки — вручную выпустить доли отсюда нельзя.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="flex items-center gap-1.5 cursor-pointer border border-gray-200 hover:border-[#A38D6D] text-gray-600 hover:text-[#A38D6D] px-3 py-2 rounded-md text-[10px] uppercase tracking-widest transition-all bg-white font-semibold"
        >
          <RefreshCw size={12} />
          Обновить
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-semibold border transition-all cursor-pointer ${
              filter === f.id
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#A38D6D] hover:text-[#A38D6D]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : operations.length === 0 ? (
        <div className="flex items-start gap-2 p-4 bg-[#FAF8F3] border border-gray-100 rounded-sm text-xs text-gray-500">
          <Info size={14} className="shrink-0 mt-0.5 text-[#A38D6D]" />
          <span>
            Операций с таким статусом нет. Пустой список сбоев — это то, как выглядит исправный
            прогон.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {operations.map((op) => {
            const status = STATUS[op.status] || STATUS.created;
            const StatusIcon = status.icon;
            const inFlight = op.status === 'submitted';

            return (
              <div
                key={op.id}
                className="bg-white border border-gray-100 rounded-md p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] uppercase tracking-widest font-bold ${status.badge}`}
                      >
                        <StatusIcon size={10} />
                        {status.label}
                      </span>
                      <span className="font-serif text-sm font-bold text-gray-900">
                        {TYPE_LABELS[op.type] || op.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1 truncate">
                      {op.propertyName || '— объект не определён'}
                      {op.investorId && (
                        <> {' · '}{op.investorName || `инвестор ${String(op.investorId).slice(0, 8)}…`}</>
                      )}
                      {op.tokenCount != null && (
                        <> {' · '}{op.tokenCount.toLocaleString('ru-RU')} токен(ов)</>
                      )}
                    </div>
                  </div>

                  {op.status === 'failed' && (
                    <button
                      type="button"
                      disabled={retryingId === op.id}
                      onClick={() => handleRetry(op.id)}
                      className="flex items-center gap-1.5 cursor-pointer border border-[#A38D6D] text-[#A38D6D] hover:bg-[#A38D6D] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md text-[9px] uppercase tracking-widest transition-all font-semibold bg-white shrink-0"
                    >
                      {retryingId === op.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <RotateCcw size={11} />
                      )}
                      Повторить
                    </button>
                  )}
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[10px] pt-2 border-t border-gray-50">
                  <div>
                    <dt className="uppercase tracking-wider text-gray-400 font-bold">Поставлена</dt>
                    <dd className="font-mono text-gray-900 mt-0.5">{formatDateTime(op.createdAtUtc)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider text-gray-400 font-bold">Попыток</dt>
                    <dd className="font-mono text-gray-900 mt-0.5">{op.attempts}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider text-gray-400 font-bold">
                      Подтверждений
                    </dt>
                    {/* Глубина показывается, пока транзакция идёт: «отправлена» сама по себе не
                        отличает транзакцию в трёх блоках от той, что не вышла из мемпула. */}
                    <dd className="font-mono text-gray-900 mt-0.5">
                      {op.status === 'confirmed'
                        ? '✓'
                        : inFlight
                          ? `${op.confirmations ?? 0} / ${op.confirmationsRequired}`
                          : '—'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="uppercase tracking-wider text-gray-400 font-bold">Транзакция</dt>
                    <dd className="font-mono text-gray-900 mt-0.5 truncate">
                      {op.explorerUrl ? (
                        <a
                          href={op.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#A38D6D] hover:underline"
                        >
                          {shortHash(op.transactionRef)}
                          <ExternalLink size={9} className="shrink-0" />
                        </a>
                      ) : (
                        shortHash(op.transactionRef)
                      )}
                    </dd>
                  </div>
                </dl>

                {op.error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-sm">
                    <span className="block text-[9px] uppercase tracking-wider text-rose-500 font-bold mb-1">
                      Ошибка
                    </span>
                    {/* Текст как есть, без интерпретации: причина сбоя почти всегда внешняя —
                        кончился газ, узел недоступен — и разбирать её будет человек. */}
                    <p className="text-[10px] text-rose-900 font-mono break-words whitespace-pre-wrap">
                      {op.error}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
