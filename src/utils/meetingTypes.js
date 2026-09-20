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
 * Sprawdza, czy spotkanie kwalifikuje się do mianownika frekwencji (bazy wymaganych spotkań).
 * Warunki:
 * 1. Nie jest to spotkanie nadchodzące (isUpcoming === false).
 * 2. Jeśli zdefiniowano ręczny przełącznik countsInFrequency / includeInFrequency:
 *    - false -> bezwzględnie wykluczone
 *    - true -> wliczone do mianownika
 * 3. Jeśli brak ręcznego przełącznika:
 *    - Typ spotkania musi mieć countsTowardsDenominator: true (domyślnie 'mandatory').
 *      Spotkania 'internal' (zarząd), 'optional' (otwarte) i 'trigger_warning' są wykluczone.
 *    - Spotkanie MUSI posiadać zarejestrowaną/zweryfikowaną listę obecności (attendanceCount > 0 lub wpisy w ewidencji / localStorage).
 */
export function isMeetingEligibleForDenominator(meeting, customTypes = {}, ewidencja = null) {
  if (!meeting) return false;
  if (meeting.isUpcoming) return false;

  // 1. Sprawdź czy spotkanie ma manualny override flagi countsInFrequency / includeInFrequency
  if (meeting.countsInFrequency !== undefined && meeting.countsInFrequency !== null) {
    return Boolean(meeting.countsInFrequency);
  }
  if (meeting.includeInFrequency !== undefined && meeting.includeInFrequency !== null) {
    return Boolean(meeting.includeInFrequency);
  }

  // 2. Sprawdź typ spotkania (tylko Obowiązkowe countsTowardsDenominator: true)
  const type = getMeetingType(meeting, customTypes);
  const typeConfig = MEETING_TYPES[type];
  if (!typeConfig || !typeConfig.countsTowardsDenominator) {
    return false;
  }

  // 3. Spotkanie MUSI posiadać zarejestrowaną frekwencję (attendanceCount > 0 / attendees > 0)
  if (meeting.attendanceCount !== undefined && meeting.attendanceCount !== null) {
    return Number(meeting.attendanceCount) > 0;
  }
  if (meeting.attendeesCount !== undefined && meeting.attendeesCount !== null) {
    return Number(meeting.attendeesCount) > 0;
  }
  if (Array.isArray(meeting.attendees) && meeting.attendees.length > 0) {
    return true;
  }
  if (Array.isArray(meeting.participantRecords) && meeting.participantRecords.length > 0) {
    return true;
  }

  // 4. Sprawdź ewidencja jeśli dostępna
  const cleanCode = String(meeting.code || meeting.id || '').replace(/[\[\]]/g, '').trim().toUpperCase();
  if (Array.isArray(ewidencja) && ewidencja.length > 0 && cleanCode) {
    const hasEwidencja = ewidencja.some(e => {
      const eCode = String(e.kodSpotkania || e.meetingCode || '').replace(/[\[\]]/g, '').trim().toUpperCase();
      return eCode === cleanCode;
    });
    if (hasEwidencja) return true;
  }

  // 5. Sprawdź w localStorage czy istnieją zapisane obecności dla tego spotkania
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keys = [
        `crm_attendance_${meeting.id}`,
        `crm_attendance_${meeting.date}`,
        meeting.code ? `crm_attendance_${meeting.code}` : null,
      ].filter(Boolean);

      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            if (typeof parsed.confirmedCount === 'number' && parsed.confirmedCount > 0) return true;
            if (Array.isArray(parsed.confirmedIndexes) && parsed.confirmedIndexes.length > 0) return true;
            if (Array.isArray(parsed.attendees) && parsed.attendees.length > 0) return true;
            if (Array.isArray(parsed) && parsed.length > 0) return true;
          }
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Główna, jednolita funkcja kalkulacji frekwencji i statystyk studenta (Single Source of Truth)
 * Używana identycznie w tabeli głównej (ManagementTab), modalu profilu (EditMemberModal) oraz sprawozdawczości
 */
