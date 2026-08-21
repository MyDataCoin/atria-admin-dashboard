import React, { useEffect, useState } from 'react';
import api, { decodeJwt, tokenStore, onSessionEnded } from './api';
import AdminApp from './AdminApp';
import RealtorApp from './RealtorApp';
import SuperAdminApp from './SuperAdminApp';
import PasswordInput from './components/PasswordInput';
import BlockedScreen from './components/BlockedScreen';
import ForcePasswordChange from './components/ForcePasswordChange';

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
  // Инвестор — НЕ персонал. Раньше сюда попадала любая аутентифицированная роль, и инвесторская
  // сессия открывала админку: refresh-кука общая на зону .atria.kg, так что вход в кабинете
  // инвестора отдавал сюда рабочий токен. Панель рисовалась целиком, а данные не приходили —
  // каждый запрос отвечал 403. Такую сессию здесь не принимаем вовсе.
  if (raw.includes('investor')) return null;
  // Anything else authenticated against this backend is treated as staff/admin.
  return p ? 'admin' : null;
}

// Инициалы для кружка в шапке: «Шахин Сузан» -> «ШС». Одно слово -> первая буква.
function initialsOf(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Build the dashboard user object from a decoded JWT payload, shaped per role.
function userFromToken(token) {
  const p = token ? decodeJwt(token) : null;
  if (!p) return null;
  const role = roleFromToken(token);
  // Роль, которой в этой панели нечего делать (инвестор). Без пользователя роутер ниже покажет
  // форму входа, а не пустую админку.
  if (!role) return null;
  if (role === 'realtor') {
    // The realtor profile is fetched later (GET /realtor/me). Until it resolves the workspace
    // shows neutral placeholders rather than someone else's name and company.
    return { id: p.sub, name: '', companyName: '', apiRole: p.role };
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

/**
 * Достраивает пользователя из JWT данными аккаунта: ФИО (его нет в токене — токен лежит на клиенте,
 * поэтому всё, что в нём, считается опубликованным) и флагом обязательной смены пароля.
 *
 * Если /auth/me недоступен, возвращаем то, что даёт токен: панель должна открыться и без имени.
 */
async function loadCurrentUser(token) {
  const base = userFromToken(token);
  if (!base) return null;
  try {
    const me = await api.auth.me();
    const displayName = me.fullName || me.username || base.name;
    return {
      ...base,
      id: me.id || base.id,
      username: me.username || base.username,
      fullName: me.fullName || '',
      name: displayName,
      role: me.role || base.role,
      avatar: initialsOf(me.fullName) || base.avatar,
      mustChangePassword: !!me.mustChangePassword,
    };
  } catch {
    return base;
  }
}

export default function App() {
  // The access token lives in memory, so a page reload starts with nothing. The session itself
  // survives in an HttpOnly cookie the browser holds, so restoring it means asking the server —
  // see api.auth.restoreSession. Until that answers we render nothing rather than flashing the
  // login form at someone who is already signed in.
  const [role, setRole] = useState(() => roleFromToken(tokenStore.access));
  const [currentUser, setCurrentUser] = useState(() => userFromToken(tokenStore.access));
  const [restoringSession, setRestoringSession] = useState(!tokenStore.isAuthenticated);

  useEffect(() => {
    if (!restoringSession) return undefined;

    let cancelled = false;

    api.auth.restoreSession().then(async (restored) => {
      if (restored) {
        const user = await loadCurrentUser(tokenStore.access);
        if (cancelled) return;
        setRole(roleFromToken(tokenStore.access));
        setCurrentUser(user);
      }

      if (cancelled) return;
      setRestoringSession(false);
    });

    return () => {
      cancelled = true;
    };
  }, [restoringSession]);

  // The client tells us when a session is definitively over — the server refused the refresh token,
  // as opposed to a refresh that merely could not be made right now. Only that is worth returning
  // someone to the login form for; a network blip leaves the session alone and the panel keeps
  // working the moment the connection is back.
  useEffect(
    () =>
      onSessionEnded(() => {
        setCurrentUser(null);
        setRole(null);
      }),
    [],
  );

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
      const user = await loadCurrentUser(tokens.accessToken);
      setCurrentUser(user || { name: username, username });
      // Пароль оставляем в состоянии, только если им же придётся подтверждать смену — форма
      // обязательной смены подставит его, чтобы не просить набрать разовый пароль ещё раз.
      if (!user?.mustChangePassword) setLoginPass('');
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
    // Revokes the refresh token server-side and expires its cookie; clearing only the client's copy
    // would leave the session usable for the rest of the token's lifetime.
    api.auth.logout();
    setCurrentUser(null);
    setRole(null);
    setLoginUser('');
    setLoginPass('');
  };

  // --- Still asking the server whether the cookie names a live session ------
  // Rendering the login form here would flash it at someone who is already signed in, and invite
  // them to type a password they do not need to.
  if (restoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Загрузка…
      </div>
    );
  }

  // --- Аккаунт на разовом пароле: до смены пароля рабочее пространство не открываем ---
  if (currentUser?.mustChangePassword) {
    return (
      <ForcePasswordChange
        fullName={currentUser.fullName}
        username={currentUser.username}
        initialCurrentPassword={loginPass}
        onChanged={async () => {
          setLoginPass('');
          setCurrentUser(await loadCurrentUser(tokenStore.access));
        }}
        onLogout={handleLogout}
      />
    );
  }

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
          Дешборд определяется по роли учётной записи. Сессия хранится в защищённой cookie.
        </p>

      </div>
    </div>
  );
}