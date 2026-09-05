import { useState, useMemo } from 'react';
import {
  Search,
  Users,
  BarChart2,
  FileCheck2,
  Mail,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  UserX,
  UserCheck,
  MoreVertical,
  AlertCircle,
  X,
  Pencil,
  AlertTriangle,
  Printer,
  Check,
  CheckCircle2,
  Sparkles,
  FileText,
  Award,
  ClipboardList,
  GraduationCap,
  Archive,
} from 'lucide-react';
import { calcFrequency, getFrequencyBadge, getCertificateStatus, getRecordKey } from '../utils/helpers';
import { calculateCurrentStudyYear } from '../utils/academicYear';
import { getMeetingType } from '../utils/meetingTypes';
import { calculateCategorizedFrequency } from '../utils/meetingTypes';
import { useSettings } from '../context/SettingsContext';
import { useOrg } from '../context/OrgContext';
import { getOfficialMemberRecord, getMemberStats, activityRegistry } from '../utils/activityRegistry';
import { getBlacklistedMembers, addMemberToBlacklist, isMemberBlacklisted } from '../utils/storage';
import EditMemberModal from './EditMemberModal';
import CertificateModal from './CertificateModal';

function KpiCard({ icon: Icon, label, value, sub, color, isLoading }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        {isLoading && (value === 0 || value === '0%') ? (
          <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-lg my-0.5" />
        ) : (
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        )}
        <p className="text-sm text-slate-500 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ManagementTab({
  members = [],
  meetings = [],
  isLoading = false,
  onToggleStatus,
  onRevertToQuarantine,
  onSaveMember,
  onArchiveMember,
  onBulkMarkGraduates,
  onBulkArchiveGraduates,
  onNavigateToReports,
}) {
  const { currentOrg, getStorageKey } = useOrg();
  const isSknSeks = currentOrg?.id === 'skn_seksuologii';

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'resigned', 'graduates', 'all'
  const [decisionModalMember, setDecisionModalMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [revertToast, setRevertToast] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fullName', direction: 'asc' });
  const [certificateModalState, setCertificateModalState] = useState({
    isOpen: false,
    member: null,
    initialDocType: 'membership',
    freqData: null,
    points: 0,
  });
  const { weights, calculateMemberPoints } = useSettings();

  // Persistent custom meeting categories (localStorage)
  const customMeetingTypes = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey ? getStorageKey('crm_meeting_types') : 'crm_meeting_types') || '{}');
    } catch {
      return {};
    }
  }, [getStorageKey]);

  const getMemberFreqData = (m) => {
    const isSknu = currentOrg?.id === 'sknu';
    const isSknSeks = currentOrg?.id === 'skn_seksuologii';
    const safeMeetings = Array.isArray(meetings) ? meetings : [];

    // Dynamicznie wyznacz liczbę spotkań obowiązkowych dla organizacji (np. 1 dla SKN Psychoonkologii)
    const conductedMandatory = safeMeetings.filter(
      meet => meet && !meet.isUpcoming && getMeetingType(meet, customMeetingTypes) === 'mandatory'
    );
    const plannedMandatory = safeMeetings.filter(
      meet => meet && getMeetingType(meet, customMeetingTypes) === 'mandatory'
    );
    const dynamicMandatoryTotal = conductedMandatory.length > 0
      ? conductedMandatory.length
      : (plannedMandatory.length > 0 ? plannedMandatory.length : 1);

    if (!m) {
      return {
        freq: 0,
        presentMandatory: 0,
        mandatoryTotal: isSknu ? 3 : (isSknSeks ? 12 : dynamicMandatoryTotal),
        optionalBonus: 0,
        totalAttended: 0,
        present: 0,
        absent: isSknu ? 3 : (isSknSeks ? 12 : dynamicMandatoryTotal),
      };
    }
    const cleanIdx = m?.index || m?.indexNumber || m?.cleanIndex || '';

    // ── DLA SKNU: Twarde przeliczanie z kolumn spotkań M01-M04 (mianownik 3) ──
    if (isSknu) {
      const m01 = m?.m01 === 1 ? 1 : 0;
      const m02 = m?.m02 === 1 ? 1 : 0;
      const m03 = m?.m03 === 1 ? 1 : 0;
      const m04 = m?.m04 === 1 ? 1 : 0;
      const attended = typeof m?.attended === 'number'
        ? m.attended
        : (m01 + m02 + m03 + m04 || (typeof m?.present === 'number' ? m.present : 0));
      const totalMeetings = 3; // Liczba spotkań otwartych dla członków ogólnych
      const absent = Math.max(0, totalMeetings - attended);
      const freq = typeof m?.attendancePercent === 'number'
        ? m.attendancePercent
        : Math.min(100, Math.round((attended / totalMeetings) * 100));

      return {
        freq: isNaN(freq) ? 0 : freq,
        present: attended,
        absent,
        presentMandatory: attended,
        mandatoryTotal: totalMeetings,
        optionalBonus: 0,
        totalAttended: attended,
      };
    }

    // ── DLA SKN PSYCHOONKOLOGII ORAZ NOWYCH INSTANCJI CRM ────────────────────
    if (!isSknSeks) {
      const calc = calculateCategorizedFrequency(
        cleanIdx,
        safeMeetings,
        customMeetingTypes || {},
        m?.present || 0,
        m?.absent || 0
      );

      const rawAttended = typeof m?.present === 'number'
        ? m.present
        : (typeof m?.attended === 'number' ? m.attended : (calc?.totalAttended || 0));
      const absent = Math.max(0, dynamicMandatoryTotal - (calc?.presentMandatory || rawAttended));
      const freq = typeof m?.attendancePercent === 'number'
        ? m.attendancePercent
        : (calc?.freq || 0);

      return {
        freq: isNaN(freq) ? 0 : freq,
        present: rawAttended,
        absent,
        presentMandatory: calc?.presentMandatory || rawAttended,
        mandatoryTotal: dynamicMandatoryTotal,
        optionalBonus: calc?.optionalBonus || 0,
        totalAttended: rawAttended,
      };
    }

    // ── DLA SKN SEKSUOLOGII: Odczyt z rejestru 141 członków / algorytmu ───
    const rawAttended = typeof m?.present === 'number' ? m.present : (typeof m?.attended === 'number' ? m.attended : (typeof m?.attendedCount === 'number' ? m.attendedCount : 0));
    const rawAbsent = typeof m?.absent === 'number' ? m.absent : (typeof m?.absences === 'number' ? m.absences : (typeof m?.absencesCount === 'number' ? m.absencesCount : Math.max(0, 12 - rawAttended)));

    const calc = calculateCategorizedFrequency(
      cleanIdx,
      Array.isArray(meetings) ? meetings : [],
      customMeetingTypes || {},
      rawAttended,
      rawAbsent
    ) || { freq: 0, presentMandatory: 0, mandatoryTotal: 0, optionalBonus: 0, totalAttended: 0 };

    const official = getOfficialMemberRecord(m) || (cleanIdx ? getMemberStats(cleanIdx) : null);
    if (official) {
      const offPresent = typeof official.present === 'number' ? official.present : (typeof official.attended === 'number' ? official.attended : rawAttended);
      const offAbsent = typeof official.absent === 'number' ? official.absent : (typeof official.absences === 'number' ? official.absences : rawAbsent);
      const offFreq = typeof official.attendancePercent === 'number'
        ? official.attendancePercent
        : (typeof official.freq === 'number' ? official.freq : (calc?.freq ?? 0));
      return {
        ...calc,
        freq: isNaN(offFreq) ? 0 : offFreq,
        present: offPresent,
        absent: offAbsent,
      };
    }
    return {
      ...calc,
      freq: isNaN(calc?.freq) ? 0 : (calc?.freq ?? 0),
      present: rawAttended,
      absent: rawAbsent,
    };
  };

  const blacklist = useMemo(() => {
    return getBlacklistedMembers(currentOrg?.id || 'default');
  }, [currentOrg?.id]);

  const getMemberPoints = (m) => {
    if (!m) return 0;
    const cleanIndexNum = Number(String(m.index || m.indexNumber || m.cleanIndex || '').replace(/\D/g, ''));

    // Oblicz punkty ze zintegrowanego rejestru aktywności i wag
    const calc = calculateMemberPoints ? calculateMemberPoints(m, meetings, {}, weights) : 0;
    const validCalc = (typeof calc === 'number' && (!cleanIndexNum || calc !== cleanIndexNum)) ? calc : 0;

    // Surowe punkty z obiektu (zabezpieczone przed podstawieniem numeru indeksu)
    const rawPoints = m.points !== undefined && m.points !== null ? Number(m.points) : null;
    const parsedPoints = (rawPoints !== null && !isNaN(rawPoints) && (!cleanIndexNum || rawPoints !== cleanIndexNum))
      ? rawPoints
      : validCalc;

    return parsedPoints || 0;
  };

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

  // ── Active vs Guests vs Resigned vs Graduates vs Archived Calculations ───────────
  const activeMembers = useMemo(
    () => members.filter(m => isActive(m)),
    [members]
  );
  const guestMembers = useMemo(
    () => members.filter(m => isGuest(m) && !m?.isArchived && m?.status !== 'archived'),
    [members]
  );
  const resignedMembers = useMemo(
    () => members.filter(m => isInactive(m) && !m?.isArchived && m?.status !== 'archived'),
    [members]
  );
  const archivedMembers = useMemo(
    () => members.filter(m => m?.isArchived || m?.status === 'archived'),
    [members]
  );
  const graduatesList = useMemo(
    () => activeMembers.filter(m => {
      const info = calculateCurrentStudyYear(m?.rawTimestamp || m?.timestamp, m?.year, m?.field);
      return info.isGraduate;
    }),
    [activeMembers]
  );

  const activeCount = activeMembers.length;
  const guestCount = guestMembers.length;
  const resignedCount = resignedMembers.length;
  const graduatesCount = graduatesList.length;
  const archivedCount = archivedMembers.length;
  const totalCount = members.filter(m => !m?.isArchived && m?.status !== 'archived').length;

  // ── KPI Calculations (ONLY for active members, Safe against NaN%) ────────
  const avgFreq = useMemo(() => {
    if (!activeMembers.length) return 0;
    const sum = activeMembers.reduce((acc, m) => {
      const f = getMemberFreqData(m)?.freq ?? 0;
      return acc + (isNaN(f) ? 0 : f);
    }, 0);
    const avg = Math.round(sum / activeMembers.length);
    return isNaN(avg) ? 0 : avg;
  }, [activeMembers, meetings, customMeetingTypes]);

  const certReady = useMemo(
    () => activeMembers.filter(m => {
      const data = getMemberFreqData(m) || { freq: 0, presentMandatory: 0, mandatoryTotal: 0, absent: 0 };
      if (!isSknSeks) {
        return (data?.freq ?? 0) >= 50;
      }
      const absences = typeof data.absent === 'number' ? data.absent : (data.mandatoryTotal > 0 ? Math.max(0, data.mandatoryTotal - (data.presentMandatory || 0)) : (m?.absent || 0));
      return (data?.freq ?? 0) >= 50 && absences <= 5;
    }).length,
    [activeMembers, isSknSeks, meetings, customMeetingTypes]
  );

  const mailingConsentsCount = useMemo(() => {
    const seenEmails = new Set();
    return activeMembers.filter(m => {
      const email = (m?.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return false;

      const hasConsent = m?.zgodaNaMailing === 'Zgoda na mailing';

      if (hasConsent && !seenEmails.has(email)) {
        seenEmails.add(email);
        return true;
      }
      return false;
    }).length;
  }, [activeMembers]);

  const mailingCount = mailingConsentsCount;

  // ── Sorting & Filtering ───────────────────────────────────────────────────
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filtered = useMemo(() => {
    let list = members.filter(m => !m?.isArchived && m?.status !== 'archived');
    if (statusFilter === 'active') {
      list = activeMembers;
    } else if (statusFilter === 'guest') {
      list = guestMembers;
    } else if (statusFilter === 'resigned') {
      list = resignedMembers;
    } else if (statusFilter === 'graduates') {
      list = graduatesList;
    } else if (statusFilter === 'archived') {
      list = archivedMembers;
    }

    const q = query.toLowerCase().trim();
    if (!q) return list;
    return list.filter(m => {
      const name  = (m?.fullName || `${m?.firstName || ''} ${m?.lastName || ''}`).toLowerCase();
      const index = (m?.index ?? m?.indexNumber ?? '').toLowerCase();
      const email = (m?.email ?? '').toLowerCase();
      return name.includes(q) || index.includes(q) || email.includes(q);
    });
  }, [members, activeMembers, guestMembers, resignedMembers, graduatesList, archivedMembers, statusFilter, query]);

  const sortedMembers = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === 'asc' ? 1 : -1;

      if (key === 'status') {
        const getStatusOrder = (item) => {
          if (isActive(item)) return 0;
          if (isGuest(item)) return 1;
          return 2;
        };
        return (getStatusOrder(a) - getStatusOrder(b)) * dir;
      }

      if (key === 'freq') {
        const aFreq = getMemberFreqData(a)?.freq ?? 0;
        const bFreq = getMemberFreqData(b)?.freq ?? 0;
        return (aFreq - bFreq) * dir;
      }

      if (key === 'points') {
        const valA = getMemberPoints(a);
        const valB = getMemberPoints(b);
        return (valA - valB) * dir;
      }

      if (key === 'present') {
        const aPres = getMemberFreqData(a)?.present ?? 0;
        const bPres = getMemberFreqData(b)?.present ?? 0;
        return (aPres - bPres) * dir;
      }

      if (key === 'absent') {
        const aAbs = getMemberFreqData(a)?.absent ?? 0;
        const bAbs = getMemberFreqData(b)?.absent ?? 0;
        return (aAbs - bAbs) * dir;
      }

      if (key === 'index') {
        const aNum = parseInt(a?.index || a?.indexNumber, 10) || 0;
        const bNum = parseInt(b?.index || b?.indexNumber, 10) || 0;
        return (aNum - bNum) * dir;
      }

      if (key === 'mailingConsent') {
        const aVal = (a?.mailingConsent === true || a?.consent === true || a?.zgoda === true || a?.consentStatus === 'Zgody OK' || String(a?.mailingConsent).toLowerCase() === 'tak') ? 1 : 0;
        const bVal = (b?.mailingConsent === true || b?.consent === true || b?.zgoda === true || b?.consentStatus === 'Zgody OK' || String(b?.mailingConsent).toLowerCase() === 'tak') ? 1 : 0;
        return (aVal - bVal) * dir;
      }

      const aVal = String(a?.[key] || '').toLowerCase();
      const bVal = String(b?.[key] || '').toLowerCase();
      return aVal.localeCompare(bVal, 'pl') * dir;
    });
  }, [filtered, sortConfig]);

  const renderSortIcon = (colKey) => {
    if (sortConfig.key !== colKey) {
      return (
        <span className="inline-flex items-center justify-center ml-1 p-0.5 rounded text-purple-400/60 hover:text-purple-600 hover:bg-purple-100/60 transition-colors group-hover:text-purple-500 print:hidden">
          <ArrowUpDown size={12} />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center ml-1 p-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200 shadow-2xs print:hidden">
        {sortConfig.direction === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </span>
    );
  };

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleOpenCertificate = (m, initialDocType = 'membership') => {
    if (!m) return;
    const fData = getMemberFreqData(m);
    const mPoints = getMemberPoints(m);
    setCertificateModalState({
      isOpen: true,
      member: m,
      initialDocType,
      freqData: fData,
      points: mPoints,
    });
  };

  const handleOpenAnnualReport = () => {
    if (onNavigateToReports) {
      onNavigateToReports(null, 'meetings_summary');
      return;
    }
    setCertificateModalState({
      isOpen: true,
      member: null,
      initialDocType: 'protocol',
      freqData: null,
      points: 0,
    });
  };

  const handleRevertAction = (m) => {
    if (!onRevertToQuarantine) return;
    onRevertToQuarantine(m.id);
    setRevertToast(`Cofnięto zatwierdzenie. Student ${m.fullName || m.firstName} wrócił do Kwarantanny.`);
    setDecisionModalMember(null);

    setTimeout(() => {
      setRevertToast(null);
    }, 5000);
  };

  const handleToggleStatusAction = (m) => {
    if (!onToggleStatus) return;
    onToggleStatus(m.id);
    setDecisionModalMember(null);
  };

  const handleSetStatusAction = (m, targetStatus) => {
    if (!onToggleStatus) return;
    onToggleStatus(m.id, targetStatus);
    setDecisionModalMember(null);
  };

  const handleArchiveAction = (m) => {
    if (!m) return;
    addMemberToBlacklist(currentOrg?.id || 'default', {
      ...m,
      archiveReason: 'Czarna lista / Usunięty przez użytkownika',
    });
    if (onArchiveMember) {
      onArchiveMember(m, 'blacklist_member');
    }
    setDecisionModalMember(null);
  };

  return (
    <div className="w-full space-y-6 relative">

      {/* ── Print Page Margin Optimization CSS ─────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            margin: 10mm 8mm;
            size: A4 portrait;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* ── Official Printable Header for Dziekanat (Visible ONLY during print) ── */}
      <div className="hidden print:block mb-3 pb-2 border-b-2 border-slate-900 font-sans">
        <div className="flex items-baseline justify-between">
          <h1 className="text-sm font-bold text-slate-950 uppercase tracking-tight">
            {currentOrg?.name?.toUpperCase() || 'KOŁO NAUKOWE SEKSUOLOGII'} – WYKAZ CZŁONKÓW
          </h1>
          <div className="text-[9.5px] text-slate-900 font-bold font-mono">
            Liczba studentów: {sortedMembers.length}
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-600 font-medium mt-1">
          <div>
            Dokument sporządzony na potrzeby Dziekanatu | Stan na dzień: {new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="font-mono text-slate-500">
            {statusFilter === 'active'
              ? `[Aktywni członkowie]`
              : statusFilter === 'guest'
              ? `[Goście / Wolni słuchacze]`
              : statusFilter === 'resigned'
              ? `[Byli / Nieaktywni członkowie]`
              : statusFilter === 'graduates'
              ? `[Absolwenci]`
              : `[Pełny wykaz]`}
          </div>
        </div>
      </div>

      {/* ── Certificate & Document Generator Modal ──────────────────────────── */}
      <CertificateModal
        isOpen={certificateModalState.isOpen}
        onClose={() => setCertificateModalState(prev => ({ ...prev, isOpen: false }))}
        member={certificateModalState.member}
        initialDocType={certificateModalState.initialDocType}
        freqData={certificateModalState.freqData}
        points={certificateModalState.points}
        allMembers={members}
        meetings={meetings}
      />

      {/* ── Edit Member Modal ────────────────────────────────────────────── */}
      <EditMemberModal
        member={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSave={(updated) => {
          if (onSaveMember) onSaveMember(updated);
        }}
      />

      {/* ── KPI & Controls Sticky Top Bar (Hidden during Print) ───────────── */}
      <div className="w-full bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-16 z-20 print:hidden">
        {/* KPI Row (ONLY Active Members) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            icon={Users}
            label="Aktywnych członków"
            value={activeCount}
            color="bg-indigo-500"
            sub={`z ${totalCount} w całej bazie`}
            isLoading={isLoading}
          />
          <KpiCard
            icon={BarChart2}
            label="Średnia frekwencja"
            value={`${isNaN(avgFreq) ? 0 : avgFreq}%`}
            color="bg-violet-500"
            sub="dla aktywnych członków"
            isLoading={isLoading}
          />
          <KpiCard
            icon={FileCheck2}
            label="Gotowe zaświadczenia"
            value={certReady}
            color="bg-emerald-500"
            sub={`z ${activeCount} aktywnych`}
            isLoading={isLoading}
          />
          <KpiCard
            icon={Mail}
            label="Zgody na mailing"
            value={mailingConsentsCount}
            color="bg-sky-500"
            sub={`z ${activeCount} aktywnych`}
            isLoading={isLoading}
          />
        </div>

        {/* Search, Segmented Filter & Print Button Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Szukaj po nazwisku, nr indeksu lub emailu…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
            {query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {sortedMembers.length} wyników
              </span>
            )}
          </div>

          {/* Action Controls: Filters + Print Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Segmented Filter Pills */}
            <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-semibold shrink-0 gap-1">
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Tylko aktywni ({activeCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('guest')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'guest'
                    ? 'bg-white text-purple-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Goście & Wolni słuchacze ({guestCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('resigned')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'resigned'
                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Byli / Nieaktywni ({resignedCount})</span>
              </button>

              {graduatesCount > 0 && (
                <button
                  onClick={() => setStatusFilter('graduates')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'graduates'
                      ? 'bg-white text-purple-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap size={13} className="text-purple-600" />
                  <span>Absolwenci ({graduatesCount})</span>
                </button>
              )}

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Wszyscy ({totalCount})
              </button>
            </div>

            {/* Print List Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
              title="Wydrukuj wykaz członków na potrzeby Dziekanatu"
            >
              <Printer size={14} />
              <span>Drukuj listę</span>
            </button>
          </div>
        </div>

        {/* Graduates Bulk Action Notification Banner */}
        {statusFilter === 'graduates' && graduatesCount > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <GraduationCap size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950">
                  Wykryto {graduatesCount} potencjalnych absolwentów koła
                </p>
                <p className="text-[11px] text-purple-700">
                  Osoby te przekroczyły programowy czas trwania studiów na podstawie roku zgłoszenia.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onBulkMarkGraduates && (
                <button
                  onClick={() => onBulkMarkGraduates(graduatesList.map(g => g.id))}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <GraduationCap size={13} />
                  <span>Przenieś do Byłych ({graduatesCount})</span>
                </button>
              )}
              {onBulkArchiveGraduates && (
                <button
                  onClick={() => onBulkArchiveGraduates(graduatesList.map(g => g.id))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-100 text-purple-800 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Archive size={13} />
                  <span>Archiwizuj ({graduatesCount})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Table Container with Independent Scrolling & Sticky Thead ── */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 print:max-h-none print:overflow-visible print:shadow-none print:border-none print:rounded-none">
        <table className="w-full text-xs table-fixed border-collapse print:table-auto print:text-[9.5px] print:leading-tight">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
            <tr className="text-left select-none print:bg-slate-100 print:border-slate-900">
              {/* 1. LP. (Liczba porządkowa) */}
              <th className="w-12 px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/95 backdrop-blur-xs print:text-slate-900 print:w-8 print:px-1 print:py-1 print:text-[9px] print:font-mono print:text-center">LP.</th>
              
              {/* 2. Imię i Nazwisko / Email */}
              <th
                onClick={() => handleSort('fullName')}
                className="min-w-[280px] px-3 py-2 text-xs font-semibold text-slate-700 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group bg-slate-50/95 backdrop-blur-xs print:text-slate-900 print:cursor-default print:px-1.5 print:py-1 print:text-[9px]"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Imię i Nazwisko</span>
                    <span className="text-[10px] font-normal text-slate-400 capitalize">Adres e-mail</span>
                  </div>
                  {renderSortIcon('fullName')}
                </div>
              </th>

              {/* 3. Nr Indeksu */}
              <th
                onClick={() => handleSort('index')}
                className="w-28 px-2 py-2 text-xs font-semibold text-slate-700 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group text-center bg-slate-50/95 backdrop-blur-xs print:text-slate-900 print:w-20 print:px-1 print:py-1 print:text-[9px] print:text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nr Indeksu</span>
                  {renderSortIcon('index')}
                </div>
              </th>

              {/* 4. Kierunek / Rok */}
              <th
                onClick={() => handleSort('field')}
                className="min-w-[240px] px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group bg-slate-50/95 backdrop-blur-xs print:text-slate-900 print:w-44 print:px-1.5 print:py-1 print:text-[9px]"
              >
                <div className="flex items-center gap-1">
                  <span>Kierunek / Rok studiów</span>
                  {renderSortIcon('field')}
                </div>
              </th>

              {/* 5. Status */}
              <th
                onClick={() => handleSort('status')}
                className="w-32 px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group text-center bg-slate-50/95 backdrop-blur-xs print:text-slate-900 print:w-28 print:px-1 print:py-1 print:text-[9px] print:text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              {/* Hidden on Print: Frekwencja */}
              <th
                onClick={() => handleSort('freq')}
                className="w-44 px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group text-center bg-slate-50/95 backdrop-blur-xs print:hidden"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Frekwencja</span>
                  {renderSortIcon('freq')}
                </div>
              </th>

              {/* Hidden on Print: Ob. / Nieob. */}
              <th
                onClick={() => handleSort('present')}
                className="w-28 px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group text-center bg-slate-50/95 backdrop-blur-xs print:hidden"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Ob. / Nieob.</span>
                  {renderSortIcon('present')}
                </div>
              </th>

              {/* Hidden on Print: Zaświadczenie */}
              <th className="w-36 px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center bg-slate-50/95 backdrop-blur-xs print:hidden">
                Zaświadczenie
              </th>

              {/* Hidden on Print: Punkty Aktywności */}
              <th
                onClick={() => handleSort('points')}
                className="w-28 px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group text-center bg-slate-50/95 backdrop-blur-xs print:hidden"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Punkty</span>
                  {renderSortIcon('points')}
                </div>
              </th>

              {/* Hidden on Print: Mailing Consent */}
              <th
                onClick={() => handleSort('mailingConsent')}
                className="w-16 px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group text-center bg-slate-50/95 backdrop-blur-xs print:hidden"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Mailing</span>
                  {renderSortIcon('mailingConsent')}
                </div>
              </th>

              {/* Hidden on Print: Opcje */}
              <th className="w-20 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center bg-slate-50/95 backdrop-blur-xs print:hidden">
                Opcje
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-slate-300">
            {sortedMembers.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-sm">
                  {members.length === 0
                    ? 'Ładowanie danych…'
                    : statusFilter === 'guest'
                    ? 'Brak osób o statusie Gość / Wolny słuchacz'
                    : statusFilter === 'resigned'
                    ? 'Brak osób o statusie Nieaktywny / Rezygnacja'
                    : 'Brak wyników spełniających kryteria'}
                </td>
              </tr>
            )}
            {sortedMembers.map((m, i) => {
              if (!m) return null;
              const isResigned = isInactive(m);
              const isGuestMember = isGuest(m);
              const isNonActive = !isActive(m);

              const freqData = getMemberFreqData(m) || { freq: 0, present: 0, absent: 12, mandatoryTotal: 0, presentMandatory: 0 };
              const freq  = Number(freqData?.freq) || 0;
              const absences = typeof freqData.absent === 'number'
                ? freqData.absent
                : (freqData?.mandatoryTotal > 0 ? Math.max(0, freqData.mandatoryTotal - (freqData.presentMandatory || 0)) : (m?.absent || 0));
              const cert = !isSknSeks
                ? {
                    canIssue: freq >= 50,
                    label: freq >= 50 ? 'Można wydać' : 'W toku',
                    color: freq >= 50
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }
                : getCertificateStatus(freq, absences);
              const badge = getFrequencyBadge(freq);
              const memberPoints = getMemberPoints(m);
              const name  = m?.fullName || (m?.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : '') || m?.name || 'Brak danych';
              const isSingleWordName = name.trim().split(' ').length < 2;
              const studyInfo = calculateCurrentStudyYear(m?.rawTimestamp || m?.timestamp, m?.year, m?.field);

              return (
                <tr
                  key={m.id}
                  className={`group/row transition-all duration-150 ease-in-out print:break-inside-avoid print:page-break-inside-avoid ${
                    isNonActive
                      ? 'opacity-65 bg-slate-50/60 hover:opacity-90 hover:bg-slate-100/80 text-slate-500'
                      : 'hover:bg-purple-50/70 hover:shadow-2xs text-slate-800'
                  }`}
                >
                  {/* 1. # (Lp.) */}
                  <td className="w-12 px-2 py-2.5 text-slate-400 text-xs font-mono text-center align-middle whitespace-nowrap print:text-slate-900 print:px-1 print:py-0.5 print:font-mono print:text-center">{i + 1}</td>
                  
                  {/* 2. Name + Email */}
                  <td className="min-w-[280px] px-3 py-2.5 align-middle text-left whitespace-nowrap print:px-1.5 print:py-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs truncate print:text-slate-900 print:text-[10px] print:leading-tight" title={name}>
                      <span className={isResigned ? 'line-through text-slate-400 print:no-underline print:text-slate-900' : isGuestMember ? 'text-purple-900 font-bold' : 'text-slate-800 group-hover/row:text-purple-950 print:text-slate-900 font-bold transition-colors'}>{name}</span>
                      {isGuestMember && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold shrink-0 print:border print:border-purple-300 print:bg-transparent print:text-purple-700 print:text-[8px]">Gość</span>
                      )}
                      {isResigned && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold shrink-0 print:border print:border-slate-400 print:bg-transparent print:text-slate-700 print:text-[8px]">Nieaktywny</span>
                      )}
                      {isSingleWordName && (
                        <button
                          onClick={() => setEditingMember(m)}
                          className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200 hover:bg-amber-100 transition print:hidden cursor-pointer"
                          title="Kliknij, aby dodać nazwisko"
                        >
                          <Pencil size={9} /> Korekta
                        </button>
                      )}
                    </div>
                    {m.email && (
                      <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5 print:text-slate-600 print:text-[8.5px] print:mt-0" title={m.email}>{m.email}</div>
                    )}
                  </td>

                  {/* 3. Nr Indeksu */}
                  <td className="w-28 px-2 py-2.5 text-slate-600 font-mono text-xs text-center align-middle whitespace-nowrap print:text-slate-900 print:px-1 print:py-0.5 print:text-[10px] print:font-mono print:font-bold print:text-center">
                    {m.index ? (
                      <span className="font-semibold text-center inline-block">{m.index}</span>
                    ) : (
                      <span className="print:text-slate-400 font-normal text-center inline-block">
                        <button
                          onClick={() => setEditingMember(m)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs print:hidden cursor-pointer"
                          title="Brak numeru indeksu! Kliknij, aby uzupełnić."
                        >
                          <AlertTriangle size={10} className="text-amber-600 print:hidden" /> Brak
                        </button>
                        <span className="hidden print:inline">—</span>
                      </span>
                    )}
                  </td>

                  {/* 4. Kierunek / Rok z dynamiczną auto-progresją i statusem absolwenta */}
                  <td className="min-w-[240px] px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap align-middle print:text-slate-900 print:px-1.5 print:py-0.5 print:text-[9.5px]">
                    <div className="truncate font-medium">{m.field || '—'}</div>
                    <div className="flex items-center gap-1 mt-0.5 whitespace-nowrap">
                      {studyInfo.isGraduate ? (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 print:border-none print:p-0 print:text-slate-900"
                          title={`Przekroczono nominalny czas studiów (${studyInfo.maxYears} lat). Rejestracja: Rok ${studyInfo.originalYear || '?'}`}
                        >
                          <GraduationCap size={11} className="shrink-0 text-purple-700 print:hidden" />
                          <span>🎓 Absolwent (Koniec studiów)</span>
                        </span>
                      ) : studyInfo.isProgressed ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-semibold print:text-slate-900"
                          title={`Auto-progresja roku akad.: +${studyInfo.diff} rok (rejestracja: Rok ${studyInfo.originalYear || '?'})`}
                        >
                          <span>{studyInfo.currentYearLabel}</span>
                          <span className="text-[10px] text-indigo-600 font-bold print:hidden" title="Automatycznie wyliczony rok na podstawie daty zgłoszenia">↗️</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] print:text-slate-600 print:text-[8.5px]">
                          {m.year || '—'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 5. Status Official Text on Print */}
                  <td className="w-28 px-2 py-2 text-center align-middle whitespace-nowrap print:px-1 print:py-0.5 print:w-28 print:text-center">
                    <span className="print:hidden">
                      <button
                        onClick={() => setDecisionModalMember(m)}
                        className={`h-6 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-medium tracking-tight border shadow-2xs transition-colors cursor-pointer whitespace-nowrap ${
                          isGuestMember
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : isResigned
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Kliknij, aby zmienić status lub opcje wpisu"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isGuestMember ? 'bg-purple-500' : isResigned ? 'bg-slate-400' : 'bg-emerald-500'
                        }`} />
                        <span>{isGuestMember ? 'Gość' : isResigned ? 'Nieaktywny' : 'Aktywny'}</span>
                      </button>
                    </span>
                    <span className="hidden print:inline-block print:text-slate-900 print:text-[9.5px] print:font-medium">
                      {isGuestMember ? 'Gość / Wolny słuchacz' : isResigned ? 'Nieaktywny / Rezygnacja' : 'Aktywny członek koła'}
                    </span>
                  </td>

                  {/* Hidden on Print: Frekwencja (with Gentle 5-Level Scale Badge & Non-Red Progress Bar) */}
                  <td className="w-40 px-2 py-2 align-middle text-center whitespace-nowrap print:hidden">
                    <div className="flex flex-col items-center justify-center gap-1 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 bg-slate-100 rounded-full h-1.5 hidden xl:block print:hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              freq >= 75
                                ? 'bg-emerald-500'
                                : freq >= 50
                                ? 'bg-amber-400'
                                : freq >= 25
                                ? 'bg-amber-300/80'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, freq)}%` }}
                          />
                        </div>
                        <span className="text-slate-800 font-bold text-xs font-mono">{isNaN(freq) ? 0 : freq}%</span>
                      </div>
                      <span className={`h-6 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-medium tracking-tight border whitespace-nowrap ${badge.color}`} title={`5-stopniowa skala zaangażowania: ${badge.label} (${freq}%)`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotColor || 'bg-slate-400'}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>
                  </td>

                  {/* Hidden on Print: Combined Present / Absent ({present} / {absent}) */}
                  <td className="w-28 px-2 py-2 text-center align-middle whitespace-nowrap font-mono text-[11px] font-medium text-slate-700 print:hidden">
                    <span className="inline-flex items-center justify-center whitespace-nowrap" title={`Obecności: ${freqData.present ?? 0} / Nieobecności: ${freqData.absent ?? 0}`}>
                      <span className="text-emerald-600 font-bold">{freqData.present ?? 0}</span>
                      <span className="text-slate-300 mx-1.5 font-normal">/</span>
                      <span className="text-slate-500 font-medium">{freqData.absent ?? 0}</span>
                    </span>
                  </td>

                  {/* Hidden on Print: Zaświadczenie Status (Uniform Single-Line Badges) */}
                  <td className="w-36 px-2 py-2 text-center align-middle whitespace-nowrap print:hidden">
                    <button
                      onClick={() => {
                        if (onNavigateToReports) {
                          onNavigateToReports(m, 'membership');
                        } else {
                          handleOpenCertificate(m, 'membership');
                        }
                      }}
                      className={`h-6 px-3 w-[100px] inline-flex items-center justify-center text-[11px] font-medium tracking-tight rounded-full whitespace-nowrap border transition-all cursor-pointer ${
                        cert.canIssue
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:shadow-xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={
                        cert.canIssue
                          ? `Spełniono wymogi zaświadczenia (${freq}%, ${absences} nieob.). Kliknij, aby przejść do generatora dokumentów.`
                          : `Frekwencja w toku (${freq}%, ${absences} nieob.). Kliknij, aby przejść do generatora.`
                      }
                    >
                      {cert.canIssue && <Check size={11} className="text-emerald-600 mr-1 shrink-0" />}
                      <span>{cert.label}</span>
                    </button>
                  </td>

                  {/* Hidden on Print: Punkty Aktywności */}
                  <td className="w-28 px-2 py-2 text-center align-middle whitespace-nowrap print:hidden">
                    <span
                      className="h-6 px-2.5 min-w-[70px] inline-flex items-center justify-center gap-1 text-[11px] font-semibold tracking-tight rounded-full whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                      title={`Łączna suma punktów za aktywności w Kole: ${memberPoints} pkt`}
                    >
                      <Sparkles size={11} className="text-purple-500 shrink-0" />
                      <span>{memberPoints} pkt</span>
                    </span>
                  </td>

                  {/* Hidden on Print: Mailing Consent */}
                  <td className="w-16 px-2 py-2 text-center align-middle whitespace-nowrap print:hidden">
                    {(m.zgodaNaMailing === 'Zgoda na mailing' || (m.mailingConsent === true && m.zgodaNaMailing !== 'Brak zgody' && m.consentStatus !== 'Brak zgody')) ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold" title="Zgoda na mailing udzielona (Zgoda na mailing)">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100/70 text-slate-400 border border-slate-200 text-xs font-bold" title="Brak zgody na mailing (Brak zgody)">
                        ✕
                      </span>
                    )}
                  </td>

                  {/* Hidden on Print: Akcje / Menu Option Button */}
                  <td className="w-20 px-3 py-2 text-center align-middle whitespace-nowrap print:hidden">
                    <div className="inline-flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingMember(m)}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                        title="✏️ Edytuj dane członka"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => setDecisionModalMember(m)}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs cursor-pointer"
                        title="Opcje zarządzania wpisem"
                      >
                        <MoreVertical size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Revert Toast Notification (Hidden during Print) ─────────────────── */}
      {revertToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5 duration-200 text-xs print:hidden">
          <RotateCcw size={15} className="text-indigo-400 shrink-0" />
          <span>{revertToast}</span>
          <button onClick={() => setRevertToast(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Member Decision Modal (Hidden during Print) ───────────────────── */}
      {decisionModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 print:hidden">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Zarządzanie wpisem studenta</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Wybierz akcję dla <strong className="font-semibold text-slate-800">{decisionModalMember.fullName || decisionModalMember.firstName}</strong> (nr indeksu: <strong className="font-mono text-slate-800">{decisionModalMember.index || 'Brak'}</strong>):
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* Quick Status Selection Block */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Zmień status członkostwa:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetStatusAction(decisionModalMember, 'active')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                      isActive(decisionModalMember)
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Aktywny</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatusAction(decisionModalMember, 'guest')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                      isGuest(decisionModalMember)
                        ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Gość</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatusAction(decisionModalMember, 'resigned')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                      isInactive(decisionModalMember)
                        ? 'bg-slate-200 text-slate-900 border-slate-300 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>Nieaktywny</span>
                  </button>
                </div>
              </div>

              {/* Option 0: Edit Member */}
              <button
                onClick={() => {
                  const m = decisionModalMember;
                  setDecisionModalMember(null);
                  setEditingMember(m);
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors text-left cursor-pointer"
              >
                <Pencil size={15} className="shrink-0 text-slate-600" />
                <div>
                  <div>✏️ Edytuj pełne dane studenta</div>
                  <div className="text-[10px] font-normal text-slate-500">Pozwala zmienić numer indeksu, email, imię, nazwisko i kierunek</div>
                </div>
              </button>

              {/* Option 0b: Generate Certificate / Speaker Diploma */}
              <button
                onClick={() => {
                  const m = decisionModalMember;
                  setDecisionModalMember(null);
                  handleOpenCertificate(m, 'membership');
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-950 text-xs font-semibold flex items-center gap-2 transition-colors text-left cursor-pointer"
              >
                <Award size={15} className="shrink-0 text-indigo-700" />
                <div>
                  <div>📜 Wygeneruj Zaświadczenie / Dyplom</div>
                  <div className="text-[10px] font-normal text-indigo-700">Otwiera generator oficjalnego zaświadczenia lub dyplomu prelegenta</div>
                </div>
              </button>

              {/* Option 1: Revert to Quarantine */}
              <button
                onClick={() => handleRevertAction(decisionModalMember)}
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold flex items-center gap-2 transition-colors text-left"
              >
                <RotateCcw size={15} className="shrink-0 text-indigo-600" />
                <div>
                  <div>↩️ Cofnij do Kwarantanny (Pomyłka)</div>
                  <div className="text-[10px] font-normal text-indigo-600/80">Usuwa z Zarządzania i przywraca jako zgłoszenie oczekujące</div>
                </div>
              </button>

              {/* Option 2b: Mark as Graduate */}
              {calculateCurrentStudyYear(decisionModalMember.rawTimestamp || decisionModalMember.timestamp, decisionModalMember.year, decisionModalMember.field).isGraduate && !isInactive(decisionModalMember) && (
                <button
                  onClick={() => handleSetStatusAction(decisionModalMember, 'resigned')}
                  className="w-full py-2.5 px-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-xs font-semibold flex items-center gap-2 transition-colors text-left cursor-pointer"
                >
                  <GraduationCap size={15} className="shrink-0 text-purple-700" />
                  <div>
                    <div>🎓 Oznacz jako Absolwenta (Przenieś do Byłych)</div>
                    <div className="text-[10px] font-normal text-purple-700/80">Koniec toku studiów – przenosi studenta do grupy byłych członków</div>
                  </div>
                </button>
              )}

              {/* Option 3: Move to Archive & Blacklist */}
              <button
                onClick={() => handleArchiveAction(decisionModalMember)}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2 transition-colors text-left cursor-pointer"
              >
                <Archive size={15} className="shrink-0 text-rose-600" />
                <div>
                  <div>📦 Przenieś do Archiwum & Czarna lista</div>
                  <div className="text-[10px] font-normal text-rose-600/80">
                    Trwale usuwa z listy aktywnych i dodaje na czarną listę (np. Artur Gołaś) – rekord nie powróci po odświeżeniu
                  </div>
                </div>
              </button>

              {/* Cancel */}
              <button
                onClick={() => setDecisionModalMember(null)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors text-center cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
