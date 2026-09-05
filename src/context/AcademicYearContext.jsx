import React, { createContext, useContext, useState, useCallback } from 'react';
import { getAcademicYearKey } from '../utils/academicYear';

const AcademicYearContext = createContext(null);

const STORAGE_KEY_SESSION = 'crm_psychoonkologia_academic_year_session';
const STORAGE_KEY_LOCAL = 'crm_psychoonkologia_academic_year';

export function AcademicYearProvider({ children }) {
  // Domyślny rok dla SKN Psychoonkologii WSKZ to 2025/2026 (gdzie zarejestrowane są spotkania w Teamup)
  const [academicYear, setAcademicYearState] = useState(() => {
    try {
      const fromSession = sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (fromSession) return fromSession;

      const fromLocal = localStorage.getItem(STORAGE_KEY_LOCAL);
      if (fromLocal) return fromLocal;
    } catch {}
    return '2025/2026';
  });

  const [customStartDate, setCustomStartDate] = useState('2025-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-30');

  const setAcademicYear = useCallback((newYear) => {
    if (!newYear) return;
    const cleanYear = getAcademicYearKey(newYear);
    setAcademicYearState(cleanYear);
    try {
      sessionStorage.setItem(STORAGE_KEY_SESSION, cleanYear);
      localStorage.setItem(STORAGE_KEY_LOCAL, cleanYear);
    } catch {}
  }, []);

  const getRangeForYear = useCallback((yr = academicYear, cStart = customStartDate, cEnd = customEndDate) => {
    const key = getAcademicYearKey(yr);
    if (key === '2025/2026') {
      return { startDate: '2025-10-01', endDate: '2026-09-30', yearPrefix: '25/26' };
    }
    if (key === 'custom') {
      return { startDate: cStart, endDate: cEnd, yearPrefix: 'Własny' };
    }
    return { startDate: '2026-10-01', endDate: '2027-09-30', yearPrefix: '26/27' };
  }, [academicYear, customStartDate, customEndDate]);

  const value = {
    academicYear,
    setAcademicYear,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    getRangeForYear,
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return ctx;
}
