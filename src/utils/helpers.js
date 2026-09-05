// ─── Attendance / frequency helpers ─────────────────────────────────────────

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

export function calcFrequency(present, absent) {
  const p = typeof present === 'number' && !isNaN(present) ? present : 0;
  const a = typeof absent === 'number' && !isNaN(absent) ? absent : 0;
  const total = p + a;
  if (total === 0) return 0;
  const res = Math.round((p / total) * 100);
  return isNaN(res) ? 0 : res;
}

export function getFrequencyBadge(freq) {
  const f = typeof freq === 'number' && !isNaN(freq) ? freq : 0;
  if (f >= 90) return { label: 'Lider',               dotColor: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (f >= 75) return { label: 'Bardzo aktywny',      dotColor: 'bg-teal-500',    color: 'bg-teal-50 text-teal-700 border-teal-200' };
  if (f >= 50) return { label: 'Bezpieczny brzeg',    dotColor: 'bg-amber-500',   color: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (f >= 25) return { label: 'Niższa aktywność',    dotColor: 'bg-stone-400',   color: 'bg-stone-100 text-stone-700 border-stone-200' };
  return            { label: 'Wymaga uzupełnienia', dotColor: 'bg-slate-400',   color: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export function getCertificateStatus(freq, absences = 0) {
  const f = typeof freq === 'number' && !isNaN(freq) ? freq : 0;
  const abs = typeof absences === 'number' && !isNaN(absences) ? absences : 0;
  const meetsFreq = f >= 50;
  const meetsAbsences = abs <= 5;
  const canIssue = meetsFreq && meetsAbsences;

  return canIssue
    ? { canIssue: true,  label: 'Można wydać', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { canIssue: false, label: 'W toku',      color: 'bg-slate-100 text-slate-600 border-slate-200' };
}

/**
 * Zwraca stabilny, unikalny klucz identyfikacyjny rekordu (przede wszystkim znormalizowany e-mail,
 * a w przypadku braku e-maila: znormalizowany numer indeksu).
 */
export function getRecordKey(item) {
  if (!item) return '';
  const email = String(item.email || item.mail || '').trim().toLowerCase();
  if (email && email.includes('@')) return email;

  const rawIndex = String(item.index || item.indexNumber || '').replace(/\D/g, '').replace(/^0+/, '').trim();
  if (rawIndex) return `idx_${rawIndex}`;

  if (item.memberKey) return String(item.memberKey).trim().toLowerCase();
  if (item.id) return String(item.id).trim().toLowerCase();
  return '';
}

// ─── SMART MAIL PARSER & DUPLICATE DETECTOR ─────────────────────────────────

function parseDateStringToISO(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const clean = dateStr.trim();

  // 1. Direct YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // 2. DD.MM.YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Polish text month (np. "24 sierpnia 2026", "15 maja 2026 r.")
  const monthsPL = {
    stycz: '01', luty: '02', luteg: '02', marc: '03',
    kwiet: '04', maj: '05', czerw: '06', lipc: '07',
    sierp: '08', wrzes: '09', wrześ: '09', paźdz: '10', pazdz: '10',
    listop: '11', grudz: '12'
  };

  const plTextMatch = clean.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (plTextMatch) {
    const day = plTextMatch[1].padStart(2, '0');
    const monthWord = plTextMatch[2].toLowerCase();
    const year = plTextMatch[3];

    let foundMonth = '01';
    for (const [key, num] of Object.entries(monthsPL)) {
      if (monthWord.startsWith(key)) {
        foundMonth = num;
        break;
      }
    }
    return `${year}-${foundMonth}-${day}`;
  }

  // 4. Try Standard JS Date parse
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}

  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes subject string for duplicate and topic matching
 */
export function normalizeSubject(subj) {
  if (!subj) return '';
  return subj
    .toLowerCase()
    .replace(/^(?:re|fwd|odp|fw|odpowiedź|dotyczy)\s*:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses raw pasted email header + body text into structured metadata.
 */
export function parseRawEmailText(rawText, orgTag = 'SKNU') {
  if (!rawText || typeof rawText !== 'string') {
    return {
      sender: '',
      recipient: '',
      date: new Date().toISOString().slice(0, 10),
      subject: '',
      summary: '',
      direction: 'IN',
    };
  }

  const text = rawText.trim();

  // 1. Extract Od / From / Nadawca
  const fromMatch = text.match(/(?:^|\n)(?:Od|From|Nadawca|Wysłane przez|Sender)\s*:\s*([^\n\r]+)/i);
  const sender = fromMatch ? fromMatch[1].trim() : '';

  // 2. Extract Do / To / Adresat
  const toMatch = text.match(/(?:^|\n)(?:Do|To|Adresat|Odbiorca|Recipient)\s*:\s*([^\n\r]+)/i);
  const recipient = toMatch ? toMatch[1].trim() : '';

  // 3. Extract Temat / Subject / Tytuł
  const subjectMatch = text.match(/(?:^|\n)(?:Temat|Subject|Tytuł|Subj)\s*:\s*([^\n\r]+)/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : '';

  // 4. Extract Data / Date / Wysłano
  const dateMatch = text.match(/(?:^|\n)(?:Data|Date|Wysłano|Sent|Otrzymano)\s*:\s*([^\n\r]+)/i);
  const dateStr = dateMatch ? parseDateStringToISO(dateMatch[1]) : new Date().toISOString().slice(0, 10);

  // 5. Extract Body (strip header lines)
  const headerLinesRegex = /^(?:Od|From|Do|To|Data|Date|Temat|Subject|Tytuł|Wysłano|Sent|CC|DW|BCC|UDW)\s*:.+$/gmi;
  const bodyText = text.replace(headerLinesRegex, '').trim();

  // 6. Direction inference
  let direction = 'IN';
  const lowerSender = sender.toLowerCase();
  const lowerTag = orgTag.toLowerCase();
  if (
    lowerSender.includes('zarząd') ||
    lowerSender.includes(lowerTag) ||
    lowerSender.includes('student.wskz.pl') ||
    lowerSender.includes('skn.')
  ) {
    direction = 'OUT';
  }

  return {
    sender: sender || (direction === 'OUT' ? `Zarząd ${orgTag} WSKZ` : 'Dziekanat WNS WSKZ <dziekanat@wskz.pl>'),
    recipient: recipient || (direction === 'IN' ? `Zarząd ${orgTag} WSKZ` : 'Władze Uczelni WSKZ'),
    date: dateStr,
    subject: subject || 'Korespondencja urzędowa',
    summary: bodyText.slice(0, 500) || 'Brak treści wiadomości.',
    direction,
  };
}

/**
 * Checks for possible duplicate correspondence based on normalized subject and date.
 */
export function checkDuplicateCorrespondence(newEntry, existingList = []) {
  if (!newEntry || !Array.isArray(existingList) || existingList.length === 0) {
    return { isDuplicate: false, matchedEntry: null };
  }

  const normSubject = normalizeSubject(newEntry.subject);
  if (!normSubject || normSubject.length < 4) {
    return { isDuplicate: false, matchedEntry: null };
  }

  const match = existingList.find((item) => {
    if (!item) return false;
    const itemNormSubject = normalizeSubject(item.subject);
    const subjectMatch = itemNormSubject.includes(normSubject) || normSubject.includes(itemNormSubject);
    const dateMatch = item.date === newEntry.date;
    const sameDirection = item.direction === newEntry.direction;

    return subjectMatch && (dateMatch || sameDirection);
  });

  return {
    isDuplicate: !!match,
    matchedEntry: match || null,
  };
}


