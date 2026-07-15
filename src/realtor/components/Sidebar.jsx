import React from 'react';
import { 
  LayoutDashboard, 
  Building, 
  Award,
  Bell,
  User,
  LifeBuoy,
  LogOut,
  X,
  Handshake
} from 'lucide-react';

export default function Sidebar({ 
  currentSection, 
  onSectionChange, 
  isOpen, 
  onClose,
  adminUser, // represents current realtor
  onLogout 
}) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Главная панель', icon: LayoutDashboard },
    { id: 'deals', label: 'Мои сделки', icon: Handshake },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'helpdesk', label: 'Служба поддержки', icon: LifeBuoy },
    { id: 'profile', label: 'Профиль & Компания', icon: User },
  ];

  return (
    <>
      {/* Mobile background backdrop overlays */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#111111]/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300" 
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 bg-[#111111] z-50 w-72 transform lg:transform-none transition-transform duration-300 ease-in-out flex flex-col justify-between py-6 px-6 text-white
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col gap-8">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm">
                <svg viewBox="0 0 100 100" className="w-8 h-8" fill="none" stroke="#A38D6D" strokeLinecap="round" strokeLinejoin="round">
                  {/* Roof (Chevron) */}
                  <path d="M 24 44 L 50 18 L 76 44" strokeWidth="4.5" />
                  {/* Center Stem */}
                  <path d="M 50 18 L 50 82" strokeWidth="4" />
                  {/* Arch / Portal */}
                  <path d="M 36 82 L 36 50 A 14 14 0 0 1 64 50 L 64 82" strokeWidth="4" />
                  {/* Baseline */}
                  <line x1="20" y1="82" x2="80" y2="82" strokeWidth="4.5" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="font-serif text-xl tracking-[0.25em] text-white uppercase font-bold leading-none">
                  ATRIA
                </h1>
                <span className="text-[8px] uppercase tracking-wider text-[#A38D6D] font-bold font-mono block mt-1.5">
                  REALTOR CRM
                </span>
              </div>
            </div>

            {/* Mobile close trigger */}
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded cursor-pointer"
              id="sidebar-close-btn"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Realtor identity */}
          {adminUser && (
            <div className="bg-white/5 border border-white/10 rounded-sm p-3.5 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#A38D6D] text-white font-serif flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {adminUser.avatar}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-serif font-semibold text-white truncate leading-tight">
                    {adminUser.name}
                  </h4>
                  <p className="text-[8px] font-mono font-bold uppercase text-[#A38D6D] tracking-wider mt-0.5 truncate">
                    {adminUser.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1" id="sidebar-navbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    onSectionChange(item.id);
                    onClose();
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[11px] font-sans font-semibold uppercase tracking-widest rounded transition-all duration-200 text-left cursor-pointer group
                    ${isActive 
                      ? 'bg-white/10 text-white border-l-2 border-[#A38D6D]' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon 
                    size={15} 
                    className={`transition-colors duration-200 
                      ${isActive ? 'text-[#A38D6D]' : 'text-white/30 group-hover:text-[#A38D6D]'}
                    `} 
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A38D6D] ml-auto animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Brand footer inside Sidebar */}
        <div className="border-t border-white/10 pt-4 text-left">
          <div className="flex flex-col gap-3">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-900/30 hover:border-rose-800/50 text-rose-200 hover:text-white text-[10px] uppercase font-bold tracking-widest rounded transition-all cursor-pointer"
            >
              <LogOut size={12} />
              <span>Выйти из панели</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
