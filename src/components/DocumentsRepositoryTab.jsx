import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  registerCorrespondenceToGAS,
  updateCorrespondenceStatusInGAS,
  deleteCorrespondenceFromGAS,
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

  // ── Resizable Sidebar State (clamped min/max, persistent in localStorage) ──
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_docs_sidebar_width');
      if (saved) return saved;
    }
    return '270px';
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarContainerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const screenWidth = window.innerWidth;
      const containerLeft = sidebarContainerRef.current ? sidebarContainerRef.current.getBoundingClientRect().left : 0;
      const newWidthPx = containerLeft > 0 ? (e.clientX - containerLeft) : e.clientX;

      const minAllowed = Math.max(210, screenWidth * 0.12);
      const maxAllowed = Math.min(420, screenWidth * 0.35);

      if (newWidthPx >= minAllowed && newWidthPx <= maxAllowed) {
        setSidebarWidth(`${newWidthPx}px`);
      } else if (newWidthPx < minAllowed) {
        setSidebarWidth(`${minAllowed}px`);
      } else if (newWidthPx > maxAllowed) {
        setSidebarWidth(`${maxAllowed}px`);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.removeProperty('user-select');
        localStorage.setItem('crm_docs_sidebar_width', sidebarWidth);
      }
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

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
    status: 'W toku',
    driveLink: '',
    hash: '',
  });

  const handleUpdateMailStatus = async (entryId, newStatus) => {
    const orgId = currentOrg?.id || 'skn-psychoonkologia';
    const updated = updateCorrespondenceEntry(orgId, entryId, { status: newStatus });
    if (updated) {
      setCorrespondenceLog(updated);
      if (viewingMailEntry && viewingMailEntry.id === entryId) {
        setViewingMailEntry(prev => ({ ...prev, status: newStatus }));
      }
    }
    try {
      await updateCorrespondenceStatusInGAS(entryId, newStatus, orgId);
    } catch (err) {
      console.warn('[GAS] Błąd synchronizacji zmiany statusu pisma:', err);
    }
  };

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
    const year = new Date().getFullYear().toString();
    if (entryToEdit) {
      setMailForm({
        ...entryToEdit,
        driveLink: entryToEdit.driveLink || entryToEdit.driveUrl || '',
      });
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
        status: 'W toku',
        driveLink: '',
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
    const year = parsed.date ? parsed.date.slice(0, 4) : new Date().getFullYear().toString();
    const nextNum = String(correspondenceLog.length + 1).padStart(2, '0');
    const suggestedId = `KANC/${orgTag}/${parsed.direction || 'IN'}/${nextNum}/${year}`;

    const dupCheck = checkDuplicateCorrespondence(parsed, correspondenceLog);
    if (dupCheck.isDuplicate) {
      setDuplicateWarning(dupCheck.matchedEntry);
    } else {
      setDuplicateWarning(null);
    }

    setMailForm({
      id: suggestedId,
      direction: parsed.direction || 'IN',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      sender: parsed.sender || '',
      recipient: parsed.recipient || '',
      subject: parsed.subject || '',
      summary: parsed.summary || '',
      status: 'W toku',
      driveLink: '',
      hash: `${(parsed.subject || '').slice(0, 20)}_${parsed.date || ''}`,
    });

    setMailModalTab('form');
  };

  const handleSaveMailEntry = async (e) => {
    e.preventDefault();
    if (!mailForm.id.trim() || !mailForm.subject.trim()) return;

    const orgId = currentOrg?.id || 'skn-psychoonkologia';
    const updated = addCorrespondenceEntry(orgId, mailForm);
    if (updated) setCorrespondenceLog(updated);
    setIsMailModalOpen(false);
    setDuplicateWarning(null);

    try {
      await registerCorrespondenceToGAS(mailForm, orgId);
    } catch (err) {
      console.warn('[GAS] Błąd rejestracji pisma w GAS:', err);
    }
  };

  const handleDeleteMailEntry = async (entryId) => {
    if (window.confirm('Czy na pewno chcesz usunąć to pismo z dziennika podawczego?')) {
      const orgId = currentOrg?.id || 'skn-psychoonkologia';
      const updated = deleteCorrespondenceEntry(orgId, entryId);
      if (updated) setCorrespondenceLog(updated);
      if (viewingMailEntry && viewingMailEntry.id === entryId) {
        setViewingMailEntry(null);
      }
      try {
        await deleteCorrespondenceFromGAS(entryId, orgId);
      } catch (err) {
        console.warn('[GAS] Błąd usuwania pisma w GAS:', err);
      }
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
    <div className="space-y-4 pb-12 font-sans animate-in fade-in duration-200">
      
      {/* ── HEADER BAR ────────────────────────────────────────────────────────── */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl text-white shadow-xs">
            {activeModuleTab === 'repository' ? <FolderKanban size={22} /> : <Mail size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {activeModuleTab === 'repository'
                  ? 'Repozytorium Dokumentów & Rejestr Uchwał'
                  : 'Elektroniczny Dziennik Podawczy & Kancelaria'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentOrg.shortName || currentOrg.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeModuleTab === 'repository'
                ? 'Oficjalna ewidencja aktów prawnych, statutów, uchwał i protokołów naukowych WSKZ.'
                : 'Ewidencja pism przychodzących i wychodzących z inteligentnym parserem e-maili i detekcją spraw.'}
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeModuleTab === 'repository' ? (
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Dodaj Dokument / Uchwałę</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsWelcomeMailModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Przygotuj i wyślij powiadomienie do studenta"
              >
                <Mail size={14} />
                <span>Powiadomienie</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCorrespondence}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Drukuj oficjalny Dziennik Podawczy do PDF dla Dziekanatu i PKA"
              >
                <Printer size={14} />
                <span>Drukuj Dziennik (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenMailModal()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus size={15} />
                <span>+ Zarejestruj Pismo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── TWO-COLUMN MASTER-DETAIL LAYOUT WITH RESIZABLE SIDEBAR ──────────── */}
      <div className="flex flex-col lg:flex-row items-stretch gap-0 w-full min-h-[calc(100vh-230px)]">
        
        {/* ── LEFT SIDEBAR (Navigation, Views & Micro-Tools) ──────────────────── */}
        <div
          ref={sidebarContainerRef}
          className="w-full lg:shrink-0 flex flex-col space-y-3 pr-0 lg:pr-3 pb-4 lg:pb-0"
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : '100%' }}
        >
          {/* Main Module Switchers */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Moduł Dokumentacji
            </div>
            
            <button
              type="button"
              onClick={() => setActiveModuleTab('repository')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                activeModuleTab === 'repository'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderKanban size={15} className={activeModuleTab === 'repository' ? 'text-indigo-400' : 'text-slate-500'} />
                <span>Repozytorium Aktów</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeModuleTab === 'repository' ? 'bg-slate-800 text-indigo-200' : 'bg-white text-slate-700 border border-slate-200'
              }`}>
                {documents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModuleTab('correspondence')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                activeModuleTab === 'correspondence'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail size={15} className={activeModuleTab === 'correspondence' ? 'text-white' : 'text-indigo-600'} />
                <span>Dziennik Podawczy</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeModuleTab === 'correspondence' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              }`}>
                {correspondenceLog.length}
              </span>
            </button>
          </div>

          {/* Contextual Filters / Tools based on active tab */}
          {activeModuleTab === 'repository' ? (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex-1">
              {/* Category Filter Pills */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Kategorie Dokumentów
                </div>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => {
                    const count = cat === 'Wszystkie'
                      ? documents.length
                      : documents.filter((d) => d.category === cat).length;
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Status Obowiązywania
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[9.5px] text-emerald-700 block font-bold uppercase">Obowiązujące</span>
                    <span className="text-xs font-extrabold text-emerald-800 font-mono">
                      {documents.filter((d) => d.status === 'Obowiązujący').length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                    <span className="text-[9.5px] text-amber-700 block font-bold uppercase">W toku</span>
                    <span className="text-xs font-extrabold text-amber-800 font-mono">
                      {documents.filter((d) => d.status === 'W toku').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Links / Micro-Cards */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Zasoby Zewnętrzne
                </div>

                {/* Statut Micro-Card */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Statut Koła</span>
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
                      className="text-slate-400 hover:text-emerald-600 p-0.5 rounded cursor-pointer"
                      title="Edytuj konfigurację Statutu"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={statutConfig.status}>
                    {statutConfig.status || 'Zatwierdzony przez Władze WSKZ'}
                  </div>
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
                    className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <ExternalLink size={11} />
                    <span>Otwórz Statut (Drive)</span>
                  </button>
                </div>

                {/* Google Drive Micro-Card */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                      <HardDrive size={14} className="text-blue-600" />
                      <span>Dysk Google</span>
                    </div>
                    <button
                      onClick={() => {
                        setTempDriveUrl(gdriveUrl);
                        setIsEditingDriveModal(true);
                      }}
                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                      title="Edytuj link Dysku Google"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                  <a
                    href={gdriveUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition text-center"
                  >
                    <FolderOpen size={11} />
                    <span>Przejdź do Dysku</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex-1">
              {/* Direction Filter Buttons */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Kierunek Korespondencji
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setCorrespondenceFilter('all')}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      correspondenceFilter === 'all'
                        ? 'bg-slate-900 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} />
                      <span>Wszystkie pisma</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      correspondenceFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {correspondenceLog.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrespondenceFilter('IN')}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      correspondenceFilter === 'IN'
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                        : 'text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Inbox size={13} />
                      <span>Przychodzące (IN)</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      correspondenceFilter === 'IN' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {correspondenceLog.filter((c) => c.direction === 'IN').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrespondenceFilter('OUT')}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      correspondenceFilter === 'OUT'
                        ? 'bg-sky-600 text-white font-bold shadow-2xs'
                        : 'text-sky-800 hover:bg-sky-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Send size={13} />
                      <span>Wychodzące (OUT)</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      correspondenceFilter === 'OUT' ? 'bg-sky-700 text-white' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {correspondenceLog.filter((c) => c.direction === 'OUT').length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quick Status Stats */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Statusy Pism
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-[9.5px] text-indigo-700 block font-bold uppercase">W toku</span>
                    <span className="text-xs font-extrabold text-indigo-900 font-mono">
                      {correspondenceLog.filter((c) => (c.status || 'W toku').toLowerCase().includes('toku')).length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[9.5px] text-emerald-700 block font-bold uppercase">Zatwierdzone</span>
                    <span className="text-xs font-extrabold text-emerald-900 font-mono">
                      {correspondenceLog.filter((c) => (c.status || '').toLowerCase().includes('zatwierdz') || (c.status || '').toLowerCase().includes('zrealizowan') || (c.status || '').toLowerCase().includes('zakończ')).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrations & Shortcuts */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Integracje i Eksport
                </div>

                <button
                  type="button"
                  onClick={handleSyncMailSheet}
                  disabled={isSyncingMailSheet}
                  className="w-full py-1.5 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <RefreshCw size={13} className={isSyncingMailSheet ? 'animate-spin' : ''} />
                    <span>Synchronizuj z Arkuszem</span>
                  </div>
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={handleCopySheetFormat}
                  className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Copy size={13} />
                    <span>{copiedSheetData ? 'Skopiowano TSV!' : 'Kopiuj format arkusza'}</span>
                  </div>
                  {copiedSheetData ? <Check size={13} className="text-emerald-600" /> : null}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RESIZER HANDLE ──────────────────────────────────────────────────── */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className={`hidden lg:flex items-center justify-center w-[5px] shrink-0 cursor-col-resize select-none z-10 transition-colors duration-150 self-stretch my-0.5 rounded-full group ${
            isResizing
              ? 'bg-indigo-500 shadow-xs'
              : 'hover:bg-indigo-400 bg-transparent hover:shadow-xs'
          }`}
          style={{
            width: '5px',
            cursor: 'col-resize',
            backgroundColor: isResizing ? '#6366f1' : 'transparent',
            transition: 'background-color 0.15s ease',
            flexShrink: 0,
            userSelect: 'none',
            zIndex: 10,
          }}
          title="Przeciągnij krawędź, aby dostosować szerokość panelu nawigacyjnego"
        >
          <div className={`w-[1px] h-8 rounded-full transition-colors ${
            isResizing ? 'bg-white' : 'bg-slate-300 group-hover:bg-indigo-200'
          }`} />
        </div>

        {/* ── RIGHT MAIN CONTENT COLUMN (flex-1) ──────────────────────────────── */}
        <div className="flex-1 min-w-0 w-full pl-0 lg:pl-3 space-y-3">
          
          {/* TAB 1: REPOSITORY MAIN CONTENT */}
          {activeModuleTab === 'repository' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              
              {/* Single-Row Compact Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {selectedCategory === 'Wszystkie' ? 'Wszystkie Dokumenty' : selectedCategory}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                    {filteredDocuments.length} z {documents.length}
                  </span>
                </div>

                {/* Search Box & Quick Add Button */}
                <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj po sygnaturze, tytule..."
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleOpenAddModal}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Dodaj</span>
                  </button>
                </div>
              </div>

              {/* Massive Documents Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-40">Sygnatura / Nr</th>
                        <th className="py-2.5 px-3">Tytuł / Przedmiot Dokumentu</th>
                        <th className="py-2.5 px-3 w-36">Kategoria</th>
                        <th className="py-2.5 px-3 w-24 text-center">Data</th>
                        <th className="py-2.5 px-3 w-24 text-center">Plik</th>
                        <th className="py-2.5 px-3 w-28 text-center">Status</th>
                        <th className="py-2.5 px-3 w-20 text-center">Akcje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredDocuments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                            Brak dokumentów w wybranej kategorii lub filtrze wyszukiwania.
                          </td>
                        </tr>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{doc.code}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{doc.title}</div>
                              {doc.description && (
                                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-sans">
                                  {doc.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${getCategoryBadgeClass(
                                  doc.category
                                )}`}
                              >
                                {doc.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 font-semibold">{doc.date}</td>
                            <td className="py-2.5 px-3 text-center">
                              {doc.driveUrl ? (
                                <a
                                  href={doc.driveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[10.5px] border border-indigo-200 transition-colors"
                                >
                                  <ExternalLink size={11} />
                                  <span>Drive</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border inline-flex items-center gap-1 ${getStatusBadgeClass(
                                  doc.status
                                )}`}
                              >
                                {doc.status === 'Obowiązujący' && <CheckCircle2 size={11} />}
                                {doc.status === 'W toku' && <Clock size={11} />}
                                {doc.status === 'Zastąpiony' && <Archive size={11} />}
                                {doc.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(doc)}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                                  title="Edytuj dokument"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                                  title="Usuń dokument"
                                >
                                  <Trash2 size={13} />
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
          )}

          {/* TAB 2: CORRESPONDENCE MAIN CONTENT */}
          {activeModuleTab === 'correspondence' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              
              {/* Sync Status Alert */}
              {mailSyncStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
                    mailSyncStatus.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {mailSyncStatus.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span>{mailSyncStatus.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMailSyncStatus(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Single-Row Compact Toolbar */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                {/* Direction Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCorrespondenceFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      correspondenceFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Mail size={13} />
                    <span>Wszystkie</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      correspondenceFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {correspondenceLog.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrespondenceFilter('IN')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      correspondenceFilter === 'IN'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                    }`}
                  >
                    <Inbox size={13} />
                    <span>Wchodzące</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      correspondenceFilter === 'IN' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-200/80 text-emerald-900'
                    }`}>
                      {correspondenceLog.filter(c => c.direction === 'IN').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrespondenceFilter('OUT')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      correspondenceFilter === 'OUT'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/60'
                    }`}
                  >
                    <Send size={13} />
                    <span>Wychodzące</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      correspondenceFilter === 'OUT' ? 'bg-sky-700 text-sky-100' : 'bg-sky-200/80 text-sky-900'
                    }`}>
                      {correspondenceLog.filter(c => c.direction === 'OUT').length}
                    </span>
                  </button>
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-2 flex-1 lg:max-w-md justify-end">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={correspondenceSearch}
                      onChange={(e) => setCorrespondenceSearch(e.target.value)}
                      placeholder="Szukaj po sygnaturze, temacie..."
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                    {correspondenceSearch && (
                      <button
                        type="button"
                        onClick={() => setCorrespondenceSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenMailModal()}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:shadow-md transition cursor-pointer shrink-0"
                    title="Zarejestruj nowe pismo lub wklej treść e-maila"
                  >
                    <Plus size={14} />
                    <span>+ Zarejestruj pismo / Wklej e-mail</span>
                  </button>
                </div>
              </div>

              {/* Massive Correspondence Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">Lp.</th>
                        <th className="py-2.5 px-3 w-40">Sygnatura Kanc.</th>
                        <th className="py-2.5 px-3 text-center w-24">Data</th>
                        <th className="py-2.5 px-3 text-center w-20">Kierunek</th>
                        <th className="py-2.5 px-3 w-48">Nadawca / Odbiorca</th>
                        <th className="py-2.5 px-3">Temat & Przedmiot Sprawy</th>
                        <th className="py-2.5 px-3 text-center w-24">Status</th>
                        <th className="py-2.5 px-3 text-center w-20">Akcje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredCorrespondence.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                            Brak zarejestrowanych pism w wybranym filtrze. Kliknij „+ Zarejestruj”, aby dodać pismo.
                          </td>
                        </tr>
                      ) : (
                        filteredCorrespondence.map((item, idx) => {
                          const statusStr = String(item.status || 'W toku').toLowerCase();
                          let statusColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                          if (statusStr.includes('zatwierdz') || statusStr.includes('zrealizowan') || statusStr.includes('zakończ')) {
                            statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                          } else if (statusStr.includes('weryfik')) {
                            statusColor = 'bg-amber-50 text-amber-800 border-amber-200';
                          } else if (statusStr.includes('odrzuc') || statusStr.includes('anulow')) {
                            statusColor = 'bg-rose-50 text-rose-800 border-rose-200';
                          }

                          return (
                            <tr
                              key={item.id || idx}
                              onClick={() => setViewingMailEntry(item)}
                              className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                              title="Kliknij wiersz, aby otworzyć panel boczny ze szczegółami sprawy"
                            >
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-950 group-hover:text-indigo-600 transition-colors">
                                {item.id}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                                {item.date}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.direction === 'IN'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-sky-50 text-sky-800 border-sky-200'
                                }`}>
                                  {item.direction === 'IN' ? '📥 IN' : '📤 OUT'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <div className="font-semibold text-slate-900 truncate max-w-[190px]" title={item.sender}>
                                  {item.sender}
                                </div>
                                <div className="text-[10.5px] text-slate-500 truncate max-w-[190px]" title={item.recipient}>
                                  → {item.recipient}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-800">
                                <div className="font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">{item.subject}</div>
                                {item.summary && (
                                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-sans" title={item.summary}>
                                    {item.summary}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                                  {item.status || 'W toku'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewingMailEntry(item)}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                    title="Podgląd w panelu bocznym"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMailModal(item)}
                                    className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                                    title="Edytuj pismo"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMailEntry(item.id)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                                    title="Usuń pismo z dziennika"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

                  {/* Row 1: Direction, Status, Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Kierunek pisma:</label>
                      <select
                        value={mailForm.direction}
                        onChange={(e) => setMailForm({ ...mailForm, direction: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="IN">📥 IN (Przychodzące)</option>
                        <option value="OUT">📤 OUT (Wychodzące)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Status sprawy:</label>
                      <select
                        value={mailForm.status || 'W toku'}
                        onChange={(e) => setMailForm({ ...mailForm, status: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="W toku">⏳ W toku</option>
                        <option value="Zatwierdzone">✅ Zatwierdzone</option>
                        <option value="Weryfikacja">🔍 Weryfikacja</option>
                        <option value="Zakończone">📦 Zakończone</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Data wpływu/wysłania:</label>
                      <input
                        type="date"
                        required
                        value={mailForm.date}
                        onChange={(e) => setMailForm({ ...mailForm, date: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Sygnatura */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Sygnatura Kancelaryjna:</label>
                    <input
                      type="text"
                      required
                      value={mailForm.id}
                      onChange={(e) => setMailForm({ ...mailForm, id: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Row 3: Nadawca i Odbiorca */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  {/* Row 4: Temat */}
                  <div>
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

                  {/* Row 5: Treść */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Treść / Streszczenie Pisma:</label>
                    <textarea
                      rows={3}
                      value={mailForm.summary}
                      onChange={(e) => setMailForm({ ...mailForm, summary: e.target.value })}
                      placeholder="Podsumowanie treści wiadomości lub postanowienia..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  {/* Row 6: Link do skanu Google Drive */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Link do skanu / załącznika w Google Drive (opcjonalnie):
                    </label>
                    <div className="relative">
                      <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        value={mailForm.driveLink || ''}
                        onChange={(e) => setMailForm({ ...mailForm, driveLink: e.target.value })}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setMailModalTab('parser')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
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

      {/* ── SLIDE-OVER DRAWER: PODGLĄD PISMA (SZUFLADA BOCZNA) ─────────────── */}
      {viewingMailEntry && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setViewingMailEntry(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl sm:max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-50 animate-in slide-in-from-right duration-200 font-sans">
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  <Mail size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold font-mono text-indigo-200 tracking-tight">
                      {viewingMailEntry.id}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      viewingMailEntry.direction === 'IN'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}>
                      {viewingMailEntry.direction === 'IN' ? '📥 PRZYCHODZĄCE (IN)' : '📤 WYCHODZĄCE (OUT)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Karta sprawy • {currentOrg?.name || 'Kancelaria Koła'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMailEntry(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Zamknij panel podglądu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-800">
              {/* Quick Status Bar & Date */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Status selection */}
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500 shrink-0">
                      Status sprawy:
                    </label>
                    <select
                      value={viewingMailEntry.status || 'W toku'}
                      onChange={(e) => handleUpdateMailStatus(viewingMailEntry.id, e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-2xs"
                    >
                      <option value="W toku">⏳ W toku</option>
                      <option value="Zatwierdzone">✅ Zatwierdzone</option>
                      <option value="Weryfikacja">🔍 Weryfikacja</option>
                      <option value="Zakończone">📦 Zakończone</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono shrink-0">
                    <Calendar size={13} className="text-slate-400" />
                    <span className="font-bold">Data wpływu/wysłania: {viewingMailEntry.date}</span>
                  </div>
                </div>
              </div>

              {/* Sender & Recipient Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Inbox size={11} className="text-emerald-600" /> Nadawca:
                  </span>
                  <p className="font-semibold text-slate-900 text-xs break-words">{viewingMailEntry.sender}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Send size={11} className="text-sky-600" /> Odbiorca / Adresat:
                  </span>
                  <p className="font-semibold text-slate-900 text-xs break-words">{viewingMailEntry.recipient}</p>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Temat / Przedmiot sprawy:
                </span>
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">{viewingMailEntry.subject}</h4>
                </div>
              </div>

              {/* Summary / Full Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Treść / Streszczenie pisma:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`[${viewingMailEntry.id}] ${viewingMailEntry.subject}\nNadawca: ${viewingMailEntry.sender}\nOdbiorca: ${viewingMailEntry.recipient}\nData: ${viewingMailEntry.date}\nStatus: ${viewingMailEntry.status}\n\n${viewingMailEntry.summary || ''}`);
                      alert('Skopiowano treść pisma do schowka!');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Kopiuj</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 leading-relaxed font-sans whitespace-pre-wrap min-h-[140px] shadow-inner text-xs">
                  {viewingMailEntry.summary || 'Brak dodatkowej treści lub streszczenia pisma.'}
                </div>
              </div>

              {/* Scan / Attachment Link */}
              {(viewingMailEntry.driveLink || viewingMailEntry.driveUrl) && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck size={16} className="text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-emerald-950 text-xs">Dołączony skan / dokument elektroniczny</p>
                      <p className="text-[11px] text-emerald-700 truncate font-mono">{viewingMailEntry.driveLink || viewingMailEntry.driveUrl}</p>
                    </div>
                  </div>
                  <a
                    href={viewingMailEntry.driveLink || viewingMailEntry.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shrink-0 transition"
                  >
                    <span>Otwórz</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingMailEntry;
                    setViewingMailEntry(null);
                    handleOpenMailModal(item);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Edytuj dane pisma"
                >
                  <Edit3 size={13} />
                  <span>Edytuj</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = viewingMailEntry.id;
                    if (window.confirm('Czy na pewno chcesz usunąć to pismo z dziennika podawczego?')) {
                      setViewingMailEntry(null);
                      handleDeleteMailEntry(idToDelete);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Usuń pismo z rejestru"
                >
                  <Trash2 size={13} />
                  <span>Usuń</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintCorrespondence}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Eksportuj lub drukuj oficjalny dziennik do PDF"
                >
                  <Printer size={13} />
                  <span>Drukuj PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingMailEntry(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Zamknij
              </button>
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
