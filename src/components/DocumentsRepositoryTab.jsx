import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  FileText,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  Edit3,
  Trash2,
  X,
  FileCheck,
  HardDrive,
  Calendar,
  ShieldCheck,
  Download,
  FolderOpen,
  Link,
  Sparkles,
  Mail,
  Send,
  Inbox,
  AlertTriangle,
  Printer,
  Copy,
  Check,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import {
  getCorrespondenceLog,
  addCorrespondenceEntry,
  updateCorrespondenceEntry,
  deleteCorrespondenceEntry,
  setOrgStorage,
} from '../utils/storage';
import {
  parseRawEmailText,
  checkDuplicateCorrespondence,
} from '../utils/helpers';
import {
  fetchMailRegistryFromSheet,
  formatCorrespondenceForSheet,
  MAIL_REGISTRY_TAB,
} from '../services/googleSheets';
import { OfficialCorrespondenceProtocolTemplate } from './DocumentTemplates';
import { getStoredSupervisors } from '../utils/specialRoles';
import { useSettings } from '../context/SettingsContext';
import WelcomeMailModal from './WelcomeMailModal';

const DEFAULT_DOCUMENTS_SKNU = [
  {
    id: 'doc_sknu_01',
    code: 'UCHWAŁA/SKNU/01/2026',
    title: 'Uchwała Założycielska w sprawie powołania SKN Psychologii Zachowań Ryzykownych i Uzależnień WSKZ',
    category: 'Uchwały Zarządu',
    date: '2026-05-27',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y/edit',
    status: 'Obowiązujący',
    description: 'Uchwała powołująca SKNU oraz zatwierdzająca skład pierwszego Zarządu Koła (Magda Czepirska, Igor Leśniewski, Magdalena Mosznińska, Edyta Preobrażeńska, Ewelina Kozłowska, Dorota Dyjakon).',
  },
  {
    id: 'doc_sknu_02',
    code: 'PROTOKÓŁ/SKNU/01/2026',
    title: 'Protokół ze Spotkania Założycielskiego oraz zatwierdzenie programu profilaktycznego Unplugged',
    category: 'Protokoły Zebrań',
    date: '2026-05-27',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y/edit',
    status: 'Obowiązujący',
    description: 'Protokół obrad 6 członków założycieli oraz zatwierdzenie ram programowych warsztatów szkoleniowych Unplugged z opiekunem mgr. Sławomirem Pietrzakiem.',
  },
  {
    id: 'doc_sknu_03',
    code: 'STATUT/SKNU/2026',
    title: 'Statut i Regulamin Organizacyjny SKN Psychologii Zachowań Ryzykownych i Uzależnień WSKZ',
    category: 'Regulaminy i Statut',
    date: '2026-05-27',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y/edit',
    status: 'Obowiązujący',
    description: 'Oficjalny statut uchwalony przez członków założycieli i przedstawiony Władzom Instytutu Psychologii WSKZ.',
  },
  {
    id: 'doc_sknu_04',
    code: 'WNIOSEK/SKNU/02/2026',
    title: 'Wniosek o dofinansowanie certyfikowanych materiałów warsztatów profilaktyki uzależnień',
    category: 'Wnioski i Granty',
    date: '2026-06-15',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y/edit',
    status: 'Obowiązujący',
    description: 'Wniosek złożony do Dyrekcji Instytutu Psychologii WSKZ o zakup pakietu podręczników trenerskich Programu Unplugged.',
  },
];

const DEFAULT_DOCUMENTS_SEKSUOLOGIA = [
  {
    id: 'doc_seks_01',
    code: 'STATUT/SEKS/2025',
    title: 'Statut i Regulamin Studenckiego Koła Naukowego Seksuologii WSKZ',
    category: 'Regulaminy i Statut',
    date: '2025-10-01',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1EnAbs-UGlGeiWbM91gbXJGPTNWJarbkttY8KeM6HkhI/edit',
    status: 'Obowiązujący',
    description: 'Statut koła regulujący prawa członków, ewidencję punktów aktywności oraz zasady certyfikacji końcowej.',
  },
  {
    id: 'doc_seks_02',
    code: 'UCHWAŁA/SEKS/01/2025',
    title: 'Uchwała Zarządu w sprawie utworzenia Journal Club oraz harmonogramu 14 spotkań naukowych',
    category: 'Uchwały Zarządu',
    date: '2025-10-15',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1EnAbs-UGlGeiWbM91gbXJGPTNWJarbkttY8KeM6HkhI/edit',
    status: 'Obowiązujący',
    description: 'Uchwała powołująca cykliczne spotkania seminaryjne Journal Club oraz ustalająca progi zaliczeniowe w roku 2025/2026.',
  },
  {
    id: 'doc_seks_03',
    code: 'PROTOKÓŁ/SEKS/05/2026',
    title: 'Protokół z zebrania naukowego M05: Trauma wczesnodziecięca w ujęciu psychoseksuologicznym',
    category: 'Protokoły Zebrań',
    date: '2026-02-16',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1EnAbs-UGlGeiWbM91gbXJGPTNWJarbkttY8KeM6HkhI/edit',
    status: 'Obowiązujący',
    description: 'Protokół z 70 uczestnikami zebrania merytorycznego z wygłoszeniem referatów przez Nomin Galindev i Tomasza Bratkowskiego.',
  },
  {
    id: 'doc_seks_04',
    code: 'GRANT/SEKS/01/2026',
    title: 'Wniosek o wsparcie projektu badawczego: Postawy społeczne wobec edukacji seksualnej',
    category: 'Wnioski i Granty',
    date: '2026-01-20',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1EnAbs-UGlGeiWbM91gbXJGPTNWJarbkttY8KeM6HkhI/edit',
    status: 'Obowiązujący',
    description: 'Wniosek grantowy na przeprowadzenie ogólnopolskiego badania ankietowego na próbie 140 respondentów.',
  },
];

