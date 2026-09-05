import { initialMembers as seedMembers } from '../data/seedMembers.js';

export function extractSheetId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return str;
}

// ─── Google Sheets gviz/tq fetcher with strict WHITELIST ────────────────────
// Domyślny arkusz dla Studenckiego Koła Naukowego Psychoonkologii WSKZ
const envSheetInput = import.meta.env?.VITE_GOOGLE_SHEET_ID || import.meta.env?.VITE_SHEETS_URL;
export const SHEET_ID = envSheetInput ? extractSheetId(envSheetInput) : '1HbpVQkKdtKqsg0Ew5d3AigZBq-wvQYmJ-vpSIIWLFpg';

// ─── Data graniczna (Cut-off Watermark) dla nowych zgłoszeń w kwarantannie ──
// Parser ignoruje zgłoszenia starsze niż 5 września 2026 r. 00:00:00
export const CUTOFF_DATE = new Date('2026-09-05T00:00:00');


export const AUTHORIZED_INDEXES = new Set([]);

function buildUrl(sheetName, sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return '';
  return `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

/** Parsuje odpowiedź gviz/tq (opakowana w JS callback) i zwraca { cols, rows } */
export async function fetchSheet(sheetName, sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return null;
  const candidates = sheetName
    ? [sheetName, 'Aktualna_lista_KN', 'Baza_Kwarantanna', 'Zarz%C4%85dzanie', 'Zarządzanie', 'Zarzadzanie', 'Arkusz1', 'Sheet1']
    : ['Aktualna_lista_KN', 'Baza_Kwarantanna', 'Zarz%C4%85dzanie', 'Zarządzanie', 'Arkusz1', 'Sheet1'];

  let lastStatus = 0;
  for (const name of candidates) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if (!res.ok) {
        lastStatus = res.status;
        if (res.status === 401) {
          throw new Error(`Odmowa dostępu (HTTP 401) do arkusza ${cleanId}. Włącz w Google Drive: Udostępnij -> Każda osoba mająca link (Przeglądający).`);
        }
        continue;
      }
      const text = await res.text();
      const jsonStr = text.replace(/^[^{]*/, '').replace(/\);?\s*$/, '');
      const data = JSON.parse(jsonStr);
      if (data.status === 'ok' && data.table) {
        return data.table;
      }
    } catch (e) {
      if (e.message.includes('401')) throw e;
    }
  }

  // Fallback bez parametru sheet (domyślny pierwszy arkusz / gid=0)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error(`Odmowa dostępu (HTTP 401) do arkusza ${cleanId}. Włącz w Google Drive: Udostępnij -> Każda osoba mająca link (Przeglądający).`);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    const jsonStr = text.replace(/^[^{]*/, '').replace(/\);?\s*$/, '');
    const data = JSON.parse(jsonStr);
    if (data.status === 'ok' && data.table) {
      return data.table;
    }
  } catch (e) {
    throw e;
  }

  throw new Error(`Nie znaleziono danych w arkuszu "${sheetName || cleanId}" (HTTP ${lastStatus || 'błąd'})`);
}

export async function testSheetConnection(sheetId) {
  try {
    const cleanId = extractSheetId(sheetId);
    if (!cleanId) return { ok: false, error: 'Brak ID arkusza' };
    const candidates = ['Aktualna_lista_KN', 'Baza_Kwarantanna', 'Zarządzanie', 'Zarz%C4%85dzanie', 'Arkusz1', 'Sheet1'];
    let table = null;
    let foundTab = '';
    for (const tab of candidates) {
      try {
        table = await fetchSheet(tab, cleanId);
        if (table?.rows?.length > 0) {
          foundTab = tab;
          break;
        }
      } catch {}
    }
    if (!table) {
      table = await fetchSheet('', cleanId);
    }
    const rowCount = table?.rows?.length || 0;
    return { ok: true, rowCount, message: `Połączono pomyślnie! Znaleziono ${rowCount} wierszy w arkuszu${foundTab ? ` (${foundTab})` : ''}.` };
  } catch (err) {
    return { ok: false, error: err.message || 'Nie udało się połączyć z arkuszem' };
  }
}

function cellVal(cell) {
  if (!cell) return null;
  return cell.v ?? null;
}
function cellStr(cell) {
  const v = cellVal(cell);
  return v != null ? String(v).trim() : '';
}
function cellNum(cell) {
  const v = cellVal(cell);
  return v != null ? Math.round(Number(v)) : null;
}

export function parsePercent(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    return val <= 1 ? Math.round(val * 100) : Math.round(val);
  }
  const cleaned = String(val).replace('%', '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

function normalizeIndex(idx) {
  if (!idx) return '';
  const str = String(idx).trim();
  return str.replace(/^0+/, '') || str;
}

function allConsentsOk(row) {
  const h = cellStr(row.c[7]);
  const i = cellStr(row.c[8]);
  const j = cellStr(row.c[9]);
  const k = cellStr(row.c[10]);
  return [h, i, j, k].every(s => s.toUpperCase().startsWith('TAK'));
}

function parseName(row) {
  const c = cellStr(row.c[2]);
  const d = cellStr(row.c[3]);
  if (d.includes('@') || d === '') return c;
  if (c.includes(' ')) return c;
  return `${c} ${d}`.trim();
}

function parseEmail(row) {
  const d = cellStr(row.c[3]);
  const b = cellStr(row.c[1]);
  if (d && d.includes('@') && !d.includes(' ')) return d.toLowerCase().trim();
  return b.toLowerCase().trim();
}

function cleanName(name) {
  return name
    .replace(/REZYGNACJA/gi, '')
    .replace(/NIE STUDENTKA/gi, '')
    .replace(/NIE STUDENT/gi, '')
    .trim();
}

function isResignation(row) {
  const c = cellStr(row.c[2]);
  const d = cellStr(row.c[3]);
  return /REZYGNACJA/i.test(c) || /REZYGNACJA/i.test(d);
}

function parseGvizDate(cell) {
  if (!cell) return null;
  const v = cell.v;
  if (!v) return null;
  const match = String(v).match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('pl-PL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─── Główna funkcja pobierania danych ──────────────────────────────────────────

export async function fetchAllData(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) {
    return { members: seedMembers, quarantine: [] };
  }

  // ── Dedykowany parser dla SKN Psychoonkologii WSKZ ────────────────────────
  // Arkusz: 1HbpVQkKdtKqsg0Ew5d3AigZBq-wvQYmJ-vpSIIWLFpg
  // Zakładka z aktywnymi członkami: Aktualna_lista_KN (165 członków)
  // Zakładka z nowymi zgłoszeniami: Baza_Kwarantanna (Cut-off Date: 2026-09-05 00:00:00)
  if (cleanId === '1HbpVQkKdtKqsg0Ew5d3AigZBq-wvQYmJ-vpSIIWLFpg' || cleanId === SHEET_ID) {
    let members = [];
    let quarantine = [];

    // 1. Pobierz aktualną listę aktywnych członków koła z Zarządzanie lub Aktualna_lista_KN
    try {
      let activeTable = null;
      let usedTab = 'Zarządzanie';
      try {
        activeTable = await fetchSheet('Zarządzanie', cleanId);
      } catch {}
      if (!activeTable || !activeTable.rows || activeTable.rows.length === 0) {
        try {
          activeTable = await fetchSheet('Aktualna_lista_KN', cleanId);
          usedTab = 'Aktualna_lista_KN';
        } catch {}
      }

      if (activeTable && activeTable.rows && activeTable.rows.length > 0) {
        const rawRows = activeTable.rows.filter(r => r && r.c);
        members = rawRows.map((row, index) => {
          if (usedTab === 'Zarządzanie' && index < 2) return null; // Pomiń wiersz 0 (KPI) oraz wiersz 1 (Nagłówki)
          const c = row.c || [];

          let fullName = '';
          let rawIndex = '';
          let phone = '';
          let email = '';
          let field = 'Psychologia';
          let year = 'Rok 1-5';
          let status = 'active';

          if (usedTab === 'Zarządzanie') {
            email = cellStr(c[0]);
            fullName = cellStr(c[1]);
            phone = cellStr(c[2]);
            rawIndex = String(cellNum(c[3]) ?? cellStr(c[3]) ?? '');
            const statusColText = cellStr(c[6]).toLowerCase();
            if (/rezygnacja|byli|rezygn/i.test(statusColText)) {
              status = 'resigned';
            }
          } else {
            fullName = cellStr(c[0]);
            rawIndex = String(cellNum(c[1]) ?? cellStr(c[1]) ?? '');
            phone = cellStr(c[2]);
            email = cellStr(c[3]);
            field = cellStr(c[4]) || 'Psychologia';
            year = cellStr(c[5]) || '';
          }

          if (!fullName || fullName.toLowerCase().includes('imię i nazwisko') || fullName.toLowerCase().includes('- wpisz -')) {
            return null;
          }
          if (!email && !rawIndex) return null;

          const cleanIndex = normalizeIndex(rawIndex);

          // Odczyt statusu zgody na mailing bezpośrednio z kolumny M (indeks 12) zakładki Zarządzanie
          const rawColM = cellStr(c[12]);
          const rawColL = cellStr(c[11]);
          const colMailing = rawColM || rawColL;
          const isExplicitConsent = colMailing.trim() === 'Zgoda na mailing' || colMailing.toLowerCase() === 'zgoda na mailing';
          const isExplicitNoConsent = colMailing.trim() === 'Brak zgody' || colMailing.toLowerCase() === 'brak zgody';

          let zgodaNaMailing = 'Zgoda na mailing';
          let mailingConsent = true;

          if (isExplicitNoConsent) {
            zgodaNaMailing = 'Brak zgody';
            mailingConsent = false;
          } else if (isExplicitConsent) {
            zgodaNaMailing = 'Zgoda na mailing';
            mailingConsent = true;
          } else if (colMailing.trim()) {
            zgodaNaMailing = colMailing.trim();
            mailingConsent = zgodaNaMailing === 'Zgoda na mailing';
          }

          const parts = fullName.split(' ');
          const firstName = parts[0] || '';
          const lastName = parts.slice(1).join(' ') || '';

          return {
            id: `psy_m_${index + 1}`,
            memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase().trim()}` : `psy_m_${index + 1}`),
            fullName,
            firstName,
            lastName,
            index: cleanIndex || rawIndex,
            cleanIndex,
            email: email ? email.toLowerCase().trim() : '',
            phone,
            field,
            year,
            status,
            mailingConsent,
            zgodaNaMailing,
            consentStatus: mailingConsent ? 'Zgody OK' : 'Brak zgody',
            points: 0,
            present: 0,
            absent: 0,
            attendancePercent: 0,
            certStatus: 'W toku',
            timestamp: '2026-09-04',
            fromSheet: usedTab,
          };
        }).filter(Boolean);
      }
    } catch (err) {
      console.warn('Błąd pobierania członków z Google Sheets, używam bazy seed:', err);
    }

    if (!members || members.length === 0) {
      members = seedMembers;
    }

    // 2. Pobierz zgłoszenia z Baza_Kwarantanna (z uwzględnieniem Cut-off Date 2026-09-05 00:00:00)
    try {
      const kwarantannaTable = await fetchSheet('Baza_Kwarantanna', cleanId);
      if (kwarantannaTable && kwarantannaTable.rows && kwarantannaTable.rows.length > 0) {
        const rows = kwarantannaTable.rows.filter(r => r && r.c);
        const cutoffTime = CUTOFF_DATE.getTime();

        quarantine = rows.map((row, index) => {
          const c = row.c || [];
          // c[1] to sygnatura czasowa
          const rawDate = parseGvizDate(c[1]);
          if (!rawDate) return null;

          // Ignoruj zgłoszenia sprzed daty granicznej 2026-09-05 00:00:00
          if (rawDate.getTime() < cutoffTime) {
            return null;
          }

          const email = cellStr(c[5]) || cellStr(c[2]);
          const firstName = cellStr(c[3]);
          const lastName = cellStr(c[4]);
          const fullName = `${firstName} ${lastName}`.trim() || firstName;
          const rawIndex = String(cellNum(c[6]) ?? cellStr(c[6]) ?? '');
          const cleanIndex = normalizeIndex(rawIndex);
          const field = cellStr(c[7]) || 'Psychologia';
          const year = cellStr(c[8]) || '';
          const phone = cellStr(c[9]) || '';
          const supervisorVerif = cellStr(c[19]);
          const uniStatus = cellStr(c[21]);
          const rodoConsent = cellStr(c[11]);

          const isConsented = /zgody ok|zgoda/i.test(supervisorVerif) || /wyrażam zgodę/i.test(rodoConsent);
          const isExplicitDupe = /duplikat/i.test(supervisorVerif) || /duplikat/i.test(uniStatus);
          const isResignation = /rezygnacja|rezygn/i.test(`${fullName} ${supervisorVerif} ${uniStatus}`);

          return {
            id: `psy_q_${index + 1}`,
            memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase().trim()}` : `psy_q_${index + 1}`),
            fullName,
            firstName,
            lastName,
            index: cleanIndex || rawIndex,
            cleanIndex,
            email: email ? email.toLowerCase().trim() : '',
            phone,
            field,
            year,
            consentStatus: isConsented ? 'Zgody OK' : 'Oczekuje na weryfikację',
            isDuplicate: isExplicitDupe,
            isResignation,
            status: uniStatus || 'Oczekiwanie 💬',
            timestamp: formatDate(rawDate),
            rawTimestamp: rawDate,
            fromSheet: 'Baza_Kwarantanna',
          };
        }).filter(Boolean);
      }
    } catch (err) {
      console.warn('Błąd pobierania Baza_Kwarantanna z Google Sheets:', err);
    }

    // 3. Pobierz ewidencję poczty z dedykowanej zakładki Ewidencja_Poczty
    let mailLog = [];
    try {
      const mailRes = await fetchMailRegistryFromSheet(cleanId);
      if (mailRes.ok && Array.isArray(mailRes.entries) && mailRes.entries.length > 0) {
        mailLog = mailRes.entries;
      }
    } catch (err) {
      console.warn('Błąd pobierania Ewidencja_Poczty z Google Sheets:', err);
    }

    return { members, quarantine, mailLog };
  }

  const zarzadzanieTable = await fetchSheet('Zarz%C4%85dzanie', cleanId);
  if (!zarzadzanieTable) {
    return { members: [], quarantine: [] };
  }

  // ── Dedykowany parser dla SKNU (SKN Psychologii Zachowań Ryzykownych i Uzależnień) ──
  if (cleanId === '1xIJDJP2PpIJY8EfaY2gf6Qcq3YBcSCKX3BW-oO92u6Y') {
    const rawRows = (zarzadzanieTable.rows ?? []).filter(r => r && r.c);
    const members = [];

    const isAttendedCell = (cell) => {
      if (!cell) return 0;
      const v = cell.v ?? cell;
      if (typeof v === 'number') return v === 1 ? 1 : 0;
      const str = String(v).trim();
      return str === '1' || str.toLowerCase() === 'tak' || str.toLowerCase() === 'true' ? 1 : 0;
    };

    rawRows.forEach((row, index) => {
      if (index < 2) return; // Pomiń wiersz 0 (KPI) oraz wiersz 1 (Nagłówki)
      const c = row.c || [];
      const email = cellStr(c[0]);
      const fullName = cellStr(c[1]);
      const phone = cellStr(c[2]);
      const rawIndex = String(cellNum(c[3]) ?? cellStr(c[3]) ?? '');
      const cleanIndex = normalizeIndex(rawIndex);

      // Odrzuć puste wiersze techniczne lub nagłówki
      if (!fullName || fullName.toLowerCase().includes('imię i nazwisko') || fullName.toLowerCase().includes('- wpisz -')) {
        return;
      }
      if (!email && !cleanIndex) return;

      const statusColText = cellStr(c[6]).toLowerCase();
      const isResigned = /rezygnacja|byli|rezygn/i.test(statusColText);
      const rawPoints = cellNum(c[7]) ?? cellStr(c[7]) ?? 0;
      const cleanIndexNum = Number(cleanIndex || rawIndex.replace(/\D/g, ''));
      const points = (rawPoints && (!cleanIndexNum || Number(rawPoints) !== cleanIndexNum))
        ? Number(rawPoints)
        : 0;

      // ── Twarde przeliczanie obecności z kolumn M01 (col 31 / AF), M02 (col 32 / AG), M03 (col 33 / AH), M04 (col 34 / AI) ──
      const m01 = isAttendedCell(c[31]);
      const m02 = isAttendedCell(c[32]);
      const m03 = isAttendedCell(c[33]);
      const m04 = isAttendedCell(c[34]);

      const attended = m01 + m02 + m03 + m04;
      const totalMeetings = 3; // Liczba spotkań otwartych dla członków ogólnych (M02, M03, M04)
      const absent = Math.max(0, totalMeetings - attended);
      const attendancePercent = Math.min(100, Math.round((attended / totalMeetings) * 100));
      const certStatus = attendancePercent >= 50 ? 'MOŻNA WYDAĆ' : 'W toku';
      const rawDate = parseGvizDate(c[4]) || parseGvizDate(c[5]);

      const parts = fullName.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      members.push({
        id: `sknu_m_${members.length + 1}`,
        memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase().trim()}` : `sknu_m_${members.length + 1}`),
        fullName,
        firstName,
        lastName,
        index: cleanIndex || rawIndex,
        cleanIndex,
        email: email ? email.toLowerCase().trim() : '',
        phone,
        field: 'Psychologia',
        year: 'Rok 1-3',
        status: isResigned ? 'resigned' : 'active',
        mailingConsent: true,
        consentStatus: 'Zgody OK',
        points,
        m01,
        m02,
        m03,
        m04,
        present: attended,
        attended,
        absent,
        attendancePercent,
        freq: attendancePercent,
        certStatus,
        timestamp: formatDate(rawDate) || '2026-03-26',
        rawTimestamp: rawDate,
        fromSheet: 'Zarządzanie (SKNU)',
      });
    });

    return { members, quarantine: [] };
  }

  // ── Domyślny parser dla SKN Seksuologii WSKZ (141 członków) ───────────────
  const rawRows = (zarzadzanieTable.rows ?? []).filter(r => r && r.c);
  const isDefaultSheet = cleanId === SHEET_ID;
  const zarzadzanieRows = isDefaultSheet ? rawRows.slice(0, 141) : rawRows;
  const remainingRows = isDefaultSheet ? rawRows.slice(141) : [];

  const members = zarzadzanieRows.map((row, index) => {
    const c = row.c || [];
    const email = cellStr(c[1]) || cellStr(c[0]);
    const firstName = cellStr(c[2]);
    const lastNameCandidate = cellStr(c[3]);
    const lastName = lastNameCandidate.includes('@') ? '' : lastNameCandidate;
    const fullName = (firstName + ' ' + lastName).trim() || firstName;
    const rawIndex = String(cellNum(c[4]) ?? cellStr(c[4]) ?? '');
    const cleanIndex = normalizeIndex(rawIndex);

    const statusColText = (cellStr(c[3]) + ' ' + cellStr(c[4]) + ' ' + cellStr(c[8])).toLowerCase();
    const isResignedOrInactive = /rezygnacja|niska aktywność|niska aktywnosc|oczekiwanie/i.test(statusColText);

    const present = cellNum(c[7]) || cellNum(c[6]) || 0;
    const absent = cellNum(c[8]) || 0;
    // c[4] to numer indeksu – upewnij się, że punkty nie przyjmują wartości numeru indeksu
    const cleanIndexNum = Number(cleanIndex || rawIndex.replace(/\D/g, ''));
    const rawPoints = cellNum(c[11]) ?? cellNum(c[12]) ?? 0;
    const points = (rawPoints && (!cleanIndexNum || Number(rawPoints) !== cleanIndexNum))
      ? Number(rawPoints)
      : 0;
    const attendancePercent = parsePercent(cellVal(c[5]));
    const rawDate = parseGvizDate(c[0]);
    const allConsents = allConsentsOk(row);

    return {
      id: `m_${index + 1}`,
      memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase().trim()}` : `m_${index + 1}`),
      fullName,
      firstName: firstName || fullName.split(' ')[0] || '',
      lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
      index: cleanIndex || rawIndex,
      cleanIndex,
      email: email ? email.toLowerCase().trim() : '',
      field: cellStr(c[5]),
      year: cellStr(c[6]),
      status: isResignedOrInactive ? 'resigned' : 'active',
      mailingConsent: allConsents,
      consentStatus: allConsents ? 'Zgody OK' : 'Brak zgód',
      points,
      present,
      absent,
      attendancePercent,
      timestamp: formatDate(rawDate),
      rawTimestamp: rawDate,
      fromSheet: 'Zarządzanie',
    };
  });

  const quarantine = remainingRows.map((row, index) => {
    const c = row.c || [];
    const email = cellStr(c[1]) || cellStr(c[0]);
    const firstName = cellStr(c[2]);
    const lastNameCandidate = cellStr(c[3]);
    const lastName = lastNameCandidate.includes('@') ? '' : lastNameCandidate;
    const fullName = (firstName + ' ' + lastName).trim() || firstName;
    const rawIndex = String(cellNum(c[4]) ?? cellStr(c[4]) ?? '');
    const cleanIndex = normalizeIndex(rawIndex);

    const verificationCol = cellStr(c[6]) || cellStr(c[7]) || cellStr(c[3]);
    const isExplicitDupe = /duplikat/i.test(verificationCol);
    const textForResign = `${fullName} ${firstName} ${lastNameCandidate} ${cellStr(c[2])} ${cellStr(c[3])} ${cellStr(c[6])} ${cellStr(c[7])} ${cellStr(c[8])}`.toLowerCase();
    const isResignation = /rezygnacja|rezygn/i.test(textForResign);
    const rawDate = parseGvizDate(c[0]);
    const allConsents = allConsentsOk(row);

    return {
      id: `q_${index + 1}`,
      memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase().trim()}` : `q_${index + 1}`),
      fullName,
      firstName: firstName || fullName.split(' ')[0] || '',
      lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
      index: cleanIndex || rawIndex,
      cleanIndex,
      email: email ? email.toLowerCase().trim() : '',
      field: cellStr(c[5]),
      year: cellStr(c[6]),
      consentStatus: allConsents ? 'Zgody OK' : 'Brak zgód',
      isDuplicate: isExplicitDupe,
      isResignation,
      timestamp: formatDate(rawDate),
      rawTimestamp: rawDate,
      fromSheet: 'Baza_Kwarantanna',
    };
  });

  return { members, quarantine };
}

