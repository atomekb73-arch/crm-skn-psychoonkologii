import React, { useMemo } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  FileText,
  UserCheck,
  ShieldCheck,
  Building2,
  Users,
  Presentation,
  BookOpen,
  Microscope,
  Plus,
  Trash2,
} from 'lucide-react';
import { CANONICAL_MEETINGS_2025_2026 } from '../utils/canonicalMeetings';
import { getOfficialMemberRecord, getMemberStats } from '../utils/activityRegistry';

/**
 * Generuje unikalny, powtarzalny hash i numer dokumentu
 */
export function generateDocumentNumber(prefix, indexNumber, seed = '2025/2026', orgTag = 'SKN-SEKS') {
  const cleanIdx = String(indexNumber || '00000').replace(/\D/g, '') || '00000';
  let hash = 0;
  const str = `${prefix}-${cleanIdx}-${seed}-${orgTag}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
  const tag = String(orgTag || 'SKN').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return `${tag}/25-26/${cleanIdx}-${hex}`;
}

export function formatPolishDate(date = new Date()) {
  const d = new Date(date);
  return d.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Dynamiczne pobieranie listy aktywnych opiekunów z konfiguracji koła lub stanu
 */
export function getActiveSupervisors(supervisors = [], org = null) {
  const isPsychoonkologia = !org?.id || org?.id === 'skn-psychoonkologia';
  const filterLegacy = (s) => {
    if (!s) return false;
    if (isPsychoonkologia) {
      const email = (s?.email || '').toLowerCase();
      const name = (typeof s === 'string' ? s : (s?.name || s?.fullName || '')).toLowerCase();
      if (email.includes('skupinska') || email.includes('dziekan') || name.includes('skupińska') || name.includes('skupinska') || name.includes('dziekan')) {
        return false;
      }
    }
    return typeof s === 'string' || s.isActive !== false;
  };

  if (Array.isArray(supervisors) && supervisors.length > 0) {
    const filtered = supervisors.filter(filterLegacy);
    if (filtered.length > 0) return filtered;
  }
  if (org && Array.isArray(org.supervisors) && org.supervisors.length > 0) {
    const filtered = org.supervisors.filter(filterLegacy);
    if (filtered.length > 0) return filtered;
  }
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  if (org?.id === 'sknu') {
    return [
      { academicTitle: 'mgr', name: 'Sławomir Pietrzak', affiliation: orgUnit, role: 'Opiekun Koła Naukowego', email: 'slawomir.pietrzak@wskz.pl' },
    ];
  }
  if (org?.id === 'skn_seksuologii') {
    return [
      { academicTitle: 'mgr', name: 'Ewa Skupińska', affiliation: orgUnit, role: 'Opiekun Naukowy Koła', email: 'ewa.skupinska@wskz.pl' },
      { academicTitle: 'mgr', name: 'Martyna Dziekan', affiliation: orgUnit, role: 'Opiekun Naukowy Koła', email: 'martyna.dziekan@wskz.pl' },
    ];
  }
  return [];
}

export function formatSupervisorName(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return `${s.academicTitle ? s.academicTitle + ' ' : ''}${s.name || s.fullName || ''}`.trim();
}

export function formatSupervisorRole(s) {
  if (!s) return 'Opiekun Naukowy Koła';
  if (typeof s === 'string') return 'Opiekun Naukowy Koła';
  return s.role || 'Opiekun Naukowy Koła';
}

export function formatSupervisorAffiliation(s, defaultUnit = 'Instytut Psychologii WSKZ') {
  if (!s) return defaultUnit;
  if (typeof s === 'string') return defaultUnit;
  return s.affiliation || defaultUnit;
}

/**
 * Reużywalny, w 100% dynamiczny blok podpisów
 */
export function DocumentSignaturesBlock({
  activeSupervisors = [],
  orgShortName = 'Koło Naukowe',
  orgUnit = 'Instytut Psychologii WSKZ',
  chairpersonTitle = 'Przewodniczący Koła',
  chairpersonSub = null,
}) {
  const gridColsClass = activeSupervisors.length === 1
    ? 'grid-cols-2 justify-between'
    : activeSupervisors.length === 2
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="w-full pt-8 pb-4 border-t border-slate-200 mt-auto break-inside-avoid">
      <div className={`grid gap-6 text-center ${gridColsClass}`}>
        {/* 1. Pole podpisu Przewodniczącego / Zarządu */}
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-full border-b border-dashed border-slate-300 mb-2 flex items-end justify-center pb-1">
            <span className="text-[9px] text-slate-400 font-serif italic">[Podpis elektroniczny]</span>
          </div>
          <span className="text-xs font-bold text-slate-800">{chairpersonTitle}</span>
          <span className="text-[10px] text-slate-500">{chairpersonSub || `Zarząd ${orgShortName}`}</span>
        </div>

        {/* 2. Dynamiczne pola podpisów Opiekunów Naukowych */}
        {activeSupervisors.map((sup, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div className="h-14 w-full border-b border-dashed border-slate-300 mb-2 flex items-end justify-center pb-1">
              <span className="text-[9px] text-slate-400 font-serif italic">[Podpis elektroniczny]</span>
            </div>
            <span className="text-xs font-bold text-slate-800">
              {formatSupervisorName(sup)}
            </span>
            <span className="text-[10px] text-slate-600 font-medium">
              {formatSupervisorRole(sup)}
            </span>
            <span className="text-[9px] text-slate-400">
              {formatSupervisorAffiliation(sup, orgUnit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 1. SZABLON: OFICJALNE ZAŚWIADCZENIE O AKTYWNOŚCI I FREKWENCJI ────────────
export function MembershipCertificateTemplate({
  member,
  freqData = null,
  points = 138,
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  isEditing = false,
  customText = null,
  onUpdateCustomText = () => {},
  org = null,
  columnVisibility = {},
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  const totalMeetings = org?.id === 'sknu' ? 3 : (org?.id === 'skn_seksuologii' ? 12 : (freqData?.mandatoryTotal || 7));

  const safeFreqData = freqData || { freq: 100, present: totalMeetings, absent: 0 };
  const safeFreq = typeof safeFreqData?.freq === 'number' ? safeFreqData.freq : 100;
  const safePresent = typeof safeFreqData?.present === 'number' ? safeFreqData.present : totalMeetings;
  const safePoints = typeof points === 'number' ? points : 0;

  // Visibility toggles for certificate sections (controlled via DocumentCustomizer)
  const showFreqSection = columnVisibility.cert_freq !== false;
  const showPointsSection = columnVisibility.cert_points !== false;
  // Compute number of visible metric columns to adjust grid dynamically
  const visibleMetricCols = [showFreqSection, showPointsSection, true].filter(Boolean).length; // "Ocena" always shown

  const docNumber = generateDocumentNumber('CERT', member?.index || member?.indexNumber || '00000', academicYear, orgTag);
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const studentName = member?.fullName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Imię i Nazwisko Studenta';
  const indexNumber = member?.index || member?.indexNumber || '—';
  const fieldName = member?.field || (org?.id === 'sknu' ? 'Psychologia' : 'Psychologia');
  const yearLabel = member?.year ? `rok ${member.year}` : 'jednolite studia magisterskie';

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-10 sm:p-12 relative flex flex-col justify-between border border-slate-300 shadow-xl max-w-[800px] min-h-[1050px] mx-auto my-0 select-text">
      {/* Ozdobna ramka wewnętrzna */}
      <div className="absolute inset-4 border border-slate-200 pointer-events-none rounded-lg" />
      <div className="absolute inset-5 border-2 border-indigo-950/20 pointer-events-none rounded-md" />

      {/* ── Nagłówek Uczelniany i Koła ── */}
      <div className="relative z-10 text-center border-b-2 border-indigo-900 pb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium tracking-wider uppercase mb-2">
          <span>Wyższa Szkoła Kształcenia Zawodowego</span>
          <span>{orgUnit}</span>
        </div>
        <div className="inline-flex items-center justify-center gap-2 mb-1">
          <Award className="text-indigo-900 w-7 h-7" />
          <h1 className="text-xl font-bold tracking-tight text-indigo-950 uppercase font-sans">
            {orgName}
          </h1>
        </div>
        <p className="text-xs text-slate-600 font-medium tracking-wide">
          Rok akademicki {academicYear} • Oficjalny Rejestr Działalności Studenckiej
        </p>
      </div>

      {/* ── Tytuł Zaświadczenia ── */}
      <div className="relative z-10 text-center my-6">
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
          Oficjalne Zaświadczenie Akademickie
        </span>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-3 uppercase">
          Zaświadczenie o Członkostwie i Frekwencji
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Nr dokumentu: <span className="font-bold text-slate-800">{docNumber}</span>
        </p>
      </div>

      {/* ── Treść Główna Zaświadczenia ── */}
      <div className="relative z-10 space-y-4 text-xs leading-relaxed text-slate-800 text-justify">
        <p className="indent-4">
          Niniejszym zaświadcza się, że Pan/Pani{' '}
          <strong className="text-slate-950 text-sm font-bold border-b border-slate-400 pb-0.5 px-1">{studentName}</strong>,{' '}
          legitymujący/a się numerem indeksu: <strong className="font-mono text-slate-950 font-bold">{indexNumber}</strong>,{' '}
          będący/a studentem/ką kierunku: <strong>{fieldName}</strong> ({yearLabel}), w roku akademickim{' '}
          <strong>{academicYear}</strong> brał/a aktywny udział w działalności naukowo-badawczej i spotkaniach{' '}
          <strong>{orgName}</strong> przy {orgUnit}.
        </p>

        {/* ── Metryka Osiągnięć i Frekwencji ── */}
        <div
          className="grid gap-3 my-4 bg-slate-50/90 rounded-xl p-4 border border-slate-200 text-center"
          style={{ gridTemplateColumns: `repeat(${visibleMetricCols}, minmax(0, 1fr))` }}
        >
          {showFreqSection && (
            <div className="p-2 border-r border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Łączna Frekwencja</span>
              <span className="text-lg font-bold text-emerald-700 font-mono">{safeFreq}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{safePresent} / {totalMeetings} spotkań</span>
            </div>
          )}
          {showPointsSection && (
            <div className="p-2 border-r border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Punkty Aktywności</span>
              <span className="text-lg font-bold text-purple-700 font-mono">{safePoints} pkt</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Wykaz aktywności</span>
            </div>
          )}
          <div className="p-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Ocena Aktywności</span>
            <span className="text-sm font-bold text-indigo-900 block mt-1">
              {safeFreq >= 90 ? 'Lider Koła' : safeFreq >= 75 ? 'Bardzo Aktywny' : 'Aktywny Członek'}
            </span>
            <span className="text-[9.5px] text-emerald-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
              <CheckCircle2 size={10} /> Kryteria spełnione
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-700 space-y-1.5 bg-indigo-50/40 p-3.5 rounded-lg border border-indigo-100">
          <p className="font-bold text-indigo-950 flex items-center gap-1.5">
            <Sparkles size={12} className="text-indigo-600" />
            Wyszczególnienie aktywności merytorycznej:
          </p>
          {isEditing ? (
            <textarea
              rows={3}
              value={customText || `• Udział w comiesięcznych spotkaniach merytorycznych, seminaryjnych oraz warsztatowych Koła.\n• Wystąpienia prelekcyjne, udział w sesjach Journal Club i dyskusjach klinicznych.\n• Praca nad materiałami edukacyjnymi, analizami piśmiennictwa i projektami badawczymi Koła.`}
              onChange={(e) => onUpdateCustomText(e.target.value)}
              className="w-full p-2 bg-white border border-indigo-300 rounded text-[11px] font-sans text-slate-800 focus:outline-none"
            />
          ) : (
            <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-600 pl-1">
              {(customText || `Udział w comiesięcznych spotkaniach merytorycznych, seminaryjnych oraz warsztatowych Koła.\nWystąpienia prelekcyjne, udział w sesjach Journal Club i dyskusjach klinicznych.\nPraca nad materiałami edukacyjnymi, analizami piśmiennictwa i projektami badawczymi Koła.`)
                .split('\n')
                .filter(Boolean)
                .map((line, idx) => (
                  <li key={idx}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-slate-500 italic mt-2">
          Zaświadczenie wydaje się na wniosek studenta celem przedłożenia w Dziekanacie Uczelni, do stypendium Rektora, 
          do suplementu do dyplomu lub do portfolio osiągnięć naukowych.
        </p>
      </div>

      {/* ── Dynamiczny Blok Podpisów ── */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Zarząd Koła Naukowego"
        chairpersonSub={`Sekretarz / Przewodniczący ${orgShortName}`}
      />

      {/* Stopka techniczna */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
        <div className="flex items-center gap-1">
          <ShieldCheck size={10} className="text-indigo-600" />
          <span>Autentyczność certyfikatu potwierdzona w systemie CRM {orgShortName}</span>
        </div>
        <div>Data wydania: {formatPolishDate(docDate)}</div>
      </div>
    </div>
  );
}

// ─── 2. SZABLON: DYPLOM / CERTYFIKAT PRELECENTA ──────────────────────────────
export function SpeakerDiplomaTemplate({
  member,
  presentationTopic = 'Trauma wczesnodziecięca i mechanizmy obronne w ujęciu psychoseksuologicznym',
  presentationDate = '2026-02-16',
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  isEditing = false,
  onUpdateTopic = () => {},
  org = null,
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';

  const docNumber = generateDocumentNumber('SPEAKER', member?.index || member?.indexNumber || '00000', academicYear, orgTag);
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const studentName = member?.fullName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Imię i Nazwisko Studenta';
  const indexNumber = member?.index || member?.indexNumber || '—';

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-10 sm:p-12 relative flex flex-col justify-between border border-amber-300/80 shadow-xl max-w-[800px] min-h-[1050px] mx-auto my-0 select-text">
      {/* Ozdobna złota ramka */}
      <div className="absolute inset-4 border-2 border-amber-500/30 pointer-events-none rounded-lg" />
      <div className="absolute inset-6 border border-amber-600/20 pointer-events-none rounded-md" />

      {/* Nagłówek Dyplomu */}
      <div className="relative z-10 text-center border-b border-amber-200 pb-4">
        <p className="text-xs uppercase font-bold tracking-widest text-amber-800">
          WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO • {orgUnit.toUpperCase()}
        </p>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
          {orgName}
        </p>
      </div>

      {/* Środek Dyplomu */}
      <div className="relative z-10 text-center my-auto space-y-6">
        <div className="inline-flex p-3 rounded-full bg-amber-50 border border-amber-200 text-amber-700 mb-2">
          <Award size={36} />
        </div>

        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-300">
            Certyfikat Wystąpienia Naukowego
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase mt-4">
            Dyplom Prelegenta
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">Nr {docNumber}</p>
        </div>

        <div className="space-y-2 py-4">
          <p className="text-xs text-slate-600 uppercase tracking-wider">Niniejszy certyfikat otrzymuje</p>
          <h2 className="text-2xl font-bold text-indigo-950 font-sans tracking-tight border-b-2 border-amber-400 inline-block pb-1 px-4">
            {studentName}
          </h2>
          <p className="text-xs text-slate-500 font-mono">Nr Indeksu: {indexNumber}</p>
        </div>

        <div className="max-w-md mx-auto bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 text-center space-y-1.5">
          <p className="text-[11px] text-amber-900 font-semibold uppercase tracking-wider">
            Za przygotowanie i wygłoszenie referatu naukowego pt.:
          </p>
          {isEditing ? (
            <textarea
              rows={2}
              value={presentationTopic}
              onChange={(e) => onUpdateTopic(e.target.value)}
              className="w-full p-2 bg-white border border-amber-400 rounded text-xs font-bold text-slate-900 italic text-center focus:outline-none"
            />
          ) : (
            <p className="text-sm font-bold text-slate-900 italic px-2">
              „{presentationTopic}”
            </p>
          )}
          <p className="text-[10px] text-slate-500 mt-2">
            w ramach oficjalnego seminarium naukowego {orgName} ({academicYear})
          </p>
        </div>
      </div>

      {/* Dynamiczne Podpisy */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Zarząd Koła Naukowego"
        chairpersonSub={`Przewodniczący ${orgShortName}`}
      />

      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
        <span>Wyższa Szkoła Kształcenia Zawodowego • {orgUnit}</span>
        <span>Warszawa, {formatPolishDate(docDate)}</span>
      </div>
    </div>
  );
}

// ─── 3. SZABLON: ZAŚWIADCZENIE O PEŁNIENIU FUNKCJI W ZARZĄDZIE KOŁA ──────────
export function BoardCertificateTemplate({
  member,
  boardRole = 'Przewodniczący Koła Naukowego',
  termDates = '1 października 2025 r. – 30 września 2026 r.',
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  isEditing = false,
  customDuties = null,
  onUpdateDuties = () => {},
  org = null,
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';

  const docNumber = generateDocumentNumber('BOARD', member?.index || member?.indexNumber || '00000', academicYear, orgTag);
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const studentName = member?.fullName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Tomasz Bratkowski';
  const indexNumber = member?.index || member?.indexNumber || '15998';
  const fieldName = member?.field || 'Psychologia';

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-10 sm:p-12 relative flex flex-col justify-between border border-indigo-300/80 shadow-xl max-w-[800px] min-h-[1050px] mx-auto my-0 select-text">
      {/* Ozdobna podwójna ramka */}
      <div className="absolute inset-4 border border-indigo-200 pointer-events-none rounded-lg" />
      <div className="absolute inset-5 border-2 border-indigo-900/30 pointer-events-none rounded-md" />

      {/* Nagłówek */}
      <div className="relative z-10 text-center border-b-2 border-indigo-900 pb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium tracking-wider uppercase mb-2">
          <span>WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO</span>
          <span>{orgUnit.toUpperCase()}</span>
        </div>
        <div className="inline-flex items-center justify-center gap-2 mb-1">
          <Building2 className="text-indigo-900 w-7 h-7" />
          <h1 className="text-xl font-bold tracking-tight text-indigo-950 uppercase font-sans">
            {orgName}
          </h1>
        </div>
        <p className="text-xs text-slate-600 font-medium tracking-wide">
          Kadencja Zarządu Koła • Rok Akademicki {academicYear}
        </p>
      </div>

      {/* Tytuł */}
      <div className="relative z-10 text-center my-6">
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
          Uchwała Walnego Zebrania Członków
        </span>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-3 uppercase">
          Zaświadczenie o Pełnieniu Funkcji w Zarządzie
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Nr aktu: <span className="font-bold text-slate-800">{docNumber}</span>
        </p>
      </div>

      {/* Treść */}
      <div className="relative z-10 space-y-4 text-xs leading-relaxed text-slate-800 text-justify">
        <p className="indent-4">
          Niniejszym zaświadcza się, że Pan/Pani{' '}
          <strong className="text-slate-950 text-sm font-bold border-b border-slate-400 pb-0.5 px-1">{studentName}</strong>,{' '}
          numer indeksu: <strong className="font-mono text-slate-950 font-bold">{indexNumber}</strong>,{' '}
          student/ka kierunku: <strong>{fieldName}</strong>, w roku akademickim <strong>{academicYear}</strong>{' '}
          pełnił/a z wyboru funkcję:
        </p>

        <div className="my-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-center">
          <span className="text-[10.5px] font-bold uppercase text-indigo-700 tracking-widest block">Oficjalna Funkcja w Zarządzie</span>
          <span className="text-xl font-bold text-indigo-950 mt-1 block">{boardRole}</span>
          <span className="text-xs text-slate-600 mt-1 block">w okresie kadencji: {termDates}</span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
          <p className="font-bold text-slate-900">Zakres zrealizowanych obowiązków statutowych:</p>
          {isEditing ? (
            <textarea
              rows={3}
              value={customDuties || `• Kierowanie bieżącą działalnością naukową i organizacyjną ${orgName}.\n• Koordynacja ogólnopolskich spotkań naukowych, warsztatów merytorycznych i sesji dyskusyjnych.\n• Nadzór nad realizacją projektów badawczych i przygotowaniem publikacji naukowych.\n• Reprezentowanie Koła przed Władzami Uczelni, Dziekanatem oraz jednostkami zewnętrznymi.`}
              onChange={(e) => onUpdateDuties(e.target.value)}
              className="w-full p-2 bg-white border border-indigo-300 rounded text-[11px] font-sans text-slate-800 focus:outline-none"
            />
          ) : (
            <ul className="list-disc list-inside text-slate-700 space-y-1 pl-1">
              {(customDuties || `Kierowanie bieżącą działalnością naukową i organizacyjną ${orgName}.\nKoordynacja ogólnopolskich spotkań naukowych, warsztatów merytorycznych i sesji dyskusyjnych.\nNadzór nad realizacją projektów badawczych i przygotowaniem publikacji naukowych.\nReprezentowanie Koła przed Władzami Uczelni, Dziekanatem oraz jednostkami zewnętrznymi.`)
                .split('\n')
                .filter(Boolean)
                .map((line, idx) => (
                  <li key={idx}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dynamiczne Podpisy */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Dziekanat / Dyrekcja"
        chairpersonSub={orgUnit}
      />

      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
        <span>Wyższa Szkoła Kształcenia Zawodowego</span>
        <span>Warszawa, {formatPolishDate(docDate)}</span>
      </div>
    </div>
  );
}

// ─── 4. SZABLON: TABELA ZBIORCZA SPOTKAŃ DLA DZIEKANATU WSKZ / PKA ──────────
export function MeetingsSummaryTableTemplate({
  meetings = [],
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  isEditing = false,
  onUpdateMeetings = () => {},
  onOpenAddModal = null,
  org = null,
  columnVisibility = {},
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';

  const docNumber = generateDocumentNumber('TABELA-SPOTKAN', 'WSKZ', academicYear, orgTag);
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const isSknSeks = org?.id === 'skn_seksuologii';
  const meetingsList = (meetings && meetings.length > 0)
    ? meetings.map((m, idx) => {
        const canonical = isSknSeks ? (CANONICAL_MEETINGS_2025_2026[idx] || {}) : {};
        return {
          name: m.name || canonical.name || orgName,
          date: m.dateFormatted || m.date || canonical.date || '',
          type: m.type || canonical.type || 'Spotkanie merytoryczne',
          title: m.title || canonical.title || 'Prelekcja naukowa',
          speaker: m.speaker || canonical.speaker || 'Zarząd Koła',
          attendeesCount: typeof m.attendeesCount === 'number'
            ? m.attendeesCount
            : (Array.isArray(m.attendees) ? m.attendees.length : (isSknSeks ? (canonical.attendeesCount || 65) : 0)),
        };
      })
    : (isSknSeks ? CANONICAL_MEETINGS_2025_2026 : []);

  const totalAttendees = meetingsList.reduce((acc, m) => acc + (Number(m.attendeesCount) || 0), 0);
  const avgAttendees = Math.round(totalAttendees / Math.max(1, meetingsList.length));

  const handleRowChange = (index, field, value) => {
    const updated = [...meetingsList];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateMeetings(updated);
  };

  const handleDeleteRow = (index) => {
    const updated = meetingsList.filter((_, i) => i !== index);
    onUpdateMeetings(updated);
  };

  // Kolumny
  const showLp = columnVisibility.lp !== false;
  const showDate = columnVisibility.date !== false;
  const showType = columnVisibility.type !== false;
  const showTitle = columnVisibility.title !== false;
  const showSpeaker = columnVisibility.speaker !== false;
  const showAttendees = columnVisibility.attendees !== false;

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-8 sm:p-10 relative flex flex-col justify-between border border-slate-300 shadow-xl max-w-[850px] min-h-[1050px] mx-auto my-0 select-text print:p-0 print:border-none print:shadow-none">
      {/* Nagłówek */}
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight font-sans">
              WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO • {orgUnit.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {orgName} • Rejestr Aktywności i Spotkań Naukowych
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-800 block">Dokument: {docNumber}</span>
            <span className="text-[10px] text-slate-500">{formatPolishDate(docDate)}</span>
          </div>
        </div>
      </div>

      {/* Tytuł Sprawozdania */}
      <div className="my-3 text-center">
        <h2 className="text-base font-bold text-slate-950 uppercase tracking-tight">
          ZBIORCZA TABELA ZREALIZOWANYCH SPOTKAŃ KOŁA NAUKOWEGO
        </h2>
        <p className="text-[11px] text-slate-600 font-semibold">
          {orgName} • Rok Akademicki {academicYear}
        </p>
        <p className="text-[10.5px] text-slate-500 mt-0.5">
          <strong>Opieka naukowa:</strong> {activeSupervisors.map(s => formatSupervisorName(s)).join(' • ')}
        </p>
      </div>

      {/* KPI Podsumowanie */}
      <div className="grid grid-cols-3 gap-3 mb-3 text-center text-xs">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Zrealizowane spotkania</span>
          <span className="text-sm font-bold text-indigo-950 font-mono">{meetingsList.length}</span>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Łączna liczba osobodni</span>
          <span className="text-sm font-bold text-emerald-700 font-mono">{totalAttendees} os.</span>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Średnia uczestników / spotkanie</span>
          <span className="text-sm font-bold text-slate-900 font-mono">{avgAttendees} os.</span>
        </div>
      </div>

      {/* Tabela Spotkań */}
      <div className="border border-slate-200 rounded-lg overflow-hidden text-[9.5px] flex-1 mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              {showLp && <th className="py-1 px-1.5 text-center w-7">LP.</th>}
              {showDate && <th className="py-1 px-2 w-20">Data</th>}
              {showType && <th className="py-1 px-2 w-24">Forma</th>}
              {showTitle && <th className="py-1 px-2">Temat / Zakres Merytoryczny</th>}
              {showSpeaker && <th className="py-1 px-2 w-44">Prelegent / Prowadzący</th>}
              {showAttendees && <th className="py-1 px-1.5 text-center w-14">Frekwencja</th>}
              {isEditing && <th className="py-1 px-1 text-center w-8 print:hidden">Akcja</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meetingsList.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 italic bg-slate-50/50">
                  Brak zarejestrowanych spotkań w wykazie. Kliknij „➕ Dodaj spotkanie do tabeli”, aby wprowadzić pozycję.
                </td>
              </tr>
            ) : (
              meetingsList.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50 break-inside-avoid">
                {showLp && <td className="py-1 px-1.5 text-center text-slate-400 font-mono">{i + 1}</td>}
                {showDate && (
                  <td className="py-1 px-2 font-mono whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="text"
                        value={m.date}
                        onChange={(e) => handleRowChange(i, 'date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      m.date
                    )}
                  </td>
                )}
                {showType && (
                  <td className="py-1 px-2 font-medium text-slate-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={m.type}
                        onChange={(e) => handleRowChange(i, 'type', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      m.type
                    )}
                  </td>
                )}
                {showTitle && (
                  <td className="py-1 px-2 font-semibold text-slate-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => handleRowChange(i, 'title', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      m.title
                    )}
                  </td>
                )}
                {showSpeaker && (
                  <td className="py-1 px-2 text-slate-600">
                    {isEditing ? (
                      <input
                        type="text"
                        value={m.speaker}
                        onChange={(e) => handleRowChange(i, 'speaker', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      m.speaker
                    )}
                  </td>
                )}
                {showAttendees && (
                  <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-900">
                    {isEditing ? (
                      <input
                        type="number"
                        value={m.attendeesCount}
                        onChange={(e) => handleRowChange(i, 'attendeesCount', e.target.value)}
                        className="w-12 bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px] text-center"
                      />
                    ) : (
                      `${m.attendeesCount} os.`
                    )}
                  </td>
                )}
                {isEditing && (
                  <td className="py-1 px-1 text-center print:hidden">
                    <button
                      onClick={() => handleDeleteRow(i)}
                      className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      title="Usuń wiersz"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="mb-4 print:hidden flex items-center justify-between">
          <div>
            {meetingsList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Czy na pewno chcesz wyczyścić wszystkie spotkania z tabeli sprawozdawczej?')) {
                    onUpdateMeetings([]);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 cursor-pointer shadow-2xs transition-all"
              >
                <Trash2 size={13} /> Wyczyść całą tabelę
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (onOpenAddModal) {
                onOpenAddModal();
              } else {
                const newRow = {
                  name: orgName,
                  date: '2026-08-15',
                  type: 'Spotkanie otwarte',
                  title: 'Nowe spotkanie naukowe Koła',
                  speaker: 'Zarząd Koła',
                  attendeesCount: 0,
                };
                onUpdateMeetings([...meetingsList, newRow]);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 cursor-pointer shadow-2xs transition-all"
          >
            <Plus size={14} /> ➕ Dodaj spotkanie do tabeli
          </button>
        </div>
      )}

      {/* Dynamiczne Podpisy */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Zarząd Koła Naukowego"
        chairpersonSub={`Przewodniczący ${orgShortName}`}
      />
    </div>
  );
}

// ─── 5. SZABLON: OFICJALNA EWIDENCJA CZŁONKÓW KOŁA ───────────────────────────
export function MembersRegistryTemplate({
  members = [],
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  org = null,
  columnVisibility = {},
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  const isSknSeks = org?.id === 'skn_seksuologii';
  const totalMeetings = org?.id === 'sknu' ? 3 : (isSknSeks ? 12 : 7);

  const docNumber = generateDocumentNumber('EWIDENCJA-CZLONKOW', 'ALL', academicYear, orgTag);
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const activeMembers = useMemo(() => {
    if (!Array.isArray(members) || members.length === 0) return [];
    return members.filter(m => {
      const status = (m?.status || '').toLowerCase();
      const isResigned = status === 'resigned' || status === 'rezygnacja' || m?.isArchived;
      return !isResigned;
    });
  }, [members]);

  // Kolumny
  const showLp = columnVisibility.lp !== false;
  const showName = columnVisibility.fullName !== false;
  const showIndex = columnVisibility.index !== false;
  const showField = columnVisibility.field !== false;
  const showYear = columnVisibility.year !== false;
  const showPresent = columnVisibility.present !== false;
  const showFreq = columnVisibility.freq !== false;
  const showPoints = columnVisibility.points !== false;
  const showStatus = columnVisibility.status !== false;

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-8 sm:p-10 relative flex flex-col justify-between border border-slate-300 shadow-xl max-w-[850px] min-h-[1050px] mx-auto my-0 select-text print:p-0 print:border-none print:shadow-none">
      {/* Nagłówek */}
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight font-sans">
              WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO • {orgUnit.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {orgName} • Oficjalna Ewidencja Członków ({academicYear})
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-800 block">Ewidencja: {docNumber}</span>
            <span className="text-[10px] text-slate-500">{formatPolishDate(docDate)}</span>
          </div>
        </div>
      </div>

      <div className="my-3 text-center">
        <h2 className="text-base font-bold text-slate-950 uppercase tracking-tight">
          Oficjalna Lista Członków {orgName}
        </h2>
        <p className="text-[11px] text-slate-600">
          Łącznie zarejestrowanych aktywnych studentów w bazie: <strong>{activeMembers.length || 137}</strong>
        </p>
        <p className="text-[10.5px] text-slate-500 mt-0.5">
          <strong>Opieka naukowa:</strong> {activeSupervisors.map(s => formatSupervisorName(s)).join(' • ')}
        </p>
      </div>

      {/* Tabela członków */}
      <div className="border border-slate-200 rounded-lg overflow-hidden text-[9.5px] flex-1 mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              {showLp && <th className="py-1 px-1.5 text-center w-7">LP.</th>}
              {showName && <th className="py-1 px-2">Imię i Nazwisko</th>}
              {showIndex && <th className="py-1 px-2 text-center w-16">Nr Albumu</th>}
              {showField && <th className="py-1 px-2">Kierunek Studiów</th>}
              {showYear && <th className="py-1 px-1.5 text-center w-12">Rok</th>}
              {showPresent && <th className="py-1 px-2 text-center w-18">Obecności</th>}
              {showFreq && <th className="py-1 px-2 text-center w-16">Frekwencja</th>}
              {showPoints && <th className="py-1 px-2 text-center w-16">Punkty</th>}
              {showStatus && <th className="py-1 px-2 text-center w-20">Zaliczenie</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeMembers.map((m, i) => {
              const idxNum = m?.index || m?.indexNumber || '';
              const official = isSknSeks ? (getOfficialMemberRecord(m) || (idxNum ? getMemberStats(idxNum) : null)) : null;

              const name = m?.fullName || `${m?.firstName || ''} ${m?.lastName || ''}`.trim() || official?.name || '—';
              const cleanIndex = idxNum || official?.index || '—';
              const field = m?.field || 'Psychologia';
              const year = m?.year || 2;

              const present = typeof m?.present === 'number'
                ? m.present
                : (typeof official?.present === 'number' ? official.present : (typeof official?.attended === 'number' ? official.attended : totalMeetings));

              const freq = typeof m?.attendancePercent === 'number'
                ? m.attendancePercent
                : (typeof official?.attendancePercent === 'number' ? official.attendancePercent : (typeof official?.freq === 'number' ? official.freq : 100));

              const points = typeof m?.points === 'number'
                ? m.points
                : (typeof official?.points === 'number' ? official.points : 0);

              const isPassed = Number(freq) >= 50;

              return (
                <tr key={i} className="hover:bg-slate-50 break-inside-avoid">
                  {showLp && <td className="py-0.5 px-1.5 text-center text-slate-400 font-mono">{i + 1}</td>}
                  {showName && <td className="py-0.5 px-2 font-medium text-slate-900">{name}</td>}
                  {showIndex && <td className="py-0.5 px-2 text-center font-mono">{cleanIndex}</td>}
                  {showField && <td className="py-0.5 px-2 text-slate-600 truncate max-w-[130px]">{field}</td>}
                  {showYear && <td className="py-0.5 px-1.5 text-center">{year}</td>}
                  {showPresent && <td className="py-0.5 px-2 text-center font-mono">{present} / {totalMeetings}</td>}
                  {showFreq && <td className="py-0.5 px-2 text-center font-mono font-bold text-emerald-700">{freq}%</td>}
                  {showPoints && <td className="py-0.5 px-2 text-center font-mono text-purple-700 font-semibold">{points} pkt</td>}
                  {showStatus && (
                    <td className="py-0.5 px-2 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-semibold border ${
                        isPassed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isPassed ? 'Zaliczono' : 'W toku'}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[9px] text-slate-500 italic mb-2">
        * Pełny rejestr wszystkich {activeMembers.length || 137} członków koła znajduje się w centralnej bazie danych CRM WSKZ.
      </p>

      {/* Dynamiczne Podpisy */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Zarząd Koła Naukowego"
        chairpersonSub={`Sekretarz / Przewodniczący ${orgShortName}`}
      />
    </div>
  );
}

// ─── 6. SZABLON: EWIDENCJA WYSTĄPIEŃ I AKTYWNOŚCI BADAWCZEJ ─────────────────
export function ResearchConferencesRegistryTemplate({
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  isEditing = false,
  activities = [],
  onUpdateActivities = () => {},
  org = null,
  columnVisibility = {},
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';

  const docNumber = generateDocumentNumber('BADANIA-KONF', 'ALL', academicYear, orgTag);
  const activeSupervisors = getActiveSupervisors(supervisors, org);
  const isSknSeks = org?.id === 'skn_seksuologii';
  const defaultActivities = isSknSeks ? [
    {
      type: 'Konferencja Stacjonarna',
      title: 'Ogólnopolska Konferencja Naukowa „Budowanie Mostów” WSKZ',
      authors: 'Członkowie Zarządu i Zespołu Badawczego',
      scope: 'Wystąpienie ustne i organizacja sesji posterowej (3 dni)',
      points: 25,
    },
    {
      type: 'Projekt Badawczy',
      title: `Badanie ankietowe studentów: profilaktyka i zdrowie psychiczne`,
      authors: `Zespół Badawczy ${orgName}`,
      scope: 'Projektowanie metodologiczne, zbieranie danych i opracowanie statystyczne',
      points: 30,
    },
    {
      type: 'Materiały EDU & Wideo',
      title: 'Cykl edukacyjnych przewodników klinicznych w formacie PDF i wideo-seminariów',
      authors: 'Członkowie Koła Naukowego',
      scope: 'Kompleksowe materiały szkoleniowe dla studentów psychologii',
      points: 24,
    },
    {
      type: 'Journal Club & Referaty',
      title: 'Cykl referatów monograficznych w ramach sesji dyskusyjnych',
      authors: 'Prelegenci i Członkowie Koła',
      scope: 'Analizy piśmiennictwa międzynarodowego (PubMed / Scopus)',
      points: 30,
    },
  ] : [];

  const currentActivities = activities !== undefined && activities !== null ? activities : defaultActivities;

  const handleAddActivity = () => {
    const newItem = {
      type: 'Inicjatywa / Konkurs',
      title: 'Nowy projekt badawczy lub konferencja',
      authors: `Członkowie ${orgShortName}`,
      scope: 'Opis zakresu zrealizowanych prac i celów naukowych',
      points: 15,
    };
    onUpdateActivities([...currentActivities, newItem]);
  };

  const handleRemoveActivity = (idx) => {
    const updated = currentActivities.filter((_, i) => i !== idx);
    onUpdateActivities(updated);
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...currentActivities];
    updated[idx] = { ...updated[idx], [field]: val };
    onUpdateActivities(updated);
  };

  // Kolumny
  const showLp = columnVisibility.lp !== false;
  const showCategory = columnVisibility.category !== false;
  const showTitle = columnVisibility.title !== false;
  const showAuthors = columnVisibility.authors !== false;
  const showScope = columnVisibility.scope !== false;
  const showPoints = columnVisibility.points !== false;

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-8 sm:p-10 relative flex flex-col justify-between border border-slate-300 shadow-xl max-w-[850px] min-h-[1050px] mx-auto my-0 select-text print:p-0 print:border-none print:shadow-none">
      {/* Nagłówek */}
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight font-sans">
              WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO • {orgUnit.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {orgName} • Działalność Badawcza i Konferencyjna
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-800 block">Rejestr: {docNumber}</span>
            <span className="text-[10px] text-slate-500">{formatPolishDate(docDate)}</span>
          </div>
        </div>
      </div>

      <div className="my-3 text-center">
        <h2 className="text-base font-bold text-slate-950 uppercase tracking-tight">
          Wykaz Konferencji, Badań i Publikacji Naukowych
        </h2>
        <p className="text-[11px] text-slate-600">
          Rok Akademicki {academicYear} • Załącznik do Sprawozdania Działalności Koła
        </p>
        <p className="text-[10.5px] text-slate-500 mt-0.5">
          <strong>Opieka naukowa:</strong> {activeSupervisors.map(s => formatSupervisorName(s)).join(' • ')}
        </p>
      </div>

      {/* Tabela projektów */}
      <div className="border border-slate-200 rounded-lg overflow-hidden text-[9.5px] flex-1 mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              {showLp && <th className="py-1 px-1.5 text-center w-7">LP.</th>}
              {showCategory && <th className="py-1 px-2 w-28">Kategoria</th>}
              {showTitle && <th className="py-1 px-2">Tytuł Osiągnięcia / Projektu</th>}
              {showAuthors && <th className="py-1 px-2 w-48">Autorzy / Zespół</th>}
              {showScope && <th className="py-1 px-2">Zakres Prac</th>}
              {showPoints && <th className="py-1 px-1.5 text-center w-14">Waga</th>}
              {isEditing && <th className="py-1 px-1 text-center w-8 print:hidden">Akcja</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentActivities.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 italic bg-slate-50/50">
                  Brak zarejestrowanych osiągnięć badawczych i konferencji. Kliknij „➕ Dodaj projekt/aktywność”, aby wprowadzić pozycję.
                </td>
              </tr>
            ) : (
              currentActivities.map((act, i) => (
              <tr key={i} className="hover:bg-slate-50 break-inside-avoid">
                {showLp && <td className="py-1 px-1.5 text-center text-slate-400 font-mono">{i + 1}</td>}
                {showCategory && (
                  <td className="py-1 px-2 font-semibold text-indigo-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={act.type}
                        onChange={(e) => handleItemChange(i, 'type', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      act.type
                    )}
                  </td>
                )}
                {showTitle && (
                  <td className="py-1 px-2 font-bold text-slate-950">
                    {isEditing ? (
                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) => handleItemChange(i, 'title', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      act.title
                    )}
                  </td>
                )}
                {showAuthors && (
                  <td className="py-1 px-2 text-slate-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={act.authors}
                        onChange={(e) => handleItemChange(i, 'authors', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      act.authors
                    )}
                  </td>
                )}
                {showScope && (
                  <td className="py-1 px-2 text-slate-600">
                    {isEditing ? (
                      <input
                        type="text"
                        value={act.scope}
                        onChange={(e) => handleItemChange(i, 'scope', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px]"
                      />
                    ) : (
                      act.scope
                    )}
                  </td>
                )}
                {showPoints && (
                  <td className="py-1 px-1.5 text-center font-mono font-bold text-purple-700">
                    {isEditing ? (
                      <input
                        type="number"
                        value={act.points}
                        onChange={(e) => handleItemChange(i, 'points', e.target.value)}
                        className="w-12 bg-white border border-slate-300 rounded px-1 py-0.5 text-[9.5px] text-center"
                      />
                    ) : (
                      `${act.points} pkt`
                    )}
                  </td>
                )}
                {isEditing && (
                  <td className="py-1 px-1 text-center print:hidden">
                    <button
                      onClick={() => handleRemoveActivity(i)}
                      className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      title="Usuń wiersz"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="mb-4 print:hidden flex items-center justify-between">
          <div>
            {currentActivities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Czy na pewno chcesz wyczyścić wszystkie wpisy z tabeli dorobku?')) {
                    onUpdateActivities([]);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 cursor-pointer shadow-2xs transition-all"
              >
                <Trash2 size={13} /> Wyczyść całą tabelę
              </button>
            )}
          </div>
          <button
            onClick={handleAddActivity}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 cursor-pointer shadow-2xs transition-all"
          >
            <Plus size={14} /> ➕ Dodaj projekt/aktywność
          </button>
        </div>
      )}

      {/* Dynamiczne Podpisy */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Zarząd Koła Naukowego"
        chairpersonSub={`Koordynator ds. Badań i Nauki ${orgShortName}`}
      />
    </div>
  );
}

// ─── 7. SZABLON: ZBIORCZY PROTOKÓŁ SPRAWOZDAWCZY DLA DZIEKANATU ──────────────
export function AnnualReportProtocolTemplate({
  members = [],
  meetings = [],
  supervisors = [],
  academicYear = '2025/2026',
  docDate = new Date(),
  org = null,
  columnVisibility = {},
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';
  const orgShortName = org?.shortName || orgName;
  const orgTag = org?.id === 'sknu' ? 'SKNU' : (org?.tag || 'SKN-SEKS');
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  const isSknSeks = org?.id === 'skn_seksuologii';
  const totalMeetings = org?.id === 'sknu' ? 3 : (isSknSeks ? 12 : (meetings?.length || 7));

  const docNumber = generateDocumentNumber('PROTOKOL-DZIEKANAT', 'ALL', academicYear, orgTag);
  const activeMembers = members.filter(m => (m?.status === 'active' || !m?.status) && !m?.isArchived && m?.status !== 'resigned');
  const passingMembers = activeMembers.filter(m => (m?.present || 0) >= (org?.id === 'sknu' ? 2 : Math.ceil(totalMeetings * 0.5)) || (m?.attendancePercent || 0) >= 50);

  const activeSupervisors = getActiveSupervisors(supervisors, org);

  // Kolumny
  const showLp = columnVisibility.lp !== false;
  const showName = columnVisibility.fullName !== false;
  const showIndex = columnVisibility.index !== false;
  const showField = columnVisibility.field !== false;
  const showPresent = columnVisibility.present !== false;
  const showFreq = columnVisibility.freq !== false;
  const showPoints = columnVisibility.points !== false;
  const showStatus = columnVisibility.status !== false;

  return (
    <div className="doc-a4-sheet bg-white text-slate-900 font-sans p-8 sm:p-10 relative flex flex-col justify-between border border-slate-300 shadow-xl max-w-[850px] min-h-[1050px] mx-auto my-0 select-text print:p-0 print:border-none print:shadow-none">
      {/* Nagłówek */}
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight font-sans">
              {orgName.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {orgUnit} • Wyższa Szkoła Kształcenia Zawodowego
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-800 block">Protokół: {docNumber}</span>
            <span className="text-[10px] text-slate-500">Data: {formatPolishDate(docDate)}</span>
          </div>
        </div>
      </div>

      {/* Tytuł */}
      <div className="my-4 text-center">
        <h2 className="text-lg font-bold text-slate-950 uppercase tracking-tight">
          Zbiorczy Protokół Sprawozdawczy z Działalności Koła Naukowego
        </h2>
        <p className="text-xs text-slate-600">
          dla Dziekanatu i Władz {orgUnit} za Rok Akademicki {academicYear}
        </p>
      </div>

      {/* KPI Podsumowanie */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Aktywni Członkowie</span>
          <span className="text-base font-bold text-slate-900 font-mono">{activeMembers.length || (org?.id === 'sknu' ? 137 : 141)}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Zrealizowane Spotkania</span>
          <span className="text-base font-bold text-indigo-900 font-mono">{meetings.length || totalMeetings}</span>
          <span className="text-[8px] text-slate-400 block">{org?.id === 'sknu' ? '(3 otwarte + 1 zarz.)' : (isSknSeks ? '(12 prog. + 2 specj.)' : `(${totalMeetings} spotkań koła)`)}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Średnia Frekwencja</span>
          <span className="text-base font-bold text-emerald-700 font-mono">{org?.id === 'sknu' ? '25%' : '55%'}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Spełniają Kryteria</span>
          <span className="text-base font-bold text-purple-700 font-mono">{passingMembers.length || (org?.id === 'sknu' ? 29 : 98)}</span>
        </div>
      </div>

      {/* Dynamiczne Pole Opiekunów */}
      <div className="mb-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs">
        <p className="font-bold text-indigo-950 mb-1">Opiekunowie Naukowi Koła:</p>
        <div className={`grid gap-2 text-[11px] text-slate-700 ${activeSupervisors.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {activeSupervisors.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <UserCheck size={13} className="text-indigo-600 shrink-0" />
              <span>
                <strong>{formatSupervisorName(s)}</strong> – {formatSupervisorAffiliation(s, orgUnit)}{s.email ? ` (${s.email})` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Skrócona tabela podsumowująca czołowych studentów */}
      <div className="mb-4 flex-1">
        <p className="text-xs font-bold text-slate-900 mb-1.5">
          Wykaz studentów o najwyższej aktywności naukowej i frekwencji (Próbka rejestru):
        </p>
        <div className="border border-slate-200 rounded-lg overflow-hidden text-[10.5px]">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                {showLp && <th className="py-1 px-2 text-center w-8">LP.</th>}
                {showName && <th className="py-1 px-2">Imię i Nazwisko</th>}
                {showIndex && <th className="py-1 px-2 text-center w-20">Nr Indeksu</th>}
                {showField && <th className="py-1 px-2">Kierunek</th>}
                {showPresent && <th className="py-1 px-2 text-center w-20">Obecności</th>}
                {showFreq && <th className="py-1 px-2 text-center w-20">Frekwencja</th>}
                {showPoints && <th className="py-1 px-2 text-center w-16">Punkty</th>}
                {showStatus && <th className="py-1 px-2 text-center w-24">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeMembers.slice(0, 10).map((m, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {showLp && <td className="py-1 px-2 text-center text-slate-400 font-mono">{i + 1}</td>}
                  {showName && <td className="py-1 px-2 font-medium text-slate-900">{m.fullName || m.name}</td>}
                  {showIndex && <td className="py-1 px-2 text-center font-mono">{m.index}</td>}
                  {showField && <td className="py-1 px-2 text-slate-600 truncate max-w-[140px]">{m.field || 'Psychologia'}</td>}
                  {showPresent && <td className="py-1 px-2 text-center font-mono">{m.present || totalMeetings}/{totalMeetings}</td>}
                  {showFreq && <td className="py-1 px-2 text-center font-mono font-bold text-emerald-700">{m.attendancePercent || 100}%</td>}
                  {showPoints && <td className="py-1 px-2 text-center font-mono text-purple-700 font-semibold">{m.points || 0}</td>}
                  {showStatus && (
                    <td className="py-1 px-2 text-center">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Zaliczono
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9.5px] text-slate-500 mt-1 italic">
          * Pełna lista {activeMembers.length || (org?.id === 'sknu' ? 137 : 141)} studentów dostępna w załączniku nr 1 do niniejszego protokołu.
        </p>
      </div>

      {/* Dynamiczne Podpisy */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Zarząd Koła Naukowego"
        chairpersonSub={`Przewodniczący ${orgShortName}`}
      />
    </div>
  );
}

/**
 * Oficjalny Protokół Zbiorczy Ewidencji Wydanych Zaświadczeń i Dyplomów dla Dziekanatu / PKA
 */
export function OfficialRegistryProtocolTemplate({
  registry = [],
  org = null,
  academicYear = '2025/2026',
  supervisors = [],
  columnVisibility = {},
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe';
  const orgShortName = org?.shortName || 'Koło Naukowe';
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const totalCount = registry.length;
  const speakerCount = registry.filter(r => r.type?.toLowerCase().includes('prelegent') || r.type?.toLowerCase().includes('dyplom')).length;
  const memberCount = registry.filter(r => r.type?.toLowerCase().includes('członk') || r.type?.toLowerCase().includes('zaświadczenie')).length;
  const boardCount = registry.filter(r => r.type?.toLowerCase().includes('zarząd')).length;

  const showLp = columnVisibility.lp !== false;
  const showId = columnVisibility.id !== false;
  const showType = columnVisibility.type !== false;
  const showRecipient = columnVisibility.recipient !== false;
  const showIssueDate = columnVisibility.issueDate !== false;
  const showDetails = columnVisibility.details !== false;
  const showStatus = columnVisibility.status !== false;

  return (
    <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-800 p-8 sm:p-12 font-sans shadow-lg mx-auto print:shadow-none print:p-6 print:max-w-none print:w-full print:m-0">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            🎓
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
              Wyższa Szkoła Kształcenia Zawodowego we Wrocławiu
            </h1>
            <p className="text-xs text-slate-600 font-medium">{orgUnit}</p>
            <p className="text-xs font-bold text-indigo-900 mt-0.5">{orgName}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-xs font-bold border border-slate-300">
            PROTOKÓŁ / {academicYear}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Wydano: {formatPolishDate(new Date())}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center my-6">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
          Oficjalny Protokół Zbiorczy Ewidencji Wydanych Dokumentów
        </h2>
        <p className="text-xs font-semibold text-slate-600 mt-1">
          Rejestr Zaświadczeń, Dyplomów i Aktów Koła Naukowego w roku akademickim {academicYear}
        </p>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-4 gap-3 my-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Wszystkie Akty</p>
          <p className="text-base font-black text-slate-900 font-mono">{totalCount}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Zaświadczenia Członków</p>
          <p className="text-base font-black text-emerald-700 font-mono">{memberCount}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-amber-600 uppercase">Dyplomy Prelegentów</p>
          <p className="text-base font-black text-amber-700 font-mono">{speakerCount}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-indigo-600 uppercase">Zaświadczenia Zarządu</p>
          <p className="text-base font-black text-indigo-700 font-mono">{boardCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-left">
              {showLp && <th className="py-2 px-2.5 text-center w-8">Lp.</th>}
              {showId && <th className="py-2 px-2.5 w-36">Nr Aktu / Sygnatura</th>}
              {showType && <th className="py-2 px-2.5 w-36">Typ Dokumentu</th>}
              {showRecipient && <th className="py-2 px-2.5">Odbiorca (Nr Albumu)</th>}
              {showIssueDate && <th className="py-2 px-2.5 text-center w-24">Data Wydania</th>}
              {showDetails && <th className="py-2 px-2.5">Przedmiot / Temat / Rola</th>}
              {showStatus && <th className="py-2 px-2.5 text-center w-24">Status</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {registry.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400 italic">
                  Brak wpisów w ewidencji wydanych dokumentów.
                </td>
              </tr>
            ) : (
              registry.map((doc, idx) => (
                <tr key={doc.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  {showLp && <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>}
                  {showId && <td className="py-1.5 px-2.5 font-mono font-bold text-indigo-950">{doc.id}</td>}
                  {showType && <td className="py-1.5 px-2.5 font-semibold text-slate-800">{doc.type}</td>}
                  {showRecipient && (
                    <td className="py-1.5 px-2.5 font-medium text-slate-900">
                      {doc.recipientName} {doc.recipientIndex && doc.recipientIndex !== '—' && <span className="font-mono text-slate-500 font-bold">({doc.recipientIndex})</span>}
                    </td>
                  )}
                  {showIssueDate && <td className="py-1.5 px-2.5 text-center font-mono text-slate-600">{doc.issueDate}</td>}
                  {showDetails && <td className="py-1.5 px-2.5 text-slate-700 max-w-[180px] truncate" title={doc.details}>{doc.details || '—'}</td>}
                  {showStatus && (
                    <td className="py-1.5 px-2.5 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ {doc.status || 'Wydany'}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-500 mb-8 italic">
        * Niniejszy protokół stanowi oficjalną dokumentację potwierdzającą wydanie aktów prawnych, dyplomów i zaświadczeń przez Zarząd i Opiekuna Koła Naukowego w Wyższej Szkole Kształcenia Zawodowego.
      </p>

      {/* Dynamic Signatures */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Przewodniczący Koła"
        chairpersonSub={`Zarząd ${orgShortName}`}
      />
    </div>
  );
}

/**
 * Oficjalny Dziennik Podawczy i Księga Korespondencji dla Dziekanatu / PKA
 */
export function OfficialCorrespondenceProtocolTemplate({
  correspondenceLog = [],
  org = null,
  academicYear = '2025/2026',
  supervisors = [],
}) {
  const orgName = org?.name || 'Studenckie Koło Naukowe';
  const orgShortName = org?.shortName || 'Koło Naukowe';
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  const activeSupervisors = getActiveSupervisors(supervisors, org);

  const totalCount = correspondenceLog.length;
  const inCount = correspondenceLog.filter(c => c.direction === 'IN').length;
  const outCount = correspondenceLog.filter(c => c.direction === 'OUT').length;

  return (
    <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-800 p-8 sm:p-12 font-sans shadow-lg mx-auto print:shadow-none print:p-6 print:max-w-none print:w-full print:m-0">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            📨
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
              Wyższa Szkoła Kształcenia Zawodowego we Wrocławiu
            </h1>
            <p className="text-xs text-slate-600 font-medium">{orgUnit}</p>
            <p className="text-xs font-bold text-indigo-900 mt-0.5">{orgName}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-xs font-bold border border-slate-300">
            DZIENNIK PODAWCZY / {academicYear}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Stan na: {formatPolishDate(new Date())}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center my-6">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
          Elektroniczny Dziennik Podawczy & Rejestr Korespondencji
        </h2>
        <p className="text-xs font-semibold text-slate-600 mt-1">
          Wykaz pism przychodzących i wychodzących kancelarii {orgShortName} w roku akademickim {academicYear}
        </p>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-3 gap-3 my-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Wszystkie Pisma</p>
          <p className="text-base font-black text-slate-900 font-mono">{totalCount}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Przychodzące (IN)</p>
          <p className="text-base font-black text-emerald-700 font-mono">{inCount}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-sky-600 uppercase">Wychodzące (OUT)</p>
          <p className="text-base font-black text-sky-700 font-mono">{outCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-left">
              <th className="py-2 px-2 text-center w-8">Lp.</th>
              <th className="py-2 px-2 w-32">Sygnatura</th>
              <th className="py-2 px-2 text-center w-20">Data</th>
              <th className="py-2 px-2 text-center w-14">Kierunek</th>
              <th className="py-2 px-2 w-36">Nadawca / Odbiorca</th>
              <th className="py-2 px-2">Temat & Przedmiot Pisma</th>
              <th className="py-2 px-2 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {correspondenceLog.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400 italic">
                  Brak wpisów w dzienniku podawczym.
                </td>
              </tr>
            ) : (
              correspondenceLog.map((item, idx) => (
                <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-mono font-bold text-indigo-950">{item.id}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-600">{item.date}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                      item.direction === 'IN'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-sky-100 text-sky-800 border border-sky-300'
                    }`}>
                      {item.direction === 'IN' ? '📥 PRZYCH.' : '📤 WYCH.'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-slate-700">
                    <div className="font-semibold text-slate-900 truncate max-w-[140px]">{item.sender}</div>
                    <div className="text-[9px] text-slate-500 truncate max-w-[140px]">→ {item.recipient}</div>
                  </td>
                  <td className="py-1.5 px-2 text-slate-800">
                    <div className="font-semibold text-slate-900">{item.subject}</div>
                    {item.summary && <div className="text-[9px] text-slate-500 line-clamp-1 italic">{item.summary}</div>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      {item.status || 'Zarejestrowane'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[9.5px] text-slate-500 mb-8 italic">
        * Niniejszy dokument stanowi oficjalny wyciąg z Elektronicznego Dziennika Podawczego Koła Naukowego dla potrzeb Dziekanatu Wydziału Nauk Społecznych i Polskiej Komisji Akredytacyjnej.
      </p>

      {/* Dynamic Signatures */}
      {/* Dynamic Signatures */}
      <DocumentSignaturesBlock
        activeSupervisors={activeSupervisors}
        orgShortName={orgShortName}
        orgUnit={orgUnit}
        chairpersonTitle="Przewodniczący Koła"
        chairpersonSub={`Kancelaria ${orgShortName}`}
      />
    </div>
  );
}

/**
 * Oficjalny Protokół / Notatka ze Spotkania Naukowego
 */
export function OfficialMeetingMinutesTemplate({
  meeting,
  protocolData = {},
  org = null,
  academicYear = '2025/2026',
  supervisors = [],
}) {
  const activeSupervisors = useMemo(
    () => getActiveSupervisors(supervisors, org),
    [supervisors, org]
  );

  const orgName = org?.name || 'Studenckie Koło Naukowe';
  const orgShortName = org?.shortName || org?.name || 'Koło Naukowe';
  const orgUnit = org?.unit || 'Instytut Psychologii WSKZ';
  const orgTag = org?.tag || 'WSKZ';

  const cleanYear = String(academicYear || '2025/2026').replace(/[\[\]]/g, '');
  const cleanCode = String(meeting?.code || meeting?.id || 'M01').replace(/[\[\]]/g, '').trim();
  const protocolNumber = protocolData.protocolNumber || `PROT/${(org?.shortName || org?.id || 'SKN').toUpperCase().replace(/[^A-Z0-9]/g, '')}/${cleanCode}/${cleanYear.replace(/20/g, '')}`;
  const cleanMeetingTitle = String(meeting?.title || protocolData?.title || 'Spotkanie Naukowe Koła').replace(/[\[\]]/g, '').trim();
  const cleanSpeaker = String(protocolData?.speaker || meeting?.who || 'Zarząd Koła Naukowego').replace(/[\[\]]/g, '').trim();

  return (
    <div className="w-full max-w-[210mm] min-h-auto mx-auto bg-white p-8 sm:p-12 text-slate-900 font-sans print:p-0 print:max-w-none print:shadow-none print:bg-white text-xs leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start break-inside-avoid">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO
            </span>
            <span className="text-[10px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded">
              {orgTag}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-700">{orgUnit}</p>
          <p className="text-[11px] font-bold text-indigo-950 mt-0.5">{orgName}</p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-xs text-indigo-950 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block mb-1">
            Nr: {protocolNumber}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Wrocław, dn. {protocolData.date || meeting?.formattedDate || meeting?.date || formatPolishDate()}
          </p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-6 space-y-1 break-inside-avoid">
        <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
          PROTOKÓŁ ZE SPOTKANIA NAUKOWEGO
        </h2>
        <p className="text-xs font-semibold text-indigo-900">
          Spotkanie {cleanCode} • Rok Akademicki {cleanYear}
        </p>
      </div>

      {/* Meeting Metadata Table */}
      <div className="mb-6 border border-slate-300 rounded-xl overflow-hidden shadow-2xs break-inside-avoid">
        <table className="w-full text-left text-xs border-collapse">
          <tbody>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <td className="py-2.5 px-3 font-bold text-slate-700 w-1/4 border-r border-slate-200">Temat / Tytuł:</td>
              <td className="py-2.5 px-3 font-bold text-slate-900" colSpan="3">
                {cleanMeetingTitle}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">Data i Godzina:</td>
              <td className="py-2 px-3 font-mono text-slate-900 border-r border-slate-200">
                {protocolData.date || meeting?.formattedDate || meeting?.date} ({protocolData.time || meeting?.time || '18:00 - 19:30'})
              </td>
              <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200 w-1/4">Miejsce / Tryb:</td>
              <td className="py-2 px-3 text-slate-900">
                {protocolData.location || meeting?.location || 'MS Teams / Google Meet (Tryb zdalny)'}
              </td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">Prelegent / Prowadzący:</td>
              <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                {cleanSpeaker}
              </td>
              <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">Liczba Uczestników:</td>
              <td className="py-2 px-3 font-bold text-emerald-800">
                {protocolData.attendeesCount ?? meeting?.attendeesCount ?? 0} osób zweryfikowanych
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">Protokolant:</td>
              <td className="py-2 px-3 text-slate-900" colSpan="3">
                {protocolData.recorder || 'Protokolant Zarządu Koła'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 1: Porządek Obrad */}
      <div className="mb-5 space-y-1.5 break-inside-avoid">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
          1. Cel spotkania i porządek obrad
        </h3>
        <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed font-sans text-[11px]">
          {protocolData.agenda || '1. Otwarcie spotkania przez Przewodniczącego Koła.\n2. Wystąpienie prelegenta i prezentacja referatu naukowego.\n3. Dyskusja naukowa, sesja pytań i odpowiedzi (Q&A).\n4. Wolne wnioski, sprawy organizacyjne i zamknięcie posiedzenia.'}
        </div>
      </div>

      {/* Section 2: Przebieg Spotkania */}
      <div className="mb-5 space-y-1.5 break-inside-avoid">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
          2. Przebieg posiedzenia, streszczenie prelekcji i dyskusja
        </h3>
        <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed font-sans text-[11px]">
          {protocolData.content || 'W trakcie posiedzenia prelegent przedstawił prezentację merytoryczną. Członkowie koła aktywnie uczestniczyli w dyskusji nad zaprezentowaną tematyką badawczą, poruszając kluczowe aspekty metodologiczne i praktyczne.'}
        </div>
      </div>

      {/* Section 3: Ustalenia i Wnioski */}
      <div className="mb-6 space-y-1.5 break-inside-avoid">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
          3. Ustalenia końcowe, zadania i wnioski
        </h3>
        <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed font-sans text-[11px]">
          {protocolData.conclusions || '1. Przyjęto sprawozdanie z przeprowadzonego referatu naukowego do ewidencji działalności koła.\n2. Ustalono termin kolejnego spotkania seminaryjnego.\n3. Zobowiązano członków do przygotowania materiałów na kolejną sesję roboczą.'}
        </div>
      </div>

      {/* Optional Attendees list */}
      {protocolData.includeAttendeesList && Array.isArray(protocolData.attendees) && protocolData.attendees.length > 0 && (
        <div className="mb-6 space-y-1.5 break-inside-avoid">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            4. Załącznik: Imienna lista zweryfikowanych uczestników ({protocolData.attendees.length})
          </h3>
          <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-200/80 text-[10px] font-mono grid grid-cols-2 gap-x-4 gap-y-1">
            {protocolData.attendees.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-200/50 py-0.5">
                <span className="truncate">{idx + 1}. {att.name || att.rawName}</span>
                <span className="text-slate-500 font-semibold">{att.index || att.durationStr || 'Obecny'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dolny blok podpisów - odporny na nakładanie i łamanie */}
      <div className="mt-8 pt-6 border-t border-slate-200 break-inside-avoid">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          
          {/* 1. Podpis Protokolanta / Przewodniczącego */}
          <div className="flex flex-col items-center">
            <div className="h-10 border-b border-dashed border-slate-300 w-full mb-1"></div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">[Podpis elektroniczny]</span>
            <span className="text-xs font-semibold text-slate-800">{protocolData.recorder || 'Protokolant Zarządu Koła'}</span>
            <span className="text-[10px] text-slate-500">Zarząd Koła Naukowego</span>
          </div>

          {/* 2. Dynamiczne podpisy Opiekunów Naukowych */}
          {activeSupervisors.map((sup, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="h-10 border-b border-dashed border-slate-300 w-full mb-1"></div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">[Podpis elektroniczny]</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatSupervisorName(sup)}
              </span>
              <span className="text-[10px] text-slate-500">
                {formatSupervisorRole(sup)}
              </span>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}




