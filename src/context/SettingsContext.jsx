import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEFAULT_POINT_WEIGHTS = {
  OB_ONLINE: { id: 'OB_ONLINE', label: 'Obecność na spotkaniu Online', points: 1, icon: '💻' },
  OB_STACJO: { id: 'OB_STACJO', label: 'Obecność Stacjonarna', points: 2, icon: '🏫' },
  DYSKUSJA: { id: 'DYSKUSJA', label: 'Aktywna dyskusja na spotkaniu', points: 1, icon: '💬' },
  PREZENTACJA: { id: 'PREZENTACJA', label: 'Prezentacja merytoryczna w Kole', points: 5, icon: '📊' },
  EDU_VIDEO_PDF: { id: 'EDU_VIDEO_PDF', label: 'Materiały EDU (filmy / poradniki)', points: 8, icon: '📚' },
  BADANIA: { id: 'BADANIA', label: 'Udział w badaniach / zbieranie danych', points: 5, icon: '🔬' },
  ORG_LOGIST: { id: 'ORG_LOGIST', label: 'Organizacja wydarzeń / logistyka', points: 5, icon: '📋' },
  ZARZAD_MIES: { id: 'ZARZAD_MIES', label: 'Zarząd Koła (pkt/miesiąc)', points: 3, icon: '🏛️' },
  SM_MODER_MIES: { id: 'SM_MODER_MIES', label: 'Moderacja Social Media / Grup (pkt/miesiąc)', points: 5, icon: '📱' },
  IT_SYSTEMY: { id: 'IT_SYSTEMY', label: 'Koordynacja IT / Systemów CRM', points: 5, icon: '⚙️' },
  KONF_BIER: { id: 'KONF_BIER', label: 'Konferencja bierna', points: 3, icon: '🎫' },
  KONF_AKTYW: { id: 'KONF_AKTYW', label: 'Wystąpienie na konferencji', points: 10, icon: '🎤' },
};