// ─── Duration & Attendance Parsing Helpers (Kolumny B i C) ───────────────────

export function parseDurationToMinutes(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') {
    if (val > 0 && val < 1) {
      return Math.round(val * 24 * 60);
    }
    return Math.round(val);
  }
  const str = String(val).trim();
  if (!str) return 0;

  // Format HH:MM:SS lub H:MM:SS
  const hmsMatch = str.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const mins = parseInt(hmsMatch[2], 10);
    const secs = parseInt(hmsMatch[3], 10);
    return Math.round(hours * 60 + mins + secs / 60);
  }

  // Format MM:SS lub M:SS
  const msMatch = str.match(/^(\d{1,3}):(\d{2})$/);
  if (msMatch) {
    const mins = parseInt(msMatch[1], 10);
    const secs = parseInt(msMatch[2], 10);
    return Math.round(mins + secs / 60);
  }

  // Format "1h 15m", "1 godz. 15 min", "45 min", "3m"
  let total = 0;
  let matched = false;
  const hoursMatch = str.match(/(\d+)\s*(?:h|godz|hr|hours?)/i);
  if (hoursMatch) {
    total += parseInt(hoursMatch[1], 10) * 60;
    matched = true;
  }
  const minsMatch = str.match(/(\d+)\s*(?:m|min|minut|minutes?)/i);
  if (minsMatch) {
    total += parseInt(minsMatch[1], 10);
    matched = true;
  }
  if (matched) return total;

  // Czysta liczba całkowita lub zmiennoprzecinkowa
  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num)) {
    return Math.round(num);
  }
  return 0;
}

