import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import api from '../api';
import PasswordInput from './PasswordInput';

// Та же политика, что и на сервере (Atria.Application.Common.PasswordPolicy). Проверяем на клиенте
// только чтобы человек увидел, чего не хватает, до отправки — решает всё равно сервер.
const RULES = [
  { id: 'length', label: 'не короче 6 символов', test: (v) => v.length >= 6 },
  { id: 'upper', label: 'заглавная буква', test: (v) => /[A-ZА-ЯЁ]/.test(v) },
  { id: 'lower', label: 'строчная буква', test: (v) => /[a-zа-яё]/.test(v) },
  { id: 'digit', label: 'цифра', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'спецсимвол (!, #, %, …)', test: (v) => /[^A-Za-zА-Яа-яЁё0-9]/.test(v) },
];

/**
 * Обязательная смена пароля. Показывается вместо рабочего пространства, пока аккаунт сидит на
 * разовом пароле: его выдал суперадмин (при создании аккаунта или при сбросе), то есть пароль
 * знает не только владелец аккаунта.
 *
 * `initialCurrentPassword` — пароль, которым только что вошли: после логина переспрашивать его
 * незачем. После перезагрузки страницы (сессия восстановлена по куке) он неизвестен и его просят.
 */
export default function ForcePasswordChange({
  fullName,
  username,
  initialCurrentPassword = '',
  onChanged,
  onLogout,
}) {
  const [currentPassword, setCurrentPassword] = useState(initialCurrentPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const failedRule = RULES.find((r) => !r.test(newPassword));
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = currentPassword && !failedRule && !mismatch && confirmPassword.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      onChanged?.();
    } catch (err) {
      setError(
        err?.status === 401
          ? 'Текущий пароль указан неверно.'
          : (err?.problem?.detail ?? err?.message ?? 'Не удалось сменить пароль.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4 paper-grain relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-[#111111] to-[#0a0a0a]" />

      <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-sm max-w-md w-full relative z-10 shadow-2xl text-left space-y-6">
        <div className="space-y-2">
          <div className="w-11 h-11 flex items-center justify-center bg-[#A38D6D]/15 border border-[#A38D6D]/30 rounded-sm">
            <KeyRound size={20} className="text-[#A38D6D]" />
          </div>
          <h1 className="font-serif text-xl text-white font-bold">Смените пароль</h1>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {fullName || username} — вход выполнен по разовому паролю, который выдал суперадмин.
            Придумайте свой: пока пароль не изменён, панель недоступна.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[10px] p-3 rounded font-mono font-semibold flex items-start gap-2">
            <ShieldAlert size={13} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400 font-mono">
              Текущий (разовый) пароль
            </label>
            <PasswordInput
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              iconClassName="text-gray-500 hover:text-gray-300"
              className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400 font-mono">
              Новый пароль
            </label>
            <PasswordInput
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              iconClassName="text-gray-500 hover:text-gray-300"
              className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
            />
            <ul className="pt-1 space-y-1">
              {RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li
                    key={rule.id}
                    className={`text-[10px] font-mono flex items-center gap-2 ${ok ? 'text-emerald-400' : 'text-gray-500'}`}
                  >
                    <span>{ok ? '✓' : '•'}</span> {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400 font-mono">
              Повторите новый пароль
            </label>
            <PasswordInput
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              iconClassName="text-gray-500 hover:text-gray-300"
              className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
            />
            {mismatch && (
              <span className="text-[10px] text-rose-400 font-mono">Пароли не совпадают.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="w-full flex items-center justify-center gap-2 bg-[#A38D6D] text-[#111111] p-3 rounded text-[10px] uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#b39c7c]"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Сохранить и войти
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="w-full text-[10px] uppercase tracking-widest font-mono text-gray-500 hover:text-gray-300 cursor-pointer"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
