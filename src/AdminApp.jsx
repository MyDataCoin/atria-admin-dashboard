import React, { useState, useEffect } from 'react';
import api, { tokenStore } from './api';
import {
  mapPropertyFromApi,
  mapInvestorFromApi,
  mapInvestorHoldingFromApi,
  mapRealtorStatFromApi,
  mapPlacementFromProperty,
  mapTicketFromApi,
  mapPublicationFromApi,
  mapAuditLogFromApi,
  isAdminAuditEntry,
} from './api/mappers';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import PropertiesList from './components/PropertiesList';
import PayoutsAndInvestors from './components/PayoutsAndInvestors';
import UsersAndKyc from './components/UsersAndKyc';
import NewsAndReports from './components/NewsAndReports';
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
  INITIAL_TICKETS
} from './data';

import { Shield } from 'lucide-react';

// Admin workspace. Authentication (login form, session, role routing) lives in the
// root App shell; this component is only mounted once an admin is authenticated and
// receives the current user + a logout callback as props.
export default function AdminApp({ currentUser, onLogout }) {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currency, setCurrency] = useState('KGS');

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
  const [realtors, setRealtors] = useState([]);
  const [realtorsLoading, setRealtorsLoading] = useState(false);
  const [realtorsError, setRealtorsError] = useState('');
  const [payouts, setPayouts] = useState(INITIAL_PAYOUTS);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [publications, setPublications] = useState(INITIAL_NEWS_PUBLICATIONS);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [publicationsError, setPublicationsError] = useState('');
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');

  // Load the real property catalogue from the backend (public GET, no auth).
  // On failure we keep the demo data so the dashboard never renders empty.
  const loadProperties = React.useCallback(() => {
    setPropertiesLoading(true);
    return api.properties
      .list()
      .then((list) => {
        const mapped = Array.isArray(list) ? list.map(mapPropertyFromApi) : [];
        setProperties(mapped);
        // Offerings/placements are derived from the same properties (no separate API entity).
        setPlacements(mapped.map(mapPlacementFromProperty));
        setPropertiesError('');
      })
      .catch((err) => {
        setPropertiesError(err?.message || 'Не удалось загрузить объекты с сервера');
      })
      .finally(() => setPropertiesLoading(false));
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Load the investor registry (user ⋈ kyc_profiles). Needs an Admin JWT — on any
  // failure we keep the demo investors and show the reason in a banner. The registry
  // list carries no holdings, so each investor's portfolio is fetched in parallel and
  // attached — that drives the "total shares" column and seeds the detail card.
  const loadInvestors = React.useCallback(() => {
    setInvestorsLoading(true);
    return api.admin
      .listInvestors()
      .then(async (list) => {
        const rows = Array.isArray(list) ? list.filter((u) => u.status != null) : [];
        const mapped = rows.map(mapInvestorFromApi);
        const withHoldings = await Promise.all(
          mapped.map(async (inv) => {
            try {
              const res = await api.admin.investorPortfolio(inv.id);
              const items = Array.isArray(res) ? res : res?.items || [];
              const holdings = items
                .map(mapInvestorHoldingFromApi)
                .filter((h) => !h.status || String(h.status).toLowerCase() === 'active');
              return { ...inv, holdings };
            } catch {
              // Portfolio endpoint unavailable for this row — leave holdings empty.
              return { ...inv, holdings: [] };
            }
          })
        );
        setInvestors(withHoldings);
        setInvestorsError('');
      })
      .catch((err) => {
        setInvestorsError(err?.message || 'Реестр инвесторов недоступен');
      })
      .finally(() => setInvestorsLoading(false));
  }, []);

  useEffect(() => {
    loadInvestors();
  }, [loadInvestors]);

  // Load the realtor leaderboard for the dashboard. Needs an Admin JWT and a backend
  // endpoint that doesn't exist yet (the /deals & /realtor routes are Realtor-only) —
  // on any failure the dashboard block shows the reason instead of fake numbers.
  const loadRealtors = React.useCallback(() => {
    setRealtorsLoading(true);
    return api.admin
      .realtorStats()
      .then((list) => {
        const rows = Array.isArray(list) ? list : list?.items || [];
        setRealtors(rows.map(mapRealtorStatFromApi));
        setRealtorsError('');
      })
      .catch((err) => {
        setRealtors([]);
        setRealtorsError(err?.message || 'Статистика риелторов пока недоступна на бэкенде');
      })
      .finally(() => setRealtorsLoading(false));
  }, []);

  useEffect(() => {
    if (tokenStore.isAuthenticated) loadRealtors();
  }, [loadRealtors]);

  // Load the support-ticket desk (Admin sees all tickets). Needs an Admin JWT — on any
  // failure we keep the demo tickets and surface the reason in a banner. The list route
  // omits message threads; SupportTickets fetches each ticket's thread on demand.
  const loadTickets = React.useCallback(() => {
    setTicketsLoading(true);
    return api.support
      .listTickets()
      .then((list) => {
        const mapped = Array.isArray(list) ? list.map(mapTicketFromApi) : [];
        setTickets(mapped);
        setTicketsError('');
      })
      .catch((err) => {
        setTicketsError(err?.message || 'Тикет-деск недоступен');
      })
      .finally(() => setTicketsLoading(false));
  }, []);

  useEffect(() => {
    if (tokenStore.isAuthenticated) loadTickets();
  }, [loadTickets]);

  // Load the publication feed (financial reports & news). Same route the investor app
  // reads — role-scoped server-side, so the admin token also surfaces drafts. On failure
  // we keep the demo publications so the section never renders empty.
  const loadPublications = React.useCallback(() => {
    setPublicationsLoading(true);
    // Paged route (default pageSize 20); take the max page so the feed isn't silently
    // truncated. Real pagination can come later if the archive outgrows one page.
    return api.publications
      .list({ pageSize: 100 })
      .then((list) => {
        const rows = Array.isArray(list) ? list : list?.items || [];
        setPublications(rows.map(mapPublicationFromApi));
        setPublicationsError('');
      })
      .catch((err) => {
        setPublicationsError(err?.message || 'Лента публикаций недоступна');
      })
      .finally(() => setPublicationsLoading(false));
  }, []);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  // Load the audit trail. Entries are written server-side inside the commands they
  // describe (property created/updated/published/announced, publication posted, ticket
  // opened/closed) — the dashboard never appends to it. Needs an Admin JWT; on failure
  // we keep the demo entries and surface the reason in a banner.
  const loadAuditLogs = React.useCallback(() => {
    setAuditLoading(true);
    return api.audit
      .query({ pageSize: 200 })
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.items || [];
        // Admin-panel actions only: object lifecycle, ticket traffic, publications.
        // Investor-side events (deals, investments, payments, KYC) are not shown here.
        setAuditLogs(rows.filter(isAdminAuditEntry).map(mapAuditLogFromApi));
        setAuditError('');
      })
      .catch((err) => {
        setAuditError(err?.message || 'Журнал аудита недоступен');
      })
      .finally(() => setAuditLoading(false));
  }, []);

  useEffect(() => {
    if (tokenStore.isAuthenticated) loadAuditLogs();
  }, [loadAuditLogs]);

  // Called by sections after a successful action. The backend records the real audit
  // entry itself, so this just re-reads the trail instead of fabricating a client-side
  // row. Actions the backend does not log (e.g. sign-out) pass local: true to keep a
  // session-only row visible; those are clearly marked as not being server records.
  const handleAddAuditLog = (action, details, level = 'SUCCESS', { local = false } = {}) => {
    if (!local && tokenStore.isAuthenticated) {
      loadAuditLogs();
      return;
    }
    setAuditLogs((prev) => [
      {
        id: `audit-local-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        adminName: currentUser ? currentUser.name : 'Система',
        action,
        details,
        status: level,
        _source: 'local',
      },
      ...prev,
    ]);
  };

  // Logout handler — records a local audit row, then hands off to the root shell,
  // which clears the session tokens and returns to the login form.
  const handleLogout = () => {
    // Not a server-recorded event, and the token is about to be cleared — keep it local.
    handleAddAuditLog(
      'Administrator Signout',
      'Администратор завершил сессию и вышел из системы.',
      'SUCCESS',
      { local: true }
    );
    setCurrentSection('dashboard');
    onLogout();
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
              // Real invested volume = sum of every investor's active holdings, in the
              // holdings' own currency (no FX conversion — the amounts are already in
              // that currency). Deriving it from placements overstated it, because the
              // backend's availableTokens don't track actual purchases.
              totalInvestedVolume: investors.reduce(
                (sum, inv) => sum + (inv.holdings || []).reduce((s, h) => s + (h.amount || 0), 0),
                0
              ),
              investedCurrency:
                investors.flatMap((inv) => inv.holdings || [])[0]?.currency || currency,
              payoutsDistributed: payouts.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)
            }}
            properties={properties}
            placements={placements}
            payouts={payouts}
            realtors={realtors}
            realtorsLoading={realtorsLoading}
            realtorsError={realtorsError}
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
            <PropertiesList
              properties={properties}
              setProperties={setProperties}
              onRefreshProperties={loadProperties}
              documents={documents}
              setDocuments={setDocuments}
              investors={investors}
              currency={currency}
              onAddLog={handleAddAuditLog}
            />
          </div>
        );
      case 'news':
        return (
          <NewsAndReports
            publications={publications}
            setPublications={setPublications}
            properties={properties}
            loading={publicationsLoading}
            error={publicationsError}
            onRefresh={loadPublications}
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
            <UsersAndKyc
              investors={investors}
              setInvestors={setInvestors}
              onAddLog={handleAddAuditLog}
            />
          </div>
        );
      case 'support':
        return (
          <div className="space-y-4">
            {ticketsLoading && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-[#A38D6D] animate-pulse" />
                Загрузка тикетов из API…
              </div>
            )}
            {!ticketsLoading && ticketsError && (
              <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠ Тикет-деск недоступен — показаны демо-данные. {ticketsError}
              </div>
            )}
            {!ticketsLoading && !ticketsError && (
              <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                ✓ Тикеты загружены с бэкенда: {tickets.length}
              </div>
            )}
            <SupportTickets
              tickets={tickets}
              setTickets={setTickets}
              investors={investors}
              onRefreshTickets={loadTickets}
              onAddLog={handleAddAuditLog}
            />
          </div>
        );
      case 'audit_log':
        return (
          <ActivitiesTimeline
            activities={auditLogs}
            admins={admins}
            setAdmins={setAdmins}
            loading={auditLoading}
            error={auditError}
            onRefresh={loadAuditLogs}
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
