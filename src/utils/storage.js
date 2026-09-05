import { getCanonicalMeetingsForOrg } from './canonicalMeetings.js';

// ─── Multi-Tenant Workspace Storage Engine ─────────────────────────────────
// Ensures complete data isolation between different Student Science Clubs (KN).

/**
 * Returns a standardized, isolated localStorage key for a specific organization.
 * @param {string} orgId - Unique organization slug/identifier (e.g. 'skn-psychoonkologia', 'sknu', 'skn_psycho')
 * @param {string} baseKey - Logical resource key (e.g. 'members', 'attendance_M01', 'custom_overrides')
 * @returns {string} Fully qualified namespaced key: `crm_psychoonkologia_${orgId}_${baseKey}`
 */
export function getOrgKey(orgId = 'default', baseKey = '') {
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanBaseKey = String(baseKey || '').trim();
  
  return `crm_psychoonkologia_${cleanOrgId}_${cleanBaseKey}`;
}

/**
 * Reads data from localStorage for a specific organization.
 */
export function getOrgStorage(orgId, baseKey, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  
  const orgKey = getOrgKey(orgId, baseKey);
  
  try {
    const raw = localStorage.getItem(orgKey);
    if (raw !== null) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  } catch (err) {
    console.warn(`[Storage] Error reading ${orgKey}:`, err);
  }
  
  return defaultValue;
}

/**
 * Writes data to localStorage for a specific organization.
 */
export function setOrgStorage(orgId, baseKey, value) {
  if (typeof window === 'undefined') return;
  
  const orgKey = getOrgKey(orgId, baseKey);
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(orgKey, serialized);
  } catch (err) {
    console.error(`[Storage] Error writing ${orgKey}:`, err);
  }
}

/**
 * Removes data from localStorage for a specific organization.
 */
export function removeOrgStorage(orgId, baseKey) {
  if (typeof window === 'undefined') return;
  
  const orgKey = getOrgKey(orgId, baseKey);
  try {
    localStorage.removeItem(orgKey);
  } catch (err) {
    console.error(`[Storage] Error removing ${orgKey}:`, err);
  }
}

/**
 * Clears all stored data belonging to a specific organization workspace.
 */
export function clearOrgWorkspace(orgId) {
  if (typeof window === 'undefined' || !orgId) return;
  
  const prefix = `crm_psychoonkologia_${String(orgId).trim().toLowerCase()}_`;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.error(`[Storage] Error clearing workspace ${orgId}:`, err);
  }
}

/**
 * Automatically migrates and restores legacy meeting and attendance data for a given organization,
 * ensuring no approved meetings or verified attendance lists are lost.
 */
export function restoreLegacyMeetingData(orgId = 'skn-psychoonkologia') {
  if (typeof window === 'undefined' || !orgId) return;

  const cleanId = String(orgId).trim().toLowerCase();
  // SKN Psychoonkologia startuje z czystą bazą spotkań i obecności
  if (cleanId === 'skn-psychoonkologia' || cleanId === 'skn_psychoonkologia') {
    return;
  }

  const targetMeetingsKey = getOrgKey(cleanId, 'meetings');
  const targetAttendanceKey = getOrgKey(cleanId, 'attendance');

  try {
    // 1. Check if meetings already exist in isolated storage
    const existingRaw = localStorage.getItem(targetMeetingsKey);
    let currentMeetings = [];
    if (existingRaw) {
      try { currentMeetings = JSON.parse(existingRaw); } catch {}
    }

    if (!Array.isArray(currentMeetings) || currentMeetings.length === 0) {
      currentMeetings = getCanonicalMeetingsForOrg(cleanId);
      if (Array.isArray(currentMeetings) && currentMeetings.length > 0) {
        localStorage.setItem(targetMeetingsKey, JSON.stringify(currentMeetings));
      }
    }
  } catch (err) {
    console.warn('[Storage Migration] Error in restoreLegacyMeetingData:', err);
  }
}

// ─── BACKUP & RECOVERY SUITE (Single Org & Master SuperAdmin) ───────────────

/**
 * Utility helper to trigger browser download of a JSON object as a file.
 */
export function downloadJSONFile(filename, dataObj) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const jsonStr = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Backup Download Error]', err);
  }
}

/**
 * Exports isolated workspace backup for a specific organization.
 */
export function exportOrgBackup(orgId, author = 'Admin') {
  if (typeof window === 'undefined' || !orgId) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const prefix = `crm_psychoonkologia_${cleanId}_`;

  const orgData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      try {
        orgData[k] = JSON.parse(localStorage.getItem(k));
      } catch {
        orgData[k] = localStorage.getItem(k);
      }
    }
  }

  const payload = {
    version: '2.0.0',
    type: 'ORG_BACKUP',
    orgId: cleanId,
    exportedAt: new Date().toISOString(),
    exportedBy: author,
    totalKeys: Object.keys(orgData).length,
    data: orgData,
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadJSONFile(`${cleanId}_backup_${dateStr}.json`, payload);
  return payload;
}

/**
 * Validates and imports organization backup, isolating it to targetOrgId.
 */
