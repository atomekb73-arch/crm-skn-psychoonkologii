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
} from 'lucide-react';
import { useSettings, DEFAULT_POINT_WEIGHTS } from '../context/SettingsContext';
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
} from '../utils/storage';

const DEFAULT_ACCESS_USERS = [
  {
    id: 'usr_zarzad_01',
    name: 'Zarząd SKN Psychoonkologii',
    email: 'skn.psychoonkologia@wskz.pl',
    role: 'ADMIN',
    roleLabel: 'Dostęp zarządu',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
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

const DEFAULT_BOARD_TENURES = [
  {
    id: 'tenure_01',
    memberName: 'Monika Łyniewska',
    memberIndex: '34327',
    memberEmail: 'monikaa.lyniewska@gmail.com',
    roleName: 'Sekretarz Koła',
    startDate: '2025-10-01',
    endDate: '', // W trakcie
    isActive: true,
  },
  {
    id: 'tenure_02',
    memberName: 'Adrian Puczkowski',
    memberIndex: '10372',
    memberEmail: 'adrian.puczkowski@gmail.com',
    roleName: 'Moderator Social Media / Grup',
    startDate: '2025-10-01',
    endDate: '', // W trakcie
    isActive: true,
  },
];

export default function SettingsTab({ members = [], meetings = [] }) {
  const { currentOrg, currentOrgId } = useOrg();
  const { currentUser, isSuperAdmin } = useAuth();
  const orgId = currentOrg?.id || currentOrgId || 'skn-psychoonkologia';

  const {
    weights,
    updateWeight,
    resetWeights,
    supervisors,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    resetSupervisors,
  } = useSettings();

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

  // Refresh snapshots and email config when active organization switches
  useEffect(() => {
    if (orgId) {
      setSnapshots(getOrgSnapshots(orgId));
      setEmailConfig(getEmailConfig(orgId));
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
      onConfirm: () => {
        try {
          setIsProcessingBackup(true);
          const res = restoreOrgSnapshot(orgId, snapshot.key);
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
        affiliation: supAffiliation.trim() || 'Instytut Psychologii WSKZ',
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
        affiliation: supAffiliation.trim() || 'Instytut Psychologii WSKZ',
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
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
              <Sliders size={13} />
              <span>Centrum Konfiguracji & Uprawnień SKN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ⚙️ Ustawienia & Dostęp
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Zarządzaj kontami administracyjnymi, rejestrem Opiekunów Naukowych Koła, historią funkcji zarządu oraz konfiguracją wag punktowych.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAllWeights}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Save size={15} />
              <span>{saveFeedback ? '✓ Zapisano pomyślnie!' : 'Zapisz konfigurację'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SEKTOR 1: Zarządzanie Dostępem i Logowaniem ───────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">1. Zarządzanie Dostępem i Logowaniem (Access Control)</h2>
              <p className="text-xs text-slate-400">Nadawaj i odbieraj uprawnienia administracyjne dla członków zarządu i koordynatorów</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full self-start sm:self-auto">
            {visibleAccessUsers.length} uprawnionych użytkowników
          </span>
        </div>

        {/* Add User Form */}
        <form onSubmit={handleAddAccessUser} className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} className="text-indigo-600" />
            <span>Nadaj nowe uprawnienia dostępu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* User Search / Name */}
            <div className="md:col-span-4 relative">
              <label htmlFor="access-user-query" className="block text-[11px] font-semibold text-slate-600 mb-1">
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
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
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
              <label htmlFor="access-user-email" className="block text-[11px] font-semibold text-slate-600 mb-1">
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
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
            </div>

            {/* Role */}
            <div className="md:col-span-2">
              <label htmlFor="access-user-role" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Poziom uprawnień:
              </label>
              <select
                id="access-user-role"
                name="accessUserRole"
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-medium cursor-pointer"
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
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
                <th className="px-4 py-3">Użytkownik</th>
                <th className="px-4 py-3">Adres E-mail (Google Login)</th>
                <th className="px-4 py-3">Status dostępu</th>
                <th className="px-4 py-3">Data nadania</th>
                <th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleAccessUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Brak dodatkowych użytkowników z nadanymi uprawnieniami.
                  </td>
                </tr>
              ) : (
                visibleAccessUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        Aktywny dostęp
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{u.addedAt || '2026-09-05'}</td>
                    <td className="px-4 py-3 text-right">
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">2. Opiekunowie Naukowi Koła (Faculty Supervisors)</h2>
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
        <form onSubmit={handleSaveSupervisor} className="bg-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-indigo-200/70 space-y-4">
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
              <label htmlFor="sup-title" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tytuł naukowy:
              </label>
              <select
                id="sup-title"
                name="supTitle"
                value={supTitle}
                onChange={e => setSupTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-indigo-900"
              >
                <option value="mgr">mgr</option>
                <option value="dr">dr</option>
                <option value="dr hab.">dr hab.</option>
                <option value="prof.">prof.</option>
              </select>
            </div>

            {/* Name */}
            <div className="md:col-span-4">
              <label htmlFor="sup-name" className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-semibold text-slate-800"
              />
            </div>

            {/* Affiliation */}
            <div className="md:col-span-3">
              <label htmlFor="sup-affiliation" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Afiliacja / Jednostka:
              </label>
              <input
                id="sup-affiliation"
                name="supAffiliation"
                type="text"
                value={supAffiliation}
                onChange={e => setSupAffiliation(e.target.value)}
                placeholder="np. Instytut Psychologii / Katedra..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-3">
              <label htmlFor="sup-email" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Adres e-mail (Meet Matching):
              </label>
              <input
                id="sup-email"
                name="supEmail"
                type="email"
                value={supEmail}
                onChange={e => setSupEmail(e.target.value)}
                placeholder="np. anna.kowalska@uczelnia.pl"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* Start Date */}
            <div className="md:col-span-3">
              <label htmlFor="sup-start-date" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Początek sprawowania opieki:
              </label>
              <input
                id="sup-start-date"
                name="supStartDate"
                type="date"
                value={supStartDate}
                onChange={e => setSupStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>

            {/* End Date & Status */}
            <div className="md:col-span-5 space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="sup-end-date" className="block text-[11px] font-semibold text-slate-700">
                  Koniec opieki:
                </label>
                <label htmlFor="sup-is-active" className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold cursor-pointer">
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
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              ) : (
                <div className="py-1.5 px-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 text-center">
                  🟢 Aktualnie sprawuje opiekę
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="md:col-span-4 flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
                <th className="px-4 py-3">Tytuł & Imię i Nazwisko</th>
                <th className="px-4 py-3">Afiliacja / Jednostka</th>
                <th className="px-4 py-3">Adres E-mail</th>
                <th className="px-4 py-3">Okres opieki</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Brak przypisanych opiekunów naukowych. Użyj powyższego formularza, aby dodać nowego opiekuna koła.
                  </td>
                </tr>
              ) : (
                supervisors.map(sup => (
                <tr key={sup.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
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
                  <td className="px-4 py-3 text-slate-600 font-medium">{sup.affiliation || 'Instytut Psychologii WSKZ'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{sup.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">
                    {sup.startDate} {sup.isActive ? '— Aktualnie' : `— ${sup.endDate || '—'}`}
                  </td>
                  <td className="px-4 py-3 text-center">
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
                  <td className="px-4 py-3 text-right">
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Briefcase size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">3. Kadencje Zarządu i Historia Funkcji (Board Tenures)</h2>
              <p className="text-xs text-slate-400">Rejestr pełnionych ról w Kole Naukowym z automatycznym kalkulatorem punktów aktywności</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full self-start sm:self-auto">
            {boardTenures.filter(t => t.isActive).length} aktywnych w zarządzie
          </span>
        </div>

        {/* Add Tenure Form */}
        <form onSubmit={handleAddBoardTenure} className="bg-amber-50/30 p-4 sm:p-5 rounded-2xl border border-amber-200/60 space-y-4">
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} className="text-amber-600" />
            <span>Dodaj wpis o pełnionej funkcji w Kole</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Member select */}
            <div className="md:col-span-4 relative">
              <label htmlFor="tenure-member-query" className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium"
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
              <label htmlFor="tenure-role" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Pełniona funkcja:
              </label>
              <select
                id="tenure-role"
                name="tenureRole"
                value={tenureRole}
                onChange={e => setTenureRole(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium cursor-pointer"
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
              <label htmlFor="tenure-start-date" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Data rozpoczęcia:
              </label>
              <input
                id="tenure-start-date"
                name="tenureStartDate"
                type="date"
                required
                value={tenureStartDate}
                onChange={e => setTenureStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium"
              />
            </div>

            {/* End Date / Is Active */}
            <div className="md:col-span-3 space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="tenure-end-date" className="block text-[11px] font-semibold text-slate-700">
                  Data zakończenia:
                </label>
                <label htmlFor="tenure-is-active" className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold cursor-pointer">
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
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none font-medium"
                />
              ) : (
                <div className="py-1.5 px-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 text-center">
                  🟢 Aktualnie w trakcie
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
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
                <th className="px-4 py-3">Osoba (Członek Koła)</th>
                <th className="px-4 py-3">Pełniona funkcja</th>
                <th className="px-4 py-3">Data rozpoczęcia</th>
                <th className="px-4 py-3">Data zakończenia</th>
                <th className="px-4 py-3 text-center">Naliczone punkty</th>
                <th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boardTenures.map(t => {
                const points = calculateTenurePoints(t.startDate, t.endDate, t.isActive, t.roleName);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{t.memberName}</div>
                      {t.memberIndex && <div className="text-[11px] text-slate-400 font-mono">Indeks: {t.memberIndex}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {t.roleName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{t.startDate}</td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          W trakcie
                        </span>
                      ) : (
                        <span className="font-mono text-slate-600">{t.endDate || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono shadow-2xs">
                        +{points} pkt
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SEKTOR 4: Konfiguracja Wag Punktowych ─────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">4. Konfiguracja Wag Punktowych (Activity Weights)</h2>
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Save size={13} />
              <span>{saveFeedback ? 'Zapisano!' : 'Zapisz wagi'}</span>
            </button>
          </div>
        </div>

        {/* Weights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(localWeights).map(key => {
            const item = localWeights[key];
            return (
              <div
                key={key}
                className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 hover:border-indigo-200 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                    {item.icon || '📌'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={item.label}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{item.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  <input
                    id={`weight-input-${key}`}
                    name={`weight_${key}`}
                    type="number"
                    min="0"
                    max="100"
                    value={item.points}
                    onChange={e => handleWeightChange(key, e.target.value)}
                    className="w-10 text-center font-bold text-xs text-indigo-700 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-semibold">pkt</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEKTOR 5: Bezpieczeństwo & Kopia Zapasowa Danych (Backup & Recovery) ── */}
      <div className="space-y-6">
        {/* Global Feedback Banner */}
        {backupFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm animate-in fade-in duration-150 ${
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

        {/* ── KARTA KOŁA (Dostępna dla każdego zalogowanego Zarządu) ────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Database size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">5. Kopia Zapasowa & Migawki Koła</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {currentOrg?.shortName || currentOrg?.name}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Hermetyczny eksport, import oraz punkty przywracania stanu (Snapshots) dla aktywnego koła naukowego.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Hidden file input for org backup import */}
              <input
                ref={orgFileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportOrgFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleExportOrg}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Download size={14} />
                <span>Pobierz kopię JSON</span>
              </button>

              <button
                type="button"
                onClick={() => orgFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Upload size={14} />
                <span>Przywróć z pliku</span>
              </button>

              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Utwórz lokalny punkt przywracania stanu"
              >
                <Camera size={14} className="hidden" />
                <History size={14} />
                <span>Utwórz migawkę</span>
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
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Brak zapisanych migawek dla tego koła. Kliknij „Utwórz migawkę” lub wykonaj synchronizację z arkuszem.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/40">
                {snapshots.map((snap, idx) => (
                  <div
                    key={snap.key}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shadow-2xs">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer disabled:opacity-50"
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
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ZAAWANSOWANE ZARZĄDZANIE DANYMI (Kopia i Konserwacja) ──────────────────── */}
        {(isSuperAdmin || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'atomekb73@gmail.com') && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 border border-indigo-500/30 text-white shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-800/40">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold shadow-md">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">
                      ZAAWANSOWANE ZARZĄDZANIE DANYMI
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wide">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Master Export */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Layers size={18} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Pobierz Master Backup
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-200/60 mt-1.5 leading-relaxed">
                    Pobiera pełny zrzut wszystkich kół naukowych, baz członków, uprawnień i ustawień w jednym pliku JSON.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportMaster}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>Pobierz Master Backup</span>
                </button>
              </div>

              {/* Card 2: Master Import */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Upload size={18} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Wgraj Master Backup
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-200/60 mt-1.5 leading-relaxed">
                    Przywraca stan wszystkich kół naukowych z pliku Master Backup.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => masterFileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Wgraj plik Master Backup</span>
                </button>
              </div>

              {/* Card 3: Rollback to Canonical Baseline */}
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertTriangle size={18} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-200">
                      Rollback (Stan Stabilny)
                    </h4>
                  </div>
                  <p className="text-xs text-rose-200/60 mt-1.5 leading-relaxed">
                    Twardo odnawia kanoniczne schematy spotkań i opiekunów bez utraty powiązań dla bieżącego koła.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRollbackBaseline}
                  className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Rollback do Wersji Stabilnej</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SEKTOR 6: EMAIL & SMTP / NOTIFICATIONS CONFIGURATION ─────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-sm shadow-indigo-200 shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
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
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Przywróć domyślne parametry i oficjalne szablony"
            >
              <RotateCcw size={13} />
              <span>Domyślne szablony</span>
            </button>

            <button
              type="button"
              onClick={handleSaveEmailConfig}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save size={14} />
              <span>Zapisz ustawienia poczty</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {emailSaveFeedback && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
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
        <form onSubmit={handleSaveEmailConfig} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Sender and SMTP Credentials */}
            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <AtSign size={15} className="text-indigo-600" />
                  <span>Dedykowany Adres Nadawczy Koła</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Adres E-mail Koła (Nadawca):
                    </label>
                    <input
                      type="email"
                      required
                      value={emailConfig.senderEmail || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                      placeholder="skn.psychoonkologia@wskz.pl"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nazwa Wyświetlana Nadawcy:
                    </label>
                    <input
                      type="text"
                      required
                      value={emailConfig.senderName || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                      placeholder="Zarząd SKN Psychoonkologii WSKZ"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Adres do Odpowiedzi (Reply-To):
                    </label>
                    <input
                      type="email"
                      value={emailConfig.replyTo || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, replyTo: e.target.value })}
                      placeholder="skn.psychoonkologia@wskz.pl"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SMTP Server & App Password (Optional) */}
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Key size={15} className="text-indigo-600" />
                    <span>Parametry SMTP / Hasło Aplikacji</span>
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                    Opcjonalne
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Serwer SMTP (Host):
                    </label>
                    <input
                      type="text"
                      value={emailConfig.smtpHost || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Port:
                    </label>
                    <input
                      type="text"
                      value={emailConfig.smtpPort || '587'}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
                      placeholder="587"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Hasło Aplikacji Google / Hasło SMTP:
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={emailConfig.smtpPassword || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })}
                      placeholder="np. 16-znakowe hasło aplikacji Gmail"
                      className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title={showSmtpPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    >
                      {showSmtpPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
                    Hasło aplikacji Gmail (16 znaków bez spacji) generowane w koncie Google Koła w zakładce Bezpieczeństwo → Weryfikacja dwuetapowa.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Oficjalna Stopka / Podpis Koła:
                  </label>
                  <textarea
                    rows={4}
                    value={emailConfig.footerSignature || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, footerSignature: e.target.value })}
                    placeholder="Z poważaniem,&#10;Zarząd SKN..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Welcome Email Subject & Body Template */}
            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Sparkles size={15} className="text-indigo-600" />
                      <span>Szablon Powitania (Kwarantanna)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {emailConfig.senderEmail}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Domyślny Temat Wiadomości Powitalnej:
                    </label>
                    <input
                      type="text"
                      required
                      value={emailConfig.welcomeSubjectTemplate || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, welcomeSubjectTemplate: e.target.value })}
                      placeholder="Potwierdzenie przyjęcia zgłoszenia..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Treść Szablonu Powitania:
                      </label>
                    </div>
                    <textarea
                      rows={12}
                      value={emailConfig.welcomeBodyTemplate || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, welcomeBodyTemplate: e.target.value })}
                      placeholder="Dzień dobry {IMIE}..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5">
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

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
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
