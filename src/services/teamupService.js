const TEAMUP_CALENDAR_ID = import.meta.env?.VITE_TEAMUP_CALENDAR_ID || 'ks9aiux4jiza1ronpd';
const TEAMUP_TOKEN = import.meta.env?.VITE_TEAMUP_API_KEY || import.meta.env?.VITE_TEAMUP_TOKEN || '20dc4242d0d74be314e5ee108dc618cf3f6fbcb7647865568775fe4d9a89c112';
const BASE_URL = `/api-teamup/${TEAMUP_CALENDAR_ID}`;
const DIRECT_URL = `https://api.teamup.com/${TEAMUP_CALENDAR_ID}`;

export const DEFAULT_SUBCALENDAR_ID = import.meta.env?.VITE_SUBCALENDAR_ID || '15520558';

export async function fetchTeamupSubcalendars() {
  const defaultSub = { id: DEFAULT_SUBCALENDAR_ID, name: 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' };
  if (!TEAMUP_TOKEN) {
    return [defaultSub];
  }

  const urlsToTry = [`${BASE_URL}/subcalendars`, `${DIRECT_URL}/subcalendars`];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: {
          'Teamup-Token': TEAMUP_TOKEN,
        },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (data && data.subcalendars) {
            const targetSub = data.subcalendars.find(s => String(s.id) === DEFAULT_SUBCALENDAR_ID);
            if (targetSub) {
              return [{ id: String(targetSub.id), name: targetSub.name || 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' }];
            }
          }
        }
      }
    } catch (err) {
      console.warn('Błąd pobierania podkalendarzy z url:', url, err);
    }
  }

  return [defaultSub];
}

export async function fetchTeamupEvents({
  startDate = '2025-10-01',
  endDate = '2027-09-30',
  subcalendarId = DEFAULT_SUBCALENDAR_ID,
  yearPrefix = '26/27',
} = {}) {
  if (!TEAMUP_TOKEN) {
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

    const urlsToTry = [
      `${BASE_URL}/events?${params.toString()}`,
      `${DIRECT_URL}/events?${params.toString()}`,
    ];

    let eventsData = null;

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          headers: {
            'Teamup-Token': TEAMUP_TOKEN,
          },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data && data.events) {
              eventsData = data;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Błąd podczas próby pobrania wydarzeń z', url, e);
      }
    }

    if (!eventsData || !eventsData.events) {
      return [];
    }

    const data = eventsData;

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
