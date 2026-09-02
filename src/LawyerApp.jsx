import React, { useCallback, useEffect, useState } from 'react';
import { Building, CalendarRange, Activity, FileText } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ActivitiesTimeline from './components/ActivitiesTimeline';
import OperatingPeriodsPanel from './components/OperatingPeriodsPanel';
import PropertyDetailPanel from './components/PropertyDetailPanel';
import api from './api';
import { mapPropertyFromApi, mapAuditLogFromApi, isAdminAuditEntry } from './api/mappers';

// Рабочее место юриста управляющей компании (роль Auditor на бэкенде).
//
// Роль read-only по всей платформе — это и есть смысл: юристу нужно видеть объекты, документы,
// цифры и журнал действий, и ему нельзя ничего из этого менять. Поэтому здесь нет ни форм, ни
// кнопок действий: не потому что их спрятали, а потому что бэкенд их всё равно не пропустит.
//
// Отчётные периоды видны, но без «Внести» и «Подтвердить» — панель сама гасит действия, когда
// разрешение не выдано.
const MENU = [
  { id: 'properties', label: 'Объекты & Документы', icon: Building },
  { id: 'periods', label: 'Отчётные периоды', icon: CalendarRange },
  { id: 'audit', label: 'Журнал аудита', icon: Activity },
];

export default function LawyerApp({ currentUser, onLogout }) {
  const [currentSection, setCurrentSection] = useState('properties');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [properties, setProperties] = useState([]);
  const [propertiesError, setPropertiesError] = useState('');
  const [openProperty, setOpenProperty] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  const loadProperties = useCallback(
    () =>
      api.properties
        .list()
        .then((list) => {
          setProperties(Array.isArray(list) ? list.map(mapPropertyFromApi) : []);
          setPropertiesError('');
        })
        .catch((err) => setPropertiesError(err?.message || 'Не удалось загрузить объекты с сервера')),
    [],
  );

  const loadAuditLogs = useCallback(() => {
    setAuditLoading(true);
    return api.audit
      .query({ pageSize: 200 })
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.items || [];
        setAuditLogs(rows.filter(isAdminAuditEntry).map(mapAuditLogFromApi));
        setAuditError('');
      })
      .catch((err) => setAuditError(err?.message || 'Журнал аудита недоступен'))
      .finally(() => setAuditLoading(false));
  }, []);

  useEffect(() => {
    loadProperties();
    loadAuditLogs();
  }, [loadProperties, loadAuditLogs]);

  const renderSection = () => {
    switch (currentSection) {
      case 'periods':
        // currentUserId не передаём: подтверждать юрист всё равно не может (403 на бэкенде),
        // и панель показывает цифры как есть.
        return <OperatingPeriodsPanel properties={properties} readOnly />;
      case 'audit':
        return (
          <ActivitiesTimeline
            activities={auditLogs}
            admins={[]}
            setAdmins={() => {}}
            loading={auditLoading}
            error={auditError}
            onRefresh={loadAuditLogs}
          />
        );
      default:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-gray-900">Объекты и документы</h2>
              <p className="text-[11px] text-gray-500 mt-1">
                Просмотр. Изменения вносит администратор.
              </p>
            </div>

            {properties.length === 0 && !propertiesError && (
              <p className="py-16 text-center text-xs text-gray-400">Объектов пока нет</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setOpenProperty(p)}
                  className="text-left border border-gray-200 rounded-sm bg-white p-4 hover:border-[#A38D6D] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="text-[#A38D6D] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{p.address || '—'}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Документов: {p.documents?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
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
        title="Юридический"
      />

      <div className="lg:pl-64">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} adminUser={currentUser} />

        <main className="p-4 sm:p-6 lg:p-8">
          {propertiesError && (
            <div className="mb-4 border border-amber-200 bg-amber-50 text-amber-800 text-xs rounded-sm px-3.5 py-2.5">
              {propertiesError}
            </div>
          )}
          {renderSection()}
        </main>
      </div>

      {openProperty && (
        <PropertyDetailPanel
          property={openProperty}
          onClose={() => setOpenProperty(null)}
        />
      )}
    </div>
  );
}