export function calculateMemberStats(
  memberOrIndex,
  ewidencja = null,
  meetings = [],
  customTypesOrTenures = {},
  settingsOrDorobek = {},
  extraSettings = {}
) {
  let customTypes = {};
  let explicitBoardTenures = null;
  let explicitDorobek = null;
  let settings = {};

  if (Array.isArray(customTypesOrTenures)) {
    explicitBoardTenures = customTypesOrTenures;
    explicitDorobek = settingsOrDorobek;
    settings = extraSettings || {};
  } else {
    customTypes = customTypesOrTenures || {};
    settings = settingsOrDorobek || {};
  }

  // Pobranie ustawień z parametru lub domyślnych
  let activeSettings = {
    calcMode: 'DYNAMIC_MANDATORY',
    fixedTarget: 10,
    minPassingPercent: 50,
    zeroAttendanceDisplay: 'PERCENT_ZERO',
    ...(settings || {}),
  };

  if (!settings || Object.keys(settings).length === 0) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawSaved = localStorage.getItem('crm_attendance_config') || localStorage.getItem('skn_attendance_config');
        if (rawSaved) {
          activeSettings = { ...activeSettings, ...JSON.parse(rawSaved) };
        }
      } catch {}
    }
  }

  const calcMode = activeSettings.calcMode || 'DYNAMIC_MANDATORY';
  const fixedTarget = Math.max(1, Number(activeSettings.fixedTarget) || 10);
  const minPassingPercent = Math.max(1, Math.min(100, Number(activeSettings.minPassingPercent) || 50));
  const zeroAttendanceDisplay = activeSettings.zeroAttendanceDisplay || 'PERCENT_ZERO';

  if (!memberOrIndex) {
    return {
      freq: 0,
      percentage: 0,
      attendedCount: 0,
      present: 0,
      absent: 0,
      presentMandatory: 0,
      mandatoryTotal: 0,
      baseDenominator: 0,
      optionalBonus: 0,
      totalAttended: 0,
      attendedRecords: [],
      isCertEligible: false,
      canGetCertificate: false,
      displayRatio: '0 / 0',
      displayPercentage: zeroAttendanceDisplay === 'NEUTRAL_DASH' ? '—' : '0%',
      badge: { label: 'Wymaga uzupełnienia', dotColor: 'bg-slate-500', color: 'bg-slate-100 text-slate-700 border-slate-300' },
      certStatus: { canIssue: false, label: 'W toku', color: 'bg-slate-100 text-slate-700 border-slate-300' },
      points: 0,
      totalPoints: 0,
      punkty: 0,
      meetingPoints: 0,
      meritPoints: 0,
      tenurePoints: 0,
    };
  }

  // 1. Bezpieczne pobranie bazy ewidencji z parametru lub localStorage
  let activeEwidencja = Array.isArray(ewidencja) ? ewidencja : null;
  if (!activeEwidencja && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('crm_ewidencja');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) activeEwidencja = parsed;
      }
    } catch {}
  }
  if (!activeEwidencja) activeEwidencja = [];

  const safeMeetings = Array.isArray(meetings) ? meetings : [];

  // 2. Normalizacja identyfikatorów studenta
  let rawIdx = '';
  let cleanIdxDigits = '';
  let rawEmail = '';
  let rawFullName = '';
  let rawAliases = '';

  if (typeof memberOrIndex === 'object' && memberOrIndex !== null) {
    rawIdx = String(memberOrIndex.nrIndeksu || memberOrIndex.index || memberOrIndex.cleanIndex || memberOrIndex.indexNumber || '').trim();
    cleanIdxDigits = rawIdx.replace(/\D/g, '').replace(/^0+/, '').trim();
    rawEmail = String(memberOrIndex.email || '').trim().toLowerCase();
    rawFullName = String(memberOrIndex.fullName || memberOrIndex.name || `${memberOrIndex.firstName || ''} ${memberOrIndex.lastName || ''}`).trim().toLowerCase();
    rawAliases = String(memberOrIndex.aliasy || memberOrIndex.aliases || memberOrIndex.alias || '').trim().toLowerCase();
  } else {
    rawIdx = String(memberOrIndex || '').trim();
    cleanIdxDigits = rawIdx.replace(/\D/g, '').replace(/^0+/, '').trim();
  }

  // 3. Dopasowanie rekordów obecności studenta z tablicy ewidencja
  const studentAttendance = activeEwidencja.filter(e => {
    if (!e) return false;
    const eRawIdx = String(e.nrIndeksu || e.index || '').trim();
    const eCleanIdx = eRawIdx.replace(/\D/g, '').replace(/^0+/, '').trim();
    const eEmail = String(e.email || '').trim().toLowerCase();
    const eName = String(e.name || e.fullName || e.imieNazwisko || '').trim().toLowerCase();

    // a) Dopasowanie po numerze indeksu
    if (rawIdx && eRawIdx && rawIdx === eRawIdx) return true;
    if (cleanIdxDigits && eCleanIdx && cleanIdxDigits === eCleanIdx) return true;

    // b) Dopasowanie po aliasach Meet
    if (rawAliases) {
      if (eRawIdx && rawAliases.includes(eRawIdx.toLowerCase())) return true;
      if (eCleanIdx && rawAliases.includes(eCleanIdx)) return true;
      if (eName && rawAliases.includes(eName)) return true;
    }

    // c) Dopasowanie po emailu
    if (rawEmail && eEmail && rawEmail === eEmail) return true;

    // d) Dopasowanie po imieniu i nazwisku
    if (rawFullName && eName && (rawFullName === eName || eName.includes(rawFullName) || rawFullName.includes(eName))) return true;

    return false;
  });

  // 4. Spotkania zakończone (unikalne)
  const uniqueConductedMap = new Map();
  safeMeetings.filter(m => m && !m.isUpcoming).forEach(m => {
    const meetKey = String(m.code || m.id || m.date || '').trim();
    if (meetKey && !uniqueConductedMap.has(meetKey)) {
      uniqueConductedMap.set(meetKey, m);
    }
  });
  const conductedMeetings = Array.from(uniqueConductedMap.values());

  // 5. Wyznaczenie bazy spotkań do mianownika w zależności od trybu konfiguracji
  let baseDenominator = 0;
  const eligibleMandatoryMeetings = conductedMeetings.filter(m =>
    isMeetingEligibleForDenominator(m, customTypes, activeEwidencja)
  );
  const allVerifiedMeetings = conductedMeetings.filter(m =>
    hasMeetingAttendanceLogs(m, activeEwidencja)
  );

  if (calcMode === 'FIXED_TARGET') {
    baseDenominator = fixedTarget;
  } else if (calcMode === 'ALL_VERIFIED') {
    baseDenominator = allVerifiedMeetings.length > 0 ? allVerifiedMeetings.length : (conductedMeetings.length > 0 ? conductedMeetings.length : 1);
  } else {
    // Domyślny: DYNAMIC_MANDATORY
    baseDenominator = eligibleMandatoryMeetings.length > 0 ? eligibleMandatoryMeetings.length : 0;
  }

  // 6. Zliczanie zaliczonych obecności
  const attendedMeetingCodes = new Set();
  let presentMandatory = 0;
  let optionalBonus = 0;

  conductedMeetings.forEach(m => {
    const isEligibleMandatory = isMeetingEligibleForDenominator(m, customTypes, activeEwidencja);
    const mCode = String(m.code || m.id || '').trim();
    const mCodeUpper = mCode.replace(/[\[\]]/g, '').trim().toUpperCase();
    const mNumMatch = mCodeUpper.match(/M(\d+)/i);
    const mNum = mNumMatch ? parseInt(mNumMatch[1], 10) : null;

    // a) Sprawdź w studentAttendance (z ewidencji)
    let isPresent = studentAttendance.some(e => {
      const eCode = String(e.kodSpotkania || e.meetingCode || '').replace(/[\[\]]/g, '').trim().toUpperCase();
      const eNumMatch = eCode.match(/M(\d+)/i);
      const eNum = eNumMatch ? parseInt(eNumMatch[1], 10) : null;
      if (eCode === mCodeUpper || (mNum !== null && eNum !== null && cleanIdxDigits && mNum === eNum)) return true;
      if (e.dataSpotkania && m.date && String(e.dataSpotkania).trim() === String(m.date).trim()) return true;
      return false;
    });

    // b) Sprawdź w m.attendees
    if (!isPresent && Array.isArray(m.attendees) && m.attendees.length > 0) {
      isPresent = m.attendees.some(att => {
        if (!att) return false;
        if (typeof att === 'object') {
          const attIdx = String(att.index || att.member?.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
          const attEmail = String(att.email || att.member?.email || '').trim().toLowerCase();
          const attName = String(att.fullName || att.rawName || att.name || '').trim().toLowerCase();
          const isApproved = att.manualApproved !== undefined ? Boolean(att.manualApproved) : (att.status === 'approved' || att.status === 'Zaliczona' || att.status === 'Zaliczono' || att.isEligible);
          if (!isApproved) return false;
          if (cleanIdxDigits && attIdx && cleanIdxDigits === attIdx) return true;
          if (rawEmail && attEmail && rawEmail === attEmail) return true;
          if (rawFullName && attName && (rawFullName === attName || attName.includes(rawFullName) || rawFullName.includes(attName))) return true;
          return false;
        }
        const strAtt = String(att).trim();
        const cleanAtt = strAtt.replace(/\D/g, '').replace(/^0+/, '').trim();
        if (cleanIdxDigits && cleanAtt && cleanAtt === cleanIdxDigits) return true;
        if (rawEmail && strAtt.toLowerCase() === rawEmail) return true;
        return false;
      });
    }

    // c) Sprawdź w m.participantRecords
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

        if (cleanIdxDigits && pIdx && cleanIdxDigits === pIdx) return true;
        if (rawEmail && pEmail && rawEmail === pEmail) return true;
        if (rawFullName && pName && (pName.includes(fullName) || fullName.includes(pName))) return true;
        return false;
      });
    }

    // d) Sprawdź w localStorage
    if (!isPresent && typeof window !== 'undefined' && window.localStorage) {
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
              if (cleanIdxDigits && pIdx && cleanIdxDigits === pIdx) return true;
              if (rawEmail && pEmail && rawEmail === pEmail) return true;
              if (rawFullName && pName && (pName.includes(rawFullName) || rawFullName.includes(pName))) return true;
              return false;
            });
            if (matched) {
              isPresent = true;
              break;
            }
            const confIdxs = Array.isArray(parsed?.confirmedIndexes) ? parsed.confirmedIndexes : [];
            if (cleanIdxDigits && confIdxs.some(ci => String(ci).replace(/\D/g, '').replace(/^0+/, '').trim() === cleanIdxDigits)) {
              isPresent = true;
              break;
            }
          }
        } catch {}
      }
    }

    if (isPresent) {
      if (!attendedMeetingCodes.has(mCode)) {
        attendedMeetingCodes.add(mCode);
        if (isEligibleMandatory) {
          presentMandatory++;
        } else {
          optionalBonus++;
        }
      }
    }
  });

  // Fallback do obecności bezpośrednio z tablicy studentAttendance, jeśli spotkania nie miały kodów
  const totalAttended = Math.max(attendedMeetingCodes.size, studentAttendance.length);
  
  let attendedRelevant = totalAttended;
  let finalPresentMandatory = presentMandatory;

  if (calcMode === 'DYNAMIC_MANDATORY') {
    finalPresentMandatory = baseDenominator > 0 ? Math.min(baseDenominator, Math.max(presentMandatory, studentAttendance.length)) : totalAttended;
    attendedRelevant = finalPresentMandatory;
  } else {
    finalPresentMandatory = totalAttended;
    attendedRelevant = totalAttended;
  }

  const absentCount = baseDenominator > 0 ? Math.max(0, baseDenominator - attendedRelevant) : 0;
  const freq = baseDenominator > 0 ? Math.min(100, Math.round((attendedRelevant / baseDenominator) * 100)) : 0;

  // Badge zaangażowania
  let badge = { label: 'Wymaga uzupełnienia', dotColor: 'bg-slate-500', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  if (baseDenominator === 0 && totalAttended === 0) {
    badge = { label: 'Start roku', dotColor: 'bg-slate-400', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  } else if (freq >= 90) {
    badge = { label: 'Lider', dotColor: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  } else if (freq >= 75) {
    badge = { label: 'Bardzo aktywny', dotColor: 'bg-teal-500', color: 'bg-teal-50 text-teal-700 border-teal-200' };
  } else if (freq >= 50) {
    badge = { label: 'Bezpieczny brzeg', dotColor: 'bg-amber-500', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  } else if (freq >= 25) {
    badge = { label: 'Niższa aktywność', dotColor: 'bg-stone-500', color: 'bg-stone-100 text-stone-700 border-stone-300' };
  }

  const isCertEligible = baseDenominator > 0 && freq >= minPassingPercent && absentCount <= 5;
  const certStatus = isCertEligible
    ? { canIssue: true, label: 'Można wydać', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { canIssue: false, label: 'W toku', color: 'bg-slate-100 text-slate-700 border-slate-300' };

  // Punkty ze spotkań, dorobku i kadencji
  let meetingPoints = 0;
  let meritPoints = 0;
  let tenurePoints = 0;

  studentAttendance.forEach(e => {
    if (!e) return;
    const rawVal = e.punkty !== undefined ? e.punkty : (e.points !== undefined ? e.points : (e.pkt !== undefined ? e.pkt : null));
    let p = 1;
    if (rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '') {
      const parsed = Number(rawVal);
      if (!isNaN(parsed)) p = parsed;
    }
    meetingPoints += p;
  });

  if (meetingPoints === 0 && totalAttended > 0) {
    meetingPoints = totalAttended * 1;
  }

  let activeDorobek = explicitDorobek || settings?.dorobek || null;
  if (!activeDorobek && typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawDorobek = localStorage.getItem('crm_dorobek') || localStorage.getItem('skn_dorobek');
      if (rawDorobek) activeDorobek = JSON.parse(rawDorobek);
    } catch {}
  }

  if (activeDorobek && Array.isArray(activeDorobek)) {
    activeDorobek.forEach(item => {
      if (!item) return;
      const dIdx = String(item.nrIndeksu || item.index || item.cleanIndex || '').replace(/\D/g, '').replace(/^0+/, '').trim();
      const dEmail = String(item.email || '').trim().toLowerCase();
      const dName = String(item.imieNazwisko || item.name || item.fullName || '').trim().toLowerCase();

      let isMatch = false;
      if (cleanIdxDigits && dIdx && cleanIdxDigits === dIdx) isMatch = true;
      else if (rawEmail && dEmail && rawEmail === dEmail) isMatch = true;
      else if (rawFullName && dName && (rawFullName === dName || dName.includes(rawFullName) || rawFullName.includes(dName))) isMatch = true;
      else if (rawAliases && (dIdx && rawAliases.includes(dIdx) || dName && rawAliases.includes(dName))) isMatch = true;

      if (isMatch) {
        const pts = typeof item.punkty === 'number'
          ? item.punkty
          : (Number(item.punkty) || Number(item.points) || Number(item.pkt) || 0);
        meritPoints += pts;
      }
    });
  }

  const BOARD_ROLE_MONTHLY_WEIGHTS = {
    'Przewodniczący / Przewodnicząca': 3,
    'Wiceprzewodniczący / Wiceprzewodnicząca': 3,
    'Sekretarz Koła': 3,
    'Członek / Członkini Zarządu': 3,
    'Członek Zarządu': 3,
    'Członkini Zarządu': 3,
    'Skarbnik': 3,
    'Koordynator ds. Badań': 4,
    'Lider IT / Koordynator CRM': 5,
    'Moderator Social Media / Grup': 5,
    'Przewodniczący': 3,
    'Przewodnicząca': 3,
    'Wiceprzewodniczący': 3,
    'Wiceprzewodnicząca': 3,
  };

  let activeTenures = explicitBoardTenures || settings?.boardTenures || null;
  if (!activeTenures && typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawTenures = localStorage.getItem('skn_board_tenures');
      if (rawTenures) {
        const parsed = JSON.parse(rawTenures);
        if (Array.isArray(parsed)) activeTenures = parsed;
      }
    } catch {}
  }

  if (Array.isArray(activeTenures)) {
    activeTenures.forEach(t => {
      if (!t) return;
      const tIdx = String(t.memberIndex || t.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
      const tEmail = String(t.memberEmail || t.email || '').trim().toLowerCase();
      const tName = String(t.memberName || t.name || '').trim().toLowerCase();

      let isMatch = false;
      if (cleanIdxDigits && tIdx && cleanIdxDigits === tIdx) isMatch = true;
      else if (rawEmail && tEmail && rawEmail === tEmail) isMatch = true;
      else if (rawFullName && tName && (rawFullName === tName || tName.includes(rawFullName) || rawFullName.includes(tName))) isMatch = true;

      if (isMatch) {
        const ptsPerMonth = BOARD_ROLE_MONTHLY_WEIGHTS[t.roleName] || 3;
        let months = 1;
        if (t.startDate) {
          const start = new Date(t.startDate);
          const end = (t.isActive || !t.endDate) ? new Date() : new Date(t.endDate);
          const diffTime = Math.max(0, end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          months = Math.max(1, Math.round(diffDays / 30));
        }
        tenurePoints += months * ptsPerMonth;
      }
    });
  }

  if (tenurePoints === 0 && typeof memberOrIndex === 'object' && memberOrIndex !== null) {
    const directRole = String(memberOrIndex.role || memberOrIndex.funkcja || memberOrIndex.boardRole || '').trim();
    if (directRole && directRole !== 'Uczestnik' && directRole !== 'Członek Koła' && directRole !== 'Członek') {
      const matchedWeight = BOARD_ROLE_MONTHLY_WEIGHTS[directRole] || (directRole.toLowerCase().includes('przewodnicz') ? 3 : (directRole.toLowerCase().includes('zarząd') || directRole.toLowerCase().includes('zarzad') ? 3 : 0));
      if (matchedWeight > 0) {
        tenurePoints = matchedWeight * 1;
      }
    }
  }

  let rawMemberPoints = 0;
  if (typeof memberOrIndex === 'object' && memberOrIndex !== null) {
    const rawP = Number(memberOrIndex.points || memberOrIndex.initialPoints || memberOrIndex.punkty);
    const cleanIndexNum = Number(cleanIdxDigits);
    if (!isNaN(rawP) && (!cleanIndexNum || rawP !== cleanIndexNum)) {
      rawMemberPoints = rawP;
    }
  }

  const totalPoints = Math.max(0, meetingPoints + meritPoints + tenurePoints + rawMemberPoints);

  const displayPercentage = (baseDenominator === 0 && totalAttended === 0)
    ? (zeroAttendanceDisplay === 'NEUTRAL_DASH' ? '—' : '0%')
    : `${isNaN(freq) ? 0 : freq}%`;

  const displayRatio = `${attendedRelevant} / ${baseDenominator}`;

  return {
    freq: isNaN(freq) ? 0 : freq,
    percentage: isNaN(freq) ? 0 : freq,
    attendedCount: totalAttended,
    present: totalAttended,
    absent: absentCount,
    presentMandatory: finalPresentMandatory,
    mandatoryTotal: baseDenominator,
    baseDenominator,
    optionalBonus,
    totalAttended,
    attendedRecords: studentAttendance,
    isCertEligible,
    canGetCertificate: isCertEligible,
    displayRatio,
    displayPercentage,
    badge,
    certStatus,
    points: totalPoints,
    totalPoints,
    punkty: totalPoints,
    meetingPoints,
    meritPoints,
    tenurePoints,
  };
}

/**
 * Wylicza frekwencję członka na podstawie skategoryzowanych i zakończonych spotkań
 */
export function calculateCategorizedFrequency(
  memberOrIndex,
  meetings = [],
  customTypes = {},
  fallbackPresent = 0,
  fallbackAbsent = 0,
  ewidencja = null,
  settings = {}
) {
  return calculateMemberStats(memberOrIndex, ewidencja, meetings, customTypes, settings);
}