export function parseAttendanceLine(rawLine) {
  if (!rawLine || !rawLine.trim()) return null;
  const line = rawLine.trim();

  // Sprawdź podział po tabulatorze, średniku lub separatorze kolumn
  let parts = [];
  if (line.includes('\t')) {
    parts = line.split('\t').map(p => p.trim());
  } else if (line.includes(';') && line.split(';').length >= 2) {
    parts = line.split(';').map(p => p.trim());
  } else if (line.includes(',') && line.split(',').length >= 3) {
    parts = line.split(',').map(p => p.trim());
  }

  if (parts.length >= 3) {
    const rawName = parts[0];
    const joinTime = parts[1] || '—';
    const durationStr = parts[2] || '';
    const durationMinutes = parseDurationToMinutes(durationStr);
    return { rawName, joinTime, durationStr, durationMinutes, isMultiColumn: true };
  }

  if (parts.length === 2) {
    const rawName = parts[0];
    const secondCol = parts[1];
    const durationMinutes = parseDurationToMinutes(secondCol);
    if (durationMinutes > 0) {
      return { rawName, joinTime: '—', durationStr: secondCol, durationMinutes, isMultiColumn: true };
    }
    return { rawName, joinTime: secondCol, durationStr: '—', durationMinutes: 60, isMultiColumn: true };
  }

  // Linia pojedyncza: sprawdź czy na końcu nie ma podanego czasu (np. "Anna Kowalska 45 min" lub "15998 3m")
  const durationEndMatch = line.match(/\s+(\d{1,2}:\d{2}(?::\d{2})?|\d+\s*(?:m|min|minut|h|godz))\s*$/i);
  if (durationEndMatch) {
    const durationStr = durationEndMatch[1];
    const rawName = line.slice(0, durationEndMatch.index).trim();
    const durationMinutes = parseDurationToMinutes(durationStr);
    return { rawName, joinTime: '—', durationStr, durationMinutes, isMultiColumn: false };
  }

  return { rawName: line, joinTime: '—', durationStr: '—', durationMinutes: 60, isMultiColumn: false };
}

