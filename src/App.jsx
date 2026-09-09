import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  CalendarDays,
  Wrench,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  X,
  Settings,
  ChevronDown,
  Building2,
  FileText,
  FolderKanban,
  Microscope,
} from 'lucide-react';
import ManagementTab from './components/ManagementTab';
import QuarantineTab from './components/QuarantineTab';
import MeetingsTab   from './components/MeetingsTab';
import DocumentsRepositoryTab from './components/DocumentsRepositoryTab';
import ResearchTab   from './components/ResearchTab';
import ReportsTab    from './components/ReportsTab';
import ToolsTab      from './components/ToolsTab';
import SettingsTab   from './components/SettingsTab';
import Navbar        from './components/Navbar';
import SettingsModal from './components/SettingsModal';
import ProfileMenu   from './components/ProfileMenu';
import SyncIndicator from './components/SyncIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './components/LoginScreen';
import { useAuth } from './context/AuthContext';
import { useOrg } from './context/OrgContext';
import { useAcademicYear } from './context/AcademicYearContext';
import { fetchAllData, AUTHORIZED_INDEXES, updateVerificationStatus, changeStudentStatusInGAS, initializeSubmissionsRegistryInGAS, editMemberInGAS, addMemberManuallyToGAS } from './services/googleSheets';
import { fetchTeamupEvents, fetchTeamupSubcalendars, DEFAULT_SUBCALENDAR_ID } from './services/teamupService';
import { materials, initialMembers, initialMeetings } from './data/mockData';
import { getRecordKey } from './utils/helpers';
import { getAcademicYearKey } from './utils/academicYear';
import { getCanonicalMeetingsForOrg, filterLegitimateMeetings } from './utils/canonicalMeetings';
import { getMeetingType, calculateCategorizedFrequency } from './utils/meetingTypes';
import {
  createOrgSnapshot,
  getBlacklistedMembers,
  addMemberToBlacklist,
  isMemberBlacklisted,
  getMeetingsTrash,
  getCustomMeetings,
  getMeetingOverrides,
  getCorrespondenceLog,
  setOrgStorage,
} from './utils/storage';

const TABS = [
  { id: 'management', label: 'Zarządzanie',                   icon: LayoutDashboard },
  { id: 'quarantine', label: 'Kwarantanna',                    icon: ShieldAlert },
  { id: 'meetings',   label: 'Spotkania & Obecność',           icon: CalendarDays },
  { id: 'documents',  label: '📁 Dokumenty & Uchwały',         icon: FolderKanban },
  { id: 'research',   label: '🔬 Dorobek & Badania',           icon: Microscope },
  { id: 'reports',    label: '📄 Sprawozdawczość & Dokumenty', icon: FileText },
  { id: 'tools',      label: 'Narzędzia & Mailing',            icon: Wrench },
  { id: 'settings',   label: '⚙️ Ustawienia & Dostęp',         icon: Settings },
];

