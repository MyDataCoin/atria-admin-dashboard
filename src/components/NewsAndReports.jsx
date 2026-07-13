import React, { useState } from 'react';
import { Newspaper, Send, Building2, X } from 'lucide-react';

const PUB_TYPES = [
  { value: 'Financial Report', label: 'Финансовый отчёт' },
  { value: 'News Release', label: 'Новость объекта' },
  { value: 'Valuation Audit', label: 'Оценка стоимости' },
  { value: 'General News', label: 'Новость' },
];

const typeLabel = (v) => PUB_TYPES.find((t) => t.value === v)?.label || v;

export default function NewsAndReports({ publications, setPublications, properties, onAddLog }) {
  // Publications can only be written about *active* (open) objects.
  const activeProps = properties.filter((p) => p.status === 'active');

  const [propertyId, setPropertyId] = useState('');
  const [type, setType] = useState('Financial Report');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [success, setSuccess] = useState(false);

  const [filterProp, setFilterProp] = useState('all');
  const [selectedPub, setSelectedPub] = useState(null);

  const handlePublish = (e) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    // Property is optional — publications can be general (not tied to an object).
    const prop = activeProps.find((p) => p.id === propertyId) || null;

    const newPub = {
      id: `pub-${Date.now()}`,
      title: title.trim(),
      date: new Date().toISOString().split('T')[0],
      propertyId: prop ? prop.id : null,
      propertyName: prop ? prop.name : null,
      type,
      summary: summary.trim(),
      status: 'Published',
    };
    setPublications([newPub, ...publications]);
    onAddLog(
      'News/Report Published',
      prop
        ? `Опубликовано «${newPub.title}» (${typeLabel(type)}) по активу "${prop.name}".`
        : `Опубликовано «${newPub.title}» (${typeLabel(type)}) — общая публикация.`
    );
    setTitle('');
    setSummary('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const list = filterProp === 'all'
    ? publications
    : filterProp === 'general'
      ? publications.filter((p) => !p.propertyId)
      : publications.filter((p) => p.propertyId === filterProp);

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Header */}
      <div>
        <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
          Раскрытие информации & IR
        </span>
        <h2 className="text-xl font-serif font-bold text-gray-900">Финотчёты & Новости по объектам</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: publish form */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-sm shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Newspaper size={16} className="text-[#A38D6D]" />
            <h3 className="text-sm font-serif font-bold text-gray-900">Новая публикация</h3>
          </div>

          {(
            <form onSubmit={handlePublish} className="space-y-4 text-xs">
              {success && (
                <p className="text-[10px] font-mono font-bold text-emerald-600">✓ Публикация добавлена!</p>
              )}

              {/* Active object */}
              <div className="space-y-1">
                <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                  Активный объект <span className="text-gray-300 normal-case">(необязательно)</span>
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 rounded-sm focus:outline-none focus:border-[#A38D6D] font-serif font-bold"
                >
                  <option value="">— Без объекта (общая новость) —</option>
                  {activeProps.map((p) => (
                    <option key={p.id} value={p.id}>{p.city ? `${p.name} (${p.city})` : p.name}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                  Тип публикации
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 rounded-sm focus:outline-none focus:border-[#A38D6D]"
                >
                  {PUB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                  Тема / заголовок
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Квартальный отчёт Q2 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 rounded-sm focus:outline-none focus:border-[#A38D6D]"
                />
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                  Текст сообщения
                </label>
                <textarea
                  rows={9}
                  required
                  placeholder="Содержание обновления для инвесторов…"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full p-3 border border-gray-200 bg-white text-gray-900 rounded-sm focus:outline-none focus:border-[#A38D6D] resize-y min-h-[180px]"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#A38D6D] text-white py-2.5 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold transition-all cursor-pointer"
              >
                <Send size={13} />
                <span>Опубликовать</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: feed */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-sm shadow-xs flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-[#FAF9F5]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-serif font-bold text-gray-900">Лента публикаций</h3>
            <select
              value={filterProp}
              onChange={(e) => setFilterProp(e.target.value)}
              className="text-[10px] p-1.5 border border-gray-200 bg-white rounded-sm focus:outline-none focus:border-[#A38D6D] text-gray-700"
            >
              <option value="all">Все объекты</option>
              <option value="general">Без объекта (общие)</option>
              {[...new Map(
                publications.filter((p) => p.propertyId).map((p) => [p.propertyId, p.propertyName])
              ).entries()].map(
                ([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                )
              )}
            </select>
          </div>

          <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
            {list.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Newspaper size={30} className="mx-auto text-gray-300" />
                <p className="text-xs text-gray-500 font-serif">Публикаций пока нет</p>
              </div>
            ) : (
              list.map((pub) => (
                <button
                  type="button"
                  key={pub.id}
                  onClick={() => setSelectedPub(pub)}
                  className="w-full text-left p-4 border border-gray-100 rounded text-xs bg-white space-y-1.5 hover:border-[#A38D6D] hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-gray-900 leading-tight block font-serif">{pub.title}</span>
                    <span className="text-[8px] font-mono uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-bold shrink-0">
                      {typeLabel(pub.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#A38D6D] font-mono font-bold">
                    <Building2 size={11} />
                    <span>{pub.propertyName || 'Общая публикация'}</span>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed pt-1 line-clamp-2">{pub.summary}</p>
                  <span className="text-[8px] text-gray-400 font-mono block pt-1.5 border-t border-gray-50">
                    Дата: {pub.date} • Статус: PUBLISHED
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full-message modal */}
      {selectedPub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedPub(null)}
        >
          <div
            className="bg-white rounded-sm shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
              <div className="space-y-2">
                <span className="text-[8px] font-mono uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-bold inline-block">
                  {typeLabel(selectedPub.type)}
                </span>
                <h3 className="text-lg font-serif font-bold text-gray-900 leading-tight">{selectedPub.title}</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-[#A38D6D] font-mono font-bold">
                  <Building2 size={11} />
                  <span>{selectedPub.propertyName || 'Общая публикация'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPub(null)}
                className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selectedPub.summary}</p>
            </div>

            <div className="p-5 border-t border-gray-100">
              <span className="text-[8px] text-gray-400 font-mono">
                Дата: {selectedPub.date} • Статус: PUBLISHED
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
