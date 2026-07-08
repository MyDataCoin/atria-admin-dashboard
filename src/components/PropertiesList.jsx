import React, { useState } from 'react';
import { 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Archive, 
  CheckCircle, 
  FileCheck, 
  Trash2, 
  Upload, 
  ExternalLink,
  BookOpen,
  Eye,
  TrendingUp,
  Award,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Formats an amount already expressed in its own currency (no USD conversion),
// unlike utils.formatVal which converts from USD. Backend token prices are native.
function formatMoney(amount, currencyCode = 'USD') {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const n = Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (currencyCode === 'USD') return `$${n}`;
  if (currencyCode === 'EUR') return `€${n}`;
  if (currencyCode === 'KGS') return `${n} с`;
  return `${n} ${currencyCode}`;
}

export default function PropertiesList({
  properties, 
  setProperties,
  documents,
  setDocuments,
  publications,
  setPublications,
  investors,
  currency = 'USD',
  onAddLog
}) {
  const [selectedProp, setSelectedProp] = useState(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('info'); // info, docs, collateral, news, holders
  const [statusFilter, setStatusFilter] = useState('all');

  const selectedPropImages = selectedProp ? (selectedProp.images && selectedProp.images.length > 0 ? selectedProp.images : [selectedProp.image].filter(Boolean)) : [];
  
  // Create / Edit modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // create, edit
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    city: '',
    country: '',
    type: 'Историческая вилла',
    image: '',
    currentValuation: 2000000,
    monthlyYield: 12000,
    roi: 7.5,
    status: 'draft',
    tokenSymbol: 'ATR-',
    tokenPrice: 50,
    completionYear: 2020,
    registrationStatus: 'Pending Review',
    registrationNumber: 'CH-REG-PENDING',
    whitePaperFile: 'WhitePaper_Draft.pdf',
    appraisalValue: 2000000,
    pledgeStatus: 'Pending Appraisal',
    pledgeTrustee: 'Helvetic Trust AG',
    collateralStatus: 'Under review',
    blockchainNetwork: 'Ethereum (ERC-20/RWA)'
  });

  // News publication form inside selected property panel
  const [pubTitle, setPubTitle] = useState('');
  const [pubType, setPubType] = useState('Financial Report');
  const [pubSummary, setPubSummary] = useState('');
  const [pubSuccess, setPubSuccess] = useState(false);

  // Document upload simulation
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('legal');
  const [docSuccess, setDocSuccess] = useState(false);

  // Documents attached directly inside the create/edit form modal
  const [formDocs, setFormDocs] = useState([]);
  const [formDocTitle, setFormDocTitle] = useState('');
  const [formDocCategory, setFormDocCategory] = useState('legal');

  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  // Attach real files chosen from the computer
  const handleFormDocFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const customTitle = formDocTitle.trim();
    const newDocs = files.map((file, idx) => ({
      id: `doc-add-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      // Use the typed name for the first file (if any), otherwise the real filename
      title: idx === 0 && customTitle ? customTitle : file.name,
      category: formDocCategory,
      propertyId: formData.id,
      propertyName: formData.name,
      dateStr: new Date().toISOString().split('T')[0],
      fileSize: formatFileSize(file.size),
      status: formDocCategory === 'collateral' ? 'Registered' : 'Audited'
    }));

    setFormDocs(prev => [...prev, ...newDocs]);
    setFormDocTitle('');
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleRemoveFormDoc = (docId) => {
    setFormDocs(formDocs.filter(d => d.id !== docId));
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({
      id: `prop-${Date.now()}`,
      name: '',
      city: '',
      country: '',
      address: '',
      developer: '',
      floors: 1,
      completionYear: 2022,
      description: '',
      // Тип объекта: коммерческая или жилая недвижимость
      type: 'Жилая недвижимость',
      images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'],
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
      status: 'draft'
      // Экономика (оценка, доход, цена токена, себестоимость) задаётся в Инвест-размещении
    });
    setFormDocs([]);
    setFormDocCategory('legal');
    setFormDocTitle('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (prop, e) => {
    e.stopPropagation();
    setFormMode('edit');
    setFormData({
      ...prop,
      images: prop.images || (prop.image ? [prop.image] : [])
    });
    // Preload existing documents so the modal is the single source of truth
    setFormDocs(documents.filter(d => d.propertyId === prop.id));
    setFormDocCategory('legal');
    setFormDocTitle('');
    setShowFormModal(true);
  };

  const handleArchiveProperty = (propId, e) => {
    e.stopPropagation();
    const updated = properties.map(p => {
      if (p.id === propId) {
        return { ...p, status: 'archived' };
      }
      return p;
    });
    setProperties(updated);
    
    const matched = properties.find(p => p.id === propId);
    onAddLog(
      'Property Archived',
      `Объект "${matched?.name}" переведен в архив. Смарт-контракты оферты деактивированы.`
    );
  };

  const handleUnarchiveProperty = (propId, e) => {
    e.stopPropagation();
    const updated = properties.map(p => {
      if (p.id === propId) {
        return { ...p, status: 'active' };
      }
      return p;
    });
    setProperties(updated);
    
    const matched = properties.find(p => p.id === propId);
    onAddLog(
      'Property Unarchived',
      `Объект "${matched?.name}" успешно восстановлен и извлечен из архива.`
    );
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.city) return;

    // Persist documents attached in the modal (keep name in sync with the property)
    const syncedDocs = formDocs.map(d => ({
      ...d,
      propertyId: formData.id,
      propertyName: formData.name
    }));
    const otherDocs = documents.filter(d => d.propertyId !== formData.id);
    setDocuments([...syncedDocs, ...otherDocs]);

    if (formMode === 'create') {
      setProperties([...properties, formData]);
      onAddLog(
        'Property Asset Created',
        `Создана новая запись актива недвижимости "${formData.name}" в городе ${formData.city}. Статус: ${formData.status.toUpperCase()}${
          syncedDocs.length ? `. Прикреплено документов: ${syncedDocs.length}` : ''
        }`
      );
    } else {
      const updated = properties.map(p => p.id === formData.id ? formData : p);
      setProperties(updated);
      onAddLog(
        'Property Asset Updated',
        `Обновлены кадастровые и токенизационные параметры актива "${formData.name}".`
      );
    }
    
    // Update selected property view if editing currently open one
    if (selectedProp && selectedProp.id === formData.id) {
      setSelectedProp(formData);
      setActiveImgIndex(0);
    }

    setShowFormModal(false);
  };

  // Add Document simulation
  const handleAddDocument = (e) => {
    e.preventDefault();
    if (!docTitle) return;

    const newDoc = {
      id: `doc-add-${Date.now()}`,
      title: docTitle,
      category: docCategory,
      propertyName: selectedProp.name,
      propertyId: selectedProp.id,
      dateStr: new Date().toISOString().split('T')[0],
      fileSize: `${(1.5 + Math.random() * 8).toFixed(1)} MB`,
      status: docCategory === 'collateral' ? 'Registered' : 'Audited'
    };

    setDocuments([newDoc, ...documents]);
    onAddLog(
      'Document Uploaded',
      `Загружен документ "${docTitle}" для объекта "${selectedProp.name}".`
    );

    setDocSuccess(true);
    setDocTitle('');
    setTimeout(() => setDocSuccess(false), 2000);
  };

  const handleDeleteDocument = (docId) => {
    setDocuments(documents.filter(d => d.id !== docId));
    onAddLog('Document Removed', 'Администратор удалил юридический файл из реестра объекта.');
  };

  // Publish report/news simulation
  const handlePublishNews = (e) => {
    e.preventDefault();
    if (!pubTitle || !pubSummary) return;

    const newPub = {
      id: `pub-add-${Date.now()}`,
      title: pubTitle,
      date: new Date().toISOString().split('T')[0],
      propertyId: selectedProp.id,
      propertyName: selectedProp.name,
      type: pubType,
      summary: pubSummary,
      status: 'Published'
    };

    setPublications([newPub, ...publications]);
    onAddLog(
      'News/Report Published',
      `Опубликован отчет "${pubTitle}" по активу "${selectedProp.name}".`
    );

    setPubSuccess(true);
    setPubTitle('');
    setPubSummary('');
    setTimeout(() => setPubSuccess(false), 2000);
  };

  const getFilteredProperties = () => {
    if (statusFilter === 'all') return properties;
    return properties.filter(p => p.status === statusFilter);
  };

  return (
    <div className="space-y-8 font-sans text-left">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Государственный кадастровый реестр
          </span>
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Управление Органами & Активами RWA
          </h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-[#A38D6D] hover:bg-[#8e7b5e] text-white px-4 py-2.5 rounded text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer"
        >
          <Plus size={12} />
          <span>Зарегистрировать объект</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-100">
        {[
          { id: 'all', label: 'Все объекты' },
          { id: 'active', label: 'В портфеле (Активные)' },
          { id: 'draft', label: 'Черновики' },
          { id: 'archived', label: 'Архивные' }
        ].map((tab) => {
          const count = tab.id === 'all' 
            ? properties.length 
            : properties.filter(p => p.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusFilter === tab.id 
                  ? 'bg-[#A38D6D] border-[#A38D6D] text-white font-bold' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 text-[8px] rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Real Estate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredProperties().map((prop) => {
          const propDocsCount = documents.filter(d => d.propertyId === prop.id).length;
          const propNewsCount = publications.filter(p => p.propertyId === prop.id).length;

          return (
            <div
              key={prop.id}
              onClick={() => { setSelectedProp(prop); setActiveSubTab('info'); setActiveImgIndex(0); }}
              className="bg-white border border-gray-100 hover:border-[#A38D6D] rounded-sm overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              {/* Image & Header */}
              <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                <img 
                  src={(prop.images && prop.images.length > 0) ? prop.images[0] : prop.image} 
                  alt={prop.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual state badge */}
                <span className={`absolute top-3 left-3 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded shadow-xs ${
                  prop.status === 'active' ? 'bg-emerald-600 text-white' :
                  prop.status === 'draft' ? 'bg-amber-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {prop.status === 'active' ? 'В портфеле' : prop.status === 'draft' ? 'Черновик' : 'Архив'}
                </span>

                {prop.type && (
                  <span className="absolute bottom-3 right-3 bg-[#111111]/80 backdrop-blur-xs text-white text-[8px] font-mono tracking-widest px-2.5 py-1 uppercase rounded">
                    {prop.type}
                  </span>
                )}
              </div>

              {/* Body Details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {(prop.city || prop.country) && (
                    <div className="flex items-center gap-1 text-[10px] text-[#A38D6D] font-bold font-mono uppercase tracking-wider">
                      <MapPin size={10} />
                      <span>{[prop.city, prop.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  <h3 className="text-sm font-serif font-bold text-gray-900 mt-1 leading-tight group-hover:text-[#A38D6D] transition-colors">
                    {prop.name}
                  </h3>

                  {(prop.type || prop.completionYear) && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      {[prop.type, prop.completionYear ? `Год: ${prop.completionYear}` : null].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>

                {/* Readouts: token economics for API/tokenized objects, else object info */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4 mt-4 text-[11px]">
                  {prop.tokenPrice != null ? (
                    <>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold block">Цена токена</span>
                        <span className="font-bold font-mono text-gray-800">{formatMoney(prop.tokenPrice, prop.currency)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold block">Доступно / Всего</span>
                        <span className="font-bold font-mono text-gray-800">
                          {(prop.availableTokens ?? 0).toLocaleString()} / {(prop.totalTokens ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold block">Застройщик</span>
                        <span className="font-bold text-gray-800 truncate block">{prop.developer || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold block">Этажность</span>
                        <span className="font-bold font-mono text-gray-800">{prop.floors ? `${prop.floors} эт.` : '—'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Admin metadata */}
                <div className="mt-4 pt-3 border-t border-dashed border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                  <span className="flex items-center gap-1">
                    <FileText size={12} className="text-[#A38D6D]" />
                    {propDocsCount} док. • {propNewsCount} отч.
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleOpenEdit(prop, e)}
                      className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-white hover:bg-[#A38D6D] border border-gray-200 hover:border-[#A38D6D] rounded transition-colors text-[10px] font-mono font-bold uppercase tracking-wider"
                      title="Редактировать параметры"
                    >
                      <Edit3 size={11} />
                      <span>Изменить</span>
                    </button>
                    {prop.status === 'archived' ? (
                      <button
                        onClick={(e) => handleUnarchiveProperty(prop.id, e)}
                        className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors flex items-center gap-1 text-[10px] font-mono font-bold"
                        title="Извлечь из архива"
                      >
                        <RefreshCw size={11} className="animate-none text-emerald-600" />
                        <span>Извлечь</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleArchiveProperty(prop.id, e)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Архивировать актив"
                      >
                        <Archive size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Property Detail Bottom/Side Modal Panel */}
      <AnimatePresence>
        {selectedProp && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-end z-50 p-0 sm:p-4">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white h-full sm:h-full sm:max-h-[96vh] w-full max-w-2xl sm:rounded-sm shadow-2xl flex flex-col justify-between overflow-hidden text-left border-l border-gray-200"
            >
              {/* Modal Header */}
              <div className="relative h-48 bg-gray-100 shrink-0">
                <img 
                  src={selectedPropImages[activeImgIndex] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'} 
                  alt={selectedProp.name}
                  className="w-full h-full object-cover transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                
                {selectedPropImages.length > 1 && (
                  <div className="absolute bottom-4 right-6 flex gap-1.5 z-10 bg-black/40 backdrop-blur-xs p-1.5 rounded-full">
                    {selectedPropImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImgIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                          activeImgIndex === idx ? 'bg-[#A38D6D] scale-125' : 'bg-white/60 hover:bg-white'
                        }`}
                        title={`Слайд ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setSelectedProp(null)}
                  className="absolute top-4 right-4 cursor-pointer bg-black/50 text-white hover:bg-black/80 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors"
                >
                  ✕
                </button>

                <div className="absolute bottom-4 left-6 text-white">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
                    Карточка объекта
                  </span>
                  <h3 className="text-xl font-serif font-bold leading-tight">
                    {selectedProp.name}
                  </h3>
                  <p className="text-[10px] text-gray-300 font-mono mt-0.5 uppercase tracking-wide">
                    {[selectedProp.city, selectedProp.country, selectedProp.type].filter(Boolean).join(' • ') || 'Токенизированный актив RWA'}
                  </p>
                </div>
              </div>

              {/* Navigation Sub-Tabs inside property detail */}
              <div className="flex border-b border-gray-150 bg-[#FBFBFA] shrink-0 font-semibold uppercase tracking-wider font-mono">
                {[
                  { id: 'info', label: 'Об объекте' },
                  { id: 'docs', label: 'Документы' },
                  { id: 'news', label: 'Финотчеты & Новости' },
                  { id: 'holders', label: 'Доли инвесторов' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex-1 py-3.5 text-center border-b-2 text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                      activeSubTab === tab.id
                        ? 'border-[#A38D6D] text-[#A38D6D] bg-white font-bold'
                        : 'border-transparent text-gray-400 hover:text-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-Tab content scrolls */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* TAB 1: OBJECT INFO (данные, заданные при создании) */}
                {activeSubTab === 'info' && (
                  <div className="space-y-7">
                    {selectedProp.description && (
                      <div>
                        <h4 className="text-sm font-serif font-bold text-gray-900 mb-2">Описание объекта</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{selectedProp.description}</p>
                      </div>
                    )}

                    {selectedProp.tokenPrice != null && (
                      <div>
                        <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Токенизация</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-[#FAF8F3]/60 border border-gray-100 rounded p-3">
                            <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Цена токена</span>
                            <span className="text-sm font-bold font-mono text-gray-900">{formatMoney(selectedProp.tokenPrice, selectedProp.currency)}</span>
                          </div>
                          <div className="bg-[#FAF8F3]/60 border border-gray-100 rounded p-3">
                            <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Доступно</span>
                            <span className="text-sm font-bold font-mono text-gray-900">{(selectedProp.availableTokens ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="bg-[#FAF8F3]/60 border border-gray-100 rounded p-3">
                            <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Всего токенов</span>
                            <span className="text-sm font-bold font-mono text-gray-900">{(selectedProp.totalTokens ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="bg-[#FAF8F3]/60 border border-gray-100 rounded p-3">
                            <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Валюта</span>
                            <span className="text-sm font-bold font-mono text-gray-900">{selectedProp.currency || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedProp.address || selectedProp.type || selectedProp.city ||
                      selectedProp.developer || selectedProp.floors || selectedProp.completionYear) && (
                      <div>
                        <h4 className="text-sm font-serif font-bold text-gray-900 mb-3">Характеристики объекта</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                          {selectedProp.address && (
                            <div className="sm:col-span-2 border-b border-gray-100 pb-2.5">
                              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Полный адрес</span>
                              <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                <MapPin size={14} className="text-[#A38D6D] shrink-0" /> {selectedProp.address}
                              </span>
                            </div>
                          )}

                          {selectedProp.type && (
                            <div className="border-b border-gray-100 pb-2.5">
                              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Тип недвижимости</span>
                              <span className="text-sm font-semibold text-gray-900">{selectedProp.type}</span>
                            </div>
                          )}

                          {(selectedProp.city || selectedProp.country) && (
                            <div className="border-b border-gray-100 pb-2.5">
                              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Город / Страна</span>
                              <span className="text-sm font-semibold text-gray-900">{[selectedProp.city, selectedProp.country].filter(Boolean).join(', ')}</span>
                            </div>
                          )}

                          {selectedProp.developer && (
                            <div className="border-b border-gray-100 pb-2.5">
                              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Застройщик</span>
                              <span className="text-sm font-semibold text-gray-900">{selectedProp.developer}</span>
                            </div>
                          )}

                          {selectedProp.floors && (
                            <div className="border-b border-gray-100 pb-2.5">
                              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Этажность</span>
                              <span className="text-sm font-semibold text-gray-900">{selectedProp.floors} эт.</span>
                            </div>
                          )}

                          {selectedProp.completionYear && (
                            <div className="border-b border-gray-100 pb-2.5">
                              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Год постройки</span>
                              <span className="text-sm font-semibold text-gray-900">{selectedProp.completionYear}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: LEGAL & FINANCIAL DOCUMENTS */}
                {activeSubTab === 'docs' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 font-mono">Документы объекта недвижимости</h4>
                      <div className="space-y-2">
                        {documents.filter(d => d.propertyId === selectedProp.id).map(doc => (
                          <div key={doc.id} className="flex justify-between items-center p-3 border border-gray-100 rounded hover:bg-[#FBFBFA] transition-all">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText size={16} className="text-[#A38D6D] shrink-0" />
                              <div className="truncate text-xs">
                                <span className="font-bold text-gray-900 block truncate">{doc.title}</span>
                                <span className="text-[9px] text-gray-400 font-mono">Категория: {doc.category.toUpperCase()} • Размер: {doc.fileSize}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <span className="text-[8px] font-mono uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                                {doc.status}
                              </span>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                title="Удалить"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {documents.filter(d => d.propertyId === selectedProp.id).length === 0 && (
                          <p className="text-xs text-gray-400 italic py-4">Документы еще не загружены для этого объекта.</p>
                        )}
                      </div>
                    </div>

                    {/* Simulation Upload document form */}
                    <div className="border-t border-gray-100 pt-5 text-xs">
                      <h5 className="font-serif font-bold text-gray-900 mb-2">Загрузить новый документ (PDF / DOC)</h5>
                      <form onSubmit={handleAddDocument} className="space-y-3">
                        {docSuccess && (
                          <p className="text-[10px] font-mono font-bold text-emerald-600">✓ Документ зафиксирован в реестре!</p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Название документа (например, Оценочный акт 2026)"
                            required
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            className="flex-1 p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                          />
                          <select
                            value={docCategory}
                            onChange={(e) => setDocCategory(e.target.value)}
                            className="p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                          >
                            <option value="legal">Юридический</option>
                            <option value="valuation">Оценка</option>
                            <option value="collateral">Залог</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#A38D6D] text-white py-2 px-4 rounded text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer"
                        >
                          <Upload size={12} />
                          <span>Загрузить в архив</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* TAB: PUBLISH NEWS & REPORT */}
                {activeSubTab === 'news' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 font-mono">История отчетов и новостей</h4>
                      <div className="space-y-3">
                        {publications.filter(p => p.propertyId === selectedProp.id).map(pub => (
                          <div key={pub.id} className="p-3.5 border border-gray-100 rounded text-xs bg-white space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-900 leading-tight block">{pub.title}</span>
                              <span className="text-[8px] font-mono uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-bold shrink-0 ml-2">
                                {pub.type}
                              </span>
                            </div>
                            <p className="text-gray-500 text-[11px] leading-relaxed pt-1">{pub.summary}</p>
                            <span className="text-[8px] text-gray-400 font-mono block pt-1.5 border-t border-gray-50">Дата публикации: {pub.date} • Статус: PUBLISHED</span>
                          </div>
                        ))}
                        {publications.filter(p => p.propertyId === selectedProp.id).length === 0 && (
                          <p className="text-xs text-gray-400 italic py-4">Новостей и отчетов по этому объекту еще нет.</p>
                        )}
                      </div>
                    </div>

                    {/* Publish News Form */}
                    <div className="border-t border-gray-100 pt-5 text-xs">
                      <h5 className="font-serif font-bold text-gray-900 mb-2">Создать новость или финансовый отчет</h5>
                      <form onSubmit={handlePublishNews} className="space-y-3">
                        {pubSuccess && (
                          <p className="text-[10px] font-mono font-bold text-emerald-600">✓ Отчет успешно опубликован для инвесторов!</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Тема публикации"
                            required
                            value={pubTitle}
                            onChange={(e) => setPubTitle(e.target.value)}
                            className="p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                          />
                          <select
                            value={pubType}
                            onChange={(e) => setPubType(e.target.value)}
                            className="p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                          >
                            <option value="Financial Report">Финансовый аудит</option>
                            <option value="News Release">Новость объекта</option>
                            <option value="Valuation Audit">Оценка стоимости</option>
                          </select>
                        </div>
                        <textarea
                          placeholder="Краткое содержание публикации..."
                          rows={3}
                          required
                          value={pubSummary}
                          onChange={(e) => setPubSummary(e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] resize-none"
                        />
                        <button
                          type="submit"
                          className="bg-[#111111] hover:bg-[#A38D6D] text-white text-[9px] py-2 px-4 rounded uppercase tracking-widest font-bold transition-all cursor-pointer"
                        >
                          Опубликовать новость
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* TAB 5: SHAREHOLDERS LIST */}
                {activeSubTab === 'holders' && (
                  <div className="space-y-6">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold font-mono">Распределение долей инвесторов</h4>
                    <div className="space-y-3 font-mono">
                      {investors.filter(inv => inv.holdings.some(h => h.propertyId === selectedProp.id)).map(inv => {
                        const holding = inv.holdings.find(h => h.propertyId === selectedProp.id);
                        const weight = selectedProp.currentValuation > 0 
                          ? ((holding.tokensOwned * selectedProp.tokenPrice) / selectedProp.currentValuation) * 100 
                          : 0;
                        return (
                          <div key={inv.id} className="flex justify-between items-center p-3 border border-gray-50 bg-[#FBFBFA] rounded text-xs">
                            <div className="text-left">
                              <span className="font-bold text-gray-900 block font-serif">{inv.name}</span>
                              <span className="text-[9px] text-gray-400 font-mono truncate max-w-[220px] block">{inv.walletAddress}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#A38D6D] block">{holding.tokensOwned.toLocaleString()} ATR-S</span>
                              <span className="text-[10px] text-gray-500 block">Доля: {weight.toFixed(2)}%</span>
                            </div>
                          </div>
                        );
                      })}
                      {investors.filter(inv => inv.holdings.some(h => h.propertyId === selectedProp.id)).length === 0 && (
                        <p className="text-xs text-gray-400 italic py-4">Инвесторы еще не приобрели доли в этом объекте.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Actions */}
              <div className="bg-gray-50 border-t border-gray-150 p-4 shrink-0 flex gap-3 text-xs">
                <button
                  onClick={() => setSelectedProp(null)}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold uppercase tracking-widest py-2.5 rounded transition-all text-center cursor-pointer"
                >
                  Закрыть карточку
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT PROPERTY FORM MODAL */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-2xl max-w-2xl w-full p-6 text-left relative rounded-sm my-8"
            >
              <div className="border-b border-gray-150 pb-3 mb-4">
                <span className="text-[8px] uppercase tracking-widest text-[#A38D6D] font-bold block">Кадастровый реестр</span>
                <h3 className="text-lg font-serif font-bold text-gray-900 mt-0.5">
                  {formMode === 'create' ? 'Зарегистрировать новый объект выпуска' : 'Редактировать параметры актива'}
                </h3>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
                
                {/* General Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Название объекта</label>
                    <input 
                      type="text" required placeholder="Например: Вилла Малибу"
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Тип недвижимости</label>
                    <select
                      required
                      value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                    >
                      <option value="Жилая недвижимость">Жилая недвижимость</option>
                      <option value="Коммерческая недвижимость">Коммерческая недвижимость</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Город</label>
                    <input 
                      type="text" required placeholder="Киото / Цуг"
                      value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Страна</label>
                    <input
                      type="text" required placeholder="Швейцария"
                      value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                    />
                  </div>
                </div>

                {/* Address, Developer, Floors, Description */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Полный адрес</label>
                    <input
                      type="text" placeholder="Например: Bahnhofstrasse 12, 6300 Zug, Switzerland"
                      value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Застройщик</label>
                      <input
                        type="text" placeholder="Например: Helvetia Development AG"
                        value={formData.developer || ''} onChange={(e) => setFormData({...formData, developer: e.target.value})}
                        className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Этажность</label>
                      <input
                        type="number" min="1" placeholder="Например: 5"
                        value={formData.floors ?? ''} onChange={(e) => setFormData({...formData, floors: Number(e.target.value)})}
                        className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Описание объекта</label>
                    <textarea
                      rows={3} placeholder="Краткое описание объекта, его особенности и инвестиционная привлекательность..."
                      value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white resize-none"
                    />
                  </div>
                </div>

                {/* Year & Status (экономика задаётся в Инвест-размещении) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Год постройки</label>
                    <input
                      type="number" min="1800" max="2100" placeholder="Например: 2020"
                      value={formData.completionYear ?? ''} onChange={(e) => setFormData({...formData, completionYear: Number(e.target.value)})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Статус объекта</label>
                    <select
                      value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full p-2.5 border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-[#A38D6D] bg-white font-semibold"
                    >
                      <option value="draft">Черновик (Draft)</option>
                      <option value="active">Активный в портфеле (Active)</option>
                      <option value="archived">Архивный / Погашен (Archived)</option>
                    </select>
                  </div>
                </div>

                <p className="text-[9px] text-gray-400 font-mono bg-[#FBFBFA] border border-gray-100 rounded p-2.5 leading-relaxed">
                  Оценочная стоимость, доходность, цена и себестоимость токена задаются при создании
                  <span className="font-bold text-gray-600"> Инвест-размещения</span> для этого объекта.
                </p>

                {/* Images Upload Area */}
                <div className="border-t border-gray-100 pt-4">
                  <span className="block text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider mb-2">
                    Изображения объекта (Максимум 3)
                  </span>
                  
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Render existing selected images */}
                    {formData.images && formData.images.map((img, idx) => (
                      <div key={idx} className="relative h-24 bg-gray-50 border border-gray-150 rounded-sm overflow-hidden group">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedImages = formData.images.filter((_, i) => i !== idx);
                            setFormData({
                              ...formData,
                              images: updatedImages,
                              image: updatedImages[0] || ''
                            });
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] uppercase font-bold tracking-wider transition-opacity cursor-pointer"
                        >
                          Удалить
                        </button>
                        <span className="absolute bottom-1 left-1 text-[8px] bg-[#111111]/80 text-white px-1.5 py-0.5 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                    
                    {/* If less than 3, show upload slots */}
                    {(!formData.images || formData.images.length < 3) && (
                      <label className="border border-dashed border-gray-300 hover:border-[#A38D6D] h-24 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-[#A38D6D] p-2 text-center bg-gray-50/50">
                        <Upload size={16} className="mb-1 text-gray-400" />
                        <span className="text-[8px] uppercase tracking-wider font-bold">Добавить</span>
                        <span className="text-[7px] text-gray-400 font-mono">Макс. 3</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple={3 - (formData.images ? formData.images.length : 0) > 1}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const limit = 3 - (formData.images ? formData.images.length : 0);
                            const allowedFiles = files.slice(0, limit);
                            
                            allowedFiles.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData(prev => {
                                  const updated = [...(prev.images || []), reader.result];
                                  return {
                                    ...prev,
                                    images: updated,
                                    image: updated[0] || ''
                                  };
                                });
                              };
                              reader.readAsDataURL(file);
                            });
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  
                  <p className="text-[8px] text-gray-400 font-mono">
                    Выберите JPG, PNG или WEBP. Изображения сохраняются локально.
                  </p>
                </div>

                {/* Documents attach area (available right at registration) — compact */}
                <div className="border-t border-gray-100 pt-4">
                  <span className="block text-[9px] uppercase font-bold text-[#A38D6D] tracking-wider mb-2">
                    Документы объекта
                  </span>

                  {/* List of attached documents */}
                  {formDocs.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {formDocs.map(doc => (
                        <div key={doc.id} className="flex justify-between items-center py-1.5 px-2 border border-gray-150 rounded bg-[#FBFBFA]">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={13} className="text-[#A38D6D] shrink-0" />
                            <span className="font-bold text-gray-900 truncate text-[11px]">{doc.title}</span>
                            <span className="text-[8px] text-gray-400 font-mono uppercase tracking-wider shrink-0">{doc.category} • {doc.fileSize}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormDoc(doc.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                            title="Удалить документ"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add document: name + category + upload, one compact row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Название документа (необязательно)"
                      value={formDocTitle}
                      onChange={(e) => setFormDocTitle(e.target.value)}
                      className="flex-1 p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                    />
                    <select
                      value={formDocCategory}
                      onChange={(e) => setFormDocCategory(e.target.value)}
                      className="p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D] sm:w-36 shrink-0"
                    >
                      <option value="legal">Юридический</option>
                      <option value="valuation">Оценка</option>
                      <option value="collateral">Залог</option>
                    </select>
                    <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 hover:border-[#A38D6D] rounded px-3 py-2 cursor-pointer transition-colors text-gray-500 hover:text-[#A38D6D] bg-white shrink-0">
                      <Upload size={13} />
                      <span className="text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">Загрузить файл</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        onChange={handleFormDocFiles}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold uppercase tracking-widest py-2.5 rounded transition-all text-center cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#111111] hover:bg-[#A38D6D] text-white font-bold uppercase tracking-widest py-2.5 rounded transition-all text-center cursor-pointer"
                  >
                    Зафиксировать в реестре
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