export function importOrgBackup(targetOrgId, jsonInput) {
  if (typeof window === 'undefined' || !targetOrgId) {
    throw new Error('Środowisko nie obsługuje localStorage lub nie podano ID koła.');
  }
  const cleanTargetId = String(targetOrgId).trim().toLowerCase();

  let backup;
  try {
    backup = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
  } catch (e) {
    throw new Error('Nieprawidłowy format JSON pliku kopii zapasowej.');
  }

  if (!backup || typeof backup !== 'object') {
    throw new Error('Struktura pliku jest pusta lub nieprawidłowa.');
  }

  const rawData = backup.data || backup;
  if (!rawData || typeof rawData !== 'object' || Object.keys(rawData).length === 0) {
    throw new Error('Plik kopii zapasowej nie zawiera żadnych danych rejestru koła.');
  }

  // Create safety auto-snapshot before restoring
  try {
    createOrgSnapshot(cleanTargetId, 'Przed przywróceniem z pliku');
  } catch (e) {
    console.warn('[Backup] Nie udało się utworzyć migawki przed importem:', e);
  }

  // 1. Clear existing keys for target organization
  clearOrgWorkspace(cleanTargetId);

  // 2. Restore keys, ensuring they are mapped to targetOrgId
  let restoredCount = 0;
  const targetPrefix = `crm_psychoonkologia_${cleanTargetId}_`;

  Object.keys(rawData).forEach((origKey) => {
    let newKey = origKey;
    if (origKey.startsWith('crm_psychoonkologia_') || origKey.startsWith('crm_org_')) {
      const parts = origKey.split('_');
      // replace org segment with cleanTargetId
      const baseKey = parts.slice(3).join('_');
      newKey = `${targetPrefix}${baseKey}`;
    } else {
      newKey = `${targetPrefix}${origKey}`;
    }

    const value = rawData[origKey];
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(newKey, serialized);
      restoredCount++;
    } catch (err) {
      console.error(`[Backup Restore] Błąd zapisu klucza ${newKey}:`, err);
    }
  });

  return {
    success: true,
    targetOrgId: cleanTargetId,
    keysRestored: restoredCount,
    timestamp: new Date().toISOString(),
  };
}

/**
 * SuperAdmin Master Backup: Exports all organizations and global settings.
 */
export function exportMasterBackup(author = 'SuperAdmin') {
  if (typeof window === 'undefined') return null;

  const masterData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('crm_')) {
      try {
        const val = localStorage.getItem(k);
        masterData[k] = JSON.parse(val);
      } catch {
        masterData[k] = localStorage.getItem(k);
      }
    }
  }

  const payload = {
    version: '2.0.0',
    type: 'MASTER_CRM_BACKUP',
    exportedAt: new Date().toISOString(),
    exportedBy: author,
    totalKeys: Object.keys(masterData).length,
    data: masterData,
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadJSONFile(`MASTER_CRM_BACKUP_${dateStr}.json`, payload);
  return payload;
}

/**
 * SuperAdmin Master Restore: Imports all organizations from a Master Backup file.
 */
export function importMasterBackup(jsonInput) {
  if (typeof window === 'undefined') {
    throw new Error('Środowisko nie obsługuje localStorage.');
  }

  let backup;
  try {
    backup = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
  } catch (e) {
    throw new Error('Nieprawidłowy format JSON pliku Master Backup.');
  }

  if (!backup || typeof backup !== 'object') {
    throw new Error('Plik Master Backup jest pusty lub uszkodzony.');
  }

  const rawData = backup.data || backup;
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Brak danych w pliku Master Backup.');
  }

  let restoredCount = 0;
  Object.keys(rawData).forEach((key) => {
    if (key.startsWith('crm_')) {
      const val = rawData[key];
      try {
        const serialized = typeof val === 'string' ? val : JSON.stringify(val);
        localStorage.setItem(key, serialized);
        restoredCount++;
      } catch (err) {
        console.error(`[Master Restore] Błąd zapisu ${key}:`, err);
      }
    }
  });

  return {
    success: true,
    keysRestored: restoredCount,
    timestamp: new Date().toISOString(),
  };
}

// ─── LOCAL AUTO-SNAPSHOTS & RESTORE POINT (ROLLBACK) ───────────────────────

const MAX_SNAPSHOTS_PER_ORG = 5;

/**
 * Creates an automatic snapshot of the organization's current state.
 * Keeps a maximum of 5 snapshots per organization (pruning oldest).
 */
