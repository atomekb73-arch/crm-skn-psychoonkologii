// ─── Unified Member Status & Consent Filter Helpers ─────────────────────────────

export const isMemberActive = (m) => {
  if (!m) return false;
  const status = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();
  if (status === 'usuniety' || status === 'usunięty' || status === 'deleted') return false;
  if (status === 'archiwum' || status === 'archived' || status === 'odrzucony' || status === 'czarna lista' || m.isArchived) return false;
  if (status === 'oczekuje' || status === 'pending' || status === 'kwarantanna' || status === 'oczekiwanie 💬') return false;
  if (status === 'gosc' || status === 'gość' || status === 'guest' || status === 'wolny słuchacz') return false;
  if (status === 'nieaktywny' || status === 'resigned' || status === 'rezygnacja' || status === 'inactive' || status === 'były' || status === 'byly') return false;

  return status === 'aktywny' || status === 'zatwierdzony' || status === 'active';
};

export const isMemberGuest = (m) => {
  if (!m) return false;
  const status = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();
  if (status === 'archiwum' || status === 'archived' || status === 'odrzucony' || status === 'czarna lista' || m.isArchived) return false;
  return status === 'gosc' || status === 'gość' || status === 'guest' || status === 'wolny słuchacz';
};

export const isMemberInactive = (m) => {
  if (!m) return false;
  const status = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();
  if (status === 'archiwum' || status === 'archived' || status === 'odrzucony' || status === 'czarna lista' || m.isArchived) return false;
  return status === 'nieaktywny' || status === 'resigned' || status === 'rezygnacja' || status === 'inactive' || status === 'były' || status === 'byly';
};

export const isMemberArchived = (m) => {
  if (!m) return false;
  const status = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();
  return status === 'archiwum' || status === 'archived' || status === 'odrzucony' || status === 'czarna lista' || Boolean(m.isArchived);
};

export const isMemberPending = (m) => {
  if (!m) return false;
  const status = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();
  return status === 'oczekuje' || status === 'pending' || status === 'kwarantanna' || status === 'oczekiwanie 💬';
};

export const isMemberDeleted = (m) => {
  if (!m) return false;
  const status = String(m.statusWeryfikacji || m.status || '').toLowerCase().trim();
  return status === 'usuniety' || status === 'usunięty' || status === 'deleted';
};

export const hasMailingConsent = (m) => {
  if (!m) return false;
  const zgoda = String(m.zgodaNaMailing || m.zgodaMailing || '').toLowerCase().trim();
  if (zgoda === 'brak zgody' || zgoda === 'nie' || zgoda === 'false') return false;
  return (
    m.mailingConsent === true ||
    String(m.zgodaMailing || '').toUpperCase().trim() === 'TAK' ||
    String(m.zgodaNaMailing || '').toLowerCase().includes('zgoda') ||
    zgoda === 'tak' ||
    zgoda === 'true' ||
    m.consentStatus === 'Zgody OK'
  );
};
