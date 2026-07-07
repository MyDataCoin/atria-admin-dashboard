import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Mail, 
  Plus, 
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESETS = [
  {
    title: 'Вопрос передан в Compliance',
    text: 'Здравствуйте! Ваш запрос относительно статуса верификации KYC/AML был успешно зарегистрирован и передан для проверки независимому швейцарскому комплаенс-отделу ATRIA Compliance. Пожалуйста, ожидайте обновления статуса в вашем личном кабинете. Обычно проверка документов занимает до 24 часов.'
  },
  {
    title: 'Выплата KGS проведена',
    text: 'Здравствуйте! Транзакция распределения дивидендов KGS была успешно выполнена и подтверждена в блокчейн-сети. Пожалуйста, проверьте баланс вашего привязанного Web3-кошелька. Если у вас возникнут дополнительные вопросы, мы всегда готовы помочь.'
  },
  {
    title: 'Ресинхронизация кошелька',
    text: 'Приветствуем! Мы провели принудительную ресинхронизацию вашего кошелька со смарт-контрактами и депозитарной базой данных. Пожалуйста, перезапустите ваше Web3-приложение и повторите попытку. Все должно функционировать корректно.'
  },
  {
    title: 'Запрос дополнительных документов',
    text: 'Уважаемый инвестор! В целях соответствия стандартам комплаенса и правилам AML, нам требуются дополнительные документы, подтверждающие источник происхождения средств. Пожалуйста, загрузите выписку из банка или налоговую декларацию в разделе "Документы" вашего личного кабинета.'
  }
];