export function createOrgSnapshot(orgId, reason = 'Automatyczna migawka') {
  if (typeof window === 'undefined' || !orgId) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const prefix = `crm_psychoonkologia_${cleanId}_`;

  const snapshotData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      try {
        snapshotData[k] = JSON.parse(localStorage.getItem(k));
      } catch {
        snapshotData[k] = localStorage.getItem(k);
      }
    }
  }

  if (Object.keys(snapshotData).length === 0) return null;

  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const snapshotKey = `crm_snap_${cleanId}_${now}_${rand}`;
  const payload = {
    key: snapshotKey,
    orgId: cleanId,
    timestamp: now,
    isoDate: new Date(now).toISOString(),
    formattedDate: new Date(now).toLocaleString('pl-PL'),
    reason,
    keysCount: Object.keys(snapshotData).length,
    data: snapshotData,
  };

  try {
    localStorage.setItem(snapshotKey, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Snapshot] Storage quota exceeded:', err);
  }

  // Prune older snapshots beyond MAX_SNAPSHOTS_PER_ORG
  try {
    const snapPrefix = `crm_snap_${cleanId}_`;
    const existingSnaps = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(snapPrefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(k));
          existingSnaps.push({ key: k, timestamp: item.timestamp || 0 });
        } catch {
          existingSnaps.push({ key: k, timestamp: 0 });
        }
      }
    }

    existingSnaps.sort((a, b) => b.timestamp - a.timestamp);
    if (existingSnaps.length > MAX_SNAPSHOTS_PER_ORG) {
      const toDelete = existingSnaps.slice(MAX_SNAPSHOTS_PER_ORG);
      toDelete.forEach((s) => localStorage.removeItem(s.key));
    }
  } catch (err) {
    console.warn('[Snapshot Rotation Error]', err);
  }

  return payload;
}

/**
 * Returns list of stored snapshots for an organization, sorted newest first.
 */
export function getOrgSnapshots(orgId) {
  if (typeof window === 'undefined' || !orgId) return [];
  const cleanId = String(orgId).trim().toLowerCase();
  const snapPrefix = `crm_snap_${cleanId}_`;

  const list = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(snapPrefix)) {
      try {
        const item = JSON.parse(localStorage.getItem(k));
        if (item && item.timestamp) {
          list.push({
            key: k,
            orgId: cleanId,
            timestamp: item.timestamp,
            isoDate: item.isoDate || new Date(item.timestamp).toISOString(),
            formattedDate: item.formattedDate || new Date(item.timestamp).toLocaleString('pl-PL'),
            reason: item.reason || 'Kopia zapasowa',
            keysCount: item.keysCount || (item.data ? Object.keys(item.data).length : 0),
          });
        }
      } catch {}
    }
  }

  list.sort((a, b) => b.timestamp - a.timestamp);
  return list;
}

/**
 * Restores organization state from a specific local snapshot key.
 */
export function restoreOrgSnapshot(orgId, snapshotKey) {
  if (typeof window === 'undefined' || !orgId || !snapshotKey) {
    throw new Error('Brak wymaganych parametrów do przywrócenia migawki.');
  }
  const cleanId = String(orgId).trim().toLowerCase();

  const raw = localStorage.getItem(snapshotKey);
  if (!raw) {
    throw new Error('Nie odnaleziono wybranej migawki w pamięci lokalnej.');
  }

  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    throw new Error('Uszkodzony format wybranej migawki.');
  }

  if (!snapshot.data || typeof snapshot.data !== 'object') {
    throw new Error('Migawka nie zawiera prawidłowych danych.');
  }

  // Create temporary safety snapshot
  try {
    createOrgSnapshot(cleanId, 'Automatyczny punkt przed rollbackiem');
  } catch {}

  // Clear and restore
  clearOrgWorkspace(cleanId);
  let restored = 0;
  Object.keys(snapshot.data).forEach((key) => {
    try {
      const val = snapshot.data[key];
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      restored++;
    } catch (e) {
      console.error(`[Snapshot Restore] Błąd przywracania ${key}:`, e);
    }
  });

  return {
    success: true,
    keysRestored: restored,
    snapshotDate: snapshot.formattedDate,
  };
}

/**
 * Deletes a specific snapshot.
 */
export function deleteOrgSnapshot(snapshotKey) {
  if (typeof window === 'undefined' || !snapshotKey) return;
  try {
    localStorage.removeItem(snapshotKey);
  } catch (err) {
    console.error('[Snapshot Delete Error]', err);
  }
}

/**
 * Hard Rollback to Canonical Baseline: Restores verified canonical state
 * for meetings, supervisors, and baseline settings for the organization.
 */
export function restoreStableBaseline(orgId) {
  if (typeof window === 'undefined' || !orgId) return;
  const cleanId = String(orgId).trim().toLowerCase();

  // Create backup snapshot before baseline reset
  try {
    createOrgSnapshot(cleanId, 'Przed przywróceniem stanu bazowego (Rollback)');
  } catch {}

  // 1. Restore canonical meetings & verified attendances
  restoreLegacyMeetingData(cleanId);

  // 2. Remove corrupted/inconsistent override keys
  removeOrgStorage(cleanId, 'custom_meeting_types');

  return {
    success: true,
    orgId: cleanId,
    timestamp: new Date().toISOString(),
  };
}

// ─── OFFICIAL ISSUED DOCUMENTS REGISTRY (Ewidencja Wydanych Aktów) ───────────