export const ENGAGEMENT_SCALE = [
  { min: 90, max: 100, label: 'Lider', icon: '🟢', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  { min: 75, max: 89, label: 'Bardzo aktywny', icon: '🟢', color: 'bg-teal-50 text-teal-700 border-teal-200', dotColor: 'bg-teal-500' },
  { min: 50, max: 74, label: 'Bezpieczny brzeg', icon: '🟡', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  { min: 25, max: 49, label: 'Niższa aktywność', icon: '⚪', color: 'bg-stone-100 text-stone-700 border-stone-200', dotColor: 'bg-stone-400' },
  { min: 0, max: 24, label: 'Wymaga uzupełnienia', icon: '⚪', color: 'bg-slate-100 text-slate-600 border-slate-200', dotColor: 'bg-slate-400' },
];

export function getEngagementScaleLevel(freq) {
  const f = typeof freq === 'number' && !isNaN(freq) ? Math.min(100, Math.max(0, Math.round(freq))) : 0;
  return ENGAGEMENT_SCALE.find(level => f >= level.min && f <= level.max) || ENGAGEMENT_SCALE[ENGAGEMENT_SCALE.length - 1];
}

export function evaluateCertificateEligibility(freq, absences = 0) {
  const f = typeof freq === 'number' && !isNaN(freq) ? freq : 0;
  const abs = typeof absences === 'number' && !isNaN(absences) ? absences : 0;

  const meetsFreq = f >= 50;
  const meetsAbsences = abs <= 5;
  const canIssue = meetsFreq && meetsAbsences;

  return {
    canIssue,
    label: canIssue ? 'Można wydać' : 'Sprawdź frekwencję',
    color: canIssue
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : 'bg-rose-50 text-rose-700 border-rose-200',
    reason: !meetsFreq
      ? `Frekwencja poniżej 50% (${f}%)`
      : !meetsAbsences
      ? `Zbyt wiele nieobecności (${abs} > 5)`
      : 'Spełniono wymogi frekwencji i obecności',
  };
}

import { useOrg } from './OrgContext';
import { DEFAULT_FACULTY_SUPERVISORS, getStoredSupervisors } from '../utils/specialRoles';
import { ACTIVITY_OPTIONS, HISTORICAL_MEMBER_ACTIVITIES, getMemberPointsSum } from '../utils/activityRegistry';

/**
 * Oblicza sumaryczny licznik punktów aktywności dla studenta
 */
export function calculateMemberPoints(member, meetings = [], customTypes = {}, weights = DEFAULT_POINT_WEIGHTS) {
  if (!member) return 0;
  return getMemberPointsSum(member, meetings, weights);
}

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const { currentOrg, getStorageKey, updateOrganization } = useOrg();

  const [weights, setWeights] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_point_weights');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_POINT_WEIGHTS;
  });

  const sanitizeSupervisors = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter(s => {
      const email = (s?.email || '').toLowerCase();
      const name = (s?.name || s?.fullName || '').toLowerCase();
      return !email.includes('skupinska') && !email.includes('dziekan') &&
             !name.includes('skupińska') && !name.includes('skupinska') &&
             !name.includes('dziekan');
    });
  };

  const [supervisors, setSupervisors] = useState(() => {
    if (currentOrg && Array.isArray(currentOrg.supervisors) && currentOrg.supervisors.length > 0) {
      return sanitizeSupervisors(currentOrg.supervisors);
    }
    return sanitizeSupervisors(getStoredSupervisors());
  });

  // Re-sync supervisors when active organization changes
  useEffect(() => {
    if (currentOrg) {
      try {
        const orgSaved = localStorage.getItem(getStorageKey('crm_supervisors_config'));
        if (orgSaved) {
          const parsed = JSON.parse(orgSaved);
          if (Array.isArray(parsed)) {
            setSupervisors(sanitizeSupervisors(parsed));
            return;
          }
        }
      } catch {}
      if (Array.isArray(currentOrg.supervisors) && currentOrg.supervisors.length > 0) {
        setSupervisors(sanitizeSupervisors(currentOrg.supervisors));
      } else {
        setSupervisors(sanitizeSupervisors(getStoredSupervisors()));
      }
    }
  }, [currentOrg?.id, getStorageKey]);

  const updateWeight = (id, newPoints) => {
    setWeights(prev => {
      const updated = {
        ...prev,
        [id]: { ...prev[id], points: Number(newPoints) || 0 },
      };
      try {
        localStorage.setItem('crm_point_weights', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const resetWeights = () => {
    setWeights(DEFAULT_POINT_WEIGHTS);
    try {
      localStorage.removeItem('crm_point_weights');
    } catch {}
  };

  const saveSupervisorsList = (newList) => {
    setSupervisors(newList);
    try {
      if (currentOrg) {
        localStorage.setItem(getStorageKey('crm_supervisors_config'), JSON.stringify(newList));
        localStorage.setItem(`crm_psychoonkologia_${currentOrg.id}_settings`, JSON.stringify({ supervisors: newList }));
        updateOrganization(currentOrg.id, { supervisors: newList });
      }
      localStorage.setItem('skn_supervisors_config', JSON.stringify(newList));
    } catch {}
  };

  const addSupervisor = (sup) => {
    const academicTitle = sup.academicTitle || 'mgr';
    const fullName = sup.fullName || `${academicTitle} ${sup.name}`;
    const newEntry = {
      id: sup.id || `sup_${Date.now()}`,
      academicTitle,
      name: sup.name,
      fullName,
      affiliation: sup.affiliation || 'Instytut Psychologii WSKZ',
      role: sup.role || 'Opiekun Naukowy Koła',
      email: sup.email || '',
      startDate: sup.startDate || '2025-10-01',
      endDate: sup.isActive ? '' : (sup.endDate || ''),
      isActive: sup.isActive !== undefined ? sup.isActive : true,
      aliases: [
        sup.name.toLowerCase(),
        `${academicTitle.toLowerCase()} ${sup.name.toLowerCase()}`,
        ...(sup.aliases || []),
      ],
    };
    const updated = [...supervisors.filter(s => s.id !== newEntry.id), newEntry];
    saveSupervisorsList(updated);
    return updated;
  };

  const updateSupervisor = (id, updatedFields) => {
    const updated = supervisors.map(s => {
      if (s.id === id) {
        const merged = { ...s, ...updatedFields };
        const academicTitle = merged.academicTitle || 'mgr';
        merged.fullName = merged.fullName || `${academicTitle} ${merged.name}`;
        return merged;
      }
      return s;
    });
    saveSupervisorsList(updated);
    return updated;
  };

  const deleteSupervisor = (id) => {
    const updated = supervisors.filter(s => s.id !== id);
    saveSupervisorsList(updated);
    return updated;
  };

  const resetSupervisors = () => {
    saveSupervisorsList([]);
    try {
      localStorage.removeItem('skn_supervisors_config');
      if (currentOrg) {
        localStorage.removeItem(getStorageKey('crm_supervisors_config'));
      }
    } catch {}
  };

  const getActiveSupervisors = () => {
    return supervisors.filter(s => s.isActive);
  };

  return (
    <SettingsContext.Provider
      value={{
        weights,
        updateWeight,
        resetWeights,
        supervisors,
        addSupervisor,
        updateSupervisor,
        deleteSupervisor,
        resetSupervisors,
        getActiveSupervisors,
        engagementScale: ENGAGEMENT_SCALE,
        getEngagementScaleLevel,
        evaluateCertificateEligibility,
        calculateMemberPoints: (m, meetings, customTypes) => calculateMemberPoints(m, meetings, customTypes, weights),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Return default implementations if context is outside provider
    return {
      weights: DEFAULT_POINT_WEIGHTS,
      updateWeight: () => {},
      resetWeights: () => {},
      supervisors: DEFAULT_FACULTY_SUPERVISORS,
      addSupervisor: () => {},
      updateSupervisor: () => {},
      deleteSupervisor: () => {},
      resetSupervisors: () => {},
      getActiveSupervisors: () => DEFAULT_FACULTY_SUPERVISORS,
      engagementScale: ENGAGEMENT_SCALE,
      getEngagementScaleLevel,
      evaluateCertificateEligibility,
      calculateMemberPoints: (m, meetings, customTypes) => calculateMemberPoints(m, meetings, customTypes, DEFAULT_POINT_WEIGHTS),
    };
  }
  return ctx;
}
