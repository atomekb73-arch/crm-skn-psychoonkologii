/**
 * ============================================================================
 * SKN Psychoonkologii WSKZ — Backend Google Apps Script (Code.gs)
 * ============================================================================
 * Arkusz Google Sheets: Rejestr_Zgloszen, Ewidencja_Obecnosci, etc.
 * Obsługuje żądania GET oraz POST (CORS-safe / no-cors).
 */

const SHEET_NAME_ZGLOSZENIA = "Rejestr_Zgloszen";
const SHEET_NAME_OBECNOSCI = "Ewidencja_Obecnosci";

/**
 * Nagłówki kolumn arkusza Rejestr_Zgloszen:
 * A: Data_Wplywu
 * B: Nr_Indeksu
 * C: Imie_Nazwisko
 * D: Email
 * E: Telefon
 * F: Kierunek_Semestr
 * G: Zgoda_Mailing
 * H: Status_Weryfikacji
 * I: Data_Weryfikacji
 * J: Aliasy
 */
const HEADERS_ZGLOSZENIA = [
  "Data_Wplywu",
  "Nr_Indeksu",
  "Imie_Nazwisko",
  "Email",
  "Telefon",
  "Kierunek_Semestr",
  "Zgoda_Mailing",
  "Status_Weryfikacji",
  "Data_Weryfikacji",
  "Aliasy"
];

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "pobierz_dane";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "pobierz_dane") {
      let sheet = ss.getSheetByName(SHEET_NAME_ZGLOSZENIA);
      let rawData = [];
      let czlonkowie = [];

      if (sheet && sheet.getLastRow() > 1) {
        rawData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        czlonkowie = rawData.map(row => {
          const dataWplywu = String(row[0] || '').trim();
          const nrIndeksu = String(row[1] || '').trim();
          const imieNazwisko = String(row[2] || '').trim();
          const email = String(row[3] || '').trim();
          const telefon = String(row[4] || '').trim();
          const kierunekSemestr = String(row[5] || '').trim();
          const zgodaMailing = String(row[6] || '').trim();
          const statusWeryfikacji = String(row[7] || '').trim();
          const dataWeryfikacji = String(row[8] || '').trim();
          const aliasy = String(row[9] || '').trim();

          return {
            dataWplywu: dataWplywu,
            nrIndeksu: nrIndeksu,
            cleanIndex: nrIndeksu,
            imieNazwisko: imieNazwisko,
            fullName: imieNazwisko,
            email: email,
            telefon: telefon,
            phone: telefon,
            kierunek: kierunekSemestr,
            zgodaMailing: zgodaMailing,
            mailingConsent: zgodaMailing === "Zgoda na mailing" || zgodaMailing === "true" || zgodaMailing === true,
            statusWeryfikacji: statusWeryfikacji,
            status: statusWeryfikacji === "Archiwum" ? "archived" : (statusWeryfikacji === "Rezygnacja" ? "resigned" : "active"),
            dataWeryfikacji: dataWeryfikacji,
            aliasy: aliasy,
            aliases: aliasy
          };
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: action,
        count: czlonkowie.length,
        czlonkowie: czlonkowie,
        data: rawData
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "SKN Psychoonkologii WSKZ GAS API Ready"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ────────────────────────────────────────────────────────────────────────
    // 1. INICJALIZACJA REJESTRU ZGŁOSZEŃ (Hurtowy zapis członków)
    // ────────────────────────────────────────────────────────────────────────
    if (action === "inicjalizuj_rejestr") {
      let sheet = ss.getSheetByName(SHEET_NAME_ZGLOSZENIA);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_ZGLOSZENIA);
        sheet.appendRow(HEADERS_ZGLOSZENIA);
      } else {
        // Upewnij się, że wiersz 1 ma właściwe nagłówki
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(HEADERS_ZGLOSZENIA);
        } else {
          sheet.getRange(1, 1, 1, HEADERS_ZGLOSZENIA.length).setValues([HEADERS_ZGLOSZENIA]);
        }
        // Wyczyść wszystko poniżej wiersza 1
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
      }

      const members = Array.isArray(payload.members) ? payload.members : [];
      if (members.length > 0) {
        const rows = members.map(m => {
          const rawIdx = String(m.index || m.cleanIndex || m.nrIndeksu || '').trim();
          const cleanIdx = rawIdx.replace(/\D/g, '').replace(/^0+/, '') || rawIdx;
          const fullName = String(
            m.imieNazwisko ||
            m.fullName ||
            `${m.imie || m.firstName || ''} ${m.nazwisko || m.lastName || ''}`.trim() ||
            m.name ||
            ''
          ).trim();
          const email = String(m.email || '').trim();
          const phone = String(m.phone || '').trim();
          const fieldAndYear = String(m.fieldAndYear || `${m.field || ''} ${m.year ? '(' + m.year + ')' : ''}`).trim();
          
          let mailingConsent = "Brak zgody";
          if (m.mailingConsent === true || m.mailingConsent === "true" || m.zgodaNaMailing === "Zgoda na mailing" || m.consentStatus === "Zgody OK") {
            mailingConsent = "Zgoda na mailing";
          }

          const status = m.status === "archived" ? "Archiwum" : (m.status === "resigned" ? "Rezygnacja" : "Zatwierdzony");
          const dateVerified = m.verificationDate || m.timestamp || new Date().toISOString().slice(0, 10);
          const dateCreated = m.createdAt || m.timestamp || new Date().toISOString().slice(0, 10);
          const aliases = Array.isArray(m.aliases) ? m.aliases.join(", ") : String(m.aliases || m.alias || '').trim();

          return [
            dateCreated,      // A: Data_Wplywu
            cleanIdx,         // B: Nr_Indeksu
            fullName,         // C: Imie_Nazwisko
            email,            // D: Email
            phone,            // E: Telefon
            fieldAndYear,     // F: Kierunek_Semestr
            mailingConsent,   // G: Zgoda_Mailing
            status,           // H: Status_Weryfikacji
            dateVerified,     // I: Data_Weryfikacji
            aliases           // J: Aliasy
          ];
        });

        // Szybki zapis hurtowy (setValues)
        sheet.getRange(2, 1, rows.length, HEADERS_ZGLOSZENIA.length).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: `Pomyślnie zainicjalizowano ${members.length} rekordów w arkuszu ${SHEET_NAME_ZGLOSZENIA}`,
        count: members.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. RĘCZNE DODANIE CZŁONKA DO BAZY
    // ────────────────────────────────────────────────────────────────────────
    if (action === "dodaj_czlonka_recznie") {
      let sheet = ss.getSheetByName(SHEET_NAME_ZGLOSZENIA);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_ZGLOSZENIA);
        sheet.appendRow(HEADERS_ZGLOSZENIA);
      }

      const m = payload.member || payload;
      const rawIdx = String(m.index || m.cleanIndex || m.nrIndeksu || '').trim();
      const cleanIdx = rawIdx.replace(/\D/g, '').replace(/^0+/, '') || rawIdx;
      const fullName = String(
        m.imieNazwisko ||
        m.fullName ||
        `${m.imie || m.firstName || ''} ${m.nazwisko || m.lastName || ''}`.trim() ||
        m.name ||
        ''
      ).trim();
      const email = String(m.email || '').trim();
      const phone = String(m.phone || '').trim();
      const fieldAndYear = String(m.fieldAndYear || `${m.field || ''} ${m.year ? '(' + m.year + ')' : ''}`).trim();

      
      let mailingConsent = "Brak zgody";
      if (m.mailingConsent === true || m.mailingConsent === "true" || m.zgodaNaMailing === "Zgoda na mailing" || m.consentStatus === "Zgody OK") {
        mailingConsent = "Zgoda na mailing";
      }

      const status = m.status === "archived" ? "Archiwum" : (m.status === "resigned" ? "Rezygnacja" : "Zatwierdzony");
      const today = new Date().toISOString().slice(0, 10);
      const aliases = Array.isArray(m.aliases) ? m.aliases.join(", ") : String(m.aliases || m.alias || '').trim();

      const newRow = [
        today,           // A: Data_Wplywu
        cleanIdx,        // B: Nr_Indeksu
        fullName,        // C: Imie_Nazwisko
        email,           // D: Email
        phone,           // E: Telefon
        fieldAndYear,    // F: Kierunek_Semestr
        mailingConsent,  // G: Zgoda_Mailing
        status,          // H: Status_Weryfikacji
        today,           // I: Data_Weryfikacji
        aliases          // J: Aliasy
      ];

      sheet.appendRow(newRow);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: `Pomyślnie dodano członka ${fullName} (indeks: ${cleanIdx}) do ${SHEET_NAME_ZGLOSZENIA}`,
        member: newRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. ZMIANA STATUSU WERYFIKACJI CZŁONKA (zmien_status)
    // ────────────────────────────────────────────────────────────────────────
    if (action === "zmien_status") {
      let sheet = ss.getSheetByName(SHEET_NAME_ZGLOSZENIA);
      if (sheet && sheet.getLastRow() > 1) {
        const targetIdx = String(payload.nrIndeksu || '').trim();
        const cleanTarget = targetIdx.replace(/\D/g, '').replace(/^0+/, '') || targetIdx;
        const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues(); // kolumna B (Nr_Indeksu)
        const today = new Date().toISOString().slice(0, 10);

        for (let i = 0; i < data.length; i++) {
          const rowIdx = String(data[i][0]).replace(/\D/g, '').replace(/^0+/, '') || String(data[i][0]).trim();
          if (rowIdx === cleanTarget) {
            const rowIndex = i + 2;
            sheet.getRange(rowIndex, 8).setValue(payload.nowyStatus || "Zatwierdzony"); // Kolumna H
            sheet.getRange(rowIndex, 9).setValue(today); // Kolumna I
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. ZAPIS OBECNOŚCI SPOTKANIA (zapisz_obecnosci)
    // ────────────────────────────────────────────────────────────────────────
    if (action === "zapisz_obecnosci") {
      let sheet = ss.getSheetByName(SHEET_NAME_OBECNOSCI);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_OBECNOSCI);
        sheet.appendRow(["Kod_Spotkania", "Data_Spotkania", "Nr_Indeksu", "Imie_Nazwisko", "Rola", "Sygnatura_Zapisu"]);
      }

      const kod = String(payload.kodSpotkania || "M00").trim();
      const data = String(payload.dataSpotkania || new Date().toISOString().slice(0, 10)).trim();
      const obecnosci = Array.isArray(payload.obecnosci) ? payload.obecnosci : [];

      // Usuń istniejące wpisy dla tego spotkania, aby uniknąć duplikatów
      if (sheet.getLastRow() > 1) {
        const existingData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
        for (let i = existingData.length - 1; i >= 0; i--) {
          if (String(existingData[i][0]).trim() === kod) {
            sheet.deleteRow(i + 2);
          }
        }
      }

      if (obecnosci.length > 0) {
        const now = new Date().toISOString();
        const rows = obecnosci.map(o => [
          kod,
          data,
          String(o.nrIndeksu || '').trim(),
          String(o.name || o.fullName || '').trim(),
          String(o.rola || 'Uczestnik').trim(),
          now
        ]);
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: obecnosci.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. USUNIĘCIE OBECNOŚCI SPOTKANIA (usun_obecnosci_spotkania)
    // ────────────────────────────────────────────────────────────────────────
    if (action === "usun_obecnosci_spotkania") {
      let sheet = ss.getSheetByName(SHEET_NAME_OBECNOSCI);
      if (sheet && sheet.getLastRow() > 1) {
        const kod = String(payload.kodSpotkania || '').trim();
        const existingData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
        for (let i = existingData.length - 1; i >= 0; i--) {
          if (String(existingData[i][0]).trim() === kod) {
            sheet.deleteRow(i + 2);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: `Nieznana akcja: ${action}`
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