export const DEFAULT_ISSUED_REGISTRY = {
  'skn-psychoonkologia': [],
  'skn_psychoonkologia': [],
  sknu: [
    {
      id: "SKNU/25-26/26535-3797",
      type: "Dyplom Prelegenta",
      recipientName: "Magda Czepirska",
      recipientIndex: "26535",
      issueDate: "2026-06-08",
      academicYear: "2025/2026",
      details: "Wykład: Historia profilaktyki uzależnień",
      status: "Wydany / Podpisany",
      createdAt: "2026-06-08T18:00:00.000Z",
    },
    {
      id: "SKNU/25-26/34327-0102",
      type: "Zaświadczenie Członka",
      recipientName: "Monika Łyniewska",
      recipientIndex: "34327",
      issueDate: "2026-07-16",
      academicYear: "2025/2026",
      details: "Frekwencja: 100% (4/4 spotkania), 22 pkt aktywności",
      status: "Wydany / Podpisany",
      createdAt: "2026-07-16T19:00:00.000Z",
    },
  ],
  skn_seksuologii: [
    {
      id: "SKN-SEKS/25-26/34327-8911",
      type: "Zaświadczenie Zarządu",
      recipientName: "Monika Łyniewska",
      recipientIndex: "34327",
      issueDate: "2026-06-30",
      academicYear: "2025/2026",
      details: "Funkcja: Sekretarz Koła Naukowego",
      status: "Wydany / Podpisany",
      createdAt: "2026-06-30T17:00:00.000Z",
    },
    {
      id: "SKN-SEKS/25-26/10372-4421",
      type: "Dyplom Prelegenta",
      recipientName: "Adrian Puczkowski",
      recipientIndex: "10372",
      issueDate: "2026-05-18",
      academicYear: "2025/2026",
      details: "Referat: Trauma wczesnodziecięca i mechanizmy obronne",
      status: "Wydany / Podpisany",
      createdAt: "2026-05-18T18:30:00.000Z",
    },
  ],
};

/**
 * Returns list of issued certificates and documents for an organization.
 */
export function getIssuedDocumentsRegistry(orgId) {
  if (typeof window === 'undefined' || !orgId) return [];
  const cleanId = String(orgId).trim().toLowerCase();
  const defaultList = DEFAULT_ISSUED_REGISTRY[cleanId] || [];

  const stored = getOrgStorage(cleanId, 'issued_documents_registry', null);
  if (stored && Array.isArray(stored)) {
    return stored;
  }

  // First time initialization with defaults
  if (defaultList.length > 0) {
    setOrgStorage(cleanId, 'issued_documents_registry', defaultList);
    return defaultList;
  }

  return [];
}

/**
 * Appends a newly issued document to the organization's registry if not already present.
 */
export function addIssuedDocument(orgId, docEntry) {
  if (typeof window === 'undefined' || !orgId || !docEntry || !docEntry.id) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getIssuedDocumentsRegistry(cleanId);

  // Check if exists by ID
  const existingIdx = current.findIndex(d => d.id === docEntry.id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...docEntry, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...docEntry, createdAt: docEntry.createdAt || new Date().toISOString() }, ...current];
  }

  setOrgStorage(cleanId, 'issued_documents_registry', updated);
  return updated;
}

/**
 * Updates an existing entry in the organization's registry.
 */
