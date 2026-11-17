import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Coins, ExternalLink, Loader2, RefreshCw, Save } from 'lucide-react';
import api from '../api';

const METHOD_LABEL = {
  usdt_bep20: 'USDT · BEP-20',
  usdt_trc20: 'USDT · TRC-20',
  kgst_bep20: 'KGST · BEP-20',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const short = (a) => (a && a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a || '—');

/**
 * Крипто-оплата: курс USDT и кошельки для приёма, плюс все входящие переводы.
 *
 * Курс задаёт оператор — по нему считается сумма в каждом новом счёте, и в выставленном счёте
 * он больше не меняется. Метод появляется у инвестора, только когда для него заполнено всё
 * нужное: так пустое поле и есть выключатель.
 */
export default function CryptoPayments({ onAddLog }) {
  const [form, setForm] = useState({ usdtRateKgs: '', bep20Address: '', trc20Address: '', kgstContractAddress: '' });
  const [enabled, setEnabled] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [unmatchedOnly, setUnmatchedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (onlyUnmatched) => {
    setLoading(true);
    setError(null);
    try {
      const [s, d] = await Promise.all([api.payments.settings(), api.payments.deposits(onlyUnmatched)]);
      setForm({
        usdtRateKgs: s?.usdtRateKgs ?? '',
        bep20Address: s?.bep20Address ?? '',
        trc20Address: s?.trc20Address ?? '',
        kgstContractAddress: s?.kgstContractAddress ?? '',
      });
      setEnabled(s?.enabledMethods ?? []);
      setDeposits(d ?? []);
    } catch (err) {
      setError(err?.problem?.detail ?? err?.message ?? 'Не удалось загрузить настройки.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(unmatchedOnly);
  }, [load, unmatchedOnly]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const rate = String(form.usdtRateKgs).trim().replace(',', '.');
      const result = await api.payments.saveSettings({
        usdtRateKgs: rate === '' ? null : Number(rate),
        bep20Address: form.bep20Address.trim() || null,
        trc20Address: form.trc20Address.trim() || null,
        kgstContractAddress: form.kgstContractAddress.trim() || null,
      });
      setEnabled(result?.enabledMethods ?? []);
      setSaved(true);
      onAddLog?.(`Крипто-оплата: курс USDT ${rate || '—'} сом, методы: ${(result?.enabledMethods ?? []).join(', ') || 'нет'}`);
    } catch (err) {
      setError(err?.problem?.detail ?? err?.message ?? 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, hint, props = {}) => (
    <label className="block space-y-1">
      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">{label}</span>
      <input
        value={form[key]}
        onChange={(e) => {
          setForm((f) => ({ ...f, [key]: e.target.value }));
          setSaved(false);
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#A38D6D]"
        {...props}
      />
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Оплата заявок</span>
          <h4 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
            <Coins size={18} className="text-[#A38D6D]" />
            Крипто-оплата
          </h4>
        </div>
        <button
          onClick={() => load(unmatchedOnly)}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] transition-colors cursor-pointer"
          title="Обновить"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin text-[#A38D6D]" />
        </div>
      ) : (
        <>
          <form onSubmit={save} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field('usdtRateKgs', 'Курс USDT, сом', 'Сколько сом стоит 1 USDT. Фиксируется в счёте в момент выставления.', {
                inputMode: 'decimal', placeholder: '87.50',
              })}
              {field('trc20Address', 'Кошелёк TRC-20 (TRON)', 'Принимает USDT в сети TRON. Адрес начинается с T.', {
                placeholder: 'T…',
              })}
              {field('bep20Address', 'Кошелёк BEP-20 (BNB Chain)', 'Принимает USDT и KGST в сети BNB. Адрес 0x…', {
                placeholder: '0x…',
              })}
              {field('kgstContractAddress', 'Контракт KGST (BNB Chain)', 'Адрес токена KGST. Пусто — KGST выключен.', {
                placeholder: '0x…',
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2">
                {Object.entries(METHOD_LABEL).map(([id, label]) => (
                  <span
                    key={id}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      enabled.includes(id)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    {label}: {enabled.includes(id) ? 'включён' : 'выключен'}
                  </span>
                ))}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
                {saved ? 'Сохранено' : 'Сохранить'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Сервер сам видит переводы на эти кошельки и помечает счёт оплаченным, когда приходит ровно выставленная сумма.
              Приватные ключи здесь не нужны и не вводятся.
            </p>
          </form>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h5 className="font-serif text-base font-bold text-gray-900">Входящие переводы</h5>
              <div className="flex gap-2">
                {[
                  { id: true, label: 'Не опознаны' },
                  { id: false, label: 'Все' },
                ].map((f) => (
                  <button
                    key={String(f.id)}
                    onClick={() => setUnmatchedOnly(f.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                      unmatchedOnly === f.id
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#A38D6D]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {unmatchedOnly && (
              <p className="text-[11px] text-gray-500">
                Переводы, которые не совпали ни с одним счётом: не та сумма, оплата после срока или перевод без заявки.
                Их нужно разобрать вручную — вернуть или связаться с отправителем.
              </p>
            )}

            {deposits.length === 0 ? (
              <div className="py-10 text-center text-gray-400 font-serif text-sm">
                {unmatchedOnly ? 'Неопознанных переводов нет.' : 'Переводов пока не было.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Когда</th>
                      <th className="px-3 py-2 text-left">Метод</th>
                      <th className="px-3 py-2 text-right">Сумма</th>
                      <th className="px-3 py-2 text-left">От кого</th>
                      <th className="px-3 py-2 text-left">Счёт</th>
                      <th className="px-3 py-2 text-left">Транзакция</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d) => (
                      <tr key={d.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(d.occurredAtUtc)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{METHOD_LABEL[d.method] ?? d.method}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {Number(d.amount).toLocaleString('ru-RU', { maximumFractionDigits: 6 })} {d.token}
                        </td>
                        <td className="px-3 py-2 font-mono" title={d.fromAddress}>{short(d.fromAddress)}</td>
                        <td className="px-3 py-2">
                          {d.invoiceId
                            ? <span className="text-emerald-700">оплатил заявку</span>
                            : <span className="text-amber-700">не опознан</span>}
                        </td>
                        <td className="px-3 py-2">
                          {d.transactionUrl ? (
                            <a
                              href={d.transactionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[#A38D6D] hover:underline"
                            >
                              {short(d.transactionHash)} <ExternalLink size={11} />
                            </a>
                          ) : short(d.transactionHash)}
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
    </div>
  );
}
