import React from 'react';
import { Plus, Trash2, Home, Car, FileText } from 'lucide-react';
import { UNIT_TYPE_LABELS, isParkingUnitType } from '../api/mappers';

// Max photos per unit — mirrors Property.MaxImages on the backend.
export const MAX_UNIT_IMAGES = 10;

// What POST /properties/{id}/documents accepts: PDF or image, 25 MB. Enforced here too so an
// oversized file is refused while the admin is still looking at the form, rather than after a
// building and all its units have already been created.
export const MAX_UNIT_DOC_BYTES = 25 * 1024 * 1024;
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** Why this file cannot be uploaded, or '' when it is fine. */
export function unitDocRejection(file) {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) return 'только PDF или изображение';
  if (file.size > MAX_UNIT_DOC_BYTES) return 'больше 25 МБ';
  return '';
}

// Suggested room rows per unit type. The admin can rename/remove any of them: the backend stores a
// free-text label plus an area, so a 4-room flat with two bathrooms or a garage all fit the same list.
const ROOM_PRESETS = {
  apartment: ['Кухня+Столовая', 'Прихожая', 'Ванная', 'Спальня', 'Лоджия'],
  commercial: ['Торговый зал', 'Подсобное помещение', 'Санузел'],
  garage: [],
  parking_space: [],
  storage: [],
  other: [],
};