export function updateIssuedDocument(orgId, docId, updatedFields) {
  if (typeof window === 'undefined' || !orgId || !docId) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getIssuedDocumentsRegistry(cleanId);

  const updated = current.map(doc => {
    if (doc.id !== docId) return doc;
    return {
      ...doc,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
  });

  setOrgStorage(cleanId, 'issued_documents_registry', updated);
  return updated;
}

/**
 * Deletes a document entry from the registry.
 */
export function deleteIssuedDocument(orgId, docId) {
  if (typeof window === 'undefined' || !orgId || !docId) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getIssuedDocumentsRegistry(cleanId);

  const updated = current.filter(d => d.id !== docId);
  setOrgStorage(cleanId, 'issued_documents_registry', updated);
  return updated;
}

// ─── ELECTRONIC CORRESPONDENCE LOG (Dziennik Podawczy & Kancelaria) ──────────

export const DEFAULT_CORRESPONDENCE_LOG = {
  'skn-psychoonkologia': [],
  'skn_psychoonkologia': [],
  sknu: [
    {
      id: "KANC/SKNU/IN/01/2026",
      direction: "IN",
      date: "2026-06-02",
      sender: "Dziekanat WNS WSKZ <dziekanat@wskz.pl>",
      recipient: "Zarząd SKNU <sknu@student.wskz.pl>",
      subject: "Zatwierdzenie wniosku o dofinansowanie warsztatów profilaktycznych Unplugged",
      summary: "Pismo informujące o przyznaniu dofinansowania ze środków statutowych uczelni na zakup pakietu podręczników trenerskich.",
      hash: "sknu_in_01_20260602",
      status: "Zrealizowane / Zarchiwizowane",
      createdAt: "2026-06-02T10:30:00.000Z",
    },
    {
      id: "KANC/SKNU/OUT/02/2026",
      direction: "OUT",
      date: "2026-06-15",
      sender: "Zarząd SKNU <sknu@student.wskz.pl>",
      recipient: "Dyrekcja Instytutu Psychologii WSKZ <instytut.psychologii@wskz.pl>",
      subject: "Zgłoszenie harmonogramu spotkań koła w semestrze letnim 2025/2026",
      summary: "Oficjalny wykaz 4 spotkań i warsztatów naukowych prowadzonych przez Koło z opiekunem mgr. Sławomirem Pietrzakiem.",
      hash: "sknu_out_02_20260615",
      status: "Zarejestrowane / Wysłane",
      createdAt: "2026-06-15T14:15:00.000Z",
    },
  ],
  skn_seksuologii: [
    {
      id: "KANC/SEKS/IN/01/2025",
      direction: "IN",
      date: "2025-10-10",
      sender: "Dziekanat WNS WSKZ <dziekanat@wskz.pl>",
      recipient: "Zarząd SKN Seksuologii <skn.seksuologia@gmail.com>",
      subject: "Zgoda na organizację cyklicznych sesji Journal Club i harmonogramu 14 spotkań",
      summary: "Decyzja Władz Uczelni o zatwierdzeniu planu 14 spotkań i udostępnieniu sal seminaryjnych oraz auli MS Teams.",
      hash: "seks_in_01_20251010",
      status: "Zrealizowane / Zarchiwizowane",
      createdAt: "2025-10-10T11:00:00.000Z",
    },
    {
      id: "KANC/SEKS/OUT/03/2026",
      direction: "OUT",
      date: "2026-05-20",
      sender: "Zarząd SKN Seksuologii <skn.seksuologia@gmail.com>",
      recipient: "Dział Nauki i Wydawnictw WSKZ <nauka@wskz.pl>",
      subject: "Sprawozdanie cząstkowe z realizacji projektów badawczych i dorobku naukowego",
      summary: "Wykaz publikacji, wystąpień konferencyjnych oraz raportów naukowych członków koła w roku 2025/2026.",
      hash: "seks_out_03_20260520",
      status: "Zarejestrowane / Wysłane",
      createdAt: "2026-05-20T16:20:00.000Z",
    },
  ],
};

/**
 * Returns correspondence log records for an organization.
 */
export function getCorrespondenceLog(orgId) {
  if (typeof window === 'undefined' || !orgId) return [];
  const cleanId = String(orgId).trim().toLowerCase();
  const defaultList = DEFAULT_CORRESPONDENCE_LOG[cleanId] || [];

  const stored = getOrgStorage(cleanId, 'correspondence_log', null);
  if (stored && Array.isArray(stored)) {
    return stored;
  }

  // Initialize with defaults if empty
  if (defaultList.length > 0) {
    setOrgStorage(cleanId, 'correspondence_log', defaultList);
    return defaultList;
  }

  return [];
}

/**
 * Adds a new entry into the organization's correspondence log.
 */
export function addCorrespondenceEntry(orgId, entry) {
  if (typeof window === 'undefined' || !orgId || !entry || !entry.id) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getCorrespondenceLog(cleanId);

  const existingIdx = current.findIndex(d => d.id === entry.id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...entry, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...entry, createdAt: entry.createdAt || new Date().toISOString() }, ...current];
  }

  setOrgStorage(cleanId, 'correspondence_log', updated);
  return updated;
}

/**
 * Updates an existing entry in the correspondence log.
 */
export function updateCorrespondenceEntry(orgId, entryId, updatedFields) {
  if (typeof window === 'undefined' || !orgId || !entryId) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getCorrespondenceLog(cleanId);

  const updated = current.map(d => {
    if (d.id === entryId) {
      return { ...d, ...updatedFields, updatedAt: new Date().toISOString() };
    }
    return d;
  });

  setOrgStorage(cleanId, 'correspondence_log', updated);
  return updated;
}

/**
 * Deletes an entry from the correspondence log.
 */
export function deleteCorrespondenceEntry(orgId, entryId) {
  if (typeof window === 'undefined' || !orgId || !entryId) return [];
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getCorrespondenceLog(cleanId);

  const updated = current.filter(d => d.id !== entryId);
  setOrgStorage(cleanId, 'correspondence_log', updated);
  return updated;
}

/**
 * Retrieves the saved protocol for a specific meeting.
 */
export function getMeetingProtocol(orgId, meetingId) {
  if (typeof window === 'undefined' || !orgId || !meetingId) return null;
  const cleanOrgId = String(orgId).trim().toLowerCase();
  const cleanMeetingId = String(meetingId).trim().replace(/[\[\]]/g, '');
  return getOrgStorage(cleanOrgId, `meeting_${cleanMeetingId}_protocol`, null);
}

/**
 * Saves or updates the protocol for a specific meeting.
 */
export function saveMeetingProtocol(orgId, meetingId, protocolData) {
  if (typeof window === 'undefined' || !orgId || !meetingId || !protocolData) return null;
  const cleanOrgId = String(orgId).trim().toLowerCase();
  const cleanMeetingId = String(meetingId).trim().replace(/[\[\]]/g, '');
  const entry = {
    ...protocolData,
    meetingId: cleanMeetingId,
    orgId: cleanOrgId,
    updatedAt: new Date().toISOString(),
  };
  setOrgStorage(cleanOrgId, `meeting_${cleanMeetingId}_protocol`, entry);
  return entry;
}

/**
 * Retrieves the documents list for an organization.
 */
export function getDocumentsRegistry(orgId) {
  if (typeof window === 'undefined' || !orgId) return [];
  const cleanOrgId = String(orgId).trim().toLowerCase();
  return getOrgStorage(cleanOrgId, 'documents', []);
}

/**
 * Adds or updates a document in the documents repository.
 */
