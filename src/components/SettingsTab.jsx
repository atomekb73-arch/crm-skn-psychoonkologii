import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield,
  Users,
  Award,
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  UserCheck,
  Search,
  Sparkles,
  Lock,
  Mail,
  User,
  Clock,
  RotateCcw,
  Save,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Briefcase,
  GraduationCap,
  Pencil,
  Building,
  School,
  Download,
  Upload,
  History,
  Database,
  AlertOctagon,
  HardDrive,
  FileJson,
  Layers,
  RefreshCw,
  Check,
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  FolderArchive,
  ArrowUpRight,
  CheckCheck,
  X,
  Camera,
  Settings,
  Key,
  Eye,
  EyeOff,
  AtSign,
  ExternalLink,
  FolderOpen,
  Zap,
  Minus,
} from 'lucide-react';
import {
  useSettings,
  DEFAULT_POINT_WEIGHTS,
  DEFAULT_ATTENDANCE_CONFIG,
  getEngagementScaleLevel,
} from '../context/SettingsContext';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import {
  exportOrgBackup,
  importOrgBackup,
  exportMasterBackup,
  importMasterBackup,
  createOrgSnapshot,
  getOrgSnapshots,
  restoreOrgSnapshot,
  deleteOrgSnapshot,
  restoreStableBaseline,
  getEmailConfig,
  saveEmailConfig,
  DEFAULT_EMAIL_CONFIG,
  getDriveFolderUrl,
  setDriveFolderUrl,
  DEFAULT_DRIVE_FOLDER_URL,
} from '../utils/storage';
import {
  initializeSubmissionsRegistryInGAS,
  syncAllPointsToGAS,
  fetchGasData,
  saveBoardPointsToGAS,
} from '../services/googleSheets';

const DEFAULT_ACCESS_USERS = [
  {
    id: 'usr_liliana_01',
    name: 'Liliana Sienkiewicz',
    email: 'lajlasienkiewicz@gmail.com',
    role: 'ADMIN',
    roleLabel: 'Dostęp pełny',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
    isPermanent: false,
  },
  {
    id: 'usr_katarzyna_02',
    name: 'Katarzyna Kubacka',
    email: 'kasia.j.kubacka@gmail.com',
    role: 'ADMIN',
    roleLabel: 'Dostęp pełny',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
    isPermanent: false,
  },
  {
    id: 'usr_piotr_03',
    name: 'Piotr Niklas',
    email: 'piotrniklas7@gmail.com',
    role: 'ADMIN',
    roleLabel: 'Dostęp pełny',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
    isPermanent: false,
  },
  {
    id: 'usr_zarzad_01',
    name: 'Zarząd SKN Psychoonkologii',
    email: 'skn.psychoonkologia@wskz.pl',
    role: 'ADMIN',
    roleLabel: 'Dostęp zarządu',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
    isPermanent: false,
  },
];

const BOARD_ROLE_WEIGHTS = {
  'Przewodniczący': { code: 'ZARZAD_MIES', defaultPtsPerMonth: 3 },
  'Wiceprzewodniczący': { code: 'ZARZAD_MIES', defaultPtsPerMonth: 3 },
  'Sekretarz Koła': { code: 'ZARZAD_MIES', defaultPtsPerMonth: 3 },
  'Skarbnik': { code: 'ZARZAD_MIES', defaultPtsPerMonth: 3 },
  'Moderator Social Media / Grup': { code: 'SM_MODER_MIES', defaultPtsPerMonth: 5 },
  'Lider IT / Koordynator CRM': { code: 'IT_SYSTEMY', defaultPtsPerMonth: 5 },
  'Koordynator ds. Badań': { code: 'BADANIA', defaultPtsPerMonth: 4 },
};

const DEFAULT_BOARD_TENURES = [];

