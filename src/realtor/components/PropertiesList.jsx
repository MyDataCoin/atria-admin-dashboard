import React, { useState } from 'react';
import jsPDF from 'jspdf';
// html2canvas не умеет парсить современные CSS-цвета (oklch / color-mix), которые
// генерит Tailwind v4, и падает. html-to-image рендерит через SVG и их понимает.
import { toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { 
  Building, 
  Search, 
  Plus, 
  Filter, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Paperclip, 
  Upload, 
  X, 
  MessageSquare, 
  History,
  CheckSquare,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  Award,
  Printer,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PropertiesList({
  properties = [],
  loading = false,
  loadError = '',
  deals = [],
  setProperties,
  onAddLog,
  currentRealtor,
  onAddNotification,
  selectedPropId,
  setSelectedPropId
}) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Brochure states
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureProp, setBrochureProp] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Открыть предпросмотр брошюры объекта.
  const handleGenerateBrochure = (prop) => {
    setBrochureProp(prop);
    setShowBrochureModal(true);
  };

  // Собрать PDF из макета брошюры и скачать файл.
  // 1) DOM брошюры → картинка (html2canvas) → страницы A4 (jsPDF);
  // 2) приложенные PDF-документы объекта подклеиваем в конец (pdf-lib),
  //    чтобы всё уехало одним файлом.
  const handleDownloadPdf = async () => {
    const el = document.getElementById('atria-printable-brochure');
    if (!el || pdfGenerating) return;

    setPdfGenerating(true);

    // На время съёмки распускаем скроллящийся контейнер во всю высоту содержимого,
    // иначе html2canvas снимет только видимую часть и низ брошюры (документы) обрежется.
    const prev = {
      overflow: el.style.overflow,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
      flex: el.style.flex
    };
    el.style.overflow = 'visible';
    el.style.height = 'auto';
    el.style.maxHeight = 'none';
    el.style.flex = 'none';
    el.scrollTop = 0;

    try {
      // Ждём, пока догрузятся все фото — иначе они попадут в PDF пустыми.
      await Promise.all(
        Array.from(el.querySelectorAll('img')).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
        )
      );

      const shotW = el.scrollWidth;
      const shotH = el.scrollHeight;

      // Снимок всей брошюры (включая часть за пределами скролла).
      const imgData = await toJpeg(el, {
        quality: 0.92,
        backgroundColor: '#ffffff',
        pixelRatio: 2,           // резче текст/линии
        width: shotW,
        height: shotH,
        cacheBust: true
      });

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // Ширина картинки = ширина страницы; высота — пропорционально.
      const imgH = (shotH * pageW) / shotW;

      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH);
      heightLeft -= pageH;

      // Многостраничная разбивка: длинную брошюру режем по высоте A4.
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH);
        heightLeft -= pageH;
      }

      const safeName = (brochureProp?.name || 'brochure').replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40);
      const fileName = `ATRIA_${safeName}.pdf`;

      // Приложенные PDF-документы: докидываем их страницы в конец брошюры.
      const pdfDocs = (brochureProp?.documents || []).filter(
        (d) => d.url && (d.contentType === 'application/pdf' || /\.pdf$/i.test(d.fileName || ''))
      );

      if (pdfDocs.length === 0) {
        pdf.save(fileName);
      } else {
        const merged = await PDFDocument.load(pdf.output('arraybuffer'));

        for (const doc of pdfDocs) {
          try {
            const bytes = await fetch(doc.url).then((r) => {
              if (!r.ok) throw new Error('fetch failed');
              return r.arrayBuffer();
            });
            const attached = await PDFDocument.load(bytes);
            const pages = await merged.copyPages(attached, attached.getPageIndices());
            pages.forEach((pg) => merged.addPage(pg));
          } catch {
            // Документ не скачался/не читается — пропускаем, брошюру всё равно отдаём.
          }
        }

        const blob = new Blob([await merged.save()], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      onAddLog?.(`Сгенерирована PDF-брошюра объекта "${brochureProp?.name}"`, 'info');
      setPdfError('');
    } catch (err) {
      // Ошибку показываем — молчаливый провал не даёт понять, что пошло не так.
      console.error('Не удалось сгенерировать PDF:', err);
      setPdfError(err?.message || 'Не удалось сгенерировать PDF.');
    } finally {
      // Возвращаем контейнеру скролл.
      el.style.overflow = prev.overflow;
      el.style.height = prev.height;
      el.style.maxHeight = prev.maxHeight;
      el.style.flex = prev.flex;
      setPdfGenerating(false);
    }
  };

  // Create / Edit modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  
  // Property Form Fields state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    city: '',
    address: '',
    type: 'Жилая',
    price: '',
    area: '',
    yearBuilt: '',
    floorsCount: '',
    description: '',
    status: 'draft',
    images: [],
    documents: [],
    comments: [],
    history: []
  });

  // Reply message text state
  const [replyText, setReplyText] = useState('');

  // Active selected property object
  const selectedProp = properties.find(p => p.id === selectedPropId);
  const selectedPropImages = selectedProp ? (selectedProp.images && selectedProp.images.length > 0 ? selectedProp.images : []) : [];

  // Dynamic token calculations for active property details sidebar.
  // Real totals from the API when present, else the old price-derived estimate.
  const detailTotalTokens = selectedProp
    ? (selectedProp.totalTokens ?? Math.floor(selectedProp.price / 100))
    : 0;
  const detailApiSold =
    selectedProp && selectedProp.totalTokens != null && selectedProp.availableTokens != null
      ? selectedProp.totalTokens - selectedProp.availableTokens
      : null;
  let detailBaseSold = detailApiSold ?? 0;
  if (detailApiSold == null && selectedProp && (selectedProp.status === 'published' || selectedProp.status === 'approved' || selectedProp.status === 'review')) {
    const charSum = selectedProp.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePercent = 40 + (charSum % 45); // 40% to 85%
    detailBaseSold = Math.floor((detailTotalTokens * basePercent) / 100);
  }
  const detailDealSold = selectedProp ? (deals || []).filter(d => d.propertyId === selectedProp.id && d.status === 'success').reduce((sum, d) => sum + (d.tokensBought || 0), 0) : 0;
  const detailSoldTokens = selectedProp ? Math.min(detailBaseSold + detailDealSold, detailTotalTokens) : 0;
  const detailSoldPercent = detailTotalTokens > 0 ? (detailSoldTokens / detailTotalTokens) * 100 : 0;

  // Filter properties based on search
  const filteredProperties = properties.filter(prop => {
    return prop.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle open create form
  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({
      id: `prop-${Date.now()}`,
      name: '',
      city: '',
      address: '',
      type: 'Жилая',
      price: '',
      area: '',
      yearBuilt: '',
      floorsCount: '',
      description: '',
      status: 'draft',
      images: [],
      documents: [],
      comments: [],
      history: [
        { date: new Date().toISOString().replace('T', ' ').substring(0, 16), action: 'Создание черновика', user: currentRealtor?.name || 'Риелтор' }
      ]
    });
    setShowFormModal(true);
  };

  // Handle open edit form
  const handleOpenEdit = (prop, e) => {
    e.stopPropagation();
    // Only allow editing for draft or needs_improvement status
    if (prop.status !== 'draft' && prop.status !== 'needs_improvement') {
      alert('Внимание: Редактирование заблокировано, так как объект уже отправлен на проверку или утвержден.');
      return;
    }
    setFormMode('edit');
    setFormData({
      ...prop,
      images: prop.images || [],
      documents: prop.documents || [],
      yearBuilt: prop.yearBuilt || '',
      floorsCount: prop.floorsCount || ''
    });
    setShowFormModal(true);
  };

  // Handle image upload (unlimited)
  const handleImageUploadChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => {
          const updated = [...(prev.images || []), reader.result];
          return { ...prev, images: updated };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Delete image from form state
  const handleDeleteFormImage = (idxToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idxToRemove)
    }));
  };

  // Handle uploading documents from the form modal itself
  const handleFormDocUpload = (e, docCategory) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.name,
      type: docCategory,
      status: 'pending',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date().toISOString().substring(0, 10)
    };

    setFormData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), newDoc]
    }));
  };

  const handleFormDocDelete = (docId) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(d => d.id !== docId)
    }));
  };

  // Submit property form (Save as Draft or Submit for Review)
  const handleFormSubmit = (e, targetStatus = 'draft') => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.price || !formData.area || !formData.type || !formData.yearBuilt || !formData.floorsCount) {
      alert('Пожалуйста, заполните все обязательные поля (Название, Тип, Стоимость, Площадь, Город, Год постройки и Этажность).');
      return;
    }

    const finalStatus = targetStatus;
    const finalProp = {
      ...formData,
      price: Number(formData.price),
      area: Number(formData.area),
      yearBuilt: Number(formData.yearBuilt),
      floorsCount: Number(formData.floorsCount),
      status: finalStatus
    };

    // Update history based on action
    const currentTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    if (formMode === 'create') {
      if (finalStatus === 'review' || finalStatus === 'submitted') {
        finalProp.history.push({ date: currentTimestamp, action: 'Отправлено на проверку управляющей компании', user: currentRealtor?.name || 'Риелтор' });
        // Trigger notification simulation
        onAddNotification({
          id: `notif-auto-${Date.now()}`,
          propertyId: finalProp.id,
          propertyName: finalProp.name,
          title: 'Объект отправлен',
          message: `Ваш объект "${finalProp.name}" успешно отправлен на проверку управляющей компании.`,
          date: currentTimestamp,
          read: false,
          type: 'info'
        });
      }
      setProperties(prev => [finalProp, ...prev]);
      onAddLog('Property Created', `Создан объект "${finalProp.name}" со статусом [${finalStatus.toUpperCase()}].`);
    } else {
      // Edit mode
      if (finalStatus === 'review' || finalStatus === 'submitted') {
        finalProp.history.push({ date: currentTimestamp, action: 'Исправлено и отправлено на повторную проверку', user: currentRealtor?.name || 'Риелтор' });
        onAddNotification({
          id: `notif-auto-${Date.now()}`,
          propertyId: finalProp.id,
          propertyName: finalProp.name,
          title: 'Повторная отправка',
          message: `Объект "${finalProp.name}" обновлен и отправлен на повторное рассмотрение.`,
          date: currentTimestamp,
          read: false,
          type: 'info'
        });
      } else {
        finalProp.history.push({ date: currentTimestamp, action: 'Обновление черновика', user: currentRealtor?.name || 'Риелтор' });
      }
      setProperties(prev => prev.map(p => p.id === finalProp.id ? finalProp : p));
      onAddLog('Property Updated', `Обновлен объект "${finalProp.name}" со статусом [${finalStatus.toUpperCase()}].`);
    }

    // Update selected property viewport if currently inspecting
    if (selectedPropId === finalProp.id) {
      setSelectedPropId(finalProp.id);
      setActiveImgIndex(0);
    }

    setShowFormModal(false);
  };

  // Submit direct for review from detail card
  const handleSubmitFromDetail = (propId) => {
    const currentTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setProperties(prev => prev.map(p => {
      if (p.id === propId) {
        const updatedHistory = [...p.history, { date: currentTimestamp, action: 'Отправлено на проверку управляющей компании', user: currentRealtor?.name || 'Риелтор' }];
        return {
          ...p,
          status: 'review',
          history: updatedHistory
        };
      }
      return p;
    }));

    const targetProp = properties.find(p => p.id === propId);
    onAddNotification({
      id: `notif-auto-${Date.now()}`,
      propertyId: propId,
      propertyName: targetProp?.name || 'Объект',
      title: 'Объект отправлен',
      message: `Объект "${targetProp?.name}" отправлен на рассмотрение в комплаенс-отдел.`,
      date: currentTimestamp,
      read: false,
      type: 'info'
    });

    onAddLog('Property Submitted', `Объект "${targetProp?.name}" отправлен на проверку.`);
  };

  // Document Upload function
  const handleDocUpload = (e, docCategory) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.name,
      type: docCategory,
      status: 'pending', // pending, verified, rejected
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date().toISOString().substring(0, 10)
    };

    setProperties(prev => prev.map(p => {
      if (p.id === selectedPropId) {
        const updatedDocs = [...(p.documents || []), newDoc];
        const updatedHistory = [...p.history, { 
          date: new Date().toISOString().replace('T', ' ').substring(0, 16), 
          action: `Загружен новый документ (${getFileCategoryLabel(docCategory)}): ${file.name}`, 
          user: currentRealtor?.name || 'Риелтор' 
        }];
        return {
          ...p,
          documents: updatedDocs,
          history: updatedHistory
        };
      }
      return p;
    }));

    onAddLog('Document Uploaded', `Документ ${file.name} успешно загружен к объекту #${selectedPropId}.`);
  };

  // Document deletion
  const handleDeleteDocument = (docId) => {
    const docToDelete = selectedProp?.documents?.find(d => d.id === docId);
    setProperties(prev => prev.map(p => {
      if (p.id === selectedPropId) {
        const updatedDocs = p.documents.filter(d => d.id !== docId);
        const updatedHistory = [...p.history, { 
          date: new Date().toISOString().replace('T', ' ').substring(0, 16), 
          action: `Удален документ: ${docToDelete?.name || 'Файл'}`, 
          user: currentRealtor?.name || 'Риелтор' 
        }];
        return {
          ...p,
          documents: updatedDocs,
          history: updatedHistory
        };
      }
      return p;
    }));

    onAddLog('Document Deleted', `Удален документ ${docToDelete?.name} из объекта #${selectedPropId}.`);
  };

  // Post comment reply in chat
  const handlePostComment = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newComment = {
      id: `comm-live-${Date.now()}`,
      sender: 'realtor',
      senderName: currentRealtor?.name || 'Риелтор',
      text: replyText.trim(),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setProperties(prev => prev.map(p => {
      if (p.id === selectedPropId) {
        const updatedComments = [...(p.comments || []), newComment];
        const updatedHistory = [...p.history, { 
          date: new Date().toISOString().replace('T', ' ').substring(0, 16), 
          action: 'Отправлен ответ в переписке с управляющей компанией', 
          user: currentRealtor?.name || 'Риелтор' 
        }];
        return {
          ...p,
          comments: updatedComments,
          history: updatedHistory
        };
      }
      return p;
    }));

    onAddLog('Comment Posted', `Отправлен комментарий к объекту #${selectedPropId}.`);
    setReplyText('');
  };

  // Helper text translator
  const getFileCategoryLabel = (cat) => {
    switch (cat) {
      case 'title': return 'Правоустанавливающие';
      case 'photo': return 'Фотографии объекта';
      case 'plan': return 'План помещений';
      case 'valuation': return 'Оценка стоимости';
      case 'extra': return 'Дополнительные файлы';
      default: return 'Файл';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded">Черновик</span>;
      case 'submitted':
      case 'review':
        return <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded">На рассмотрении</span>;
      case 'needs_improvement':
        return <span className="bg-orange-50 text-orange-700 border border-orange-100 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded">Требует доработки</span>;
      case 'approved':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded">Одобрен</span>;
      case 'rejected':
        return <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded">Отклонен</span>;
      case 'published':
        return <span className="bg-[#A38D6D]/10 text-[#A38D6D] border border-[#A38D6D]/20 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded">Отправлен</span>;
      default:
        return null;
    }
  };

  // Объекты из API идут в своей валюте (KGS), поэтому формат зависит от currency.
  const formatMoney = (val, currency = 'EUR') => {
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    })
      .format(val || 0)
      .replace('EUR', '€')
      .replace(',00', '');
    return currency === 'KGS' ? formatted.replace('KGS', 'сом') : formatted;
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title & Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-left">
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Кабинет просмотра объектов
          </span>
          <h1 className="text-2xl font-serif font-semibold text-gray-900">
            Каталог недвижимости
          </h1>
          <p className="text-xs text-gray-400">Каталог недвижимости Atria. Доступен просмотр документов и генерация печатных брошюр.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-100 p-4 rounded-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Поиск по названию объекта..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-[#FBFBFA] border border-gray-200 focus:outline-none focus:border-[#A38D6D] rounded text-gray-900"
          />
        </div>
      </div>

      {/* Демо-фолбэк, когда каталог не удалось загрузить с сервера */}
      {loadError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-sm">
          {loadError}
        </div>
      )}

      {/* Properties List / Details Flex Container */}
      <div className="relative">

        {/* Full-width Property Grid (Grid is now beautifully balanced) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full bg-white border border-gray-100 rounded-sm py-16 px-4 text-center text-gray-400 text-xs">
              Загрузка каталога объектов из ATRIA API...
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-100 rounded-sm py-16 px-4 text-center text-gray-400 text-xs">
              Объекты не найдены по заданным критериям фильтрации.
            </div>
          ) : (
            filteredProperties.map((prop) => {
              const mainImg = prop.images && prop.images.length > 0 
                ? prop.images[0] 
                : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800';
              
              const isSelected = selectedPropId === prop.id;

              // Token dynamics: real totals from the API when present, otherwise
              // fall back to the old price-derived estimate (mock data).
              const totalTokens = prop.totalTokens ?? Math.floor(prop.price / 100);
              const apiSold =
                prop.totalTokens != null && prop.availableTokens != null
                  ? prop.totalTokens - prop.availableTokens
                  : null;

              let baseSold = apiSold;
              if (baseSold == null) {
                baseSold = 0;
                if (prop.status === 'published' || prop.status === 'approved' || prop.status === 'review') {
                  const charSum = prop.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const basePercent = 40 + (charSum % 45); // 40% to 85%
                  baseSold = Math.floor((totalTokens * basePercent) / 100);
                }
              }
              const dealSold = (deals || []).filter(d => d.propertyId === prop.id && d.status === 'success').reduce((sum, d) => sum + (d.tokensBought || 0), 0);
              const soldTokens = Math.min(baseSold + dealSold, totalTokens);
              const availableTokens = totalTokens - soldTokens;
              const soldPercent = totalTokens > 0 ? (soldTokens / totalTokens) * 100 : 0;

              return (
                <div
                  key={prop.id}
                  onClick={() => {
                    setSelectedPropId(prop.id);
                    setActiveImgIndex(0);
                  }}
                  className={`bg-white border rounded-sm overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left
                    ${isSelected ? 'border-[#A38D6D] ring-1 ring-[#A38D6D]/30' : 'border-gray-100 hover:border-[#A38D6D]'}
                  `}
                >
                  <div className="relative h-44 bg-gray-100 overflow-hidden shrink-0">
                    <img 
                      src={mainImg} 
                      alt={prop.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                    
                    <div className="absolute bottom-3 left-4 text-white">
                      <span className="text-[8px] uppercase tracking-widest font-mono text-[#A38D6D] font-bold bg-[#111111]/80 px-1.5 py-0.5 rounded">
                        {prop.type}
                      </span>
                      <h3 className="font-serif text-sm font-bold mt-1.5 line-clamp-1">
                        {prop.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <MapPin size={11} className="text-[#A38D6D]" />
                        <span className="truncate">{prop.city}{prop.country ? `, ${prop.country}` : ''}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {prop.description}
                      </p>
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      {/* Financial info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Стоимость</span>
                          <span className="font-mono text-xs font-bold text-[#1a1a1a]">
                            {formatMoney(prop.price, prop.currency)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Площадь</span>
                          <span className="font-mono text-xs font-semibold text-gray-800">
                            {prop.area} кв.м
                          </span>
                        </div>
                      </div>

                      {/* Tokenization dynamic metrics */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-dashed border-gray-100 pt-2.5">
                        <div>
                          <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Цена токена</span>
                          <span className="font-mono text-[11px] font-bold text-[#A38D6D]">
                            {formatMoney(prop.tokenPrice, prop.currency)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Уже выкуплено</span>
                          <span className="font-mono text-[10px] font-bold text-gray-700">
                            {soldTokens.toLocaleString('ru-RU')} / {totalTokens.toLocaleString('ru-RU')} RWA
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[8px] uppercase font-bold text-gray-400 font-mono">
                          <span>Продано долей</span>
                          <span className="text-[#A38D6D] font-bold">{soldPercent.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-150/50">
                          <div 
                            className="bg-[#A38D6D] h-full rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(soldPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick operational triggers & Brochure generation */}
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-2.5 flex justify-between items-center gap-2">
                    <span className="text-[8px] font-mono text-gray-400 font-bold uppercase tracking-wider">База синхронизирована</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateBrochure(prop);
                      }}
                      className="text-[9px] uppercase tracking-wider font-bold text-gray-800 hover:text-[#A38D6D] cursor-pointer flex items-center gap-1 font-mono bg-white border border-gray-200 hover:border-[#A38D6D] py-1 px-2.5 rounded-sm shadow-3xs transition-all font-semibold"
                    >
                      <FileText size={11} className="text-[#A38D6D]" />
                      <span>Брошюра</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Slide-Over Side Panel (Drawer Sheet Overlay) */}
        <AnimatePresence>
          {selectedProp && (
            <>
              {/* Overlay Backdrop dimmer with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPropId(null)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 cursor-pointer"
              />

              {/* Side Panel Sheet content */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl z-50 flex flex-col h-full border-l border-gray-150"
              >
                {/* Detail Header Multi-Image Carousel */}
                <div className="relative h-48 bg-gray-100 shrink-0">
                  <img 
                    src={selectedPropImages[activeImgIndex] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'} 
                    alt={selectedProp.name}
                    className="w-full h-full object-cover transition-all duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                  {/* Slide Indicators */}
                  {selectedPropImages.length > 1 && (
                    <div className="absolute bottom-4 right-6 flex gap-1 z-10 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full">
                      {selectedPropImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImgIndex(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                            activeImgIndex === idx ? 'bg-[#A38D6D] scale-125' : 'bg-white/60 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedPropId(null)}
                    className="absolute top-4 right-4 cursor-pointer bg-black/50 text-white hover:bg-black/80 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors"
                    title="Закрыть детали"
                  >
                    <X size={14} />
                  </button>

                  <div className="absolute bottom-4 left-6 text-white text-left">
                    <span className="text-[7px] uppercase font-bold tracking-widest text-[#A38D6D] bg-[#111111] px-2 py-0.5 rounded font-mono">
                      {selectedProp.type}
                    </span>
                    <h2 className="font-serif text-base font-bold mt-1 shadow-xs">{selectedProp.name}</h2>
                  </div>
                </div>

                {/* Subsections: Info, Documents, Chat (Scrollable container) */}
                <div className="p-5 space-y-6 overflow-y-auto flex-1">
                  
                  {/* Premium Action Button inside detail drawer */}
                  <button
                    onClick={() => handleGenerateBrochure(selectedProp)}
                    className="w-full bg-[#111111] hover:bg-[#A38D6D] text-white py-2.5 px-4 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm font-semibold cursor-pointer"
                  >
                    <Award size={13} className="text-[#A38D6D]" />
                    <span>Авто-генерация брошюры PDF</span>
                  </button>

                  {/* Grid Parameters */}
                  <div className="grid grid-cols-2 gap-4 text-xs border-b border-gray-100 pb-5 text-left">
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Стоимость объекта</span>
                      <span className="font-mono text-sm font-bold text-gray-900 mt-0.5 block">{formatMoney(selectedProp.price, selectedProp.currency)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Полезная площадь</span>
                      <span className="font-mono text-sm font-semibold text-gray-800 mt-0.5 block">{selectedProp.area} кв. метров</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Цена за токен (RWA)</span>
                      <span className="font-mono text-sm font-bold text-[#A38D6D] mt-0.5 block">{formatMoney(selectedProp.tokenPrice, selectedProp.currency)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Продано долей (RWA)</span>
                      <span className="font-mono text-sm font-bold text-emerald-700 mt-0.5 block">
                        {detailSoldTokens.toLocaleString('ru-RU')} / {detailTotalTokens.toLocaleString('ru-RU')} RWA
                      </span>
                    </div>

                    <div className="col-span-2 space-y-1.5 border-t border-dashed border-gray-150/60 pt-3">
                      <div className="flex justify-between items-center text-[8px] uppercase font-bold text-gray-400 font-mono">
                        <span>Прогресс выкупа долей</span>
                        <span className="text-[#A38D6D] font-bold">{detailSoldPercent.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-150/50">
                        <div 
                          className="bg-[#A38D6D] h-full rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(detailSoldPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Год постройки</span>
                      <span className="font-mono text-sm font-semibold text-gray-800 mt-0.5 block">{selectedProp.yearBuilt || '2019'} г.</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Этажность</span>
                      <span className="font-mono text-sm font-semibold text-gray-800 mt-0.5 block">{selectedProp.floorsCount || '1'} эт.</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Регистрация в системе</span>
                      <span className="font-mono text-[10px] text-gray-600 mt-0.5 block">{selectedProp.createdAt || '2026-06-15 10:24'}</span>
                    </div>
                    {selectedProp.publishedAt && (
                      <div>
                        <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Дата публикации на витрине</span>
                        <span className="font-mono text-[10px] text-emerald-700 font-bold mt-0.5 block">{selectedProp.publishedAt}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Адрес расположения</span>
                      <span className="text-gray-700 mt-0.5 block font-medium">{selectedProp.address || 'Не указан'}, {selectedProp.city}{selectedProp.country ? `, ${selectedProp.country}` : ''}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">Описание объекта</span>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed bg-[#FDFDFB] p-3 border border-gray-100 rounded">{selectedProp.description}</p>
                    </div>
                  </div>

                  {/* Document Management Section */}
                  <div className="space-y-3 border-b border-gray-100 pb-5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-gray-900">Правовые и оценочные документы</h4>
                      <Paperclip size={13} className="text-gray-400" />
                    </div>

                    {/* Документы приходят из API как {id, url, fileName, contentType} —
                        категорий у них нет, поэтому показываем плоским списком. */}
                    <div className="space-y-2">
                      {!selectedProp.documents || selectedProp.documents.length === 0 ? (
                        <div className="p-3 border border-gray-50 bg-[#FDFDFB] rounded text-left">
                          <span className="text-[9px] text-gray-400 italic">Документы не приложены</span>
                        </div>
                      ) : (
                        selectedProp.documents.map((doc, idx) => (
                          <a
                            key={doc.id || idx}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 bg-white border border-gray-100 hover:border-[#A38D6D] p-2.5 rounded-sm transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-[#A38D6D] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-mono font-semibold text-gray-700 truncate" title={doc.fileName}>
                                  {doc.fileName || `Документ ${idx + 1}`}
                                </p>
                                <span className="text-[8px] text-gray-400 font-mono block mt-0.5">
                                  {doc.contentType || 'файл'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[8px] text-[#A38D6D] uppercase font-mono font-bold tracking-wider shrink-0">
                              Открыть
                            </span>
                          </a>
                        ))
                      )}
                    </div>
                  </div>



                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>



      {/* Brochure Auto-Generation Modal */}
      <AnimatePresence>
        {showBrochureModal && brochureProp && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBrochureModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs cursor-pointer z-40"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="max-w-3xl w-full h-[90vh] bg-white border border-gray-200 rounded-sm shadow-2xl overflow-hidden flex flex-col text-left z-50 relative"
            >
              {/* Tool bar (non-printable) */}
              <div className="bg-[#111111] text-white p-3.5 flex items-center justify-between shrink-0 font-mono text-[10px] uppercase tracking-wider print:hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A38D6D] animate-pulse shrink-0"></span>
                  {pdfError ? (
                    <span className="text-rose-300 normal-case truncate" title={pdfError}>
                      Ошибка PDF: {pdfError}
                    </span>
                  ) : (
                    <span className="truncate">Предпросмотр печатной брошюры Atria Real Estate AG</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfGenerating}
                    className="cursor-pointer bg-white text-stone-900 hover:bg-stone-100 disabled:opacity-60 disabled:cursor-wait px-3 py-1.5 rounded-sm font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
                  >
                    <FileText size={11} />
                    <span>{pdfGenerating ? 'Готовим PDF...' : 'Скачать PDF'}</span>
                  </button>

                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="cursor-pointer bg-[#A38D6D] hover:bg-[#8e7b5e] text-white px-3 py-1.5 rounded-sm font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
                  >
                    <Printer size={11} />
                    <span>Печать</span>
                  </button>

                  <button
                    onClick={() => setShowBrochureModal(false)}
                    className="cursor-pointer bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest transition-all w-6 h-6 rounded-full flex items-center justify-center font-mono"
                    title="Закрыть"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Scrollable Printable Area */}
              <div id="atria-printable-brochure" className="flex-1 overflow-y-auto p-8 md:p-12 space-y-8 bg-white print:p-0 print:overflow-visible">
                
                {/* Letterhead Header */}
                <div className="flex justify-between items-end border-b-2 border-stone-900 pb-5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A38D6D]">Atria Real Estate AG</p>
                    <h2 className="font-serif text-xl font-bold tracking-tight text-stone-900">ATRIA PREMIUM COLLECTION</h2>
                  </div>
                  <div className="text-right font-mono text-[8px] text-gray-400 space-y-0.5">
                    <p>ZURICH • GENEVA • ST. MORITZ</p>
                    <p>SYSTEM DATE: {new Date().toLocaleDateString('ru-RU')}</p>
                    <p>REF ID: {brochureProp.id.toUpperCase()}</p>
                  </div>
                </div>

                {/* Hero Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Photo Column */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="h-72 bg-stone-100 rounded-sm overflow-hidden border border-stone-200">
                      <img
                        src={brochureProp.images && brochureProp.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'}
                        alt={brochureProp.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    {/* Галерея: все остальные фото объекта, без обрезки. */}
                    {brochureProp.images && brochureProp.images.length > 1 && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {brochureProp.images.slice(1).map((img, idx) => (
                          <div key={idx} className="h-24 bg-stone-100 rounded-sm overflow-hidden border border-stone-150">
                            <img src={img} alt={`${brochureProp.name} — фото ${idx + 2}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right specifications column */}
                  <div className="md:col-span-5 space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono uppercase font-bold tracking-widest text-[#A38D6D] bg-stone-900 px-2 py-0.5 rounded-sm">
                        {brochureProp.type}
                      </span>
                      <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 pt-1 leading-snug">
                        {brochureProp.name}
                      </h1>
                      <p className="text-xs text-gray-500 font-medium">
                        {brochureProp.address || 'Не указан'}, {brochureProp.city}, {brochureProp.country || 'Швейцария'}
                      </p>
                    </div>

                    {/* Big specs block */}
                    <div className="bg-stone-50 border border-stone-150 p-4 rounded-sm space-y-3 font-mono">
                      <div className="border-b border-stone-200 pb-2">
                        <span className="text-[8px] uppercase font-bold text-gray-400 block">Ориентировочная стоимость</span>
                        <span className="text-lg font-bold text-stone-900">{formatMoney(brochureProp.price, brochureProp.currency)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div>
                          <span className="text-[8px] uppercase font-bold text-gray-400 block">Общая площадь</span>
                          <span className="font-bold text-stone-800">{brochureProp.area} кв. м</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase font-bold text-gray-400 block">Этажей</span>
                          <span className="font-bold text-stone-800">{brochureProp.floorsCount || 1} эт.</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase font-bold text-gray-400 block">Год постройки</span>
                          <span className="font-bold text-stone-800">{brochureProp.yearBuilt || 2019} г.</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase font-bold text-gray-400 block">Статус проверки</span>
                          <span className="font-bold text-emerald-700 uppercase">Одобрено УК</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Description Narrative */}
                <div className="space-y-2 text-left">
                  <h3 className="font-serif text-sm font-bold text-stone-900 border-b border-stone-200 pb-1 uppercase tracking-wider">Описание и характеристики объекта</h3>
                  <p className="text-xs text-stone-600 leading-relaxed text-justify whitespace-pre-line font-serif">
                    {brochureProp.description}
                  </p>
                </div>

                {/* Документы объекта. Сами PDF-файлы дополнительно подклеиваются
                    страницами в конец скачиваемого PDF (см. handleDownloadPdf). */}
                {brochureProp.documents && brochureProp.documents.length > 0 && (
                  <div className="space-y-2 text-left">
                    <h3 className="font-serif text-sm font-bold text-stone-900 border-b border-stone-200 pb-1 uppercase tracking-wider">
                      Приложенные документы
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-stone-700">
                      {brochureProp.documents.map((doc, idx) => {
                        const label = doc?.name || doc?.fileName || doc?.title || (typeof doc === 'string' ? doc : `Документ ${idx + 1}`);
                        return (
                          <li key={doc?.id || idx} className="flex items-center gap-2 bg-stone-50 border border-stone-150 px-3 py-2 rounded-sm">
                            <FileText size={12} className="text-[#A38D6D] shrink-0" />
                            <span className="truncate">{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Footer seal */}
                <div className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-center text-[8px] font-mono text-gray-400 gap-2 uppercase tracking-widest text-center sm:text-left">
                  <span>© 2026 Atria Real Estate Zurich AG. All rights reserved.</span>
                  <span>Verified Asset Class • Compliance Sec. CHE-104.928.311</span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
