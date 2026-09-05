// ─── Special Roles & Faculty Supervisors for SKN Psychoonkologii ─────────────

export const DEFAULT_FACULTY_SUPERVISORS = [];

export const FACULTY_SUPERVISORS = DEFAULT_FACULTY_SUPERVISORS;

export function getStoredSupervisors() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('skn_supervisors_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filtrujemy zaszłościowych opiekunów z poprzednich instancji
        return parsed.filter(s => {
          const email = (s?.email || '').toLowerCase();
          const name = (s?.name || s?.fullName || '').toLowerCase();
          return !email.includes('skupinska') && !email.includes('dziekan') &&
                 !name.includes('skupińska') && !name.includes('skupinska') &&
                 !name.includes('dziekan');
        });
      }
    }
  } catch {}
  return [];
}

export const PARTICIPANT_ROLES = {
  member: {
    id: 'member',
    label: 'Członek koła',
    icon: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Student / aktywny członek koła (wliczany do frekwencji)',
    isStudent: true,
  },
  supervisor: {
    id: 'supervisor',
    label: 'Opiekun Koła',
    icon: '🎓',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
    description: 'Oficjalny Opiekun Koła Naukowego (protokół)',
    isStudent: false,
  },
  speaker: {
    id: 'speaker',
    label: 'Prelegent / Wykładowca',
    icon: '🎤',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    description: 'Prowadzący spotkanie / prelegent gościnny',
    isStudent: false,
  },
  guest: {
    id: 'guest',
    label: 'Gość zewnętrzny',
    icon: '👤',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Uczestnik otwarty / gość spoza koła',
    isStudent: false,
  },
};

/**
 * Usuwa polskie znaki diakrytyczne i normalizuje tekst
 */
export function normalizeDiacritics(str) {
  if (!str) return '';
  return String(str)
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Sztywne mapowania niestandardowych wpisów na profile studentów
 */
export const CUSTOM_MAPPINGS = [
  {
    match: (text) => {
      const norm = normalizeDiacritics(text);
      return (
        norm.includes('34327') ||
        norm.includes('lyniewsk') ||
        norm.includes('monikaa.lyniewska')
      );
    },
    member: {
      id: 'm_monika_lyniewska',
      index: '34327',
      firstName: 'Monika',
      lastName: 'Łyniewska',
      fullName: 'Monika Łyniewska',
      email: 'monikaa.lyniewska@gmail.com',
      status: 'active',
      field: 'Seksuologia',
    },
  },
];

/**
 * Sprawdza, czy dany wpis odpowiada Monice Łyniewskiej
 */
export function isMonikaLyniewska(nameOrEmailOrIndex) {
  if (!nameOrEmailOrIndex) return false;
  const norm = normalizeDiacritics(nameOrEmailOrIndex);
  return (
    norm.includes('34327') ||
    norm.includes('lyniewsk') ||
    norm.includes('monikaa.lyniewska')
  );
}

/**
 * Zwraca sztywno dopasowany profil z CUSTOM_MAPPINGS jeśli istnieje
 */
export function getCustomMappedMember(nameOrEmailOrIndex) {
  if (!nameOrEmailOrIndex) return null;
  const matchObj = CUSTOM_MAPPINGS.find(m => m.match(nameOrEmailOrIndex));
  return matchObj ? matchObj.member : null;
}

/**
 * Znajduje pasującego opiekuna na podstawie imienia, nazwiska, aliasu lub e-maila
 */
export function findMatchingSupervisor(nameOrEmail, customSupervisors = null) {
  if (!nameOrEmail) return null;
  const norm = normalizeDiacritics(nameOrEmail);
  const list = Array.isArray(customSupervisors) && customSupervisors.length > 0
    ? customSupervisors
    : getStoredSupervisors();

  return list.find(sup => {
    if (!sup.isActive && sup.isActive !== undefined) return false;
    const supNorm = normalizeDiacritics(sup.name || sup.fullName);
    if (supNorm && (norm === supNorm || norm.includes(supNorm) || supNorm.includes(norm))) return true;
    if (sup.email && norm.includes(normalizeDiacritics(sup.email))) return true;
    if (Array.isArray(sup.aliases)) {
      return sup.aliases.some(alias => norm.includes(normalizeDiacritics(alias)));
    }
    return false;
  }) || null;
}

/**
 * Sprawdza, czy dana nazwa lub e-mail odpowiada oficjalnemu opiekunowi koła
 */
export function isFacultySupervisor(nameOrEmail, customSupervisors = null) {
  return findMatchingSupervisor(nameOrEmail, customSupervisors) != null;
}

/**
 * Automatyczne wykrycie roli uczestnika
 */
export function detectParticipantRole(rawName, member = null, customSupervisors = null) {
  if (isFacultySupervisor(rawName, customSupervisors) || (member && isFacultySupervisor(member.fullName, customSupervisors))) {
    return 'supervisor';
  }
  if (isMonikaLyniewska(rawName) || (member && isMonikaLyniewska(member.index || member.fullName))) {
    return 'member';
  }
  if (member) {
    return 'member';
  }
  return 'member';
}
