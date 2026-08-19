import React from 'react';

const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');

/**
 * Инвестор в таблице — ссылка в раздел «Пользователи & KYC/AML»: из реестра держателей и из
 * whitelist оператору почти всегда нужна карточка человека, а не сам идентификатор.
 *
 * Без `onOpenInvestor` (например, там, где переход некуда сделать) ведёт себя как обычный текст.
 */
export default function InvestorLink({ investorId, investors = [], onOpenInvestor }) {
  if (!investorId) return '—';
  const investor = investors.find((i) => i.id === investorId);
  const label = investor?.name || shortId(investorId);
  if (!onOpenInvestor) return label;
  return (
    <button
      type="button"
      onClick={() => onOpenInvestor(investorId)}
      title={`Открыть карточку инвестора ${investorId}`}
      className="text-[#A38D6D] underline decoration-dotted underline-offset-2 hover:text-gray-900 cursor-pointer"
    >
      {label}
    </button>
  );
}
