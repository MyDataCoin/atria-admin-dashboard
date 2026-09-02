import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Check, Plus, RefreshCw, Lock } from 'lucide-react';
import api from '../api';

const STATUS_LABELS = {
  draft: 'Черновик',
  confirmed: 'Подтверждён',
  distributed: 'Распределён',
};

const STATUS_STYLES = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  distributed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const money = (value, currency = 'KGS') =>
  value == null ? '—' : `${Number(value).toLocaleString('ru-RU')} ${currency}`;

const day = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
};

// Пустая строка из числового поля должна уйти как null, а не как NaN или 0.
const numOrNull = (value) => {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Отчётные периоды объекта: что он заработал и потратил, и из чего объявляется выплата.
 *
 * Рабочее место бухгалтера. Две вещи, которые панель обязана показывать честно, потому что на них
 * держится весь смысл раздела:
 *
 *  - Подтверждает НЕ тот, кто внёс. Бэкенд отклонит подтверждение от автора цифр (409), поэтому
 *    кнопка «Подтвердить» на своём же черновике сразу неактивна — иначе человек жмёт её и получает
 *    непонятную ошибку.
 *  - Подтверждённый период не редактируется. Из него уже могла быть объявлена выплата, и сдвинуть
 *    цифры задним числом — это выплатить больше, чем объект заработал.
 */
export default function OperatingPeriodsPanel({ properties = [], currentUserId, readOnly = false }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const property = useMemo(
    () => properties.find((p) => p.id === propertyId) || null,
    [properties, propertyId],
  );
  const currency = property?.currency || 'KGS';

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  const load = React.useCallback(async () => {
    if (!propertyId) {
      setPeriods([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPeriods(await api.operatingPeriods.list(propertyId));
    } catch (e) {
      setPeriods([]);
      setError('Не удалось загрузить отчётные периоды. Пустой список здесь не значит, что периодов нет.');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  // Скачивание идёт через тот же клиент, что и остальные запросы: прямая ссылка ушла бы без
  // Authorization и вернулась бы 401. Имя файла берём у сервера.
  const download = async () => {
    if (!propertyId) return;
    setError('');
    try {
      const response = await api.operatingPeriods.export(propertyId);
      const blob = await response.blob();

      const disposition = response.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"';]+)"?/i.exec(disposition);
      const fileName = match?.[1] ?? `operating-periods-${propertyId}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Не удалось выгрузить CSV.');
    }
  };

  const confirm = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.operatingPeriods.confirm(id);
      await load();
    } catch (e) {
      setError(
        e?.status === 409
          ? 'Подтвердить период должен не тот, кто внёс цифры. Попросите коллегу.'
          : 'Не удалось подтвердить период.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-900">Отчётные периоды</h2>
          <p className="text-[11px] text-gray-500 mt-1 max-w-xl">
            Что объект заработал и потратил за период. Из подтверждённого периода объявляется
            выплата — и не больше, чем он заработал.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <label className="block">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
              Объект
            </span>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="border border-gray-200 rounded-sm px-3 py-2 text-sm bg-white min-w-[220px]"
            >
              {properties.length === 0 && <option value="">Нет объектов</option>}
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <button
            onClick={load}
            className="border border-gray-200 rounded-sm p-2 text-gray-500 hover:text-gray-900 cursor-pointer"
            title="Обновить"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {!readOnly && (
          <button
            onClick={() => setShowForm((v) => !v)}
            disabled={!propertyId}
            className="bg-gray-900 text-white rounded-sm px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Plus size={14} /> Внести период
          </button>
          )}

          <button
            onClick={download}
            disabled={!propertyId}
            className="border border-gray-200 rounded-sm px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40 cursor-pointer"
          >
            CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 text-xs rounded-sm px-3.5 py-2.5">
          {error}
        </div>
      )}

      {showForm && propertyId && !readOnly && (
        <ReportPeriodForm
          propertyId={propertyId}
          currency={currency}
          onCancel={() => setShowForm(false)}
          onDone={async () => {
            setShowForm(false);
            await load();
          }}
          onError={setError}
        />
      )}

      <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                <th className="text-left px-4 py-2.5">Период</th>
                <th className="text-right px-4 py-2.5">Доход</th>
                <th className="text-right px-4 py-2.5">Расходы</th>
                <th className="text-right px-4 py-2.5">К распределению</th>
                <th className="text-left px-4 py-2.5">Статус</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">
                    Периодов пока нет
                  </td>
                </tr>
              )}

              {periods.map((p) => {
                // Автор цифр не может их подтвердить — бэкенд ответит 409. Гасим кнопку заранее.
                const isOwnDraft = p.reportedByUserId === currentUserId;
                const canConfirm = !readOnly && p.status === 'draft' && !isOwnDraft;

                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <CalendarRange size={13} className="text-[#A38D6D]" />
                        {day(p.startUtc)} — {day(p.endUtc)}
                      </div>
                      {p.note && <p className="text-[11px] text-gray-500 mt-0.5">{p.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(p.grossRevenue, p.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(p.operatingExpenses, p.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">
                      <span className={p.netIncome < 0 ? 'text-red-600' : 'text-gray-900'}>
                        {money(p.netIncome, p.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block border rounded-sm px-2 py-0.5 text-[10px] font-bold ${
                          STATUS_STYLES[p.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'draft' && !readOnly && (
                        <button
                          onClick={() => confirm(p.id)}
                          disabled={!canConfirm || busyId === p.id}
                          title={
                            isOwnDraft
                              ? 'Подтвердить должен не тот, кто внёс цифры'
                              : 'Подтвердить период'
                          }
                          className="border border-gray-200 rounded-sm px-2.5 py-1.5 text-[11px] font-bold text-gray-700 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Check size={12} /> Подтвердить
                        </button>
                      )}
                      {(p.status !== 'draft' || readOnly) && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                          <Lock size={11} />
                          {p.status === 'draft' ? 'Черновик' : 'Цифры зафиксированы'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Форма внесения периода. Строки разбивки необязательны и не обязаны сходиться с итогами. */
function ReportPeriodForm({ propertyId, currency, onCancel, onDone, onError }) {
  const [form, setForm] = useState({
    startUtc: '',
    endUtc: '',
    grossRevenue: '',
    operatingExpenses: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const net =
    numOrNull(form.grossRevenue) != null && numOrNull(form.operatingExpenses) != null
      ? numOrNull(form.grossRevenue) - numOrNull(form.operatingExpenses)
      : null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      await api.operatingPeriods.report({
        propertyId,
        startUtc: form.startUtc,
        endUtc: form.endUtc,
        grossRevenue: numOrNull(form.grossRevenue),
        operatingExpenses: numOrNull(form.operatingExpenses),
        note: form.note || null,
      });
      await onDone();
    } catch (err) {
      onError(
        err?.status === 409
          ? 'Период с такими датами уже внесён по этому объекту.'
          : 'Не удалось внести период. Проверьте даты и суммы.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-gray-200 rounded-sm bg-white p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Начало периода">
          <input type="date" required value={form.startUtc} onChange={set('startUtc')} className={INPUT} />
        </Field>
        <Field label="Конец периода">
          <input type="date" required value={form.endUtc} onChange={set('endUtc')} className={INPUT} />
        </Field>
        <Field label={`Доход, ${currency}`}>
          <input
            type="number" step="0.01" min="0" required
            value={form.grossRevenue} onChange={set('grossRevenue')} className={INPUT}
          />
        </Field>
        <Field label={`Расходы, ${currency}`}>
          <input
            type="number" step="0.01" min="0" required
            value={form.operatingExpenses} onChange={set('operatingExpenses')} className={INPUT}
          />
        </Field>
      </div>

      <Field label="Комментарий">
        <input
          type="text" value={form.note} onChange={set('note')}
          placeholder="Например: IV квартал" className={INPUT}
        />
      </Field>

      {/* Убыточный период — это факт, который надо внести, а не ошибка ввода. */}
      {net != null && (
        <p className="text-xs text-gray-600">
          К распределению:{' '}
          <span className={`font-bold ${net < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {money(net, currency)}
          </span>
          {net <= 0 && <span className="text-gray-400"> — распределять нечего</span>}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit" disabled={saving}
          className="bg-gray-900 text-white rounded-sm px-4 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
        >
          {saving ? 'Сохранение…' : 'Внести период'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="border border-gray-200 rounded-sm px-4 py-2 text-xs font-bold text-gray-600 cursor-pointer"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

const INPUT = 'w-full border border-gray-200 rounded-sm px-3 py-2 text-sm';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
