import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Archive,
  RotateCcw,
  CheckSquare,
  Square,
  X,
  Inbox,
  Pencil,
  Filter,
  UserX,
  Mail,
  Send,
} from 'lucide-react';
import EditMemberModal from './EditMemberModal';
import WelcomeMailModal from './WelcomeMailModal';

function ConsentBadge({ status }) {
  const ok = status === 'Zgody OK';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
      ok ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {status}
    </span>
  );
}

function DuplicateBadge({ isDuplicate, existsInManagement, isResignation }) {
  if (isResignation) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
        title="Wykryto formalną adnotację REZYGNACJA w zgłoszeniu"
      >
        <UserX size={11} className="text-rose-700" />
        Rezygnacja
      </span>
    );
  }
  if (existsInManagement) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
        title="Osoba o tym samym adresie e-mail lub numerze indeksu znajduje się już na liście Aktywnych Członków w Zarządzaniu"
      >
        <AlertTriangle size={11} className="text-rose-600" />
        ⚠️ Duplikat (Istnieje w Zarządzaniu)
      </span>
    );
  }
  if (isDuplicate) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-help"
        title="Wykryto wielokrotne zgłoszenie tego samego indeksu lub adresu e-mail"
      >
        <AlertTriangle size={11} className="text-amber-600" />
        ⚠️ Duplikat formularza
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
      title="Wniosek unikalny – brak wcześniejszych zgłoszeń w bazie"
    >
      <CheckCircle2 size={11} className="text-emerald-600" />
      ✓ Unikalne
    </span>
  );
}

function splitTimestamp(rawTs) {
  if (!rawTs) return { date: '—', time: '' };

  if (rawTs instanceof Date) {
    const date = rawTs.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = rawTs.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  }

  const str = String(rawTs).trim();
  const parts = str.split(/[\s,]+/);

  if (parts.length >= 2) {
    let datePart = parts[0];
    const timePart = parts[1].slice(0, 5);

    if (datePart.includes('-')) {
      const [y, m, d] = datePart.split('-');
      if (y && m && d) datePart = `${d}.${m}.${y}`;
    }
    return { date: datePart, time: timePart };
  }

  return { date: str, time: '' };
}

