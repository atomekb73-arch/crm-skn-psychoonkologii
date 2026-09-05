import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export const ROLES = {
  SUPER_ADMIN: {
    id: 'SUPER_ADMIN',
    label: '',
    badgeClass: 'hidden',
    description: 'Pełny dostęp do konfiguracji i ustawień',
  },
  COORDINATOR: {
    id: 'COORDINATOR',
    label: '',
    badgeClass: 'hidden',
    description: 'Dostęp operacyjny',
  },
  VIEWER: {
    id: 'VIEWER',
    label: '',
    badgeClass: 'hidden',
    description: 'Dostęp do ewidencji',
  },
};

export const MASTER_ADMIN_EMAILS = [
  'atomekb73@gmail.com',
  'atonex73@gmail.com',
  'psychoonkologia.wskz@gmail.com',
];

export const ACCESS_PASSWORDS = [
  'Psycho2026!',
  'Psychoonkologia2026!',
  'wskz2026',
  'skn2026',
  import.meta.env?.VITE_ACCESS_PASSWORD,
].filter(Boolean);

export const DEFAULT_USER = {
  email: 'zarzad.psychoonkologia@wskz.pl',
  name: 'Zarząd SKN Psychoonkologii',
  avatarUrl: '',
  role: 'SUPER_ADMIN',
  accessibleOrgs: ['*'], // Pełne uprawnienia administracyjne
};

export const DEMO_ACCOUNTS = [
  {
    email: 'zarzad.psychoonkologia@wskz.pl',
    name: 'Zarząd SKN Psychoonkologii',
    role: 'SUPER_ADMIN',
    accessibleOrgs: ['*'],
    description: 'Dostęp zarządu (pełne uprawnienia)',
  },
  {
    email: 'opiekun.psychoonkologia@wskz.pl',
    name: 'Opiekun Koła',
    role: 'COORDINATOR',
    accessibleOrgs: ['*'],
    description: 'Opiekun naukowy koła',
  },
  {
    email: 'audytor@wskz.pl',
    name: 'Podgląd / Audyt',
    role: 'VIEWER',
    accessibleOrgs: ['*'],
    description: 'Ewidencja i sprawozdania (tylko odczyt)',
  },
];

const AuthContext = createContext(null);

