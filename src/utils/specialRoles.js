// ─── Special Roles & Faculty Supervisors for SKN Psychoonkologii ─────────────

export const DEFAULT_FACULTY_SUPERVISORS = [
  {
    id: 'sup_ewa_skupinska',
    name: 'dr Ewa Skupińska',
    fullName: 'dr Ewa Skupińska',
    academicTitle: 'dr',
    firstName: 'Ewa',
    lastName: 'Skupińska',
    email: 'ewa.skupinska@wskz.pl',
    role: 'Opiekun Naukowy Koła',
    affiliation: 'Wydział Psychologii WSKZ',
    aliases: [
      'Ewa Skupińska',
      'Ewa Skupinska',
      'dr Ewa Skupińska',
      'dr Ewa Skupinska',
      'mgr Ewa Skupińska',
      'mgr Ewa Skupinska',
      'Skupińska Ewa',
      'Skupinska Ewa',
    ],
    isActive: true,
  },
  {
    id: 'sup_martyna_dziekan',
    name: 'dr Martyna Dziekan',
    fullName: 'dr Martyna Dziekan',
    academicTitle: 'dr',
    firstName: 'Martyna',
    lastName: 'Dziekan',
    email: 'martyna.dziekan@wskz.pl',
    role: 'Opiekun Naukowy Koła',
    affiliation: 'Wydział Psychologii WSKZ',
    aliases: [
      'Martyna Dziekan',
      'dr Martyna Dziekan',
      'mgr Martyna Dziekan',
      'Dziekan Martyna',
    ],
    isActive: true,
  },
];

export const FACULTY_SUPERVISORS = DEFAULT_FACULTY_SUPERVISORS;

