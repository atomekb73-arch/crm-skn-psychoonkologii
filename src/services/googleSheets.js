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

export const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzEirXrW65kOmc99Wis9_O8EF4QRL0TBxOc4z0BpEnEKsmfF_gBGDWbenhrHhVPvUOn/exec";
export const GAS_ENDPOINT = GAS_WEBAPP_URL;



/**
 * Uniwersalna funkcja przesyłająca żądania POST do Google Apps Script
 * bez wyzwalania pre-flight OPTIONS (CORS safe proste żądanie POST).
 */
export async function sendToGAS(payload) {
  const GAS_URL = GAS_WEBAPP_URL;

  console.log(`[sendToGAS] Wysyłam żądanie POST (action: ${payload?.action}) do ${GAS_URL}`, payload);

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    console.log("[sendToGAS] Dane wysłane pomyślnie do GAS (status: success, no-cors).", response);
    return { status: "success", type: response.type };
  } catch (err) {
    console.error("[sendToGAS] Błąd wysyłki do GAS:", err);
    throw err;
  }
}


/**
 * Pobiera kompletne dane z backendu Google Apps Script (GET ?action=pobierz_dane).
 */
export async function fetchGasData() {
  try {
    const res = await fetch(`${GAS_WEBAPP_URL}?action=pobierz_dane`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Błąd pobierania danych z GAS pobierz_dane:", err);
    return null;
  }
}

export async function updateVerificationStatus(nrIndeksu, nowyStatus = "Zatwierdzony") {
  return await sendToGAS({
    action: "zmien_status_czlonka",
    nrIndeksu: String(nrIndeksu).trim(),
    nowyStatus: nowyStatus,
    zatwierdzajacy: "Zarząd SKN"
  });
}

export async function changeStudentStatusInGAS({ nrIndeksu, nowyStatus = "Zatwierdzony", zatwierdzajacy = "Zarząd SKN" }) {
  return await sendToGAS({
    action: "zmien_status_czlonka",
    nrIndeksu: String(nrIndeksu).trim(),
    nowyStatus: nowyStatus,
    zatwierdzajacy: zatwierdzajacy
  });
}

/**
 * Zapisuje frekwencję danego spotkania w centralnej bazie Google Apps Script (zakładka Ewidencja_Obecnosci).
 * Przesyła obiekt { nrIndeksu, name, rola } dla każdego uczestnika (członek, gość, opiekun, prelegent).
 */
export async function saveMeetingAttendanceToGAS({ kodSpotkania, dataSpotkania, obecnosci }) {
  const listToSave = Array.isArray(obecnosci) ? obecnosci : [];
  const payload = {
    action: "zapisz_obecnosci",
    kodSpotkania: String(kodSpotkania || "M00").trim(),
    dataSpotkania: String(dataSpotkania || new Date().toISOString().slice(0, 10)).trim(),
    obecnosci: listToSave.map(item => {
      if (typeof item === 'string') {
        return {
          nrIndeksu: item.trim(),
          name: item.trim(),
          rola: 'Uczestnik'
        };
      }
      const nrIndeksu = String(item.nrIndeksu || item.index || '').trim();
      const name = String(item.name || item.fullName || item.rawName || nrIndeksu).trim();
      const rola = String(item.rola || item.role || (nrIndeksu ? 'Członek koła' : 'Gość')).trim();
      return {
        nrIndeksu,
        name,
        rola
      };
    }).filter(item => item.nrIndeksu || item.name)
  };

  return await sendToGAS(payload);
}

/**
 * Usuwa frekwencję danego spotkania z centralnej bazy Google Apps Script (zakładka Ewidencja_Obecnosci).
 * Używane przy cofaniu / resecie listy obecności dla spotkania.
 */
export async function deleteMeetingAttendanceFromGAS(kodSpotkania) {
  const payload = {
    action: "usun_obecnosci_spotkania",
    kodSpotkania: String(kodSpotkania || "").trim()
  };

  return await sendToGAS(payload);
}

/**
 * Zastępuje obecności zarejestrowane dla gościa (nazwisko) nowo nadanym numerem indeksu w Google Apps Script.
 */
export async function claimGuestAttendance(nazwiskoGoscia, nowyNrIndeksu) {
  const payload = {
    action: "zastap_goscia_indeksem",
    nazwiskoGoscia: String(nazwiskoGoscia || "").trim(),
    nowyNrIndeksu: String(nowyNrIndeksu || "").trim()
  };

  return await sendToGAS(payload);
}

/**
 * Inicjalizuje arkusz Rejestr_Zgloszen wszystkimi bieżącymi członkami koła.
 * Czyści wiersze poniżej wiersza 1 i hurtowo wstawia dane.
 */
export async function initializeSubmissionsRegistryInGAS(members = []) {
  const payload = {
    action: "inicjalizuj_rejestr",
    members: members.map(m => {
      const rawIdx = String(m.index || m.cleanIndex || m.nrIndeksu || '').trim();
      const cleanIdx = rawIdx.replace(/\D/g, '').replace(/^0+/, '') || rawIdx;
      const imieNazwisko = (
        m.imieNazwisko ||
        m.fullName ||
        `${m.imie || m.firstName || ''} ${m.nazwisko || m.lastName || ''}`.trim() ||
        m.name ||
        ''
      ).trim();
      const email = String(m.email || '').trim();
      const phone = String(m.phone || '').trim();
      const fieldAndYear = String(m.fieldAndYear || `${m.field || ''} ${m.year ? '(' + m.year + ')' : ''}`).trim();
      const mailingConsent = Boolean(m.mailingConsent || m.zgodaNaMailing === "Zgoda na mailing" || m.consentStatus === "Zgody OK");
      const status = m.status || "active";
      const timestamp = m.timestamp || new Date().toISOString().slice(0, 10);
      const aliases = m.aliases || m.alias || '';

      return {
        index: cleanIdx,
        imieNazwisko,
        fullName: imieNazwisko,
        email,
        phone,
        fieldAndYear,
        mailingConsent,
        status,
        timestamp,
        aliases
      };
    })
  };

  return await sendToGAS(payload);
}

/**
 * Ręcznie dodaje nowego członka do bazy w arkuszu Rejestr_Zgloszen (appendRow).
 */
export async function addMemberManuallyToGAS(member) {
  const rawIdx = String(member.index || member.cleanIndex || member.nrIndeksu || '').trim();
  const cleanIdx = rawIdx.replace(/\D/g, '').replace(/^0+/, '') || rawIdx;
  const imieNazwisko = (
    member.imieNazwisko ||
    member.fullName ||
    `${member.imie || member.firstName || ''} ${member.nazwisko || member.lastName || ''}`.trim() ||
    member.name ||
    ''
  ).trim();
  const email = String(member.email || '').trim();
  const phone = String(member.phone || '').trim();
  const fieldAndYear = String(member.fieldAndYear || `${member.field || ''} ${member.year ? '(' + member.year + ')' : ''}`).trim();
  const mailingConsent = Boolean(member.mailingConsent || member.zgodaNaMailing === "Zgoda na mailing" || member.consentStatus === "Zgody OK");
  const status = member.status || "active";
  const aliases = member.aliases || member.alias || '';

  const payload = {
    action: "dodaj_czlonka_recznie",
    member: {
      index: cleanIdx,
      imieNazwisko,
      fullName: imieNazwisko,
      email,
      phone,
      fieldAndYear,
      mailingConsent,
      status,
      aliases
    }
  };

  return await sendToGAS(payload);
}



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

    // 3. Pobierz ewidencję obecności oraz członków z Rejestru Zgłoszeń z backendu Google Apps Script (GET ?action=pobierz_dane)
    const attendanceByMeeting = {};
    let gasDecyzje = [];
    try {
      const gasData = await fetchGasData();

      // Jeżeli GAS zwrócił listę członków z Rejestr_Zgloszen, zaktualizuj/zasil listę members
      const gasMembersRaw = (gasData && Array.isArray(gasData.czlonkowie) && gasData.czlonkowie.length > 0)
        ? gasData.czlonkowie
        : ((gasData && Array.isArray(gasData.data) && gasData.data.length > 0) ? gasData.data : null);

function mapVerificationStatus(rawStatus) {
  const s = String(rawStatus || '').toLowerCase().trim();
  if (s === 'nieaktywny' || s === 'rezygnacja' || s === 'resigned' || s === 'inactive' || s === 'były' || s === 'byly') {
    return 'resigned';
  }
  if (s === 'gosc' || s === 'gość' || s === 'guest' || s === 'wolny słuchacz') {
    return 'guest';
  }
  if (s === 'archiwum' || s === 'archived' || s === 'odrzucony' || s === 'czarna lista') {
    return 'archived';
  }
  return 'active';
}

      if (gasMembersRaw && gasMembersRaw.length > 0) {
        const mappedGasMembers = gasMembersRaw.map((item, index) => {
          // Obsługa obiektu lub surowego wiersza z GAS
          if (Array.isArray(item)) {
            const rawIdx = String(item[1] || '').trim();
            const cleanIndex = normalizeIndex(rawIdx);
            const imieNazwisko = String(item[2] || '').trim();
            const email = String(item[3] || '').trim();
            const phone = String(item[4] || '').trim();
            const kierunekSemestr = String(item[5] || '').trim();
            const zgodaMailing = String(item[6] || '').trim();
            const statusWeryfikacji = String(item[7] || '').trim();
            const parts = imieNazwisko.split(' ');
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            const memberStatus = mapVerificationStatus(statusWeryfikacji);
            const isArchived = memberStatus === 'archived';

            return {
              id: `psy_m_gas_${index + 1}`,
              memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase()}` : `psy_m_${index + 1}`),
              fullName: imieNazwisko,
              imieNazwisko,
              name: imieNazwisko,
              firstName,
              lastName,
              index: cleanIndex || rawIdx,
              cleanIndex,
              email: email ? email.toLowerCase().trim() : '',
              phone,
              field: kierunekSemestr || 'Psychologia',
              year: kierunekSemestr || '',
              status: memberStatus,
              isArchived: isArchived,
              isBlacklisted: isArchived,
              mailingConsent: zgodaMailing === 'Zgoda na mailing' || zgodaMailing === 'true' || zgodaMailing === true,
              zgodaNaMailing: zgodaMailing || 'Zgoda na mailing',
              consentStatus: (zgodaMailing === 'Zgoda na mailing' || zgodaMailing === 'true' || zgodaMailing === true) ? 'Zgody OK' : 'Brak zgody',
              points: 0,
              present: 0,
              absent: 0,
              attendancePercent: 0,
              certStatus: 'W toku',
              timestamp: String(item[0] || item[8] || new Date().toISOString().slice(0, 10)),
              fromSheet: 'Rejestr_Zgloszen',
            };
          }

          const rawIdx = String(item.nrIndeksu || item.index || item.cleanIndex || '').trim();
          const cleanIndex = normalizeIndex(rawIdx);
          const imieNazwisko = String(item.imieNazwisko || item.fullName || `${item.firstName || ''} ${item.lastName || ''}`).trim();
          const email = String(item.email || '').trim();
          const phone = String(item.telefon || item.phone || '').trim();
          const kierunekSemestr = String(item.kierunek || item.field || '').trim();
          const zgodaMailing = item.zgodaMailing || item.zgodaNaMailing || (item.mailingConsent ? 'Zgoda na mailing' : 'Brak zgody');
          const statusWeryfikacji = String(item.statusWeryfikacji || item.status || 'active').trim();
          const parts = imieNazwisko.split(' ');
          const firstName = parts[0] || '';
          const lastName = parts.slice(1).join(' ') || '';
          const memberStatus = mapVerificationStatus(statusWeryfikacji);
          const isArchived = memberStatus === 'archived';

          return {
            id: `psy_m_gas_${index + 1}`,
            memberKey: cleanIndex ? `idx_${cleanIndex}` : (email ? `email_${email.toLowerCase()}` : `psy_m_${index + 1}`),
            fullName: imieNazwisko,
            imieNazwisko,
            name: imieNazwisko,
            firstName,
            lastName,
            index: cleanIndex || rawIdx,
            cleanIndex,
            email: email ? email.toLowerCase().trim() : '',
            phone,
            field: kierunekSemestr || 'Psychologia',
            year: kierunekSemestr || '',
            status: memberStatus,
            isArchived: isArchived,
            isBlacklisted: isArchived,
            mailingConsent: Boolean(item.mailingConsent || zgodaMailing === 'Zgoda na mailing' || zgodaMailing === 'true' || zgodaMailing === true),
            zgodaNaMailing: (Boolean(item.mailingConsent || zgodaMailing === 'Zgoda na mailing' || zgodaMailing === 'true' || zgodaMailing === true)) ? 'Zgoda na mailing' : 'Brak zgody',
            consentStatus: (Boolean(item.mailingConsent || zgodaMailing === 'Zgoda na mailing' || zgodaMailing === 'true' || zgodaMailing === true)) ? 'Zgody OK' : 'Brak zgody',
            points: 0,
            present: 0,
            absent: 0,
            attendancePercent: 0,
            certStatus: 'W toku',
            timestamp: String(item.dataWplywu || item.dataWeryfikacji || item.timestamp || new Date().toISOString().slice(0, 10)),
            fromSheet: 'Rejestr_Zgloszen',
          };
        }).filter(m => m.fullName && (m.index || m.email));

        if (mappedGasMembers.length > 0) {
          members = mappedGasMembers;
        }
      }

      if (gasData && Array.isArray(gasData.decyzjeKwarantanny)) {
        gasDecyzje = gasData.decyzjeKwarantanny;
      }
      if (gasData && gasData.ewidencja && Array.isArray(gasData.ewidencja)) {
        gasData.ewidencja.forEach(item => {
          const rawCode = String(item.kodSpotkania || '').trim();

          if (!rawCode) return;
          const cleanCode = rawCode.toUpperCase().replace(/^\[.*?\]\s*/, '');
          const entry = {
            nrIndeksu: String(item.nrIndeksu || '').trim(),
            index: String(item.nrIndeksu || '').trim(),
            name: String(item.name || item.fullName || item.nrIndeksu || '').trim(),
            fullName: String(item.name || item.fullName || item.nrIndeksu || '').trim(),
            rola: String(item.rola || (item.nrIndeksu ? 'Członek koła' : 'Gość')).trim(),
            email: item.email || '',
            joinTime: item.dataSpotkania || '18:00',
            durationStr: '60 min',
            durationMinutes: 60,
          };

          if (!attendanceByMeeting[rawCode]) attendanceByMeeting[rawCode] = [];
          attendanceByMeeting[rawCode].push(entry);

          if (cleanCode && cleanCode !== rawCode) {
            if (!attendanceByMeeting[cleanCode]) attendanceByMeeting[cleanCode] = [];
            attendanceByMeeting[cleanCode].push(entry);
          }
        });
      }
    } catch (err) {
      console.warn('Błąd pobierania ewidencji z GAS pobierz_dane:', err);
    }

    // Fallback do odczytu kolumn spotkań z tabeli Zarządzanie / Ewidencja_Obecnosci (jeśli GAS nie zwrócił obecności)
    if (Object.keys(attendanceByMeeting).length === 0) {
      try {
        const attendanceTable = (usedTab === 'Zarządzanie' && activeTable) ? activeTable : await fetchSheet('Ewidencja_Obecnosci', cleanId);
        if (attendanceTable && attendanceTable.rows && attendanceTable.rows.length > 1) {
          const rows = attendanceTable.rows;
          const headerRow = rows[1]?.c || [];
          const meetingCols = [];

          for (let col = 20; col < headerRow.length; col++) {
            const hVal = cellStr(headerRow[col]);
            if (!hVal) continue;
            const firstLine = hVal.split(/[\n\r]+/)[0].trim();
            const codeMatch = firstLine.match(/^([A-Z0-9-]+)/i);
            if (codeMatch) {
              const code = codeMatch[1].trim().toUpperCase();
              if (code.startsWith('M') || code.startsWith('SP') || code.includes('SPR')) {
                meetingCols.push({ col, code });
              }
            }
          }

          meetingCols.forEach(({ col, code }) => {
            if (!attendanceByMeeting[code]) attendanceByMeeting[code] = [];
            for (let r = 2; r < rows.length; r++) {
              const rowCells = rows[r]?.c;
              if (!rowCells) continue;
              const val = cellVal(rowCells[col]);
              const isAttended = val === 1 || val === '1' || String(val).trim().toLowerCase() === 'tak' || String(val).trim().toLowerCase() === 'true';
              if (isAttended) {
                const email = cellStr(rowCells[0]);
                const fullName = cellStr(rowCells[1]);
                const rawIndex = String(cellNum(rowCells[3]) ?? cellStr(rowCells[3]) ?? cellStr(rowCells[1]) ?? '');
                const cleanIndex = normalizeIndex(rawIndex);
                attendanceByMeeting[code].push({
                  nrIndeksu: cleanIndex || rawIndex,
                  index: cleanIndex || rawIndex,
                  fullName: fullName || email,
                  email: email,
                  joinTime: '18:00',
                  durationStr: '60 min',
                  durationMinutes: 60
                });
              }
            }
          });
        }
      } catch (err) {
        console.warn('Błąd pobierania obecności ze spotkań z tabeli Google Sheets:', err);
      }
    }

    // 4. Pobierz ewidencję poczty z dedykowanej zakładki Ewidencja_Poczty
    let mailLog = [];
    try {
      const mailRes = await fetchMailRegistryFromSheet(cleanId);
      if (mailRes.ok && Array.isArray(mailRes.entries) && mailRes.entries.length > 0) {
        mailLog = mailRes.entries;
      }
    } catch (err) {
      console.warn('Błąd pobierania Ewidencja_Poczty z Google Sheets:', err);
    }

    return { members, quarantine, mailLog, attendanceByMeeting, gasDecyzje };
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
  if (!rawLine || typeof rawLine !== 'string') return null;
  const line = rawLine.trim();
  if (!line) return null;

  const lower = line.toLowerCase();
  // 1. Ignore metadata lines starting with "*" or header lines
  if (
    line.startsWith('*') ||
    lower.startsWith('"full name"') ||
    lower.startsWith('full name') ||
    lower.startsWith('imię i nazwisko') ||
    lower.startsWith('uczestnik') ||
    lower.startsWith('lp.') ||
    lower.startsWith('lista obecności') ||
    lower.startsWith('data spotkania') ||
    lower.startsWith('kod spotkania')
  ) {
    return null;
  }

  try {
    let rawName = line;
    let joinTime = '18:00';
    let durationStr = '60 min';
    let durationMinutes = 60;
    let extractedIndex = '';
    let isExplicitGuest = false;

    // 2. Check if CSV format (Google Meet CSV Attendance format: "Full Name","First Seen","Time in Call")
    if (line.includes('"') || (line.includes(',') && !line.includes(';'))) {
      const csvMatches = [...line.matchAll(/"([^"]*)"|([^,]+)/g)]
        .map(m => (m[1] !== undefined ? m[1] : m[2]).trim())
        .filter(Boolean);

      if (csvMatches.length >= 1) {
        const nameCand = csvMatches[0];
        const lowerName = nameCand.toLowerCase();
        if (nameCand.startsWith('*') || lowerName === 'full name' || lowerName.startsWith('imię') || lowerName.startsWith('uczestnik')) {
          return null;
        }
        rawName = nameCand;

        if (csvMatches.length >= 2) {
          const timeMatch = csvMatches[1].match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
          if (timeMatch) joinTime = timeMatch[1];
        }

        if (csvMatches.length >= 3) {
          durationStr = csvMatches[2];
          durationMinutes = parseDurationToMinutes(durationStr);
        } else if (csvMatches.length === 2) {
          const dur = parseDurationToMinutes(csvMatches[1]);
          if (dur > 0) {
            durationStr = csvMatches[1];
            durationMinutes = dur;
          }
        }

        if (durationMinutes <= 0) durationMinutes = 60;

        return {
          rawName,
          joinTime: joinTime || '18:00',
          durationStr: durationStr || `${durationMinutes} min`,
          durationMinutes,
          extractedIndex: '',
          isExplicitGuest: false,
          isMultiColumn: true,
        };
      }
    }

    // 3. Text format with status & index: check if line contains explicit guest markers
    if (line.includes('Sprawdź opis') || lower.includes('[gość]') || lower.includes('gosc') || lower.startsWith('gość')) {
      isExplicitGuest = true;
    }

    // Extract index if present (preferably after date to avoid matching year)
    const lineAfterDate = line.split(/\d{4}-\d{2}-\d{2}/)[1] || line;
    const indexMatch = lineAfterDate.match(/(?:Zgodny\s*✔️?\s*|indeks[:\s]*|nr[:\s]*)(\d{3,6})/i) || lineAfterDate.match(/\b(\d{4,6})\b/);
    if (indexMatch) {
      extractedIndex = indexMatch[1];
    }

    // Check date YYYY-MM-DD pattern
    // e.g. "Agnieszka Czerwińska 2026-06-16 18:21:10 01:37:44 Zgodny ✔️ 5589"
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/);

    if (dateMatch) {
      const dateIndex = dateMatch.index;
      if (dateIndex > 0) {
        rawName = line.slice(0, dateIndex).trim();
      }

      joinTime = dateMatch[2] || '18:00';

      const afterJoin = line.slice(dateIndex + dateMatch[0].length).trim();
      const durMatch = afterJoin.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}|\d+\s*(?:m|min|h|godz))/i);
      if (durMatch) {
        durationStr = durMatch[1];
        durationMinutes = parseDurationToMinutes(durationStr);
      }
    } else if (line.includes('\t') || line.includes(';')) {
      const sep = line.includes('\t') ? '\t' : ';';
      const parts = line.split(sep).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        rawName = parts[0];
        joinTime = parts[1];
        durationStr = parts[2];
        durationMinutes = parseDurationToMinutes(durationStr);
      } else if (parts.length === 2) {
        rawName = parts[0];
        const dur = parseDurationToMinutes(parts[1]);
        if (dur > 0) {
          durationStr = parts[1];
          durationMinutes = dur;
        } else {
          joinTime = parts[1];
        }
      }
    } else {
      const durationEndMatch = line.match(/\s+(\d{1,2}:\d{2}(?::\d{2})?|\d+\s*(?:m|min|minut|h|godz))\s*$/i);
      if (durationEndMatch) {
        durationStr = durationEndMatch[1];
        rawName = line.slice(0, durationEndMatch.index).trim();
        durationMinutes = parseDurationToMinutes(durationStr);
      }
    }

    // Clean up rawName (strip leftover status suffixes or timestamps)
    rawName = rawName
      .replace(/\d{4}-\d{2}-\d{2}.*$/, '')
      .replace(/\d{1,2}:\d{2}.*$/, '')
      .replace(/Zgodny.*$/, '')
      .replace(/Sprawdź opis.*$/, '')
      .replace(/\[GOŚĆ\].*$/i, '')
      .trim();

    if (!rawName) {
      rawName = line.trim();
    }

    if (durationMinutes <= 0) {
      durationMinutes = 60;
    }

    return {
      rawName,
      joinTime: joinTime || '18:00',
      durationStr: durationStr || `${durationMinutes} min`,
      durationMinutes,
      extractedIndex,
      isExplicitGuest,
      isMultiColumn: false,
    };
  } catch (err) {
    console.warn('Błąd parsowania linii w parseAttendanceLine:', rawLine, err);
    const clean = rawLine.replace(/\d{4}-\d{2}-\d{2}.*$/, '').replace(/\d{1,2}:\d{2}.*$/, '').trim() || rawLine;
    return {
      rawName: clean,
      joinTime: '18:00',
      durationStr: '60 min',
      durationMinutes: 60,
      extractedIndex: '',
      isExplicitGuest: true,
      isMultiColumn: false,
    };
  }
}

export function parseAttendanceText(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results = [];
  lines.forEach(line => {
    try {
      const parsed = parseAttendanceLine(line);
      if (parsed && parsed.rawName) results.push(parsed);
    } catch (e) {
      console.warn('Wiersz pominięty z powodu błędu:', line, e);
    }
  });
  return results;
}

export const parseAttendanceInput = parseAttendanceText;

export async function fetchMeetingSheetAttendance(meetingCode, sheetId = SHEET_ID, members = []) {
  if (Array.isArray(sheetId)) {
    members = sheetId;
    sheetId = SHEET_ID;
  }
  if (!meetingCode) return { ok: false, error: 'Brak kodu spotkania' };

  const rawCodeUpper = String(meetingCode).trim().toUpperCase();
  const cleanCodeUpper = rawCodeUpper.replace(/^\[.*?\]\s*/, '');

  // Czytaj WYŁĄCZNIE z pobranej ewidencji obecności (zakładka Ewidencja_Obecnosci przez action=pobierz_dane)
  try {
    const gasData = await fetchGasData();
    if (gasData && gasData.ewidencja && Array.isArray(gasData.ewidencja)) {
      const matching = gasData.ewidencja.filter(item => {
        const itemCode = String(item.kodSpotkania || '').trim().toUpperCase();
        const itemCleanCode = itemCode.replace(/^\[.*?\]\s*/, '');
        return itemCode === rawCodeUpper || itemCleanCode === cleanCodeUpper || itemCode.includes(cleanCodeUpper) || cleanCodeUpper.includes(itemCleanCode);
      });

      if (matching.length > 0) {
        const participants = matching.map((item, idx) => {
          const idxStr = String(item.nrIndeksu || '').trim();
          const nameStr = String(item.name || item.fullName || '').trim();
          const isExplicitGuest = idxStr.includes('[GOŚĆ]') || idxStr.includes('GOSC') || nameStr.includes('[GOŚĆ]') || nameStr.includes('GOSC') || item.rola === 'Gość' || item.rola === 'guest';

          let matchedMember = null;
          if (!isExplicitGuest && Array.isArray(members) && members.length > 0) {
            const cleanIdx = normalizeIndex(idxStr);
            matchedMember = members.find(m => {
              if (!m) return false;
              if (cleanIdx && normalizeIndex(m.index) === cleanIdx) return true;
              if (nameStr && (m.fullName === nameStr || normalizeDiacritics(m.fullName) === normalizeDiacritics(nameStr))) return true;
              return false;
            });
          }

          let finalName = matchedMember ? (matchedMember.fullName || `${matchedMember.firstName} ${matchedMember.lastName}`) : (nameStr || idxStr || 'Uczestnik');
          let finalIndex = isExplicitGuest ? '' : (matchedMember?.index || (idxStr && !idxStr.includes('GOŚĆ') ? idxStr : ''));
          let finalRole = isExplicitGuest ? 'Gość' : (item.rola || matchedMember?.role || (finalIndex ? 'Członek koła' : 'Gość'));

          let formattedRawName = finalName;
          if (finalRole === 'Gość' || isExplicitGuest) {
            formattedRawName = finalName.startsWith('[GOŚĆ]') ? finalName : `[GOŚĆ]: ${finalName}`;
          } else if (finalIndex && !finalName.includes(finalIndex)) {
            formattedRawName = `${finalName} (${finalIndex})`;
          }

          return {
            id: `p_gas_${idx}`,
            rawName: formattedRawName,
            fullName: finalName,
            index: finalIndex,
            email: matchedMember?.email || item.email || '',
            role: finalRole,
            joinTime: item.dataSpotkania || '18:00',
            durationStr: '60 min',
            durationMinutes: 60,
          };
        });

        return { ok: true, tabName: 'Ewidencja_Obecnosci (GAS)', participants };
      }
    }
  } catch (gasErr) {
    console.warn('Błąd odczytu z GAS pobierz_dane:', gasErr);
  }

  return {
    ok: false,
    error: 'Brak zapisanych obecności w arkuszu dla tego spotkania. Wklej listę z Google Meet i kliknij Przetwórz.',
  };
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


