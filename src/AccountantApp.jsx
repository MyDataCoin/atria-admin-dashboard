import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, CalendarRange, Users2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OperatingPeriodsPanel from './components/OperatingPeriodsPanel';
import PayoutsAndInvestors from './components/PayoutsAndInvestors';
import HolderRegistry from './components/HolderRegistry';
import api from './api';
import { mapPropertyFromApi } from './api/mappers';

// Рабочее место бухгалтера управляющей компании (роль Finance на бэкенде).
//
// Разделов ровно три, и это не урезанная админка «на всякий случай»: бэкенд действительно пускает
// Finance только сюда. Показывать пункты, которые ответят 403, — худший вид интерфейса: человек
// видит раздел, жмёт и упирается в ошибку без объяснения.
//
// Что делает бухгалтер: вносит отчётные периоды (сколько объект заработал и потратил), готовит
// выплаты из подтверждённых периодов и сверяется с реестром держателей. Подтверждает периоды НЕ он —
// это делает второй человек, и бэкенд это требует.
const MENU = [
  { id: 'periods', label: 'Отчётные периоды', icon: CalendarRange },
  { id: 'payouts', label: 'Выплаты', icon: Wallet },
  { id: 'registry', label: 'Реестр держателей', icon: Users2 },
];

export default function AccountantApp({ currentUser, onLogout }) {
  const [currentSection, setCurrentSection] = useState('periods');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [propertiesError, setPropertiesError] = useState('');

  const loadProperties = useCallback(() => {
    return api.properties
      .list()
      .then((list) => {
        setProperties(Array.isArray(list) ? list.map(mapPropertyFromApi) : []);
        setPropertiesError('');
      })
      .catch((err) => setPropertiesError(err?.message || 'Не удалось загрузить объекты с сервера'));
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const renderSection = () => {
    switch (currentSection) {
      case 'payouts':
        return <PayoutsAndInvestors properties={properties} investors={[]} currency="KGS" />;
      case 'registry':
        return <HolderRegistry properties={properties} investors={[]} />;
      default:
        return (
          <OperatingPeriodsPanel properties={properties} currentUserId={currentUser?.id} />
        );
    }
  };

  // Оболочка один в один с AdminApp: сайдбар фиксированный шириной 72, поэтому отступ основной
  // колонки обязан совпадать. При lg:pl-64 контент уезжал под панель, а справа оставалась белая
  // полоса вместо фона страницы.
  return (
    <div className="min-h-screen bg-[#FDFDFB] flex font-sans text-gray-800 paper-grain relative select-none">
      <Sidebar
        currentSection={currentSection}
        onSectionChange={(id) => {
          setCurrentSection(id);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        adminUser={currentUser}
        onLogout={onLogout}
        items={MENU}
        title="Бухгалтерия"
      />

      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 transition-all duration-300">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} adminUser={currentUser} />

        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          {propertiesError && (
            <div className="mb-4 border border-amber-200 bg-amber-50 text-amber-800 text-xs rounded-sm px-3.5 py-2.5">
              {propertiesError}
            </div>
          )}
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