/** Prosty dekoder JWT Payload dla Google OAuth 2.0 Identity Services */
function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Błąd dekodowania JWT:', e);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const session = localStorage.getItem('crm_psychoonkologia_auth_session');
      const saved = localStorage.getItem('crm_psychoonkologia_auth_user');
      if (session && saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          const email = (parsed.email || '').toLowerCase();
          const name = (parsed.name || '').toLowerCase();
          if (name.includes('bratkowski') && !parsed.token) {
            return DEFAULT_USER;
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const session = localStorage.getItem('crm_psychoonkologia_auth_session');
      const saved = localStorage.getItem('crm_psychoonkologia_auth_user');
      return !!(session && saved);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (user && isAuthenticated) {
        localStorage.setItem('crm_psychoonkologia_auth_user', JSON.stringify(user));
        localStorage.setItem('crm_psychoonkologia_auth_session', JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role,
          timestamp: Date.now(),
        }));
      } else if (!isAuthenticated) {
        localStorage.removeItem('crm_psychoonkologia_auth_user');
        localStorage.removeItem('crm_psychoonkologia_auth_session');
      }
    } catch (err) {
      console.error('Błąd zapisu sesji auth:', err);
    }
  }, [user, isAuthenticated]);

  const isMasterUser = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    return MASTER_ADMIN_EMAILS.some(mEmail => mEmail.toLowerCase().trim() === userEmail);
  }, [user]);

  /** Weryfikacja czy użytkownik ma uprawnienia do danego koła */
  const canAccessOrg = useCallback((orgId) => {
    if (!user || !isAuthenticated) return false;
    if (isMasterUser || user.role === 'SUPER_ADMIN') return true;
    if (Array.isArray(user.accessibleOrgs)) {
      return user.accessibleOrgs.includes('*') || user.accessibleOrgs.includes(orgId);
    }
    return false;
  }, [user, isAuthenticated, isMasterUser]);

  const isSuperAdmin = isMasterUser || user?.role === 'SUPER_ADMIN';
  const isCoordinator = user?.role === 'COORDINATOR' || isSuperAdmin;
  const isViewer = user?.role === 'VIEWER';

  /** Logowanie z weryfikacją adresu e-mail i hasła dostępowego */
  const loginWithCredentials = useCallback((inputEmail, inputPassword) => {
    if (!inputEmail || !inputPassword) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPassword = inputPassword.trim();

    // 1. Sprawdź hasło dostępowe
    const isPasswordValid = ACCESS_PASSWORDS.some(p => p && p.trim() === cleanPassword);
    if (!isPasswordValid) {
      return { success: false, error: 'Nieprawidłowe hasło dostępowe koła.' };
    }

    // 2. Zbierz listę autoryzowanych adresów e-mail
    const isMaster = MASTER_ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);
    const isDefaultBoard = cleanEmail === 'zarzad.psychoonkologia@wskz.pl' || cleanEmail === 'skn.psychoonkologia@wskz.pl';
    const demoMatch = DEMO_ACCOUNTS.find(d => d.email.toLowerCase() === cleanEmail);

    let accessUsers = [];
    try {
      const savedUsers = localStorage.getItem('skn_access_users');
      if (savedUsers) {
        accessUsers = JSON.parse(savedUsers);
      }
    } catch {}
    const accessMatch = Array.isArray(accessUsers)
      ? accessUsers.find(u => (u?.email || '').toLowerCase() === cleanEmail)
      : null;

    if (!isMaster && !isDefaultBoard && !demoMatch && !accessMatch) {
      return {
        success: false,
        error: 'Adres e-mail nie posiada uprawnień dostępu. Skontaktuj się z Zarządem Koła w celu dodania uprawnień w panelu Ustawienia.',
      };
    }

    // 3. Utwórz profil zautoryzowanego użytkownika
    let role = 'COORDINATOR';
    let name = cleanEmail.split('@')[0];
    let accessibleOrgs = ['*'];

    if (isMaster) {
      role = 'SUPER_ADMIN';
      name = 'Zarząd SKN Psychoonkologii';
      accessibleOrgs = ['*'];
    } else if (isDefaultBoard) {
      role = 'SUPER_ADMIN';
      name = 'Zarząd SKN Psychoonkologii';
      accessibleOrgs = ['*'];
    } else if (demoMatch) {
      role = demoMatch.role || 'COORDINATOR';
      name = demoMatch.name;
      accessibleOrgs = demoMatch.accessibleOrgs || ['*'];
    } else if (accessMatch) {
      role = accessMatch.role === 'ADMIN' ? 'SUPER_ADMIN' : (accessMatch.role || 'COORDINATOR');
      name = accessMatch.name || cleanEmail.split('@')[0];
      accessibleOrgs = ['*'];
    }

    const authUser = {
      email: cleanEmail,
      name,
      role,
      accessibleOrgs,
      loggedAt: new Date().toISOString(),
    };

    setUser(authUser);
    setIsAuthenticated(true);

    try {
      localStorage.setItem('crm_psychoonkologia_auth_session', JSON.stringify({
        email: cleanEmail,
        name,
        role,
        timestamp: Date.now(),
      }));
      localStorage.setItem('crm_psychoonkologia_auth_user', JSON.stringify(authUser));
    } catch (e) {
      console.warn('Błąd zapisu sesji auth:', e);
    }

    return { success: true };
  }, []);

  /** Logowanie za pomocą Google OAuth 2.0 (Google Identity Services / @react-oauth/google ready) */
  const loginWithGoogle = useCallback((credentialResponse) => {
    if (!credentialResponse?.credential) {
      console.error('Brak tokenu w odpowiedzi Google OAuth');
      return;
    }

    const payload = parseJwtPayload(credentialResponse.credential);
    if (!payload || !payload.email) {
      console.error('Nieprawidłowy payload Google OAuth');
      return;
    }

    const email = payload.email.toLowerCase().trim();
    const isMaster = MASTER_ADMIN_EMAILS.some(mEmail => mEmail.toLowerCase().trim() === email);

    const newUser = {
      email,
      name: payload.name || payload.given_name || email.split('@')[0],
      avatarUrl: payload.picture || '',
      role: isMaster ? 'SUPER_ADMIN' : 'COORDINATOR',
      accessibleOrgs: isMaster ? ['*'] : ['skn-psychoonkologia'],
      token: credentialResponse.credential,
    };

    setUser(newUser);
    setIsAuthenticated(true);
  }, []);

  /** Przełącz profil demonstracyjny */
  const switchDemoAccount = useCallback((account) => {
    const updated = {
      ...account,
      avatarUrl: account.avatarUrl || '',
    };
    setUser(updated);
    setIsAuthenticated(true);
  }, []);

  /** Wylogowanie */
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('crm_psychoonkologia_auth_session');
      localStorage.removeItem('crm_psychoonkologia_auth_user');
      localStorage.removeItem('crm_auth_user');
    } catch {}
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isSuperAdmin,
    isCoordinator,
    isViewer,
    canAccessOrg,
    loginWithCredentials,
    loginWithGoogle,
    switchDemoAccount,
    logout,
    setUser,
  }), [
    user,
    isAuthenticated,
    isSuperAdmin,
    isCoordinator,
    isViewer,
    canAccessOrg,
    loginWithCredentials,
    loginWithGoogle,
    switchDemoAccount,
    logout,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