// Sanitization: Complete elimination of local cache overrides (Single Source of Truth)
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('crm_archived_row_ids');
    localStorage.removeItem('crm_custom_overrides');
    localStorage.removeItem('crm_archived_keys');
    ['skn_psychoonkologii', 'skn_seksuologii', 'sknu', 'default'].forEach(org => {
      localStorage.removeItem(`crm_psychoonkologia_${org}_crm_archived_row_ids`);
      localStorage.removeItem(`crm_psychoonkologia_${org}_crm_custom_overrides`);
      localStorage.removeItem(`crm_${org}_crm_archived_row_ids`);
      localStorage.removeItem(`crm_${org}_crm_custom_overrides`);
    });
  } catch {}
}

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const { currentOrg, organizations, switchOrg, getStorageKey } = useOrg();
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_active_tab') || 'members';
    } catch {
      return 'members';
    }
  });
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_active_tab', tab);
    } catch {}
  }, []);

  const [membersSubTab, setMembersSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_members_subtab') || 'management';
    } catch {
      return 'management';
    }
  });
  const setMembersSubTab = useCallback((subTab) => {
    setMembersSubTabState(subTab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_members_subtab', subTab);
    } catch {}
  }, []);

  const [documentationSubTab, setDocumentationSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_doc_subtab') || 'reports';
    } catch {
      return 'reports';
    }
  });
  const setDocumentationSubTab = useCallback((subTab) => {
    setDocumentationSubTabState(subTab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_doc_subtab', subTab);
    } catch {}
  }, []);

  const [settingsToolsSubTab, setSettingsToolsSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_settings_subtab') || 'settings';
    } catch {
      return 'settings';
    }
  });
  const setSettingsToolsSubTab = useCallback((subTab) => {
    setSettingsToolsSubTabState(subTab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_settings_subtab', subTab);
    } catch {}
  }, []);

  // Master Data State
  const [members, setMembers]       = useState(initialMembers);
  const [quarantine, setQuarantine] = useState([]);
  const [archivedQuarantine, setArchivedQuarantine] = useState([]);
  const [approvedKeys, setApprovedKeys] = useState([]);
  const [archivedRowIds, setArchivedRowIds] = useState([]);
  const [resignedKeys, setResignedKeys] = useState([]);

  // Teamup Meetings State & Academic Year Filter
  const [meetings, setMeetings]     = useState(initialMeetings || []);
  const [subcalendars, setSubcalendars] = useState([
    { id: DEFAULT_SUBCALENDAR_ID || '15520558', name: 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' },
  ]);
  const [selectedSubcalendar, setSelectedSubcalendar] = useState(DEFAULT_SUBCALENDAR_ID || '15520558');

  // Persistent Academic Year via AcademicYearContext
  const {
    academicYear,
    setAcademicYear,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    getRangeForYear,
  } = useAcademicYear();

  const [pendingSyncCount, setPendingSyncCount] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey('crm_pending_sync_count'));
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey('crm_pending_sync_count'), String(pendingSyncCount));
    } catch {}
  }, [pendingSyncCount, currentOrg]);

  // Data Loss Prevention: warn user before closing/reloading page if there are unsynced changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingSyncCount > 0) {
        e.preventDefault();
        e.returnValue = 'Masz niezsynchronizowane zmiany w arkuszu Google Sheets. Czy na pewno chcesz opuścić stronę?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pendingSyncCount]);

  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [reportsTarget, setReportsTarget] = useState({ member: null, docType: 'membership' });

  const handleNavigateToReports = useCallback((member, docType = 'membership') => {
    setReportsTarget({ member, docType });
    setActiveTab('documentation');
    setDocumentationSubTab('reports');
  }, [setActiveTab, setDocumentationSubTab]);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastSync, setLastSync]     = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState({
    status: 'synced',
    lastSyncTime: null,
    errorMessage: null,
  });

  const mergeMeetingWithLocalStorage = useCallback((m) => {
    if (!m) return m;
    const keys = [
      getStorageKey(`crm_attendance_${m.id}`),
      getStorageKey(`crm_attendance_${m.date}`),
      m.code ? getStorageKey(`crm_attendance_${m.code}`) : null,
    ].filter(Boolean);

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed)) {
              const confirmed = parsed
                .filter(p => p.manualApproved && p.member?.index)
                .map(p => p.member.index);
              return {
                ...m,
                attendees: confirmed.length > 0 ? confirmed : m.attendees,
                participantRecords: parsed,
              };
            } else if (parsed.confirmedIndexes || parsed.attendees) {
              const confirmed = parsed.confirmedIndexes || (
                Array.isArray(parsed.attendees)
                  ? parsed.attendees.filter(p => p.manualApproved && p.member?.index).map(p => p.member.index)
                  : []
              );
              return {
                ...m,
                attendees: confirmed.length > 0 ? confirmed : m.attendees,
                participantRecords: Array.isArray(parsed.attendees) ? parsed.attendees : [],
              };
            }
          }
        }
      } catch {}
    }
    return m;
  }, [getStorageKey]);

  // ── Fetch Teamup Meetings ──────────────────────────────────────────────────
  const loadMeetings = useCallback(async (
    subId = selectedSubcalendar,
    yr = academicYear,
    cStart = customStartDate,
    cEnd = customEndDate,
    sheetAttendanceMap = null
  ) => {
    setLoadingMeetings(true);
    try {
      const { startDate, endDate, yearPrefix } = getRangeForYear(yr, cStart, cEnd);
      const effectiveSubId = DEFAULT_SUBCALENDAR_ID || '15520558';
      const fetchedMeetings = await fetchTeamupEvents({
        startDate,
        endDate,
        subcalendarId: effectiveSubId,
        yearPrefix,
      });

      let legitimateMeetings = [];
      if (fetchedMeetings && fetchedMeetings.length > 0) {
        legitimateMeetings = filterLegitimateMeetings(fetchedMeetings, currentOrg.id);
      } else {
        legitimateMeetings = getCanonicalMeetingsForOrg(currentOrg.id);
      }

      const trash = getMeetingsTrash(currentOrg.id);
      const trashIds = new Set(trash.map(t => String(t.id || t.code || t.date).trim()));
      const customMeetings = getCustomMeetings(currentOrg.id);
      const overrides = getMeetingOverrides(currentOrg.id);

      // Scal ze spotkaniami dodanymi ręcznie
      const allMeetings = [...legitimateMeetings];
      customMeetings.forEach(cm => {
        if (!allMeetings.some(m => m.id === cm.id || (m.code && cm.code && m.code === cm.code))) {
          allMeetings.push(cm);
        }
      });

      // Odfiltruj Kosz i nałóż nadpisania kodów/danych
      const finalMeetings = allMeetings
        .filter(m => !trashIds.has(String(m.id).trim()) && !trashIds.has(String(m.code).trim()))
        .map(m => {
          const ov = overrides[m.id] || overrides[m.code];
          return ov ? { ...m, ...ov, code: ov.code || m.code } : m;
        });

      // Zastosuj frekwencję z Google Sheets jako Jedyne Źródło Prawdy (SSOT)
      const syncedMeetings = finalMeetings.map(m => {
        if (sheetAttendanceMap) {
          const rawCode = String(m.code || m.id || '').toUpperCase().trim();
          const cleanCode = rawCode.replace(/^\[.*?\]\s*/, '');
          
          let sheetRecords = sheetAttendanceMap[m.code] || sheetAttendanceMap[rawCode] || sheetAttendanceMap[cleanCode] || null;
          if (!sheetRecords) {
            for (const [k, records] of Object.entries(sheetAttendanceMap)) {
              const kClean = k.toUpperCase().trim().replace(/^\[.*?\]\s*/, '');
              if (kClean === cleanCode || k.toUpperCase().includes(cleanCode)) {
                sheetRecords = records;
                break;
              }
            }
          }

          const attendeesList = (sheetRecords || []).map(p => p.index || p.nrIndeksu || p.fullName);
          const count = attendeesList.length;
          return {
            ...m,
            attendees: attendeesList,
            attendeesCount: count,
            status: count > 0 ? `Zakończone (${count})` : 'Nierozliczone',
          };
        }
        return mergeMeetingWithLocalStorage(m);
      });

      setMeetings(syncedMeetings);
    } catch (err) {
      console.error('Błąd pobierania spotkań:', err);
      const fallback = getCanonicalMeetingsForOrg(currentOrg.id);
      const trash = getMeetingsTrash(currentOrg.id);
      const trashIds = new Set(trash.map(t => String(t.id || t.code || t.date).trim()));
      const customMeetings = getCustomMeetings(currentOrg.id);
      const overrides = getMeetingOverrides(currentOrg.id);

      const allFallback = [...fallback];
      customMeetings.forEach(cm => {
        if (!allFallback.some(m => m.id === cm.id || (m.code && cm.code && m.code === cm.code))) {
          allFallback.push(cm);
        }
      });

      const finalFallback = allFallback
        .filter(m => !trashIds.has(String(m.id).trim()) && !trashIds.has(String(m.code).trim()))
        .map(m => {
          const ov = overrides[m.id] || overrides[m.code];
          return ov ? { ...m, ...ov, code: ov.code || m.code } : m;
        });

      const syncedFallback = finalFallback.map(m => {
        if (sheetAttendanceMap) {
          const rawCode = String(m.code || m.id || '').toUpperCase().trim();
          const cleanCode = rawCode.replace(/^\[.*?\]\s*/, '');

          let sheetRecords = sheetAttendanceMap[m.code] || sheetAttendanceMap[rawCode] || sheetAttendanceMap[cleanCode] || null;
          if (!sheetRecords) {
            for (const [k, records] of Object.entries(sheetAttendanceMap)) {
              const kClean = k.toUpperCase().trim().replace(/^\[.*?\]\s*/, '');
              if (kClean === cleanCode || k.toUpperCase().includes(cleanCode)) {
                sheetRecords = records;
                break;
              }
            }
          }

          const attendeesList = (sheetRecords || []).map(p => p.index || p.nrIndeksu || p.fullName);
          const count = attendeesList.length;
          return {
            ...m,
            attendees: attendeesList,
            attendeesCount: count,
            status: count > 0 ? `Zakończone (${count})` : 'Nierozliczone',
          };
        }
        return mergeMeetingWithLocalStorage(m);
      });

      setMeetings(syncedFallback);
    } finally {
      setLoadingMeetings(false);
    }
  }, [selectedSubcalendar, academicYear, customStartDate, customEndDate, currentOrg, getRangeForYear, mergeMeetingWithLocalStorage]);

  // ── Fetch All Live Data & Categorize by Approved/Archived/Resigned Keys ───
  const loadData = useCallback(async (options = {}) => {
    const { silent = false } = options || {};
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));

    try {
      const [sheetsData, subcals] = await Promise.all([
        fetchAllData(currentOrg.sheetId),
        fetchTeamupSubcalendars(),
      ]);

      if (subcals && subcals.length > 0) {
        const onlyPsycho = subcals.filter(s => String(s.id) === (DEFAULT_SUBCALENDAR_ID || '15520558'));
        setSubcalendars(onlyPsycho.length > 0 ? onlyPsycho : [{ id: DEFAULT_SUBCALENDAR_ID || '15520558', name: 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' }]);
      }

      // Single Source of Truth: Kolumna H (Status_Weryfikacji) w arkuszu Rejestr_Zgloszen
      const rawMembers = (sheetsData.members && sheetsData.members.length > 0)
        ? sheetsData.members
        : initialMembers;
      const rawQuarantine = sheetsData.quarantine || [];
      const rawArchived = sheetsData.archivedQuarantine || [];

      // Połącz wszystkie unikalne rekordy z backendu
      const allLoaded = [...rawMembers, ...rawQuarantine, ...rawArchived];
      const dedupeMap = new Map();
      allLoaded.forEach(item => {
        if (!item) return;
        const rawIdx = String(item.nrIndeksu || item.index || item.cleanIndex || '').replace(/\D/g, '').trim();
        const key = rawIdx ? `idx_${rawIdx}` : (item.email ? `email_${String(item.email).toLowerCase().trim()}` : item.id);
        if (!dedupeMap.has(key) || item.fromSheet === 'Rejestr_Zgloszen') {
          dedupeMap.set(key, item);
        }
      });

      const uniqueAll = Array.from(dedupeMap.values());
      const activeAndGeneralMembers = [];
      const pendingQuarantineList = [];
      const archiveQuarantineList = [];

      uniqueAll.forEach(m => {
        const rawStatus = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();

        // 1. Usuniety - całkowicie pomijany we wszystkich widokach
        if (rawStatus === 'usuniety' || rawStatus === 'usunięty' || rawStatus === 'deleted') {
          return;
        }

        // 2. Archiwum
        if (rawStatus === 'archiwum' || rawStatus === 'archived' || rawStatus === 'odrzucony' || rawStatus === 'czarna lista') {
          archiveQuarantineList.push({
            ...m,
            statusWeryfikacji: 'Archiwum',
            status: 'archived',
            isArchived: true,
            isBlacklisted: true
          });
          return;
        }

        // 3. Oczekuje (Kwarantanna: Oczekujące zgłoszenia)
        if (rawStatus === 'oczekuje' || rawStatus === 'pending' || rawStatus === 'kwarantanna' || rawStatus === 'oczekiwanie 💬') {
          pendingQuarantineList.push({
            ...m,
            statusWeryfikacji: 'Oczekuje',
            status: 'quarantine',
            isArchived: false,
            isBlacklisted: false
          });
          return;
        }

        // 4. Gość (Główna lista: Goście & Wolni słuchacze)
        if (rawStatus === 'gosc' || rawStatus === 'gość' || rawStatus === 'guest' || rawStatus === 'wolny słuchacz') {
          activeAndGeneralMembers.push({
            ...m,
            statusWeryfikacji: 'Gosc',
            status: 'guest',
            isArchived: false,
            isBlacklisted: false
          });
          return;
        }

        // 5. Nieaktywny (Główna lista: Byli / Nieaktywni)
        if (rawStatus === 'nieaktywny' || rawStatus === 'rezygnacja' || rawStatus === 'resigned' || rawStatus === 'inactive' || rawStatus === 'były' || rawStatus === 'byly') {
          activeAndGeneralMembers.push({
            ...m,
            statusWeryfikacji: 'Nieaktywny',
            status: 'resigned',
            isArchived: false,
            isBlacklisted: false
          });
          return;
        }

        // 6. Aktywny / Zatwierdzony (Główna lista: Tylko aktywni)
        activeAndGeneralMembers.push({
          ...m,
          statusWeryfikacji: 'Aktywny',
          status: 'active',
          isArchived: false,
          isBlacklisted: false
        });
      });

      setMembers(activeAndGeneralMembers);
      setQuarantine(pendingQuarantineList);
      setArchivedQuarantine(archiveQuarantineList);

      // Sync & merge correspondence log from Ewidencja_Poczty if present in Google Sheets
      if (sheetsData.mailLog && Array.isArray(sheetsData.mailLog) && sheetsData.mailLog.length > 0 && currentOrg?.id) {
        try {
          const currentLog = getCorrespondenceLog(currentOrg.id);
          const mergedLog = [...currentLog];
          sheetsData.mailLog.forEach(item => {
            const idx = mergedLog.findIndex(m => m.id === item.id || (m.hash && m.hash === item.hash));
            if (idx === -1) {
              mergedLog.push(item);
            } else {
              mergedLog[idx] = { ...mergedLog[idx], ...item };
            }
          });
          setOrgStorage(currentOrg.id, 'correspondence_log', mergedLog);
        } catch (e) {
          console.warn('Błąd aktualizacji correspondence_log ze Sheets:', e);
        }
      }

      await loadMeetings(selectedSubcalendar, academicYear, customStartDate, customEndDate, sheetsData.attendanceByMeeting);

      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });

      // Auto-snapshot: Save local snapshot after successful sync (max 5 rotated per org)
      try {
        if (currentOrg?.id) {
          createOrgSnapshot(currentOrg.id, 'Automatyczna migawka po synchronizacji');
        }
      } catch {}
    } catch (err) {
      setError(err.message);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [currentOrg, loadMeetings, getStorageKey]);

  // ── Focus & Window Polling Revalidation (Cicha synchronizacja w tle) ─────
  useEffect(() => {
    let lastFocusTime = 0;
    const handleWindowFocus = () => {
      const now = Date.now();
      // Throttle focus revalidation to at most once every 15 seconds
      if (now - lastFocusTime > 15000) {
        lastFocusTime = now;
        loadData({ silent: true });
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadData]);

  useEffect(() => {
    // Purge legacy mock attendance data for M01 from localStorage on startup
    try {
      const purgeKey = 'crm_mock_attendance_purged_v3';
      if (!localStorage.getItem(purgeKey)) {
        const keysToPurge = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('2089952664') || k.includes('M01') || k.includes('2026-05-07'))) {
            keysToPurge.push(k);
          }
        }
        keysToPurge.forEach(k => {
          try { localStorage.removeItem(k); } catch {}
        });
        localStorage.setItem(purgeKey, 'true');
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Auto-switch subcalendar and re-load when switching active organization
    try {
      if (currentOrg?.subcalendarId) {
        setSelectedSubcalendar(currentOrg.subcalendarId);
      }
    } catch {}
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg.id]);

  // ── Member Edit & Real-time GAS Atomic Edit Sync ─────────────────────────
  async function handleSaveMember(updatedMember) {
    if (!updatedMember) return;
    const rawIndex = String(updatedMember.nrIndeksu || updatedMember.index || updatedMember.cleanIndex || '').replace(/\D/g, '').trim();

    const statusWeryfikacjiMap = {
      active: 'Aktywny',
      guest: 'Gosc',
      resigned: 'Nieaktywny',
      inactive: 'Nieaktywny',
      archived: 'Archiwum',
      pending: 'Oczekuje',
      quarantine: 'Oczekuje'
    };
    const targetStatus = updatedMember.status || 'active';
    const targetStatusWeryfikacji = updatedMember.statusWeryfikacji || statusWeryfikacjiMap[targetStatus] || targetStatus;

    const memberWithCanonical = {
      ...updatedMember,
      status: targetStatus,
      statusWeryfikacji: targetStatusWeryfikacji,
      isArchived: targetStatus === 'archived',
      isBlacklisted: targetStatus === 'archived'
    };

    if (targetStatus === 'archived') {
      setArchivedQuarantine(prev => [
        memberWithCanonical,
        ...(Array.isArray(prev) ? prev : []).filter(a => {
          const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
          return a.id !== updatedMember.id && (!rawIndex || aIdx !== rawIndex);
        })
      ]);
      setMembers(prev => (Array.isArray(prev) ? prev : []).filter(m => {
        const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
        return m.id !== updatedMember.id && (!rawIndex || mIdx !== rawIndex);
      }));
      setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => {
        const qIdx = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
        return q.id !== updatedMember.id && (!rawIndex || qIdx !== rawIndex);
      }));
    } else if (targetStatus === 'pending' || targetStatus === 'quarantine') {
      setQuarantine(prev => [
        memberWithCanonical,
        ...(Array.isArray(prev) ? prev : []).filter(q => {
          const qIdx = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
          return q.id !== updatedMember.id && (!rawIndex || qIdx !== rawIndex);
        })
      ]);
      setMembers(prev => (Array.isArray(prev) ? prev : []).filter(m => {
        const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
        return m.id !== updatedMember.id && (!rawIndex || mIdx !== rawIndex);
      }));
      setArchivedQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(a => {
        const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
        return a.id !== updatedMember.id && (!rawIndex || aIdx !== rawIndex);
      }));
    } else {
      // Active, Guest, Resigned -> goes to members
      setMembers(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const exists = list.some(m => {
          const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
          return m.id === updatedMember.id || (rawIndex && mIdx === rawIndex);
        });
        if (exists) {
          return list.map(m => {
            const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
            return (m.id === updatedMember.id || (rawIndex && mIdx === rawIndex)) ? memberWithCanonical : m;
          });
        }
        return [memberWithCanonical, ...list];
      });
      setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => {
        const qIdx = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
        return q.id !== updatedMember.id && (!rawIndex || qIdx !== rawIndex);
      }));
      setArchivedQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(a => {
        const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
        return a.id !== updatedMember.id && (!rawIndex || aIdx !== rawIndex);
      }));
    }

    // ── Real-time GAS Atomic Edit Sync (action: "edytuj_dane_czlonka" & "zmien_status_czlonka") ──
    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await editMemberInGAS({
          nrIndeksu: rawIndex,
          imieNazwisko: updatedMember.fullName || `${updatedMember.firstName || ''} ${updatedMember.lastName || ''}`.trim(),
          email: updatedMember.email || '',
          telefon: updatedMember.phone || updatedMember.telefon || '',
          kierunek: updatedMember.field || updatedMember.kierunek || '',
          aliasy: updatedMember.aliases || updatedMember.aliasy || updatedMember.alias || ''
        });

        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: targetStatusWeryfikacji,
          zatwierdzajacy: "Zarząd SKN"
        });

        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
        setToastMessage(`Pomyślnie zaktualizowano dane studenta: ${updatedMember.fullName || rawIndex}`);
      } catch (err) {
        console.error("[handleSaveMember] Błąd punktowej edycji w GAS:", err);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
        setToastMessage(`Błąd zapisu do arkusza Google: ${err.message || 'Błąd sieci'}`);
      }
    } else {
      setToastMessage(`Pomyślnie zaktualizowano dane studenta: ${updatedMember.fullName || ''}`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Manual Member Onboarding Handler (Atomic Append Row) ────────────────
  async function handleAddMember(newMember) {
    if (!newMember) return;
    const rawIndex = String(newMember.index || newMember.nrIndeksu || newMember.cleanIndex || '').replace(/\D/g, '').trim();
    const key = newMember.memberKey || (rawIndex ? `idx_${rawIndex}` : `manual_m_${Date.now()}`);
    const memberToAdd = {
      ...newMember,
      id: newMember.id || `manual_m_${Date.now()}`,
      memberKey: key,
      index: rawIndex || newMember.index || '',
      cleanIndex: rawIndex,
      nrIndeksu: rawIndex || newMember.nrIndeksu || '',
      status: newMember.status || 'active',
      statusWeryfikacji: newMember.statusWeryfikacji || 'Aktywny',
      isArchived: false,
      isBlacklisted: false,
      fromSheet: 'Rejestr_Zgloszen',
      points: newMember.points || 0,
      present: newMember.present || 0,
      absent: newMember.absent || 0,
      attendancePercent: newMember.attendancePercent || 0,
      certStatus: newMember.certStatus || 'W toku'
    };

    setMembers(prev => [memberToAdd, ...(Array.isArray(prev) ? prev : []).filter(m => {
      const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
      return m.id !== memberToAdd.id && (!rawIndex || mIdx !== rawIndex);
    })]);

    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));

    try {
      await addMemberManuallyToGAS(memberToAdd);
      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      setToastMessage("Student został trwale dodany do rejestru");
    } catch (gasErr) {
      console.warn("Błąd dodawania do rejestru w GAS:", gasErr);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: gasErr.message }));
      setToastMessage(`Student dodany lokalnie, błąd synchronizacji z chmurą: ${gasErr.message || gasErr}`);
    }
    setTimeout(() => setToastMessage(null), 5000);
  }

  // ── Batch Sync Members with Google Sheets (Rejestr_Zgloszen) ──────────────
  async function handleBatchSyncMembers() {
    const listToExport = (members && members.length > 0) ? members : initialMembers;
    console.log(`[handleBatchSyncMembers] Synchronizacja ${listToExport.length} członków do Rejestru Zgłoszeń...`, listToExport);

    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
    try {
      await initializeSubmissionsRegistryInGAS(listToExport);
      setPendingSyncCount(0);
      try {
        localStorage.setItem(getStorageKey('crm_pending_sync_count'), '0');
      } catch {}

      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      setToastMessage(`Pomyślnie zsynchronizowano ${listToExport.length} członków z arkuszem Google Sheets!`);
    } catch (err) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
      setToastMessage(`Błąd synchronizacji z arkuszem: ${err.message || err}`);
    }
    setTimeout(() => setToastMessage(null), 5000);
  }

  const handleSubcalendarChange = (_newSubId) => {
    setSelectedSubcalendar(DEFAULT_SUBCALENDAR_ID || '15520558');
    loadMeetings(DEFAULT_SUBCALENDAR_ID || '15520558', academicYear, customStartDate, customEndDate);
  };

  const handleAcademicYearChange = (newYr) => {
    setAcademicYear(newYr);
    loadMeetings(selectedSubcalendar, newYr, customStartDate, customEndDate);
  };

  const handleCustomDateChange = (newStart, newEnd) => {
    setCustomStartDate(newStart);
    setCustomEndDate(newEnd);
    loadMeetings(selectedSubcalendar, 'custom', newStart, newEnd);
  };

  // ── Member Status Toggle / Setter (Aktywni vs Goście vs Rezygnacja) ────────
  async function handleToggleStatus(id, explicitStatus = null) {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const rawIndex = String(member.nrIndeksu || member.index || member.cleanIndex || member.id || '').replace(/\D/g, '').trim();

    let targetStatus;
    if (explicitStatus) {
      targetStatus = explicitStatus;
    } else {
      const isCurrentlyResigned = member.status === 'resigned' || member.status === 'inactive' || member.statusWeryfikacji === 'Nieaktywny';
      targetStatus = isCurrentlyResigned ? 'active' : 'resigned';
    }

    const statusWeryfikacjiMap = {
      active: 'Aktywny',
      guest: 'Gosc',
      resigned: 'Nieaktywny',
      inactive: 'Nieaktywny',
      archived: 'Archiwum',
      quarantine: 'Oczekuje'
    };
    const targetStatusWeryfikacji = statusWeryfikacjiMap[targetStatus] || targetStatus;

    setMembers(prev =>
      prev.map(m => {
        const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
        return (m.id === id || (rawIndex && mIdx === rawIndex))
          ? { ...m, status: targetStatus, statusWeryfikacji: targetStatusWeryfikacji, isArchived: false, isBlacklisted: false }
          : m;
      })
    );

    // ── Real-time GAS Sync (Single Source of Truth - Kolumna H w Rejestr_Zgloszen) ──
    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: targetStatusWeryfikacji,
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      } catch (err) {
        console.warn("[handleToggleStatus] Błąd zapisu do GAS:", err);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
      }
    }

    setToastMessage("Zapisano status w arkuszu Google");
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Revert Member Back to Quarantine (Cofnięcie zatwierdzenia) ────────────
  async function handleRevertToQuarantine(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const rawIndex = String(member.nrIndeksu || member.index || member.cleanIndex || member.id || '').replace(/\D/g, '').trim();

    setMembers(prev => prev.filter(m => {
      const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
      return m.id !== id && (!rawIndex || mIdx !== rawIndex);
    }));

    setQuarantine(prev => [{
      ...member,
      status: 'quarantine',
      statusWeryfikacji: 'Oczekuje',
      isArchived: false,
      isBlacklisted: false
    }, ...prev]);

    // ── Real-time GAS Sync (nowyStatus: "Oczekuje") ──
    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: "Oczekuje",
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      } catch (err) {
        console.warn("[handleRevertToQuarantine] Błąd zapisu do GAS:", err);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
      }
    }

    setToastMessage("Cofnięto studenta do Kwarantanny");
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Move Member to Archive (Duplikat / Usunięcie z Zarządzania) ──
  async function handleArchiveMember(memberOrId, reason = 'duplicate') {
    const member = typeof memberOrId === 'object' && memberOrId !== null
      ? memberOrId
      : (members.find(m => m.id === memberOrId) || quarantine.find(q => q.id === memberOrId));

    if (!member || !member.id) return;
    const rawIndex = String(member.nrIndeksu || member.index || member.cleanIndex || member.id || '').replace(/\D/g, '').trim();

    const archivedItem = {
      ...member,
      status: 'archived',
      statusWeryfikacji: 'Archiwum',
      isArchived: true,
      isBlacklisted: true,
      archiveReason: reason,
    };

    setMembers(prev => (Array.isArray(prev) ? prev : []).filter(m => {
      const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
      return m.id !== member.id && (!rawIndex || mIdx !== rawIndex);
    }));

    setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => {
      const qIdx = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
      return q.id !== member.id && (!rawIndex || qIdx !== rawIndex);
    }));

    setArchivedQuarantine(prev => [
      archivedItem,
      ...(Array.isArray(prev) ? prev : []).filter(a => {
        const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
        return a.id !== member.id && (!rawIndex || aIdx !== rawIndex);
      }),
    ]);

    // ── Real-time GAS Sync dla Archiwum ──
    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: "Archiwum",
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      } catch (err) {
        console.warn("[handleArchiveMember] Błąd archiwizacji w GAS:", err);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
      }
    }

    setToastMessage("Przeniesiono wpis do Archiwum");
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Bulk Mark Graduates as Former Members (Przenieś absolwentów do Byłych) ────
  async function handleBulkMarkGraduates(memberIds) {
    if (!memberIds || !memberIds.length) return;
    const targetMembers = members.filter(m => memberIds.includes(m.id));

    setMembers(prev =>
      prev.map(m =>
        memberIds.includes(m.id)
          ? { ...m, status: 'resigned', statusWeryfikacji: 'Nieaktywny' }
          : m
      )
    );

    // Sync each graduate to GAS as Nieaktywny
    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
    try {
      await Promise.all(
        targetMembers.map(m => {
          const rawIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
          if (!rawIdx) return Promise.resolve();
          return changeStudentStatusInGAS({
            nrIndeksu: rawIdx,
            nowyStatus: "Nieaktywny",
            zatwierdzajacy: "Zarząd SKN"
          });
        })
      );
      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
    } catch (err) {
      console.warn("[handleBulkMarkGraduates] Błąd zapisu do GAS:", err);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
    }

    setToastMessage("Zapisano status absolwentów w arkuszu Google");
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Bulk Archive Graduates (Przenieś absolwentów do Archiwum) ───────
  async function handleBulkArchiveGraduates(memberIds) {
    if (!memberIds || !memberIds.length) return;
    const targetMembers = members.filter(m => memberIds.includes(m.id));

    setMembers(prev => prev.filter(m => !memberIds.includes(m.id)));

    setArchivedQuarantine(prev => [
      ...targetMembers.map(m => ({ ...m, isArchived: true, status: 'archived', statusWeryfikacji: 'Archiwum', isBlacklisted: true })),
      ...(Array.isArray(prev) ? prev : []).filter(a => !memberIds.includes(a.id)),
    ]);

    // Sync each archived graduate to GAS as Archiwum
    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
    try {
      await Promise.all(
        targetMembers.map(m => {
          const rawIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
          if (!rawIdx) return Promise.resolve();
          return changeStudentStatusInGAS({
            nrIndeksu: rawIdx,
            nowyStatus: "Archiwum",
            zatwierdzajacy: "Zarząd SKN"
          });
        })
      );
      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
    } catch (err) {
      console.warn("[handleBulkArchiveGraduates] Błąd zapisu do GAS:", err);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
    }

    setToastMessage("Zarchiwizowano absolwentów w arkuszu Google");
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Quarantine Handlers with GAS Backend ──────
  async function handleApprove(id) {
    const entry = quarantine.find(q => q.id === id);
    if (!entry) return;

    const rawIndex = String(entry.index || entry.cleanIndex || entry.nrIndeksu || '').replace(/\D/g, '').trim();
    const approvedMember = { ...entry, status: 'active', statusWeryfikacji: 'Aktywny', isArchived: false, isBlacklisted: false };

    setMembers(prev => [approvedMember, ...prev.filter(m => {
      const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
      return m.id !== id && (!rawIndex || mIdx !== rawIndex);
    })]);
    setQuarantine(prev => prev.filter(q => q.id !== id));

    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: "Aktywny",
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      } catch (e) {
        console.warn("Błąd zapisu w GAS:", e);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: e.message }));
      }
    }

    setToastMessage("Zatwierdzono studenta i zapisano w arkuszu Google");
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleBulkApprove(ids) {
    const entriesToApprove = quarantine.filter(q => ids.includes(q.id));
    if (entriesToApprove.length === 0) return;

    const approvedMembers = entriesToApprove.map(entry => ({
      ...entry,
      status: 'active',
      statusWeryfikacji: 'Aktywny',
      isArchived: false,
      isBlacklisted: false
    }));

    setMembers(prev => [...approvedMembers, ...prev.filter(m => !ids.includes(m.id))]);
    setQuarantine(prev => prev.filter(q => !ids.includes(q.id)));

    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
    try {
      await Promise.all(entriesToApprove.map(entry => {
        const rawIdx = String(entry.index || entry.cleanIndex || entry.nrIndeksu || '').replace(/\D/g, '').trim();
        if (!rawIdx) return Promise.resolve();
        return changeStudentStatusInGAS({
          nrIndeksu: rawIdx,
          nowyStatus: "Aktywny",
          zatwierdzajacy: "Zarząd SKN"
        });
      }));
      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
    } catch (e) {
      console.warn("Błąd zapisu w GAS (bulk):", e);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: e.message }));
    }

    setToastMessage(`Zatwierdzono ${entriesToApprove.length} zgłoszeń`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleArchive(id) {
    const entry = quarantine.find(q => q.id === id);
    if (!entry) return;

    const rawIndex = String(entry.nrIndeksu || entry.index || entry.cleanIndex || '').replace(/\D/g, '').trim();

    setArchivedQuarantine(prev => [{
      ...entry,
      isArchived: true,
      status: 'archived',
      statusWeryfikacji: 'Archiwum',
      isBlacklisted: true
    }, ...(Array.isArray(prev) ? prev : [])]);
    setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => q.id !== id));

    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: "Archiwum",
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      } catch (err) {
        console.warn("[handleArchive] Błąd zapisu do GAS:", err);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
      }
    }

    setToastMessage("Przeniesiono do Archiwum");
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleBulkArchive(ids, reason = 'duplicate') {
    const entriesToArchive = (Array.isArray(quarantine) ? quarantine : []).filter(q => ids.includes(q.id));
    if (entriesToArchive.length === 0) return;

    setArchivedQuarantine(prev => [
      ...entriesToArchive.map(e => ({
        ...e,
        isArchived: true,
        status: 'archived',
        statusWeryfikacji: 'Archiwum',
        archiveReason: reason,
        isBlacklisted: true
      })),
      ...(Array.isArray(prev) ? prev : []).filter(a => !ids.includes(a.id)),
    ]);
    setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => !ids.includes(q.id)));

    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
    try {
      await Promise.all(
        entriesToArchive.map(e => {
          const rawIdx = String(e.nrIndeksu || e.index || e.cleanIndex || '').replace(/\D/g, '').trim();
          if (!rawIdx) return Promise.resolve();
          return changeStudentStatusInGAS({
            nrIndeksu: rawIdx,
            nowyStatus: "Archiwum",
            zatwierdzajacy: "Zarząd SKN"
          });
        })
      );
      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
    } catch (err) {
      console.warn("[handleBulkArchive] Błąd zapisu do GAS:", err);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
    }

    setToastMessage(`Zarchiwizowano ${entriesToArchive.length} pozycji`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleRestoreArchive(idOrStudent) {
    const rawIndex = String(
      (typeof idOrStudent === 'object' && idOrStudent !== null
        ? (idOrStudent.nrIndeksu || idOrStudent.index || idOrStudent.cleanIndex || idOrStudent.id)
        : idOrStudent) || ''
    ).replace(/\D/g, '').trim();

    const cleanId = typeof idOrStudent === 'object' && idOrStudent !== null
      ? String(idOrStudent.id || idOrStudent.nrIndeksu || idOrStudent.index || '').trim()
      : String(idOrStudent || '').trim();

    const entry = (typeof idOrStudent === 'object' && idOrStudent !== null)
      ? idOrStudent
      : (Array.isArray(archivedQuarantine) ? archivedQuarantine : []).find(a => {
          const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
          return (rawIndex && aIdx === rawIndex) || String(a.id) === cleanId;
        }) || (Array.isArray(members) ? members : []).find(m => {
          const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
          return (rawIndex && mIdx === rawIndex) || String(m.id) === cleanId;
        }) || (Array.isArray(quarantine) ? quarantine : []).find(q => {
          const qIdx = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
          return (rawIndex && qIdx === rawIndex) || String(q.id) === cleanId;
        });

    const targetIndex = rawIndex || String(entry?.nrIndeksu || entry?.index || entry?.cleanIndex || '').replace(/\D/g, '').trim();
    const rowId = entry?.id || cleanId;

    // 1. Usuń ze stanu zarchiwizowanych
    setArchivedQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(item => {
      const itemIdx = String(item.nrIndeksu || item.index || item.cleanIndex || '').replace(/\D/g, '').trim();
      const itemRowId = String(item.id || '').trim();
      return (targetIndex ? itemIdx !== targetIndex : true) && itemRowId !== rowId && itemRowId !== cleanId;
    }));

    // 2. Dodaj / zaktualizuj w stanie członków jako Aktywny
    const restoredMember = {
      ...(entry || {}),
      id: rowId,
      nrIndeksu: targetIndex || entry?.nrIndeksu || entry?.index || '',
      index: targetIndex || entry?.index || entry?.cleanIndex || '',
      cleanIndex: targetIndex,
      isArchived: false,
      isBlacklisted: false,
      status: 'active',
      statusWeryfikacji: 'Aktywny'
    };

    setMembers(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const exists = arr.some(m => {
        const mId = String(m.id || '').trim();
        const mIndex = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
        return (targetIndex && mIndex === targetIndex) || mId === rowId;
      });
      if (exists) {
        return arr.map(m => {
          const mId = String(m.id || '').trim();
          const mIndex = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
          return ((targetIndex && mIndex === targetIndex) || mId === rowId) ? restoredMember : m;
        });
      }
      return [restoredMember, ...arr];
    });

    setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => {
      const qId = String(q.id || '').trim();
      const qIndex = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
      return qId !== rowId && qId !== cleanId && (targetIndex ? qIndex !== targetIndex : true);
    }));

    setToastMessage("Przywrócono studenta do listy aktywnych");

    // 3. Wysłanie punktowej aktualizacji do Google Apps Script v8.0
    if (targetIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: targetIndex,
          nowyStatus: "Aktywny",
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      } catch (netErr) {
        console.error("Błąd sieci:", netErr);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: netErr.message }));
        setToastMessage(`Błąd zapisu statusu w arkuszu: ${netErr.message || 'Błąd sieci'}`);
      }
    }
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleBulkRestoreArchive(ids) {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids.map(i => String(i || '').trim()));

    const entriesToRestore = (Array.isArray(archivedQuarantine) ? archivedQuarantine : []).filter(a => {
      const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
      return idSet.has(String(a.id)) || (aIdx && idSet.has(aIdx));
    });
    if (entriesToRestore.length === 0) return;

    const restoredRowIds = new Set(entriesToRestore.map(e => String(e.id)));
    const restoredIndexSet = new Set(
      entriesToRestore.map(e => String(e.nrIndeksu || e.index || e.cleanIndex || '').replace(/\D/g, '').trim()).filter(Boolean)
    );

    setArchivedQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(a => {
      const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
      return !restoredRowIds.has(String(a.id)) && (!aIdx || !restoredIndexSet.has(aIdx));
    }));

    const restoredList = entriesToRestore.map(e => ({
      ...e,
      isArchived: false,
      isBlacklisted: false,
      status: 'quarantine',
      statusWeryfikacji: 'Oczekuje'
    }));
    setQuarantine(prev => [...restoredList, ...(Array.isArray(prev) ? prev : []).filter(q => !restoredRowIds.has(String(q.id)))]);

    setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
    try {
      await Promise.all(
        entriesToRestore.map(e => {
          const rawIdx = String(e.nrIndeksu || e.index || e.cleanIndex || e.id || '').replace(/\D/g, '').trim();
          if (!rawIdx) return Promise.resolve();
          return changeStudentStatusInGAS({
            nrIndeksu: rawIdx,
            nowyStatus: "Oczekuje",
            zatwierdzajacy: "Zarząd SKN"
          });
        })
      );
      const now = new Date();
      setLastSync(now);
      setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
      setToastMessage(`Przywrócono ${entriesToRestore.length} rekordów do Kwarantanny`);
    } catch (err) {
      console.error("[handleBulkRestoreArchive] Błąd zapisu do GAS:", err);
      setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
      setToastMessage(`Błąd zapisu masowego w arkuszu: ${err.message || 'Błąd sieci'}`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handlePermanentDeleteArchive(idOrStudent) {
    const rawIndex = String(
      (typeof idOrStudent === 'object' && idOrStudent !== null
        ? (idOrStudent.nrIndeksu || idOrStudent.index || idOrStudent.cleanIndex || idOrStudent.id)
        : idOrStudent) || ''
    ).replace(/\D/g, '').trim();

    const cleanId = typeof idOrStudent === 'object' && idOrStudent !== null
      ? String(idOrStudent.id || '').trim()
      : String(idOrStudent || '').trim();

    setArchivedQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(a => {
      const aIdx = String(a.nrIndeksu || a.index || a.cleanIndex || '').replace(/\D/g, '').trim();
      const aId = String(a.id || '').trim();
      return (rawIndex ? aIdx !== rawIndex : true) && aId !== cleanId;
    }));
    setMembers(prev => (Array.isArray(prev) ? prev : []).filter(m => {
      const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').replace(/\D/g, '').trim();
      const mId = String(m.id || '').trim();
      return (rawIndex ? mIdx !== rawIndex : true) && mId !== cleanId;
    }));
    setQuarantine(prev => (Array.isArray(prev) ? prev : []).filter(q => {
      const qIdx = String(q.nrIndeksu || q.index || q.cleanIndex || '').replace(/\D/g, '').trim();
      const qId = String(q.id || '').trim();
      return (rawIndex ? qIdx !== rawIndex : true) && qId !== cleanId;
    }));

    if (rawIndex) {
      setCloudSyncStatus(prev => ({ ...prev, status: 'saving', errorMessage: null }));
      try {
        await changeStudentStatusInGAS({
          nrIndeksu: rawIndex,
          nowyStatus: "Usuniety",
          zatwierdzajacy: "Zarząd SKN"
        });
        const now = new Date();
        setLastSync(now);
        setCloudSyncStatus({ status: 'synced', lastSyncTime: now, errorMessage: null });
        setToastMessage("Trwale usunięto wpis z rejestru");
      } catch (err) {
        console.error("[handlePermanentDeleteArchive] Błąd zapisu do GAS:", err);
        setCloudSyncStatus(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
        setToastMessage(`Błąd usuwania wpisu z arkusza: ${err.message || 'Błąd sieci'}`);
      }
    } else {
      setToastMessage("Trwale usunięto wpis z rejestru");
    }
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Mark attendance ─────────────────────────────────────────────────────────
  function handleMarkAttendance(meetingId, indexes, payload) {
    setMeetings(prev =>
      prev.map(m => {
        if (m.id === meetingId || m.date === meetingId || m.code === meetingId) {
          return {
            ...m,
            attendees: indexes,
            participantRecords: payload?.attendees || m.participantRecords || [],
          };
        }
        return m;
      })
    );
  }

  const pendingCount = quarantine.length;
  const activeMembersCount = members.filter(
    m => (m.status === 'active' || !m.status) && !m.isArchived && m.status !== 'resigned' && m.status !== 'archived'
  ).length;

  const customMeetingTypes = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey ? getStorageKey('crm_meeting_types') : 'crm_meeting_types') || '{}');
    } catch {
      return {};
    }
  }, [getStorageKey]);

  const blacklist = useMemo(() => {
    return getBlacklistedMembers(currentOrg?.id || 'default');
  }, [currentOrg?.id]);

  const membersMetrics = useMemo(() => {
    const isGuest = (m) => {
      const s = String(m?.status || '').toLowerCase().trim();
      return s === 'guest' || s === 'gość' || s === 'gosc' || s === 'wolny słuchacz';
    };
    const isInactive = (m) => {
      const s = String(m?.status || '').toLowerCase().trim();
      return s === 'resigned' || s === 'inactive' || s === 'nieaktywny' || s === 'rezygnacja' || s === 'były' || s === 'byly';
    };
    const isActive = (m) => {
      if (!m) return false;
      if (isMemberBlacklisted(m, blacklist)) return false;
      return !isGuest(m) && !isInactive(m) && !m?.isArchived && m?.status !== 'archived';
    };

    const activeMembersList = members.filter(m => isActive(m));
    const activeCount = activeMembersList.length;
    const safeMeetings = Array.isArray(meetings) ? meetings : [];
    const isSknSeks = currentOrg?.id === 'skn_seksuologii';

    const conductedMandatory = safeMeetings.filter(
      meet => meet && !meet.isUpcoming && getMeetingType(meet, customMeetingTypes) === 'mandatory'
    );
    const plannedMandatory = safeMeetings.filter(
      meet => meet && getMeetingType(meet, customMeetingTypes) === 'mandatory'
    );
    const dynamicMandatoryTotal = conductedMandatory.length > 0
      ? conductedMandatory.length
      : (plannedMandatory.length > 0 ? plannedMandatory.length : 1);

    const getMemberFreqData = (m) => {
      if (!m) return { freq: 0, absent: dynamicMandatoryTotal };
      const calc = calculateCategorizedFrequency(
        m,
        safeMeetings,
        customMeetingTypes || {},
        m?.present || 0,
        m?.absent || 0
      );
      return {
        freq: calc?.freq ?? 0,
        absent: calc?.absent ?? 0,
        presentMandatory: calc?.presentMandatory ?? 0,
        mandatoryTotal: calc?.mandatoryTotal || dynamicMandatoryTotal,
      };
    };

    let sum = 0;
    let certReadyCount = 0;
    const seenEmails = new Set();
    let consentsCount = 0;

    activeMembersList.forEach(m => {
      const fData = getMemberFreqData(m);
      const f = fData?.freq ?? 0;
      sum += isNaN(f) ? 0 : f;

      if (!isSknSeks) {
        if (f >= 50) certReadyCount++;
      } else {
        const absences = typeof fData.absent === 'number' ? fData.absent : (m?.absent || 0);
        if (f >= 50 && absences <= 5) certReadyCount++;
      }

      const email = (m?.email || '').trim().toLowerCase();
      if (email && email.includes('@') && m?.zgodaNaMailing === 'Zgoda na mailing' && !seenEmails.has(email)) {
        seenEmails.add(email);
        consentsCount++;
      }
    });

    const avgFreq = activeCount > 0 ? Math.round(sum / activeCount) : 0;

    return {
      activeCount,
      avgFreq: isNaN(avgFreq) ? 0 : avgFreq,
      certReady: certReadyCount,
      mailingConsentsCount: consentsCount,
    };
  }, [members, meetings, customMeetingTypes, blacklist, currentOrg?.id]);

  const syncLabel = lastSync
    ? lastSync.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">

      {/* ── Toast Notification Banner ───────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5 duration-200 text-xs print:hidden">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30 print:hidden">
        <div className="w-[98vw] max-w-[1850px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          {/* Logo & Multi-Tenant Organization Switcher */}
          <div className="flex items-center gap-3 shrink-0 relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-md text-white font-bold text-sm tracking-tight shrink-0">
              {currentOrg.shortName ? currentOrg.shortName.slice(0, 3).toUpperCase() : 'SKN'}
            </div>
            
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(prev => !prev)}
                className="flex items-center gap-1.5 text-left group hover:bg-slate-100/70 p-1.5 -m-1.5 rounded-xl transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition leading-tight">
                      {currentOrg.name}
                    </h1>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                      {currentOrg.tag || 'WSKZ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">System Ewidencyjno-Sprawozdawczy</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 transition shrink-0 ml-0.5" />
              </button>

              {/* Organization Dropdown Menu */}
              {isOrgDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsOrgDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Wybierz Koło Naukowe
                    </div>
                    <div className="space-y-1 py-1 max-h-60 overflow-y-auto">
                      {organizations.map(org => {
                        const isSelected = org.id === currentOrg.id;
                        return (
                          <button
                            key={org.id}
                            onClick={() => {
                              switchOrg(org.id);
                              setIsOrgDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate font-semibold">{org.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{org.tag || 'WSKZ'}</p>
                            </div>
                            {isSelected && <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        onClick={() => {
                          setIsOrgDropdownOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      >
                        <Settings size={14} />
                        <span>Zarządzaj kołami naukowymi…</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sync status + Settings + refresh */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Intelligent Cloud Sync Indicator */}
            <SyncIndicator
              status={cloudSyncStatus.status}
              lastSyncTime={cloudSyncStatus.lastSyncTime || lastSync}
              onRetry={() => loadData({ silent: false })}
            />

            {/* Record count (Single-line row) */}
            {lastSync && !error && (
              <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0">
                <span>Aktywni: <strong className="text-slate-800 font-semibold">{activeMembersCount}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Kwarantanna: <strong className="text-amber-700 font-semibold">{quarantine.length}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Archiwum: <strong className="text-slate-800 font-semibold">{archivedQuarantine.length}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Spotkania: <strong className="text-slate-800 font-semibold">{meetings.length}</strong></span>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={() => loadData({ silent: false })}
              disabled={loading}
              title="Odśwież dane z Google Sheets i Teamup"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Odśwież dane</span>
            </button>

            {/* User Profile & Role Switcher Menu */}
            <ProfileMenu onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border-b border-red-100 px-4 sm:px-6 py-2 print:hidden">
          <div className="w-[98vw] max-w-[1850px] mx-auto flex items-center gap-2 text-sm text-red-700">
            <WifiOff size={14} className="shrink-0" />
            <span>Błąd pobierania danych: <strong>{error}</strong></span>
            <button onClick={loadData} className="ml-auto underline text-xs">Spróbuj ponownie</button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <main className="w-[98vw] max-w-[1850px] mx-auto px-4 sm:px-6 py-4 space-y-6">

        {/* Navigation Bar with Condensed 5 Tabs and Sub-Tabs */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          membersSubTab={membersSubTab}
          setMembersSubTab={setMembersSubTab}
          documentationSubTab={documentationSubTab}
          setDocumentationSubTab={setDocumentationSubTab}
          settingsToolsSubTab={settingsToolsSubTab}
          setSettingsToolsSubTab={setSettingsToolsSubTab}
          membersMetrics={membersMetrics}
        />

        {/* Skeleton loading state on first load */}
        {loading && members.length === 0 && quarantine.length === 0 && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-24" />
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 h-64" />
          </div>
        )}

        {/* Tabs */}
        {(!loading || members.length > 0 || quarantine.length > 0) && (
          <ErrorBoundary>
            {(() => {
              switch (activeTab) {
                case 'members':
                  if (membersSubTab === 'quarantine') {
                    return (
                      <QuarantineTab
                        members={members}
                        quarantine={quarantine}
                        archivedQuarantine={archivedQuarantine}
                        onApprove={handleApprove}
                        onBulkApprove={handleBulkApprove}
                        onArchive={handleArchive}
                        onBulkArchive={handleBulkArchive}
                        onRestoreArchive={handleRestoreArchive}
                        onBulkRestoreArchive={handleBulkRestoreArchive}
                        onPermanentDeleteArchive={handlePermanentDeleteArchive}
                        onSaveMember={handleSaveMember}
                        onAddMember={handleAddMember}
                        pendingSyncCount={pendingSyncCount}
                        onBatchSyncMembers={handleBatchSyncMembers}
                      />
                    );
                  }
                  return (
                    <ManagementTab
                      members={members}
                      meetings={meetings}
                      isLoading={loading}
                      onToggleStatus={handleToggleStatus}
                      onRevertToQuarantine={handleRevertToQuarantine}
                      onSaveMember={handleSaveMember}
                      onArchiveMember={handleArchiveMember}
                      onBulkMarkGraduates={handleBulkMarkGraduates}
                      onBulkArchiveGraduates={handleBulkArchiveGraduates}
                      onNavigateToReports={handleNavigateToReports}
                    />
                  );

                case 'management':
                  return (
                    <ManagementTab
                      members={members}
                      meetings={meetings}
                      isLoading={loading}
                      onToggleStatus={handleToggleStatus}
                      onRevertToQuarantine={handleRevertToQuarantine}
                      onSaveMember={handleSaveMember}
                      onArchiveMember={handleArchiveMember}
                      onBulkMarkGraduates={handleBulkMarkGraduates}
                      onBulkArchiveGraduates={handleBulkArchiveGraduates}
                      onNavigateToReports={handleNavigateToReports}
                    />
                  );

                case 'quarantine':
                  return (
                    <QuarantineTab
                      members={members}
                      quarantine={quarantine}
                      archivedQuarantine={archivedQuarantine}
                      onApprove={handleApprove}
                      onBulkApprove={handleBulkApprove}
                      onArchive={handleArchive}
                      onBulkArchive={handleBulkArchive}
                      onRestoreArchive={handleRestoreArchive}
                      onBulkRestoreArchive={handleBulkRestoreArchive}
                      onPermanentDeleteArchive={handlePermanentDeleteArchive}
                      onSaveMember={handleSaveMember}
                      onAddMember={handleAddMember}
                      pendingSyncCount={pendingSyncCount}
                      onBatchSyncMembers={handleBatchSyncMembers}
                    />
                  );

                case 'meetings':
                  return (
                    <MeetingsTab
                      meetings={meetings}
                      members={members}
                      onMarkAttendance={handleMarkAttendance}
                      subcalendars={subcalendars}
                      selectedSubcalendar={selectedSubcalendar}
                      onSubcalendarChange={handleSubcalendarChange}
                      onRefreshMeetings={() => loadMeetings()}
                      loadingMeetings={loadingMeetings}
                      academicYear={academicYear}
                      onAcademicYearChange={handleAcademicYearChange}
                      customStartDate={customStartDate}
                      customEndDate={customEndDate}
                      onCustomDateChange={handleCustomDateChange}
                    />
                  );

                case 'documentation':
                  if (documentationSubTab === 'documents') {
                    return <DocumentsRepositoryTab />;
                  }
                  return (
                    <ReportsTab
                      members={members}
                      meetings={meetings}
                      initialMember={reportsTarget.member}
                      initialDocType={reportsTarget.docType}
                    />
                  );

                case 'reports':
                  return (
                    <ReportsTab
                      members={members}
                      meetings={meetings}
                      initialMember={reportsTarget.member}
                      initialDocType={reportsTarget.docType}
                    />
                  );

                case 'documents':
                case 'repository':
                  return <DocumentsRepositoryTab />;

                case 'research':
                  return <ResearchTab />;

                case 'settings_tools':
                  if (settingsToolsSubTab === 'tools') {
                    return (
                      <ToolsTab
                        members={members}
                        materials={materials}
                        meetings={meetings}
                        onBulkMarkGraduates={handleBulkMarkGraduates}
                        onBulkArchiveGraduates={handleBulkArchiveGraduates}
                      />
                    );
                  }
                  return (
                    <SettingsTab
                      members={members}
                      meetings={meetings}
                    />
                  );

                case 'settings':
                  return (
                    <SettingsTab
                      members={members}
                      meetings={meetings}
                    />
                  );

                case 'tools':
                  return (
                    <ToolsTab
                      members={members}
                      materials={materials}
                      meetings={meetings}
                      onBulkMarkGraduates={handleBulkMarkGraduates}
                      onBulkArchiveGraduates={handleBulkArchiveGraduates}
                    />
                  );

                default:
                  return (
                    <ManagementTab
                      members={members}
                      meetings={meetings}
                      isLoading={loading}
                      onToggleStatus={handleToggleStatus}
                      onRevertToQuarantine={handleRevertToQuarantine}
                      onSaveMember={handleSaveMember}
                      onArchiveMember={handleArchiveMember}
                      onBulkMarkGraduates={handleBulkMarkGraduates}
                      onBulkArchiveGraduates={handleBulkArchiveGraduates}
                      onNavigateToReports={handleNavigateToReports}
                    />
                  );
              }
            })()}
          </ErrorBoundary>
        )}
      </main>

      {/* ── Multi-Tenant Settings Modal ─────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
