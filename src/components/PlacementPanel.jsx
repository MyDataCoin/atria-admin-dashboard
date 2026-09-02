import React, { useState } from 'react';
import { CalendarClock, RotateCcw, Undo2 } from 'lucide-react';
import api from '../api';
import { mapPlacementToRequest } from '../api/mappers';

const inputBase =
  'p-2 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white';
const inputClass = `w-full ${inputBase}`;
const labelClass = 'block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1';

/** ISO -> значение для datetime-local (браузер не принимает ISO с Z). */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Окно размещения: расписание, цель сбора и выпускаемая площадь, плюс два ответа на
 * недособранное размещение — продление и возврат.
 *
 * Продление и возврат — взаимоисключающие решения, и оба необратимы, поэтому каждое требует
 * причины и подтверждения. Автоматически не делается ни то, ни другое: свип закрывает
 * размещение по сроку, но выбор между «продать дальше» и «вернуть деньги» остаётся за человеком.
 */
export default function PlacementPanel({ property, onChanged }) {
  const [form, setForm] = useState({
    opensAtUtc: toLocalInput(property.placementOpensAtUtc),
    closesAtUtc: toLocalInput(property.placementClosesAtUtc),
    targetAmount: property.targetAmount ?? '',
    offeredAreaSqM: property.offeredAreaSqM ?? '',
  });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState('');
  const [reason, setReason] = useState('');
  const [extendTo, setExtendTo] = useState('');

  const patch = (fields) => setForm((prev) => ({ ...prev, ...fields }));

  // Доли уже проданы — выпускаемую площадь бэкенд заморозил. Блокируем поле здесь же,
  // чтобы админ не отправлял заведомо отклоняемый запрос.
  const sold = (property.totalTokens ?? 0) - (property.availableTokens ?? property.totalTokens ?? 0);
  const areaLocked = sold > 0;

  const run = async (kind, fn) => {
    setBusy(kind);
    setError('');
    try {
      await fn();
      setConfirming('');
      setReason('');
      await onChanged?.();
    } catch (err) {
      setError(err?.problem?.detail || err?.message || 'Не удалось выполнить операцию');
    } finally {
      setBusy('');
    }
  };

  const save = () =>
    run('save', () => api.properties.schedulePlacement(property.id, mapPlacementToRequest(form)));

  const extend = () =>
    run('extend', () =>
      api.properties.extendPlacement(property.id, {
        newClosesAtUtc: new Date(extendTo).toISOString(),
        reason: reason.trim(),
      }));

  const unwind = () =>
    run('unwind', () =>
      api.properties.closePlacementUnsubscribed(property.id, { reason: reason.trim() }));

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-1.5 mb-3">
        <CalendarClock size={13} className="text-[#A38D6D]" />
        <span className="text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider">
          Окно размещения
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Открытие</label>
          {/* Расписание, а не кнопка: бэкенд сам откроет продажи в эту дату. */}
          <input
            type="datetime-local"
            value={form.opensAtUtc}
            onChange={(e) => patch({ opensAtUtc: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Закрытие</label>
          <input
            type="datetime-local"
            value={form.closesAtUtc}
            onChange={(e) => patch({ closesAtUtc: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Цель сбора ({property.currency || 'KGS'})</label>
          <input
            type="number" min="0" step="any" placeholder="10000000"
            value={form.targetAmount}
            onChange={(e) => patch({ targetAmount: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Выпускаемая площадь, м²</label>
          <input
            type="number" min="0" step="0.01" placeholder="10000"
            value={form.offeredAreaSqM}
            onChange={(e) => patch({ offeredAreaSqM: e.target.value })}
            disabled={areaLocked}
            className={`${inputClass} font-mono disabled:bg-gray-100 disabled:text-gray-400`}
          />
          <span className="block text-[9px] font-mono text-gray-400 mt-1">
            {areaLocked
              ? 'Заморожена: доли уже проданы'
              : 'Часть объекта, из которой нарезан выпуск'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!!busy}
        className="mt-3 w-full bg-[#A38D6D] hover:bg-[#8e7b5e] disabled:opacity-50 text-white py-2 rounded text-[10px] uppercase font-bold tracking-widest cursor-pointer transition-all"
      >
        {busy === 'save' ? 'Сохранение…' : 'Сохранить расписание'}
      </button>

      {/* Недособранное размещение: два взаимоисключающих ответа. Показываем их только когда
          решение действительно требуется — цель задана и не достигнута. */}
      {property.targetAmount != null && property.isTargetMet === false && (
        <div className="mt-4 border border-amber-200 bg-amber-50/60 rounded-sm p-3">
          <p className="text-[11px] font-bold text-amber-800 mb-2">
            Цель не достигнута — требуется решение
          </p>

          {confirming === '' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setConfirming('extend'); setExtendTo(form.closesAtUtc); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-sm border border-gray-300 bg-white text-[9px] uppercase font-bold tracking-wider text-gray-700 hover:text-gray-900 cursor-pointer"
              >
                <RotateCcw size={11} /> Продлить
              </button>
              <button
                type="button"
                onClick={() => setConfirming('unwind')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-sm border border-red-300 bg-white text-[9px] uppercase font-bold tracking-wider text-red-600 hover:text-red-800 cursor-pointer"
              >
                <Undo2 size={11} /> Вернуть средства
              </button>
            </div>
          )}

          {confirming === 'extend' && (
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Новая дата закрытия</label>
                <input
                  type="datetime-local"
                  value={extendTo}
                  onChange={(e) => setExtendTo(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>Причина (заносится в журнал)</label>
                <input
                  type="text" placeholder="Продление по решению управляющей компании"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                />
              </div>
              <p className="text-[9px] font-mono text-gray-500">
                Продления считаются. Уже продлевалось: {property.placementExtensionCount ?? 0}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={extend}
                  disabled={!!busy || !extendTo || !reason.trim()}
                  className="flex-1 bg-[#A38D6D] hover:bg-[#8e7b5e] disabled:opacity-50 text-white py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer"
                >
                  {busy === 'extend' ? 'Продление…' : 'Подтвердить продление'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(''); setReason(''); }}
                  className="px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {confirming === 'unwind' && (
            <div className="space-y-2">
              {/* Необратимо и затрагивает деньги инвесторов — поэтому отдельное подтверждение
                  и обязательная причина, а не одна кнопка рядом с продлением. */}
              <p className="text-[10px] text-red-700 leading-relaxed">
                Все заявки будут аннулированы, доли вернутся в выпуск, а всем размещённым
                инвесторам будут начислены обязательства по возврату. Отменить нельзя.
              </p>
              <div>
                <label className={labelClass}>Причина (обязательно, заносится в журнал)</label>
                <input
                  type="text" placeholder="Размещение не собрало целевую сумму"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={unwind}
                  disabled={!!busy || !reason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded text-[9px] uppercase font-bold tracking-widest cursor-pointer"
                >
                  {busy === 'unwind' ? 'Возврат…' : 'Подтвердить возврат средств'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(''); setReason(''); }}
                  className="px-3 py-2 rounded text-[9px] uppercase font-bold tracking-widest text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[10px] font-mono text-red-500">{error}</p>}
    </div>
  );
}