const CATEGORIES = [
  'Wszystkie',
  'Uchwały Zarządu',
  'Protokoły Zebrań',
  'Regulaminy i Statut',
  'Wnioski i Granty',
];

export default function DocumentsRepositoryTab() {
  const { currentOrg, getStorageKey } = useOrg();

  // Storage Keys for Documents & Google Drive URL
  const docsStorageKey = getStorageKey('documents');
  const gdriveStorageKey = getStorageKey('gdrive_url');

  // Documents state
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem(docsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Błąd odczytu dokumentów z storage:', e);
    }
    if (currentOrg.id === 'skn-psychoonkologia' || currentOrg.id === 'skn_psychoonkologia') {
      return [];
    }
    return currentOrg.id === 'sknu' ? DEFAULT_DOCUMENTS_SKNU : DEFAULT_DOCUMENTS_SEKSUOLOGIA;
  });

  // Google Drive URL state
  const [gdriveUrl, setGdriveUrl] = useState(() => {
    try {
      const saved = localStorage.getItem(gdriveStorageKey);
      if (saved) return saved;
    } catch {}
    if (currentOrg.sheetId) {
      return `https://drive.google.com/drive/folders/${currentOrg.sheetId}`;
    }
    if (currentOrg.id === 'sknu') {
      return 'https://drive.google.com/drive/folders/1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y';
    }
    return '';
  });

  // Statut config state
  const statutConfigStorageKey = getStorageKey('statute_config');
  const [statutConfig, setStatutConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(statutConfigStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      url: currentOrg.sheetId
        ? `https://docs.google.com/spreadsheets/d/${currentOrg.sheetId}/edit`
        : '',
      status: currentOrg.id === 'skn-psychoonkologia' ? 'W przygotowaniu' : 'Zatwierdzony przez Władze WSKZ',
      description: `Oficjalny regulamin określający strukturę, cele naukowe oraz prawa członków ${currentOrg.shortName || currentOrg.name}.`,
    };
  });

  // Re-sync documents when organization switches
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem(docsStorageKey);
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      } else {
        const defaults = (currentOrg.id === 'skn-psychoonkologia' || currentOrg.id === 'skn_psychoonkologia')
          ? []
          : (currentOrg.id === 'sknu' ? DEFAULT_DOCUMENTS_SKNU : DEFAULT_DOCUMENTS_SEKSUOLOGIA);
        setDocuments(defaults);
        localStorage.setItem(docsStorageKey, JSON.stringify(defaults));
      }

      const savedDrive = localStorage.getItem(gdriveStorageKey);
      if (savedDrive) {
        setGdriveUrl(savedDrive);
      } else {
        const defaultDrive = currentOrg.sheetId
          ? `https://drive.google.com/drive/folders/${currentOrg.sheetId}`
          : (currentOrg.id === 'sknu' ? 'https://drive.google.com/drive/folders/1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y' : '');
        setGdriveUrl(defaultDrive);
      }

      const savedStatut = localStorage.getItem(statutConfigStorageKey);
      if (savedStatut) {
        setStatutConfig(JSON.parse(savedStatut));
      } else {
        const defaultStatutConfig = {
          url: currentOrg.sheetId
            ? `https://docs.google.com/spreadsheets/d/${currentOrg.sheetId}/edit`
            : '',
          status: currentOrg.id === 'skn-psychoonkologia' ? 'W przygotowaniu' : 'Zatwierdzony przez Władze WSKZ',
          description: `Oficjalny regulamin określający strukturę, cele naukowe oraz prawa członków ${currentOrg.shortName || currentOrg.name}.`,
        };
        setStatutConfig(defaultStatutConfig);
      }
    } catch (err) {
      console.error('Błąd przy przełączaniu koła w repozytorium:', err);
    }
  }, [currentOrg.id, currentOrg.sheetId, docsStorageKey, gdriveStorageKey, statutConfigStorageKey]);

  // Save documents state to localStorage
  const saveDocuments = (newDocs) => {
    setDocuments(newDocs);
    try {
      localStorage.setItem(docsStorageKey, JSON.stringify(newDocs));
    } catch (e) {
      console.error('Błąd zapisu dokumentów:', e);
    }
  };

  // ── Supervisors Context ───────────────────────────────────────────────────
  const { supervisors: contextSupervisors } = useSettings() || {};
  const supervisors = contextSupervisors && contextSupervisors.length > 0
    ? contextSupervisors
    : getStoredSupervisors();

  // ── Module View Switch (Repozytorium vs Dziennik Podawczy) ────────────────
  const [activeModuleTab, setActiveModuleTab] = useState('repository'); // 'repository' | 'correspondence'

  // ── Correspondence Log State ──────────────────────────────────────────────
  const [correspondenceLog, setCorrespondenceLog] = useState(() => getCorrespondenceLog(currentOrg?.id || 'skn-psychoonkologia'));
  const [correspondenceFilter, setCorrespondenceFilter] = useState('all'); // 'all' | 'IN' | 'OUT'
  const [correspondenceSearch, setCorrespondenceSearch] = useState('');
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isWelcomeMailModalOpen, setIsWelcomeMailModalOpen] = useState(false);
  const [mailModalTab, setMailModalTab] = useState('parser'); // 'parser' | 'form'
  const [rawMailText, setRawMailText] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [viewingMailEntry, setViewingMailEntry] = useState(null);
  const [isPrintingCorrespondence, setIsPrintingCorrespondence] = useState(false);

  const [mailForm, setMailForm] = useState({
    id: '',
    direction: 'IN',
    date: new Date().toISOString().slice(0, 10),
    sender: '',
    recipient: '',
    subject: '',
    summary: '',
    status: 'Zarejestrowane / Zrealizowane',
    hash: '',
  });

  useEffect(() => {
    if (currentOrg?.id) {
      setCorrespondenceLog(getCorrespondenceLog(currentOrg.id));
    }
  }, [currentOrg?.id]);

  const filteredCorrespondence = useMemo(() => {
    return correspondenceLog.filter((item) => {
      if (!item) return false;
      const matchesDirection = correspondenceFilter === 'all' || item.direction === correspondenceFilter;
      if (!matchesDirection) return false;

      if (!correspondenceSearch.trim()) return true;
      const q = correspondenceSearch.toLowerCase().trim();
      return (
        String(item.id || '').toLowerCase().includes(q) ||
        String(item.sender || '').toLowerCase().includes(q) ||
        String(item.recipient || '').toLowerCase().includes(q) ||
        String(item.subject || '').toLowerCase().includes(q) ||
        String(item.summary || '').toLowerCase().includes(q)
      );
    });
  }, [correspondenceLog, correspondenceFilter, correspondenceSearch]);

  const [isSyncingMailSheet, setIsSyncingMailSheet] = useState(false);
  const [mailSyncStatus, setMailSyncStatus] = useState(null);
  const [copiedSheetData, setCopiedSheetData] = useState(false);

  // ── Sync with Google Sheets dedicated tab "Ewidencja_Poczty" ─────────────
  const handleSyncMailSheet = async () => {
    setIsSyncingMailSheet(true);
    setMailSyncStatus(null);
    try {
      const res = await fetchMailRegistryFromSheet(currentOrg.sheetId);
      if (res.ok) {
        if (res.entries && res.entries.length > 0) {
          const current = getCorrespondenceLog(currentOrg.id);
          const merged = [...current];
          let addedCount = 0;
          res.entries.forEach((entry) => {
            const idx = merged.findIndex((e) => e.id === entry.id || (e.hash && e.hash === entry.hash));
            if (idx === -1) {
              merged.push(entry);
              addedCount++;
            } else {
              merged[idx] = { ...merged[idx], ...entry };
            }
          });
          setCorrespondenceLog(merged);
          setOrgStorage(currentOrg.id, 'correspondence_log', merged);
          setMailSyncStatus({
            success: true,
            message: `Pomyślnie zsynchronizowano z zakładką „${MAIL_REGISTRY_TAB}”. Pobrano ${res.entries.length} wpisów (${addedCount} nowych).`,
          });
        } else {
          setMailSyncStatus({
            success: true,
            message: `Zakładka „${MAIL_REGISTRY_TAB}” jest aktywna (0 wpisów zewnętrznych). Wszystkie lokalne dane są zabezpieczone.`,
          });
        }
      } else {
        setMailSyncStatus({
          success: false,
          message: res.error || `Nie udało się odczytać zakładki „${MAIL_REGISTRY_TAB}”.`,
        });
      }
    } catch (err) {
      setMailSyncStatus({
        success: false,
        message: `Błąd połączenia z arkuszem: ${err.message}`,
      });
    } finally {
      setIsSyncingMailSheet(false);
      setTimeout(() => setMailSyncStatus(null), 6000);
    }
  };

  const handleCopySheetFormat = () => {
    try {
      const { tsv } = formatCorrespondenceForSheet(correspondenceLog);
      navigator.clipboard.writeText(tsv);
      setCopiedSheetData(true);
      setTimeout(() => setCopiedSheetData(false), 2500);
    } catch (e) {
      console.warn('Clipboard error:', e);
    }
  };

  const handleOpenMailModal = (entryToEdit = null) => {
    const orgTag = currentOrg?.id === 'sknu' ? 'SKNU' : (currentOrg?.id?.includes('psycho') ? 'PSY' : (currentOrg?.tag || 'PSY'));
    const year = '2026';
    if (entryToEdit) {
      setMailForm({ ...entryToEdit });
      setMailModalTab('form');
      setDuplicateWarning(null);
    } else {
      const nextNum = String(correspondenceLog.length + 1).padStart(2, '0');
      const senderDefault = 'Dziekanat WNS WSKZ <dziekanat@wskz.pl>';
      const recipientDefault = `Zarząd ${currentOrg?.shortName || 'SKN Psychoonkologii'} <skn.psychoonkologia@student.wskz.pl>`;
      setMailForm({
        id: `KANC/${orgTag}/IN/${nextNum}/${year}`,
        direction: 'IN',
        date: new Date().toISOString().slice(0, 10),
        sender: senderDefault,
        recipient: recipientDefault,
        subject: '',
        summary: '',
        status: 'Zarejestrowane / Zrealizowane',
        hash: '',
      });
      setRawMailText('');
      setMailModalTab('parser');
      setDuplicateWarning(null);
    }
    setIsMailModalOpen(true);
  };

  const handleParseMail = () => {
    if (!rawMailText.trim()) return;
    const orgTag = currentOrg?.id === 'sknu' ? 'SKNU' : (currentOrg?.id?.includes('psycho') ? 'PSY' : (currentOrg?.tag || 'PSY'));
    const parsed = parseRawEmailText(rawMailText, orgTag);
    const year = parsed.date ? parsed.date.slice(0, 4) : '2026';
    const nextNum = String(correspondenceLog.length + 1).padStart(2, '0');
    const suggestedId = `KANC/${orgTag}/${parsed.direction}/${nextNum}/${year}`;

    const dupCheck = checkDuplicateCorrespondence(parsed, correspondenceLog);
    if (dupCheck.isDuplicate) {
      setDuplicateWarning(dupCheck.matchedEntry);
    } else {
      setDuplicateWarning(null);
    }

    setMailForm({
      id: suggestedId,
      direction: parsed.direction,
      date: parsed.date,
      sender: parsed.sender,
      recipient: parsed.recipient,
      subject: parsed.subject,
      summary: parsed.summary,
      status: 'Zarejestrowane / Zrealizowane',
      hash: `${parsed.subject.slice(0, 20)}_${parsed.date}`,
    });

    setMailModalTab('form');
  };

  const handleSaveMailEntry = (e) => {
    e.preventDefault();
    if (!mailForm.id.trim() || !mailForm.subject.trim()) return;

    const updated = addCorrespondenceEntry(currentOrg.id, mailForm);
    if (updated) setCorrespondenceLog(updated);
    setIsMailModalOpen(false);
    setDuplicateWarning(null);
  };

  const handleDeleteMailEntry = (entryId) => {
    if (window.confirm('Czy na pewno chcesz usunąć to pismo z dziennika podawczego?')) {
      const updated = deleteCorrespondenceEntry(currentOrg.id, entryId);
      if (updated) setCorrespondenceLog(updated);
    }
  };

  const handlePrintCorrespondence = () => {
    setIsPrintingCorrespondence(true);
    setTimeout(() => {
      window.print();
      setIsPrintingCorrespondence(false);
    }, 200);
  };

  // UI States
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingDriveModal, setIsEditingDriveModal] = useState(false);
  const [tempDriveUrl, setTempDriveUrl] = useState('');
  const [isEditingStatutModal, setIsEditingStatutModal] = useState(false);
  const [tempStatutConfig, setTempStatutConfig] = useState({
    url: '',
    status: 'Zatwierdzony przez Władze WSKZ',
    description: '',
  });
  const [editingDoc, setEditingDoc] = useState(null);

  // Form State for Modal
  const [formState, setFormState] = useState({
    code: '',
    title: '',
    category: 'Uchwały Zarządu',
    date: new Date().toISOString().split('T')[0],
    driveUrl: '',
    status: 'Obowiązujący',
    description: '',
  });

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = selectedCategory === 'Wszystkie' || doc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (doc.code || '').toLowerCase().includes(q) ||
        (doc.title || '').toLowerCase().includes(q) ||
        (doc.description || '').toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Open modal for new document
  const handleOpenAddModal = () => {
    setEditingDoc(null);
    const orgTag = currentOrg.shortName ? currentOrg.shortName.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'ORG';
    setFormState({
      code: `UCHWAŁA/${orgTag}/${String(documents.length + 1).padStart(2, '0')}/2026`,
      title: '',
      category: 'Uchwały Zarządu',
      date: new Date().toISOString().split('T')[0],
      driveUrl: gdriveUrl || '',
      status: 'Obowiązujący',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for editing document
  const handleOpenEditModal = (doc) => {
    setEditingDoc(doc);
    setFormState({
      code: doc.code || '',
      title: doc.title || '',
      category: doc.category || 'Uchwały Zarządu',
      date: doc.date || '',
      driveUrl: doc.driveUrl || '',
      status: doc.status || 'Obowiązujący',
      description: doc.description || '',
    });
    setIsModalOpen(true);
  };

  // Save document from modal
  const handleSaveDocument = (e) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      alert('Wpisz tytuł dokumentu!');
      return;
    }

    if (editingDoc) {
      const updated = documents.map((d) => (d.id === editingDoc.id ? { ...d, ...formState } : d));
      saveDocuments(updated);
    } else {
      const newDoc = {
        id: `doc_${Date.now()}`,
        ...formState,
      };
      saveDocuments([newDoc, ...documents]);
    }
    setIsModalOpen(false);
  };

  // Delete document
  const handleDeleteDocument = (id) => {
    if (confirm('Czy na pewno chcesz usunąć ten dokument z rejestru?')) {
      const updated = documents.filter((d) => d.id !== id);
      saveDocuments(updated);
    }
  };

  // Save updated Google Drive URL
  const handleSaveDriveUrl = (e) => {
    e.preventDefault();
    if (!tempDriveUrl.trim()) return;
    setGdriveUrl(tempDriveUrl.trim());
    try {
      localStorage.setItem(gdriveStorageKey, tempDriveUrl.trim());
    } catch {}
    setIsEditingDriveModal(false);
  };

  // Save updated Statut Config
  const handleSaveStatutConfig = (e) => {
    e.preventDefault();
    const newConfig = { ...tempStatutConfig };
    setStatutConfig(newConfig);
    try {
      localStorage.setItem(statutConfigStorageKey, JSON.stringify(newConfig));
    } catch {}
    setIsEditingStatutModal(false);
  };

  // Badge Color Helper
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Uchwały Zarządu':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Protokoły Zebrań':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Regulaminy i Statut':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Wnioski i Granty':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Obowiązujący':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'W toku':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Zastąpiony':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in duration-200">
      
      {/* ── HEADER BAR ────────────────────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl text-white shadow-md shadow-indigo-200">
            {activeModuleTab === 'repository' ? <FolderKanban size={26} /> : <Mail size={26} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {activeModuleTab === 'repository'
                  ? 'Repozytorium Dokumentów & Rejestr Uchwał'
                  : 'Elektroniczny Dziennik Podawczy & Kancelaria'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentOrg.shortName || currentOrg.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeModuleTab === 'repository'
                ? 'Oficjalna ewidencja aktów prawnych, statutów, uchwał i protokołów naukowych WSKZ.'
                : 'Ewidencja pism przychodzących i wychodzących z inteligentnym parserem e-maili i detekcją spraw.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeModuleTab === 'repository' ? (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Dodaj Dokument / Uchwałę</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleOpenMailModal()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Mail size={16} />
                <span>📨 Zarejestruj Pismo / Wklej E-mail</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCorrespondence}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Drukuj oficjalny Dziennik Podawczy do PDF dla Dziekanatu i PKA"
              >
                <Printer size={15} />
                <span>🖨️ Drukuj Dziennik (PDF)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── MODULE SWITCHER TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveModuleTab('repository')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeModuleTab === 'repository'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FolderKanban size={15} />
          <span>📁 Repozytorium Aktów & Statut</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeModuleTab === 'repository' ? 'bg-slate-800 text-indigo-200' : 'bg-slate-100 text-slate-700'
          }`}>
            {documents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModuleTab('correspondence')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeModuleTab === 'correspondence'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Mail size={15} />
          <span>📨 Dziennik Podawczy & Kancelaria</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeModuleTab === 'correspondence' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700'
          }`}>
            {correspondenceLog.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: REPOZYTORIUM AKTÓW & STATUT ─────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeModuleTab === 'repository' && (
        <>
          {/* ── QUICK CARDS AT TOP ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Statut Koła */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Aktualny Statut Koła
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} /> {statutConfig.status || 'Zatwierdzony przez Władze WSKZ'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTempStatutConfig({
                      url: statutConfig.url || '',
                      status: statutConfig.status || 'Zatwierdzony przez Władze WSKZ',
                      description: statutConfig.description || '',
                    });
                    setIsEditingStatutModal(true);
                  }}
                  className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Edytuj link i status Statutu Koła"
                >
                  <Edit3 className="w-4 h-4 text-slate-400 hover:text-emerald-600 transition-colors" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {statutConfig.description || `Oficjalny regulamin określający strukturę, cele naukowe oraz prawa członków ${currentOrg.shortName}.`}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (statutConfig.url && statutConfig.url.trim()) {
                      window.open(statutConfig.url.trim(), '_blank');
                    } else {
                      setTempStatutConfig({
                        url: statutConfig.url || '',
                        status: statutConfig.status || 'Zatwierdzony przez Władze WSKZ',
                        description: statutConfig.description || '',
                      });
                      setIsEditingStatutModal(true);
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Otwórz Statut (Drive)</span>
                </button>
              </div>
            </div>

            {/* Card 2: Dysk Google Koła */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <HardDrive size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Oficjalny Dysk Google
                    </h3>
                    <span className="text-[11px] text-slate-500">Kopia chmurowa plików</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTempDriveUrl(gdriveUrl);
                    setIsEditingDriveModal(true);
                  }}
                  className="text-slate-400 hover:text-blue-600 text-xs font-medium"
                  title="Edytuj link Dysku Google"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed truncate">
                {gdriveUrl}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={gdriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <FolderOpen size={14} />
                  <span>Przejdź do Dysku Google</span>
                </a>
              </div>
            </div>

            {/* Card 3: Licznik Rejestru */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Rejestr Aktów i Uchwał
                    </h3>
                    <span className="text-[11px] text-slate-500">Stan ewidencyjny</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                  {documents.length} aktów
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Obowiązujące</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono">
                    {documents.filter((d) => d.status === 'Obowiązujący').length}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Uchwały Zarządu</span>
                  <span className="text-sm font-extrabold text-purple-700 font-mono">
                    {documents.filter((d) => d.category === 'Uchwały Zarządu').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SEARCH & CATEGORY FILTER TABS ── */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj po sygnaturze lub tytule..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* ── DOCUMENTS TABLE ── */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-44">Sygnatura / Nr Aktu</th>
                      <th className="py-3 px-4">Tytuł / Przedmiot Dokumentu</th>
                      <th className="py-3 px-4 w-36">Kategoria</th>
                      <th className="py-3 px-4 w-28 text-center">Data</th>
                      <th className="py-3 px-4 w-28 text-center">Plik Źródłowy</th>
                      <th className="py-3 px-4 w-32 text-center">Status</th>
                      <th className="py-3 px-4 w-20 text-center">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Brak dokumentów w wybranej kategorii.
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{doc.code}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{doc.title}</div>
                            {doc.description && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-sans">
                                {doc.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(
                                doc.category
                              )}`}
                            >
                              {doc.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 font-semibold">{doc.date}</td>
                          <td className="py-3 px-4 text-center">
                            {doc.driveUrl ? (
                              <a
                                href={doc.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition-colors"
                              >
                                <ExternalLink size={12} />
                                <span>Drive</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${getStatusBadgeClass(
                                doc.status
                              )}`}
                            >
                              {doc.status === 'Obowiązujący' && <CheckCircle2 size={11} />}
                              {doc.status === 'W toku' && <Clock size={11} />}
                              {doc.status === 'Zastąpiony' && <Archive size={11} />}
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(doc)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                title="Edytuj dokument"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                                title="Usuń dokument"
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
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: DZIENNIK PODAWCZY & KANCELARIA ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeModuleTab === 'correspondence' && (
        <>
          {/* Quick Stats Cards for Correspondence */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Wszystkie pisma */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Dziennik Podawczy
                    </h3>
                    <span className="text-[11px] text-slate-500">Wszystkie zarejestrowane sprawy</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {correspondenceLog.length} pism
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Centralny rejestr pism wpływających z Dziekanatu i pism wychodzących Zarządu Koła.
              </p>
            </div>

            {/* Card 2: Przychodzące (IN) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Inbox size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Przychodzące (IN)
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold">Decyzje i pisma Dziekanatu</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {correspondenceLog.filter(c => c.direction === 'IN').length} pism
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Korespondencja od Władz WSKZ, Dziekanatu WNS, Opiekuna i jednostek uczelnianych.
              </p>
            </div>

            {/* Card 3: Wychodzące (OUT) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Wychodzące (OUT)
                    </h3>
                    <span className="text-[11px] text-sky-700 font-semibold">Wnioski i sprawozdania</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  {correspondenceLog.filter(c => c.direction === 'OUT').length} pism
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Oficjalne wnioski grantowe, harmonogramy i sprawozdania roczne kierowane do Władz WSKZ.
              </p>
            </div>
          </div>

          {/* ── Google Sheets Ewidencja_Poczty Integration Banner & Actions ── */}
          <div className="bg-gradient-to-r from-emerald-900/90 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-emerald-500/30 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Dedykowana Karta Arkusza:
                  </h4>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    Ewidencja_Poczty
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {currentOrg?.name || 'SKN Psychoonkologii'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Wszystkie operacje odczytu i synchronizacji korespondencji powiązane są wyłącznie z tą zakładką.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSyncMailSheet}
                disabled={isSyncingMailSheet}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Pobierz i zsynchronizuj wpisy z zakładki Ewidencja_Poczty w arkuszu Google"
              >
                <RefreshCw size={13} className={isSyncingMailSheet ? 'animate-spin' : ''} />
                <span>{isSyncingMailSheet ? 'Synchronizacja...' : 'Pobierz z Arkusza'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySheetFormat}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                title="Skopiuj sformatowane wiersze do wklejenia w zakładce Ewidencja_Poczty"
              >
                {copiedSheetData ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedSheetData ? 'Skopiowano!' : 'Kopiuj format arkusza'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCorrespondence}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                title="Drukuj oficjalny Rejestr i Dziennik Podawczy do PDF"
              >
                <Printer size={13} />
                <span>Drukuj Dziennik</span>
              </button>
            </div>
          </div>

          {/* Sync Status Alert */}
          {mailSyncStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                mailSyncStatus.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {mailSyncStatus.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{mailSyncStatus.message}</span>
            </div>
          )}

          {/* Filter & Search Bar for Correspondence */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Direction Filter Tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCorrespondenceFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    correspondenceFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Wszystkie ({correspondenceLog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCorrespondenceFilter('IN')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    correspondenceFilter === 'IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  📥 Przychodzące ({correspondenceLog.filter(c => c.direction === 'IN').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCorrespondenceFilter('OUT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    correspondenceFilter === 'OUT'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  📤 Wychodzące ({correspondenceLog.filter(c => c.direction === 'OUT').length})
                </button>
              </div>

              {/* Search Box & Quick Ingest */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={correspondenceSearch}
                    onChange={(e) => setCorrespondenceSearch(e.target.value)}
                    placeholder="Szukaj po sygnaturze, nadawcy, temacie..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  {correspondenceSearch && (
                    <button
                      onClick={() => setCorrespondenceSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsWelcomeMailModalOpen(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
                  title="Przygotuj i wyślij powitanie lub powiadomienie do studenta"
                >
                  <Mail size={14} />
                  <span>✉️ Nowe powiadomienie / powitanie</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenMailModal()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Wklej e-mail</span>
                </button>
              </div>
            </div>

            {/* ── CORRESPONDENCE LOG TABLE ── */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">Lp.</th>
                      <th className="py-3 px-3 w-44">Sygnatura Kancelaryjna</th>
                      <th className="py-3 px-3 text-center w-24">Data</th>
                      <th className="py-3 px-3 text-center w-24">Kierunek</th>
                      <th className="py-3 px-3 w-48">Nadawca / Odbiorca</th>
                      <th className="py-3 px-3">Temat & Przedmiot Sprawy</th>
                      <th className="py-3 px-3 text-center w-28">Status</th>
                      <th className="py-3 px-3 text-center w-20">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCorrespondence.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                          Brak zarejestrowanych pism w wybranym filtrze. Użyj przycisku „Wklej e-mail”, aby dodać pismo.
                        </td>
                      </tr>
                    ) : (
                      filteredCorrespondence.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-950">
                            {item.id}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            {item.date}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.direction === 'IN'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}>
                              {item.direction === 'IN' ? '📥 PRZYCHODZĄCE' : '📤 WYCHODZĄCE'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <div className="font-semibold text-slate-900 truncate max-w-[190px]" title={item.sender}>
                              {item.sender}
                            </div>
                            <div className="text-[10.5px] text-slate-500 truncate max-w-[190px]" title={item.recipient}>
                              → {item.recipient}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            <div className="font-bold text-slate-900">{item.subject}</div>
                            {item.summary && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-sans" title={item.summary}>
                                {item.summary}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.status || 'Zarejestrowane'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingMailEntry(item)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Podgląd szczegółów pisma"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenMailModal(item)}
                                className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Edytuj pismo"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMailEntry(item.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Usuń pismo z dziennika"
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
          </div>
        </>
      )}

      {/* ── MODAL: SMART MAIL INGESTION & PARSER ──────────────────────────────── */}
      {isMailModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden font-sans">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Inteligentny Parser Korespondencji & Rejestracja Pisma
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentOrg.name} • Kancelaria Koła Naukowego
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMailModalTab('parser')}
                className={`py-2 px-3 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
                  mailModalTab === 'parser'
                    ? 'text-indigo-600 border-indigo-600 bg-white shadow-2xs'
                    : 'text-slate-500 border-transparent hover:text-slate-900'
                }`}
              >
                ⚡ 1. Wklej Treść E-mail (Smart Parser)
              </button>
              <button
                type="button"
                onClick={() => setMailModalTab('form')}
                className={`py-2 px-3 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
                  mailModalTab === 'form'
                    ? 'text-indigo-600 border-indigo-600 bg-white shadow-2xs'
                    : 'text-slate-500 border-transparent hover:text-slate-900'
                }`}
              >
                ✏️ 2. Formularz Kancelaryjny
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {mailModalTab === 'parser' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600" />
                      Jak działa inteligentny parser korespondencji?
                    </p>
                    <p className="text-[11px] text-indigo-800 mt-1 leading-relaxed">
                      Wklej poniżej skopiowany z programu pocztowego (Gmail, Outlook, USOSweb) nagłówek i treść wiadomości.
                      System automatycznie wyodrębni <strong>Nadawcę (Od:)</strong>, <strong>Odbiorcę (Do:)</strong>, <strong>Datę</strong>, <strong>Temat</strong> oraz treść, nada kolejną sygnaturę kancelaryjną i sprawdzi duplikaty.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Wklej skopiowany e-mail (nagłówek i treść):
                    </label>
                    <textarea
                      rows={8}
                      value={rawMailText}
                      onChange={(e) => setRawMailText(e.target.value)}
                      placeholder={`Przykład:\nOd: Dziekanat WNS <dziekanat@wskz.pl>\nDo: Zarząd SKNU <sknu@student.wskz.pl>\nData: 24 sierpnia 2026 10:15\nTemat: Zatwierdzenie harmonogramu warsztatów profilaktycznych\n\nSzanowni Państwo,\nInformujemy, że wniosek Koła został pozytywnie rozpatrzony...`}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400 italic">
                      Możesz także przejść od razu do formularza ręcznego.
                    </span>
                    <button
                      type="button"
                      onClick={handleParseMail}
                      disabled={!rawMailText.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-900/20 transition cursor-pointer"
                    >
                      <Sparkles size={15} />
                      <span>⚡ Przetwórz i wyodrębnij metadane</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveMailEntry} className="space-y-4">
                  {/* Duplicate Detection Alert Banner */}
                  {duplicateWarning && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <span>⚠️ Wykryto potencjalny duplikat sprawy!</span>
                      </div>
                      <p className="text-[11.5px] text-amber-800 leading-relaxed">
                        W rejestrze istnieje już pismo o zbliżonym temacie i dacie: <br />
                        <strong className="font-mono">{duplicateWarning.id}</strong>: „{duplicateWarning.subject}” ({duplicateWarning.date}).
                      </p>
                      <div className="pt-1 flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDuplicateWarning(null)}
                          className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold transition cursor-pointer"
                        >
                          ✓ Kontynuuj jako odpowiedź / uzupełnienie
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Sygnatura Kancelaryjna:</label>
                      <input
                        type="text"
                        required
                        value={mailForm.id}
                        onChange={(e) => setMailForm({ ...mailForm, id: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Kierunek:</label>
                      <select
                        value={mailForm.direction}
                        onChange={(e) => setMailForm({ ...mailForm, direction: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="IN">📥 IN (Przychodzące)</option>
                        <option value="OUT">📤 OUT (Wychodzące)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nadawca:</label>
                      <input
                        type="text"
                        required
                        value={mailForm.sender}
                        onChange={(e) => setMailForm({ ...mailForm, sender: e.target.value })}
                        placeholder="np. Dziekanat WNS <dziekanat@wskz.pl>"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Odbiorca / Adresat:</label>
                      <input
                        type="text"
                        required
                        value={mailForm.recipient}
                        onChange={(e) => setMailForm({ ...mailForm, recipient: e.target.value })}
                        placeholder="np. Zarząd Koła <sknu@student.wskz.pl>"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Temat / Przedmiot Sprawy:</label>
                      <input
                        type="text"
                        required
                        value={mailForm.subject}
                        onChange={(e) => setMailForm({ ...mailForm, subject: e.target.value })}
                        placeholder="np. Zatwierdzenie wniosku o dofinansowanie"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Data:</label>
                      <input
                        type="date"
                        required
                        value={mailForm.date}
                        onChange={(e) => setMailForm({ ...mailForm, date: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Treść / Streszczenie Pisma:</label>
                    <textarea
                      rows={3}
                      value={mailForm.summary}
                      onChange={(e) => setMailForm({ ...mailForm, summary: e.target.value })}
                      placeholder="Podsumowanie treści wiadomości..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setMailModalTab('parser')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      ← Wróć do wklejania maila
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMailModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                      >
                        Anuluj
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>Zapisz w Dzienniku Podawczym</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: CORRESPONDENCE PREVIEW ────────────────────────────────────── */}
      {viewingMailEntry && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Karta Korespondencji</h3>
                  <p className="text-[11px] font-mono text-indigo-300">{viewingMailEntry.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingMailEntry(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    viewingMailEntry.direction === 'IN'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}>
                    {viewingMailEntry.direction === 'IN' ? '📥 PISMO PRZYCHODZĄCE' : '📤 PISMO WYCHODZĄCE'}
                  </span>
                  <span className="font-mono text-slate-500 font-bold">{viewingMailEntry.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nadawca:</span>
                    <span className="font-medium text-slate-900">{viewingMailEntry.sender}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Odbiorca:</span>
                    <span className="font-medium text-slate-900">{viewingMailEntry.recipient}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Temat / Przedmiot Sprawy:</span>
                <p className="font-bold text-sm text-slate-900">{viewingMailEntry.subject}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Treść Pisma:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                  {viewingMailEntry.summary || 'Brak treści pisma.'}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`[${viewingMailEntry.id}] ${viewingMailEntry.subject}\nNadawca: ${viewingMailEntry.sender}\nData: ${viewingMailEntry.date}\n\n${viewingMailEntry.summary}`);
                    alert('Skopiowano treść pisma do schowka!');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Kopiuj treść</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMailEntry(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: WELCOME & NOTIFICATION MAIL ───────────────────────────────── */}
      <WelcomeMailModal
        isOpen={isWelcomeMailModalOpen}
        onClose={() => setIsWelcomeMailModalOpen(false)}
        onRegistered={() => {
          setCorrespondenceLog(getCorrespondenceLog(currentOrg?.id || 'skn-psychoonkologia'));
        }}
      />

      {/* ── PRINTABLE CORRESPONDENCE PROTOCOL ─────────────────────────────────── */}
      {isPrintingCorrespondence && (
        <div id="correspondence-print-container" className="hidden print:block fixed inset-0 bg-white z-9999 p-0 m-0">
          <OfficialCorrespondenceProtocolTemplate
            correspondenceLog={filteredCorrespondence}
            org={currentOrg}
            academicYear="2025/2026"
            supervisors={supervisors}
          />
        </div>
      )}

      {/* ── MODAL: ADD / EDIT DOCUMENT ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {editingDoc ? 'Edycja Dokumentu / Uchwały' : 'Rejestracja Nowego Dokumentu'}
                  </h3>
                  <p className="text-[11px] text-slate-400">{currentOrg.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategoria Dokumentu:</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Uchwały Zarządu">Uchwały Zarządu</option>
                    <option value="Protokoły Zebrań">Protokoły Zebrań</option>
                    <option value="Regulaminy i Statut">Regulaminy i Statut</option>
                    <option value="Wnioski i Granty">Wnioski i Granty</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sygnatura / Nr Aktu:</label>
                  <input
                    type="text"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                    placeholder="np. UCHWAŁA/SKNU/01/2026"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tytuł / Przedmiot Dokumentu:</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="Wpisz pełny tytuł uchwały lub protokołu..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Data Uchwalenia / Wydania:</label>
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status Obowiązywania:</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Obowiązujący">🟢 Obowiązujący</option>
                    <option value="W toku">🟡 W toku</option>
                    <option value="Zastąpiony">⚪ Zastąpiony</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Link do pliku w Google Drive:</label>
                <input
                  type="url"
                  value={formState.driveUrl}
                  onChange={(e) => setFormState({ ...formState, driveUrl: e.target.value })}
                  placeholder="https://docs.google.com/document/d/... lub folder"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notatka / Streszczenie Aktu:</label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Opisz krótko cel aktu prawno-organizacyjnego..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Zapisz w Rejestrze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT GOOGLE DRIVE URL ─────────────────────────────────────── */}
      {isEditingDriveModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <HardDrive size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Konfiguracja Dysku Google</h3>
                  <p className="text-[11px] text-slate-400">{currentOrg.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingDriveModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDriveUrl} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Adres URL głównego folderu Google Drive koła:
                </label>
                <input
                  type="url"
                  value={tempDriveUrl}
                  onChange={(e) => setTempDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDriveModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Zapisz URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT STATUTE CONFIG ───────────────────────────────────────── */}
      {isEditingStatutModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Edytuj link do Statutu Koła</h3>
                  <p className="text-[11px] text-slate-400">{currentOrg.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingStatutModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStatutConfig} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Link do pliku Statutu na Google Drive:
                </label>
                <input
                  type="url"
                  value={tempStatutConfig.url}
                  onChange={(e) => setTempStatutConfig({ ...tempStatutConfig, url: e.target.value })}
                  placeholder="https://docs.google.com/document/d/... lub plik Drive"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Status zatwierdzenia:
                </label>
                <select
                  value={tempStatutConfig.status}
                  onChange={(e) => setTempStatutConfig({ ...tempStatutConfig, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-emerald-500"
                >
                  <option value="Zatwierdzony przez Władze WSKZ">🟢 Zatwierdzony przez Władze WSKZ</option>
                  <option value="W trakcie aktualizacji">🟡 W trakcie aktualizacji</option>
                  <option value="Projekt">⚪ Projekt (Wersja robocza)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Krótki opis / data uchwalenia:
                </label>
                <textarea
                  rows={3}
                  value={tempStatutConfig.description}
                  onChange={(e) => setTempStatutConfig({ ...tempStatutConfig, description: e.target.value })}
                  placeholder="Wpisz opis statutu lub datę jego uchwalenia..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingStatutModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