export async function fetchMeetingSheetAttendance(meetingCode, sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!meetingCode) return { ok: false, error: 'Brak kodu spotkania' };

  const candidates = [
    meetingCode,
    meetingCode.toUpperCase(),
    meetingCode.replace(/^M0?/, 'M'),
    `Spotkanie ${meetingCode.replace(/^M0?/, '')}`,
    `Spotkanie ${meetingCode}`,
  ];

  for (const tabName of candidates) {
    try {
      const table = await fetchSheet(tabName, cleanId);
      if (table && table.rows && table.rows.length > 0) {
        const participants = table.rows.map((r, idx) => {
          const c = r.c || [];
          const colA = cellStr(c[0]);
          const colB = cellStr(c[1]);
          const colC = cellStr(c[2]);
          const colD = cellStr(c[3]);
          const colE = cellStr(c[4]);

          // Jeśli układ z Kolumną B (Join Time) i Kolumną C (Duration)
          const durC = parseDurationToMinutes(colC);
          if (durC > 0 || /^\d{1,2}:\d{2}/.test(colB)) {
            return {
              id: `p_${idx}`,
              rawName: colA,
              joinTime: colB || '—',
              durationStr: colC || '—',
              durationMinutes: durC,
            };
          }

          // Jeśli standardowy formularz Google (A: Date, B: Email, C: Imię, D: Nazwisko, E: Index)
          const fullName = `${colC} ${colD}`.trim() || colC || colB;
          const index = colE;
          const dateStr = formatDate(parseGvizDate(c[0])) || colA;

          return {
            id: `p_${idx}`,
            rawName: fullName,
            index,
            email: colB,
            joinTime: dateStr || '—',
            durationStr: '60 min',
            durationMinutes: 60,
          };
        });

        return { ok: true, tabName, participants };
      }
    } catch (e) {
      // Ignoruj i spróbuj kolejnego kandydata
    }
  }

  return { ok: false, error: `Nie znaleziono arkusza dla spotkania "${meetingCode}"` };
}