export default function SettingsTab({ members = [], meetings = [], onRefreshData }) {
  const { currentOrg, currentOrgId } = useOrg();
  const { currentUser, isSuperAdmin } = useAuth();
  const orgId = currentOrg?.id || currentOrgId || 'skn-psychoonkologia';

  const {
    weights,
    updateWeight,
    resetWeights,
    attendanceConfig,
    updateAttendanceConfig,
    resetAttendanceConfig,
    supervisors,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    resetSupervisors,
  } = useSettings();

  // ── Sektor: Attendance & Certification Rules State ──────────────────────────
  const [localAttendance, setLocalAttendance] = useState(() => ({
    ...DEFAULT_ATTENDANCE_CONFIG,
    ...(attendanceConfig || {}),
  }));
  const [attendanceSaveFeedback, setAttendanceSaveFeedback] = useState(false);

  // ── Interaktywny Symulator Frekwencji w Czasie Rzeczywistym ─────────────────
  const [simAttended, setSimAttended] = useState(6);
  const [simTotalMeetings, setSimTotalMeetings] = useState(10);

  const simStats = useMemo(() => {
    const total = Math.max(1, Number(simTotalMeetings) || 10);
    const attended = Math.min(total, Math.max(0, Number(simAttended) || 0));

    let baseDenominator = total;
    if (localAttendance.calcMode === 'FIXED_TARGET') {
      baseDenominator = Math.max(1, Number(localAttendance.fixedTarget) || 10);
    } else if (localAttendance.calcMode === 'DYNAMIC_MANDATORY') {
      baseDenominator = total;
    } else {
      // ALL_VERIFIED
      baseDenominator = total;
    }

    const freq = baseDenominator > 0 ? Math.min(100, Math.round((attended / baseDenominator) * 100)) : 0;
    const minPassing = Number(localAttendance.minPassingPercent) || 50;
    const isEligible = freq >= minPassing;
    const engagement = getEngagementScaleLevel(freq);

    const displayFreqText = (attended === 0 && localAttendance.zeroAttendanceDisplay === 'NEUTRAL_DASH')
      ? '— (Start roku)'
      : `${freq}%`;

    return {
      total,
      attended,
      baseDenominator,
      freq,
      isEligible,
      minPassing,
      engagement,
      displayFreqText,
    };
  }, [simAttended, simTotalMeetings, localAttendance]);

  useEffect(() => {
    if (attendanceConfig) {
      setLocalAttendance({
        ...DEFAULT_ATTENDANCE_CONFIG,
        ...attendanceConfig,
      });
    }
  }, [attendanceConfig]);

  const handleSaveAttendance = () => {
    updateAttendanceConfig(localAttendance);
    setAttendanceSaveFeedback(true);
    setTimeout(() => setAttendanceSaveFeedback(false), 3500);
  };

  const handleResetAttendance = () => {
    resetAttendanceConfig();
    setLocalAttendance(DEFAULT_ATTENDANCE_CONFIG);
    setAttendanceSaveFeedback(true);
    setTimeout(() => setAttendanceSaveFeedback(false), 3500);
  };

  // ── Sektor 5: Backup & Recovery State ───────────────────────────────────────
  const [snapshots, setSnapshots] = useState(() => getOrgSnapshots(orgId));
  const [backupFeedback, setBackupFeedback] = useState(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const orgFileInputRef = useRef(null);
  const masterFileInputRef = useRef(null);

  // ── Sektor 6: Email & SMTP Configuration State ──────────────────────────────
  const [emailConfig, setEmailConfig] = useState(() => getEmailConfig(orgId));
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [emailSaveFeedback, setEmailSaveFeedback] = useState(null);
  const [driveFolderUrl, setDriveFolderUrlState] = useState(() => getDriveFolderUrl(orgId));

  // Refresh snapshots, email config and drive URL when active organization switches
  useEffect(() => {
    if (orgId) {
      setSnapshots(getOrgSnapshots(orgId));
      setEmailConfig(getEmailConfig(orgId));
      setDriveFolderUrlState(getDriveFolderUrl(orgId));
    }
  }, [orgId]);

  const handleSaveEmailConfig = (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      const saved = saveEmailConfig(orgId, emailConfig);
      setEmailConfig(saved);
      setEmailSaveFeedback({
        type: 'success',
        message: 'Konfiguracja poczty koła i szablonów powiadomień została pomyślnie zapisana w bazie CRM.',
      });
      setTimeout(() => setEmailSaveFeedback(null), 4000);
    } catch (err) {
      setEmailSaveFeedback({
        type: 'error',
        message: `Błąd zapisu konfiguracji poczty: ${err?.message || err}`,
      });
    }
  };

  const handleResetEmailConfig = () => {
    const cleanId = String(orgId || 'skn-psychoonkologia').trim().toLowerCase();
    const defaultConf = DEFAULT_EMAIL_CONFIG[cleanId] || DEFAULT_EMAIL_CONFIG['skn-psychoonkologia'];
    setEmailConfig(defaultConf);
    saveEmailConfig(orgId, defaultConf);
    setEmailSaveFeedback({
      type: 'success',
      message: 'Przywrócono domyślne parametry i oficjalne szablony powiadomień.',
    });
    setTimeout(() => setEmailSaveFeedback(null), 4000);
  };

  const handleExportOrg = () => {
    try {
      const author = currentUser?.name || 'Zarząd Koła';
      exportOrgBackup(orgId, author);
      setBackupFeedback({
        type: 'success',
        message: `Pomyślnie wyeksportowano plik kopii zapasowej dla ${currentOrg?.shortName || currentOrg?.name || 'Koła'}.`,
      });
      setTimeout(() => setBackupFeedback(null), 5000);
    } catch (err) {
      setBackupFeedback({ type: 'error', message: `Błąd eksportu: ${err.message}` });
    }
  };

  const handleImportOrgFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      setConfirmModal({
        title: `Przywracanie kopii: ${file.name}`,
        message: `Czy na pewno chcesz nadpisać dane koła "${currentOrg?.shortName || currentOrg?.name}" z wybranego pliku? Bieżący stan zostanie automatycznie zachowany w punkcie przywracania (migawce).`,
        type: 'warning',
        onConfirm: () => {
          try {
            setIsProcessingBackup(true);
            const res = importOrgBackup(orgId, content);
            setSnapshots(getOrgSnapshots(orgId));
            setBackupFeedback({
              type: 'success',
              message: `Pomyślnie przywrócono ${res.keysRestored} kluczy rejestru dla ${currentOrg?.shortName || currentOrg?.name}.`,
            });
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } catch (err) {
            setBackupFeedback({ type: 'error', message: `Błąd importu: ${err.message}` });
          } finally {
            setIsProcessingBackup(false);
            setConfirmModal(null);
          }
        },
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateSnapshot = () => {
    try {
      const snap = createOrgSnapshot(orgId, `Ręczna migawka (${currentUser?.name || 'Admin'})`);
      if (snap) {
        setSnapshots(getOrgSnapshots(orgId));
        setBackupFeedback({
          type: 'success',
          message: `Utworzono punkt przywracania stanu: ${snap.formattedDate} (${snap.keysCount} pozycji).`,
        });
        setTimeout(() => setBackupFeedback(null), 4000);
      }
    } catch (err) {
      setBackupFeedback({ type: 'error', message: `Błąd tworzenia migawki: ${err.message}` });
    }
  };

  const handleRestoreSnap = (snapshot) => {
    setConfirmModal({
      title: `Przywracanie migawki: ${snapshot.formattedDate}`,
      message: `Czy na pewno chcesz cofnąć stan koła "${currentOrg?.shortName || currentOrg?.name}" do punktu z dnia ${snapshot.formattedDate}? Wszystkie późniejsze zmiany zostaną zastąpione.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          setIsProcessingBackup(true);
          const res = await restoreOrgSnapshot(orgId, snapshot.key);
          setSnapshots(getOrgSnapshots(orgId));
          setBackupFeedback({
            type: 'success',
            message: `Pomyślnie przywrócono stan z ${res.snapshotDate} (${res.keysRestored} kluczy).`,
          });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (err) {
          setBackupFeedback({ type: 'error', message: `Błąd przywracania: ${err.message}` });
        } finally {
          setIsProcessingBackup(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleDeleteSnap = (snapshotKey) => {
    deleteOrgSnapshot(snapshotKey);
    setSnapshots(getOrgSnapshots(orgId));
  };

  const handleExportMaster = () => {
    try {
      exportMasterBackup(currentUser?.name || 'Administrator');
      setBackupFeedback({
        type: 'success',
        message: 'Pomyślnie wygenerowano i pobrano plik Master Backup ze wszystkimi kołami i ustawieniami.',
      });
      setTimeout(() => setBackupFeedback(null), 5000);
    } catch (err) {
      setBackupFeedback({ type: 'error', message: `Błąd Master Backup: ${err.message}` });
    }
  };

  const handleImportMasterFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      setConfirmModal({
        title: `⚠️ PRZYWRACANIE MASTER BACKUP: ${file.name}`,
        message: `UWAGA: Ta operacja nadpisze bazy WSZYSTKICH kół naukowych oraz konfigurację całego systemu CRM. Czy na pewno chcesz kontynuować?`,
        type: 'danger',
        onConfirm: () => {
          try {
            setIsProcessingBackup(true);
            const res = importMasterBackup(content);
            setBackupFeedback({
              type: 'success',
              message: `Pomyślnie przywrócono stan całego systemu (${res.keysRestored} wpisów).`,
            });
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          } catch (err) {
            setBackupFeedback({ type: 'error', message: `Błąd przywracania Master Backup: ${err.message}` });
          } finally {
            setIsProcessingBackup(false);
            setConfirmModal(null);
          }
        },
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRollbackBaseline = () => {
    setConfirmModal({
      title: `⚠️ Rollback do Ostatniej Stabilnej Wersji`,
      message: `Ta operacja przywróci zatwierdzone kanoniczne schematy spotkań, opiekunów i poprawne powiązania dla "${currentOrg?.shortName || currentOrg?.name}". Przed wykonaniem zostanie utworzona migawka bezpieczeństwa. Czy chcesz kontynuować?`,
      type: 'warning',
      onConfirm: () => {
        try {
          setIsProcessingBackup(true);
          restoreStableBaseline(orgId);
          setSnapshots(getOrgSnapshots(orgId));
          setBackupFeedback({
            type: 'success',
            message: `Pomyślnie przywrócono stabilny stan bazowy dla ${currentOrg?.shortName || currentOrg?.name}.`,
          });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (err) {
          setBackupFeedback({ type: 'error', message: `Błąd rollbacku: ${err.message}` });
        } finally {
          setIsProcessingBackup(false);
          setConfirmModal(null);
        }
      },
    });
  };

  // ── Sektor 1: Access Control State ──────────────────────────────────────────
  const [accessUsers, setAccessUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('skn_access_users');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ACCESS_USERS;
  });

  // Ukrywamy konta nadrzędne/administracyjne (Tomasz Bratkowski / super-admin / permanent) w UI zarządzania dostępem
  const visibleAccessUsers = useMemo(() => {
    return accessUsers.filter(u => {
      const email = (u?.email || '').toLowerCase();
      const name = (u?.name || '').toLowerCase();
      if (email.includes('atomekb73') || email.includes('atonex73')) return false;
      if (name.includes('bratkowski')) return false;
      if (u?.id === 'usr_super_admin') return false;
      if (u?.isPermanent) return false;
      return true;
    });
  }, [accessUsers]);

  const [newUserQuery, setNewUserQuery] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // ── Sektor 2: Faculty Supervisors State ─────────────────────────────────────
  const [editingSupId, setEditingSupId] = useState(null);
  const [supTitle, setSupTitle] = useState('mgr');
  const [supName, setSupName] = useState('');
  const [supAffiliation, setSupAffiliation] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supStartDate, setSupStartDate] = useState('2025-10-01');
  const [supEndDate, setSupEndDate] = useState('');
  const [supIsActive, setSupIsActive] = useState(true);

  // ── Sektor 3: Board Tenures State ───────────────────────────────────────────
  const [boardTenures, setBoardTenures] = useState(() => {
    try {
      const saved = localStorage.getItem('skn_board_tenures');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_BOARD_TENURES;
  });

  const [tenureMemberQuery, setTenureMemberQuery] = useState('');
  const [selectedTenureMember, setSelectedTenureMember] = useState(null);
  const [tenureSearchOpen, setTenureSearchOpen] = useState(false);
  const [tenureRole, setTenureRole] = useState('Sekretarz Koła');
  const [tenureStartDate, setTenureStartDate] = useState('2025-10-01');
  const [tenureEndDate, setTenureEndDate] = useState('');
  const [tenureIsActive, setTenureIsActive] = useState(true);

  // ── Sektor 4: Activity Weights State ────────────────────────────────────────
  const [localWeights, setLocalWeights] = useState(() => ({ ...weights }));
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    setLocalWeights({ ...weights });
  }, [weights]);

  // Sync access users to localStorage
  const saveAccessUsers = (updated) => {
    setAccessUsers(updated);
    try {
      localStorage.setItem('skn_access_users', JSON.stringify(updated));
    } catch {}
  };

  // Sync board tenures to localStorage
  const saveBoardTenures = (updated) => {
    setBoardTenures(updated);
    try {
      localStorage.setItem('skn_board_tenures', JSON.stringify(updated));
    } catch {}
  };

  // ── Access Control Handlers ────────────────────────────────────────────────
  const handleAddAccessUser = (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const roleMap = {
      ADMIN: { label: 'Dostęp pełny', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
      MODERATOR: { label: 'Dostęp zarządu', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
      VIEWER: { label: 'Tylko odczyt', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
    };

    const roleInfo = roleMap[newUserRole] || roleMap.ADMIN;

    const newUser = {
      id: `usr_${Date.now()}`,
      name: newUserName.trim() || newUserEmail.split('@')[0],
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      roleLabel: roleInfo.label,
      badgeColor: roleInfo.badgeColor,
      addedAt: new Date().toISOString().split('T')[0],
      isPermanent: false,
      isFirstLogin: true,
    };

    const updated = [...accessUsers.filter(u => u.email !== newUser.email), newUser];
    saveAccessUsers(updated);

    setNewUserQuery('');
    setNewUserName('');
    setNewUserEmail('');
  };

  const handleRevokeAccess = (id) => {
    const updated = accessUsers.filter(u => u.id !== id);
    saveAccessUsers(updated);
  };

  // Filtered members for access autocomplete
  const filteredAccessMembers = useMemo(() => {
    if (!newUserQuery.trim()) return [];
    const q = newUserQuery.toLowerCase();
    return members
      .filter(m => (m.fullName && m.fullName.toLowerCase().includes(q)) || (m.email && m.email.toLowerCase().includes(q)) || (m.index && m.index.includes(q)))
      .slice(0, 5);
  }, [members, newUserQuery]);

  // ── Faculty Supervisors Handlers ───────────────────────────────────────────
  const handleSaveSupervisor = (e) => {
    e.preventDefault();
    if (!supName.trim()) return;

    const cleanTitle = supTitle.trim() || 'mgr';
    const cleanName = supName.trim();
    const fullName = `${cleanTitle} ${cleanName}`;

    if (editingSupId) {
      updateSupervisor(editingSupId, {
        academicTitle: cleanTitle,
        name: cleanName,
        fullName,
        affiliation: supAffiliation.trim() || 'Wydział Psychologii WSKZ',
        email: supEmail.trim(),
        startDate: supStartDate,
        endDate: supIsActive ? '' : supEndDate,
        isActive: supIsActive,
      });
      setEditingSupId(null);
    } else {
      addSupervisor({
        academicTitle: cleanTitle,
        name: cleanName,
        fullName,
        affiliation: supAffiliation.trim() || 'Wydział Psychologii WSKZ',
        role: 'Opiekun Naukowy Koła',
        email: supEmail.trim(),
        startDate: supStartDate,
        endDate: supIsActive ? '' : supEndDate,
        isActive: supIsActive,
      });
    }

    // Reset Form
    setSupTitle('mgr');
    setSupName('');
    setSupAffiliation('');
    setSupEmail('');
    setSupStartDate('2025-10-01');
    setSupEndDate('');
    setSupIsActive(true);
  };

  const handleEditSupervisor = (sup) => {
    setEditingSupId(sup.id);
    setSupTitle(sup.academicTitle || 'mgr');
    setSupName(sup.name || '');
    setSupAffiliation(sup.affiliation || '');
    setSupEmail(sup.email || '');
    setSupStartDate(sup.startDate || '2025-10-01');
    setSupEndDate(sup.endDate || '');
    setSupIsActive(sup.isActive !== undefined ? sup.isActive : true);
  };

  const handleCancelSupervisorEdit = () => {
    setEditingSupId(null);
    setSupTitle('mgr');
    setSupName('');
    setSupAffiliation('');
    setSupEmail('');
    setSupStartDate('2025-10-01');
    setSupEndDate('');
    setSupIsActive(true);
  };

  // ── Board Tenures Handlers ─────────────────────────────────────────────────
  const calculateTenurePoints = (startDateStr, endDateStr, isActive, roleName) => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const end = (!isActive && endDateStr) ? new Date(endDateStr) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

    // Obliczenie liczby pełnych/częściowych miesięcy
    const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
    const roleConfig = BOARD_ROLE_WEIGHTS[roleName];
    const ptsPerMonth = roleConfig
      ? (localWeights[roleConfig.code]?.points || roleConfig.defaultPtsPerMonth)
      : (localWeights.ZARZAD_MIES?.points || 3);

    return months * ptsPerMonth;
  };

  const handleAddBoardTenure = (e) => {
    e.preventDefault();
    const name = selectedTenureMember
      ? (selectedTenureMember.fullName || `${selectedTenureMember.firstName} ${selectedTenureMember.lastName}`)
      : tenureMemberQuery.trim();

    if (!name) return;

    const newTenure = {
      id: `tenure_${Date.now()}`,
      memberName: name,
      memberIndex: selectedTenureMember?.index || '',
      memberEmail: selectedTenureMember?.email || '',
      roleName: tenureRole,
      startDate: tenureStartDate,
      endDate: tenureIsActive ? '' : tenureEndDate,
      isActive: tenureIsActive,
    };

    const updated = [newTenure, ...boardTenures];
    saveBoardTenures(updated);

    setSelectedTenureMember(null);
    setTenureMemberQuery('');
  };

  const handleDeleteTenure = (id) => {
    const updated = boardTenures.filter(t => t.id !== id);
    saveBoardTenures(updated);
  };

  const handleSyncAndSavePointsToGAS = async () => {
    try {
      setIsProcessingBackup(true);

      // a) Pobierz i wzbogać wpisy kadencji zarządu o naliczone punkty
      let currentTenures = boardTenures || [];
      if (currentTenures.length === 0 && typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = localStorage.getItem('skn_board_tenures');
          if (raw) currentTenures = JSON.parse(raw);
        } catch {}
      }

      const enrichedTenures = currentTenures.map(t => {
        const rawIdx = String(t.memberIndex || t.index || t.nrIndeksu || '').replace(/\D/g, '').trim();
        const cleanIdx = rawIdx.replace(/^0+/, '') || rawIdx;
        const pts = calculateTenurePoints(t.startDate, t.endDate, t.isActive, t.roleName);
        const roleName = String(t.roleName || t.role || t.opis || 'Członek Zarządu').trim();
        const startDate = t.startDate || t.date || new Date().toISOString().slice(0, 10);
        return {
          ...t,
          startDate,
          data: startDate,
          memberIndex: cleanIdx,
          nrIndeksu: cleanIdx,
          roleName,
          funkcja: roleName,
          kategoria: "Działalność w Zarządzie Koła",
          opis: `Pełnienie funkcji: ${roleName}`,
          opisAktywnosci: `Pełnienie funkcji: ${roleName}`,
          punkty: pts,
          points: pts,
          dataZapisu: new Date().toISOString().slice(0, 10),
        };
      });

      // b) Pobierz i uzupełnij ewidencję obecności (przypisanie 1 pkt za każdą obecność z pustym polem)
      let activeEwidencja = [];
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = localStorage.getItem('crm_ewidencja');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) activeEwidencja = parsed;
          }
        } catch {}
      }

      // Jeśli w pamięci brak ewidencji, zbuduj ją ze spotkań
      if (activeEwidencja.length === 0 && Array.isArray(meetings) && meetings.length > 0) {
        meetings.forEach(m => {
          if (Array.isArray(m.attendees)) {
            m.attendees.forEach(att => {
              if (att && (att.present || att.present !== false)) {
                const rawIdx = String(att.index || att.nrIndeksu || '').trim();
                const name = att.name || att.fullName || '';
                if (rawIdx || name) {
                  activeEwidencja.push({
                    kodSpotkania: m.code || m.id || m.title || 'SPOTKANIE',
                    data: m.date || new Date().toISOString().slice(0, 10),
                    nrIndeksu: rawIdx,
                    name: name,
                    rola: att.role || 'Uczestnik',
                    zrodlo: 'Google Meet',
                    punkty: 1,
                    opisAktywnosci: 'Obecność na spotkaniu naukowym'
                  });
                }
              }
            });
          }
        });
      }

      const updatedEwidencja = activeEwidencja.map(item => {
        const rawPts = item.punkty !== undefined ? item.punkty : (item.points !== undefined ? item.points : null);
        const pts = (rawPts !== null && rawPts !== undefined && Number(rawPts) > 0) ? Number(rawPts) : 1;
        return {
          ...item,
          punkty: pts,
          points: pts,
          opisAktywnosci: item.opisAktywnosci || 'Obecność na spotkaniu naukowym'
        };
      });

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('crm_ewidencja', JSON.stringify(updatedEwidencja));
        } catch {}
      }

      // c) Wyślij dwuetapową procedurę do backendu Google Apps Script
      await syncAllPointsToGAS({
        ewidencja: updatedEwidencja,
        boardTenures: enrichedTenures,
      });

      if (enrichedTenures.length > 0) {
        try {
          await saveBoardPointsToGAS(enrichedTenures, orgId);
        } catch (e) {
          console.warn('saveBoardPointsToGAS warning:', e);
        }
      }

      // d) Pobierz zaktualizowany stan z backendu
      const gasData = await fetchGasData();
      if (gasData) {
        if (gasData.dorobek) {
          try {
            localStorage.setItem('crm_dorobek', JSON.stringify(gasData.dorobek));
          } catch {}
        }
        if (gasData.ewidencja) {
          try {
            localStorage.setItem('crm_ewidencja', JSON.stringify(gasData.ewidencja));
          } catch {}
        }
      }

      if (typeof onRefreshData === 'function') {
        await onRefreshData({ force: true, silent: true });
      }

      setBackupFeedback({
        type: 'success',
        message: 'Pomyślnie zsynchronizowano i utrwalono punkty w arkuszach Google!',
      });
      setTimeout(() => setBackupFeedback(null), 7000);
    } catch (err) {
      console.error('Błąd zapisu punktów w arkuszu:', err);
      setBackupFeedback({
        type: 'error',
        message: `Błąd zapisu punktów w arkuszu: ${err?.message || err}`,
      });
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // Filtered members for tenure autocomplete
  const filteredTenureMembers = useMemo(() => {
    if (!tenureMemberQuery.trim()) return [];
    const q = tenureMemberQuery.toLowerCase();
    return members
      .filter(m => (m.fullName && m.fullName.toLowerCase().includes(q)) || (m.index && m.index.includes(q)))
      .slice(0, 5);
  }, [members, tenureMemberQuery]);

  // ── Activity Weights Handlers ──────────────────────────────────────────────
  const handleWeightChange = (key, value) => {
    const val = Math.max(0, parseInt(value, 10) || 0);
    setLocalWeights(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        points: val,
      },
    }));
  };

  const handleSaveAllWeights = () => {
    Object.keys(localWeights).forEach(key => {
      updateWeight(key, localWeights[key].points);
    });

    try {
      localStorage.setItem('crm_point_weights', JSON.stringify(localWeights));
      localStorage.setItem('skn_settings_config', JSON.stringify({
        weights: localWeights,
        accessUsers,
        boardTenures,
        supervisors,
        updatedAt: new Date().toISOString(),
      }));
    } catch {}

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  const handleResetAllWeights = () => {
    resetWeights();
    setLocalWeights({ ...DEFAULT_POINT_WEIGHTS });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-16">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl py-4 px-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold mb-1.5">
              <Sliders size={12} />
              <span>Centrum Konfiguracji & Uprawnień SKN</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              ⚙️ Ustawienia & Dostęp
            </h1>
            <p className="text-slate-300 text-xs mt-0.5 max-w-2xl leading-relaxed">
              Zarządzaj kontami administracyjnymi, rejestrem Opiekunów Naukowych Koła, historią funkcji zarządu oraz konfiguracją wag punktowych.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSaveAllWeights}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Save size={14} />
              <span>{saveFeedback ? '✓ Zapisano pomyślnie!' : 'Zapisz konfigurację'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SEKTOR 1: Zarządzanie Dostępem i Logowaniem ───────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">1. Zarządzanie Dostępem i Logowaniem (Access Control)</h2>
              <p className="text-xs text-slate-400">Nadawaj i odbieraj uprawnienia administracyjne dla członków zarządu i koordynatorów</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full self-start sm:self-auto">
            {visibleAccessUsers.length} uprawnionych użytkowników
          </span>
        </div>

        {/* Add User Form */}
        <form onSubmit={handleAddAccessUser} className="bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} className="text-indigo-600" />
            <span>Nadaj nowe uprawnienia dostępu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* User Search / Name */}
            <div className="md:col-span-4 relative">
              <label htmlFor="access-user-query" className="block text-xs font-semibold text-slate-600 mb-1">
                Wybierz z bazy lub wpisz ręcznie:
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="access-user-query"
                  name="accessUserQuery"
                  type="text"
                  value={newUserQuery}
                  onChange={e => {
                    setNewUserQuery(e.target.value);
                    setNewUserName(e.target.value);
                    setUserSearchOpen(true);
                  }}
                  onFocus={() => setUserSearchOpen(true)}
                  placeholder="Imię, nazwisko lub e-mail..."
                  className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {userSearchOpen && filteredAccessMembers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {filteredAccessMembers.map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setNewUserName(m.fullName || `${m.firstName} ${m.lastName}`);
                        setNewUserEmail(m.email || '');
                        setNewUserQuery(m.fullName || `${m.firstName} ${m.lastName}`);
                        setUserSearchOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs border-b border-slate-100 last:border-0 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">{m.fullName || `${m.firstName} ${m.lastName}`}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{m.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-4">
              <label htmlFor="access-user-email" className="block text-xs font-semibold text-slate-600 mb-1">
                Adres e-mail (Login Google):
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="access-user-email"
                  name="accessUserEmail"
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="adres@gmail.com"
                  className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
            </div>

            {/* Role */}
            <div className="md:col-span-2">
              <label htmlFor="access-user-role" className="block text-xs font-semibold text-slate-600 mb-1">
                Poziom uprawnień:
              </label>
              <select
                id="access-user-role"
                name="accessUserRole"
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-medium cursor-pointer"
              >
                <option value="ADMIN">Dostęp pełny</option>
                <option value="MODERATOR">Dostęp zarządu</option>
                <option value="VIEWER">Tylko odczyt</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Dodaj dostęp</span>
              </button>
            </div>
          </div>
        </form>

        {/* Access Users Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="px-4 py-2.5">Użytkownik</th>
                <th className="px-4 py-2.5">Adres E-mail (Google Login)</th>
                <th className="px-4 py-2.5">Status dostępu</th>
                <th className="px-4 py-2.5">Data nadania</th>
                <th className="px-4 py-2.5 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleAccessUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">
                    Brak dodatkowych użytkowników z nadanymi uprawnieniami.
                  </td>
                </tr>
              ) : (
                visibleAccessUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 font-mono">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        Aktywny dostęp
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{u.addedAt || '2026-09-05'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {u.isPermanent ? (
                        <span className="text-slate-300 text-xs italic">Niezbywalne</span>
                      ) : (
                        <button
                          onClick={() => handleRevokeAccess(u.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition text-xs font-semibold cursor-pointer"
                          title="Odbierz uprawnienia temu użytkownikowi"
                        >
                          <Trash2 size={13} />
                          <span>Cofnij</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SEKTOR 2: Opiekunowie Naukowi Koła ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">2. Opiekunowie Naukowi Koła (Faculty Supervisors)</h2>
              <p className="text-xs text-slate-400">Konfiguracja danych opiekunów naukowych, tytułów (mgr/dr/prof.) i afiliacji wykorzystywanych w protokołach i zaświadczeniach</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetSupervisors}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
              title="Wyczyść listę opiekunów koła"
            >
              <RotateCcw size={13} />
              <span>Wyczyść listę</span>
            </button>
            <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full">
              {supervisors.filter(s => s.isActive).length} aktywnych opiekunów
            </span>
          </div>
        </div>

        {/* Add / Edit Supervisor Form */}
        <form onSubmit={handleSaveSupervisor} className="bg-indigo-50/40 p-3.5 sm:p-4 rounded-2xl border border-indigo-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              {editingSupId ? <Pencil size={14} className="text-indigo-600" /> : <Plus size={14} className="text-indigo-600" />}
              <span>{editingSupId ? 'Edytuj dane Opiekuna Naukowego' : 'Dodaj Opiekuna Naukowego Koła'}</span>
            </div>

            {editingSupId && (
              <button
                type="button"
                onClick={handleCancelSupervisorEdit}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Anuluj edycję
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Title */}
            <div className="md:col-span-2">
              <label htmlFor="sup-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Tytuł naukowy:
              </label>
              <select
                id="sup-title"
                name="supTitle"
                value={supTitle}
                onChange={e => setSupTitle(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-indigo-900"
              >
                <option value="mgr">mgr</option>
                <option value="dr">dr</option>
                <option value="dr hab.">dr hab.</option>
                <option value="prof.">prof.</option>
              </select>
            </div>

            {/* Name */}
            <div className="md:col-span-4">
              <label htmlFor="sup-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Imię i Nazwisko:
              </label>
              <input
                id="sup-name"
                name="supName"
                type="text"
                required
                value={supName}
                onChange={e => setSupName(e.target.value)}
                placeholder="np. Anna Kowalska"
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-semibold text-slate-800"
              />
            </div>

            {/* Affiliation */}
            <div className="md:col-span-3">
              <label htmlFor="sup-affiliation" className="block text-xs font-semibold text-slate-700 mb-1">
                Afiliacja / Jednostka:
              </label>
              <input
                id="sup-affiliation"
                name="supAffiliation"
                type="text"
                value={supAffiliation}
                onChange={e => setSupAffiliation(e.target.value)}
                placeholder="np. Wydział Psychologii / Katedra..."
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-3">
              <label htmlFor="sup-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Adres e-mail (Meet Matching):
              </label>
              <input
                id="sup-email"
                name="supEmail"
                type="email"
                value={supEmail}
                onChange={e => setSupEmail(e.target.value)}
                placeholder="np. anna.kowalska@uczelnia.pl"
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* Start Date */}
            <div className="md:col-span-3">
              <label htmlFor="sup-start-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Początek sprawowania opieki:
              </label>
              <input
                id="sup-start-date"
                name="supStartDate"
                type="date"
                value={supStartDate}
                onChange={e => setSupStartDate(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
              />
            </div>

            {/* End Date & Status */}
            <div className="md:col-span-5 space-y-1">
              <div className="flex items-center justify-between">
                {!supIsActive ? (
                  <label htmlFor="sup-end-date" className="block text-xs font-semibold text-slate-700">
                    Koniec opieki:
                  </label>
                ) : (
                  <span className="block text-xs font-semibold text-slate-700">
                    Koniec opieki:
                  </span>
                )}
                <label htmlFor="sup-is-active" className="flex items-center gap-1 text-xs text-emerald-700 font-semibold cursor-pointer">
                  <input
                    id="sup-is-active"
                    name="supIsActive"
                    type="checkbox"
                    checked={supIsActive}
                    onChange={e => setSupIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-400"
                  />
                  <span>Aktualny opiekun</span>
                </label>
              </div>

              {!supIsActive ? (
                <input
                  id="sup-end-date"
                  name="supEndDate"
                  type="date"
                  value={supEndDate}
                  onChange={e => setSupEndDate(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
                />
              ) : (
                <div className="h-9 px-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center">
                  🟢 Aktualnie sprawuje opiekę
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="md:col-span-4 flex items-end">
              <button
                type="submit"
                className="w-full h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                <span>{editingSupId ? 'Zapisz zmiany opiekuna' : 'Dodaj opiekuna naukowego'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Supervisors Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="px-4 py-2.5">Tytuł & Imię i Nazwisko</th>
                <th className="px-4 py-2.5">Afiliacja / Jednostka</th>
                <th className="px-4 py-2.5">Adres E-mail</th>
                <th className="px-4 py-2.5">Okres opieki</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-xs">
                    Brak przypisanych opiekunów naukowych. Użyj powyższego formularza, aby dodać nowego opiekuna koła.
                  </td>
                </tr>
              ) : (
                supervisors.map(sup => (
                <tr key={sup.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      🎓
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {sup.fullName || `${sup.academicTitle || 'mgr'} ${sup.name}`}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-medium">{sup.role || 'Opiekun Naukowy Koła'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">{sup.affiliation || 'Wydział Psychologii WSKZ'}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono">{sup.email || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono">
                    {sup.startDate} {sup.isActive ? '— Aktualnie' : `— ${sup.endDate || '—'}`}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {sup.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Aktualny opiekun
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        Były opiekun
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleEditSupervisor(sup)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="Edytuj dane opiekuna"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteSupervisor(sup.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                        title="Usuń tego opiekuna z listy"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SEKTOR 3: Kadencje Zarządu i Historia Funkcji ─────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">3. Kadencje Zarządu i Historia Funkcji (Board Tenures)</h2>
              <p className="text-xs text-slate-400">Rejestr pełnionych ról w Kole Naukowym z automatycznym kalkulatorem punktów aktywności</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full self-start sm:self-auto">
            {boardTenures.filter(t => t.isActive).length} aktywnych w zarządzie
          </span>
        </div>

        {/* Add Tenure Form */}
        <form onSubmit={handleAddBoardTenure} className="bg-amber-50/30 p-3.5 sm:p-4 rounded-2xl border border-amber-200/60 space-y-3">
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} className="text-amber-600" />
            <span>Dodaj wpis o pełnionej funkcji w Kole</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Member select */}
            <div className="md:col-span-4 relative">
              <label htmlFor="tenure-member-query" className="block text-xs font-semibold text-slate-700 mb-1">
                Student (Członek Koła):
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="tenure-member-query"
                  name="tenureMemberQuery"
                  type="text"
                  required
                  value={tenureMemberQuery}
                  onChange={e => {
                    setTenureMemberQuery(e.target.value);
                    setTenureSearchOpen(true);
                  }}
                  onFocus={() => setTenureSearchOpen(true)}
                  placeholder="Szukaj z bazy członków..."
                  className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium"
                />
              </div>

              {tenureSearchOpen && filteredTenureMembers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {filteredTenureMembers.map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedTenureMember(m);
                        setTenureMemberQuery(`${m.fullName || `${m.firstName} ${m.lastName}`} (${m.index || 'brak'})`);
                        setTenureSearchOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-amber-50 cursor-pointer text-xs border-b border-slate-100 last:border-0 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">{m.fullName || `${m.firstName} ${m.lastName}`}</span>
                      <span className="text-[11px] text-amber-700 font-mono font-bold">{m.index}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role */}
            <div className="md:col-span-3">
              <label htmlFor="tenure-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Pełniona funkcja:
              </label>
              <select
                id="tenure-role"
                name="tenureRole"
                value={tenureRole}
                onChange={e => setTenureRole(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium cursor-pointer"
              >
                {Object.keys(BOARD_ROLE_WEIGHTS).map(roleName => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="md:col-span-2">
              <label htmlFor="tenure-start-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Data rozpoczęcia:
              </label>
              <input
                id="tenure-start-date"
                name="tenureStartDate"
                type="date"
                required
                value={tenureStartDate}
                onChange={e => setTenureStartDate(e.target.value)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium font-mono"
              />
            </div>

            {/* End Date / Is Active */}
            <div className="md:col-span-3 space-y-1">
              <div className="flex items-center justify-between">
                {!tenureIsActive ? (
                  <label htmlFor="tenure-end-date" className="block text-xs font-semibold text-slate-700">
                    Data zakończenia:
                  </label>
                ) : (
                  <span className="block text-xs font-semibold text-slate-700">
                    Data zakończenia:
                  </span>
                )}
                <label htmlFor="tenure-is-active" className="flex items-center gap-1 text-xs text-emerald-700 font-semibold cursor-pointer">
                  <input
                    id="tenure-is-active"
                    name="tenureIsActive"
                    type="checkbox"
                    checked={tenureIsActive}
                    onChange={e => setTenureIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-400"
                  />
                  <span>W trakcie</span>
                </label>
              </div>

              {!tenureIsActive ? (
                <input
                  id="tenure-end-date"
                  name="tenureEndDate"
                  type="date"
                  value={tenureEndDate}
                  onChange={e => setTenureEndDate(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium font-mono"
                />
              ) : (
                <div className="h-9 px-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center">
                  🟢 Aktualnie w trakcie
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Zapisz w rejestrze zarządu</span>
            </button>
          </div>
        </form>

        {/* Tenures Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="px-4 py-2.5">Osoba (Członek Koła)</th>
                <th className="px-4 py-2.5">Pełniona funkcja</th>
                <th className="px-4 py-2.5">Data rozpoczęcia</th>
                <th className="px-4 py-2.5">Data zakończenia</th>
                <th className="px-4 py-2.5 text-center">Naliczone punkty</th>
                <th className="px-4 py-2.5 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boardTenures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Brak zarejestrowanych kadencji w zarządzie. Dodaj pierwszy wpis powyżej.
                  </td>
                </tr>
              ) : (
                boardTenures.map(t => {
                  const points = calculateTenurePoints(t.startDate, t.endDate, t.isActive, t.roleName);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-800">{t.memberName}</div>
                        {t.memberIndex && <div className="text-[11px] text-slate-400 font-mono">Indeks: {t.memberIndex}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {t.roleName}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">{t.startDate}</td>
                      <td className="px-4 py-2.5">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            W trakcie
                          </span>
                        ) : (
                          <span className="font-mono text-slate-600">{t.endDate || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono shadow-2xs">
                          +{points} pkt
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteTenure(t.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="Usuń ten wpis z rejestru"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SEKTOR 4: Konfiguracja Wag Punktowych ─────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">4. Konfiguracja Wag Punktowych (Activity Weights)</h2>
              <p className="text-xs text-slate-400">Dostosuj liczbę punktów przyznawanych za poszczególne formy zaangażowania w Kole</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAllWeights}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Przywróć domyślne</span>
            </button>
            <button
              onClick={handleSaveAllWeights}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Save size={13} />
              <span>{saveFeedback ? 'Zapisano!' : 'Zapisz wagi'}</span>
            </button>
          </div>
        </div>

        {/* Weights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.keys(localWeights).map(key => {
            const item = localWeights[key];
            return (
              <div
                key={key}
                className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-100 hover:border-indigo-200 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base shrink-0 shadow-2xs">
                    {item.icon || '📌'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={item.label}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{item.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  <input
                    id={`weight-input-${key}`}
                    name={`weight_${key}`}
                    type="number"
                    min="0"
                    max="100"
                    value={item.points}
                    onChange={e => handleWeightChange(key, e.target.value)}
                    className="w-9 text-center font-bold text-xs text-indigo-700 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-semibold">pkt</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEKTOR 5: Zasady Zaliczania & Frekwencji (Attendance Rules & Live Simulator) ──────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <CheckCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">5. Zasady Zaliczania i Frekwencji</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 uppercase tracking-wide">
                  SYMULATOR NA ŻYWO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Konfiguracja mianownika frekwencji, rocznego progu certyfikatu oraz interaktywny symulator podglądu karty w czasie rzeczywistym.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAttendance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Przywróć domyślne</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAttendance}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Save size={13} />
              <span>{attendanceSaveFeedback ? '✓ Zapisano konfigurację!' : 'Zapisz konfigurację'}</span>
            </button>
          </div>
        </div>

        {/* ── 2-Column Split View: Right-Handed Action Form & Left-Handed Live 3-Part Preview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
          
          {/* ══════════════════════════════════════════════════════════════════
              KOLUMNA 2 (PRAWA STRONA): Obszar akcji / Formularz pod prawą ręką (lg:col-span-6 order-2 lg:order-2)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 order-2 lg:order-2 space-y-4">
            
            {/* 1. Wybór trybu wyznaczania mianownika */}
            <div className="space-y-2.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Tryb wyznaczania mianownika frekwencji:
              </span>

              <div className="space-y-2">
                {/* Opcja 1: DYNAMIC_MANDATORY */}
                <div
                  onClick={() => setLocalAttendance(prev => ({ ...prev, calcMode: 'DYNAMIC_MANDATORY' }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    localAttendance.calcMode === 'DYNAMIC_MANDATORY'
                      ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20 shadow-2xs'
                      : 'bg-slate-100 border-slate-300 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        localAttendance.calcMode === 'DYNAMIC_MANDATORY' ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                      }`}>
                        {localAttendance.calcMode === 'DYNAMIC_MANDATORY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-800">Dynamiczny (Obowiązkowe z logami)</span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
                      Zalecany (SKN)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 pl-6 leading-relaxed">
                    Mianownik rośnie wraz z odbywaniem kolejnych spotkań o charakterze <strong>Obowiązkowe</strong> posiadających listę obecności.
                  </p>
                </div>

                {/* Opcja 2: FIXED_TARGET */}
                <div
                  onClick={() => setLocalAttendance(prev => ({ ...prev, calcMode: 'FIXED_TARGET' }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    localAttendance.calcMode === 'FIXED_TARGET'
                      ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20 shadow-2xs'
                      : 'bg-slate-100 border-slate-300 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        localAttendance.calcMode === 'FIXED_TARGET' ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                      }`}>
                        {localAttendance.calcMode === 'FIXED_TARGET' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-800">Sztywny roczny cel (np. {localAttendance.fixedTarget || 10} spotkań)</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Stały pułap
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 pl-6 leading-relaxed">
                    Mianownik jest stałą, z góry określoną liczbą spotkań w roku. Każda zarejestrowana obecność przybliża studenta do celu.
                  </p>
                </div>

                {/* Opcja 3: ALL_VERIFIED */}
                <div
                  onClick={() => setLocalAttendance(prev => ({ ...prev, calcMode: 'ALL_VERIFIED' }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    localAttendance.calcMode === 'ALL_VERIFIED'
                      ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20 shadow-2xs'
                      : 'bg-slate-100 border-slate-300 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        localAttendance.calcMode === 'ALL_VERIFIED' ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                      }`}>
                        {localAttendance.calcMode === 'ALL_VERIFIED' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-800">Wszystkie zrealizowane (Bez podziału)</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                      Wszystkie typy
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 pl-6 leading-relaxed">
                    Każde zakończone wydarzenie z zarejestrowaną listą obecności powiększa mianownik frekwencji.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Parametry bazowe */}
            <div className="space-y-3 pt-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Parametry bazowe i progi:
              </span>

              {/* Sztywny cel spotkań */}
              <div className={`p-3 rounded-2xl border transition-all ${
                localAttendance.calcMode === 'FIXED_TARGET'
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="cfg-fixed-target" className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Liczba spotkań w celu rocznym:
                    </label>
                    <p className="text-[11px] text-slate-600">
                      Używane jako stały mianownik w trybie "Sztywny roczny cel"
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      id="cfg-fixed-target"
                      name="fixedTarget"
                      type="number"
                      min="1"
                      max="50"
                      value={localAttendance.fixedTarget || 10}
                      onChange={e => setLocalAttendance(prev => ({ ...prev, fixedTarget: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                      disabled={localAttendance.calcMode !== 'FIXED_TARGET'}
                      aria-label="Liczba spotkań w celu rocznym"
                      className="w-16 h-8 text-center bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-400 outline-none disabled:bg-slate-100 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-600">spotkań</span>
                  </div>
                </div>
              </div>

              {/* Próg zaliczenia do certyfikatu (Slider + Input) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="cfg-min-percent" className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Próg zaliczenia do certyfikatu:
                    </label>
                    <p className="text-[11px] text-slate-600">
                      Minimalna frekwencja roczna kwalifikująca do wydania zaświadczenia
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    <input
                      id="cfg-min-percent"
                      name="minPassingPercent"
                      type="number"
                      min="10"
                      max="100"
                      step="5"
                      value={localAttendance.minPassingPercent || 50}
                      onChange={e => setLocalAttendance(prev => ({ ...prev, minPassingPercent: Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 50)) }))}
                      aria-label="Próg zaliczenia do certyfikatu procentowo"
                      className="w-10 text-center font-bold text-xs text-teal-700 outline-none font-mono"
                    />
                    <span className="text-xs font-bold text-teal-700">%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    id="cfg-min-percent-range"
                    name="minPassingPercentRange"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={localAttendance.minPassingPercent || 50}
                    onChange={e => setLocalAttendance(prev => ({ ...prev, minPassingPercent: parseInt(e.target.value, 10) || 50 }))}
                    aria-label="Suwak progu zaliczenia do certyfikatu"
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono font-bold text-slate-700 min-w-[32px] text-right">
                    {localAttendance.minPassingPercent || 50}%
                  </span>
                </div>
              </div>

              {/* Zachowanie przy 0 obecnościach */}
              <div className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Prezentacja zerowej frekwencji (0 obecności):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalAttendance(prev => ({ ...prev, zeroAttendanceDisplay: 'PERCENT_ZERO' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      localAttendance.zeroAttendanceDisplay === 'PERCENT_ZERO'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>0% (Wartość liczbowa)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalAttendance(prev => ({ ...prev, zeroAttendanceDisplay: 'NEUTRAL_DASH' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      localAttendance.zeroAttendanceDisplay === 'NEUTRAL_DASH'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>— (Start roku)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Interaktywny pasek kontrolny symulatora (Testowe dane wejściowe) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} className="text-teal-600" />
                <span>3. Sterowanie testowe symulatora (Podgląd w czasie rzeczywistym):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Stepper 1: Testowa liczba obecności */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between">
                  <div>
                    <label htmlFor="sim-attended-input" className="text-[10px] font-bold text-slate-700 block cursor-pointer">
                      Obecności studenta:
                    </label>
                    <span className="text-[10px] text-slate-500">Zaliczone spotkania</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSimAttended(prev => Math.max(0, prev - 1))}
                      aria-label="Zmniejsz liczbę obecności"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      id="sim-attended-input"
                      name="simAttended"
                      type="number"
                      min="0"
                      max={simStats.total}
                      value={simAttended}
                      onChange={e => setSimAttended(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      aria-label="Liczba obecności w symulatorze"
                      className="w-8 text-center font-mono font-bold text-xs text-teal-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSimAttended(prev => Math.min(simStats.total, prev + 1))}
                      aria-label="Zwiększ liczbę obecności"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Stepper 2: Testowa pula spotkań w roku */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between">
                  <div>
                    <label htmlFor="sim-total-meetings-input" className="text-[10px] font-bold text-slate-700 block cursor-pointer">
                      Pula spotkań w roku:
                    </label>
                    <span className="text-[10px] text-slate-500">Wszystkie zrealizowane</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSimTotalMeetings(prev => Math.max(1, prev - 1))}
                      aria-label="Zmniejsz pulę spotkań w roku"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      id="sim-total-meetings-input"
                      name="simTotalMeetings"
                      type="number"
                      min="1"
                      max="40"
                      value={simTotalMeetings}
                      onChange={e => setSimTotalMeetings(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      aria-label="Pula spotkań w roku w symulatorze"
                      className="w-8 text-center font-mono font-bold text-xs text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSimTotalMeetings(prev => Math.min(40, prev + 1))}
                      aria-label="Zwiększ pulę spotkań w roku"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save & Reset Buttons for Right Column */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetAttendance}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Przywróć domyślne</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="flex-1 h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save size={15} />
                <span>{attendanceSaveFeedback ? '✓ Konfiguracja zapisana!' : 'Zapisz konfigurację koła'}</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              KOLUMNA 1 (LEWA STRONA): Obszar dynamicznej obserwacji / Potrójny Podgląd (lg:col-span-6 order-1 lg:order-1)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 order-1 lg:order-1 space-y-4 bg-gradient-to-br from-slate-50/90 to-teal-50/30 p-4 sm:p-5 rounded-3xl border border-teal-200/80 shadow-xs">
            
            {/* Simulator Header */}
            <div className="flex items-center justify-between pb-2 border-b border-teal-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  👁️
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Dynamiczny Podgląd na żywo (Potrójny Audyt)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reaguje natychmiast na zmiany parametrów i trybów po prawej stronie
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                Live Preview
              </span>
            </div>

            {/* ── SEKCJA A (Góra): Karta z Profilu Członka ── */}
            <div className="bg-white border border-teal-200/90 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-teal-600" />
                  <span>Sekcja A: Karta Frekwencji i Audyt Spotkań (Widok Profilu)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Modal Członka</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wyliczona frekwencja:</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                      {simStats.displayFreqText}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${simStats.engagement.color}`}>
                      {simStats.engagement.icon} {simStats.engagement.label}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 block">Mianownik bazowy:</span>
                  <p className="text-sm font-bold text-teal-800 font-mono">
                    {simStats.attended} / {simStats.baseDenominator} spotkań
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${
                    simStats.isEligible
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {simStats.isEligible ? '✓ Kwalifikacja do zaświadczenia' : '⚠️ W toku (brakuje)'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      simStats.freq >= 75 ? 'bg-emerald-500' : simStats.freq >= 50 ? 'bg-teal-500' : simStats.freq >= 25 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, simStats.freq))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                  <span>Próg zaświadczenia: <strong>{localAttendance.minPassingPercent || 50}%</strong></span>
                  <span>100% ({simStats.baseDenominator}/{simStats.baseDenominator})</span>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <div className="bg-emerald-100/90 border border-emerald-300 rounded-xl p-2 text-center">
                  <span className="block text-[9px] font-bold text-emerald-800 uppercase">Zaliczone</span>
                  <span className="text-base font-black text-emerald-950 font-mono">
                    {simStats.attended}
                  </span>
                </div>
                <div className="bg-slate-100 border border-slate-300 rounded-xl p-2 text-center">
                  <span className="block text-[9px] font-bold text-slate-800 uppercase">Wymagane</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {simStats.baseDenominator}
                  </span>
                </div>
                <div className="bg-amber-100/90 border border-amber-300 rounded-xl p-2 text-center">
                  <span className="block text-[9px] font-bold text-amber-800 uppercase">Pozostało</span>
                  <span className="text-base font-black text-amber-950 font-mono">
                    {Math.max(0, simStats.baseDenominator - simStats.attended)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── SEKCJA B (Środek): Miniaturowa Oś Czasu Spotkań ── */}
            <div className="bg-white border border-teal-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar size={13} className="text-teal-600" />
                  <span>Sekcja B: Miniaturowa Oś Czasu Spotkań ({simStats.total} wydarzeń w roku)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {simStats.attended} zaliczone • {simStats.total - simStats.attended} nieobecności
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-200/90 rounded-xl border border-slate-300">
                {Array.from({ length: simStats.total }, (_, idx) => {
                  const isAttended = idx < simStats.attended;
                  const code = `M${String(idx + 1).padStart(2, '0')}`;
                  return (
                    <div
                      key={idx}
                      title={`Spotkanie ${code}: ${isAttended ? 'Obecność zaliczona' : 'Nieobecność'}`}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 border ${
                        isAttended
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{code}</span>
                      <span>{isAttended ? '✓' : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SEKCJA C (Dół): Symulacja Wiersza w Głównej Tabeli Członków ── */}
            <div className="bg-white border border-teal-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Users size={13} className="text-teal-600" />
                  <span>Sekcja C: Podgląd wiersza w Głównej Tabeli Członków (MembersTab)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Tabela Główna</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100 shadow-sm p-2.5">
                <div className="min-w-[500px] space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/80">
                    <div className="col-span-3">Status</div>
                    <div className="col-span-3 text-center">Frekwencja</div>
                    <div className="col-span-2 text-center">Ob. / Nieob.</div>
                    <div className="col-span-2 text-center">Zaświadczenie</div>
                    <div className="col-span-2 text-center">Punkty</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center py-1">
                    {/* Status */}
                    <div className="col-span-3">
                      <span className="h-6 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Członek Aktywny
                      </span>
                    </div>

                    {/* Frekwencja */}
                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-200/80 rounded-full h-1.5 overflow-hidden border border-slate-200">
                          <div
                            className={`h-1.5 rounded-full ${
                              simStats.freq >= 75 ? 'bg-emerald-500' : simStats.freq >= 50 ? 'bg-amber-400' : simStats.freq >= 25 ? 'bg-amber-300' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, simStats.freq))}%` }}
                          />
                        </div>
                        <span className="text-slate-900 font-bold text-xs font-mono">{simStats.displayFreqText}</span>
                      </div>
                      <span className={`h-5 px-2 inline-flex items-center justify-center gap-1 rounded-full text-[10px] font-medium border ${simStats.engagement.color}`}>
                        <span className="w-1 h-1 rounded-full bg-current" />
                        {simStats.engagement.label}
                      </span>
                    </div>

                    {/* Ob. / Nieob. */}
                    <div className="col-span-2 text-center font-mono text-xs font-bold text-slate-900">
                      {simStats.attended} / {Math.max(0, simStats.total - simStats.attended)}
                    </div>

                    {/* Zaświadczenie */}
                    <div className="col-span-2 text-center">
                      <span className={`h-6 px-2.5 inline-flex items-center justify-center text-[11px] font-medium tracking-tight rounded-full border shadow-2xs whitespace-nowrap ${
                        simStats.isEligible
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {simStats.isEligible ? '✓ Można wydać' : 'W toku'}
                      </span>
                    </div>

                    {/* Punkty */}
                    <div className="col-span-2 text-center font-mono text-xs font-bold text-indigo-700">
                      48 pkt
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── SEKTOR 6: EMAIL & SMTP / NOTIFICATIONS CONFIGURATION ─────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-sm shadow-indigo-200 shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                6. Konfiguracja Poczty Koła & Notyfikacji (Email & SMTP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dedykowany adres koła, parametry wysyłki oraz szablony wiadomości powitalnych powiązane z arkuszem <strong className="text-slate-700">Ewidencja_Poczty</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetEmailConfig}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Przywróć domyślne parametry i oficjalne szablony"
            >
              <RotateCcw size={13} />
              <span>Domyślne szablony</span>
            </button>

            <button
              type="button"
              onClick={handleSaveEmailConfig}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save size={14} />
              <span>Zapisz ustawienia poczty</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {emailSaveFeedback && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
              emailSaveFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {emailSaveFeedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{emailSaveFeedback.message}</span>
          </div>
        )}

        {/* Form Grid */}
        <form onSubmit={handleSaveEmailConfig} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Column: Sender and SMTP Credentials */}
            <div className="space-y-3">
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <AtSign size={14} className="text-indigo-600" />
                  <span>Dedykowany Adres Nadawczy Koła</span>
                </h4>

                <div className="space-y-2.5">
                  <div>
                    <label htmlFor="sender-email" className="text-xs font-semibold text-slate-700 block mb-1">
                      Adres E-mail Koła (Nadawca):
                    </label>
                    <input
                      id="sender-email"
                      name="senderEmail"
                      type="email"
                      required
                      value={emailConfig.senderEmail || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                      placeholder="skn.psychoonkologia@wskz.pl"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="sender-name" className="text-xs font-semibold text-slate-700 block mb-1">
                      Nazwa Wyświetlana Nadawcy:
                    </label>
                    <input
                      id="sender-name"
                      name="senderName"
                      type="text"
                      required
                      value={emailConfig.senderName || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                      placeholder="Zarząd SKN Psychoonkologii WSKZ"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="reply-to" className="text-xs font-semibold text-slate-700 block mb-1">
                      Adres do Odpowiedzi (Reply-To):
                    </label>
                    <input
                      id="reply-to"
                      name="replyTo"
                      type="email"
                      value={emailConfig.replyTo || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, replyTo: e.target.value })}
                      placeholder="skn.psychoonkologia@wskz.pl"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SMTP Server & App Password (Optional) */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Key size={14} className="text-indigo-600" />
                    <span>Parametry SMTP / Hasło Aplikacji</span>
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                    Opcjonalne
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label htmlFor="smtp-host" className="text-xs font-semibold text-slate-600 block mb-1">
                      Serwer SMTP (Host):
                    </label>
                    <input
                      id="smtp-host"
                      name="smtpHost"
                      type="text"
                      value={emailConfig.smtpHost || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="smtp-port" className="text-xs font-semibold text-slate-600 block mb-1">
                      Port:
                    </label>
                    <input
                      id="smtp-port"
                      name="smtpPort"
                      type="text"
                      value={emailConfig.smtpPort || '587'}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
                      placeholder="587"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtp-pass" className="text-xs font-semibold text-slate-600 block mb-1">
                    Hasło Aplikacji Google / Hasło SMTP:
                  </label>
                  <div className="relative">
                    <input
                      id="smtp-pass"
                      name="smtpPass"
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={emailConfig.smtpPassword || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })}
                      placeholder="np. 16-znakowe hasło aplikacji Gmail"
                      className="w-full h-9 pl-3 pr-10 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title={showSmtpPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    >
                      {showSmtpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Hasło aplikacji Gmail (16 znaków bez spacji) generowane w koncie Google Koła w zakładce Bezpieczeństwo → Weryfikacja dwuetapowa.
                  </p>
                </div>

                <div>
                  <label htmlFor="email-footer" className="text-xs font-semibold text-slate-700 block mb-1">
                    Oficjalna Stopka / Podpis Koła:
                  </label>
                  <textarea
                    id="email-footer"
                    name="emailFooter"
                    rows={3}
                    value={emailConfig.footerSignature || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, footerSignature: e.target.value })}
                    placeholder="Z poważaniem,&#10;Zarząd SKN..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Welcome Email Subject & Body Template */}
            <div className="space-y-3">
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Sparkles size={14} className="text-indigo-600" />
                      <span>Szablon Powitania (Kwarantanna)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {emailConfig.senderEmail}
                    </span>
                  </div>

                  <div>
                    <label htmlFor="welcome-subject" className="text-xs font-semibold text-slate-700 block mb-1">
                      Domyślny Temat Wiadomości Powitalnej:
                    </label>
                    <input
                      id="welcome-subject"
                      name="welcomeSubject"
                      type="text"
                      required
                      value={emailConfig.welcomeSubjectTemplate || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, welcomeSubjectTemplate: e.target.value })}
                      placeholder="Potwierdzenie przyjęcia zgłoszenia..."
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="welcome-body" className="text-xs font-semibold text-slate-700">
                        Treść Szablonu Powitania:
                      </label>
                    </div>
                    <textarea
                      id="welcome-body"
                      name="welcomeBody"
                      rows={10}
                      value={emailConfig.welcomeBodyTemplate || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, welcomeBodyTemplate: e.target.value })}
                      placeholder="Dzień dobry {IMIE}..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                    <span className="text-[11px] font-bold text-indigo-900 block">
                      Dostępne znaczniki dynamiczne:
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-bold">
                        {'{IMIE}'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-bold">
                        {'{IMIE_NAZWISKO}'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-bold">
                        {'{INDEKS}'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-bold">
                        {'{KIERUNEK}'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-bold">
                        {'{ROK}'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-bold">
                        {'{PODPIS}'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="submit"
                    className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Zapisz konfigurację poczty</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* ── SEKTOR 6: Kopia Zapasowa & Migawki Koła (Snapshots) ────────────────── */}
      <div className="space-y-4">
        {/* Global Feedback Banner */}
        {backupFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm animate-in fade-in duration-150 ${
              backupFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {backupFeedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertOctagon size={18} className="text-rose-600 shrink-0" />
              )}
              <span>{backupFeedback.message}</span>
            </div>
            <button
              onClick={() => setBackupFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* KARTA KOŁA: Zarządzanie Bazą Danych & Google Workspace */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">7. Zarządzanie Bazą Danych & Google Workspace</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {currentOrg?.shortName || currentOrg?.name}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Hermetyczny eksport, import, punkty przywracania stanu (Snapshots) oraz serwisowa re-indeksacja arkuszy Google Sheets.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Hidden file input for org backup import */}
              <input
                ref={orgFileInputRef}
                id="org-backup-file-input"
                name="orgBackupFileInput"
                type="file"
                accept=".json"
                onChange={handleImportOrgFile}
                className="hidden"
                aria-label="Wgraj plik kopii zapasowej koła JSON"
              />

              <button
                type="button"
                onClick={handleSyncAndSavePointsToGAS}
                disabled={isProcessingBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                title="Synchronizuje i zapisuje punkty za obecności oraz kadencje zarządu w arkuszu Google Sheets"
              >
                {isProcessingBackup ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} className="fill-current" />}
                <span>⚡ Zsynchronizuj i zapisz punkty w arkuszu Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    title: "Awaryjna re-indeksacja arkusza Rejestr_Zgloszen",
                    message: "Operacja serwisowa: czy na pewno chcesz zsynchronizować cały stan aplikacji z arkuszem? (Daty wpływu i weryfikacji zostaną zachowane)",
                    type: "warning",
                    onConfirm: async () => {
                      try {
                        setIsProcessingBackup(true);
                        await initializeSubmissionsRegistryInGAS(members);
                        setBackupFeedback({
                          type: "success",
                          message: "Pomyślnie zsynchronizowano i przeprowadzono re-indeksację arkusza Rejestr_Zgloszen!",
                        });
                        setTimeout(() => setBackupFeedback(null), 5000);
                      } catch (err) {
                        setBackupFeedback({
                          type: "error",
                          message: `Błąd re-indeksacji arkusza: ${err.message || err}`,
                        });
                      } finally {
                        setIsProcessingBackup(false);
                        setConfirmModal(null);
                      }
                    },
                  });
                }}
                disabled={isProcessingBackup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
                title="Awaryjna re-indeksacja arkusza Rejestr_Zgloszen w Google Sheets"
              >
                <span>🔧 Awaryjna re-indeksacja arkusza Rejestr_Zgloszen</span>
              </button>

              <button
                type="button"
                onClick={handleExportOrg}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Download size={13} />
                <span>Pobierz kopię JSON</span>
              </button>

              <button
                type="button"
                onClick={() => orgFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Upload size={13} />
                <span>Przywróć z pliku</span>
              </button>

              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Utwórz lokalny punkt przywracania stanu"
              >
                <History size={13} />
                <span>Utwórz migawkę</span>
              </button>
            </div>
          </div>

          {/* Centralna Konfiguracja Dysku Google Koła */}
          <div className="w-full p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <HardDrive size={16} className="text-indigo-600" />
                  Główny katalog Dysku Google Koła (settings.driveFolderUrl)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Adres folderu na Dysku Google, w którym przechowywane są oficjalne dokumenty, uchwały i protokoły koła.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open(driveFolderUrl || DEFAULT_DRIVE_FOLDER_URL, '_blank')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
              >
                <ExternalLink size={13} />
                <span>🔗 Otwórz Dysk Koła</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrlState(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  setDriveFolderUrl(orgId, driveFolderUrl);
                  setBackupFeedback({ type: 'success', message: 'Zapisano podlinkowany Dysk Google Koła!' });
                  setTimeout(() => setBackupFeedback(null), 3000);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                Zapisz adres Dysku
              </button>
            </div>
          </div>

          {/* Snapshots Table / List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <History size={14} className="text-indigo-600" />
                <span>Ostatnie automatyczne migawki stanu (Maks. 5 kopii):</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Zapisywane automatycznie po każdej synchronizacji
              </span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Brak zapisanych migawek dla tego koła. Kliknij „Utwórz migawkę” lub wykonaj synchronizację z arkuszem.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/40">
                {snapshots.map((snap, idx) => (
                  <div
                    key={snap.key}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shadow-2xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">{snap.formattedDate}</p>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {snap.reason}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Zarchiwizowano {snap.keysCount} kluczy rejestru
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreSnap(snap)}
                        disabled={isProcessingBackup}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        <span>Przywróć ten punkt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnap(snap.key)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Usuń tę migawkę"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SEKTOR 7: ZAAWANSOWANE ZARZĄDZANIE DANYMI (Kopia i Konserwacja) ─────── */}
        {(isSuperAdmin || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'atomekb73@gmail.com') && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-4 sm:p-5 border border-indigo-500/30 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold shadow-md">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight text-white">
                      7. Zaawansowane Zarządzanie Danymi (Master Backup / Rollback)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wide">
                      Kopia & Konserwacja
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/70 mt-0.5">
                    {currentUser?.email || 'atomekb73@gmail.com'} • Globalne operacje systemowe, kopie zapasowe i przywracanie
                  </p>
                </div>
              </div>

              {/* Hidden file input for Master backup import */}
              <input
                ref={masterFileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportMasterFile}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Card 1: Master Export */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Layers size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Pobierz Master Backup
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-200/60 mt-1 leading-relaxed">
                    Pobiera pełny zrzut wszystkich kół naukowych, baz członków, uprawnień i ustawień w jednym pliku JSON.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportMaster}
                  className="w-full h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download size={13} />
                  <span>Pobierz Master Backup</span>
                </button>
              </div>

              {/* Card 2: Master Import */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Upload size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Wgraj Master Backup
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-200/60 mt-1 leading-relaxed">
                    Przywraca stan wszystkich kół naukowych z pliku Master Backup.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => masterFileInputRef.current?.click()}
                  className="w-full h-9 px-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Wgraj plik Master Backup</span>
                </button>
              </div>

              {/* Card 3: Rollback to Canonical Baseline */}
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertTriangle size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-200">
                      Rollback (Stan Stabilny)
                    </h4>
                  </div>
                  <p className="text-xs text-rose-200/60 mt-1 leading-relaxed">
                    Twardo odnawia kanoniczne schematy spotkań i opiekunów bez utraty powiązań dla bieżącego koła.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRollbackBaseline}
                  className="w-full h-9 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Rollback do Wersji Stabilnej</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CONFIRMATION MODAL ──────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden font-sans space-y-4 p-6">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {confirmModal.type === 'danger' ? <AlertOctagon size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessingBackup}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={isProcessingBackup}
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isProcessingBackup && <RefreshCw size={13} className="animate-spin" />}
                <span>Potwierdzam operację</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
