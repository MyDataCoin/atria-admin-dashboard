import React, { useState } from 'react';
import { Bell, Check, CheckSquare, AlertTriangle, Info, Clock } from 'lucide-react';
import { motion } from 'motion/react';

// Дата уведомления (timestamp) в компактный вид.
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function NotificationsView({
  notifications = [],
  onMarkRead
}) {
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  // Отметка «прочитано» на сервере односторонняя — вернуть в непрочитанные нельзя.
  const handleMarkAllRead = () => {
    notifications.filter(n => !n.read).forEach(n => onMarkRead?.(n.id));
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={15} className="text-orange-500" />;
      case 'danger':
        return <AlertTriangle size={15} className="text-rose-500" />;
      case 'success':
        return <CheckSquare size={15} className="text-emerald-500" />;
      default:
        return <Info size={15} className="text-[#A38D6D]" />;
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold block mb-1">
            Системный журнал оповещений
          </span>
          <h1 className="text-2xl font-serif font-semibold text-gray-900">
            Уведомления и решения
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Отслеживайте движение ваших заявок, комментарии управляющей компании и вердикты юридической проверки.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-center">
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter(n => !n.read).length === 0}
            className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#111111] hover:bg-[#A38D6D] disabled:hover:bg-[#111111] text-white px-4 py-2.5 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            <Check size={12} />
            <span>Прочитать все</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs & stats */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer
              ${filter === 'all' ? 'bg-[#A38D6D] text-white' : 'text-gray-500 hover:text-gray-900'}
            `}
          >
            Все ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer
              ${filter === 'unread' ? 'bg-[#A38D6D] text-white' : 'text-gray-500 hover:text-gray-900'}
            `}
          >
            Непрочитанные ({notifications.filter(n => !n.read).length})
          </button>
        </div>

        <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">
          Автоматическое обновление статусов активна
        </span>
      </div>

      {/* Notification Rows */}
      {filteredNotifs.length === 0 ? (
        <div className="bg-white border border-gray-100 py-24 rounded-sm text-center text-gray-400 text-xs">
          <Bell size={28} className="mx-auto mb-3 text-gray-300" />
          Новых уведомлений нет.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredNotifs.map((notif) => {
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) onMarkRead?.(notif.id);
                }}
                className={`p-4 rounded-sm border text-left cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-xs hover:border-[#A38D6D]
                  ${notif.read 
                    ? 'bg-white border-gray-100 text-gray-700' 
                    : 'bg-[#A38D6D]/5 border-[#A38D6D]/30 text-gray-900 shadow-xs'
                  }
                `}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-mono font-bold tracking-wider ${
                        notif.type === 'warning' ? 'text-orange-600' :
                        notif.type === 'danger' ? 'text-rose-600' :
                        'text-[#A38D6D]'
                      }`}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A38D6D] animate-ping" />
                      )}
                    </div>

                    <p className="text-xs leading-relaxed font-medium">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-mono">
                      <Clock size={10} />
                      <span>{fmtDate(notif.date)}</span>
                    </div>
                  </div>
                </div>

                {!notif.read && (
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onMarkRead?.(notif.id); }}
                      className="text-[9px] font-mono uppercase tracking-wider font-bold text-gray-400 hover:text-[#A38D6D] px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded cursor-pointer"
                    >
                      Прочитано
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
