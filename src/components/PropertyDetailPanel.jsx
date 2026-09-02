import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building, FileText, MapPin } from 'lucide-react';
import api from '../api';
import {
  UNIT_TYPE_LABELS,
  CONSTRUCTION_STAGE_LABELS,
  mapHolderFromInvestment,
  isParkingUnitType,
  formatParkingSpot,
} from '../api/mappers';
import { safeUrl } from '../utils';
import { RoomBreakdown } from './UnitEditor';

const TABS = [
  { id: 'info', label: 'Об объекте' },
  { id: 'docs', label: 'Документы' },
  { id: 'holders', label: 'Доли инвесторов' },
];

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800';

const formatTokens = (count) => (count == null ? '—' : Number(count).toLocaleString('ru-RU'));

const formatMoney = (amount, currencyCode) =>
  amount == null ? '—' : `${Math.round(Number(amount)).toLocaleString('ru-RU')} ${currencyCode || ''}`.trim();

// Даты с бэкенда приходят в ISO/UTC. Показываем только дату: плановый ввод и дата проверки
// Кадастра — это дни, а не моменты, и время суток здесь ничего не значит.
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
};

function Metric({ label, value }) {
  return (
    <div className="bg-[#FAF8F3]/60 border border-gray-100 rounded p-3">
      <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider block mb-1">{label}</span>
      <span className="text-sm font-bold font-mono text-gray-900">{value}</span>
    </div>
  );
}

