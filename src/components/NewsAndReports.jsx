import React, { useState } from 'react';
import { Newspaper, Send, Building2, X } from 'lucide-react';
import api from '../api';
import { mapPublicationToCreateRequest, mapPublicationFromApi } from '../api/mappers';

const PUB_TYPES = [
  { value: 'Financial Report', label: 'Финансовый отчёт' },
  { value: 'News Release', label: 'Новость объекта' },
  { value: 'Valuation Audit', label: 'Оценка стоимости' },
  { value: 'General News', label: 'Новость' },
];

const typeLabel = (v) => PUB_TYPES.find((t) => t.value === v)?.label || v;

export default function NewsAndReports({
  publications,
  setPublications,
  properties,
  loading,
  error,
  onRefresh,
  onAddLog,
}) {
  // Publications can only be written about *active* (open) objects.
  const activeProps = properties.filter((p) => p.status === 'active');

  const [propertyId, setPropertyId] = useState('');
  const [type, setType] = useState('Financial Report');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [success, setSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const [filterProp, setFilterProp] = useState('all');
  const [selectedPub, setSelectedPub] = useState(null);

  // POST /publications. The backend fans out the investor notifications itself, so the
  // dashboard only publishes — it never pushes to investors directly.
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || publishing) return;
    // Property is optional — publications can be general (not tied to an object).
    const prop = activeProps.find((p) => p.id === propertyId) || null;

    setPublishing(true);
    setPublishError('');
    try {
      const created = await api.publications.create(
        mapPublicationToCreateRequest({ type, title, summary, propertyId })
      );
      setPublications([mapPublicationFromApi(created), ...publications]);
      onAddLog(
        'News/Report Published',
        prop
          ? `Опубликовано «${title.trim()}» (${typeLabel(type)}) по активу "${prop.name}".`
          : `Опубликовано «${title.trim()}» (${typeLabel(type)}) — общая публикация.`
      );
      setTitle('');
      setSummary('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setPublishError(err?.message || 'Не удалось опубликовать. Публикация не отправлена инвесторам.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (pub) => {
    if (!window.confirm(`Снять публикацию «${pub.title}»? Инвесторы перестанут её видеть.`)) return;
    try {
      await api.publications.remove(pub.id);
      setPublications(publications.filter((p) => p.id !== pub.id));
      setSelectedPub(null);
      onAddLog('News/Report Removed', `Публикация «${pub.title}» снята с ленты.`);
    } catch (err) {
      setPublishError(err?.message || 'Не удалось снять публикацию');
    }
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

      {loading && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
          <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
          Загрузка ленты публикаций…
        </div>
      )}
      {!loading && error && (
        <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          ⚠ Лента недоступна — показаны демо-данные. {error}
        </div>
      )}

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
                <p className="text-[10px] font-mono font-bold text-emerald-600">
                  ✓ Опубликовано — инвесторы получат уведомление
                </p>
              )}
              {publishError && (
                <p className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-2">
                  {publishError}
                </p>
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
                disabled={publishing}
                className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold transition-all cursor-pointer"
              >
                <Send size={13} />
                <span>{publishing ? 'Публикуем…' : 'Опубликовать'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: feed */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-sm shadow-xs flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-[#FAF9F5]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-serif font-bold text-gray-900">Лента публикаций</h3>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-[#A38D6D] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Обновить
                </button>
              )}
            </div>
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

            <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-4">
              <span className="text-[8px] text-gray-400 font-mono">
                Дата: {selectedPub.date} • Статус: {selectedPub.status === 'Draft' ? 'DRAFT' : 'PUBLISHED'}
              </span>
              {selectedPub._source === 'api' && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedPub)}
                  className="text-[9px] font-mono uppercase tracking-wider font-bold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer shrink-0"
                >
                  Снять с публикации
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
