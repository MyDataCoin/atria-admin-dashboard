import React, { useEffect, useState } from 'react';
import { User, Building, Briefcase, FileText, Wallet } from 'lucide-react';
import { fetchRealtorProfile } from '../api/realtor';

export default function ProfileView({
  currentRealtor
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Профиль риелтора из ATRIA API (realtor_profiles).
  useEffect(() => {
    let cancelled = false;
    fetchRealtorProfile()
      .then((p) => {
        if (!cancelled) { setProfile(p); setLoadError(''); }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не удалось загрузить профиль с сервера.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Поля из API; currentRealtor (мок) — фолбэк, если профиль не загрузился.
  const name = profile?.fullName || currentRealtor?.name || '—';
  const role = profile?.position || currentRealtor?.role || '—';
  const cryptoWallet = profile?.walletAddress || currentRealtor?.cryptoWallet || '—';
  const companyName = profile?.companyName || currentRealtor?.companyName || '—';
  const companyAddress = profile?.officeAddress || currentRealtor?.companyAddress || '—';
  const companyReg = profile?.companyRegistrationNumber || currentRealtor?.companyReg || '—';

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header */}
      <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-xs text-left">
        <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
          Личный профиль риелтора
        </span>
        <h1 className="text-2xl font-serif font-semibold text-gray-900">
          Профиль & Компания
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Просмотр зарегистрированных контактных реквизитов, сведений о вашей компании и верифицированного адреса криптокошелька.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">

        {loadError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-sm">
            {loadError}
          </div>
        )}

        {/* Personal and Agency Profile (View Only) */}
        <div className="bg-white border border-gray-100 p-6 space-y-6 text-left rounded-sm">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-semibold text-gray-900">Учетные данные партнера</h3>
              <p className="text-[10px] text-gray-400">
                {loading ? 'Загрузка профиля из ATRIA API...' : 'Верифицированная информация, отображаемая в смарт-контрактах'}
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded">
              ● Верифицирован
            </span>
          </div>

          {/* Personal fields */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#A38D6D] font-mono">1. Личные данные брокера</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">ФИО Риелтора</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type="text" readOnly
                    value={name}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-gray-200 text-gray-700 rounded focus:outline-none cursor-default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Должность в компании</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type="text" readOnly
                    value={role}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-gray-200 text-gray-700 rounded focus:outline-none cursor-default"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Адрес криптокошелька для выплаты комиссии (USDT / ERC-20)</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A38D6D]" size={13} />
                  <input
                    type="text" readOnly
                    value={cryptoWallet}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-[#A38D6D]/20 text-gray-700 rounded focus:outline-none cursor-default font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Agency fields */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#A38D6D] font-mono">2. Сведения об агентстве недвижимости</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Наименование юридического лица</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type="text" readOnly
                    value={companyName}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-gray-200 text-gray-700 rounded focus:outline-none cursor-default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Регистрационный номер компании</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type="text" readOnly
                    value={companyReg}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-gray-200 text-gray-700 rounded focus:outline-none cursor-default font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Юридический адрес офиса</label>
                <input
                  type="text" readOnly
                  value={companyAddress}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-gray-200 text-gray-700 rounded focus:outline-none cursor-default"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
