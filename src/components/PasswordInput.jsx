import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide toggle. Drop-in for a plain <input type="password">:
 * pass the same value/onChange/className/placeholder. The eye button sits inside the
 * field on the right; `className` still controls the input's look, and right padding is
 * added so text never runs under the button.
 *
 * `iconClassName` tunes the toggle colour for dark vs. light forms.
 */
export default function PasswordInput({
  value,
  onChange,
  className = '',
  iconClassName = 'text-gray-400 hover:text-gray-700',
  required = false,
  placeholder = '••••••••',
  autoComplete = 'off',
  ...rest
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${className} pr-10`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        title={visible ? 'Скрыть пароль' : 'Показать пароль'}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer transition-colors ${iconClassName}`}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
