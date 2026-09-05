import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  UserCheck,
  UserX,
  Search,
  Filter,
  Save,
  Timer,
  Calendar,
  Clock,
  User,
  Users,
  Sparkles,
  Link2,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  Check,
  Plus,
  UserPlus,
  GraduationCap,
  Mic,
  ShieldCheck,
  Tag,
  Award,
} from 'lucide-react';
import {
  PARTICIPANT_ROLES,
  FACULTY_SUPERVISORS,
  CUSTOM_MAPPINGS,
  isFacultySupervisor,
  findMatchingSupervisor,
  isMonikaLyniewska,
  getCustomMappedMember,
  normalizeDiacritics,
  detectParticipantRole,
} from '../utils/specialRoles';
import { useSettings } from '../context/SettingsContext';
import { useOrg } from '../context/OrgContext';
import { ACTIVITY_OPTIONS } from '../utils/activityRegistry';

function findMemberMatch(nameOrIndex, members = []) {
  if (!nameOrIndex) return null;
  const clean = String(nameOrIndex).trim();

  // 1. Explicit check for custom mapped members (e.g. Monika Łyniewska - 34327)
  const customMapped = getCustomMappedMember(clean);
  if (customMapped) {
    const foundInDb = members.find(
      m => String(m.index || '').trim() === customMapped.index ||
           normalizeDiacritics(m.fullName || `${m.firstName} ${m.lastName}`).includes(normalizeDiacritics(customMapped.fullName)) ||
           normalizeDiacritics(m.email).includes(normalizeDiacritics(customMapped.email))
    );
    return foundInDb || customMapped;
  }

  const normQuery = normalizeDiacritics(clean);

  // 2. Exact or sub-match against members with diacritics normalization
  return members.find(m => {
    const idx = String(m.index || '').trim();
    const fn = normalizeDiacritics(m.fullName || `${m.firstName} ${m.lastName}`);
    const ln = normalizeDiacritics(m.lastName);
    const em = normalizeDiacritics(m.email);

    if (idx && (normQuery === idx || normQuery.includes(idx))) return true;
    if (em && (normQuery === em || normQuery.includes(em))) return true;
    if (fn && (normQuery === fn || normQuery.includes(fn) || fn.includes(normQuery))) return true;
    if (ln && ln.length >= 3 && normQuery.includes(ln)) return true;
    return false;
  }) || null;
}

function resolveInitialParticipants(meeting, members = [], participants = [], threshold = 15, supervisors = null, getStorageKey = (k) => k) {
  const processParticipant = (p, idx = 0) => {
    const rawName = p.rawName || p.name || String(p);
    const matchedSup = findMatchingSupervisor(rawName, supervisors);
    const isSup = matchedSup != null || isFacultySupervisor(rawName, supervisors);
    const supervisorFormattedName = matchedSup ? (matchedSup.fullName || `${matchedSup.academicTitle || 'mgr'} ${matchedSup.name}`) : rawName;

    const isMonika = isMonikaLyniewska(rawName) || (p.member && isMonikaLyniewska(p.member.index || p.member.fullName));
    const customMember = getCustomMappedMember(rawName);
    const matchedMember = !isSup ? (customMember || findMemberMatch(rawName, members) || p.member) : null;

    let role = p.role || (isSup ? 'supervisor' : (matchedMember || isMonika ? 'member' : (p.isGuest ? 'guest' : 'member')));
    if (isSup) role = 'supervisor';
    if (isMonika) role = 'member';

    const dur = typeof p.durationMinutes === 'number' ? p.durationMinutes : (parseInt(p.durationMinutes || p.durationStr, 10) || 60);
    const isOver = dur >= threshold;
    const approved = p.manualApproved !== undefined ? p.manualApproved : (isSup || !!matchedMember || isMonika || isOver);

    let status = 'approved';
    if (role === 'supervisor') status = 'supervisor';
    else if (role === 'speaker') status = 'speaker';
    else if (role === 'guest') status = 'guest';
    else if (!matchedMember && !isMonika) status = 'unmatched';
    else if (!approved) status = 'rejected_short_time';

    const finalMember = isSup || role === 'guest' || role === 'speaker'
      ? null
      : (matchedMember || (isMonika ? findMemberMatch('34327', members) || getCustomMappedMember('34327') : null));

    const finalRawName = isSup
      ? supervisorFormattedName
      : (finalMember ? (finalMember.fullName || `${finalMember.firstName} ${finalMember.lastName}`) : rawName);

    return {
      ...p,
      id: p.id || `p_${idx}_${finalMember?.index || rawName.slice(0, 10)}`,
      rawName: finalRawName,
      joinTime: p.joinTime || '18:00',
      durationStr: p.durationStr || `${dur} min`,
      durationMinutes: dur,
      member: finalMember,
      role,
      isGuest: role === 'guest',
      isEligible: isOver,
      manualApproved: approved,
      hasManualOverride: p.hasManualOverride || isSup || isMonika,
      activities: Array.isArray(p.activities) ? p.activities : [],
      status,
    };
  };

  if (Array.isArray(participants) && participants.length > 0) {
    return participants.map((p, i) => processParticipant(p, i));
  }

  const keys = [
    getStorageKey(`crm_attendance_${meeting?.id}`),
    getStorageKey(`crm_attendance_${meeting?.date}`),
    meeting?.code ? getStorageKey(`crm_attendance_${meeting?.code}`) : null,
  ].filter(Boolean);

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        let list = null;
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        if (parsed && Array.isArray(parsed.attendees) && parsed.attendees.length > 0) list = parsed.attendees;

        if (list) {
          return list.map((p, i) => processParticipant(p, i));
        }
      }
    } catch {}
  }

  // Fallback: reconstruct from meeting.attendees
  if (Array.isArray(meeting?.attendees) && meeting.attendees.length > 0) {
    return meeting.attendees.map((att, i) => processParticipant({ rawName: String(att) }, i));
  }

  return [];
}

