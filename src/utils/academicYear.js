// ─── Academic Year Progression & Graduate Detection Engine ─────────────────

/**
 * Parsuje numer roku ze stringa (np. "Rok 1", "2", "V rok", "III rok")
 */
export function parseRomanOrArabic(yearStr) {
  if (!yearStr) return null;
  const s = String(yearStr).trim().toUpperCase();

  // Rzymskie
  if (/\bV\b|ROK\s*V\b|V\s*ROK/.test(s)) return 5;
  if (/\bIV\b|ROK\s*IV\b|IV\s*ROK/.test(s)) return 4;
  if (/\bIII\b|ROK\s*III\b|III\s*ROK/.test(s)) return 3;
  if (/\bII\b|ROK\s*II\b|II\s*ROK/.test(s)) return 2;
  if (/\bI\b|ROK\s*I\b|I\s*ROK/.test(s)) return 1;

  // Cyfra arabska
  const match = s.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Bezpieczna normalizacja klucza roku akademickiego
 */
export function getYearKey(yearStr) {
  if (!yearStr) return '2025/2026';
  const s = String(yearStr).trim();
  if (s.includes('25/26') || s.includes('2025/2026')) return '2025/2026';
  if (s.includes('26/27') || s.includes('2026/2027')) return '2026/2027';
  if (s === 'custom') return 'custom';
  return s;
}

export const getAcademicYearKey = getYearKey;

/**
 * Zwraca początkowy rok akademicki dla danej daty (rok akademicki startuje 1 października)
 * Np. 10.10.2025 -> 2025 (rok akad. 2025/2026)
 * Np. 15.05.2025 -> 2024 (rok akad. 2024/2025)
 */
export function getAcademicStartYear(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return null;
  }
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-indexed: 9 = Październik
  return month >= 9 ? year : year - 1;
}

/**
 * Oblicza aktualny rok studiów, status progresji oraz wykrywa absolwentów
 * @param {Date|string} registrationDate - Data zgłoszenia / wpisu
 * @param {string|number} originalYearStr - Oryginalnie podany rok (np. "Rok 2", "1")
 * @param {string} fieldOfStudy - Kierunek studiów (do detekcji licencjat vs magister)
 * @param {Date} now - Bieżąca data referencyjna
 */
export function calculateCurrentStudyYear(registrationDate, originalYearStr, fieldOfStudy = '', now = new Date()) {
  const originalYear = parseRomanOrArabic(originalYearStr);
  if (!originalYear) {
    return {
      originalYear: null,
      currentYear: null,
      currentYearLabel: originalYearStr || '—',
      diff: 0,
      isProgressed: false,
      isGraduate: false,
      maxYears: 5,
    };
  }

  let regDate = null;
  if (registrationDate instanceof Date) {
    regDate = registrationDate;
  } else if (typeof registrationDate === 'string' && registrationDate.trim()) {
    const d = new Date(registrationDate);
    if (!isNaN(d.getTime())) {
      regDate = d;
    } else {
      // Parsowanie pl-PL DD.MM.YYYY
      const parts = registrationDate.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (parts) {
        regDate = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
      }
    }
  }

  const regStartYear = getAcademicStartYear(regDate);
  const currentStartYear = getAcademicStartYear(now);

  const diff = (regStartYear != null && currentStartYear != null)
    ? Math.max(0, currentStartYear - regStartYear)
    : 0;

  const currentYear = originalYear + diff;

  const fLower = String(fieldOfStudy).toLowerCase();
  let maxYears = 5; // Domyślnie jednolite magisterskie (Psychologia)
  if (fLower.includes('licencjat') || fLower.includes('i stopnia') || fLower.includes('lic.')) {
    maxYears = 3;
  } else if (fLower.includes('podyplomow') || fLower.includes('ii stopnia') || fLower.includes('mgr')) {
    maxYears = 2;
  }

  const isGraduate = currentYear > maxYears;

  return {
    originalYear,
    currentYear,
    currentYearLabel: isGraduate ? 'Absolwent' : `Rok ${currentYear}`,
    diff,
    isProgressed: diff > 0,
    isGraduate,
    maxYears,
  };
}