export default function SupportTickets({ 
  tickets, 
  setTickets, 
  investors,
  onAddLog 
}) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, Open, Answered, Resolved
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Create ticket state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInvestorId, setNewInvestorId] = useState('');
  const [newCategory, setNewCategory] = useState('Технические вопросы');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newMessageText, setNewMessageText] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState('');

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  // Stats
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const answeredCount = tickets.filter(t => t.status === 'Answered').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

  // Filter logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.investorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ? true : t.status === filterStatus;
    const matchesCategory = filterCategory === 'all' ? true : t.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Handle reply submission
  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const newMsg = {
      id: `msg-${selectedTicket.id}-${Date.now()}`,
      sender: 'support',
      senderName: 'Поддержка ATRIA RWA',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      text: replyText.trim()
    };

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: 'Answered',
          updatedAt: newMsg.timestamp,
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    setReplyText('');
    
    onAddLog(
      'Support Reply Sent',
      `Отправлен ответ инвестору "${selectedTicket.investorName}" по обращению #${selectedTicket.id} ("${selectedTicket.subject}").`
    );
  };

  // Quick template reply trigger
  const handleApplyPreset = (presetText) => {
    setReplyText(presetText);
  };

  // Change ticket status directly
  const handleChangeStatus = (ticketId, newStatus) => {
    const updatedTickets = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: newStatus,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return t;
    });
    setTickets(updatedTickets);

    const target = tickets.find(t => t.id === ticketId);
    onAddLog(
      'Ticket Status Changed',
      `Статус тикета #${ticketId} ("${target?.subject}") изменен на "${
        newStatus === 'Open' ? 'Открыт' : newStatus === 'Answered' ? 'Отвечен' : 'Решен'
      }".`
    );
  };

  // Change ticket priority directly
  const handleChangePriority = (ticketId, newPriority) => {
    const updatedTickets = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          priority: newPriority,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return t;
    });
    setTickets(updatedTickets);

    const target = tickets.find(t => t.id === ticketId);
    onAddLog(
      'Ticket Priority Changed',
      `Приоритет тикета #${ticketId} ("${target?.subject}") изменен на "${newPriority}".`
    );
  };

  // Create new ticket action
  const handleCreateTicketSubmit = (e) => {
    e.preventDefault();
    if (!newSubject || !newInvestorId || !newMessageText) return;

    const investor = investors.find(i => i.id === newInvestorId);
    if (!investor) return;

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newTkt = {
      id: `tkt-${tickets.length + 1}`,
      investorId: investor.id,
      investorName: investor.name,
      investorEmail: investor.email,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'Open',
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'investor',
          senderName: investor.name,
          timestamp: timestamp,
          text: newMessageText
        }
      ]
    };

    setTickets([newTkt, ...tickets]);
    setSelectedTicketId(newTkt.id);
    setShowCreateModal(false);

    // Reset fields
    setNewSubject('');
    setNewInvestorId('');
    setNewMessageText('');

    onAddLog(
      'Support Ticket Registered',
      `Зарегистрировано новое обращение от инвестора "${investor.name}" на тему: "${newSubject}".`
    );
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Обратная связь & Help Desk
          </span>
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Поддержка Клиентов & Сервисные Обращения
          </h2>
        </div>

        <button
          onClick={() => {
            if (investors.length > 0) {
              setNewInvestorId(investors[0].id);
            }
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#A38D6D] text-white px-4 py-2 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold transition-all cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Зарегистрировать Тикет</span>
        </button>
      </div>

      {/* Analytics Counter Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-sm shadow-xs">
          <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold font-mono">Всего тикетов</span>
          <span className="text-2xl font-bold font-mono text-gray-900 block mt-1">{totalCount}</span>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-sm shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-[8px] uppercase tracking-widest text-amber-700 font-bold font-mono">Ожидают ответа</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-800 block mt-1">{openCount}</span>
        </div>
        <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-sm shadow-xs">
          <span className="text-[8px] uppercase tracking-widest text-blue-700 font-bold font-mono">Отвеченные</span>
          <span className="text-2xl font-bold font-mono text-blue-800 block mt-1">{answeredCount}</span>
        </div>
        <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-sm shadow-xs">
          <span className="text-[8px] uppercase tracking-widest text-emerald-700 font-bold font-mono">Решенные / Закрытые</span>
          <span className="text-2xl font-bold font-mono text-emerald-800 block mt-1">{resolvedCount}</span>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Tickets List */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-sm overflow-hidden shadow-xs flex flex-col h-[650px]">
          
          {/* List Search & Filters Header */}
          <div className="p-4 border-b border-gray-100 bg-[#FAF9F5]/40 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Поиск по инвестору, теме или ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-xs focus:outline-none focus:border-[#A38D6D] rounded-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold mb-1">Статус</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-1.5 border border-gray-200 bg-white focus:outline-none focus:border-[#A38D6D] text-gray-700"
                >
                  <option value="all">Все статусы</option>
                  <option value="Open">Открытые (Новые)</option>
                  <option value="Answered">Отвеченные</option>
                  <option value="Resolved">Решенные</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold mb-1">Категория</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full p-1.5 border border-gray-200 bg-white focus:outline-none focus:border-[#A38D6D] text-gray-700"
                >
                  <option value="all">Все категории</option>
                  <option value="Выплаты">Выплаты</option>
                  <option value="Верификация">Верификация</option>
                  <option value="Технические вопросы">Технические</option>
                  <option value="Юридические вопросы">Юридические</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actual List scrollable area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-150">
            {filteredTickets.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <HelpCircle size={32} className="mx-auto text-gray-300" />
                <p className="text-xs text-gray-500 font-medium font-serif">Обращения не найдены</p>
                <p className="text-[10px] text-gray-400">Попробуйте сбросить фильтры поиска</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const lastMsg = t.messages[t.messages.length - 1];

                let statusBadge = '';
                if (t.status === 'Open') statusBadge = 'bg-rose-50 text-rose-800 border-rose-200';
                if (t.status === 'Answered') statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                if (t.status === 'Resolved') statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';

                let priorityColor = 'text-gray-400';
                if (t.priority === 'High') priorityColor = 'text-rose-500 font-bold';
                if (t.priority === 'Medium') priorityColor = 'text-amber-500 font-bold';

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 text-left cursor-pointer transition-all hover:bg-gray-50/50 relative ${
                      isSelected ? 'bg-[#FAF8F3]/90 border-l-4 border-l-[#A38D6D]' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-mono text-gray-400 font-semibold">{t.id}</span>
                      <span className={`text-[8px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded border ${statusBadge}`}>
                        {t.status === 'Open' ? 'Новый' : t.status === 'Answered' ? 'Отвечен' : 'Решен'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-gray-900 mt-1 font-serif line-clamp-1">
                      {t.subject}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-medium">
                      <User size={10} className="text-gray-400 shrink-0" />
                      <span className="truncate">{t.investorName}</span>
                    </div>

                    {lastMsg && (
                      <p className="text-[10px] text-gray-400 mt-2 line-clamp-1 italic">
                        "{lastMsg.text}"
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 text-[9px] font-mono text-gray-400 border-t border-gray-100/60 pt-2">
                      <span>Категория: <span className="text-gray-700">{t.category}</span></span>
                      <span className={priorityColor}>{t.priority}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Thread Details */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-sm shadow-xs flex flex-col h-[650px] overflow-hidden">
          {selectedTicket ? (
            <div className="flex flex-col h-full">
              
              {/* Ticket Top bar header */}
              <div className="p-5 border-b border-gray-100 bg-[#FAF9F5]/20 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#A38D6D] bg-[#FAF8F3] px-2 py-0.5 border border-[#A38D6D]/30 rounded">
                        {selectedTicket.id}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Создан: {selectedTicket.createdAt}
                      </span>
                    </div>
                    <h3 className="text-base font-serif font-bold text-gray-900 mt-1.5 leading-tight">
                      {selectedTicket.subject}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        <strong>{selectedTicket.investorName}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Mail size={12} className="text-gray-400" />
                        {selectedTicket.investorEmail}
                      </span>
                    </div>
                  </div>

                  {/* Status/Priority manual dropdowns */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <div>
                      <span className="block text-[7px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-1">Статус тикета</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleChangeStatus(selectedTicket.id, e.target.value)}
                        className="text-[10px] font-mono font-semibold p-1.5 border border-gray-200 bg-white rounded-xs focus:outline-none focus:border-[#A38D6D] text-gray-800"
                      >
                        <option value="Open">Новый / Открыт</option>
                        <option value="Answered">Отвечен</option>
                        <option value="Resolved">Решен / Закрыт</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-[7px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-1">Приоритет</span>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => handleChangePriority(selectedTicket.id, e.target.value)}
                        className="text-[10px] font-mono font-semibold p-1.5 border border-gray-200 bg-white rounded-xs focus:outline-none focus:border-[#A38D6D] text-gray-800"
                      >
                        <option value="High">High (Высокий)</option>
                        <option value="Medium">Medium (Средний)</option>
                        <option value="Low">Low (Низкий)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Thread message messages */}
              <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50 space-y-4">
                {selectedTicket.messages.map((msg, index) => {
                  const isSupport = msg.sender === 'support';
                  return (
                    <div 
                      key={msg.id || index}
                      className={`flex flex-col max-w-[85%] ${isSupport ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold text-gray-600 font-serif">
                          {msg.senderName}
                        </span>
                        <span className="text-[8px] font-mono text-gray-400">
                          {msg.timestamp}
                        </span>
                      </div>

                      <div className={`p-4 rounded border text-xs leading-relaxed text-left ${
                        isSupport 
                          ? 'bg-[#111111] text-white border-gray-900 rounded-tr-none' 
                          : 'bg-white text-gray-800 border-gray-200/80 rounded-tl-none shadow-2xs'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Template Presets Bar */}
              <div className="p-4 border-t border-gray-100 bg-[#FAF9F5]/40 shrink-0">
                <span className="block text-[8px] uppercase tracking-widest text-gray-400 font-bold font-mono mb-2">
                  Быстрые шаблоны ответов
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset.text)}
                      className="px-2.5 py-1 bg-white hover:bg-[#FAF8F3] border border-gray-200 hover:border-[#A38D6D] text-[9px] font-medium text-gray-700 hover:text-[#A38D6D] rounded transition-all cursor-pointer shadow-3xs"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-150 bg-white flex gap-3 items-end shrink-0">
                <div className="flex-1">
                  <textarea
                    rows={2}
                    placeholder="Введите ответ инвестору... (будет зафиксировано в истории обращений)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 focus:bg-white text-xs text-gray-800 focus:outline-none focus:border-[#A38D6D] rounded-sm resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#111111] hover:bg-[#A38D6D] text-white p-3 rounded transition-all cursor-pointer h-[42px] w-[42px] flex items-center justify-center shrink-0"
                  title="Отправить ответ"
                >
                  <Send size={15} />
                </button>
              </form>

              </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <MessageSquare size={48} className="text-gray-300" />
              <p className="font-serif text-sm text-gray-500 font-semibold">Выберите тикет из списка слева</p>
              <p className="text-[11px] text-gray-400 max-w-xs">Вы можете просматривать историю диалогов и координировать ответы инвесторам</p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE TICKET MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#111111]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 rounded-sm w-full max-w-lg overflow-hidden shadow-2xl text-left"
            >
              <div className="p-5 border-b border-gray-150 bg-[#FAF9F5]">
                <h3 className="text-base font-serif font-bold text-gray-900">Зарегистрировать Новое Обращение</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">Создание тикета вручную (при звонке или письме)</p>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4 text-xs">
                
                {/* Investor dropdown selection */}
                <div className="space-y-1">
                  <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    Выберите Инвестора
                  </label>
                  <select
                    required
                    value={newInvestorId}
                    onChange={(e) => setNewInvestorId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white focus:outline-none focus:border-[#A38D6D] rounded-sm text-gray-800"
                  >
                    {investors.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.email}) — {inv.country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                      Категория
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 bg-white focus:outline-none focus:border-[#A38D6D] rounded-sm text-gray-800"
                    >
                      <option value="Выплаты">Выплаты</option>
                      <option value="Верификация">Верификация</option>
                      <option value="Технические вопросы">Технические вопросы</option>
                      <option value="Юридические вопросы">Юридические вопросы</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                      Приоритет
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 bg-white focus:outline-none focus:border-[#A38D6D] rounded-sm text-gray-800"
                    >
                      <option value="High">Высокий (High)</option>
                      <option value="Medium">Средний (Medium)</option>
                      <option value="Low">Низкий (Low)</option>
                    </select>
                  </div>
                </div>

                {/* Subject of the inquiry */}
                <div className="space-y-1">
                  <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    Тема обращения / Вопрос
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например: Проблема с привязкой нового ERC-20 адреса"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 text-xs focus:outline-none focus:border-[#A38D6D] rounded-sm text-gray-800"
                  />
                </div>

                {/* First Message text */}
                <div className="space-y-1">
                  <label className="block text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    Текст сообщения инвестора
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Опишите вопрос, полученный по телефону, email или в мессенджере..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="w-full p-3 border border-gray-200 text-xs focus:outline-none focus:border-[#A38D6D] rounded-sm text-gray-800 resize-none"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-500 hover:text-gray-700 rounded-sm font-mono text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#111111] hover:bg-[#A38D6D] text-white rounded-sm font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer font-bold"
                  >
                    Зарегистрировать
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
