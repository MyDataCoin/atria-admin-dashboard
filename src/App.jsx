import React, { useState, useEffect } from 'react';
import api from './api';
import { mapPropertyFromApi, mapInvestorFromApi } from './api/mappers';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import PropertiesList from './components/PropertiesList';
import OfferingsManager from './components/OfferingsManager';
import PayoutsAndInvestors from './components/PayoutsAndInvestors';
import UsersAndKyc from './components/UsersAndKyc';
import ExchangeIntegrations from './components/ExchangeIntegrations';
import ActivitiesTimeline from './components/ActivitiesTimeline';
import SupportTickets from './components/SupportTickets';

// Load default mock datasets
import { 
  INITIAL_ADMINS,
  INITIAL_STATS, 
  INITIAL_PROPERTIES, 
  INITIAL_PLACEMENTS,
  INITIAL_INVESTORS,
  INITIAL_PAYOUTS,
  INITIAL_DOCUMENTS,
  INITIAL_NEWS_PUBLICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INTEGRATIONS,
  INITIAL_TICKETS
} from './data';

import { Shield, Key, Eye, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(INITIAL_ADMINS[0]); // default logged in
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currency, setCurrency] = useState('KGS');

  // Authorization Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Fully reactive state for global portfolio stats & ledgers
  const [admins, setAdmins] = useState(INITIAL_ADMINS);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState('');
  const [placements, setPlacements] = useState(INITIAL_PLACEMENTS);
  const [investors, setInvestors] = useState(INITIAL_INVESTORS);
  const [investorsLoading, setInvestorsLoading] = useState(false);
  const [investorsError, setInvestorsError] = useState('');
  const [payouts, setPayouts] = useState(INITIAL_PAYOUTS);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [publications, setPublications] = useState(INITIAL_NEWS_PUBLICATIONS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);

  // Load the real property catalogue from the backend (public GET, no auth).
  // On failure we keep the demo data so the dashboard never renders empty.
  useEffect(() => {
    let cancelled = false;
    setPropertiesLoading(true);
    api.properties
      .list()
      .then((list) => {
        if (cancelled) return;
        setProperties(Array.isArray(list) ? list.map(mapPropertyFromApi) : []);
        setPropertiesError('');
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep INITIAL_PROPERTIES as a fallback; surface the reason in a banner.
        setPropertiesError(err?.message || 'Не удалось загрузить объекты с сервера');
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the investor registry (user ⋈ kyc_profiles) from the backend admin endpoint.
  // The endpoint may not exist yet / needs an Admin JWT — on any failure we keep the
  // demo investors and show the reason in a banner.
  useEffect(() => {
    let cancelled = false;
    setInvestorsLoading(true);
    api.admin
      .listInvestors()
      .then((list) => {
        if (cancelled) return;
        // Show real users only — exclude the admin/service accounts that have no KYC
        // profile (status is null/0 for them).
        const rows = Array.isArray(list) ? list.filter((u) => u.status != null) : [];
        setInvestors(rows.map(mapInvestorFromApi));
        setInvestorsError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setInvestorsError(err?.message || 'Реестр инвесторов недоступен');
      })
      .finally(() => {
        if (!cancelled) setInvestorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Helper function to append a live log to the immutable audit logs
  const handleAddAuditLog = (action, details, level = 'SUCCESS') => {
    const newLog = {
      id: `audit-live-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      adminName: currentUser ? currentUser.name : 'Система комплаенса',
      action: action,
      details: details,
      status: level,
      ipAddress: '194.230.14.82' // standard Zug proxy IP
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Login handler
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const matched = admins.find(
      (a) => a.username.toLowerCase() === loginUser.toLowerCase() && a.password === loginPass
    );
    if (matched) {
      setCurrentUser(matched);
      setLoginError('');
      // Log successful sign-in
      const newLog = {
        id: `audit-login-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        adminName: matched.name,
        action: 'Administrator Auth',
        details: `Успешный вход в систему администратора. Сессия открыта.`,
        status: 'SUCCESS',
        ipAddress: '194.230.14.82'
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    } else {
      setLoginError('Неверный логин или пароль. Пожалуйста, выберите пресет ниже.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    handleAddAuditLog('Administrator Signout', 'Администратор завершил сессию и вышел из системы.');
    setCurrentUser(null);
    setLoginUser('');
    setLoginPass('');
    setCurrentSection('dashboard');
  };

  // Section Routing rendering function
  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <Overview 
            stats={{
              ...stats,
              totalObjects: properties.length,
              activePlacements: placements.filter(p => p.status === 'active').length,
              totalInvestors: investors.length,
              totalInvestedVolume: placements.reduce((sum, p) => sum + p.raisedAmount, 0),
              payoutsDistributed: payouts.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)
            }}
            properties={properties}
            placements={placements}
            payouts={payouts}
            currency={currency}
            onNavigate={setCurrentSection}
            onAddLog={handleAddAuditLog}
          />
        );
      case 'properties':
        return (
          <div className="space-y-4">
            {propertiesLoading && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
                Загрузка объектов из API…
              </div>
            )}
            {!propertiesLoading && propertiesError && (
              <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠ API недоступен — показаны демо-данные. {propertiesError}
              </div>
            )}
            {!propertiesLoading && !propertiesError && (
              <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                ✓ Объекты загружены с бэкенда: {properties.length}
              </div>
            )}
            <PropertiesList
              properties={properties}
              setProperties={setProperties}
              documents={documents}
              setDocuments={setDocuments}
              publications={publications}
              setPublications={setPublications}
              investors={investors}
              currency={currency}
              onAddLog={handleAddAuditLog}
            />
          </div>
        );
      case 'offerings':
        return (
          <OfferingsManager 
            placements={placements}
            setPlacements={setPlacements}
            properties={properties}
            currency={currency}
            onAddLog={handleAddAuditLog}
          />
        );
      case 'investors':
        return (
          <PayoutsAndInvestors 
            payouts={payouts}
            setPayouts={setPayouts}
            properties={properties}
            investors={investors}
            currency={currency}
            onAddLog={handleAddAuditLog}
          />
        );
      case 'users':
        return (
          <div className="space-y-4">
            {investorsLoading && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
                Загрузка реестра инвесторов из API…
              </div>
            )}
            {!investorsLoading && investorsError && (
              <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠ Реестр инвесторов недоступен — показаны демо-данные. {investorsError}
              </div>
            )}
            {!investorsLoading && !investorsError && (
              <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                ✓ Реестр инвесторов загружен с бэкенда: {investors.length}
              </div>
            )}
            <UsersAndKyc
              investors={investors}
              setInvestors={setInvestors}
              onAddLog={handleAddAuditLog}
            />
          </div>
        );
      case 'analytics':
        return (
          <ExchangeIntegrations 
            integrations={integrations}
            setIntegrations={setIntegrations}
            onAddLog={handleAddAuditLog}
          />
        );
      case 'support':
        return (
          <SupportTickets 
            tickets={tickets}
            setTickets={setTickets}
            investors={investors}
            onAddLog={handleAddAuditLog}
          />
        );
      case 'audit_log':
        return (
          <ActivitiesTimeline 
            activities={auditLogs}
            setActivities={setAuditLogs}
            admins={admins}
            setAdmins={setAdmins}
            onAddLog={handleAddAuditLog}
          />
        );
      default:
        return (
          <div className="py-20 text-center font-serif text-lg text-gray-500">
            Загрузка раздела. Пожалуйста, используйте боковую панель навигации.
          </div>
        );
    }
  };

  // Render Login UI if not authorized
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4 paper-grain relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-[#111111] to-[#0a0a0a]" />
        
        <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-sm max-w-md w-full relative z-10 shadow-2xl text-left space-y-6">
          
          {/* Header branding logo */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm">
              <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" stroke="#A38D6D" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 24 44 L 50 18 L 76 44" strokeWidth="4.5" />
                <path d="M 50 18 L 50 82" strokeWidth="4" />
                <path d="M 36 82 L 36 50 A 14 14 0 0 1 64 50 L 64 82" strokeWidth="4" />
                <line x1="20" y1="82" x2="80" y2="82" strokeWidth="4.5" />
              </svg>
            </div>
            
            <h1 className="font-serif text-2xl tracking-[0.25em] text-white uppercase font-bold mt-3">
              ATRIA RWA
            </h1>
            <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold font-mono block">
              ПАНЕЛЬ ЭМИТЕНТА ATRIA RWA
            </span>
          </div>

          {loginError && (
            <div className="bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[10px] p-3 rounded font-mono font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400 font-mono">
                Имя пользователя (Логин)
              </label>
              <input
                type="text"
                required
                placeholder="например: admin"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400 font-mono">
                Пароль администратора
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#A38D6D] hover:bg-[#8e7b5e] text-white rounded font-mono text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer shadow-md"
            >
              Авторизоваться
            </button>
          </form>

          {/* Preset quick logins */}
          <div className="border-t border-white/10 pt-4 space-y-2.5">
            <span className="block text-[8px] text-center uppercase tracking-wider text-gray-500 font-bold font-mono">
              Быстрый вход для сотрудников:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {admins.map((adm) => (
                <button
                  key={adm.id}
                  onClick={() => {
                    setLoginUser(adm.username);
                    setLoginPass(adm.password);
                  }}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] text-gray-300 hover:text-white py-2 rounded transition-colors font-mono cursor-pointer"
                >
                  {adm.username.toUpperCase()}
                  <span className="block text-[7px] text-[#A38D6D] mt-0.5">{adm.avatar}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[8px] text-center text-gray-600 font-mono">
            Вход зашифрован SSL SHA-256. Регистрация в реестре RWA.
          </p>

        </div>
      </div>
    );
  }

  // Render Authorized State workspace
  return (
    <div className="min-h-screen bg-[#FDFDFB] flex font-sans text-gray-800 paper-grain relative select-none">
      
      {/* Sidebar Navigation Drawer */}
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={setCurrentSection} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        adminUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main viewport Container */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 transition-all duration-300">
        
        {/* Editorial Top header bar */}
        <Header 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          adminUser={currentUser}
          activePlacementsCount={placements.filter(p => p.status === 'active').length}
          currency={currency}
          onCurrencyChange={setCurrency}
          sysLogsCount={auditLogs.length}
        />

        {/* Dynamic content scroll workspace */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-10 overflow-y-auto">
          {renderContent()}

          {/* Persistent global regulator reassurance footer */}
          <footer className="pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-[10px] font-mono text-left">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#A38D6D]" />
              <span>Депозитарный реестр RWA активов и обеспечений • ATRIA v4.5</span>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