export function getStoredSupervisors() {
  if (typeof window === 'undefined') return DEFAULT_FACULTY_SUPERVISORS;
  try {
    const saved = localStorage.getItem('skn_supervisors_config') || localStorage.getItem('crm_supervisors_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_FACULTY_SUPERVISORS;
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
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
    description: 'Prowadzący spotkanie / prelegent gościnny / gość specjalny',
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
 * Znajduje pasującego opiekuna na podstawie pełnego imienia, nazwiska, aliasu lub e-maila
 * Wymaga ścisłego dopasowania pełnego imienia i nazwiska (lub odwróconej kolejności "Nazwisko Imię")
 */
export function findMatchingSupervisor(nameOrEmail, customSupervisors = null) {
  if (!nameOrEmail) return null;
  const clean = String(nameOrEmail).replace(/^\[.*?\]\s*/, '').trim();
  const norm = normalizeDiacritics(clean).replace(/\s+/g, ' ').toLowerCase().trim();
  if (!norm || norm.length < 3) return null;

  const list = Array.isArray(customSupervisors) && customSupervisors.length > 0
    ? customSupervisors
    : getStoredSupervisors();

  // Strip academic titles for comparison (mgr, dr, prof, hab, lek, inż)
  const stripTitles = (s) => s.replace(/\b(mgr|dr|prof|hab|lek|inz|lic)\.?\s*/gi, '').replace(/\s+/g, ' ').trim();
  const cleanNorm = stripTitles(norm);

  return list.find(sup => {
    if (!sup.isActive && sup.isActive !== undefined) return false;
    const supFullName = sup.fullName || sup.name || '';
    const supNorm = normalizeDiacritics(supFullName).replace(/\s+/g, ' ').toLowerCase().trim();
    if (!supNorm) return false;

    // 1. Strict full name equality
    if (norm === supNorm) return true;

    const cleanSupNorm = stripTitles(supNorm);
    if (cleanSupNorm && cleanNorm && cleanNorm === cleanSupNorm) return true;

    // 2. Strict reverse order ("Nazwisko Imię")
    const parts = cleanSupNorm.split(' ');
    if (parts.length === 2) {
      const rev = `${parts[1]} ${parts[0]}`;
      if (cleanNorm === rev) return true;
    }

    // 3. Email strict match
    if (sup.email) {
      const em = normalizeDiacritics(sup.email).toLowerCase().trim();
      if (em && (norm === em || (em.length > 5 && norm.includes(em)))) return true;
    }

    // 4. Supervisor aliases (exact match)
    if (Array.isArray(sup.aliases)) {
      return sup.aliases.some(alias => {
        const aNorm = normalizeDiacritics(alias).replace(/\s+/g, ' ').toLowerCase().trim();
        return aNorm && (norm === aNorm || cleanNorm === aNorm);
      });
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
 * Czyści identyfikatory uczestników ze zniekształceń, prefiksów ("Indeks: ") oraz tagów ról ([OPIEKUN]:, [SPEAKER]:, itp.)
 */
export function cleanParticipantIdentifier(raw) {
  if (!raw) {
    return {
      cleanText: '',
      tagRole: null,
      isSupervisor: false,
      isSpeaker: false,
      isGuest: false,
      indexes: [],
    };
  }

  let str = String(raw).trim();

  // 1. Usuń sztuczne prefiksy "Indeks: ", "index: ", "nr: ", "id: "
  str = str.replace(/^(indeks|index|nr|id)\s*:\s*/i, '').trim();

  let tagRole = null;
  let isSupervisor = false;
  let isSpeaker = false;
  let isGuest = false;

  // 2. Rozpoznaj i wytnij tagi ról w nawiasach kwadratowych
  const tagMatch = str.match(/^\[(OPIEKUN|SPEAKER|PRELEGENT|GOŚĆ|GOSC|CZŁONEK KOŁA|CZLONEK KOLA|CZŁONEK|CZLONEK|UCZESTNIK)\]:?\s*/i);
  if (tagMatch) {
    const tag = tagMatch[1].toUpperCase();
    if (tag.includes('OPIEKUN')) {
      tagRole = 'supervisor';
      isSupervisor = true;
    } else if (tag.includes('SPEAKER') || tag.includes('PRELEGENT')) {
      tagRole = 'speaker';
      isSpeaker = true;
    } else if (tag.includes('GOŚĆ') || tag.includes('GOSC')) {
      tagRole = 'guest';
      isGuest = true;
    } else if (tag.includes('CZŁONEK') || tag.includes('CZLONEK') || tag.includes('UCZESTNIK')) {
      tagRole = 'member';
    }
    str = str.slice(tagMatch[0].length).trim();
  }

  // Ponowne czyszczenie z ewentualnych zagnieżdżonych prefiksów (np. "Indeks: [OPIEKUN]: ...")
  str = str.replace(/^(indeks|index|nr|id)\s*:\s*/i, '').trim();

  // 3. Wyodrębnij wszystkie 3-6 cyfrowe numery indeksów (np. "5764, 11487" -> ["5764", "11487"])
  const indexes = (str.match(/\b\d{3,6}\b/g) || []).map(s => s.trim());

  return {
    cleanText: str,
    tagRole,
    isSupervisor,
    isSpeaker,
    isGuest,
    indexes,
  };
}

/**
 * Rygorystyczny algorytm dopasowywania uczestników z Google Meet (Waterfall Matching):
 * 1. Exact Match (1:1):
 *    - Pełna zgodność „Imię Nazwisko” lub „Nazwisko Imię” (case-insensitive, znormalizowane spacje i diakrytyki)
 *    - Dokładny numer indeksu (w tym obsługa ciągów wielu indeksów "5764, 11487")
 *    - Pełna zgodność adresu e-mail
 * 2. Alias Match:
 *    - Zgodność ze słownikiem aliasów (aliasesMap)
 *    - Zgodność z polem aliasy w rekordzie członka (m.aliases / m.aliasy)
 * 3. Brak dopasowania:
 *    - ZAKAZ łączenia po samym nazwisku lub rdzeniu słowa. Zwraca null (status Gość zewnętrzny).
 */
export function matchMemberWaterfall(nameOrIndexOrQuery, members = [], aliasesMap = {}) {
  if (!nameOrIndexOrQuery || !Array.isArray(members) || members.length === 0) return null;
  
  const parsed = cleanParticipantIdentifier(nameOrIndexOrQuery);
  const clean = parsed.cleanText;
  if (!clean || clean.length < 2) return null;

  const normQuery = normalizeDiacritics(clean).replace(/\s+/g, ' ').toLowerCase().trim();

  // 0. Hardcoded Custom mappings (np. Monika Łyniewska - 34327)
  const customMapped = getCustomMappedMember(clean);
  if (customMapped) {
    const foundInDb = members.find(m => String(m.index || m.nrIndeksu || '').trim() === customMapped.index);
    return foundInDb || customMapped;
  }

  // 1. Exact Index Match (jeśli zapytanie zawiera jeden lub więcej 3-6 cyfrowych numerów indeksu)
  if (parsed.indexes && parsed.indexes.length > 0) {
    for (const extractedNum of parsed.indexes) {
      const memberByIdx = members.find(m => {
        const mIdx = String(m.index || m.nrIndeksu || '').trim();
        return mIdx && mIdx === extractedNum;
      });
      if (memberByIdx) return memberByIdx;
    }
  }

  // 2. Exact Match (1:1) po Imię + Nazwisko lub Nazwisko + Imię lub E-mail
  for (const m of members) {
    if (!m) continue;
    const mIdx = String(m.index || m.nrIndeksu || '').trim();
    if (mIdx && mIdx === normQuery) return m;

    const fn = normalizeDiacritics(m.fullName || m.imieNazwisko || `${m.firstName || m.imie || ''} ${m.lastName || m.nazwisko || ''}`).replace(/\s+/g, ' ').toLowerCase().trim();
    if (fn) {
      if (normQuery === fn) return m;

      // Sprawdź odwróconą kolejność "Nazwisko Imię"
      const parts = fn.split(' ');
      if (parts.length === 2) {
        const reverseFn = `${parts[1]} ${parts[0]}`;
        if (normQuery === reverseFn) return m;
      }
    }

    const em = normalizeDiacritics(m.email || '').toLowerCase().trim();
    if (em && (normQuery === em || (em.length > 6 && normQuery.includes(em)))) {
      return m;
    }
  }

  // 3. Alias Match (Alias z bazy członka m.aliases / m.aliasy lub lokalnej mapy aliasesMap)
  // A) aliasesMap (lokalne powiązania z localStorage)
  if (aliasesMap && aliasesMap[normQuery]) {
    const target = String(aliasesMap[normQuery]).trim().toLowerCase();
    const matchByAlias = members.find(
      m => String(m.index || m.nrIndeksu || '').trim().toLowerCase() === target ||
           m.id === target ||
           normalizeDiacritics(m.fullName || `${m.firstName} ${m.lastName}`).replace(/\s+/g, ' ').toLowerCase().trim() === target
    );
    if (matchByAlias) return matchByAlias;

    // Jeśli alias wskazuje na numer indeksu nieobecny w bieżącym rejestrze (wpis historyczny)
    const isNumIdx = target.match(/^\d{3,6}$/);
    if (isNumIdx) {
      return {
        id: `hist_${target}`,
        index: target,
        nrIndeksu: target,
        fullName: clean,
        name: clean,
        status: 'archived',
        statusWeryfikacji: 'Archiwum',
        isArchived: true,
        isHistorical: true,
        isCustomHistorical: true,
      };
    }
  }

  // B) Kolumna J w bazie: m.aliases / m.aliasy
  for (const m of members) {
    if (!m) continue;
    const rawAliases = m.aliases || m.aliasy || m.alias || '';
    let aliasList = [];
    if (Array.isArray(rawAliases)) {
      aliasList = rawAliases;
    } else if (typeof rawAliases === 'string' && rawAliases.trim()) {
      aliasList = rawAliases.split(/[,;\n]+/).map(a => a.trim()).filter(Boolean);
    }

    for (const a of aliasList) {
      const normAlias = normalizeDiacritics(a).replace(/\s+/g, ' ').toLowerCase().trim();
      if (normAlias && (normAlias === normQuery || (normAlias.length >= 4 && normQuery === normAlias))) {
        return m;
      }
    }
  }

  // 4. Jeśli brak dopasowania 1:1 oraz brak aliasu -> ZAKAZ zgadywania po nazwisku/imieniu
  return null;
}

/**
 * Automatyczne wykrycie roli uczestnika (z zachowaniem nadrzędności prelegentów i opiekunów)
 */
export function detectParticipantRole(rawName, member = null, customSupervisors = null) {
  if (!rawName) return 'member';
  const clean = String(rawName).trim();
  const norm = normalizeDiacritics(clean).toLowerCase();

  // 1. Nadrzędność ról: Prelegenci / Wykładowcy / Goście Specjalni
  if (
    norm.includes('[speaker]') ||
    norm.includes('speaker:') ||
    norm.includes('speaker') ||
    norm.includes('[prelegent]') ||
    norm.includes('prelegent:') ||
    norm.includes('prelegent') ||
    norm.includes('wykladowca') ||
    norm.includes('gosc specjalny') ||
    norm.includes('[gosc specjalny]')
  ) {
    return 'speaker';
  }

  // 2. Oficjalni Opiekunowie Koła (ścisłe dopasowanie pełnego imienia/nazwiska)
  if (isFacultySupervisor(clean, customSupervisors) || (member && isFacultySupervisor(member.fullName, customSupervisors))) {
    return 'supervisor';
  }

  // 3. Oznaczenie gościa zewnętrznego
  if (
    norm.includes('[gosc]') ||
    norm.includes('gosc:') ||
    norm.startsWith('gosc ') ||
    norm.includes('wolny sluchacz') ||
    norm.includes('(gosc)')
  ) {
    return 'guest';
  }

  // 4. Specjalne mapowania studentów
  if (isMonikaLyniewska(clean) || (member && isMonikaLyniewska(member.index || member.fullName))) {
    return 'member';
  }

  // 5. Dopasowany członek koła
  if (member) {
    return 'member';
  }

  return 'member';
}
