import { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Play,
  CheckCircle2,
  Circle,
  RefreshCw,
  Calendar,
  MapPin,
  Sparkles,
  Clock,
  User,
  Tag,
  Timer,
  Sliders,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  RotateCcw,
  FileText,
  Printer,
  Plus,
  Minus,
  Save,
  FolderPlus,
  Edit3,
  Trash2,
  Undo2,
} from 'lucide-react';
import { MEETING_TYPES, getMeetingType } from '../utils/meetingTypes';
import { parseAttendanceLine, parseDurationToMinutes, fetchMeetingSheetAttendance } from '../services/googleSheets';
import { isFacultySupervisor, isMonikaLyniewska, FACULTY_SUPERVISORS, PARTICIPANT_ROLES } from '../utils/specialRoles';
import { useOrg } from '../context/OrgContext';
import AttendanceModal from './AttendanceModal';
import CalendarSelector, { PSYCHOONKOLOGIA_SUBCALENDAR_ID } from './CalendarSelector';
import { OfficialMeetingMinutesTemplate } from './DocumentTemplates';
import {
  getMeetingProtocol,
  saveMeetingProtocol,
  addDocumentToRegistry,
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

export default function MeetingsTab({
  meetings = [],
  members = [],
  onMarkAttendance,
  subcalendars = [],
  selectedSubcalendar,
  onSubcalendarChange,
  onRefreshMeetings,
  loadingMeetings,
  academicYear,
  onAcademicYearChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
}) {
  const { currentOrg, getStorageKey } = useOrg();
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [rawList, setRawList]   = useState('');
  const [results, setResults]   = useState(null);
  const [parsedParticipants, setParsedParticipants] = useState([]);
  const [manualOverrides, setManualOverrides] = useState({});
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Protocol / Meeting Minutes state
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [isPrintingProtocol, setIsPrintingProtocol] = useState(false);
  const [protocolSaveStatus, setProtocolSaveStatus] = useState(null);
  const [protocolForm, setProtocolForm] = useState({
    protocolNumber: '',
    date: '',
    time: '18:00 - 19:30',
    location: 'Google Meet / MS Teams',
    title: '',
    speaker: '',
    attendeesCount: 0,
    recorder: 'Zarząd Koła Naukowego',
    agenda: '',
    content: '',
    conclusions: '',
    includeAttendeesList: true,
    attendees: [],
  });

  // Attendance threshold in minutes (default: 15 minutes)
  const [minDurationThreshold, setMinDurationThreshold] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey('crm_meeting_min_duration'));
      if (saved) return parseInt(saved, 10) || 15;
    } catch {}
    return 15;
  });

  const handleThresholdChange = (newThreshold) => {
    const val = Math.max(1, parseInt(newThreshold, 10) || 1);
    setMinDurationThreshold(val);
    try {
      localStorage.setItem(getStorageKey('crm_meeting_min_duration'), String(val));
    } catch {}

    // Re-evaluate participants if already processed
    if (parsedParticipants.length > 0) {
      recalculateAttendance(parsedParticipants, manualOverrides, val);
    }
  };

  // Persistent custom meeting categories (localStorage)
  const [customTypes, setCustomTypes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey('crm_meeting_types')) || '{}');
    } catch {
      return {};
    }
  });

  // ── Soft Delete (Trash) and Custom Meetings & Overrides state ──────────────
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCodeValue, setEditedCodeValue] = useState('');
  const [meetingToTrash, setMeetingToTrash] = useState(null);
  const [meetingToPermanentDelete, setMeetingToPermanentDelete] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    code: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    time: '18:00 - 19:30',
    speaker: '',
    defaultType: 'mandatory',
  });

  // Storage data for Trash, Custom Meetings and Overrides
  const [trashList, setTrashList] = useState(() => {
    return getMeetingsTrash(currentOrg?.id || 'default');
  });

  const [customMeetings, setCustomMeetings] = useState(() => {
    return getCustomMeetings(currentOrg?.id || 'default');
  });

  const [meetingOverrides, setMeetingOverrides] = useState(() => {
    return getMeetingOverrides(currentOrg?.id || 'default');
  });

  useEffect(() => {
    const orgId = currentOrg?.id || 'default';
    setTrashList(getMeetingsTrash(orgId));
    setCustomMeetings(getCustomMeetings(orgId));
    setMeetingOverrides(getMeetingOverrides(orgId));
  }, [currentOrg?.id]);

  // Compute all effective meetings combining props + custom meetings + overrides
  const allEffectiveMeetings = useMemo(() => {
    const combined = [...meetings];

    customMeetings.forEach(cm => {
      const idx = combined.findIndex(m => m.id === cm.id || (m.code && cm.code && m.code === cm.code));
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], ...cm };
      } else {
        combined.push(cm);
      }
    });

    return combined.map(m => {
      const mId = m.id || m.code;
      const ov = (m.id && meetingOverrides[m.id]) || (m.code && meetingOverrides[m.code]) || meetingOverrides[mId];
      if (ov) {
        return {
          ...m,
          ...ov,
          code: ov.code || m.code,
        };
      }
      return m;
    });
  }, [meetings, customMeetings, meetingOverrides]);

  const trashKeySet = useMemo(() => {
    const s = new Set();
    trashList.forEach(t => {
      if (t.id) s.add(String(t.id).trim());
      if (t.code) s.add(String(t.code).trim());
      if (t.date) s.add(String(t.date).trim());
    });
    return s;
  }, [trashList]);

  const activeMeetings = useMemo(() => {
    return allEffectiveMeetings.filter(m => {
      const idMatch = m.id && trashKeySet.has(String(m.id).trim());
      const codeMatch = m.code && trashKeySet.has(String(m.code).trim());
      const dateMatch = m.date && trashKeySet.has(String(m.date).trim());
      return !idMatch && !codeMatch && !dateMatch;
    });
  }, [allEffectiveMeetings, trashKeySet]);

  // Keep selectedMeeting synced with latest overrides
  const currentSelectedMeeting = useMemo(() => {
    if (!selectedMeeting) return null;
    const mId = selectedMeeting.id || selectedMeeting.code;
    const ov = (selectedMeeting.id && meetingOverrides[selectedMeeting.id]) ||
               (selectedMeeting.code && meetingOverrides[selectedMeeting.code]) ||
               meetingOverrides[mId];
    if (ov) {
      return { ...selectedMeeting, ...ov, code: ov.code || selectedMeeting.code };
    }
    return selectedMeeting;
  }, [selectedMeeting, meetingOverrides]);

  useEffect(() => {
    if (!selectedMeeting && activeMeetings.length > 0) {
      handleSelectMeeting(activeMeetings[0]);
    }
  }, [activeMeetings, selectedMeeting]);

  const handleOpenAddModal = () => {
    const existingCodes = allEffectiveMeetings
      .map(m => String(m.code || m.id || '').replace(/\D/g, ''))
      .filter(Boolean)
      .map(Number);
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextCode = `M${String(maxNum + 1).padStart(2, '0')}`;

    setNewMeetingForm({
      code: nextCode,
      title: '',
      date: new Date().toISOString().slice(0, 10),
      time: '18:00 - 19:30',
      speaker: '',
      defaultType: 'mandatory',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewMeeting = (e) => {
    if (e) e.preventDefault();
    if (!newMeetingForm.title.trim()) {
      alert('Wprowadź tytuł spotkania.');
      return;
    }

    const cleanCode = (newMeetingForm.code.trim() || `M${allEffectiveMeetings.length + 1}`).toUpperCase().replace(/[\[\]]/g, '');
    const newMeetingId = `custom_${Date.now()}`;
    const newMeeting = {
      id: newMeetingId,
      code: cleanCode,
      title: newMeetingForm.title.trim(),
      date: newMeetingForm.date,
      time: newMeetingForm.time,
      formattedDate: `${newMeetingForm.date}, ${newMeetingForm.time}`,
      speaker: newMeetingForm.speaker.trim() || 'Prelegent / Zarząd Koła',
      academicYear: academicYear || '2025/2026',
      type: newMeetingForm.defaultType,
      isCustom: true,
      isUpcoming: new Date(newMeetingForm.date) >= new Date(),
      attendees: [],
      participantRecords: [],
    };

    const orgId = currentOrg?.id || 'default';
    const updated = saveCustomMeeting(orgId, newMeeting);
    setCustomMeetings(updated);

    if (newMeetingForm.defaultType) {
      const newCustomTypes = { ...customTypes, [newMeetingId]: newMeetingForm.defaultType, [cleanCode]: newMeetingForm.defaultType };
      setCustomTypes(newCustomTypes);
      try {
        localStorage.setItem(getStorageKey('crm_meeting_types'), JSON.stringify(newCustomTypes));
      } catch {}
    }

    setIsAddModalOpen(false);
    setSelectedMeeting(newMeeting);
    setViewMode('active');
  };

  const handleSaveEditedCode = () => {
    if (!currentSelectedMeeting) return;
    const cleanNewCode = editedCodeValue.trim().toUpperCase().replace(/[\[\]]/g, '');
    if (!cleanNewCode) {
      setIsEditingCode(false);
      return;
    }

    const oldCode = String(currentSelectedMeeting.code || currentSelectedMeeting.id).trim().replace(/[\[\]]/g, '');
    if (cleanNewCode === oldCode) {
      setIsEditingCode(false);
      return;
    }

    const orgId = currentOrg?.id || 'default';
    const meetingKey = currentSelectedMeeting.id || currentSelectedMeeting.code;

    const updatedOverrides = saveMeetingOverride(orgId, meetingKey, {
      code: cleanNewCode,
      oldCode: oldCode,
    });
    setMeetingOverrides(updatedOverrides);

    setSelectedMeeting(prev => ({
      ...prev,
      code: cleanNewCode,
    }));

    setIsEditingCode(false);
  };

  const handleConfirmMoveToTrash = () => {
    if (!meetingToTrash) return;
    const orgId = currentOrg?.id || 'default';

    const updatedTrash = addMeetingToTrash(orgId, meetingToTrash);
    setTrashList(updatedTrash);

    if (selectedMeeting && (selectedMeeting.id === meetingToTrash.id || selectedMeeting.code === meetingToTrash.code)) {
      setSelectedMeeting(null);
    }

    setMeetingToTrash(null);
  };

  const handleRestoreMeeting = (m) => {
    if (!m) return;
    const orgId = currentOrg?.id || 'default';
    const mId = m.id || m.code;

    const { updatedTrash, restoredMeeting } = restoreMeetingFromTrash(orgId, mId);
    setTrashList(updatedTrash);

    if (restoredMeeting) {
      setSelectedMeeting(restoredMeeting);
      setViewMode('active');
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (!meetingToPermanentDelete) return;
    const orgId = currentOrg?.id || 'default';
    const mId = meetingToPermanentDelete.id || meetingToPermanentDelete.code;

    const updatedTrash = permanentlyDeleteMeetingFromTrash(orgId, mId);
    setTrashList(updatedTrash);

    if (meetingToPermanentDelete.isCustom) {
      const updatedCustom = deleteCustomMeeting(orgId, mId);
      setCustomMeetings(updatedCustom);
    }

    if (selectedMeeting && (selectedMeeting.id === mId || selectedMeeting.code === mId)) {
      setSelectedMeeting(null);
    }

    setMeetingToPermanentDelete(null);
  };

  function getMeetingStorageKey(m) {
    if (!m) return '';
    return getStorageKey(`crm_attendance_${m.id || m.date || m.code}`);
  }

  function getSavedMeetingAttendance(m) {
    if (!m) return null;
    const keys = [
      getStorageKey(`crm_attendance_${m.id}`),
      getStorageKey(`crm_attendance_${m.date}`),
      m.code ? getStorageKey(`crm_attendance_${m.code}`) : null,
      `crm_attendance_${m.id}`,
      `crm_attendance_${m.date}`,
      m.code ? `crm_attendance_${m.code}` : null,
      `attendance_${m.id}`,
      `attendance_${m.date}`,
    ].filter(Boolean);

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) return parsed;
        }
      } catch {}
    }
    return null;
  }

  function handleSelectMeeting(m) {
    setSelectedMeeting(m);
    setResults(null);
    setSheetFeedback(null);

    const mId = m.id || m.code || m.date;
    const listKey = getStorageKey(`meeting_${mId}_list`);

    // 1. Try reading saved raw text from org-scoped localStorage list key
    let savedListText = null;
    try {
      savedListText = localStorage.getItem(listKey) || (m.code ? localStorage.getItem(getStorageKey(`meeting_${m.code}_list`)) : null);
    } catch {}

    const saved = getSavedMeetingAttendance(m);
    let participants = null;

    if (saved) {
      if (Array.isArray(saved) && saved.length > 0) {
        participants = saved;
      } else if (Array.isArray(saved.attendees) && saved.attendees.length > 0) {
        participants = saved.attendees;
      }
    }

    if (savedListText && savedListText.trim()) {
      setRawList(savedListText);
      if (participants && participants.length > 0) {
        setParsedParticipants(participants);
      } else {
        const lines = savedListText.split('\n').map(l => l.trim()).filter(Boolean);
        processAttendanceFromLines(lines);
      }
    } else if (participants && participants.length > 0) {
      setParsedParticipants(participants);
      const preview = participants.map(p => `${p.rawName}\t${p.joinTime || '18:00'}\t${p.durationStr || `${p.durationMinutes || 60} min`}`).join('\n');
      setRawList(preview);
      try { localStorage.setItem(listKey, preview); } catch {}
    } else {
      // Direct reading from loaded members attendance column in sheet
      const attendeesFromMembers = members.filter(mem => {
        if (!mem) return false;
        const attVal = mem.attendance?.[mId] ?? mem[mId] ?? mem[`att_${mId}`] ?? mem[`M0${String(mId).replace(/\D/g, '')}`];
        return attVal === 1 || attVal === '1' || attVal === true;
      });

      if (attendeesFromMembers.length > 0) {
        const reconstructed = attendeesFromMembers.map((mem, i) => ({
          id: `att_${mId}_${i}_${mem.index || i}`,
          rawName: mem.fullName || `${mem.firstName || ''} ${mem.lastName || ''}`.trim() || `Członek (${mem.index || mem.email})`,
          joinTime: '18:00',
          durationStr: '60 min',
          durationMinutes: 60,
          member: mem,
          role: 'member',
          isEligible: true,
          manualApproved: true,
          hasManualOverride: false,
          status: 'approved',
        }));
        setParsedParticipants(reconstructed);
        const preview = reconstructed.map(a => `${a.rawName} (${a.member?.index || a.member?.email || 'brak-nr'})\t18:00\t60 min`).join('\n');
        setRawList(preview);
        try { localStorage.setItem(listKey, preview); } catch {}
      } else if (m.attendeesCount && m.attendeesCount > 0) {
        // Fallback reconstruction for canonical meetings
        const reconstructed = Array.from({ length: m.attendeesCount }).map((_, i) => {
          const mem = members[i % Math.max(1, members.length)];
          const name = mem
            ? (mem.fullName || `${mem.firstName || ''} ${mem.lastName || ''}`.trim())
            : `Uczestnik Spotkania ${i + 1}`;
          return {
            id: `att_${mId}_${i}`,
            rawName: name,
            joinTime: '18:00',
            durationStr: '60 min',
            durationMinutes: 60,
            member: mem || null,
            role: 'member',
            isEligible: true,
            manualApproved: true,
            hasManualOverride: false,
            status: mem ? 'approved' : 'unmatched',
          };
        });
        setParsedParticipants(reconstructed);
        const preview = reconstructed.map(p => `${p.rawName}\t18:00\t60 min`).join('\n');
        setRawList(preview);
        try { localStorage.setItem(listKey, preview); } catch {}
      } else {
        setParsedParticipants([]);
        setRawList('');
      }
    }
  }

  function handleSetMeetingType(meetingId, typeId) {
    const m = currentSelectedMeeting || selectedMeeting;
    const mId = meetingId || m?.id;
    const mCode = m?.code;

    const updated = { ...customTypes };
    if (mId) updated[mId] = typeId;
    if (mCode) updated[mCode] = typeId;

    setCustomTypes(updated);
    try {
      localStorage.setItem(getStorageKey('crm_meeting_types'), JSON.stringify(updated));
      localStorage.setItem('crm_meeting_types', JSON.stringify(updated));
    } catch {}
  }

  function findMemberMatch(nameOrIndex) {
    if (!nameOrIndex) return null;
    const clean = String(nameOrIndex).trim().toLowerCase();

    // 1. Explicit check for Monika Łyniewska (34327)
    if (isMonikaLyniewska(clean)) {
      const monika = members.find(
        m => String(m.index || '').trim() === '34327' ||
             (m.fullName && m.fullName.toLowerCase().includes('łyniewsk')) ||
             (m.fullName && m.fullName.toLowerCase().includes('lyniewsk')) ||
             (m.email && m.email.toLowerCase().includes('lyniewsk'))
      );
      if (monika) return monika;
    }

    return members.find(m => {
      const idx = String(m.index || '').trim().toLowerCase();
      const fn = String(m.fullName || '').trim().toLowerCase();
      const ln = String(m.lastName || '').trim().toLowerCase();
      const em = String(m.email || '').trim().toLowerCase();

      if (idx && (clean === idx || clean.includes(idx))) return true;
      if (em && (clean === em || clean.includes(em))) return true;
      if (fn && (clean === fn || clean.includes(fn) || fn.includes(clean))) return true;
      if (ln && ln.length >= 3 && clean.includes(ln)) return true;
      return false;
    });
  }

  function recalculateAttendance(participantsList, overrides, threshold = minDurationThreshold) {
    const updated = participantsList.map(p => {
      if (p.role === 'supervisor' || p.role === 'speaker' || p.role === 'guest') {
        return p;
      }
      const isOverThreshold = p.durationMinutes >= threshold;
      const hasManualOverride = overrides[p.id] !== undefined;
      const isApproved = hasManualOverride ? overrides[p.id] : isOverThreshold;

      let status = 'approved';
      if (!isApproved) {
        status = 'rejected_short_time';
      }
      if (!p.member) {
        status = isApproved ? 'approved_unmatched' : 'unmatched';
      }

      return {
        ...p,
        isEligible: isApproved,
        manualApproved: isApproved,
        hasManualOverride,
        status,
      };
    });

    setParsedParticipants(updated);

    if (selectedMeeting) {
      const storageKey = getMeetingStorageKey(selectedMeeting);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
    }

    // Filter confirmed attendee indexes for the meeting
    const confirmedIndexes = updated
      .filter(p => p.role === 'member' && p.manualApproved && p.member && p.member.index)
      .map(p => p.member.index);

    if (selectedMeeting) {
      onMarkAttendance(selectedMeeting.id, confirmedIndexes);
    }
  }

  function processAttendanceFromLines(lines, threshold = minDurationThreshold) {
    if (!selectedMeeting) return;

    // Save raw list text in org-scoped storage
    const mId = selectedMeeting.id || selectedMeeting.code || selectedMeeting.date;
    const listKey = getStorageKey(`meeting_${mId}_list`);
    if (rawList && rawList.trim()) {
      try {
        localStorage.setItem(listKey, rawList);
      } catch {}
    }

    const participants = [];
    const matched = [];
    const unmatched = [];

    lines.forEach((rawLine, idx) => {
      const parsed = parseAttendanceLine(rawLine);
      if (!parsed) return;

      const isSup = isFacultySupervisor(parsed.rawName);
      const member = !isSup ? findMemberMatch(parsed.rawName) : null;
      const isMonika = isMonikaLyniewska(parsed.rawName);
      const isEligible = parsed.durationMinutes >= threshold;
      const pid = `part_${idx}_${member?.index || parsed.rawName.slice(0, 8)}`;

      let role = 'member';
      if (isSup) role = 'supervisor';
      else if (member || isMonika) role = 'member';

      const partItem = {
        id: pid,
        rawName: parsed.rawName,
        joinTime: parsed.joinTime || '—',
        durationStr: parsed.durationStr || `${parsed.durationMinutes} min`,
        durationMinutes: parsed.durationMinutes,
        member: member || null,
        role,
        isGuest: false,
        isEligible: isSup ? true : isEligible,
        manualApproved: isSup ? true : isEligible,
        hasManualOverride: isSup,
        status: isSup ? 'supervisor' : (!member ? 'unmatched' : isEligible ? 'approved' : 'rejected_short_time'),
      };

      participants.push(partItem);

      if (isSup) {
        // Faculty Supervisor
      } else if (member) {
        if (isEligible) matched.push(member);
      } else {
        unmatched.push(parsed.rawName);
      }
    });

    setParsedParticipants(participants);
    setManualOverrides({});

    const storageKey = getMeetingStorageKey(selectedMeeting);
    try {
      localStorage.setItem(storageKey, JSON.stringify(participants));
    } catch {}

    const confirmedIndexes = participants
      .filter(p => p.manualApproved && p.member && p.member.index)
      .map(p => p.member.index);

    onMarkAttendance(selectedMeeting.id, confirmedIndexes);
    setResults({ matched, unmatched });
  }

  function handleProcessAttendance() {
    if (!rawList.trim()) return;
    const lines = rawList.split('\n').map(l => l.trim()).filter(Boolean);
    processAttendanceFromLines(lines);
  }

  async function handleFetchFromSheet() {
    if (!selectedMeeting) return;
    setFetchingSheet(true);
    setSheetFeedback(null);
    try {
      const res = await fetchMeetingSheetAttendance(selectedMeeting.code || selectedMeeting.id);
      if (res.ok && res.participants?.length > 0) {
        setSheetFeedback({ ok: true, message: `Wczytano ${res.participants.length} uczestników z arkusza "${res.tabName}"` });

        // Map to lines
        const lines = res.participants.map(p => `${p.rawName}\t${p.joinTime}\t${p.durationStr}`);
        setRawList(lines.join('\n'));
        processAttendanceFromLines(lines);
      } else {
        setSheetFeedback({ ok: false, error: res.error || 'Nie odnaleziono zakładki dla tego spotkania' });
      }
    } catch (err) {
      setSheetFeedback({ ok: false, error: err.message || 'Błąd odczytu arkusza' });
    } finally {
      setFetchingSheet(false);
    }
  }

  function handleToggleManualApproval(participantId) {
    const part = parsedParticipants.find(p => p.id === participantId);
    if (!part) return;

    const currentApproved = part.manualApproved;
    const nextApproved = !currentApproved;

    const nextOverrides = {
      ...manualOverrides,
      [participantId]: nextApproved,
    };
    setManualOverrides(nextOverrides);

    recalculateAttendance(parsedParticipants, nextOverrides);
  }

  // ── Protocol / Meeting Minutes Handlers ────────────────────────────────────
  const handleOpenProtocolModal = () => {
    if (!selectedMeeting) return;
    const cleanYear = String(academicYear || '2025/2026').replace(/[\[\]]/g, '');
    const cleanCode = String(selectedMeeting.code || selectedMeeting.id || 'M01').replace(/[\[\]]/g, '').trim();
    const savedProtocol = getMeetingProtocol(currentOrg.id, cleanCode);
    const defNumber = `PROT/${(currentOrg.shortName || currentOrg.name || 'SKN').toUpperCase().replace(/[^A-Z0-9]/g, '')}/${cleanCode}/${cleanYear.replace(/20/g, '')}`;

    const currentSaved = getSavedMeetingAttendance(selectedMeeting);
    const confirmedCount = currentSaved?.confirmedCount ??
      (currentSaved?.confirmedIndexes?.length) ??
      (Array.isArray(currentSaved?.attendees) ? currentSaved.attendees.filter(p => p.manualApproved && p.member?.index).length : (selectedMeeting.attendeesCount || selectedMeeting.attendees?.length || 0));

    let currentAttendees = [];
    if (Array.isArray(currentSaved?.attendees) && currentSaved.attendees.length > 0) {
      currentAttendees = currentSaved.attendees
        .filter(p => p.manualApproved && p.member?.index)
        .map(p => ({
          name: p.member?.name || p.rawName,
          rawName: p.rawName,
          index: p.member?.index,
          durationStr: p.durationStr || `${p.durationMinutes || 60} min`,
        }));
    } else if (parsedParticipants.length > 0) {
      currentAttendees = parsedParticipants
        .filter(p => (manualOverrides[p.id]?.status === 'approved' || (!manualOverrides[p.id] && p.status === 'approved')) && p.member?.index)
        .map(p => ({
          name: p.member?.name || p.rawName,
          rawName: p.rawName,
          index: p.member?.index,
          durationStr: p.durationStr || `${p.durationMinutes || 60} min`,
        }));
    }

    if (savedProtocol) {
      setProtocolForm({
        protocolNumber: savedProtocol.protocolNumber || defNumber,
        date: savedProtocol.date || selectedMeeting.formattedDate || selectedMeeting.date || new Date().toISOString().slice(0, 10),
        time: savedProtocol.time || '18:00 - 19:30',
        location: savedProtocol.location || selectedMeeting.location || 'Google Meet / MS Teams (Tryb zdalny)',
        title: savedProtocol.title || selectedMeeting.title || '',
        speaker: savedProtocol.speaker || selectedMeeting.who || 'Zarząd Koła Naukowego',
        attendeesCount: savedProtocol.attendeesCount ?? confirmedCount,
        recorder: savedProtocol.recorder || 'Protokolant Zarządu Koła',
        agenda: savedProtocol.agenda || `1. Otwarcie spotkania naukowego ${cleanCode} przez Przewodniczącego Koła.\n2. Wystąpienie prelegenta (${selectedMeeting.who || 'Zarząd'}) na temat: „${selectedMeeting.title}”.\n3. Dyskusja naukowa z udziałem członków koła i sesja pytań (Q&A).\n4. Podsumowanie, wolne wnioski i ustalenie terminu kolejnego zebrania.`,
        content: savedProtocol.content || `W dniu ${selectedMeeting.formattedDate || selectedMeeting.date} odbyło się oficjalne spotkanie naukowe Koła ${currentOrg.shortName}. Prelegent przedstawił referat dotyczący zagadnień: „${selectedMeeting.title}”.\n\nW części dyskusyjnej członkowie koła aktywnie analizowali zaprezentowane studia przypadków oraz metodologię badań naukowych.`,
        conclusions: savedProtocol.conclusions || `1. Przyjęto sprawozdanie z referatu ${cleanCode} do dorobku naukowego Koła.\n2. Zweryfikowano i zatwierdzono listę obecności (${confirmedCount} uczestników).\n3. Zaplanowano kolejne wystąpienie seminaryjne.`,
        includeAttendeesList: savedProtocol.includeAttendeesList ?? true,
        attendees: savedProtocol.attendees && savedProtocol.attendees.length > 0 ? savedProtocol.attendees : currentAttendees,
      });
    } else {
      setProtocolForm({
        protocolNumber: defNumber,
        date: selectedMeeting.formattedDate || selectedMeeting.date || new Date().toISOString().slice(0, 10),
        time: '18:00 - 19:30',
        location: selectedMeeting.location || 'Google Meet / MS Teams (Tryb zdalny)',
        title: selectedMeeting.title || '',
        speaker: selectedMeeting.who || 'Zarząd Koła Naukowego',
        attendeesCount: confirmedCount,
        recorder: 'Protokolant Zarządu Koła',
        agenda: `1. Otwarcie spotkania naukowego ${cleanCode} przez Przewodniczącego Koła.\n2. Wystąpienie prelegenta (${selectedMeeting.who || 'Zarząd'}) na temat: „${selectedMeeting.title}”.\n3. Dyskusja naukowa z udziałem członków koła i sesja pytań (Q&A).\n4. Podsumowanie, wolne wnioski i ustalenie terminu kolejnego zebrania.`,
        content: `W dniu ${selectedMeeting.formattedDate || selectedMeeting.date} odbyło się oficjalne spotkanie naukowe Koła ${currentOrg.shortName}. Prelegent przedstawił referat dotyczący zagadnień: „${selectedMeeting.title}”.\n\nW części dyskusyjnej członkowie koła aktywnie analizowali zaprezentowane studia przypadków oraz metodologię badań naukowych.`,
        conclusions: `1. Przyjęto sprawozdanie z referatu ${cleanCode} do dorobku naukowego Koła.\n2. Zweryfikowano i zatwierdzono listę obecności (${confirmedCount} uczestników).\n3. Zaplanowano kolejne wystąpienie seminaryjne.`,
        includeAttendeesList: true,
        attendees: currentAttendees,
      });
    }
    setIsProtocolModalOpen(true);
  };

  const handleSaveProtocol = () => {
    if (!selectedMeeting) return;
    const cleanCode = String(selectedMeeting.code || selectedMeeting.id || 'M01').replace(/[\[\]]/g, '').trim();
    saveMeetingProtocol(currentOrg.id, cleanCode, protocolForm);
    setProtocolSaveStatus('Zapisano notatkę w rejestrze spotkania!');
    setTimeout(() => setProtocolSaveStatus(null), 3000);
  };

  const handleSaveProtocolToDocsRepo = () => {
    if (!selectedMeeting) return;
    handleSaveProtocol();
    const cleanCode = String(selectedMeeting.code || selectedMeeting.id || 'M01').replace(/[\[\]]/g, '').trim();
    const newDoc = {
      id: `doc_prot_${cleanCode}_${Date.now()}`,
      code: protocolForm.protocolNumber,
      title: `Protokół ze spotkania ${cleanCode}: ${protocolForm.title}`,
      category: 'Protokoły Zebrań',
      date: protocolForm.date,
      status: 'Obowiązujący',
      description: `Oficjalny protokół ze spotkania naukowego ${cleanCode} z dnia ${protocolForm.date} (Liczba obecnych: ${protocolForm.attendeesCount}).`,
      driveUrl: '',
    };
    addDocumentToRegistry(currentOrg.id, newDoc);
    setProtocolSaveStatus('Zapisano i zarejestrowano w Dzienniku Dokumentów Koła!');
    setTimeout(() => setProtocolSaveStatus(null), 3500);
  };

  const handlePrintProtocol = () => {
    handleSaveProtocol();
    setIsPrintingProtocol(true);
    setTimeout(() => {
      window.print();
      setIsPrintingProtocol(false);
    }, 300);
  };

  // Count past vs upcoming
  const upcomingCount = activeMeetings.filter(m => m.isUpcoming).length;
  const archivedCount = activeMeetings.length - upcomingCount;

  // Dynamic counts for each meeting category in the current view
  const categoryCounts = useMemo(() => {
    const counts = {
      mandatory: 0,
      optional: 0,
      trigger_warning: 0,
      internal: 0,
    };

    activeMeetings.forEach(m => {
      const type = getMeetingType(m, customTypes);
      if (counts[type] !== undefined) {
        counts[type]++;
      } else {
        counts.mandatory++;
      }
    });

    return counts;
  }, [activeMeetings, customTypes]);

  const countMandatory = categoryCounts.mandatory;
  const countOptional = categoryCounts.optional;
  const countTrigger = categoryCounts.trigger_warning;
  const countInternal = categoryCounts.internal;
  const countNonMandatory = countOptional + countTrigger + countInternal;

  // Selected meeting active type config
  const selectedType = currentSelectedMeeting ? getMeetingType(currentSelectedMeeting, customTypes) : 'mandatory';
  const selectedTypeConfig = MEETING_TYPES[selectedType] || MEETING_TYPES.mandatory;

  // Verified attendance statistics (Aggregated by status "Zaliczono")
  const approvedParticipantsCount = parsedParticipants.filter(p => {
    if (p.role === 'supervisor' || isFacultySupervisor(p.rawName) || p.role === 'speaker') return true;
    return p.manualApproved !== undefined ? p.manualApproved : (p.isEligible || p.status === 'approved' || p.status === 'Zaliczona');
  }).length;
  const rejectedParticipantsCount = parsedParticipants.filter(p => p.manualApproved === false || (!p.manualApproved && !p.isEligible && p.role !== 'supervisor' && !isFacultySupervisor(p.rawName) && p.role !== 'speaker')).length;
  const unmatchedParticipantsCount = parsedParticipants.filter(p => !p.member && p.role !== 'supervisor' && !isFacultySupervisor(p.rawName) && p.role !== 'speaker').length;

  return (
    <div className="space-y-6">
      {/* Header controls for Academic Year & Calendar (Sticky at Top) */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 sticky top-16 z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              Harmonogram & Kategoryzacja Spotkań
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Wszystkich spotkań: <strong>{activeMeetings.length}</strong></span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">{upcomingCount} nadchodzących</span>
              <span>•</span>
              <span className="text-slate-500">{archivedCount} zakończonych</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rok:</span>
              <select
                value={academicYear}
                onChange={e => onAcademicYearChange(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="2026/2027">Rok akademicki 2026/2027 (Bieżący)</option>
                <option value="2025/2026">Rok akademicki 2025/2026 (Poprzedni)</option>
                <option value="custom">Własny zakres dat...</option>
              </select>
            </div>

            {/* Subcalendar Filter (Zablokowany wyłącznie dla SKN Psychoonkologii) */}
            <CalendarSelector
              selectedSubcalendar={selectedSubcalendar || PSYCHOONKOLOGIA_SUBCALENDAR_ID}
              onSubcalendarChange={onSubcalendarChange}
            />

            {/* Refresh Button */}
            <button
              onClick={onRefreshMeetings}
              disabled={loadingMeetings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw size={13} className={loadingMeetings ? 'animate-spin' : ''} />
              <span>Odśwież kalendarz</span>
            </button>
          </div>
        </div>

        {/* Custom date range inputs */}
        {academicYear === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <label htmlFor="custom-start-date" className="text-xs font-semibold text-slate-600">Data od:</label>
              <input
                id="custom-start-date"
                name="customStartDate"
                type="date"
                value={customStartDate}
                onChange={e => onCustomDateChange(e.target.value, customEndDate)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="custom-end-date" className="text-xs font-semibold text-slate-600">Data do:</label>
              <input
                id="custom-end-date"
                name="customEndDate"
                type="date"
                value={customEndDate}
                onChange={e => onCustomDateChange(customStartDate, e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Independent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Meeting list with independent scrolling */}
        <div className="lg:col-span-7 space-y-3">
          {/* Header with View Switcher (Active vs Trash) and Add Meeting button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'active'
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={13} className={viewMode === 'active' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Aktywne spotkania ({activeMeetings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('trash')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'trash'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <Trash2 size={13} className={viewMode === 'trash' ? 'text-rose-600' : 'text-slate-400'} />
                <span>Kosz ({trashList.length})</span>
              </button>
            </div>

            {/* ➕ Dodaj spotkanie button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-semibold hover:from-indigo-700 hover:to-indigo-800 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Dodaj spotkanie</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-200">
            {viewMode === 'trash' ? (
              trashList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Trash2 size={20} />
                  </div>
                  <div className="font-semibold text-slate-700 text-sm">Kosz jest pusty</div>
                  <p className="text-slate-400 mt-0.5">Żadne spotkanie nie zostało przeniesione do kosza.</p>
                </div>
              ) : (
                trashList.map(tm => (
                  <div
                    key={tm.id || tm.code}
                    className="p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/30 hover:bg-rose-50/60 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100/80 border border-rose-200 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-bold text-rose-500 uppercase">Kosz</span>
                        <span className="text-xs font-black font-mono text-rose-800">{String(tm.code || tm.id || '').replace(/[\[\]]/g, '')}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{tm.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>📅 {tm.formattedDate || tm.date}</span>
                          {tm.deletedAt && (
                            <span className="text-rose-600 text-[10px]">
                              (Usunięto: {new Date(tm.deletedAt).toLocaleDateString('pl-PL')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreMeeting(tm)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition cursor-pointer"
                        title="Przywróć spotkanie na główną listę"
                      >
                        <RotateCcw size={12} />
                        <span>Przywróć</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeetingToPermanentDelete(tm)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                        title="Trwałe usunięcie"
                      >
                        <Trash2 size={12} />
                        <span className="sr-only sm:not-sr-only">Trwale</span>
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : activeMeetings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                Brak spotkań w wybranym okresie i podkalendarzu.
              </div>
            ) : (
              activeMeetings.map(m => {
                const isSelected = currentSelectedMeeting?.id === m.id || currentSelectedMeeting?.code === m.code;
                const isUpcoming = m.isUpcoming;
                const type = getMeetingType(m, customTypes);
                const typeConfig = MEETING_TYPES[type] || MEETING_TYPES.mandatory;

                return (
                  <button
                    key={m.id || m.code}
                    onClick={() => handleSelectMeeting(m)}
                    className={`group w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/80 shadow-md ring-2 ring-indigo-200'
                        : isUpcoming
                        ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:bg-emerald-50/60'
                        : 'border-slate-200/70 bg-white hover:border-indigo-300 hover:shadow-xs hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs transition-colors border ${
                      isSelected
                        ? 'bg-indigo-100/90 border-indigo-300'
                        : isUpcoming
                        ? 'bg-emerald-100/90 border-emerald-300 group-hover:bg-emerald-100'
                        : 'bg-slate-100/90 border-slate-200/80 group-hover:bg-indigo-50 group-hover:border-indigo-200'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase tracking-tight leading-none mb-1 ${
                        isSelected
                          ? 'text-indigo-600'
                          : isUpcoming
                          ? 'text-emerald-700'
                          : 'text-slate-400 group-hover:text-indigo-500'
                      }`}>
                        {String(m.academicYear || academicYear || '25/26').replace(/[\[\]]/g, '').replace(/20/g, '')}
                      </span>
                      
                      <span className={`text-sm font-extrabold tracking-tight leading-none ${
                        isSelected
                          ? 'text-indigo-900 font-black'
                          : isUpcoming
                          ? 'text-emerald-900 font-black'
                          : 'text-slate-700 group-hover:text-indigo-600'
                      }`}>
                        {String(m.code || m.id || 'M01').replace(/[\[\]]/g, '').trim()}
                      </span>
                    </div>

                    {/* Środkowa część (Tytuł spotkania, data, prelegent) */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{m.title}</p>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                        <CalendarDays size={12} className={isUpcoming ? 'text-emerald-600' : 'text-slate-400'} />
                        <span>{m.formattedDate || m.date || m.start_dt}</span>
                        {m.who && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-0.5 font-sans text-slate-500 truncate max-w-[140px]">
                              <User size={11} /> {m.who}
                            </span>
                          </>
                        )}
                        {m.location && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-0.5 font-sans text-slate-500 truncate max-w-[120px]">
                              <MapPin size={11} /> {m.location}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Prawa strona (Status & Type Badges) */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {/* Meeting Type Badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeClass}`}>
                        <span>{typeConfig.icon}</span>
                        <span>{typeConfig.label}</span>
                      </span>

                      {isUpcoming ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <Sparkles size={10} />
                          Zaplanowane
                        </span>
                      ) : (() => {
                        const saved = getSavedMeetingAttendance(m);
                        const isSavedVerified = !!(
                          (saved && (
                            (saved.confirmedCount !== undefined && saved.confirmedCount > 0) ||
                            (Array.isArray(saved.confirmedIndexes) && saved.confirmedIndexes.length > 0) ||
                            (Array.isArray(saved.attendees) && saved.attendees.length > 0) ||
                            (Array.isArray(saved) && saved.length > 0)
                          )) || (m.attendeesCount && m.attendeesCount > 0)
                        );
                        const count = saved?.confirmedCount ??
                          (saved?.confirmedIndexes?.length) ??
                          (Array.isArray(saved?.attendees) ? saved.attendees.length : (Array.isArray(saved) ? saved.length : (m.attendeesCount || m.attendees?.length || 0)));

                        return isSavedVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full shadow-2xs">
                            <Check size={10} className="text-emerald-600 font-bold" />
                            ✓ Zakończone ({count})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Clock size={10} />
                            Zakończone ({count})
                          </span>
                        );
                      })()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Attendance processor & Category Switcher (Sticky at top) */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Kategoria & Obecność</h3>
          {!selectedMeeting ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              <ClipboardList size={36} className="mx-auto mb-2 text-slate-300" />
              Wybierz spotkanie z listy po lewej stronie, aby zmienić jego charakter lub zarejestrować obecności.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              {/* Selected Meeting Banner with Inline Code Edit */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                currentSelectedMeeting.isUpcoming
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <div className="flex items-center gap-2.5 text-sm font-bold min-w-0 flex-1">
                  {isEditingCode ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="text"
                        value={editedCodeValue}
                        onChange={(e) => setEditedCodeValue(e.target.value.toUpperCase())}
                        className="w-20 px-2 py-0.5 text-xs font-mono font-bold bg-white text-slate-900 border border-indigo-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="np. M07"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditedCode();
                          if (e.key === 'Escape') setIsEditingCode(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditedCode}
                        className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition cursor-pointer"
                        title="Zapisz nowy kod"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingCode(false)}
                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                        title="Anuluj"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs border font-mono font-bold ${
                        currentSelectedMeeting.isUpcoming
                          ? 'bg-emerald-200 border-emerald-300 text-emerald-900'
                          : 'bg-indigo-200 border-indigo-300 text-indigo-900'
                      }`}>
                        {String(currentSelectedMeeting.code || currentSelectedMeeting.id || 'M01').replace(/[\[\]]/g, '').trim()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedCodeValue(String(currentSelectedMeeting.code || currentSelectedMeeting.id || 'M01').replace(/[\[\]]/g, '').trim());
                          setIsEditingCode(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer rounded"
                        title="✏️ Zmień kod spotkania (np. na M07)"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  )}

                  <span className="truncate">{currentSelectedMeeting.title}</span>
                </div>
                <span className="text-xs font-mono font-medium shrink-0 ml-2">{currentSelectedMeeting.formattedDate || currentSelectedMeeting.date}</span>
              </div>

              {/* ── Action Buttons: Protocol Minutes & Trash ── */}
              <div className="flex items-center gap-2 my-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenProtocolModal(currentSelectedMeeting)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl text-xs font-semibold hover:opacity-95 shadow-sm transition-all border border-indigo-900/50 cursor-pointer"
                >
                  <span>📝</span>
                  <span>Utwórz Notatkę / Protokół ze spotkania</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMeetingToTrash(currentSelectedMeeting)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
                  title="Przenieś to spotkanie do Kosza (Soft Delete)"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  <span className="hidden sm:inline">Kosz</span>
                </button>
              </div>

              {/* ── Meeting Type Selector Card ─────────────────────────────── */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag size={13} className="text-indigo-600" />
                      <span>Charakter spotkania:</span>
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Obowiązkowe dla frekwencji: <strong className="text-emerald-700 font-bold">{countMandatory}</strong> | Pozostałe: <strong className="text-slate-700 font-bold">{countNonMandatory}</strong>
                    </p>
                  </div>
                  <span className={`self-start sm:self-auto text-xs font-bold px-2.5 py-0.5 rounded-full border ${selectedTypeConfig.badgeClass}`}>
                    {selectedTypeConfig.icon} {selectedTypeConfig.label}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  {selectedTypeConfig.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {Object.values(MEETING_TYPES).map(t => {
                    const isCurrent = selectedType === t.id;
                    const count = categoryCounts[t.id] || 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSetMeetingType(selectedMeeting.id, t.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isCurrent
                            ? `${t.badgeClass} ring-2 ring-indigo-400 shadow-xs scale-102`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-base">{t.icon}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${
                            isCurrent
                              ? 'bg-white/90 text-slate-900 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {count}
                          </span>
                        </div>
                        <span className="text-[11px] text-center leading-tight mt-0.5">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Attendance Duration Threshold Regulator ────────────────── */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 rounded-xl p-3.5 border border-indigo-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Timer size={14} className="text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Próg zaliczenia obecności</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs font-mono font-bold text-xs text-indigo-900">
                    <span>{minDurationThreshold}</span>
                    <span className="text-[10px] text-indigo-500 font-sans">min</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      id="min-duration-threshold"
                      name="minDurationThreshold"
                      type="range"
                      min="1"
                      max="120"
                      step="1"
                      value={minDurationThreshold}
                      onChange={e => handleThresholdChange(e.target.value)}
                      className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">Szybki wybór:</span>
                    {[10, 15, 20, 30, 45, 60].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleThresholdChange(m)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer border ${
                          minDurationThreshold === m
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-indigo-50 border-slate-200'
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-snug">
                  Uczestnicy z czasem &lt; <strong>{minDurationThreshold} min</strong> zostaną oznaczeni jako ⚠️ <em>nieobecni</em> (z możliwością ręcznego zaliczenia).
                </p>
              </div>

              {/* ── Attendance Source & Action ─────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Lista z Google Meet / Arkusza (Kol. B i C)
                    </label>
                    {(() => {
                      const currentSaved = selectedMeeting ? getSavedMeetingAttendance(selectedMeeting) : null;
                      const isCurrentVerified = !!(currentSaved && (
                        (currentSaved.confirmedCount !== undefined && currentSaved.confirmedCount > 0) ||
                        (Array.isArray(currentSaved.confirmedIndexes) && currentSaved.confirmedIndexes.length > 0) ||
                        (Array.isArray(currentSaved.attendees) && currentSaved.attendees.length > 0) ||
                        (Array.isArray(currentSaved) && currentSaved.length > 0)
                      ));
                      const currentSavedCount = currentSaved?.confirmedCount ??
                        (Array.isArray(currentSaved?.attendees)
                          ? currentSaved.attendees.filter(p => p.role === 'supervisor' || isFacultySupervisor(p.rawName) || p.role === 'speaker' || (p.manualApproved !== undefined ? p.manualApproved : (p.isEligible || p.status === 'approved' || p.status === 'Zaliczona'))).length
                          : (currentSaved?.confirmedIndexes?.length ?? (selectedMeeting?.attendees?.length || 0)));

                      if (!isCurrentVerified) return null;
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs animate-in fade-in">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>🟢 Zweryfikowano i zapisano ({currentSavedCount} obecnych)</span>
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchFromSheet}
                    disabled={fetchingSheet}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition border border-indigo-200/80 cursor-pointer disabled:opacity-50"
                  >
                    <Download size={12} className={fetchingSheet ? 'animate-spin' : ''} />
                    <span>{fetchingSheet ? 'Wczytywanie…' : 'Wczytaj z arkusza'}</span>
                  </button>
                </div>

                {sheetFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                    sheetFeedback.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {sheetFeedback.ok ? <Check size={14} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={14} className="shrink-0 text-amber-600" />}
                    <span>{sheetFeedback.ok ? sheetFeedback.message : sheetFeedback.error}</span>
                  </div>
                )}

                <textarea
                  value={rawList}
                  onChange={e => { setRawList(e.target.value); setResults(null); }}
                  rows={4}
                  placeholder="Wklej listę obecności z Google Meet lub załaduj obecności z arkusza..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                />

                {/* Adaptive Action Buttons */}
                {(() => {
                  const currentSaved = selectedMeeting ? getSavedMeetingAttendance(selectedMeeting) : null;
                  const isCurrentVerified = !!(currentSaved && (
                    (currentSaved.confirmedCount !== undefined && currentSaved.confirmedCount > 0) ||
                    (Array.isArray(currentSaved.confirmedIndexes) && currentSaved.confirmedIndexes.length > 0) ||
                    (Array.isArray(currentSaved.attendees) && currentSaved.attendees.length > 0) ||
                    (Array.isArray(currentSaved) && currentSaved.length > 0)
                  ));

                  if (isCurrentVerified) {
                    return (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <span>⛶ Otwórz zweryfikowaną listę i edytuj (Duże okno)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (rawList.trim()) setShowResetConfirm(true);
                          }}
                          disabled={!rawList.trim()}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-semibold transition cursor-pointer disabled:opacity-40"
                        >
                          <RotateCcw size={12} />
                          <span>↻ Przetwórz surowy tekst od nowa (Reset korekt)</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleProcessAttendance}
                        disabled={!rawList.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Play size={13} />
                        <span>▶ Przetwórz i zweryfikuj listę</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (rawList.trim() && parsedParticipants.length === 0) {
                            handleProcessAttendance();
                          }
                          setIsModalOpen(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold transition cursor-pointer"
                      >
                        <span>⛶ Otwórz pełny panel weryfikacji i edycji (Duże okno)</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* ── Verified Participants Table ───────────────────────────── */}
              {parsedParticipants.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800">Uczestnicy ({parsedParticipants.length}):</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                        🟢 {approvedParticipantsCount} zaliczonych
                      </span>
                      {rejectedParticipantsCount > 0 && (
                        <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                          ⚠️ {rejectedParticipantsCount} &lt; {minDurationThreshold}m
                        </span>
                      )}
                      {unmatchedParticipantsCount > 0 && (
                        <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                          ❓ {unmatchedParticipantsCount} nieznanych
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Table */}
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden scrollbar-thin scrollbar-thumb-indigo-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-2">Uczestnik</th>
                          <th className="p-2 text-center w-20">Wejście</th>
                          <th className="p-2 text-center w-24">Czas (Kol. C)</th>
                          <th className="p-2 text-center w-20">Status</th>
                          <th className="p-2 text-right w-16">Ręcznie</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedParticipants.map(p => {
                          const isApproved = p.manualApproved;
                          const isShortTime = p.durationMinutes < minDurationThreshold;
                          const memberName = p.member ? (p.member.fullName || `${p.member.firstName} ${p.member.lastName}`) : p.rawName;

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${
                                isApproved
                                  ? 'bg-white hover:bg-slate-50/70'
                                  : 'bg-rose-50/40 hover:bg-rose-50/70'
                              }`}
                            >
                              {/* Student Name */}
                              <td className="p-2">
                                <p className="font-semibold text-slate-800 truncate max-w-[140px]" title={memberName}>
                                  {memberName}
                                </p>
                                {p.member?.index && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    idx: {p.member.index}
                                  </span>
                                )}
                              </td>

                              {/* Join Time */}
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">
                                {p.joinTime}
                              </td>

                              {/* Duration */}
                              <td className="p-2 text-center">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                  isShortTime
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}>
                                  {p.durationStr || `${p.durationMinutes} min`}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="p-2 text-center">
                                {isApproved ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle2 size={11} /> Zaliczona
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600" title={`Czas na spotkaniu (${p.durationMinutes} min) mniejszy niż próg ${minDurationThreshold} min`}>
                                    <AlertTriangle size={11} /> Za krótko
                                  </span>
                                )}
                              </td>

                              {/* Manual Override Toggle */}
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleManualApproval(p.id)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                    isApproved
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title="Kliknij, aby wymusić zaliczenie lub odrzucenie obecności tego studenta"
                                >
                                  {isApproved ? 'Tak' : 'Nie'}
                                </button>
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
          )}
        </div>
      </div>

      {/* ── Fullscreen Attendance Verification Modal ── */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        meeting={selectedMeeting}
        members={members}
        participants={parsedParticipants}
        minDurationThreshold={minDurationThreshold}
        onThresholdChange={handleThresholdChange}
        onSaveAttendance={(meetingId, confirmedIndexes, updatedParticipants, payload) => {
          const targetMeeting = meetings.find(m => m.id === meetingId || m.date === meetingId || m.code === meetingId) || selectedMeeting;
          const finalPayload = payload || {
            meetingId: targetMeeting?.id || targetMeeting?.date || meetingId,
            meetingDate: targetMeeting?.date,
            attendees: updatedParticipants,
            confirmedIndexes: confirmedIndexes,
            confirmedCount: confirmedIndexes.length,
            savedAt: new Date().toISOString(),
          };

          const keys = [
            getStorageKey(`crm_attendance_${targetMeeting?.id || meetingId}`),
            targetMeeting?.date ? getStorageKey(`crm_attendance_${targetMeeting.date}`) : null,
            targetMeeting?.code ? getStorageKey(`crm_attendance_${targetMeeting.code}`) : null,
          ].filter(Boolean);

          keys.forEach(k => {
            try {
              localStorage.setItem(k, JSON.stringify(finalPayload));
            } catch {}
          });

          setParsedParticipants(updatedParticipants);
          onMarkAttendance(meetingId, confirmedIndexes, finalPayload);
          if (selectedMeeting && (selectedMeeting.id === meetingId || selectedMeeting.date === meetingId || selectedMeeting.code === meetingId)) {
            setSelectedMeeting(prev => ({
              ...prev,
              attendees: confirmedIndexes,
            }));
          }
        }}
      />

      {/* ── Reset Reprocess Confirmation Modal ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Nadpisanie zweryfikowanej listy</h3>
                <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{selectedMeeting?.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              ⚠️ <strong>Uwaga:</strong> Lista obecności dla tego spotkania została już zweryfikowana i zapisana. Czy na pewno chcesz wczytać surowy tekst od nowa? Spowoduje to utratę wprowadzonych ręcznych dopasowań i ról.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  handleProcessAttendance();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Tak, przetwórz od nowa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Meeting Protocol / Minutes Modal ── */}
      {isProtocolModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Protokół / Notatka ze Spotkania Naukowego
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentOrg.name} • {selectedMeeting.code || selectedMeeting.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProtocolModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {protocolSaveStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{protocolSaveStatus}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Sygnatura / Nr Protokołu:</label>
                  <input
                    type="text"
                    value={protocolForm.protocolNumber}
                    onChange={e => setProtocolForm({ ...protocolForm, protocolNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Data:</label>
                  <input
                    type="text"
                    value={protocolForm.date}
                    onChange={e => setProtocolForm({ ...protocolForm, date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Godziny / Czas trwania:</label>
                  <input
                    type="text"
                    value={protocolForm.time}
                    onChange={e => setProtocolForm({ ...protocolForm, time: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tytuł spotkania / referatu:</label>
                  <input
                    type="text"
                    value={protocolForm.title}
                    onChange={e => setProtocolForm({ ...protocolForm, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Prelegent / Prowadzący:</label>
                  <input
                    type="text"
                    value={protocolForm.speaker}
                    onChange={e => setProtocolForm({ ...protocolForm, speaker: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Miejsce / Platforma:</label>
                  <input
                    type="text"
                    value={protocolForm.location}
                    onChange={e => setProtocolForm({ ...protocolForm, location: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Liczba obecnych:</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setProtocolForm({ ...protocolForm, attendeesCount: Math.max(0, (protocolForm.attendeesCount || 0) - 1) })}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      value={protocolForm.attendeesCount}
                      onChange={e => setProtocolForm({ ...protocolForm, attendeesCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full text-center p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-800 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setProtocolForm({ ...protocolForm, attendeesCount: (protocolForm.attendeesCount || 0) + 1 })}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Protokolant:</label>
                  <input
                    type="text"
                    value={protocolForm.recorder}
                    onChange={e => setProtocolForm({ ...protocolForm, recorder: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  1. Cel spotkania / Porządek obrad:
                </label>
                <textarea
                  rows={3}
                  value={protocolForm.agenda}
                  onChange={e => setProtocolForm({ ...protocolForm, agenda: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  2. Przebieg posiedzenia, streszczenie prelekcji i dyskusja:
                </label>
                <textarea
                  rows={4}
                  value={protocolForm.content}
                  onChange={e => setProtocolForm({ ...protocolForm, content: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  3. Ustalenia końcowe / Zadania i wnioski:
                </label>
                <textarea
                  rows={3}
                  value={protocolForm.conclusions}
                  onChange={e => setProtocolForm({ ...protocolForm, conclusions: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs resize-none"
                />
              </div>

              {/* Include attendees toggle */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Dołącz imienną listę obecnych do protokołu</span>
                  <span className="text-[11px] text-slate-500">
                    Załącznik zawiera listę zweryfikowanych uczestników ({protocolForm.attendees?.length || 0} osób).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={protocolForm.includeAttendeesList}
                  onChange={e => setProtocolForm({ ...protocolForm, includeAttendeesList: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleSaveProtocolToDocsRepo}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Dodaje protokół jako oficjalny dokument do Repozytorium Dokumentów i Rejestru Uchwał"
              >
                <FolderPlus size={14} />
                <span>📁 Zapisz w Dzienniku Dokumentów Koła</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSaveProtocol}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save size={14} />
                  <span>💾 Zapisz zmiany</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintProtocol}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>🖨️ Drukuj Protokół (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProtocolModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Zamknij
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Modal: ➕ Dodaj nowe spotkanie ───────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Dodaj nowe spotkanie</h3>
                  <p className="text-[11px] text-slate-500">Ręczne utworzenie spotkania w harmonogramie Koła</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNewMeeting} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Kod spotkania
                  </label>
                  <input
                    type="text"
                    value={newMeetingForm.code}
                    onChange={(e) => setNewMeetingForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="np. M22"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Data spotkania
                  </label>
                  <input
                    type="date"
                    value={newMeetingForm.date}
                    onChange={(e) => setNewMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tytuł / Temat spotkania
                </label>
                <input
                  type="text"
                  value={newMeetingForm.title}
                  onChange={(e) => setNewMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="np. Warsztaty z analizy przypadków klinicznych"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Godziny (czas trwania)
                  </label>
                  <input
                    type="text"
                    value={newMeetingForm.time}
                    onChange={(e) => setNewMeetingForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="18:00 - 19:30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Prelegent / Prowadzący
                  </label>
                  <input
                    type="text"
                    value={newMeetingForm.speaker}
                    onChange={(e) => setNewMeetingForm(prev => ({ ...prev, speaker: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="np. mgr Jan Kowalski"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Domyślny charakter spotkania
                </label>
                <select
                  value={newMeetingForm.defaultType}
                  onChange={(e) => setNewMeetingForm(prev => ({ ...prev, defaultType: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value="mandatory">🟢 Obowiązkowe (wliczane do frekwencji certyfikatu)</option>
                  <option value="non_mandatory">🔵 Nieobowiązkowe / Dodatkowe (dla chętnych)</option>
                  <option value="trigger_warning">🟠 Ostrzeżenie / Wymóg szczególny</option>
                  <option value="internal">🟣 Wewnętrzne (zarząd, organizacyjne)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Dodaj spotkanie</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: ⚠️ Ostrzeżenie przed przeniesieniem do Kosza ───────────── */}
      {meetingToTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">⚠️ Przenieść spotkanie do Kosza?</h3>
                <p className="text-xs text-slate-500">Bezpieczne usunięcie (Soft Delete)</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div>
                Spotkanie <strong className="text-indigo-900 font-mono">[{meetingToTrash.code || meetingToTrash.id}]</strong> - <strong>{meetingToTrash.title}</strong> oraz powiązane listy obecności zostaną ukryte.
              </div>
              <div className="text-[11px] text-slate-500">
                Będziesz mógł je w każdej chwili przywrócić z Kosza bez utraty danych obecności.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMeetingToTrash(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveToTrash}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Przenieś do kosza</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Definitywne trwałe usunięcie z Kosza ──────────────────── */}
      {meetingToPermanentDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Trwałe usunięcie spotkania</h3>
                <p className="text-xs text-rose-600 font-medium">Operacja jest nieodwracalna</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Czy na pewno chcesz bezpowrotnie usunąć spotkanie <strong className="text-slate-900">[{meetingToPermanentDelete.code || meetingToPermanentDelete.id}] {meetingToPermanentDelete.title}</strong>? Rekord zniknie z Kosza.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMeetingToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 shadow-sm transition cursor-pointer"
              >
                Definitywnie usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Meeting Minutes Protocol (A4) ── */}
      {isPrintingProtocol && currentSelectedMeeting && (
        <div id="protocol-print-container" className="hidden print:block fixed inset-0 bg-white z-9999 p-0 m-0">
          <OfficialMeetingMinutesTemplate
            meeting={currentSelectedMeeting}
            protocolData={protocolForm}
            org={currentOrg}
            academicYear={academicYear || '2025/2026'}
            supervisors={currentOrg.supervisors}
          />
        </div>
      )}
    </div>
  );
}


