import React, { useState } from 'react';
import { ShieldAlert, Send, CheckCircle } from 'lucide-react';
import api from '../api';

/**
 * Shown when a banned admin/realtor tries to log in (backend rejects with 403 "banned").
 * A blurred, locked-out screen with an appeal box: the message goes to the super admin
 * via POST /appeals (no auth — the account can't authenticate while banned).
 */
export default function BlockedScreen({ username, reason, onBack }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await api.appeals.submit({ username, message: message.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err?.status === 404
          ? 'Отправка обращений пока не поддерживается сервером.'
          : err?.message || 'Не удалось отправить обращение. Попробуйте позже.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#0e0e0e] overflow-hidden">
      {/* Blurred backdrop suggesting a locked-out dashboard behind the notice. */}
      <div
        aria-hidden
        className="absolute inset-0 blur-2xl opacity-40 pointer-events-none select-none"
      >
        <div className="absolute top-20 left-10 right-10 h-24 bg-white/5 rounded-lg" />
        <div className="absolute top-52 left-10 w-1/2 h-64 bg-white/5 rounded-lg" />
        <div className="absolute top-52 right-10 w-2/5 h-64 bg-white/5 rounded-lg" />
        <div className="absolute bottom-16 left-10 right-10 h-32 bg-white/5 rounded-lg" />
      </div>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      {/* Notice card */}
      <div className="relative z-10 w-full max-w-md bg-[#161616] border border-rose-500/20 rounded-sm shadow-2xl p-7 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <ShieldAlert size={26} className="text-rose-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-serif font-bold text-white">
            К сожалению, вас заблокировали
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Доступ к панели приостановлен администрацией. Если вы считаете это ошибкой,
            обратитесь в техподдержку — опишите ситуацию в окне ниже.
          </p>
        </div>

        {reason && (
          <div className="text-left bg-rose-500/5 border border-rose-500/20 rounded p-3">
            <span className="text-[8px] uppercase font-bold tracking-wider text-rose-400/80 font-mono block mb-1">
              Причина блокировки
            </span>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{reason}</p>
          </div>
        )}

        {sent ? (
          <div className="py-4 space-y-2 flex flex-col items-center">
            <CheckCircle size={30} className="text-emerald-400" />
            <p className="text-sm font-bold text-white">Обращение отправлено</p>
            <p className="text-[11px] text-gray-400">
              Супер-администратор рассмотрит его в ближайшее время.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 text-left">
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите вашу ситуацию для техподдержки…"
              className="w-full text-xs p-3 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-rose-400/50 resize-none"
            />
            {error && (
              <p className="text-[10px] font-mono text-rose-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 disabled:opacity-50 text-[10px] uppercase font-bold tracking-widest py-2.5 rounded transition-all cursor-pointer"
            >
              <Send size={12} />
              {sending ? 'Отправляем…' : 'Отправить в поддержку'}
            </button>
          </form>
        )}

        <button
          onClick={onBack}
          className="text-[9px] font-mono uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          ← Вернуться ко входу
        </button>
      </div>
    </div>
  );
}
