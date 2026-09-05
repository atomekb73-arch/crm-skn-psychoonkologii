import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  getOrgKey,
  getOrgStorage,
  setOrgStorage,
  removeOrgStorage,
  clearOrgWorkspace,
  restoreLegacyMeetingData,
  getCorrespondenceLog,
  addCorrespondenceEntry,
  updateCorrespondenceEntry,
  deleteCorrespondenceEntry,
  getMeetingsTrash,
  addMeetingToTrash,
  restoreMeetingFromTrash,
  permanentlyDeleteMeetingFromTrash,
  getCustomMeetings,
  saveCustomMeeting,
  deleteCustomMeeting,
  getMeetingOverrides,
  saveMeetingOverride,
} from '../utils/storage';

export const DEFAULT_ORGS = [
  {
    id: 'skn-psychoonkologia',
    name: 'Studenckie Koło Naukowe Psychoonkologii WSKZ',
    shortName: 'SKN Psychoonkologii',
    tag: 'WSKZ',
    faculty: 'Instytut Psychologii WSKZ',
    unit: 'Instytut Psychologii WSKZ',
    academicYear: '2026/2027',
    sheetId: '1HbpVQkKdtKqsg0Ew5d3AigZBq-wvQYmJ-vpSIIWLFpg',
    calendarKey: 'ks9aiux4jiza1ronpd',
    calendarId: 'ks9aiux4jiza1ronpd',
    teamupApiKey: '20dc4242d0d74be314e5ee108dc618cf3f6fbcb7647865568775fe4d9a89c112',
    teamupToken: '20dc4242d0d74be314e5ee108dc618cf3f6fbcb7647865568775fe4d9a89c112',
    subcalendarId: '15520558',
    subcalendarName: 'Koła Naukowe: > 07 🎗️ SKN Psychoonkologii',
    description: 'Studenckie Koło Naukowe Psychoonkologii WSKZ - Oficjalna ewidencja i harmonogram',
    isDefault: true,
    supervisors: [],
  },
];

const OrgContext = createContext(null);

const safeGetStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Błąd odczytu ${key} z localStorage:`, e);
    return fallback;
  }
};

export function OrgProvider({ children }) {
  // Load saved organizations or use defaults
  const [organizations, setOrganizations] = useState(() => {
    try {
      const parsed = safeGetStorage('crm_psychoonkologia_organizations', null);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...parsed];
        DEFAULT_ORGS.forEach(defOrg => {
          const idx = merged.findIndex(o => o.id === defOrg.id);
          if (idx === -1) {
            merged.push(defOrg);
          } else {
            merged[idx] = {
              ...defOrg,
              ...merged[idx],
              sheetId: (merged[idx].sheetId && merged[idx].sheetId.length > 5 && merged[idx].sheetId !== '1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y') ? merged[idx].sheetId : defOrg.sheetId,
              calendarKey: defOrg.calendarKey || merged[idx].calendarKey,
              calendarId: defOrg.calendarId || merged[idx].calendarId,
              teamupApiKey: defOrg.teamupApiKey || merged[idx].teamupApiKey,
              teamupToken: defOrg.teamupToken || merged[idx].teamupToken,
              subcalendarId: defOrg.subcalendarId || merged[idx].subcalendarId,
              subcalendarName: defOrg.subcalendarName || merged[idx].subcalendarName,
              supervisors: (Array.isArray(merged[idx].supervisors) ? merged[idx].supervisors : (defOrg.supervisors || [])).filter(s => {
                const email = (s?.email || '').toLowerCase();
                const name = (s?.name || s?.fullName || '').toLowerCase();
                return !email.includes('skupinska') && !email.includes('dziekan') &&
                       !name.includes('skupińska') && !name.includes('skupinska') &&
                       !name.includes('dziekan');
              }),
            };
          }
        });
        return merged;
      }
    } catch (err) {
      console.error('Błąd scalania crm_psychoonkologia_organizations z localStorage:', err);
    }
    return DEFAULT_ORGS;
  });

  // Current active organization ID
  const [currentOrgId, setCurrentOrgIdState] = useState(() => {
    try {
      const savedId = localStorage.getItem('crm_psychoonkologia_current_org_id');
      if (savedId) return savedId;
    } catch {}
    return 'skn-psychoonkologia';
  });

  // Save organizations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('crm_psychoonkologia_organizations', JSON.stringify(organizations));
    } catch (err) {
      console.error('Błąd zapisu crm_psychoonkologia_organizations:', err);
    }
  }, [organizations]);

  // Restore legacy meeting and attendance data upon org switch
  useEffect(() => {
    if (currentOrgId) {
      restoreLegacyMeetingData(currentOrgId);
    }
  }, [currentOrgId]);

  // Current organization object
  const currentOrg = useMemo(() => {
    return organizations.find(o => o.id === currentOrgId) || organizations[0] || DEFAULT_ORGS[0];
  }, [organizations, currentOrgId]);

  // Switch active organization
  const switchOrg = useCallback((orgId) => {
    if (!orgId) return;
    setCurrentOrgIdState(orgId);
    try {
      localStorage.setItem('crm_current_org_id', orgId);
    } catch {}
  }, []);

  // Helper to construct organization-isolated localStorage keys
  const getStorageKey = useCallback((baseKey) => {
    return getOrgKey(currentOrg.id, baseKey);
  }, [currentOrg.id]);

  // Add new organization
  const addOrganization = useCallback((orgData) => {
    const rawName = (orgData.name || 'Nowe Koło').trim();
    const slug = (orgData.shortName || rawName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `org_${Date.now()}`;

    let id = slug;
    let counter = 1;
    while (organizations.some(o => o.id === id)) {
      id = `${slug}_${counter++}`;
    }

    const newOrg = {
      id,
      name: rawName,
      shortName: (orgData.shortName || rawName).trim(),
      tag: (orgData.tag || 'WSKZ').trim(),
      unit: (orgData.unit || 'Instytut Psychologii WSKZ').trim(),
      sheetId: (orgData.sheetId || '').trim(),
      calendarKey: (orgData.calendarKey || 'ks9aiux4jiza1ronpd').trim(),
      subcalendarId: (orgData.subcalendarId || 'all').trim(),
      subcalendarName: (orgData.subcalendarName || '').trim(),
      description: (orgData.description || '').trim(),
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    setOrganizations(prev => [...prev, newOrg]);
    switchOrg(newOrg.id);
    return newOrg;
  }, [organizations, switchOrg]);

  // Update existing organization
  const updateOrganization = useCallback((id, updatedData) => {
    setOrganizations(prev =>
      prev.map(o => {
        if (o.id !== id) return o;
        return {
          ...o,
          ...updatedData,
          id: o.id, // ID is immutable
          isDefault: o.isDefault,
        };
      })
    );
  }, []);

  // Delete organization (cannot delete default org)
  const deleteOrganization = useCallback((id) => {
    if (id === 'skn-psychoonkologia') {
      alert('Nie można usunąć domyślnego Koła Naukowego Psychoonkologii.');
      return false;
    }

    // Clean up workspace storage
    clearOrgWorkspace(id);

    setOrganizations(prev => prev.filter(o => o.id !== id));
    if (currentOrgId === id) {
      switchOrg('skn-psychoonkologia');
    }
    return true;
  }, [currentOrgId, switchOrg]);

  const value = useMemo(() => ({
    currentOrg,
    currentOrgId,
    organizations,
    switchOrg,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    getStorageKey,
    getOrgStorage: (key, def) => getOrgStorage(currentOrg.id, key, def),
    setOrgStorage: (key, val) => setOrgStorage(currentOrg.id, key, val),
    removeOrgStorage: (key) => removeOrgStorage(currentOrg.id, key),
    clearOrgWorkspace: () => clearOrgWorkspace(currentOrg.id),
    getCorrespondenceLog: () => getCorrespondenceLog(currentOrg.id),
    addCorrespondenceEntry: (entry) => addCorrespondenceEntry(currentOrg.id, entry),
    updateCorrespondenceEntry: (id, fields) => updateCorrespondenceEntry(currentOrg.id, id, fields),
    deleteCorrespondenceEntry: (id) => deleteCorrespondenceEntry(currentOrg.id, id),
    getMeetingsTrash: () => getMeetingsTrash(currentOrg.id),
    addMeetingToTrash: (meeting) => addMeetingToTrash(currentOrg.id, meeting),
    restoreMeetingFromTrash: (meetingId) => restoreMeetingFromTrash(currentOrg.id, meetingId),
    permanentlyDeleteMeetingFromTrash: (meetingId) => permanentlyDeleteMeetingFromTrash(currentOrg.id, meetingId),
    getCustomMeetings: () => getCustomMeetings(currentOrg.id),
    saveCustomMeeting: (meeting) => saveCustomMeeting(currentOrg.id, meeting),
    deleteCustomMeeting: (meetingId) => deleteCustomMeeting(currentOrg.id, meetingId),
    getMeetingOverrides: () => getMeetingOverrides(currentOrg.id),
    saveMeetingOverride: (meetingId, overrides) => saveMeetingOverride(currentOrg.id, meetingId, overrides),
  }), [
    currentOrg,
    currentOrgId,
    organizations,
    switchOrg,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    getStorageKey,
  ]);

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return ctx;
}

export const useOrgContext = useOrg;

