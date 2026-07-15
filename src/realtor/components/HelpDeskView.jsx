import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Send,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  Plus,
  ChevronRight,
  Building,
  User,
  CornerDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as supportApi from '../api/support';

// Категории тикета (значение уходит в API как поле category).
const CATEGORIES = [
  'Комплаенс-проверка',
  'Техническая поддержка',
  'Финансовые вопросы',
  'Юридический отдел',
  'Другое'
];

// Дата из timestamp в компактный вид для UI.
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function HelpDeskView({ properties = [], currentRealtor, onAddLog }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // New ticket form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState('');

  // Message input in current thread
  const [chatMessage, setChatMessage] = useState('');
  const [sendPending, setSendPending] = useState(false);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  // Загружаем тикеты риелтора из ATRIA API.
  useEffect(() => {
    let cancelled = false;
    supportApi.fetchTickets()
      .then(async (list) => {
        if (cancelled) return;
        setTickets(list);
        // Список не отдаёт тред — догружаем его для первого (выбранного) тикета.
        const firstId = list[0]?.id || null;
        setSelectedTicketId((prev) => prev || firstId);
        setLoadError('');
        if (firstId) {
          const full = await supportApi.fetchTicket(firstId).catch(() => null);
          if (!cancelled && full) {
            setTickets(prev => prev.map(t => (t.id === firstId ? full : t)));
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не удалось загрузить обращения.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Перечитывает один тикет с сервера и вставляет его в список.
  const refreshTicket = async (id) => {
    const fresh = await supportApi.fetchTicket(id);
    setTickets(prev => prev.map(t => (t.id === id ? fresh : t)));
    return fresh;
  };

  // Список (GET /tickets) не отдаёт тред (messages: null), поэтому при выборе
  // тикета догружаем полный тред через GET /tickets/{id}.
  const handleSelectTicket = (id) => {
    setSelectedTicketId(id);
    const current = tickets.find(t => t.id === id);
    if (current && current.messages.length === 0) {
      refreshTicket(id).catch(() => {});
    }
  };

  // Создание тикета — сервер сразу заводит его open с первым сообщением.
  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || createPending) return;

    setCreatePending(true);
    setCreateError('');
    try {
      const ticket = await supportApi.createTicket({
        subject: newTitle.trim(),
        category: newCategory,
        body: newDescription.trim()
      });
      setTickets(prev => [ticket, ...prev]);
      setSelectedTicketId(ticket.id);
      setShowCreateModal(false);
      onAddLog?.(`Создано обращение в поддержку: "${newTitle.trim()}"`, 'info');
      setNewTitle('');
      setNewCategory(CATEGORIES[0]);
      setNewDescription('');
    } catch (err) {
      setCreateError(err.message || 'Не удалось создать обращение.');
    } finally {
      setCreatePending(false);
    }
  };

  // Ответ риелтора в существующем треде.
  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedTicket || sendPending) return;

    const text = chatMessage.trim();
    setSendPending(true);
    try {
      await supportApi.postMessage(selectedTicket.id, text);
      setChatMessage('');
      // Перечитываем тред целиком — там же обновится статус тикета.
      await refreshTicket(selectedTicket.id);
    } catch {
      // Оставляем текст в поле, чтобы можно было повторить отправку.
    } finally {
      setSendPending(false);
    }
  };

  // Закрытие обращения.
  const handleResolveTicket = async (ticketId) => {
    try {
      await supportApi.closeTicket(ticketId);
      await refreshTicket(ticketId);
      onAddLog?.('Обращение в поддержку закрыто', 'update');
    } catch {
      // no-op: статус не изменится, если сервер отклонил
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="bg-blue-50 text-blue-700 border border-blue-150 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded">Открыт</span>;
      case 'pending':
        return <span className="bg-[#A38D6D]/15 text-[#A38D6D] border border-[#A38D6D]/30 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded">Ждёт ответа</span>;
      case 'closed':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded">Закрыт</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="text-left">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-950 uppercase">
          Служба поддержки & Хелпдеск
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Задавайте вопросы управляющей компании, отправляйте запросы на прохождение юридического комплаенса и консультируйтесь со специалистами.
        </p>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Ticket List (5 Columns) */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-sm overflow-hidden flex flex-col h-[650px]">
          
          {/* Header Action inside column */}
          <div className="p-4 border-b border-gray-100 bg-[#FBFBFA] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 font-mono">
              История обращений ({tickets.length})
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 cursor-pointer bg-[#A38D6D] hover:bg-[#8e7b5e] text-white text-[9px] font-mono uppercase font-bold py-1.5 px-3 rounded-sm transition-all"
            >
              <Plus size={12} />
              <span>Создать запрос</span>
            </button>
          </div>

          {/* Scrollable list of tickets */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadError && (
              <div className="p-3 m-3 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] rounded">{loadError}</div>
            )}
            {loading ? (
              <div className="p-12 text-center text-gray-400 text-xs">Загрузка обращений...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                У вас нет активных обращений в поддержку.
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const lastMsg = t.messages[t.messages.length - 1];
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 cursor-pointer border-l-2
                      ${isSelected 
                        ? 'bg-[#FDFDFB] border-l-[#A38D6D]' 
                        : 'bg-white hover:bg-[#FBFBFA] border-l-transparent'
                      }
                    `}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <MessageSquare size={16} className={isSelected ? 'text-[#A38D6D]' : 'text-gray-400'} />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                          {t.category}
                        </span>
                        <span className="text-[8px] font-mono text-gray-400">
                          {fmtTime(t.createdAt).split(',')[0]}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-gray-900 leading-tight truncate">
                        {t.subject}
                      </h4>

                      {lastMsg && (
                        <p className="text-[10px] text-gray-400 truncate leading-snug">
                          {lastMsg.fromAdmin ? 'Поддержка: ' : 'Вы: '}
                          {lastMsg.text}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {getStatusBadge(t.status)}
                      </div>
                    </div>

                    <ChevronRight size={14} className="text-gray-350 self-center" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Interactive Support Chat (7 Columns) */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-sm overflow-hidden flex flex-col h-[650px] text-left">
          {selectedTicket ? (
            <div className="flex flex-col h-full">
              
              {/* Active Ticket Header */}
              <div className="p-4 border-b border-gray-100 bg-[#FBFBFA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                      ID: {selectedTicket.id}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">Создан: {fmtTime(selectedTicket.createdAt)}</span>
                  </div>
                  <h3 className="font-serif text-sm font-bold text-gray-900 leading-tight">
                    {selectedTicket.subject}
                  </h3>
                  <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{selectedTicket.category}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => handleResolveTicket(selectedTicket.id)}
                      className="cursor-pointer border border-emerald-200 hover:border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[9px] font-mono uppercase font-bold py-1 px-2.5 rounded transition-all"
                    >
                      Закрыть
                    </button>
                  )}
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              {/* Chat messages viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                <div className="text-center">
                  <span className="inline-block bg-white border border-gray-100 text-[8px] font-mono uppercase font-semibold text-gray-400 px-3 py-1 rounded-full shadow-2xs">
                    Начало диалога с Администрацией
                  </span>
                </div>

                {selectedTicket.messages.map((m) => {
                  const isAdmin = m.fromAdmin;
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 max-w-[85%] ${isAdmin ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] uppercase font-bold shrink-0 shadow-2xs
                        ${isAdmin 
                          ? 'bg-gray-200 text-gray-800' 
                          : 'bg-[#A38D6D] text-white'
                        }
                      `}>
                        {isAdmin ? 'A' : 'R'}
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-[9px] text-gray-400 font-mono
                          ${isAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                          <span className="font-semibold text-gray-600">{m.authorName || (isAdmin ? 'Поддержка' : 'Вы')}</span>
                          <span>•</span>
                          <span>{fmtTime(m.createdAt)}</span>
                        </div>
                        
                        <div className={`p-3 rounded-lg text-xs leading-relaxed shadow-3xs
                          ${isAdmin 
                            ? 'bg-white border border-gray-150 text-gray-800 rounded-tl-none' 
                            : 'bg-stone-900 text-stone-100 rounded-tr-none'
                          }
                        `}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* Message inputs form footer */}
              {selectedTicket.status !== 'closed' ? (
                <form onSubmit={handleSendMessageSubmit} className="p-3 border-t border-gray-100 bg-[#FBFBFA] flex gap-2 shrink-0">
                  <input
                    type="text"
                    required
                    disabled={sendPending}
                    placeholder="Наберите сообщение для администратора..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 p-2.5 bg-white border border-gray-250 focus:outline-none focus:border-[#A38D6D] rounded text-xs text-gray-900 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sendPending}
                    className="bg-[#A38D6D] hover:bg-[#8e7b5e] disabled:opacity-60 text-white p-2.5 rounded flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Отправить сообщение"
                  >
                    <Send size={14} />
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-emerald-50/50 border-t border-emerald-100 text-center text-xs text-emerald-800 font-medium py-3 shrink-0">
                  Обращение закрыто. Вы можете открыть новое в левой панели.
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400 text-xs">
              <LifeBuoy size={36} className="text-gray-300 mb-3 animate-spin-slow" />
              <span>Выберите диалог в списке слева или создайте новый тикет для связи с администратором.</span>
            </div>
          )}
        </div>

      </div>

      {/* Ticket Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Modal Dialog container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 m-auto max-w-lg h-fit bg-white z-50 border border-gray-150 rounded-sm shadow-2xl p-6 flex flex-col text-left space-y-4"
            >
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-gray-900">Новое обращение</h3>
                  <p className="text-[10px] text-gray-400">Служба комплаенса и поддержки Atria Real Estate AG</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-xs font-mono uppercase font-bold cursor-pointer"
                >
                  Закрыть
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs">

                {createError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] p-2.5 rounded">
                    {createError}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Тема обращения *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Вопрос по договору"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 bg-[#FBFBFA] border border-gray-200 focus:outline-none focus:border-[#A38D6D] rounded text-gray-900 font-medium"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Категория *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#FBFBFA] border border-gray-200 focus:outline-none focus:border-[#A38D6D] rounded text-gray-900"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Description Text */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Детальное описание запроса *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Опишите подробно суть вашего вопроса или прикрепите ссылки на необходимые реестры..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2.5 bg-[#FBFBFA] border border-gray-200 focus:outline-none focus:border-[#A38D6D] rounded text-gray-900 leading-relaxed"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="cursor-pointer border border-gray-200 hover:border-gray-350 text-gray-500 py-2 px-4 rounded text-[9px] uppercase font-bold tracking-widest transition-colors font-semibold bg-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={createPending}
                    className="cursor-pointer bg-[#A38D6D] hover:bg-[#8e7b5e] disabled:opacity-60 disabled:cursor-wait border border-[#A38D6D] hover:border-[#8e7b5e] text-white py-2 px-4 rounded text-[9px] uppercase font-bold tracking-widest transition-all font-semibold"
                  >
                    {createPending ? 'Отправка...' : 'Отправить тикет'}
                  </button>
                </div>

              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