export function addDocumentToRegistry(orgId, newDoc) {
  if (typeof window === 'undefined' || !orgId || !newDoc || !newDoc.id) return [];
  const cleanOrgId = String(orgId).trim().toLowerCase();
  const current = getDocumentsRegistry(cleanOrgId);
  const existingIdx = current.findIndex(d => d.id === newDoc.id || d.code === newDoc.code);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...newDoc, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...newDoc, createdAt: newDoc.createdAt || new Date().toISOString() }, ...current];
  }
  setOrgStorage(cleanOrgId, 'documents', updated);
  return updated;
}

// ─── Blacklist / Wykluczeni członkowie (crm_psychoonkologia_${orgId}_blacklist_members) ──
/**
 * Pobiera listę wykluczonych członków dla danej organizacji
 */
export function getBlacklistedMembers(orgId = 'default') {
  if (typeof window === 'undefined') return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  return getOrgStorage(cleanOrgId, 'blacklist_members', []);
}

/**
 * Dodaje członka na stałą czarną listę organizacji
 */
export function addMemberToBlacklist(orgId = 'default', member) {
  if (typeof window === 'undefined' || !member) return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getBlacklistedMembers(cleanOrgId) || [];

  const fullName = String(member.fullName || `${member.firstName || ''} ${member.lastName || ''}`).trim();
  const email = String(member.email || '').trim().toLowerCase();
  const rawIdx = String(member.index || member.indexNumber || member.cleanIndex || '').replace(/\D/g, '');
  const id = String(member.id || '');

  const exists = current.some(item => {
    if (id && item.id && item.id === id) return true;
    if (email && item.email && item.email.toLowerCase() === email) return true;
    if (rawIdx && item.index && item.index === rawIdx) return true;
    if (fullName && item.fullName && item.fullName.toLowerCase() === fullName.toLowerCase()) return true;
    return false;
  });

  if (!exists) {
    const entry = {
      id: id || `bl_${Date.now()}`,
      fullName,
      email,
      index: rawIdx,
      reason: member.archiveReason || 'Usunięty / Archiwum',
      archivedAt: new Date().toISOString(),
    };
    current.push(entry);
    setOrgStorage(cleanOrgId, 'blacklist_members', current);
  }
  return current;
}

/**
 * Usuwa członka z czarnej listy
 */
export function removeMemberFromBlacklist(orgId = 'default', identifier) {
  if (typeof window === 'undefined') return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getBlacklistedMembers(cleanOrgId) || [];
  const cleanId = String(identifier || '').toLowerCase().trim();

  const filtered = current.filter(item => {
    if (item.id && item.id.toLowerCase() === cleanId) return false;
    if (item.email && item.email.toLowerCase() === cleanId) return false;
    if (item.index && item.index === cleanId) return false;
    if (item.fullName && item.fullName.toLowerCase() === cleanId) return false;
    return true;
  });

  setOrgStorage(cleanOrgId, 'blacklist_members', filtered);
  return filtered;
}

/**
 * Sprawdza czy dany członek znajduje się na czarnej liście
 */
export function isMemberBlacklisted(member, blacklist = []) {
  if (!member || !Array.isArray(blacklist) || blacklist.length === 0) return false;

  const fullName = String(member.fullName || `${member.firstName || ''} ${member.lastName || ''}`).trim().toLowerCase();
  const email = String(member.email || '').trim().toLowerCase();
  const rawIdx = String(member.index || member.indexNumber || member.cleanIndex || '').replace(/\D/g, '');
  const id = String(member.id || '');

  return blacklist.some(item => {
    if (id && item.id && item.id === id) return true;
    if (email && item.email && item.email.toLowerCase() === email) return true;
    if (rawIdx && item.index && item.index === rawIdx) return true;
    if (fullName && item.fullName && item.fullName.toLowerCase() === fullName) return true;
    return false;
  });
}

// ─── Meetings Soft Delete / Trash & Custom Management (crm_psychoonkologia_${orgId}_meetings_trash) ──

/**
 * Pobiera listę spotkań w Koszu (Soft Delete) dla danej organizacji
 */
export function getMeetingsTrash(orgId = 'default') {
  if (typeof window === 'undefined') return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  return getOrgStorage(cleanOrgId, 'meetings_trash', []);
}

/**
 * Przenosi spotkanie do Kosza (Soft Delete)
 */
export function addMeetingToTrash(orgId = 'default', meeting) {
  if (typeof window === 'undefined' || !meeting) return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getMeetingsTrash(cleanOrgId);
  const mId = meeting.id || meeting.code || meeting.date;

  const existingIdx = current.findIndex(m => (m.id && m.id === mId) || (m.code && m.code === meeting.code));
  const trashEntry = {
    ...meeting,
    deletedAt: new Date().toISOString(),
  };

  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = trashEntry;
  } else {
    updated = [trashEntry, ...current];
  }

  setOrgStorage(cleanOrgId, 'meetings_trash', updated);
  return updated;
}

/**
 * Przywraca spotkanie z Kosza na główną listę spotkań
 */