/** A blank unit row for the create form. */
export function newUnit(unitType = 'apartment') {
  return {
    key: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    unitType,
    name: '',
    unitNumber: '',
    floorNumber: '',
    section: '',
    row: '',
    spot: '',
    roomCount: unitType === 'apartment' ? 2 : '',
    totalAreaSqM: '',
    description: '',
    rooms: (ROOM_PRESETS[unitType] || []).map((name) => ({ name, areaSqM: '' })),
    tokenPrice: 1000,
    totalTokens: 1000,
    minPurchaseTokens: 1,
    totalValue: '',
    imageFiles: [],
    imagePreviews: [],
    // Правоустанавливающие файлы этого помещения. У гаража свой техпаспорт и своя выписка, поэтому
    // документы висят на помещении, а не на здании — бэкенд их так и хранит, на выпуске.
    docFiles: [],
  };
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Width is deliberately NOT part of the base: `w-full` beats `w-28` in the cascade regardless of the
// order the classes are concatenated in, which would collapse any narrower field sharing a flex row.
const inputBase =
  'p-2 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white';
const inputClass = `w-full ${inputBase}`;
const labelClass = 'block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1';

/**
 * One unit (apartment, garage, …) inside the building being registered. Everything here becomes a
 * separate property on the backend with its OWN token issue — that is why the tokenomics fields sit
 * on the unit and not on the building.
 */
export function UnitCard({ unit, index, onChange, onRemove, currencyLabel = 'сом' }) {
  const patch = (fields) => onChange({ ...unit, ...fields });

  const roomsSum = (unit.rooms || []).reduce((acc, r) => acc + num(r.areaSqM), 0);
  const totalArea = num(unit.totalAreaSqM);
  // Deliberately a warning, never a block: a plan legitimately disagrees with the sellable area.
  const areaMismatch = totalArea > 0 && roomsSum > 0 && Math.abs(totalArea - roomsSum) > 0.01;

  const setRoom = (i, fields) =>
    patch({ rooms: unit.rooms.map((r, ri) => (ri === i ? { ...r, ...fields } : r)) });

  const addRoom = () => patch({ rooms: [...(unit.rooms || []), { name: '', areaSqM: '' }] });
  const removeRoom = (i) => patch({ rooms: unit.rooms.filter((_, ri) => ri !== i) });

  const addPhotos = (fileList) => {
    const picked = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    const room = MAX_UNIT_IMAGES - (unit.imageFiles || []).length;
    const files = picked.slice(0, Math.max(0, room));
    if (!files.length) return;
    patch({
      imageFiles: [...(unit.imageFiles || []), ...files],
      imagePreviews: [...(unit.imagePreviews || []), ...files.map((f) => URL.createObjectURL(f))],
    });
  };

  const addDocs = (fileList) => {
    const picked = Array.from(fileList || []);
    const accepted = picked.filter((f) => !unitDocRejection(f));
    const rejected = picked.filter((f) => unitDocRejection(f));
    // Отказ показываем сразу и поимённо: молча отбросить выбранный файл — значит дать админу
    // сохранить объект в уверенности, что документ приложен.
    patch({
      docFiles: [...(unit.docFiles || []), ...accepted],
      docError: rejected.length
        ? rejected.map((f) => `${f.name} — ${unitDocRejection(f)}`).join('; ')
        : '',
    });
  };

  const removeDoc = (i) =>
    patch({ docFiles: (unit.docFiles || []).filter((_, di) => di !== i), docError: '' });

  const removePhoto = (i) => {
    const preview = (unit.imagePreviews || [])[i];
    if (preview) URL.revokeObjectURL(preview);
    patch({
      imageFiles: (unit.imageFiles || []).filter((_, fi) => fi !== i),
      imagePreviews: (unit.imagePreviews || []).filter((_, fi) => fi !== i),
    });
  };

  const isApartmentLike = unit.unitType === 'apartment' || unit.unitType === 'commercial';
  const isParking = isParkingUnitType(unit.unitType);
  const Icon = isParking ? Car : Home;

  return (
    <div className="border border-gray-200 rounded-sm bg-gray-50/60 p-4 space-y-4">
      {/* Unit header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={13} className="text-[#A38D6D] shrink-0" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-700 truncate">
            {index + 1}. {UNIT_TYPE_LABELS[unit.unitType] || 'Помещение'}
            {unit.unitNumber ? ` №${unit.unitNumber}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-red-500 hover:text-red-700 cursor-pointer"
        >
          <Trash2 size={11} />
          Убрать
        </button>
      </div>

      {/* What it is */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Тип помещения</label>
          <select
            value={unit.unitType}
            onChange={(e) => {
              const unitType = e.target.value;
              // Swap the suggested rooms only while the admin has not filled any in yet.
              const untouched = (unit.rooms || []).every((r) => !num(r.areaSqM));
              patch({
                unitType,
                roomCount: unitType === 'apartment' ? unit.roomCount || 2 : '',
                rooms: untouched
                  ? (ROOM_PRESETS[unitType] || []).map((name) => ({ name, areaSqM: '' }))
                  : unit.rooms,
              });
            }}
            className={inputClass}
          >
            {Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Номер</label>
          <input
            type="text" placeholder={isParking ? 'P-125' : '12 / Г-4'}
            value={unit.unitNumber}
            onChange={(e) => patch({ unitNumber: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Этаж</label>
          <input
            type="number" placeholder={isParking ? '-1' : '4'}
            value={unit.floorNumber}
            onChange={(e) => patch({ floorNumber: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
        {!isParking && (
          <div>
            <label className={labelClass}>Комнатность</label>
            <select
              value={unit.roomCount ?? ''}
              onChange={(e) => patch({ roomCount: e.target.value })}
              disabled={!isApartmentLike}
              className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}-комнатный</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Where the car stands. Only a garage / parking space is addressed this way, so these
          fields stay out of the way for a flat. */}
      {isParking && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Секция / блок</label>
            <input
              type="text" placeholder="B"
              value={unit.section ?? ''}
              onChange={(e) => patch({ section: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ряд</label>
            <input
              type="text" placeholder="12"
              value={unit.row ?? ''}
              onChange={(e) => patch({ row: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Место</label>
            <input
              type="text" placeholder="125"
              value={unit.spot ?? ''}
              onChange={(e) => patch({ spot: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={labelClass}>Название (необязательно)</label>
          <input
            type="text"
            placeholder={
              (unit.roomCount ? `${unit.roomCount}-комнатный ` : '') +
              (UNIT_TYPE_LABELS[unit.unitType] || 'Помещение') +
              (unit.unitNumber ? ` №${unit.unitNumber}` : '')
            }
            value={unit.name}
            onChange={(e) => patch({ name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Общая площадь, м²</label>
          <input
            type="number" min="0" step="0.01" placeholder={isParking ? '15.2' : '128.82'}
            value={unit.totalAreaSqM}
            onChange={(e) => patch({ totalAreaSqM: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      {/* Room breakdown. A garage or a parking space has nothing to break down, so the whole
          table is hidden for those rather than shown empty. */}
      {!isParking && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider">
              Разбивка по помещениям
            </span>
            <span className="text-[9px] font-mono text-gray-500">
              Σ {roomsSum.toFixed(2)} м²
              {totalArea > 0 && ` / ${totalArea.toFixed(2)} м²`}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span className={`${labelClass} flex-1 min-w-0 mb-0`}>Название помещения</span>
            <span className={`${labelClass} w-28 shrink-0 mb-0`}>Площадь</span>
            <span className="w-5" />
            <span className="w-[13px]" />
          </div>

          <div className="space-y-2">
            {(unit.rooms || []).map((room, ri) => (
              <div key={ri} className="flex items-center gap-2">
                <input
                  type="text" placeholder="Кухня+Столовая / Спальня / Ванная"
                  value={room.name}
                  onChange={(e) => setRoom(ri, { name: e.target.value })}
                  className={`${inputBase} flex-1 min-w-0`}
                />
                <input
                  type="number" min="0" step="0.01" placeholder="28.68"
                  value={room.areaSqM}
                  onChange={(e) => setRoom(ri, { areaSqM: e.target.value })}
                  className={`${inputBase} w-28 shrink-0 font-mono`}
                />
                <span className="text-[9px] font-mono text-gray-400 w-5">м²</span>
                <button
                  type="button"
                  onClick={() => removeRoom(ri)}
                  className="text-gray-300 hover:text-red-500 cursor-pointer"
                  title="Удалить строку"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRoom}
            className="mt-2 flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-[#A38D6D] hover:text-[#8e7b5e] cursor-pointer"
          >
            <Plus size={11} />
            Добавить помещение
          </button>

          {areaMismatch && (
            <p className="mt-1.5 text-[9px] font-mono text-amber-600">
              Сумма помещений ({roomsSum.toFixed(2)} м²) не сходится с общей площадью
              ({totalArea.toFixed(2)} м²). Это допустимо — сохранению не мешает.
            </p>
          )}
        </div>
      )}

      {/* Issue — per unit */}
      <div className="border-t border-gray-200 pt-3">
        <span className="block text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider mb-2">
          Выпуск токенов на это помещение
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Цена за токен ({currencyLabel})</label>
            <input
              type="number" min="1" step="any" required
              value={unit.tokenPrice}
              onChange={(e) => patch({ tokenPrice: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Всего токенов</label>
            {/* Только целые: на контракте decimals() = 0, дробный выпуск невозможно выпустить.
                Токен — доля выпуска, а не квадратный метр: выпуск режут на столько долей,
                чтобы цена одной была мелкой против минимального входа. */}
            <input
              type="number" min="1" step="1" required
              value={unit.totalTokens}
              onChange={(e) => patch({ totalTokens: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Минимальная покупка (токенов)</label>
            <input
              type="number" min="1" step="1"
              value={unit.minPurchaseTokens ?? 1}
              onChange={(e) => patch({ minPurchaseTokens: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Стоимость ({currencyLabel})</label>
            <input
              type="number" min="1" step="any"
              placeholder={String(num(unit.tokenPrice) * num(unit.totalTokens) || '')}
              value={unit.totalValue}
              onChange={(e) => patch({ totalValue: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
        <p className="text-[8px] text-gray-400 font-mono mt-1.5">
          Стоимость по умолчанию = цена токена × количество токенов. Порог входа ={' '}
          {num(unit.tokenPrice) * Math.max(1, num(unit.minPurchaseTokens) || 1) || '—'} {currencyLabel}.
          Правило номинала: цена токена не больше одного процента минимального входа.
        </p>
        {num(unit.totalAreaSqM) > 0 && num(unit.totalTokens) > 0 && (
          <p className="text-[8px] text-gray-400 font-mono mt-1">
            Расчётный эквивалент: 1 токен ≈{' '}
            {(num(unit.totalAreaSqM) / num(unit.totalTokens)).toLocaleString('ru-RU', {
              maximumFractionDigits: 4,
            })}{' '}
            м². Это производная величина для показа, а не единица выпуска.
          </p>
        )}
      </div>

      {/* Unit photos */}
      <div className="border-t border-gray-200 pt-3">
        <span className="block text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider mb-2">
          Фото помещения (до {MAX_UNIT_IMAGES})
        </span>
        <div className="grid grid-cols-4 gap-2">
          {(unit.imagePreviews || []).map((src, pi) => (
            <div key={pi} className="relative h-16 bg-gray-100 border border-gray-200 rounded-sm overflow-hidden group">
              <img src={src} alt={`Фото ${pi + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(pi)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] uppercase font-bold tracking-wider transition-opacity cursor-pointer"
              >
                Удалить
              </button>
            </div>
          ))}
          {(unit.imageFiles || []).length < MAX_UNIT_IMAGES && (
            <label className="h-16 border border-dashed border-gray-300 rounded-sm flex items-center justify-center cursor-pointer hover:border-[#A38D6D] text-gray-400 hover:text-[#A38D6D]">
              <Plus size={14} />
              <input
                type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Документы помещения. У гаража свой техпаспорт и своя выписка из реестра — они не
          сводятся к документам здания, поэтому прикладываются здесь, к конкретному выпуску. */}
      <div className="border-t border-gray-200 pt-3">
        <span className="block text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider mb-2">
          Документы помещения (PDF или изображение, до 25 МБ)
        </span>

        {(unit.docFiles || []).length > 0 && (
          <div className="border border-gray-150 rounded-sm divide-y divide-gray-100 mb-2">
            {(unit.docFiles || []).map((f, di) => (
              <div key={`${f.name}-${di}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={11} className="text-[#A38D6D] shrink-0" />
                  <span className="text-[11px] text-gray-700 truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-gray-400">
                    {(f.size / (1024 * 1024)).toFixed(1)} МБ
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDoc(di)}
                    className="text-[9px] uppercase font-bold tracking-wider text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Убрать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-sm cursor-pointer hover:border-[#A38D6D] text-gray-500 hover:text-[#A38D6D] text-[9px] uppercase font-bold tracking-wider">
          <Plus size={11} />
          Приложить документ
          <input
            type="file" accept=".pdf,image/*" multiple className="hidden"
            onChange={(e) => { addDocs(e.target.files); e.target.value = ''; }}
          />
        </label>

        {unit.docError && (
          <p className="mt-1.5 text-[10px] text-red-600">Не приложено: {unit.docError}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Read-only room breakdown, used on the property detail panel. Renders nothing when the unit has
 * no breakdown, so a standalone (non-unit) property is unaffected.
 */
export function RoomBreakdown({ rooms, totalAreaSqM }) {
  if (!rooms || rooms.length === 0) return null;
  const sum = rooms.reduce((acc, r) => acc + num(r.areaSqM), 0);
  const total = num(totalAreaSqM);

  return (
    <div>
      <span className="block text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider mb-2">
        Разбивка по помещениям
      </span>
      <div className="border border-gray-150 rounded-sm divide-y divide-gray-100">
        {rooms.map((r) => (
          <div key={r.id || r.name} className="flex justify-between px-3 py-1.5">
            <span className="text-[11px] text-gray-700">{r.name}</span>
            <span className="text-[11px] font-mono text-gray-900">{num(r.areaSqM).toFixed(2)} м²</span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-1.5 bg-gray-50">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-500">Итого</span>
          <span className="text-[11px] font-mono font-bold text-gray-900">
            {sum.toFixed(2)} м²{total > 0 && Math.abs(total - sum) > 0.01 ? ` из ${total.toFixed(2)} м²` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default UnitCard;
