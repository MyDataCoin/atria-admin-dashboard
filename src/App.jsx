import React, { useState } from 'react';
import api, { decodeJwt, tokenStore } from './api';
import AdminApp from './AdminApp';
import RealtorApp from './RealtorApp';
import SuperAdminApp from './SuperAdminApp';
import PasswordInput from './components/PasswordInput';
import BlockedScreen from './components/BlockedScreen';
import { INITIAL_REALTORS } from './realtor/data';

import { RefreshCw } from 'lucide-react';

// --- Role detection --------------------------------------------------------
// Both admin and realtor log in against the same backend but through different
// endpoints; the resulting JWT carries the account's role. We normalise it here
// so the router below is case-insensitive to whatever casing the API uses
// ('realtor' / 'Realtor' / 'REALTOR').
function roleFromToken(token) {
  const p = token ? decodeJwt(token) : null;
  const raw = (p?.role || '').toString().toLowerCase();
  // Super admin — matched before plain admin (its string contains "admin"). The exact
  // claim spelling is TBD on the backend, so accept a few forms.
  if (raw.includes('super')) return 'superadmin';
  if (raw.includes('realtor')) return 'realtor';
  // Anything else authenticated against this backend is treated as staff/admin.
  return p ? 'admin' : null;
}

// Build the dashboard user object from a decoded JWT payload, shaped per role.
function userFromToken(token) {
  const p = token ? decodeJwt(token) : null;
  if (!p) return null;
  const role = roleFromToken(token);
  if (role === 'realtor') {
    // The realtor profile is fetched later (GET /realtor/me); seed from the mock
    // profile so the workspace has a name/company before that resolves.
    return { ...INITIAL_REALTORS[0], id: p.sub || INITIAL_REALTORS[0].id, apiRole: p.role };
  }
  const isSuper = role === 'superadmin';
  return {
    id: p.sub,
    name: p.email || p.role || (isSuper ? 'Super Admin' : 'Admin'),
    username: p.email || (isSuper ? 'superadmin' : 'admin'),
    role: p.role,
    avatar: isSuper ? 'SA' : (p.role || 'ADMIN'),
  };
}

export default function App() {
  // Restore the session from a token persisted in localStorage; the API client
  // auto-refreshes the access token so a page reload keeps the user signed in.
  const [role, setRole] = useState(() => roleFromToken(tokenStore.access));
  const [currentUser, setCurrentUser] = useState(() => userFromToken(tokenStore.access));

  // Authorization form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  // Set when the backend rejects a login because the account is banned (403 "banned").
  // Shows the blocked screen with an appeal form instead of the normal login error.
  const [blockedUser, setBlockedUser] = useState(null);

  // Unified login: the same form serves both roles. We try the admin endpoint
  // first and fall back to the realtor endpoint on an auth failure (401/400),
  // then read the role straight from the returned JWT. The user never has to
  // pick "admin vs realtor" — the account decides.
  // A banned account is rejected with 403 carrying a "banned" marker (title/detail/
  // reason). Distinguishes a ban from a wrong password (401) or any other 403.
  const isBanError = (err) => {
    if (err?.status !== 403) return false;
    const p = err.problem || {};
    const hay = `${p.title || ''} ${p.detail || ''} ${p.reason || ''} ${p.code || ''}`.toLowerCase();
    return hay.includes('ban') || hay.includes('block') || p.reason === 'banned';
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    const username = loginUser.trim();
    try {
      let tokens;
      try {
        tokens = await api.auth.adminLogin(username, loginPass);
      } catch (adminErr) {
        // A ban is final — don't retry the realtor endpoint, show the blocked screen.
        if (isBanError(adminErr)) throw adminErr;
        // Only fall through to the realtor endpoint on a credentials rejection;
        // a network/server error should surface as-is.
        if (adminErr?.status === 401 || adminErr?.status === 400) {
          tokens = await api.auth.realtorLogin(username, loginPass);
        } else {
          throw adminErr;
        }
      }

      setRole(roleFromToken(tokens.accessToken));
      setCurrentUser(userFromToken(tokens.accessToken) || { name: username, username });
      setLoginPass('');
    } catch (err) {
      if (isBanError(err)) {
        // The backend includes the ban reason in the 403 body (a few likely field names).
        const p = err.problem || {};
        const reason = p.reason && p.reason !== 'banned' ? p.reason : p.banReason || p.detail || '';
        setBlockedUser({ username, reason });
        setLoginPass('');
      } else {
        setLoginError(
          err?.status === 401 || err?.status === 400
            ? 'Неверный логин или пароль.'
            : (err?.message || 'Не удалось войти. Проверьте соединение с сервером.')
        );
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // Logout — clears the tokens and returns to the login form. The individual
  // workspaces call this via their onLogout prop after their own bookkeeping.
  const handleLogout = () => {
    api.auth.logout(); // clears tokens from localStorage
    setCurrentUser(null);
    setRole(null);
    setLoginUser('');
    setLoginPass('');
  };

  // --- Authenticated: route to the workspace for the account's role ---------
  if (currentUser) {
    if (role === 'superadmin') {
      return <SuperAdminApp currentUser={currentUser} onLogout={handleLogout} />;
    }
    if (role === 'realtor') {
      return <RealtorApp currentUser={currentUser} onLogout={handleLogout} />;
    }
    return <AdminApp currentUser={currentUser} onLogout={handleLogout} />;
  }

  // --- Banned account: locked-out screen with an appeal form ----------------
  if (blockedUser) {
    return (
      <BlockedScreen
        username={blockedUser.username}
        reason={blockedUser.reason}
        onBack={() => setBlockedUser(null)}
      />
    );
  }

  // --- Unauthenticated: unified login form ----------------------------------
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
            ATRIA
          </h1>
          <span className="text-[9px] uppercase tracking-widest text-[#A38D6D] font-bold font-mono block">
            ЕДИНЫЙ ВХОД • АДМИН И РИЕЛТОР
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
              placeholder="например: admin или realtor"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400 font-mono">
              Пароль
            </label>
            <PasswordInput
              required
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#A38D6D] text-white focus:outline-none rounded font-mono"
              iconClassName="text-gray-500 hover:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 bg-[#A38D6D] hover:bg-[#8e7b5e] text-white rounded font-mono text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {loggingIn && <RefreshCw size={12} className="animate-spin" />}
            {loggingIn ? 'Вход…' : 'Авторизоваться'}
          </button>
        </form>

        <p className="text-[8px] text-center text-gray-600 font-mono">
          Дешборд определяется по роли учётной записи. Сессия хранится в localStorage.
        </p>

      </div>
    </div>
  );
}