export function restoreMeetingFromTrash(orgId = 'default', meetingId) {
  if (typeof window === 'undefined' || !meetingId) return { updatedTrash: [], restoredMeeting: null };
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getMeetingsTrash(cleanOrgId);
  const cleanMId = String(meetingId).trim().replace(/[\[\]]/g, '');

  const found = current.find(m => (m.id && String(m.id).trim() === cleanMId) || (m.code && String(m.code).trim() === cleanMId));
  const updatedTrash = current.filter(m => !( (m.id && String(m.id).trim() === cleanMId) || (m.code && String(m.code).trim() === cleanMId) ));

  setOrgStorage(cleanOrgId, 'meetings_trash', updatedTrash);
  return { updatedTrash, restoredMeeting: found };
}

/**
 * Trwale usuwa spotkanie z Kosza (Permanent Delete)
 */
export function permanentlyDeleteMeetingFromTrash(orgId = 'default', meetingId) {
  if (typeof window === 'undefined' || !meetingId) return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getMeetingsTrash(cleanOrgId);
  const cleanMId = String(meetingId).trim().replace(/[\[\]]/g, '');

  const updatedTrash = current.filter(m => !( (m.id && String(m.id).trim() === cleanMId) || (m.code && String(m.code).trim() === cleanMId) ));
  setOrgStorage(cleanOrgId, 'meetings_trash', updatedTrash);

  // Dodaj ID do listy trwale ukrytych spotkań, aby nie powracało z API Teamup/kalendarza
  const hiddenMeetings = getOrgStorage(cleanOrgId, 'meetings_permanently_hidden', []);
  if (!hiddenMeetings.includes(cleanMId)) {
    hiddenMeetings.push(cleanMId);
    setOrgStorage(cleanOrgId, 'meetings_permanently_hidden', hiddenMeetings);
  }

  return updatedTrash;
}

/**
 * Pobiera ręcznie dodane spotkania
 */
export function getCustomMeetings(orgId = 'default') {
  if (typeof window === 'undefined') return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  return getOrgStorage(cleanOrgId, 'custom_meetings', []);
}

/**
 * Zapisuje lub aktualizuje ręcznie dodane spotkanie
 */
export function saveCustomMeeting(orgId = 'default', meeting) {
  if (typeof window === 'undefined' || !meeting) return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getCustomMeetings(cleanOrgId);
  const mId = meeting.id || meeting.code;

  const existingIdx = current.findIndex(m => m.id === mId || (m.code && m.code === meeting.code));
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...meeting, updatedAt: new Date().toISOString() };
  } else {
    updated = [...current, { ...meeting, createdAt: new Date().toISOString() }];
  }

  setOrgStorage(cleanOrgId, 'custom_meetings', updated);
  return updated;
}

/**
 * Usuwa ręcznie dodane spotkanie
 */
export function deleteCustomMeeting(orgId = 'default', meetingId) {
  if (typeof window === 'undefined' || !meetingId) return [];
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const current = getCustomMeetings(cleanOrgId);
  const cleanMId = String(meetingId).trim();
  const updated = current.filter(m => m.id !== cleanMId && m.code !== cleanMId);
  setOrgStorage(cleanOrgId, 'custom_meetings', updated);
  return updated;
}

/**
 * Pobiera nadpisania spotkań (np. zmieniony kod, zmieniony tytuł)
 */
export function getMeetingOverrides(orgId = 'default') {
  if (typeof window === 'undefined') return {};
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  return getOrgStorage(cleanOrgId, 'meeting_overrides', {});
}

/**
 * Zapisuje nadpisanie spotkania (kod, tytuł) oraz migruje klucze obecności w razie zmiany kodu
 */
export function saveMeetingOverride(orgId = 'default', meetingId, overrides = {}) {
  if (typeof window === 'undefined' || !meetingId) return {};
  const cleanOrgId = String(orgId || 'default').trim().toLowerCase();
  const allOverrides = getMeetingOverrides(cleanOrgId);
  const cleanMId = String(meetingId).trim();

  const prevOverride = allOverrides[cleanMId] || {};
  const newOverride = { ...prevOverride, ...overrides };
  allOverrides[cleanMId] = newOverride;

  setOrgStorage(cleanOrgId, 'meeting_overrides', allOverrides);

  // Jeśli zmieniono kod spotkania, migruj powiązane klucze obecności
  if (overrides.code && overrides.oldCode && overrides.code !== overrides.oldCode) {
    const oldCode = overrides.oldCode;
    const newCode = overrides.code;

    const oldListKey = getOrgKey(cleanOrgId, `meeting_${oldCode}_list`);
    const newListKey = getOrgKey(cleanOrgId, `meeting_${newCode}_list`);
    const oldListVal = localStorage.getItem(oldListKey);
    if (oldListVal && !localStorage.getItem(newListKey)) {
      localStorage.setItem(newListKey, oldListVal);
    }

    const oldAttKey = getOrgKey(cleanOrgId, `crm_attendance_${oldCode}`);
    const newAttKey = getOrgKey(cleanOrgId, `crm_attendance_${newCode}`);
    const oldAttVal = localStorage.getItem(oldAttKey);
    if (oldAttVal && !localStorage.getItem(newAttKey)) {
      localStorage.setItem(newAttKey, oldAttVal);
    }

    const oldProtoKey = getOrgKey(cleanOrgId, `meeting_${oldCode}_protocol`);
    const newProtoKey = getOrgKey(cleanOrgId, `meeting_${newCode}_protocol`);
    const oldProtoVal = localStorage.getItem(oldProtoKey);
    if (oldProtoVal && !localStorage.getItem(newProtoKey)) {
      localStorage.setItem(newProtoKey, oldProtoVal);
    }
  }

  return allOverrides;
}