function Spec({ label, value, wide = false, icon: Icon }) {
  if (!value) return null;
  return (
    <div className={`border-b border-gray-100 pb-2.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">{label}</span>
      <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-[#A38D6D] shrink-0" />}
        {value}
      </span>
    </div>
  );
}

/**
 * Карточка объекта, открывающаяся боковой панелью. Только чтение: её показывают там, где объект
 * не редактируют — например в сводке по кликнутому размещению, — поэтому здесь нет ни загрузки
 * документов, ни управления продажами, которые живут в разделе «Объекты и документы».
 *
 * `buildingName` приходит снаружи: объект знает лишь buildingId, а список зданий грузит владелец экрана.
 */
export default function PropertyDetailPanel({ property, buildingName = '', onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [holders, setHolders] = useState(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState('');

  const images = property?.images?.length ? property.images : [property?.image].filter(Boolean);

  useEffect(() => {
    setActiveTab('info');
    setActiveImgIndex(0);
  }, [property?.id]);

  useEffect(() => {
    if (!property) return undefined;
    let cancelled = false;
    setHoldersLoading(true);
    setHolders(null);
    setHoldersError('');
    api.admin
      .propertyInvestments(property.id)
      .then((list) => {
        if (cancelled) return;
        setHolders(Array.isArray(list) ? list.map((d) => mapHolderFromInvestment(d, property)) : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setHoldersError(e?.status === 401 ? 'Нужен вход (нет/просрочен токен)' : (e?.message || 'нет доступа'));
      })
      .finally(() => {
        if (!cancelled) setHoldersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [property]);

  if (!property) return null;

  const total = property.totalTokens ?? 0;
  const available = property.availableTokens ?? total;
  const soldPct = total > 0 ? Math.max(0, Math.min(100, ((total - available) / total) * 100)) : 0;
  const documents = property.documents || [];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-end z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white h-full sm:max-h-[96vh] w-full max-w-2xl sm:rounded-sm shadow-2xl flex flex-col justify-between overflow-hidden text-left border-l border-gray-200"
      >
        {/* Шапка с фото */}
        <div className="relative h-48 bg-gray-100 shrink-0">
          <img
            src={images[activeImgIndex] || FALLBACK_IMAGE}
            alt={property.name}
            className="w-full h-full object-cover transition-all duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {images.length > 1 && (
            <div className="absolute bottom-4 right-6 flex gap-1.5 z-10 bg-black/40 backdrop-blur-xs p-1.5 rounded-full">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImgIndex(idx)}
                  title={`Слайд ${idx + 1}`}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    activeImgIndex === idx ? 'bg-[#A38D6D] scale-125' : 'bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 cursor-pointer bg-black/50 text-white hover:bg-black/80 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors"
          >
            ✕
          </button>

          <div className="absolute bottom-4 left-6 text-white">
            <span className="text-[8px] font-mono uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
              Карточка объекта
            </span>
            <h3 className="text-xl font-serif font-bold leading-tight">{property.name}</h3>
            <p className="text-[10px] text-gray-300 font-mono mt-0.5 uppercase tracking-wide">
              {[property.city, property.country, property.type].filter(Boolean).join(' • ')
                || 'Токенизированный актив RWA'}
            </p>
          </div>
        </div>

        {/* Вкладки */}
        <div className="flex border-b border-gray-150 bg-[#FBFBFA] shrink-0 font-semibold uppercase tracking-wider font-mono">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-center border-b-2 text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#A38D6D] text-[#A38D6D] bg-white font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'info' && (
            <div className="space-y-7">
              {/* Земельный участок — не помещение: ни номера, ни этажа, ни комнатности у него
                  нет, и та же сетка показала бы четыре прочерка. Своя раскладка. */}
              {property.unitType === 'land_plot' && (
                <div>
                  <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Земельный участок</h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label="Тип" value={UNIT_TYPE_LABELS.land_plot} />
                    <Metric
                      label="Площадь участка"
                      value={property.landAreaHectares != null ? `${Number(property.landAreaHectares)} га` : '—'}
                    />
                    <Metric label="Идент. код участка" value={property.landPlotCode || '—'} />
                    <Metric label="Кадастровый номер" value={property.cadastralNumber || '—'} />
                  </div>
                </div>
              )}

              {property.unitType && property.unitType !== 'land_plot' && (
                <div>
                  <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Помещение</h4>

                  {buildingName && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-3">
                      <Building size={12} className="text-[#A38D6D]" />
                      В здании <span className="font-bold text-gray-900">{buildingName}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <Metric label="Тип" value={UNIT_TYPE_LABELS[property.unitType] || '—'} />
                    <Metric
                      label="Номер / этаж"
                      value={`${property.unitNumber || '—'}${property.floorNumber != null ? ` / ${property.floorNumber}` : ''}`}
                    />
                    {/* Паркинг адресуется секцией-рядом-местом, комнатности у него нет. */}
                    {isParkingUnitType(property.unitType) ? (
                      <Metric label="Секция / ряд / место" value={formatParkingSpot(property)} />
                    ) : (
                      <Metric
                        label="Комнатность"
                        value={property.roomCount ? `${property.roomCount}-комн.` : '—'}
                      />
                    )}
                    <Metric
                      label="Площадь"
                      value={property.totalAreaSqM ? `${Number(property.totalAreaSqM).toFixed(2)} м²` : '—'}
                    />
                  </div>

                  <RoomBreakdown rooms={property.rooms} totalAreaSqM={property.totalAreaSqM} />
                </div>
              )}

              {property.description && (
                <div>
                  <h4 className="text-sm font-serif font-bold text-gray-900 mb-2">Описание объекта</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
                </div>
              )}

              {property.tokenPrice != null && (
                <div>
                  <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Токенизация</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label="Цена доли" value={formatMoney(property.tokenPrice, property.currency)} />
                    <Metric label="Доступно" value={formatTokens(property.availableTokens)} />
                    <Metric label="Всего долей" value={formatTokens(property.totalTokens)} />
                    <Metric label="Валюта" value={property.currency || '—'} />
                  </div>

                  {total > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                        <span className="uppercase tracking-wider text-gray-400 font-semibold">Продано долей</span>
                        <span className="font-bold text-gray-700">{soldPct.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded overflow-hidden">
                        <div className="h-full bg-[#A38D6D] transition-all duration-500" style={{ width: `${soldPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Строительная готовность. Отдельный блок, а не строка в характеристиках: статус
                  объекта в шапке — про размещение, а это про то, что физически стоит на участке. */}
              {(property.constructionStage || property.plannedCompletionDate
                || property.readinessPercent != null || property.isFreeOfEncumbrances != null) && (
                <div>
                  <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Готовность объекта</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric
                      label="Стадия"
                      value={CONSTRUCTION_STAGE_LABELS[property.constructionStage] || '—'}
                    />
                    <Metric
                      label="Плановый ввод"
                      value={formatDate(property.plannedCompletionDate)}
                    />
                    <Metric
                      label="Готовность"
                      value={property.readinessPercent != null ? `${property.readinessPercent}%` : '—'}
                    />
                    {/* null — «не проверяли». Это не то же самое, что «обременений нет», и
                        подписывается иначе. */}
                    <Metric
                      label="Обременения"
                      value={
                        property.isFreeOfEncumbrances == null
                          ? 'Не проверялось'
                          : property.isFreeOfEncumbrances
                            ? `Нет${property.encumbranceCheckedAtUtc ? ` (${formatDate(property.encumbranceCheckedAtUtc)})` : ''}`
                            : `Есть${property.encumbranceCheckedAtUtc ? ` (${formatDate(property.encumbranceCheckedAtUtc)})` : ''}`
                      }
                    />
                  </div>
                </div>
              )}

              {(property.address || property.type || property.city || property.developer
                || property.floors || property.completionYear) && (
                <div>
                  <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Характеристики объекта</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <Spec label="Полный адрес" value={property.address} wide icon={MapPin} />
                    <Spec label="Тип недвижимости" value={property.type} />
                    <Spec
                      label="Город / Страна"
                      value={[property.city, property.country].filter(Boolean).join(', ')}
                    />
                    <Spec label="Застройщик" value={property.developer} />
                    <Spec label="Этажность" value={property.floors ? `${property.floors} эт.` : ''} />
                    <Spec label="Год постройки" value={property.completionYear ? String(property.completionYear) : ''} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'docs' && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 font-mono">
                Документы объекта недвижимости
              </h4>
              {documents.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4">Документы ещё не загружены для этого объекта.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex justify-between items-center p-3 border border-gray-100 rounded hover:bg-[#FBFBFA] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-[#A38D6D] shrink-0" />
                        <div className="truncate text-xs">
                          {safeUrl(doc.url) ? (
                            <a
                              href={safeUrl(doc.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-gray-900 block truncate hover:text-[#A38D6D] hover:underline"
                            >
                              {doc.fileName || 'Документ'}
                            </a>
                          ) : (
                            <span className="font-bold text-gray-900 block truncate">{doc.fileName || 'Документ'}</span>
                          )}
                          <span className="text-[9px] text-gray-400 font-mono">Сохранён на сервере</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[9px] font-mono text-gray-400 mt-4">
                Загрузка и удаление документов — в разделе «Объекты и документы».
              </p>
            </div>
          )}

          {activeTab === 'holders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold font-mono">
                  Распределение долей инвесторов
                </h4>
                {holdersLoading && (
                  <span className="text-[9px] font-mono text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A38D6D] animate-pulse" /> загрузка…
                  </span>
                )}
              </div>

              {!holdersLoading && holders === null && holdersError && (
                <div className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  ⚠ {holdersError} — держатели не загружены
                </div>
              )}

              {holders !== null && (
                <div className="space-y-3 font-mono">
                  {holders.map((h) => {
                    const weight =
                      h.sharePercent != null
                        ? h.sharePercent
                        : h.tokens != null && total
                          ? (h.tokens / total) * 100
                          : null;
                    return (
                      <div
                        key={h.id}
                        className="flex justify-between items-center p-3 border border-gray-50 bg-[#FBFBFA] rounded text-xs"
                      >
                        <div className="text-left min-w-0">
                          <span className="font-bold text-gray-900 block font-serif truncate">{h.name}</span>
                          {h.walletAddress && (
                            <span className="text-[9px] text-gray-400 font-mono truncate max-w-[220px] block">
                              {h.walletAddress}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-[#A38D6D] block">
                            {h.tokens != null
                              ? `${h.tokens.toLocaleString('ru-RU')} долей`
                              : formatMoney(h.amount, h.currency)}
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {weight != null ? `Доля: ${weight.toFixed(2)}%` : h.status || ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {holders.length === 0 && (
                    <p className="text-xs text-gray-400 italic py-4">
                      Инвесторы ещё не приобрели доли в этом объекте.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] uppercase font-bold tracking-widest py-3 rounded transition-all cursor-pointer"
          >
            Закрыть карточку
          </button>
        </div>
      </motion.div>
    </div>
  );
}