export default function QuarantineTab({
  members = [],
  quarantine = [],
  archivedQuarantine = [],
  onApprove,
  onBulkApprove,
  onArchive,
  onBulkArchive,
  onRestoreArchive,
  onBulkRestoreArchive,
  onPermanentDeleteArchive,
  onSaveMember,
}) {
  const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'archive'
  const [dupeFilter, setDupeFilter] = useState('all'); // 'all' | 'unique' | 'dupes'
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState([]);

  // Modals state
  const [archiveModalEntry, setArchiveModalEntry] = useState(null);
  const [deleteModalEntry, setDeleteModalEntry] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [welcomeMailMember, setWelcomeMailMember] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  // 1. Zbuduj zbiór referencyjny z aktywnych członków Zarządzania (Tryb Tylko do Odczytu)
  const managementKeys = useMemo(() => {
    const emails = new Set();
    const indexes = new Set();

    (members || []).forEach(m => {
      if (m.isArchived || m.status === 'archived') return;
      if (m.email) {
        emails.add(m.email.toLowerCase().trim());
      }
      const rawIdx = String(m.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
      if (rawIdx) {
        indexes.add(rawIdx);
      }
    });

    return { emails, indexes };
  }, [members]);

  // 2. Weryfikacja duplikatów względem Zarządzania i wewnątrz Kwarantanny
  const evaluatedQuarantine = useMemo(() => {
    const seenEmails = new Set();
    const seenIndexes = new Set();

    return quarantine.map(q => {
      const cleanEmail = q.email ? q.email.toLowerCase().trim() : '';
      const cleanIdx = q.index ? String(q.index).replace(/\D/g, '').replace(/^0+/, '').trim() : '';

      const existsInManagement =
        (cleanEmail && managementKeys.emails.has(cleanEmail)) ||
        (cleanIdx && managementKeys.indexes.has(cleanIdx));

      const isInternalDupe =
        (cleanEmail && seenEmails.has(cleanEmail)) ||
        (cleanIdx && seenIndexes.has(cleanIdx));

      if (cleanEmail) seenEmails.add(cleanEmail);
      if (cleanIdx) seenIndexes.add(cleanIdx);

      const isDupe = Boolean(q.isDuplicate || existsInManagement || isInternalDupe);
      const textForResign = `${q.fullName || ''} ${q.firstName || ''} ${q.lastName || ''} ${q.field || ''} ${q.year || ''} ${q.notes || ''}`.toLowerCase();
      const isResignation = Boolean(q.isResignation || /rezygnacja|rezygn/i.test(textForResign));

      return {
        ...q,
        isDuplicate: isDupe,
        existsInManagement: Boolean(existsInManagement),
        isResignation,
      };
    });
  }, [quarantine, managementKeys]);

  const pendingCount = evaluatedQuarantine.length;
  const archiveCount = archivedQuarantine.length;

  const duplicateCount = useMemo(
    () => evaluatedQuarantine.filter(q => q.isDuplicate).length,
    [evaluatedQuarantine]
  );

  const resignationCount = useMemo(
    () => evaluatedQuarantine.filter(q => q.isResignation).length,
    [evaluatedQuarantine]
  );

  const validPendingCount = useMemo(
    () => evaluatedQuarantine.filter(q => !q.isDuplicate && !q.isResignation).length,
    [evaluatedQuarantine]
  );

  const filteredQuarantine = useMemo(() => {
    if (dupeFilter === 'unique') {
      return evaluatedQuarantine.filter(q => !q.isDuplicate && !q.isResignation);
    }
    if (dupeFilter === 'dupes') {
      return evaluatedQuarantine.filter(q => q.isDuplicate);
    }
    if (dupeFilter === 'resignations') {
      return evaluatedQuarantine.filter(q => q.isResignation);
    }
    return evaluatedQuarantine;
  }, [evaluatedQuarantine, dupeFilter]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedQuarantine = useMemo(() => {
    if (!sortConfig.key) return filteredQuarantine;
    return [...filteredQuarantine].sort((a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === 'asc' ? 1 : -1;

      if (key === 'fullName') {
        const aVal = String(a.fullName || '').toLowerCase();
        const bVal = String(b.fullName || '').toLowerCase();
        return aVal.localeCompare(bVal, 'pl') * dir;
      }

      if (key === 'index') {
        const aNum = parseInt(a.index, 10) || 0;
        const bNum = parseInt(b.index, 10) || 0;
        return (aNum - bNum) * dir;
      }

      if (key === 'isDuplicate') {
        const aVal = a.isDuplicate ? 1 : 0;
        const bVal = b.isDuplicate ? 1 : 0;
        return (aVal - bVal) * dir;
      }

      const aVal = String(a[key] || '').toLowerCase();
      const bVal = String(b[key] || '').toLowerCase();
      return aVal.localeCompare(bVal, 'pl') * dir;
    });
  }, [filteredQuarantine, sortConfig]);

  const renderSortIcon = (colKey) => {
    if (sortConfig.key !== colKey) {
      return <ArrowUpDown size={11} className="text-slate-300 opacity-60 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={12} className="text-indigo-600 font-bold" />
      : <ChevronDown size={12} className="text-indigo-600 font-bold" />;
  };

  const toggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectArchiveRow = (id) => {
    setSelectedArchiveIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllValid = () => {
    const validIds = evaluatedQuarantine.filter(q => !q.isDuplicate).map(q => q.id);
    const allSelected = validIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !validIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...validIds])));
    }
  };

  const toggleSelectAllArchive = () => {
    if (selectedArchiveIds.length === archivedQuarantine.length) {
      setSelectedArchiveIds([]);
    } else {
      setSelectedArchiveIds(archivedQuarantine.map(a => a.id));
    }
  };

  const allValidSelected = useMemo(() => {
    const validIds = evaluatedQuarantine.filter(q => !q.isDuplicate).map(q => q.id);
    if (validIds.length === 0) return false;
    return validIds.every(id => selectedIds.includes(id));
  }, [evaluatedQuarantine, selectedIds]);

  const handleBulkApproveClick = () => {
    if (selectedIds.length === 0) return;
    onBulkApprove(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkArchiveClick = () => {
    if (selectedIds.length === 0) return;
    onBulkArchive(selectedIds);
    setSelectedIds([]);
  };

  const handleArchiveAllDuplicates = () => {
    const duplicateIds = evaluatedQuarantine.filter(q => q.isDuplicate).map(q => q.id);
    if (duplicateIds.length === 0) return;
    onBulkArchive(duplicateIds, 'duplicate');
    setSelectedIds(prev => prev.filter(id => !duplicateIds.includes(id)));
  };

  const handleArchiveAllResignations = () => {
    const resignationIds = evaluatedQuarantine.filter(q => q.isResignation).map(q => q.id);
    if (resignationIds.length === 0) return;
    onBulkArchive(resignationIds, 'resignation');
    setSelectedIds(prev => prev.filter(id => !resignationIds.includes(id)));
  };

  const handleConfirmSingleArchive = () => {
    if (!archiveModalEntry) return;
    onArchive(archiveModalEntry.id);
    setArchiveModalEntry(null);
  };

  const handleConfirmSingleDelete = () => {
    if (!deleteModalEntry) return;
    onPermanentDeleteArchive(deleteModalEntry.id);
    setDeleteModalEntry(null);
  };

  const formatYear = (field, year) => {
    if (field && year) return `${field} (${year})`;
    if (field) return field;
    if (year) return year;
    return '—';
  };

  return (
    <div className="space-y-6 relative">

      {/* ── Edit Member Modal ────────────────────────────────────────────── */}
      <EditMemberModal
        member={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSave={(updated) => {
          if (onSaveMember) onSaveMember(updated);
        }}
      />

      {/* ── Welcome & Notification Mail Modal ─────────────────────────────── */}
      <WelcomeMailModal
        isOpen={Boolean(welcomeMailMember)}
        onClose={() => setWelcomeMailMember(null)}
        member={welcomeMailMember}
        members={members}
        onApproveMember={(id) => {
          if (onApprove) onApprove(id);
          setWelcomeMailMember(null);
        }}
      />

      {/* ── Single Archive Confirmation Modal ──────────────────────────────── */}
      {archiveModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Archive size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Przenieść zgłoszenie do Archiwum?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dane studenta <strong className="font-semibold text-slate-800">{archiveModalEntry.fullName || archiveModalEntry.firstName}</strong> (nr indeksu: <strong className="font-mono text-slate-800">{archiveModalEntry.index || 'Brak'}</strong>) zostaną przeniesione do zakładek archiwalnych.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setArchiveModalEntry(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmSingleArchive}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Przenieś do archiwum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent Delete Confirmation Modal ────────────────────────────── */}
      {deleteModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Trwale usunąć zgłoszenie?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Rekord studenta <strong className="font-semibold text-slate-800">{deleteModalEntry.fullName || deleteModalEntry.firstName}</strong> zostanie trwale usunięty z bazy archiwum. Ta operacja jest nieodwracalna.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalEntry(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Trwale usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header View Switcher Tabs ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        
        {/* Primary View Mode Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'pending'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox size={15} />
            <span>📥 Oczekujące zgłoszenia ({pendingCount})</span>
          </button>

          <button
            onClick={() => setViewMode('archive')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'archive'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive size={15} />
            <span>📦 Archiwum / Odrzucone ({archiveCount})</span>
          </button>
        </div>

        {/* Pending Filters & Action Tools */}
        {viewMode === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Duplicate Filter Segment */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setDupeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dupeFilter === 'all' ? 'bg-white text-slate-800 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Wszystkie ({pendingCount})
              </button>
              <button
                onClick={() => setDupeFilter('unique')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dupeFilter === 'unique' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unikalne ({validPendingCount})
              </button>
              <button
                onClick={() => setDupeFilter('dupes')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dupeFilter === 'dupes' ? 'bg-white text-amber-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Duplikaty ({duplicateCount})
              </button>
              {resignationCount > 0 && (
                <button
                  onClick={() => setDupeFilter('resignations')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dupeFilter === 'resignations' ? 'bg-white text-rose-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-rose-700'
                  }`}
                >
                  Rezygnacje ({resignationCount})
                </button>
              )}
            </div>

            {/* Select All Valid */}
            {validPendingCount > 0 && (
              <button
                onClick={toggleSelectAllValid}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors border border-indigo-200/60"
              >
                {allValidSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{allValidSelected ? 'Odznacz wszystkie poprawne' : 'Zaznacz wszystkie poprawne'}</span>
              </button>
            )}

            {/* Quick Bulk Archive Duplicates Button */}
            {duplicateCount > 0 && (
              <button
                onClick={handleArchiveAllDuplicates}
                className="text-xs font-semibold text-rose-800 hover:text-rose-950 flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors border border-rose-200 shadow-2xs cursor-pointer"
                title="Przenieś wszystkie wykryte duplikaty do Archiwum Kwarantanny jednym kliknięciem"
              >
                <Archive size={13} className="text-rose-600" />
                <span>📦 Przenieś wszystkie duplikaty ({duplicateCount}) do Archiwum</span>
              </button>
            )}

            {/* Quick Bulk Archive Resignations Button */}
            {resignationCount > 0 && (
              <button
                onClick={handleArchiveAllResignations}
                className="text-xs font-semibold text-rose-900 hover:text-rose-950 flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-xl transition-colors border border-rose-300 shadow-2xs cursor-pointer font-bold"
                title="Przenieś wszystkie zgłoszenia z wykrytą rezygnacją do Archiwum jednym kliknięciem"
              >
                <UserX size={13} className="text-rose-700" />
                <span>🚫 Przenieś rezygnacje ({resignationCount}) do Archiwum</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MODE 1: PENDING QUARANTINE VIEW ───────────────────────────────── */}
      {viewMode === 'pending' && (
        <>
          {/* Bulk Actions Bar */}
          {selectedIds.length >= 1 && (
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 border border-indigo-700/50">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2.5 py-1 rounded-full font-bold">
                  Zaznaczono: {selectedIds.length}
                </span>
                <span className="text-slate-300">gotowe do przetworzenia</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkApproveClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all border border-indigo-400/40"
                >
                  <CheckCircle2 size={13} />
                  Zatwierdź zaznaczone ({selectedIds.length}) do Zarządzania
                </button>

                <button
                  onClick={handleBulkArchiveClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
                >
                  <Archive size={13} />
                  Przenieś zaznaczone do Archiwum
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                  title="Odznacz"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left select-none">
                    <th className="w-10 px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={allValidSelected}
                        onChange={toggleSelectAllValid}
                        className="accent-indigo-600 focus:ring-indigo-500 w-4 h-4 rounded border-slate-300 cursor-pointer align-middle"
                        title="Zaznacz wszystkie poprawne (bez duplikatów)"
                      />
                    </th>

                    <th
                      onClick={() => handleSort('timestamp')}
                      className="w-32 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Data wpłynięcia</span>
                        {renderSortIcon('timestamp')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('fullName')}
                      className="px-4 min-w-[200px] py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Student / Email</span>
                        {renderSortIcon('fullName')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('index')}
                      className="w-28 px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Nr Indeksu</span>
                        {renderSortIcon('index')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('field')}
                      className="px-3 min-w-[160px] py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Kierunek / Rok</span>
                        {renderSortIcon('field')}
                      </div>
                    </th>

                    <th className="w-28 px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Zgody
                    </th>

                    <th
                      onClick={() => handleSort('isDuplicate')}
                      className="w-32 px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Weryfikacja</span>
                        {renderSortIcon('isDuplicate')}
                      </div>
                    </th>

                    <th className="w-48 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">
                      Akcja
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedQuarantine.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <UserCheck size={32} className="mx-auto mb-2 text-slate-300" />
                        {dupeFilter === 'dupes'
                          ? 'Brak duplikatów w Kwarantannie'
                          : dupeFilter === 'unique'
                          ? 'Brak unikalnych zgłoszeń w Kwarantannie'
                          : 'Wszystkie zgłoszenia zostały przetworzone'}
                      </td>
                    </tr>
                  )}
                  {sortedQuarantine.map(q => {
                    const name = q.fullName || `${q.firstName || ''} ${q.lastName || ''}`.trim() || 'Brak danych';
                    const ts = splitTimestamp(q.timestamp);
                    const isSelected = selectedIds.includes(q.id);

                    return (
                      <tr
                        key={q.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-indigo-50/50' : q.isDuplicate ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="px-2 py-2.5 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(q.id)}
                            className="accent-indigo-600 focus:ring-indigo-500 w-4 h-4 rounded border-slate-300 cursor-pointer align-middle"
                          />
                        </td>

                        <td className="px-3 py-2.5 align-middle text-left whitespace-nowrap">
                          <div className="font-medium text-slate-700 text-xs leading-tight font-mono">{ts.date}</div>
                          {ts.time && (
                            <div className="text-[11px] text-slate-500 font-normal leading-tight font-mono mt-0.5">{ts.time}</div>
                          )}
                        </td>

                        <td className="px-4 py-2.5 align-middle text-left min-w-[200px]">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs truncate" title={name}>
                            <span>{name}</span>
                            <button
                              onClick={() => setEditingMember(q)}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition"
                              title="Edytuj dane studenta"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5" title={q.email}>
                            {q.email || '—'}
                          </div>
                        </td>

                        {/* Nr Indeksu */}
                        <td className="px-2 py-2.5 text-slate-700 font-mono font-medium text-xs align-middle text-center">
                          {q.index ? (
                            q.index
                          ) : (
                            <button
                              onClick={() => setEditingMember(q)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
                              title="Brak numeru indeksu! Kliknij, aby uzupełnić."
                            >
                              <AlertTriangle size={10} className="text-amber-600" /> Brak (Uzupełnij)
                            </button>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal break-words leading-snug align-middle text-left min-w-[160px]">
                          {formatYear(q.field, q.year)}
                        </td>

                        <td className="px-2 py-2.5 align-middle text-center">
                          <ConsentBadge status={q.consentStatus} />
                        </td>

                        {/* Verification Column with Smart Duplicate Badge */}
                        <td className="px-2 py-2.5 align-middle text-center">
                          <DuplicateBadge isDuplicate={q.isDuplicate} existsInManagement={q.existsInManagement} isResignation={q.isResignation} />
                        </td>

                        <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap w-56">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMember(q)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition cursor-pointer"
                              title="✏️ Edytuj dane weryfikacyjne"
                            >
                              <Pencil size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setWelcomeMailMember(q)}
                              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                              title="✉️ Wyślij powitanie / potwierdzenie i zarejestruj w Ewidencja_Poczty"
                            >
                              <Mail size={13} className="text-indigo-600" />
                              <span>Wyślij powitanie / potwierdzenie</span>
                            </button>

                            <button
                              onClick={() => onApprove(q.id)}
                              className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                              title="Zatwierdź studenta do widoku Zarządzania"
                            >
                              <CheckCircle2 size={13} />
                              <span>Zatwierdź</span>
                            </button>

                            <button
                              onClick={() => onArchive(q.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Przenieś ten formularz do Archiwum Kwarantanny jako duplikat"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MODE 2: ARCHIVE TABLE VIEW ────────────────────────────────────── */}
      {viewMode === 'archive' && (
        <div className="space-y-3">
          {/* Archive Bulk Bar */}
          {selectedArchiveIds.length >= 1 && (
            <div className="bg-slate-900 text-white rounded-xl p-3 shadow-lg flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-amber-400">
                Zaznaczono w archiwum: {selectedArchiveIds.length}
              </span>
              <button
                onClick={() => {
                  onBulkRestoreArchive(selectedArchiveIds);
                  setSelectedArchiveIds([]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all"
              >
                <RotateCcw size={13} />
                Przywróć zaznaczone ({selectedArchiveIds.length}) do Kwarantanny
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left select-none">
                  <th className="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedArchiveIds.length > 0 && selectedArchiveIds.length === archivedQuarantine.length}
                      onChange={toggleSelectAllArchive}
                      className="accent-amber-600 focus:ring-amber-500 w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="w-32 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Data wpłynięcia</th>
                  <th className="w-auto px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Student / Email</th>
                  <th className="w-28 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Nr Indeksu</th>
                  <th className="w-44 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Kierunek / Rok</th>
                  <th className="w-36 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedQuarantine.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <Archive size={32} className="mx-auto mb-2 text-slate-300" />
                      Archiwum jest puste
                    </td>
                  </tr>
                )}
                {archivedQuarantine.map(a => {
                  const ts = splitTimestamp(a.timestamp);
                  const isSel = selectedArchiveIds.includes(a.id);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors bg-slate-50/30">
                      <td className="px-3 py-2.5 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelectArchiveRow(a.id)}
                          className="accent-amber-600 focus:ring-amber-500 w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle text-left font-mono text-xs text-slate-600">{ts.date}</td>
                      <td className="px-3 py-2.5 align-middle text-left">
                        <div className="font-semibold text-slate-800 text-xs truncate">{a.fullName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{a.email || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600 align-middle">{a.index || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 align-middle">{formatYear(a.field, a.year)}</td>
                      <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => onRestoreArchive(a.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors"
                          >
                            <RotateCcw size={12} />
                            Przywróć
                          </button>
                          <button
                            onClick={() => setDeleteModalEntry(a)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Trwale usuń z archiwum"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