// ─── EMAIL & NOTIFICATION CONFIGURATION (crm_psychoonkologia_${orgId}_email_config) ──

export const DEFAULT_EMAIL_CONFIG = {
  'skn-psychoonkologia': {
    senderEmail: 'skn.psychoonkologia@wskz.pl',
    senderName: 'Zarząd SKN Psychoonkologii WSKZ',
    replyTo: 'skn.psychoonkologia@wskz.pl',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'skn.psychoonkologia@wskz.pl',
    smtpPassword: '',
    footerSignature: 'Z poważaniem,\nZarząd Studenckiego Koła Naukowego Psychoonkologii WSKZ\nInstytut Psychologii WSKZ\ne-mail: skn.psychoonkologia@wskz.pl',
    welcomeSubjectTemplate: 'Potwierdzenie przyjęcia zgłoszenia i powitanie w SKN Psychoonkologii WSKZ',
    welcomeBodyTemplate: `Dzień dobry {IMIE},\n\nZ radością informujemy, że Twoje zgłoszenie do Studenckiego Koła Naukowego Psychoonkologii WSKZ na rok akademicki 2026/2027 zostało pomyślnie zweryfikowane i przyjęte!\n\nTwoje dane ewidencyjne:\n• Imię i nazwisko: {IMIE_NAZWISKO}\n• Kierunek: {KIERUNEK} ({ROK})\n• Numer indeksu: {INDEKS}\n\nNajważniejsze informacje organizacyjne:\n1. Harmonogram spotkań, sesji Journal Club oraz warsztatów merytorycznych dostępny jest w kalendarzu koła.\n2. Udział w spotkaniach i aktywność naukowa są na bieżąco ewidencjonowane w systemie CRM.\n3. W razie jakichkolwiek pytań zachęcamy do kontaktu mailowego z Zarządem Koła.\n\nSerdecznie witamy w naszym zespole i życzymy owocnej pracy naukowej!\n\n{PODPIS}`,
  },
  'skn_psychoonkologia': {
    senderEmail: 'skn.psychoonkologia@wskz.pl',
    senderName: 'Zarząd SKN Psychoonkologii WSKZ',
    replyTo: 'skn.psychoonkologia@wskz.pl',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'skn.psychoonkologia@wskz.pl',
    smtpPassword: '',
    footerSignature: 'Z poważaniem,\nZarząd Studenckiego Koła Naukowego Psychoonkologii WSKZ\nInstytut Psychologii WSKZ\ne-mail: skn.psychoonkologia@wskz.pl',
    welcomeSubjectTemplate: 'Potwierdzenie przyjęcia zgłoszenia i powitanie w SKN Psychoonkologii WSKZ',
    welcomeBodyTemplate: `Dzień dobry {IMIE},\n\nZ radością informujemy, że Twoje zgłoszenie do Studenckiego Koła Naukowego Psychoonkologii WSKZ na rok akademicki 2026/2027 zostało pomyślnie zweryfikowane i przyjęte!\n\nTwoje dane ewidencyjne:\n• Imię i nazwisko: {IMIE_NAZWISKO}\n• Kierunek: {KIERUNEK} ({ROK})\n• Numer indeksu: {INDEKS}\n\nNajważniejsze informacje organizacyjne:\n1. Harmonogram spotkań, sesji Journal Club oraz warsztatów merytorycznych dostępny jest w kalendarzu koła.\n2. Udział w spotkaniach i aktywność naukowa są na bieżąco ewidencjonowane w systemie CRM.\n3. W razie jakichkolwiek pytań zachęcamy do kontaktu mailowego z Zarządem Koła.\n\nSerdecznie witamy w naszym zespole i życzymy owocnej pracy naukowej!\n\n{PODPIS}`,
  },
};

export function getEmailConfig(orgId = 'skn-psychoonkologia') {
  if (typeof window === 'undefined' || !orgId) return DEFAULT_EMAIL_CONFIG['skn-psychoonkologia'];
  const cleanId = String(orgId).trim().toLowerCase();
  const defaultConf = DEFAULT_EMAIL_CONFIG[cleanId] || DEFAULT_EMAIL_CONFIG['skn-psychoonkologia'];
  const stored = getOrgStorage(cleanId, 'email_config', null);
  if (stored && typeof stored === 'object') {
    return { ...defaultConf, ...stored };
  }
  return defaultConf;
}

export function saveEmailConfig(orgId, config) {
  if (typeof window === 'undefined' || !orgId || !config) return null;
  const cleanId = String(orgId).trim().toLowerCase();
  const current = getEmailConfig(cleanId);
  const updated = { ...current, ...config, updatedAt: new Date().toISOString() };
  setOrgStorage(cleanId, 'email_config', updated);
  return updated;
}



