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

/** Pobierz zapisane hasło użytkownika */
export function getUserStoredPassword(email) {
  if (!email) return null;
  try {
    const raw = localStorage.getItem('skn_user_passwords');
    if (raw) {
      const passwords = JSON.parse(raw);
      if (passwords && passwords[email.toLowerCase().trim()]) {
        return passwords[email.toLowerCase().trim()];
      }
    }
  } catch {}
  return null;
}

/** Sprawdź czy użytkownik loguje się po raz pierwszy */
export function getUserFirstLoginStatus(email, userRecord = null) {
  if (!email) return true;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const raw = localStorage.getItem('skn_user_first_login_status');
    if (raw) {
      const statusMap = JSON.parse(raw);
      if (statusMap && cleanEmail in statusMap) {
        return !!statusMap[cleanEmail];
      }
    }
  } catch {}

  // Jeśli użytkownik ma już zapisane własne hasło w skn_user_passwords, to nie jest pierwsze logowanie
  const customPass = getUserStoredPassword(cleanEmail);
  if (customPass) {
    return false;
  }

  // Jeśli rekord użytkownika ma jawnie isFirstLogin: false
  if (userRecord && userRecord.isFirstLogin === false) {
    return false;
  }

  // Domyślnie nowe konta wymagają zmiany hasła przy pierwszym wejściu
  return true;
}

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

  /** Logowanie z weryfikacją adresu e-mail, hasła i flagi pierwszego logowania */
  const loginWithCredentials = useCallback((inputEmail, inputPassword) => {
    if (!inputEmail || !inputPassword) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPassword = inputPassword.trim();

    // 1. Zbierz listę autoryzowanych adresów e-mail
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

    // 2. Weryfikacja hasła dostępowego
    const customPassword = getUserStoredPassword(cleanEmail);
    let isPasswordValid = false;

    if (customPassword) {
      // Użytkownik ustawił już własne hasło
      isPasswordValid = customPassword === cleanPassword;
    } else {
      // Użytkownik podaje hasło startowe / tymczasowe
      const allowedTempPasswords = [
        accessMatch?.tempPassword,
        ...ACCESS_PASSWORDS,
      ].filter(Boolean);
      isPasswordValid = allowedTempPasswords.some(p => p && p.trim() === cleanPassword);
    }

    if (!isPasswordValid) {
      return { success: false, error: 'Nieprawidłowe hasło dostępowe.' };
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

    // 4. Sprawdź czy to pierwsze logowanie
    const isFirstLogin = getUserFirstLoginStatus(cleanEmail, accessMatch);

    if (isFirstLogin) {
      return {
        success: true,
        requiresPasswordChange: true,
        user: authUser,
      };
    }

    // Zalogowanie bez zmiany hasła
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

    return { success: true, requiresPasswordChange: false };
  }, []);

  /** Zmiana hasła przy pierwszym logowaniu lub na żądanie */
  const changePassword = useCallback((email, newPassword, confirmPassword, userData = null) => {
    if (!email || !newPassword || !confirmPassword) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();

    if (p1.length < 8) {
      return { success: false, error: 'Nowe hasło musi zawierać co najmniej 8 znaków.' };
    }

    if (p1 !== p2) {
      return { success: false, error: 'Wprowadzone hasła nie są identyczne.' };
    }

    if (p1 === 'Psycho2026!' || p1 === 'Psychoonkologia2026!' || p1 === 'wskz2026') {
      return { success: false, error: 'Nowe hasło nie może być hasłem startowym. Wybierz inne, bezpieczne hasło.' };
    }

    try {
      // 1. Zapisz nowe hasło w rejestrze haseł użytkowników
      let passwords = {};
      try {
        const rawPass = localStorage.getItem('skn_user_passwords');
        if (rawPass) passwords = JSON.parse(rawPass);
      } catch {}
      passwords[cleanEmail] = p1;
      localStorage.setItem('skn_user_passwords', JSON.stringify(passwords));

      // 2. Oznacz isFirstLogin jako false
      let statusMap = {};
      try {
        const rawStatus = localStorage.getItem('skn_user_first_login_status');
        if (rawStatus) statusMap = JSON.parse(rawStatus);
      } catch {}
      statusMap[cleanEmail] = false;
      localStorage.setItem('skn_user_first_login_status', JSON.stringify(statusMap));

      // 3. Zaktualizuj rekord w skn_access_users jeśli istnieje
      try {
        const rawUsers = localStorage.getItem('skn_access_users');
        if (rawUsers) {
          const accessUsers = JSON.parse(rawUsers);
          if (Array.isArray(accessUsers)) {
            const updatedUsers = accessUsers.map(u => {
              if ((u?.email || '').toLowerCase() === cleanEmail) {
                return { ...u, isFirstLogin: false, tempPassword: null };
              }
              return u;
            });
            localStorage.setItem('skn_access_users', JSON.stringify(updatedUsers));
          }
        }
      } catch {}

      // 4. Utwórz obiekt zautoryzowanego użytkownika
      const authUser = userData || {
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: cleanEmail.includes('zarzad') ? 'SUPER_ADMIN' : 'COORDINATOR',
        accessibleOrgs: ['*'],
        loggedAt: new Date().toISOString(),
      };

      setUser(authUser);
      setIsAuthenticated(true);

      localStorage.setItem('crm_psychoonkologia_auth_session', JSON.stringify({
        email: cleanEmail,
        name: authUser.name,
        role: authUser.role,
        timestamp: Date.now(),
      }));
      localStorage.setItem('crm_psychoonkologia_auth_user', JSON.stringify(authUser));

      return { success: true };
    } catch (e) {
      console.error('Błąd podczas zapisywania nowego hasła:', e);
      return { success: false, error: 'Wystąpił błąd podczas zapisywania hasła.' };
    }
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

  /** Zmiana hasła przez zalogowanego użytkownika (z weryfikacją aktualnego hasła) */
  const changeUserPassword = useCallback((currentPassword, newPassword, confirmPassword) => {
    if (!user || !user.email) {
      return { success: false, error: 'Brak aktywnej sesji użytkownika.' };
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const curPass = (currentPassword || '').trim();
    const p1 = (newPassword || '').trim();
    const p2 = (confirmPassword || '').trim();

    if (!curPass || !p1 || !p2) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    // 1. Weryfikacja aktualnego hasła
    const customPass = getUserStoredPassword(cleanEmail);
    let isCurrentValid = false;

    if (customPass) {
      isCurrentValid = customPass === curPass;
    } else {
      let accessUsers = [];
      try {
        const savedUsers = localStorage.getItem('skn_access_users');
        if (savedUsers) accessUsers = JSON.parse(savedUsers);
      } catch {}
      const accessMatch = Array.isArray(accessUsers)
        ? accessUsers.find(u => (u?.email || '').toLowerCase() === cleanEmail)
        : null;

      const allowedTempPasswords = [
        accessMatch?.tempPassword,
        ...ACCESS_PASSWORDS,
      ].filter(Boolean);
      isCurrentValid = allowedTempPasswords.some(p => p && p.trim() === curPass);
    }

    if (!isCurrentValid) {
      return { success: false, error: 'Wprowadzone dotychczasowe hasło jest nieprawidłowe.' };
    }

    // 2. Wywołaj właściwą procedurę zmiany hasła
    return changePassword(cleanEmail, p1, p2, user);
  }, [user, changePassword]);

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
    changePassword,
    changeUserPassword,
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
    changePassword,
    changeUserPassword,
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