// ─── 4. EWIDENCJA POCZTY (Google Sheets Sync: Ewidencja_Poczty) ───────────────

export const MAIL_REGISTRY_TAB = 'Ewidencja_Poczty';

/**
 * Pobiera i parsuje wpisy korespondencji / ewidencji poczty z dedykowanej zakładki Ewidencja_Poczty w arkuszu Google.
 * Gwarantuje ścisłe powiązanie z zakładką "Ewidencja_Poczty", bez tworzenia nowych zakładek i bez ingerencji w pozostałe arkusze.
 */
export async function fetchMailRegistryFromSheet(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return { ok: false, error: 'Brak ID arkusza', entries: [] };

  try {
    const table = await fetchSheet('Ewidencja_Poczty', cleanId);
    if (!table || !table.rows || table.rows.length === 0) {
      return { ok: true, tabName: 'Ewidencja_Poczty', entries: [] };
    }

    const rows = table.rows.filter(r => r && r.c);
    const entries = [];

    rows.forEach((row, idx) => {
      const c = row.c || [];
      const col0 = cellStr(c[0]);
      const col1 = cellStr(c[1]);
      const col2 = cellStr(c[2]);
      const col3 = cellStr(c[3]);
      const col4 = cellStr(c[4]);
      const col5 = cellStr(c[5]);
      const col6 = cellStr(c[6]);
      const col7 = cellStr(c[7]);
      const col8 = cellStr(c[8]);

      // Sprawdź czy to wiersz nagłówka
      const isHeader = /sygnatura|data|kierunek|nadawca|odbiorca|temat|lp\./i.test(`${col0} ${col1} ${col2} ${col5}`);
      if (isHeader && idx === 0) return;

      // Jeśli wiersz jest pusty
      if (!col0 && !col1 && !col2 && !col3 && !col4 && !col5 && !col6) return;

      const parsedDate = parseGvizDate(c[1]);
      const dateStr = parsedDate ? formatDate(parsedDate).slice(0, 10) : (col1 || new Date().toISOString().slice(0, 10));

      const dirCandidate = (col2 || '').toUpperCase();
      const direction = (dirCandidate.includes('OUT') || dirCandidate.includes('WYCHOD')) ? 'OUT' : 'IN';

      const id = col0 || `KANC/PSY/${direction}/${String(idx + 1).padStart(2, '0')}/2026`;
      const sender = col3 || (direction === 'OUT' ? 'Zarząd SKN Psychoonkologii WSKZ' : 'Dziekanat WNS WSKZ');
      const recipient = col4 || (direction === 'IN' ? 'Zarząd SKN Psychoonkologii WSKZ' : 'Władze WSKZ');
      const subject = col5 || col6 || 'Pismo urzędowe';
      const summary = col6 || col5 || '';
      const status = col7 || 'Zarejestrowane / Zrealizowane';
      const hash = col8 || `${id}_${dateStr}`;

      entries.push({
        id,
        direction,
        date: dateStr,
        sender,
        recipient,
        subject,
        summary,
        status,
        hash,
        fromSheet: 'Ewidencja_Poczty',
        createdAt: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
      });
    });

    return { ok: true, tabName: 'Ewidencja_Poczty', entries };
  } catch (err) {
    console.warn('Błąd pobierania Ewidencja_Poczty:', err);
    return { ok: false, error: err.message || 'Błąd odczytu Ewidencja_Poczty', entries: [] };
  }
}

/**
 * Generuje sformatowane dane tabelaryczne (TSV / CSV) gotowe do wklejenia lub zapisu w zakładce Ewidencja_Poczty.
 */
export function formatCorrespondenceForSheet(entries = []) {
  const headers = ['Sygnatura', 'Data', 'Kierunek', 'Nadawca', 'Odbiorca', 'Temat', 'Streszczenie / Treść', 'Status', 'Hash / Sygnatura cyfrowa'];
  const rows = entries.map(item => [
    item.id || '',
    item.date || '',
    item.direction || 'IN',
    item.sender || '',
    item.recipient || '',
    item.subject || '',
    (item.summary || '').replace(/[\r\n\t]+/g, ' '),
    item.status || 'Zarejestrowane',
    item.hash || '',
  ]);

  const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  return { headers, rows, tsv };
}


