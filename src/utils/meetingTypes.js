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
 * Wylicza frekwencję członka na podstawie skategoryzowanych i zakończonych spotkań
 */
export function calculateCategorizedFrequency(memberOrIndex, meetings = [], customTypes = {}, fallbackPresent = 0, fallbackAbsent = 0) {
  const safeMeetings = Array.isArray(meetings) ? meetings : [];

  // Wyodrębnij identyfikatory członka
  let cleanIdx = '';
  let email = '';
  let fullName = '';

  if (typeof memberOrIndex === 'object' && memberOrIndex !== null) {
    cleanIdx = String(memberOrIndex.index || memberOrIndex.cleanIndex || memberOrIndex.indexNumber || '').replace(/\D/g, '').replace(/^0+/, '').trim();
    email = String(memberOrIndex.email || '').trim().toLowerCase();
    fullName = String(memberOrIndex.fullName || `${memberOrIndex.firstName || ''} ${memberOrIndex.lastName || ''}`).trim().toLowerCase();
  } else {
    cleanIdx = String(memberOrIndex || '').replace(/\D/g, '').replace(/^0+/, '').trim();
  }

  // Spotkania zakończone (nie nadchodzące)
  const conductedMeetings = safeMeetings.filter(m => m && !m.isUpcoming);
  const conductedCount = conductedMeetings.length;

  let presentCount = 0;
  let presentMandatory = 0;
  let optionalBonus = 0;

  conductedMeetings.forEach(m => {
    const type = getMeetingType(m, customTypes);
    let isPresent = false;

    // 1. Sprawdź tablicę attendees
    const attendees = Array.isArray(m.attendees) ? m.attendees : [];
    isPresent = attendees.some(att => {
      if (!att) return false;
      if (typeof att === 'object') {
        const attIdx = String(att.index || att.member?.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
        const attEmail = String(att.email || att.member?.email || '').trim().toLowerCase();
        const attName = String(att.fullName || att.rawName || att.name || '').trim().toLowerCase();
        const isApproved = att.manualApproved !== undefined ? Boolean(att.manualApproved) : (att.status === 'approved' || att.status === 'Zaliczona' || att.status === 'Zaliczono' || att.isEligible);
        if (!isApproved) return false;
        if (cleanIdx && attIdx && cleanIdx === attIdx) return true;
        if (email && attEmail && email === attEmail) return true;
        if (fullName && attName && (fullName === attName || attName.includes(fullName) || fullName.includes(attName))) return true;
        return false;
      }
      const strAtt = String(att).trim();
      const cleanAtt = strAtt.replace(/\D/g, '').replace(/^0+/, '').trim();
      if (cleanIdx && cleanAtt && cleanAtt === cleanIdx) return true;
      if (email && strAtt.toLowerCase() === email) return true;
      return false;
    });

    // 2. Sprawdź participantRecords
    if (!isPresent && Array.isArray(m.participantRecords) && m.participantRecords.length > 0) {
      isPresent = m.participantRecords.some(p => {
        if (!p) return false;
        const isApproved = p.manualApproved !== undefined
          ? Boolean(p.manualApproved)
          : (p.isEligible || p.status === 'approved' || p.status === 'Zaliczona' || p.status === 'Zaliczono');
        if (!isApproved) return false;

        const pIdx = String(p.member?.index || p.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
        const pEmail = String(p.member?.email || p.email || '').trim().toLowerCase();
        const pName = String(p.member?.fullName || p.rawName || '').trim().toLowerCase();

        if (cleanIdx && pIdx && cleanIdx === pIdx) return true;
        if (email && pEmail && email === pEmail) return true;
        if (fullName && pName && (pName.includes(fullName) || fullName.includes(pName))) return true;
        return false;
      });
    }

    // 3. Sprawdź localStorage
    if (!isPresent && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storageKeys = [
        `crm_attendance_${m.id}`,
        `crm_attendance_${m.date}`,
        m.code ? `crm_attendance_${m.code}` : null,
      ].filter(Boolean);

      for (const key of storageKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const atts = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.attendees) ? parsed.attendees : []);
            const matched = atts.some(p => {
              const isApproved = p.manualApproved !== undefined
                ? Boolean(p.manualApproved)
                : (p.isEligible || p.status === 'approved' || p.status === 'Zaliczona' || p.status === 'Zaliczono');
              if (!isApproved) return false;
              const pIdx = String(p.member?.index || p.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
              const pEmail = String(p.member?.email || p.email || '').trim().toLowerCase();
              const pName = String(p.member?.fullName || p.rawName || '').trim().toLowerCase();
              if (cleanIdx && pIdx && cleanIdx === pIdx) return true;
              if (email && pEmail && email === pEmail) return true;
              if (fullName && pName && (pName.includes(fullName) || fullName.includes(pName))) return true;
              return false;
            });
            if (matched) {
              isPresent = true;
              break;
            }

            const confIdxs = Array.isArray(parsed?.confirmedIndexes) ? parsed.confirmedIndexes : [];
            if (cleanIdx && confIdxs.some(ci => String(ci).replace(/\D/g, '').replace(/^0+/, '').trim() === cleanIdx)) {
              isPresent = true;
              break;
            }
          }
        } catch {}
      }
    }

    if (isPresent) {
      presentCount++;
      if (type === 'mandatory') {
        presentMandatory++;
      } else {
        optionalBonus++;
      }
    }
  });

  // Jeśli brak spotkań w harmonogramie, a podano wartości początkowe
  if (conductedCount === 0) {
    const p = typeof fallbackPresent === 'number' && !isNaN(fallbackPresent) ? fallbackPresent : 0;
    const a = typeof fallbackAbsent === 'number' && !isNaN(fallbackAbsent) ? fallbackAbsent : 0;
    const total = p + a;
    const freq = total > 0 ? Math.min(100, Math.round((p / total) * 100)) : 0;
    return {
      freq,
      present: p,
      absent: a,
      presentMandatory: p,
      mandatoryTotal: total,
      optionalBonus: 0,
      totalAttended: p,
      conductedTotal: total,
    };
  }

  const absentCount = Math.max(0, conductedCount - presentCount);
  const freq = conductedCount > 0 ? Math.min(100, Math.round((presentCount / conductedCount) * 100)) : 0;

  return {
    freq: isNaN(freq) ? 0 : freq,
    present: presentCount,
    absent: absentCount,
    presentMandatory,
    mandatoryTotal: conductedCount,
    optionalBonus,
    totalAttended: presentCount,
    conductedTotal: conductedCount,
  };
}
