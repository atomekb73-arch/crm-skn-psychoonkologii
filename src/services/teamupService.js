const TEAMUP_CALENDAR_ID = 'ks9aiux4jiza1ronpd';
const TEAMUP_TOKEN = '20dc4242d0d74be314e5ee108dc618cf3f6fbcb7647865568775fe4d9a89c112';
const BASE_URL = `/api-teamup/${TEAMUP_CALENDAR_ID}`;

export const DEFAULT_SUBCALENDAR_ID = '15520558';

export async function fetchTeamupSubcalendars() {
  const defaultSub = { id: DEFAULT_SUBCALENDAR_ID, name: 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' };
  if (!BASE_URL || !TEAMUP_TOKEN) {
    return [defaultSub];
  }

  try {
    const res = await fetch(`${BASE_URL}/subcalendars`, {
      headers: {
        'Teamup-Token': TEAMUP_TOKEN,
      },
    });
    const data = await res.json();
    if (res.ok && data.subcalendars) {
      const targetSub = data.subcalendars.find(s => String(s.id) === DEFAULT_SUBCALENDAR_ID);
      if (targetSub) {
        return [{ id: String(targetSub.id), name: targetSub.name || 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' }];
      }
    }
  } catch (err) {
    console.error('Błąd pobierania podkalendarzy z Teamup:', err);
  }

  return [defaultSub];
}

export async function fetchTeamupEvents({
  startDate = '2025-10-01',
  endDate = '2027-09-30',
  subcalendarId = DEFAULT_SUBCALENDAR_ID,
  yearPrefix = '26/27',
} = {}) {
  if (!BASE_URL || !TEAMUP_TOKEN) {
    return [];
  }
  try {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    // Ustal docelowy subkalendarz - zablokowany wyłącznie na 15520558 dla SKN Psychoonkologii
    const targetSubId = DEFAULT_SUBCALENDAR_ID;

    params.append('subcalendarId[]', targetSubId);

    const url = `${BASE_URL}/events?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'Teamup-Token': TEAMUP_TOKEN,
      },
    });

    const data = await res.json();

    if (!res.ok || data.error || !data.events) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      console.error(`Błąd Teamup API (${errMsg}):`, data?.error);
      console.log('Pobrane wydarzenia Teamup:', []);
      return [];
    }

    // Ścisłe filtrowanie: wyklucz zdarzenia z jakichkolwiek innych podkalendarzy
    const rawEvents = data.events || [];
    const events = rawEvents.filter(evt => {
      if (!targetSubId) return true;
      const subIdMatches = String(evt.subcalendar_id) === String(targetSubId);
      const subIdsMatches = Array.isArray(evt.subcalendar_ids) && evt.subcalendar_ids.some(id => String(id) === String(targetSubId));
      return subIdMatches || subIdsMatches;
    });

    console.log('Pobrane wydarzenia Teamup (SKN Psychoonkologii):', events);

    // Sort chronologically by start date
    const sorted = [...events].sort(
      (a, b) => new Date(a.start_dt || a.startDate) - new Date(b.start_dt || b.startDate)
    );

    return sorted.map((evt, idx) => {
      const codeNum = String(idx + 1).padStart(2, '0');
      const startDateObj = evt.start_dt ? new Date(evt.start_dt) : null;
      const formattedDate = startDateObj
        ? startDateObj.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : evt.start_dt || '';

      const isUpcoming = startDateObj ? startDateObj >= new Date() : false;

      return {
        id: evt.id || `M${codeNum}`,
        code: `[${yearPrefix}] M${codeNum}`,
        title: evt.title || 'Spotkanie',
        start_dt: evt.start_dt,
        end_dt: evt.end_dt,
        date: evt.start_dt ? evt.start_dt.split('T')[0] : '',
        formattedDate,
        location: evt.location || '',
        notes: evt.notes || '',
        who: evt.who || '', // Prowadzący
        attendees: [],
        subcalendar_id: evt.subcalendar_id,
        isUpcoming,
        isLive: true,
      };
    });
  } catch (err) {
    console.error('Wyjątek podczas pobierania z Teamup API:', err);
    console.log('Pobrane wydarzenia Teamup:', []);
    return [];
  }
}
