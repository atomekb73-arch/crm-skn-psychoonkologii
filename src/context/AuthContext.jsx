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

export const DEFAULT_USER = {
  email: 'atomekb73@gmail.com',
  name: 'Tomasz Bratkowski',
  avatarUrl: '',
  role: 'SUPER_ADMIN',
  accessibleOrgs: ['*'], // '*' oznacza dostęp do wszystkich kół
};

export const DEMO_ACCOUNTS = [
  {
    email: 'atomekb73@gmail.com',
    name: 'Tomasz Bratkowski',
    role: 'SUPER_ADMIN',
    accessibleOrgs: ['*'],
    description: 'Konto aktywne',
  },
  {
    email: 'zarzad.psychoonkologia@wskz.pl',
    name: 'Zarząd SKN Psychoonkologii',
    role: 'COORDINATOR',
    accessibleOrgs: ['skn-psychoonkologia'],
    description: 'Dostęp dedykowany do koła',
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
    description: 'Ewidencja i sprawozdania',
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
      const saved = localStorage.getItem('crm_psychoonkologia_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('crm_psychoonkologia_auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('crm_psychoonkologia_auth_user');
      }
    } catch (err) {
      console.error('Błąd zapisu crm_psychoonkologia_auth_user:', err);
    }
  }, [user]);

  /** Weryfikacja czy użytkownik ma uprawnienia do danego koła */
  const canAccessOrg = useCallback((orgId) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (Array.isArray(user.accessibleOrgs)) {
      return user.accessibleOrgs.includes('*') || user.accessibleOrgs.includes(orgId);
    }
    return false;
  }, [user]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCoordinator = user?.role === 'COORDINATOR' || isSuperAdmin;
  const isViewer = user?.role === 'VIEWER';

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
    const isOwner = email === 'atomekb73@gmail.com';

    const newUser = {
      email,
      name: payload.name || payload.given_name || email.split('@')[0],
      avatarUrl: payload.picture || '',
      role: isOwner ? 'SUPER_ADMIN' : 'COORDINATOR',
      accessibleOrgs: isOwner ? ['*'] : ['skn-psychoonkologia'],
      token: credentialResponse.credential,
    };

    setUser(newUser);
    setIsAuthenticated(true);
  }, []);

  /** Przełącz profil demonstracyjny */
  const switchDemoAccount = useCallback((account) => {
    setUser({
      ...account,
      avatarUrl: account.avatarUrl || '',
    });
    setIsAuthenticated(true);
  }, []);

  /** Wylogowanie */
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    try {
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
