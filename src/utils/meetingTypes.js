// ─── Meeting Types and Categorization Helper ─────────────────────────────────

export const MEETING_TYPES = {
  mandatory: {
    id: 'mandatory',
    label: 'Obowiązkowe',
    icon: '🟢',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Wliczane do bazowej frekwencji (mianownik)',
    countsTowardsDenominator: true,
  },
  optional: {
    id: 'optional',
    label: 'Nieobowiązkowe',
    icon: '🟡',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Otwarte / dodatkowe – brak obecności nie obniża frekwencji',
    countsTowardsDenominator: false,
  },
  trigger_warning: {
    id: 'trigger_warning',
    label: 'Trigger Warning',
    icon: '🟠',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Tematyka wrażliwa – wyłączone z obowiązku',
    countsTowardsDenominator: false,
  },
  internal: {
    id: 'internal',
    label: 'Wewnętrzne Zarządu',
    icon: '🔵',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Spotkanie zarządu – niewliczane do frekwencji koła',
    countsTowardsDenominator: false,
  },
};

/**
 * Automatyczne dopasowanie typu spotkania na podstawie reguł słownikowych
 */
export function getAutoMeetingType(meeting) {
  if (!meeting) return 'mandatory';
  const title = (meeting.title || '').toLowerCase();

  // 1. Wybory i Spotkania Organizacyjne Koła -> Obowiązkowe
  if (
    (title.includes('wybor') || title.includes('organizacyjn')) &&
    !title.includes('wewnętrzn') &&
    !title.includes('wewnetrzn')
  ) {
    return 'mandatory';
  }

  // 2. Wewnętrzne Zarządu / Inauguracja
  if (
    title.includes('inauguracja') ||
    title.includes('wewnętrzne') ||
    title.includes('wewnetrzne') ||
    title.includes('posiedzenie zarządu') ||
    title.includes('spotkanie zarządu') ||
    title.includes('spotkanie wewnętrzne')
  ) {
    return 'internal';
  }

  // 3. Trigger Warning / Wrażliwe
  if (
    title.includes('trauma') ||
    title.includes('traumy') ||
    title.includes('przemoc') ||
    title.includes('nadużyc') ||
    title.includes('naduzyc') ||
    title.includes('zaburzen')
  ) {
    return 'trigger_warning';
  }

  // 4. Nieobowiązkowe / Otwarte / Komisja
  if (
    title.includes('komisj') ||
    title.includes('otwart') ||
    title.includes('warsztat') ||
    title.includes('dodatkow') ||
    title.includes('dyskusyjn')
  ) {
    return 'optional';
  }

  // 5. Domyślnie: Merytoryczne prelekcje -> Obowiązkowe
  return 'mandatory';
}

/**
 * Zwraca aktywny typ spotkania z uwzględnieniem ręcznych modyfikacji w localStorage
 */
export function getMeetingType(meeting, customTypes = {}) {
  if (!meeting) return 'mandatory';
  const mId = meeting.id;
  const mCode = meeting.code;

  if (customTypes && (mId in customTypes || mCode in customTypes)) {
    if (mId && customTypes[mId]) return customTypes[mId];
    if (mCode && customTypes[mCode]) return customTypes[mCode];
  }

  // Fallback to localStorage if customTypes was omitted or empty
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawOrg = localStorage.getItem('crm_psychoonkologia_crm_meeting_types');
      const orgTypes = rawOrg ? JSON.parse(rawOrg) : null;
      if (orgTypes) {
        if (mId && orgTypes[mId]) return orgTypes[mId];
        if (mCode && orgTypes[mCode]) return orgTypes[mCode];
      }
      const rawGlobal = localStorage.getItem('crm_meeting_types');
      const globalTypes = rawGlobal ? JSON.parse(rawGlobal) : null;
      if (globalTypes) {
        if (mId && globalTypes[mId]) return globalTypes[mId];
        if (mCode && globalTypes[mCode]) return globalTypes[mCode];
      }
    } catch {}
  }

  if (meeting.customType && MEETING_TYPES[meeting.customType]) {
    return meeting.customType;
  }
  if (meeting.meetingType && MEETING_TYPES[meeting.meetingType]) {
    return meeting.meetingType;
  }
  if (meeting.type && MEETING_TYPES[meeting.type]) {
    return meeting.type;
  }
  return getAutoMeetingType(meeting);
}

/**
 * Wylicza frekwencję członka na podstawie skategoryzowanych spotkań
 */
export function calculateCategorizedFrequency(memberIndex, meetings = [], customTypes = {}, fallbackPresent = 0, fallbackAbsent = 0) {
  const safeMeetings = Array.isArray(meetings) ? meetings : [];
  const conductedMandatory = safeMeetings.filter(
    m => m && !m.isUpcoming && getMeetingType(m, customTypes) === 'mandatory'
  );

  if (conductedMandatory.length === 0) {
    const p = typeof fallbackPresent === 'number' && !isNaN(fallbackPresent) ? fallbackPresent : 0;
    const a = typeof fallbackAbsent === 'number' && !isNaN(fallbackAbsent) ? fallbackAbsent : 0;
    const total = p + a;
    if (total === 0) return { freq: 0, presentMandatory: 0, mandatoryTotal: 0, optionalBonus: 0, totalAttended: 0 };
    return {
      freq: Math.min(100, Math.round((p / total) * 100)),
      presentMandatory: p,
      mandatoryTotal: total,
      optionalBonus: 0,
      totalAttended: p,
    };
  }

  const cleanIdx = String(memberIndex || '').replace(/\D/g, '').replace(/^0+/, '').trim();

  let presentMandatory = 0;
  let optionalBonus = 0;

  safeMeetings.forEach(m => {
    if (!m || m.isUpcoming) return;
    const type = getMeetingType(m, customTypes);
    const attendees = Array.isArray(m.attendees) ? m.attendees : [];
    const isPresent = attendees.some(att => {
      const cleanAtt = String(att || '').replace(/\D/g, '').replace(/^0+/, '').trim();
      return cleanAtt === cleanIdx && cleanIdx !== '';
    });

    if (isPresent) {
      if (type === 'mandatory') {
        presentMandatory++;
      } else {
        optionalBonus++;
      }
    }
  });

  const mandatoryTotal = conductedMandatory.length;
  const totalAttended = presentMandatory + optionalBonus;
  const freq = mandatoryTotal > 0 ? Math.min(100, Math.round((totalAttended / mandatoryTotal) * 100)) : 0;

  return {
    freq: isNaN(freq) ? 0 : freq,
    presentMandatory,
    mandatoryTotal,
    optionalBonus,
    totalAttended,
  };
}
