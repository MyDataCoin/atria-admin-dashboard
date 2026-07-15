import React, { useEffect, useState } from 'react';
import Sidebar from './realtor/components/Sidebar';
import Header from './realtor/components/Header';
import Overview from './realtor/components/Overview';
import PropertiesList from './realtor/components/PropertiesList';
import PublishedList from './realtor/components/PublishedList';
import NotificationsView from './realtor/components/NotificationsView';
import ProfileView from './realtor/components/ProfileView';
import HelpDeskView from './realtor/components/HelpDeskView';
import DealsView from './realtor/components/DealsView';

// Load default mock datasets for Realtor Panel
import {
  INITIAL_REALTORS,
  INITIAL_PROPERTIES,
  REALTOR_ACTIONS
} from './realtor/data';

import { fetchProperties, fetchInvestorCount } from './realtor/api/properties';
import { fetchDeals, createDeal } from './realtor/api/deals';
import { fetchNotifications, markRead as markNotificationRead } from './realtor/api/notifications';
import { fetchRealtorProfile } from './realtor/api/realtor';

import { Shield } from 'lucide-react';

// Realtor workspace. Authentication (login form, session, role routing) lives in the
// root App shell; this component is only mounted once a realtor is authenticated and
// receives the current user + a logout callback as props.
//
// Профиль риелтора API на логине не отдаёт (только токены), поэтому карточку
// пользователя берём из мок-данных, а затем обогащаем реальным профилем
// (GET /realtor/me) в эффекте ниже.
export default function RealtorApp({ currentUser, onLogout }) {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fully reactive state for Realtor CRM Workspace
  // Каталог грузится с ATRIA API; мок-данные — только фолбэк, если API недоступен.
  const [properties, setProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState('');
  // База инвесторов для аналитики на главной (GET /deals/investor-count, Realtor-only).
  // null — ещё не загружено; Overview покажет плейсхолдер.
  const [investorCount, setInvestorCount] = useState(null);
  // Уведомления грузятся с ATRIA API (события сделок), см. useEffect ниже.
  const [notifications, setNotifications] = useState([]);
  const [realtorActions, setRealtorActions] = useState(REALTOR_ACTIONS);
  const [selectedPropId, setSelectedPropId] = useState(null);

  // Сделки риелтора приходят из ATRIA API (GET /deals/me), см. useEffect ниже.
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealsError, setDealsError] = useState('');

  // Active realtor details (binds personal and company edits). Seed from the mock
  // profile, then enrich from the real API profile once it loads.
  const [currentRealtor, setCurrentRealtor] = useState(currentUser || INITIAL_REALTORS[0]);

  // Загружаем каталог объектов из ATRIA API. Эндпоинт анонимный, поэтому вход не нужен.
  // Если API недоступен — показываем мок-данные, чтобы кабинет не оставался пустым.
  useEffect(() => {
    let cancelled = false;

    fetchProperties()
      .then((list) => {
        if (cancelled) return;
        setProperties(list);
        setPropertiesError('');
      })
      .catch(() => {
        if (cancelled) return;
        setProperties(INITIAL_PROPERTIES);
        setPropertiesError('Каталог загружен из демо-данных: сервер недоступен.');
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Инвесторы, сделки, уведомления и профиль — эндпоинты Realtor-only. Компонент
  // монтируется только после входа, поэтому грузим их один раз при монтировании.
  useEffect(() => {
    let cancelled = false;

    fetchInvestorCount()
      .then((count) => {
        if (!cancelled) setInvestorCount(count);
      })
      .catch(() => {
        // Не удалось — оставляем null, Overview покажет плейсхолдер вместо числа.
        if (!cancelled) setInvestorCount(null);
      });

    setDealsLoading(true);
    fetchDeals()
      .then((list) => {
        if (cancelled) return;
        setDeals(list);
        setDealsError('');
      })
      .catch(() => {
        if (!cancelled) setDealsError('Не удалось загрузить сделки.');
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });

    fetchNotifications()
      .then((list) => {
        if (!cancelled) setNotifications(list);
      })
      .catch(() => {
        // Не удалось — оставляем пустой список.
        if (!cancelled) setNotifications([]);
      });

    // Реальный профиль риелтора — обогащаем currentRealtor (имя в шапке и т.д.).
    fetchRealtorProfile()
      .then((p) => {
        if (cancelled || !p) return;
        setCurrentRealtor((prev) => ({
          ...prev,
          name: p.fullName || prev?.name,
          role: p.position || prev?.role,
          cryptoWallet: p.walletAddress || prev?.cryptoWallet,
          companyName: p.companyName || prev?.companyName,
          companyReg: p.companyRegistrationNumber || prev?.companyReg,
          companyAddress: p.officeAddress || prev?.companyAddress,
          profile: p
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Отметить уведомление прочитанным на сервере + локально.
  const handleMarkNotificationRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotificationRead(id).catch(() => {});
  };

  // Создание реферальной сделки через API — возвращает сделку сразу с реф-ссылкой.
  const handleCreateDeal = async (propertyId, commissionPercent) => {
    const deal = await createDeal(propertyId, commissionPercent);
    setDeals((prev) => [deal, ...prev]);
    return deal;
  };

  // Helper function to append action logs to the realtor actions log list
  const handleAddActionLog = (text, type = 'update') => {
    const newLog = {
      id: `act-live-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      text: text,
      type: type
    };
    setRealtorActions((prev) => [newLog, ...prev]);
  };

  // Helper function to add notification
  const handleAddNotification = (newNotif) => {
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Logout handler — records a local action log, then hands off to the root shell,
  // which clears the session tokens and returns to the login form.
  const handleLogout = () => {
    handleAddActionLog(
      `Пользователь ${currentRealtor ? currentRealtor.name : ''} завершил рабочую сессию и вышел.`,
      'auth'
    );
    setCurrentSection('dashboard');
    setSelectedPropId(null);
    onLogout();
  };

  // Section Routing rendering function
  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <Overview
            properties={properties}
            investorCount={investorCount}
            deals={deals}
            notifications={notifications}
            realtorActions={realtorActions}
            onNavigate={(section) => {
              setCurrentSection(section);
            }}
            onPropertySelect={(prop) => {
              setSelectedPropId(prop.id);
            }}
            setProperties={setProperties}
            onAddLog={handleAddActionLog}
            currentRealtor={currentRealtor}
            onAddNotification={handleAddNotification}
            selectedPropId={selectedPropId}
            setSelectedPropId={setSelectedPropId}
          />
        );
      case 'properties':
        return (
          <PropertiesList
            properties={properties}
            loading={propertiesLoading}
            loadError={propertiesError}
            deals={deals}
            setProperties={setProperties}
            onAddLog={handleAddActionLog}
            currentRealtor={currentRealtor}
            onAddNotification={handleAddNotification}
            selectedPropId={selectedPropId}
            setSelectedPropId={setSelectedPropId}
          />
        );
      case 'published':
        return (
          <PublishedList
            properties={properties}
            deals={deals}
            onInspectProperty={(prop) => {
              setSelectedPropId(prop.id);
              setCurrentSection('properties');
            }}
          />
        );
      case 'notifications':
        return (
          <NotificationsView
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
          />
        );
      case 'profile':
        return (
          <ProfileView
            currentRealtor={currentRealtor}
          />
        );
      case 'helpdesk':
        return (
          <HelpDeskView
            properties={properties}
            currentRealtor={currentRealtor}
            onAddLog={handleAddActionLog}
          />
        );
      case 'deals':
        return (
          <DealsView
            properties={properties}
            deals={deals}
            dealsLoading={dealsLoading}
            dealsError={dealsError}
            onCreateDeal={handleCreateDeal}
            onAddLog={handleAddActionLog}
            onAddNotification={handleAddNotification}
            currentRealtor={currentRealtor}
          />
        );
      default:
        return (
          <div className="py-20 text-center font-serif text-lg text-gray-500">
            Загрузка раздела... Пожалуйста, используйте боковую панель.
          </div>
        );
    }
  };

  // Render Authorized State workspace
  return (
    <div className="min-h-screen bg-[#FDFDFB] flex font-sans text-gray-800 paper-grain relative select-none">

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        currentSection={currentSection}
        onSectionChange={(section) => {
          setCurrentSection(section);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        adminUser={currentRealtor}
        onLogout={handleLogout}
      />

      {/* Main viewport Container */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 transition-all duration-300">

        {/* Editorial Top header bar */}
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          adminUser={currentRealtor}
          propertiesCount={properties.length}
          dealsCount={deals.length}
        />

        {/* Dynamic content scroll workspace */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-10 overflow-y-auto">
          {renderContent()}

          {/* Persistent global regulatory reassurance footer */}
          <footer className="pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-[10px] font-mono text-left">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#A38D6D]" />
              <span>CRM-платформа верификации и комплаенса недвижимости • ATRIA REAL ESTATE v5.0</span>
            </div>
            <span>© {new Date().getFullYear()} ATRIA Real Estate AG. Все права защищены.</span>
          </footer>
        </main>

      </div>
    </div>
  );
}