/**
 * Interaktywny Searchable Combobox do wyszukiwania studentów z bazy 141 osób
 */
function MemberAutocomplete({
  members = [],
  value,
  onChange,
  placeholder = 'Wpisz imię, nazwisko lub nr indeksu...',
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedMember = useMemo(() => {
    if (!value) return null;
    return members.find(m => m.id === value || m.index === value);
  }, [members, value]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const nameA = (a.fullName || `${a.firstName} ${a.lastName}`).trim();
      const nameB = (b.fullName || `${b.firstName} ${b.lastName}`).trim();
      return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
    });
  }, [members]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sortedMembers;
    const q = normalizeDiacritics(query);
    return sortedMembers.filter(m => {
      const name = normalizeDiacritics(m.fullName || `${m.firstName} ${m.lastName}`);
      const idx = String(m.index || '').toLowerCase();
      const em = normalizeDiacritics(m.email);
      return name.includes(q) || idx.includes(q) || em.includes(q);
    });
  }, [sortedMembers, query]);

  const displayInputValue = isOpen
    ? query
    : selectedMember
    ? `${selectedMember.fullName || `${selectedMember.firstName} ${selectedMember.lastName}`} (${selectedMember.index})`
    : query;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          id="combobox-search-member"
          name="comboboxSearchMember"
          type="text"
          value={displayInputValue}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 220);
          }}
          placeholder={placeholder}
          className="w-full text-xs border border-purple-300 rounded-xl pl-8 pr-8 py-2 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-purple-400 outline-none shadow-2xs transition"
        />
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400" />
        
        {selectedMember && !isOpen && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange('');
              setQuery('');
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition cursor-pointer p-0.5"
            title="Wyczyść wybór"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white rounded-2xl shadow-xl border border-purple-200 z-50 p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-purple-200 animate-in fade-in zoom-in-95 duration-100">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-slate-400">
              Nie znaleziono studenta o frazie &bdquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map(m => {
              const name = m.fullName || `${m.firstName} ${m.lastName}`;
              const isSelected = value === m.id || value === m.index;
              const isActive = m.status === 'active' || !m.status;

              return (
                <button
                  key={m.id || m.index}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(m.id || m.index);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-100 text-purple-950 font-bold'
                      : 'hover:bg-purple-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold truncate">{name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Indeks: <strong>{m.index}</strong> {m.field ? `• ${m.field}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {isActive ? '🟢 Aktywny' : '⚪ Baza ogólna'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AttendanceModal({
  isOpen,
  onClose,
  meeting,
  members = [],
  participants = [],
  minDurationThreshold = 15,
  onThresholdChange,
  onSaveAttendance,
}) {
  if (!isOpen || !meeting) return null;

  const { supervisors, weights } = useSettings();
  const [localThreshold, setLocalThreshold] = useState(minDurationThreshold);
  const [localParticipants, setLocalParticipants] = useState(() =>
    resolveInitialParticipants(meeting, members, participants, minDurationThreshold, supervisors)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'member', 'supervisor', 'speaker', 'guest', 'short_time', 'unmatched'
  const [selectedAssignee, setSelectedAssignee] = useState({});
  const [openActivityPopoverId, setOpenActivityPopoverId] = useState(null);

  const handleToggleActivity = (participantId, actId) => {
    setLocalParticipants(prev =>
      prev.map(p => {
        if (p.id !== participantId) return p;
        const current = Array.isArray(p.activities) ? p.activities : [];
        const next = current.includes(actId)
          ? current.filter(id => id !== actId)
          : [...current, actId];
        return {
          ...p,
          activities: next,
        };
      })
    );
  };

  // Manual participant add form
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [addMemberId, setAddMemberId] = useState('');
  const [addDuration, setAddDuration] = useState('60');
  const [addJoinTime, setAddJoinTime] = useState('18:00');
  const [addRole, setAddRole] = useState('member');

  const { getStorageKey } = useOrg();

  // Sync state if modal is opened or props change
  React.useEffect(() => {
    if (isOpen && meeting) {
      setLocalParticipants(resolveInitialParticipants(meeting, members, participants, localThreshold, supervisors, getStorageKey));
    }
  }, [isOpen, meeting, participants, members, supervisors, getStorageKey]);

  React.useEffect(() => {
    setLocalThreshold(minDurationThreshold);
  }, [minDurationThreshold]);

  // Recalculate local participants when threshold changes inside modal
  const handleLocalThresholdChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setLocalThreshold(num);
    if (onThresholdChange) onThresholdChange(num);

    setLocalParticipants(prev =>
      prev.map(p => {
        if (p.role === 'supervisor' || p.role === 'speaker' || p.role === 'guest') return p;
        const isOver = p.durationMinutes >= num;
        const approved = p.hasManualOverride ? p.manualApproved : isOver;
        let status = 'approved';
        if (!approved) status = 'rejected_short_time';
        if (!p.member && !isMonikaLyniewska(p.rawName)) status = approved ? 'approved_unmatched' : 'unmatched';

        return {
          ...p,
          isEligible: isOver,
          manualApproved: approved,
          status,
        };
      })
    );
  };

  // Set explicit approval (true/false)
  const handleSetApproval = (participantId, isApproved) => {
    setLocalParticipants(prev =>
      prev.map(p => {
        if (p.id !== participantId) return p;
        let nextStatus = isApproved ? 'approved' : 'rejected_short_time';
        if (p.role === 'supervisor') nextStatus = 'supervisor';
        else if (p.role === 'speaker') nextStatus = 'speaker';
        else if (p.role === 'guest') nextStatus = 'guest';
        else if (!p.member && !isMonikaLyniewska(p.rawName)) nextStatus = isApproved ? 'approved_unmatched' : 'unmatched';

        return {
          ...p,
          manualApproved: isApproved,
          hasManualOverride: true,
          status: nextStatus,
        };
      })
    );
  };

  // Set participant role (member, supervisor, speaker, guest)
  const handleSetParticipantRole = (participantId, newRole) => {
    setLocalParticipants(prev =>
      prev.map(p => {
        if (p.id !== participantId) return p;

        if (newRole === 'supervisor') {
          return {
            ...p,
            role: 'supervisor',
            isGuest: false,
            manualApproved: true,
            status: 'supervisor',
          };
        }
        if (newRole === 'speaker') {
          return {
            ...p,
            role: 'speaker',
            isGuest: false,
            manualApproved: true,
            status: 'speaker',
          };
        }
        if (newRole === 'guest') {
          return {
            ...p,
            role: 'guest',
            isGuest: true,
            member: null,
            manualApproved: false,
            status: 'guest',
          };
        }

        // Standard student member
        const isOver = p.durationMinutes >= localThreshold;
        const isAppr = p.hasManualOverride ? p.manualApproved : isOver;
        return {
          ...p,
          role: 'member',
          isGuest: false,
          manualApproved: isAppr,
          status: (p.member || isMonikaLyniewska(p.rawName)) ? (isAppr ? 'approved' : 'rejected_short_time') : 'unmatched',
        };
      })
    );
  };

  // Assign participant to a known member from the 141 database
  const handleAssignMember = (participantId, memberId) => {
    const targetMember = members.find(m => m.id === memberId || m.index === memberId) || getCustomMappedMember(memberId);
    if (!targetMember) return;

    setLocalParticipants(prev =>
      prev.map(p => {
        if (p.id !== participantId) return p;

        return {
          ...p,
          member: targetMember,
          role: 'member',
          isGuest: false,
          manualApproved: true,
          hasManualOverride: true,
          status: 'approved',
        };
      })
    );

    setSelectedAssignee(prev => ({ ...prev, [participantId]: '' }));
  };

  // Unlink member from participant
  const handleUnlinkMember = (participantId) => {
    setLocalParticipants(prev =>
      prev.map(p => {
        if (p.id !== participantId) return p;
        return {
          ...p,
          member: null,
          role: 'member',
          isGuest: false,
          status: p.manualApproved ? 'approved_unmatched' : 'unmatched',
        };
      })
    );
  };

  // Add new participant manually
  const handleAddParticipantSubmit = (e) => {
    e.preventDefault();
    if (!addMemberId) return;

    const targetMember = members.find(m => m.id === addMemberId || m.index === addMemberId) || getCustomMappedMember(addMemberId);
    if (!targetMember) return;

    const dur = parseInt(addDuration, 10) || 60;
    const isOver = dur >= localThreshold;
    const name = targetMember.fullName || `${targetMember.firstName} ${targetMember.lastName}`;

    const newParticipant = {
      id: `manual_${Date.now()}_${targetMember.index}`,
      rawName: name,
      joinTime: addJoinTime || '18:00',
      durationStr: `${dur} min`,
      durationMinutes: dur,
      member: targetMember,
      role: addRole || 'member',
      isGuest: false,
      isEligible: isOver,
      manualApproved: true,
      hasManualOverride: true,
      status: 'approved',
    };

    setLocalParticipants(prev => [newParticipant, ...prev]);
    setIsAddFormOpen(false);
    setAddMemberId('');
    setAddDuration('60');
  };

  // List of faculty supervisors present on this meeting
  const supervisorsPresent = useMemo(() => {
    return localParticipants.filter(p => p.role === 'supervisor' || isFacultySupervisor(p.rawName));
  }, [localParticipants]);

  // Helper to determine if participant has approved attendance ("Zaliczono")
  const isApprovedParticipant = (p) => {
    if (p.role === 'supervisor' || isFacultySupervisor(p.rawName)) return true;
    if (p.role === 'speaker') return true;
    if (p.manualApproved !== undefined) return Boolean(p.manualApproved);
    return Boolean(p.isEligible || p.status === 'approved' || p.status === 'Zaliczona');
  };

  // Helper to determine if participant is an approved student member
  const isApprovedStudent = (p) => {
    if (p.role === 'supervisor' || p.role === 'speaker' || p.role === 'guest' || p.isGuest) return false;
    const isApproved = p.manualApproved !== undefined ? p.manualApproved : (p.isEligible || p.status === 'approved' || p.status === 'Zaliczona');
    return isApproved && (!!p.member || isMonikaLyniewska(p.rawName));
  };

  // Sorted and Filtered Participants (Strict Polish Alphabetical Order)
  const sortedAndFilteredParticipants = useMemo(() => {
    const filtered = localParticipants.filter(p => {
      // 1. Tab filter
      if (activeFilter === 'approved') {
        if (!isApprovedParticipant(p)) return false;
      } else if (activeFilter === 'member') {
        if (!isApprovedStudent(p)) return false;
      } else if (activeFilter === 'supervisor') {
        if (p.role !== 'supervisor' && !isFacultySupervisor(p.rawName)) return false;
      } else if (activeFilter === 'speaker') {
        if (p.role !== 'speaker') return false;
      } else if (activeFilter === 'guest') {
        if (p.role !== 'guest' && !p.isGuest) return false;
      } else if (activeFilter === 'short_time') {
        if (p.role === 'supervisor' || p.role === 'speaker' || p.role === 'guest' || p.isGuest || (p.durationMinutes >= localThreshold || p.manualApproved)) return false;
      } else if (activeFilter === 'unmatched') {
        if (p.role === 'supervisor' || p.role === 'speaker' || p.role === 'guest' || p.isGuest || p.member || isMonikaLyniewska(p.rawName)) return false;
      }

      // 2. Query search
      if (!searchQuery.trim()) return true;
      const q = normalizeDiacritics(searchQuery);
      const raw = normalizeDiacritics(p.rawName);
      const memberName = p.member ? normalizeDiacritics(p.member.fullName || `${p.member.firstName} ${p.member.lastName}`) : '';
      const index = p.member?.index ? String(p.member.index).toLowerCase() : '';
      const email = p.member?.email ? normalizeDiacritics(p.member.email) : '';

      return raw.includes(q) || memberName.includes(q) || index.includes(q) || email.includes(q);
    });

    // Alphabetical sort by Polish collation
    return [...filtered].sort((a, b) => {
      const nameA = (a.member ? (a.member.fullName || `${a.member.firstName} ${a.member.lastName}`) : (a.rawName || '')).trim();
      const nameB = (b.member ? (b.member.fullName || `${b.member.firstName} ${b.member.lastName}`) : (b.rawName || '')).trim();
      return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
    });
  }, [localParticipants, activeFilter, searchQuery, localThreshold]);

  // Statistics (Aggregated by status "Zaliczono")
  const countApprovedTotal = localParticipants.filter(isApprovedParticipant).length;
  const countApprovedMembers = localParticipants.filter(isApprovedStudent).length;
  const countSupervisors = localParticipants.filter(p => p.role === 'supervisor' || isFacultySupervisor(p.rawName)).length;
  const countSpeakers = localParticipants.filter(p => p.role === 'speaker').length;
  const countGuests = localParticipants.filter(p => p.role === 'guest' || p.isGuest).length;
  const countShortTime = localParticipants.filter(p => (p.role === 'member' || !p.role) && !p.isGuest && !isFacultySupervisor(p.rawName) && p.durationMinutes < localThreshold && !p.manualApproved).length;
  const countUnmatched = localParticipants.filter(p => (p.role === 'member' || !p.role) && !p.member && !p.isGuest && !isFacultySupervisor(p.rawName) && !isMonikaLyniewska(p.rawName)).length;
  const totalCount = localParticipants.length;

  // Save changes
  const handleSaveAndApply = () => {
    // Student members count towards student attendance denominator in ManagementTab
    const confirmedIndexes = localParticipants
      .filter(isApprovedStudent)
      .map(p => p.member?.index || (isMonikaLyniewska(p.rawName) ? '34327' : (p.rawName.match(/\d{4,6}/)?.[0] || '')))
      .filter(Boolean);

    const payload = {
      meetingId: meeting.id || meeting.date,
      meetingDate: meeting.date,
      attendees: localParticipants,
      confirmedIndexes: confirmedIndexes,
      confirmedCount: countApprovedTotal,
      supervisors: supervisorsPresent.map(s => s.rawName),
      savedAt: new Date().toISOString(),
    };

    const keys = [
      getStorageKey(`crm_attendance_${meeting.id || meeting.date}`),
      meeting.id ? getStorageKey(`crm_attendance_${meeting.id}`) : null,
      meeting.date ? getStorageKey(`crm_attendance_${meeting.date}`) : null,
      meeting.code ? getStorageKey(`crm_attendance_${meeting.code}`) : null,
    ].filter(Boolean);

    keys.forEach(k => {
      try {
        localStorage.setItem(k, JSON.stringify(payload));
      } catch {}
    });

    if (onSaveAttendance) {
      onSaveAttendance(meeting.id || meeting.date, confirmedIndexes, localParticipants, payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-[96vw] max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative">
        
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Stable sized Badge */}
            <div className="h-12 px-3.5 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0 font-mono tracking-tight text-center">
              {meeting.code || 'SPOTKANIE'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-snug truncate">
                  {meeting.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                  Weryfikacja obecności
                </span>
                {supervisorsPresent.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs shrink-0">
                    <GraduationCap size={13} className="text-indigo-600" />
                    <span>Opiekunowie: <strong>{supervisorsPresent.map(s => s.rawName).join(', ')}</strong></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono truncate">
                <Calendar size={12} className="text-slate-400 shrink-0" />
                <span>{meeting.formattedDate || meeting.date}</span>
                {meeting.who && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-sans text-slate-600 flex items-center gap-1 truncate">
                      <User size={11} className="shrink-0" /> {meeting.who}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap shrink-0">
            {/* ➕ Dodaj osobę ręcznie button */}
            <button
              type="button"
              onClick={() => setIsAddFormOpen(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="Ręcznie dopisz osobę do listy"
            >
              <UserPlus size={13} />
              <span>➕ Dodaj osobę</span>
            </button>

            {/* Threshold Selector: 10m, 15m, 20m, 30m, 45m, 60m */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-2xs">
              <Timer size={13} className="text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-600">Próg:</span>
              <div className="flex items-center gap-1">
                {[10, 15, 20, 30, 45, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleLocalThresholdChange(m)}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                      localThreshold === m
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Add Participant Modal Drawer ─────────────────────────────────── */}
        {isAddFormOpen && (
          <div className="p-4 bg-purple-50/95 border-b border-purple-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
              <UserPlus size={16} className="text-purple-700 shrink-0" />
              <span>Dopisz uczestnika do listy:</span>
            </div>

            <form onSubmit={handleAddParticipantSubmit} className="flex items-center gap-2.5 flex-wrap flex-1 md:justify-end">
              <MemberAutocomplete
                members={members}
                value={addMemberId}
                onChange={val => setAddMemberId(val)}
                placeholder="Wpisz imię, nazwisko lub nr indeksu (141 osób)..."
                className="flex-1 max-w-sm"
              />

              <div className="flex items-center gap-1 bg-white border border-purple-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
                <Clock size={13} className="text-purple-600" />
                <input
                  id="add-participant-duration"
                  name="addParticipantDuration"
                  type="number"
                  min="1"
                  max="300"
                  value={addDuration}
                  onChange={e => setAddDuration(e.target.value)}
                  placeholder="Minuty"
                  className="w-12 text-center font-bold text-slate-800 outline-none"
                />
                <span className="text-[11px] text-slate-400 font-semibold">min</span>
              </div>

              <select
                value={addRole}
                onChange={e => setAddRole(e.target.value)}
                className="text-xs font-bold border border-purple-300 rounded-xl px-2.5 py-1.5 bg-white text-purple-900 shadow-2xs"
              >
                <option value="member">🟢 Członek koła</option>
                <option value="supervisor">🎓 Opiekun Koła</option>
                <option value="speaker">🎤 Prelegent</option>
                <option value="guest">👤 Gość</option>
              </select>

              <button
                type="submit"
                disabled={!addMemberId}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
              >
                Dopisz
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddFormOpen(false);
                  setAddMemberId('');
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
              >
                Anuluj
              </button>
            </form>
          </div>
        )}

        {/* ── KPI Summary Cards Bar ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50/60 border-b border-slate-100 shrink-0">
          {/* 1. Approved Attendance (All with status Zaliczono) */}
          <div
            onClick={() => setActiveFilter('approved')}
            className={`p-3 rounded-2xl border shadow-2xs flex items-center gap-3 cursor-pointer transition ${
              activeFilter === 'approved' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-emerald-100 hover:bg-emerald-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-none">{countApprovedTotal}</p>
              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">Zaliczonych obecności</p>
            </div>
          </div>

          {/* 2. Supervisors */}
          <div
            onClick={() => setActiveFilter('supervisor')}
            className={`p-3 rounded-2xl border shadow-2xs flex items-center gap-3 cursor-pointer transition ${
              activeFilter === 'supervisor' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200' : 'bg-white border-indigo-100 hover:bg-indigo-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-none">{countSupervisors}</p>
              <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">Opiekunowie Koła</p>
            </div>
          </div>

          {/* 3. Speakers & Guests */}
          <div
            onClick={() => setActiveFilter('speaker')}
            className={`p-3 rounded-2xl border shadow-2xs flex items-center gap-3 cursor-pointer transition ${
              activeFilter === 'speaker' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-amber-100 hover:bg-amber-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Mic size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-none">{countSpeakers + countGuests}</p>
              <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Prelegenci / Goście</p>
            </div>
          </div>

          {/* 4. Short Time */}
          <div
            onClick={() => setActiveFilter('short_time')}
            className={`p-3 rounded-2xl border shadow-2xs flex items-center gap-3 cursor-pointer transition ${
              activeFilter === 'short_time' ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200' : 'bg-white border-rose-100 hover:bg-rose-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-none">{countShortTime}</p>
              <p className="text-[11px] font-semibold text-rose-700 mt-0.5">Czas &lt; {localThreshold}m</p>
            </div>
          </div>

          {/* 5. Total Logged */}
          <div
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-2xl border shadow-2xs flex items-center gap-3 cursor-pointer transition ${
              activeFilter === 'all' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-200' : 'bg-white border-purple-100 hover:bg-purple-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-none">{totalCount}</p>
              <p className="text-[11px] font-semibold text-purple-700 mt-0.5">Wszystkich w logach</p>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Tabs Bar ─────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="modal-search-participants"
              name="modalSearchParticipants"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filtruj po nazwisku, indeksie lub tekście z Meet..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Filter Pills */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wszyscy ({totalCount})
            </button>

            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'approved' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟢 Zaliczono ({countApprovedTotal})
            </button>

            <button
              onClick={() => setActiveFilter('supervisor')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'supervisor' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 Opiekunowie ({countSupervisors})
            </button>

            {countSpeakers > 0 && (
              <button
                onClick={() => setActiveFilter('speaker')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'speaker' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎤 Prelegenci ({countSpeakers})
              </button>
            )}

            {countGuests > 0 && (
              <button
                onClick={() => setActiveFilter('guest')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'guest' ? 'bg-white text-purple-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👤 Goście ({countGuests})
              </button>
            )}

            {countShortTime > 0 && (
              <button
                onClick={() => setActiveFilter('short_time')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'short_time' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚠️ Krótki czas ({countShortTime})
              </button>
            )}

            {countUnmatched > 0 && (
              <button
                onClick={() => setActiveFilter('unmatched')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'unmatched' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ❓ Do dopasowania ({countUnmatched})
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable Participants Table Area ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 p-6">
          {sortedAndFilteredParticipants.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <Users size={40} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Brak osób spełniających wybrane kryteria</p>
              <p className="text-xs text-slate-400 mt-1">Zmień filtr lub wpisaną frazę w wyszukiwarce</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-600 font-semibold border-b border-slate-200 z-20">
                  <tr>
                    <th className="p-3 w-10 text-center">LP.</th>
                    <th className="p-3 min-w-[170px]">Wpis z Meet / Uczestnik</th>
                    <th className="p-3 w-32">Rola na Spotkaniu</th>
                    <th className="p-3 min-w-[190px]">Powiązany Profil (Baza 141)</th>
                    <th className="p-3 text-center w-20">Wejście</th>
                    <th className="p-3 text-center w-24">Czas</th>
                    <th className="p-3 text-center w-24">Status</th>
                    <th className="p-3 w-48 text-center">Dodatkowe Aktywności</th>
                    <th className="p-3 text-center w-20">Punkty</th>
                    <th className="p-3 text-right w-36">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAndFilteredParticipants.map((p, idx) => {
                    const isSupervisorRole = p.role === 'supervisor' || isFacultySupervisor(p.rawName);
                    const isSpeakerRole = p.role === 'speaker';
                    const isGuestRole = p.role === 'guest';
                    const isMemberRole = !isSupervisorRole && !isSpeakerRole && !isGuestRole;

                    const isApproved = p.manualApproved !== undefined ? p.manualApproved : (p.isEligible || p.status === 'approved' || p.status === 'Zaliczona');
                    const isShortTime = isMemberRole && p.durationMinutes < localThreshold;
                    const isUnmatched = isMemberRole && !p.member && !isMonikaLyniewska(p.rawName);

                    const isStationaryMeeting = meeting.location && (
                      meeting.location.toLowerCase().includes('stacjon') ||
                      meeting.location.toLowerCase().includes('sala') ||
                      meeting.location.toLowerCase().includes('warszaw') ||
                      meeting.location.toLowerCase().includes('kampus')
                    );

                    const extraActs = Array.isArray(p.activities) ? p.activities : [];
                    let pointsForMeeting = 0;
                    if (isMemberRole && isApproved) {
                      if (isStationaryMeeting || extraActs.includes('OB_STACJO')) {
                        pointsForMeeting += (weights?.OB_STACJO?.points || 2);
                      } else {
                        pointsForMeeting += (weights?.OB_ONLINE?.points || 1);
                      }
                    }
                    extraActs.forEach(actId => {
                      if (actId === 'OB_STACJO') return;
                      const opt = ACTIVITY_OPTIONS.find(o => o.id === actId);
                      pointsForMeeting += (weights?.[actId]?.points || opt?.points || 0);
                    });

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isSupervisorRole
                            ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                            : isSpeakerRole
                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                            : isGuestRole
                            ? 'bg-purple-50/30 hover:bg-purple-50/60'
                            : isUnmatched
                            ? 'bg-amber-50/50 hover:bg-amber-50/80'
                            : isApproved
                            ? 'bg-white hover:bg-slate-50/70'
                            : 'bg-rose-50/30 hover:bg-rose-50/60'
                        }`}
                      >
                        {/* 1. LP */}
                        <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* 2. Raw Name from List */}
                        <td className="p-3">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {p.rawName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isSupervisorRole
                              ? '🎓 Oficjalny Opiekun Koła'
                              : isSpeakerRole
                              ? '🎤 Prelegent spotkania'
                              : isGuestRole
                              ? '👤 Gość zewnętrzny'
                              : 'Wpis ze spotkania'}
                          </p>
                        </td>

                        {/* 3. Role Selector */}
                        <td className="p-3">
                          <select
                            value={p.role || 'member'}
                            onChange={e => handleSetParticipantRole(p.id, e.target.value)}
                            className="w-full text-[11px] font-bold border border-slate-200 rounded-xl px-2 py-1 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-300 cursor-pointer shadow-2xs"
                          >
                            <option value="member">🟢 Członek koła</option>
                            <option value="supervisor">🎓 Opiekun Koła</option>
                            <option value="speaker">🎤 Prelegent</option>
                            <option value="guest">👤 Gość</option>
                          </select>
                        </td>

                        {/* 4. Matched Member / Matcher */}
                        <td className="p-3">
                          {isSupervisorRole ? (
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 p-2 rounded-xl text-indigo-900">
                              <GraduationCap size={16} className="text-indigo-600 shrink-0" />
                              <div>
                                <p className="font-bold text-xs leading-tight">{p.rawName}</p>
                                <p className="text-[10px] text-indigo-600 font-medium">Opiekun Koła Naukowego</p>
                              </div>
                            </div>
                          ) : isSpeakerRole ? (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 rounded-xl text-amber-900">
                              <Mic size={16} className="text-amber-600 shrink-0" />
                              <div>
                                <p className="font-bold text-xs leading-tight">{p.rawName}</p>
                                <p className="text-[10px] text-amber-700 font-medium">Prelegent / Wykładowca</p>
                              </div>
                            </div>
                          ) : isGuestRole ? (
                            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 p-2 rounded-xl text-purple-900">
                              <User size={16} className="text-purple-600 shrink-0" />
                              <div>
                                <p className="font-bold text-xs leading-tight">Gość zewnętrzny</p>
                                <p className="text-[10px] text-purple-600">Nie podlega frekwencji</p>
                              </div>
                            </div>
                          ) : p.member ? (
                            <div className="flex items-center justify-between gap-2 bg-emerald-50/70 border border-emerald-200 p-2 rounded-xl">
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate leading-tight">
                                  {p.member.fullName || `${p.member.firstName} ${p.member.lastName}`}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                  <span>Nr: <strong>{p.member.index}</strong></span>
                                  {p.member.field && <span>• {p.member.field}</span>}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnlinkMember(p.id)}
                                className="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded hover:bg-white transition cursor-pointer"
                                title="Odłącz powiązanie z tym studentem"
                              >
                                Rozłącz
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <MemberAutocomplete
                                members={members}
                                value={selectedAssignee[p.id] || ''}
                                onChange={val => {
                                  if (val) handleAssignMember(p.id, val);
                                }}
                                placeholder="Wybierz studenta (141 osób)..."
                                className="w-full"
                              />
                            </div>
                          )}
                        </td>

                        {/* 5. Join Time */}
                        <td className="p-3 text-center font-mono text-[11px] text-slate-600">
                          {p.joinTime || '—'}
                        </td>

                        {/* 6. Duration */}
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono border ${
                            isShortTime
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            <Clock size={11} />
                            <span>{p.durationStr || `${p.durationMinutes} min`}</span>
                          </span>
                        </td>

                        {/* 7. Status Badge */}
                        <td className="p-3 text-center">
                          {isSupervisorRole ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              🎓 Opiekun
                            </span>
                          ) : isSpeakerRole ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              🎤 Prelegent
                            </span>
                          ) : isGuestRole ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              👤 Gość
                            </span>
                          ) : isUnmatched ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <HelpCircle size={11} /> Brak w bazie
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={11} /> Zaliczona
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle size={11} /> Za krótko
                            </span>
                          )}
                        </td>

                        {/* 8. DODATKOWE AKTYWNOŚCI (Multi-select Checkbox Popover) */}
                        <td className="p-3 relative text-center">
                          {isSupervisorRole || isGuestRole ? (
                            <span className="text-[11px] text-slate-300 italic">—</span>
                          ) : (
                            <div className="relative inline-block w-full">
                              <button
                                type="button"
                                onClick={() => setOpenActivityPopoverId(openActivityPopoverId === p.id ? null : p.id)}
                                className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border flex items-center justify-between gap-1 transition shadow-2xs cursor-pointer ${
                                  extraActs.length > 0
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span className="flex items-center gap-1 truncate">
                                  <span>🏷️</span>
                                  <span>
                                    {extraActs.length > 0
                                      ? `${extraActs.length} wybrane`
                                      : 'Wybierz aktywność'}
                                  </span>
                                </span>
                                <ChevronDown size={12} className={`shrink-0 transition-transform ${openActivityPopoverId === p.id ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
                              </button>

                              {/* Dropdown Popover */}
                              {openActivityPopoverId === p.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setOpenActivityPopoverId(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-40 animate-in fade-in zoom-in-95 duration-100 space-y-1 text-left">
                                    <div className="px-1 py-1 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700">
                                      <span>Aktywności na spotkaniu:</span>
                                      <button
                                        type="button"
                                        onClick={() => setOpenActivityPopoverId(null)}
                                        className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
                                      {ACTIVITY_OPTIONS.map(opt => {
                                        const isChecked = extraActs.includes(opt.id);
                                        const pts = weights?.[opt.id]?.points || opt.points;
                                        return (
                                          <label
                                            key={opt.id}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                                              isChecked
                                                ? 'bg-indigo-50 text-indigo-900 font-bold'
                                                : 'hover:bg-slate-50 text-slate-700 font-medium'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleActivity(p.id, opt.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-400 shrink-0 cursor-pointer"
                                              />
                                              <span className="truncate">{opt.icon} {opt.label}</span>
                                            </div>
                                            <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded font-mono font-bold text-indigo-600 shrink-0 shadow-2xs">
                                              +{pts} pkt
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 9. Punkty za spotkanie */}
                        <td className="p-3 text-center">
                          {isSupervisorRole || isGuestRole ? (
                            <span className="text-[11px] text-slate-300 italic">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-xl text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs" title={`Łącznie naliczonych punktów za to spotkanie: +${pointsForMeeting} pkt`}>
                              +{pointsForMeeting} pkt
                            </span>
                          )}
                        </td>

                        {/* 10. Action Toggle */}
                        <td className="p-3 text-right">
                          {isSupervisorRole || isSpeakerRole ? (
                            <span className="text-[11px] text-slate-400 font-medium">Protokół</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetApproval(p.id, true)}
                                className={`px-2 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                  isApproved
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                <Check size={11} />
                                <span>Zalicz</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetApproval(p.id, false)}
                                className={`px-2 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                  !isApproved
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                }`}
                              >
                                <X size={11} />
                                <span>Odrzuć</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Modal Footer Bar ─────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Podsumowanie do zapisu: <strong className="text-emerald-700 font-bold">{countApprovedTotal}</strong> zaliczonych obecności (w tym {countApprovedMembers} członków koła, {countSupervisors} opiekunów).
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
            >
              <Save size={14} />
              <span>Zapisz i przelicz frekwencję koła ({countApprovedTotal})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
