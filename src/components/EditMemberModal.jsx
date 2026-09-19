import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Mail,
  Hash,
  BookOpen,
  Calendar,
  Phone,
  Sparkles,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Award,
  ShieldCheck,
  Check,
  Timer,
  Tag,
  CheckCircle,
  XCircle,
  BarChart3,
  CalendarDays,
  FileCheck2,
  Layers,
} from 'lucide-react';
import {
  calculateCategorizedFrequency,
  getMeetingType,
  MEETING_TYPES,
  isMeetingEligibleForDenominator,
} from '../utils/meetingTypes';
import { getEngagementScaleLevel } from '../context/SettingsContext';
import { useOrg } from '../context/OrgContext';

export default function EditMemberModal({
  member,
  isOpen,
  onClose,
  onSave,
  allMembers = [],
  meetings = [],
}) {
  const { currentOrg, getStorageKey } = useOrg();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [index, setIndex] = useState('');
  const [phone, setPhone] = useState('');
  const [field, setField] = useState('');
  const [year, setYear] = useState('');
  const [aliases, setAliases] = useState('');
  const [status, setStatus] = useState('active');
  const [mailingConsent, setMailingConsent] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'attended' | 'absent'

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (member) {
      const rawFullName = member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim();
      setFullName(String(rawFullName || ''));
      setEmail(String(member.email || ''));
      setIndex(String(member.index || member.cleanIndex || member.nrIndeksu || ''));
      setPhone(String(member.phone || member.telefon || ''));
      setField(String(member.field || member.kierunek || ''));
      setYear(String(member.year || ''));

      const rawAliases = member.aliases || member.aliasy || member.alias || member.meetAlias || '';
      const cleanInitAliases = Array.isArray(rawAliases) ? rawAliases.join(', ') : String(rawAliases || '');
      setAliases(cleanInitAliases);

      setStatus(member.status || 'active');

      const hasConsent =
        member.zgodaNaMailing === 'Zgoda na mailing' ||
        (member.mailingConsent === true && member.zgodaNaMailing !== 'Brak zgody' && member.consentStatus !== 'Brak zgody');
      setMailingConsent(Boolean(hasConsent));
    }
  }, [member]);

  const currentIdx = String(index || '').trim();
  const initialIdx = String(member?.index || member?.cleanIndex || member?.nrIndeksu || '').trim();
  const initialId = String(member?.id || '').trim();
  const currentEmail = String(email || '').trim().toLowerCase();
  const initialEmail = String(member?.email || '').trim().toLowerCase();

  const isDuplicateIndex = Boolean(
    currentIdx &&
    (allMembers || []).some(m => {
      const mIdx = String(m.nrIndeksu || m.index || m.cleanIndex || '').trim();
      const mId = String(m.id || '').trim();
      if (mId && initialId && mId === initialId) return false;
      if (mIdx && initialIdx && mIdx === initialIdx) return false;
      return mIdx === currentIdx;
    })
  );

  const isDuplicateEmail = Boolean(
    currentEmail &&
    (allMembers || []).some(m => {
      const mEmail = String(m.email || '').trim().toLowerCase();
      const mId = String(m.id || '').trim();
      if (mId && initialId && mId === initialId) return false;
      if (mEmail && initialEmail && mEmail === initialEmail) return false;
      return mEmail === currentEmail;
    })
  );

  // Custom Meeting Types from storage
  const customMeetingTypes = useMemo(() => {
    try {
      const key = getStorageKey ? getStorageKey('crm_meeting_types') : 'crm_meeting_types';
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  }, [getStorageKey]);

  // Read ewidencja list from storage
  const ewidencjaList = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('crm_ewidencja');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, []);

  // Filter student attendance directly from ewidencja
  const studentAttendanceRecords = useMemo(() => {
    if (!member) return [];
    const cleanMemberIdx = String(member.index || member.nrIndeksu || member.cleanIndex || '').replace(/\D/g, '').replace(/^0+/, '').trim();
    const cleanMemberEmail = String(member.email || '').trim().toLowerCase();
    const cleanMemberName = String(member.fullName || `${member.firstName || ''} ${member.lastName || ''}`).trim().toLowerCase();

    return ewidencjaList.filter(e => {
      if (!e) return false;
      const eIdx = String(e.nrIndeksu || e.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
      const eEmail = String(e.email || '').trim().toLowerCase();
      const eName = String(e.name || e.fullName || e.imieNazwisko || '').trim().toLowerCase();

      if (cleanMemberIdx && eIdx && cleanMemberIdx === eIdx) return true;
      if (cleanMemberEmail && eEmail && cleanMemberEmail === eEmail) return true;
      if (cleanMemberName && eName && (cleanMemberName === eName || eName.includes(cleanMemberName) || cleanMemberName.includes(eName))) return true;
      return false;
    });
  }, [member, ewidencjaList]);

  // Compute live categorized frequency data
  const freqData = useMemo(() => {
    if (!member) return { freq: 0, present: 0, absent: 0, presentMandatory: 0, mandatoryTotal: 12, optionalBonus: 0, totalAttended: 0 };
    return calculateCategorizedFrequency(
      member,
      meetings,
      customMeetingTypes,
      member.present || 0,
      member.absent || 0,
      ewidencjaList
    );
  }, [member, meetings, customMeetingTypes, ewidencjaList]);

  // Process and sort all meetings with individual student attendance status
  const auditedMeetings = useMemo(() => {
    const cleanMemberIdx = String(member?.index || member?.nrIndeksu || member?.cleanIndex || '').replace(/\D/g, '').replace(/^0+/, '').trim();
    const cleanMemberEmail = String(member?.email || '').trim().toLowerCase();
    const cleanMemberName = String(member?.fullName || `${member?.firstName || ''} ${member?.lastName || ''}`).trim().toLowerCase();

    // De-duplicate meetings by code or id
    const seenCodes = new Set();
    const uniqueMeetings = (meetings || []).filter(m => {
      if (!m) return false;
      const mCode = String(m.code || m.id || m.date || '').trim();
      if (!mCode || seenCodes.has(mCode)) return false;
      seenCodes.add(mCode);
      return true;
    });

    return uniqueMeetings.map(m => {
      const typeId = getMeetingType(m, customMeetingTypes);
      const typeConfig = MEETING_TYPES[typeId] || MEETING_TYPES.mandatory;
      const isEligibleMandatory = isMeetingEligibleForDenominator(m, customMeetingTypes, ewidencjaList);
      const mCodeUpper = String(m.code || m.id || '').replace(/[\[\]]/g, '').trim().toUpperCase();

      // Check attendance in ewidencja
      let matchingEwidencja = studentAttendanceRecords.find(e => {
        const eCode = String(e.kodSpotkania || e.meetingCode || '').replace(/[\[\]]/g, '').trim().toUpperCase();
        return eCode === mCodeUpper;
      });

      // Check attendees array if not in ewidencja
      let isAttended = Boolean(matchingEwidencja);
      let durationStr = matchingEwidencja?.durationStr || '60 min';
      let joinTime = matchingEwidencja?.joinTime || m.date || '18:00';

      if (!isAttended && Array.isArray(m.attendees) && m.attendees.length > 0) {
        isAttended = m.attendees.some(att => {
          if (!att) return false;
          if (typeof att === 'object') {
            const attIdx = String(att.index || att.member?.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
            const attEmail = String(att.email || att.member?.email || '').trim().toLowerCase();
            const attName = String(att.fullName || att.rawName || att.name || '').trim().toLowerCase();
            if (cleanMemberIdx && attIdx && cleanMemberIdx === attIdx) return true;
            if (cleanMemberEmail && attEmail && cleanMemberEmail === attEmail) return true;
            if (cleanMemberName && attName && (cleanMemberName === attName || attName.includes(cleanMemberName) || cleanMemberName.includes(attName))) return true;
            return false;
          }
          const strAtt = String(att).trim();
          const cleanAtt = strAtt.replace(/\D/g, '').replace(/^0+/, '').trim();
          return (cleanMemberIdx && cleanAtt === cleanMemberIdx) || (cleanMemberEmail && strAtt.toLowerCase() === cleanMemberEmail);
        });
      }

      // Check participantRecords
      if (!isAttended && Array.isArray(m.participantRecords) && m.participantRecords.length > 0) {
        const pRecord = m.participantRecords.find(p => {
          if (!p) return false;
          const pIdx = String(p.member?.index || p.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
          const pEmail = String(p.member?.email || p.email || '').trim().toLowerCase();
          const pName = String(p.member?.fullName || p.rawName || '').trim().toLowerCase();
          return (cleanMemberIdx && pIdx === cleanMemberIdx) || (cleanMemberEmail && pEmail === cleanMemberEmail) || (cleanMemberName && pName && (cleanMemberName === pName || pName.includes(cleanMemberName) || cleanMemberName.includes(pName)));
        });
        if (pRecord) {
          isAttended = pRecord.manualApproved !== undefined ? Boolean(pRecord.manualApproved) : (pRecord.isEligible || pRecord.status === 'approved' || pRecord.status === 'Zaliczona');
          if (pRecord.durationStr) durationStr = pRecord.durationStr;
          if (pRecord.joinTime) joinTime = pRecord.joinTime;
        }
      }

      // Check localStorage
      if (!isAttended && typeof window !== 'undefined') {
        const storageKeys = [
          `crm_attendance_${m.id}`,
          `crm_attendance_${m.date}`,
          m.code ? `crm_attendance_${m.code}` : null,
        ].filter(Boolean);

        for (const key of storageKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const atts = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.attendees) ? parsed.attendees : []);
              const matched = atts.find(p => {
                const pIdx = String(p.member?.index || p.index || '').replace(/\D/g, '').replace(/^0+/, '').trim();
                const pEmail = String(p.member?.email || p.email || '').trim().toLowerCase();
                const pName = String(p.member?.fullName || p.rawName || '').trim().toLowerCase();
                return (cleanMemberIdx && pIdx === cleanMemberIdx) || (cleanMemberEmail && pEmail === cleanMemberEmail) || (cleanMemberName && pName && (cleanMemberName === pName || pName.includes(cleanMemberName) || cleanMemberName.includes(pName)));
              });
              if (matched) {
                isAttended = matched.manualApproved !== undefined ? Boolean(matched.manualApproved) : (matched.isEligible || matched.status === 'approved' || matched.status === 'Zaliczona');
                if (matched.durationStr) durationStr = matched.durationStr;
                if (matched.joinTime) joinTime = matched.joinTime;
                break;
              }
            }
          } catch {}
        }
      }

      return {
        ...m,
        typeId,
        typeConfig,
        isEligibleMandatory,
        isAttended,
        durationStr,
        joinTime,
      };
    }).sort((a, b) => {
      const parseDate = (item) => {
        const raw = item.date || item.dataSpotkania || (item.start_dt ? String(item.start_dt).split('T')[0] : '');
        return raw ? new Date(raw).getTime() : 0;
      };
      const diff = parseDate(a) - parseDate(b);
      if (diff !== 0) return diff;
      return String(a.code || '').localeCompare(String(b.code || ''));
    });
  }, [member, meetings, customMeetingTypes, studentAttendanceRecords, ewidencjaList]);

  // Filtered meetings list based on selector
  const filteredAuditedMeetings = useMemo(() => {
    if (attendanceFilter === 'attended') {
      return auditedMeetings.filter(m => m.isAttended);
    }
    if (attendanceFilter === 'absent') {
      return auditedMeetings.filter(m => !m.isAttended && m.isEligibleMandatory);
    }
    return auditedMeetings;
  }, [auditedMeetings, attendanceFilter]);

  if (!isOpen || !member) return null;

  const dataWplywu = member.dataWplywu || member.timestamp || '—';
  const dataWeryfikacji = member.dataWeryfikacji || '—';
  const dataAktualizacji = member.dataAktualizacji || 'Brak modyfikacji';

  const freqPercent = freqData.freq ?? 0;
  const engagement = getEngagementScaleLevel(freqPercent);
  const isCertEligible = freqPercent >= 50 && freqData.absent <= 5;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDuplicateIndex) {
      alert("Podany numer indeksu jest już przypisany do innego członka koła.");
      return;
    }
    const cleanFullName = String(fullName || '').trim();
    const cleanEmailVal = String(email || '').trim();
    const cleanPhoneVal = String(phone || '').trim();
    const cleanFieldVal = String(field || '').trim();
    const cleanYearVal = String(year || '').trim();
    const cleanIdx = String(index || '').replace(/\D/g, '') || String(index || '').trim();
    const cleanAliases = Array.isArray(aliases)
      ? aliases.join(', ').trim()
      : String(aliases || '').trim();

    const nameParts = cleanFullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';

    const statusWeryfikacjiMap = {
      active: 'Aktywny',
      guest: 'Gosc',
      resigned: 'Nieaktywny',
      inactive: 'Nieaktywny',
      archived: 'Archiwum',
      pending: 'Oczekuje'
    };
    const canonicalStatusWeryfikacji = statusWeryfikacjiMap[status] || status;

    onSave({
      ...member,
      fullName: cleanFullName,
      imieNazwisko: cleanFullName,
      firstName,
      lastName,
      email: cleanEmailVal,
      index: cleanIdx,
      cleanIndex: cleanIdx,
      nrIndeksu: cleanIdx,
      phone: cleanPhoneVal,
      telefon: cleanPhoneVal,
      field: cleanFieldVal,
      kierunek: cleanFieldVal,
      year: cleanYearVal,
      aliases: cleanAliases,
      aliasy: cleanAliases,
      status,
      statusWeryfikacji: canonicalStatusWeryfikacji,
      isArchived: status === 'archived',
      isBlacklisted: status === 'archived',
      mailingConsent,
      zgodaNaMailing: mailingConsent ? 'Zgoda na mailing' : 'Brak zgody',
      consent: mailingConsent,
      zgoda: mailingConsent,
      consentStatus: mailingConsent ? 'Zgody OK' : 'Brak zgody',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto pt-4 pb-10 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-[96vw] xl:max-w-[1500px] my-auto sm:my-2 overflow-hidden flex flex-col transition-all">
        
        {/* ── Top Header Bar ── */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              {fullName ? fullName.slice(0, 2).toUpperCase() : '👤'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {fullName || 'Szczegóły Członka Koła'}
                </h2>
                {index && (
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                    #{index}
                  </span>
                )}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                  status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  status === 'guest' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  status === 'resigned' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {status === 'active' ? '🟢 Członek Aktywny' : status === 'guest' ? '🟣 Wolny Słuchacz' : status === 'resigned' ? '⚪ Rezygnacja' : '🟡 Oczekuje'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {field || 'Psychologia'} {year ? `• Rok ${year}` : ''} {currentOrg?.name ? `• ${currentOrg.name}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
            title="Zamknij okno (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── 3-Column Split Workspace (4-4-4 Layout on large screens) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-200/80 overflow-y-auto max-h-[calc(90vh-70px)]">
          
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (4/12): Formularz danych członka (Edycja)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="xl:col-span-4 p-5 space-y-3.5 bg-white">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">✏️</span>
                <span>Dane i ustawienia profilu</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Edycja rekordu</span>
            </div>

            {/* Audit Dates Metadata Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock size={12} className="text-indigo-600" />
                  <span>Wpływ zgłoszenia:</span>
                </span>
                <strong className="font-mono text-slate-800">{dataWplywu}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>Weryfikacja w CRM:</span>
                </span>
                <strong className="font-mono text-slate-800">{dataWeryfikacji}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <RefreshCw size={12} className="text-amber-600" />
                  <span>Ostatnia modyfikacja:</span>
                </span>
                <strong className="font-mono text-slate-800">{dataAktualizacji}</strong>
              </div>
            </div>

            {/* Form */}
            <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="edit-member-fullname" className="block text-xs font-semibold text-slate-700 mb-1">
                  Imię i Nazwisko
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="edit-member-fullname"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    onKeyDown={e => e.stopPropagation()}
                    className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none font-medium"
                    placeholder="np. Anna Nowak"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="edit-member-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Adres E-mail
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-member-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className={`w-full pl-8.5 pr-3 py-1.5 rounded-xl border text-xs focus:ring-2 outline-none font-medium ${
                        isDuplicateEmail ? 'border-amber-400 bg-amber-50/40 focus:ring-amber-300' : 'border-slate-200 focus:ring-indigo-300'
                      }`}
                      placeholder="student@gmail.com"
                    />
                  </div>
                  {isDuplicateEmail && (
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                      ⚠️ Email zajęty
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-member-index" className="block text-xs font-semibold text-slate-700 mb-1">
                    Numer Indeksu {!index && <span className="text-amber-600 font-normal">*</span>}
                  </label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-member-index"
                      name="index"
                      type="text"
                      value={index}
                      onChange={e => setIndex(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.stopPropagation()}
                      className={`w-full pl-8.5 pr-3 py-1.5 rounded-xl border font-mono text-xs focus:ring-2 outline-none font-medium ${
                        isDuplicateIndex ? 'border-amber-400 bg-amber-50/40 focus:ring-amber-300' : 'border-slate-200 focus:ring-indigo-300'
                      }`}
                      placeholder="np. 15998"
                    />
                  </div>
                  {isDuplicateIndex && (
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                      ⚠️ Indeks zajęty
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="edit-member-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-member-phone"
                      name="phone"
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
                      placeholder="+48 500 000 000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-member-alias" className="block text-xs font-semibold text-slate-700 mb-1">
                    Aliasy Meet / Nickname
                  </label>
                  <div className="relative">
                    <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-member-alias"
                      name="aliases"
                      type="text"
                      value={aliases}
                      onChange={e => setAliases(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none font-medium"
                      placeholder="Jan K., jankow"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="edit-member-field" className="block text-xs font-semibold text-slate-700 mb-1">
                    Kierunek studiów
                  </label>
                  <div className="relative">
                    <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-member-field"
                      name="field"
                      type="text"
                      value={field}
                      onChange={e => setField(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none font-medium"
                      placeholder="Psychologia"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-member-year" className="block text-xs font-semibold text-slate-700 mb-1">
                    Rok studiów
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-member-year"
                      name="year"
                      type="text"
                      value={year}
                      onChange={e => setYear(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none font-medium"
                      placeholder="np. Rok 2"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label htmlFor="edit-member-status" className="block text-xs font-semibold text-slate-700 mb-1">
                    Status członkostwa
                  </label>
                  <select
                    id="edit-member-status"
                    name="status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="active">🟢 Członek Aktywny</option>
                    <option value="guest">🟣 Wolny Słuchacz</option>
                    <option value="resigned">⚪ Rezygnacja</option>
                    <option value="pending">🟡 Oczekujący</option>
                    <option value="archived">📦 Archiwum</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label htmlFor="edit-member-mailing" className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      id="edit-member-mailing"
                      name="mailingConsent"
                      type="checkbox"
                      checked={mailingConsent}
                      onChange={e => setMailingConsent(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-300 border-slate-300 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">Zgoda na e-mail</span>
                  </label>
                </div>
              </div>

              {/* Action buttons pinned at bottom of left column */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Zapisz zmiany</span>
                </button>
              </div>
            </form>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              MIDDLE COLUMN (4/12): Karta Frekwencji + Skalowalna Oś Spotkań
          ══════════════════════════════════════════════════════════════════ */}
          <div className="xl:col-span-4 p-5 space-y-4 bg-slate-50/40">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">📊</span>
                <span>Frekwencja i Zaangażowanie</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isCertEligible
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {isCertEligible ? '✓ Kwalifikacja' : '⚠️ Brakuje'}
              </span>
            </div>

            {/* ── Summary Stats Header Card ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frekwencja roczna:</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {freqPercent}%
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${engagement.color}`}>
                      {engagement.icon} {engagement.label}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-400">Mianownik bazowy:</span>
                  <p className="text-xs font-bold text-slate-700 font-mono">
                    {freqData.presentMandatory} / {freqData.mandatoryTotal} spotkań
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      freqPercent >= 75 ? 'bg-emerald-500' : freqPercent >= 50 ? 'bg-teal-500' : freqPercent >= 25 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, freqPercent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>Próg zaświadczenia: 50%</span>
                  <span>100% (12/12)</span>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-1.5 text-center">
                  <span className="block text-[9px] font-bold text-emerald-700 uppercase">Zaliczone</span>
                  <span className="text-sm font-black text-emerald-900 font-mono">
                    {freqData.totalAttended}
                  </span>
                </div>
                <div className="bg-slate-100/70 border border-slate-200/70 rounded-xl p-1.5 text-center">
                  <span className="block text-[9px] font-bold text-slate-600 uppercase">Wymagane</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {freqData.mandatoryTotal}
                  </span>
                </div>
                <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-1.5 text-center">
                  <span className="block text-[9px] font-bold text-rose-700 uppercase">Nieobecności</span>
                  <span className="text-sm font-black text-rose-900 font-mono">
                    {freqData.absent}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Scalable Timeline Grid (Elastyczna siatka kafelków spotkań) ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-indigo-600" />
                  <span>Oś czasu spotkań w roku ({auditedMeetings.length}):</span>
                </span>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Obecny</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Nieobecny</span>
                </div>
              </div>

              {/* Elastyczna, zwarta siatka kafelków rosnąca swobodnie w dół */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 pt-1 max-h-72 overflow-y-auto pr-1">
                {auditedMeetings.map(m => {
                  const isAtt = m.isAttended;
                  const isMand = m.isEligibleMandatory;
                  const code = String(m.code || m.id || '').replace(/[\[\]]/g, '');

                  let tileStyle = 'bg-slate-100 text-slate-500 border-slate-200';
                  if (isAtt) {
                    tileStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold';
                  } else if (isMand) {
                    tileStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
                  } else {
                    tileStyle = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
                  }

                  return (
                    <div
                      key={m.id || m.code}
                      className={`px-1.5 py-1.5 rounded-lg border text-center text-xs transition cursor-default flex flex-col items-center justify-center hover:scale-105 ${tileStyle}`}
                      title={`${m.title || code} (${m.date || 'Brak daty'}) - ${isAtt ? 'Zaliczona' : isMand ? 'Nieobecność (obowiązkowe)' : 'Nieobowiązkowe'}`}
                    >
                      <span className="font-mono text-[10px] font-bold leading-none">{code}</span>
                      <span className="text-[8px] opacity-90 mt-0.5">{isAtt ? '✓' : isMand ? '✕' : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (4/12): Pojemna, niezależnie przewijana Historia Obecności
          ══════════════════════════════════════════════════════════════════ */}
          <div className="xl:col-span-4 p-5 space-y-3 bg-white flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck2 size={15} className="text-indigo-600" />
                <span>Historia spotkań studenta</span>
              </span>
              
              {/* Filter pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('all')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    attendanceFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Wszystkie ({auditedMeetings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('attended')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    attendanceFilter === 'attended' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Zaliczone ({freqData.totalAttended})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('absent')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    attendanceFilter === 'absent' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Braki ({freqData.absent})
                </button>
              </div>
            </div>

            {/* Independently scrollable list h-[72vh] */}
            <div className="h-[68vh] xl:h-[73vh] overflow-y-auto pr-1 space-y-2 custom-scrollbar flex-1">
              {filteredAuditedMeetings.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  Brak spotkań w wybranej kategorii.
                </div>
              ) : (
                filteredAuditedMeetings.map(m => {
                  const isAtt = m.isAttended;
                  const cleanCode = String(m.code || m.id || '').replace(/[\[\]]/g, '');

                  return (
                    <div
                      key={m.id || m.code}
                      className={`p-2.5 rounded-2xl border transition flex flex-col gap-1.5 ${
                        isAtt
                          ? 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50/80'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="font-mono text-xs font-bold text-indigo-950 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200">
                            {cleanCode}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${m.typeConfig.badgeClass}`}>
                            {m.typeConfig.label}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isAtt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle size={11} className="text-emerald-700" />
                              <span>Zaliczona</span>
                            </span>
                          ) : m.isEligibleMandatory ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle size={11} className="text-rose-500" />
                              <span>Nieobecność</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              <span>Nieobowiązkowe</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <p className="text-xs font-bold text-slate-900 leading-snug">
                        {m.title || 'Spotkanie merytoryczne koła'}
                      </p>

                      {/* Footer Info: Date & Meet Duration */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          📅 {m.date || m.dataSpotkania || 'Brak daty'}
                        </span>
                        {isAtt && (
                          <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                            ⏱️ Czas na Meet: {m.durationStr}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
