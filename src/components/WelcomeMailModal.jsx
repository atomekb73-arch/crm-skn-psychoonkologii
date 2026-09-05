import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  User,
  Hash,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Eye,
  PenLine,
  AtSign,
  ArrowRight,
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import {
  getEmailConfig,
  getCorrespondenceLog,
  addCorrespondenceEntry,
} from '../utils/storage';

const EMAIL_TEMPLATES = {
  welcome: {
    id: 'welcome',
    name: '🌟 Powitanie & Potwierdzenie przyjęcia',
    badge: 'Kwarantanna / Nowy członek',
    subject: 'Potwierdzenie przyjęcia zgłoszenia i powitanie w {ORGANIZACJA}',
    body: `Dzień dobry {IMIE},

Z radością informujemy, że Twoje zgłoszenie do {ORGANIZACJA} na rok akademicki 2026/2027 zostało pomyślnie zweryfikowane i przyjęte!

Twoje dane ewidencyjne w systemie CRM:
• Imię i nazwisko: {IMIE_NAZWISKO}
• Kierunek: {KIERUNEK} ({ROK})
• Numer indeksu: {INDEKS}

Najważniejsze informacje organizacyjne:
1. Harmonogram spotkań, sesji seminaryjnych oraz warsztatów merytorycznych dostępny jest w kalendarzu koła.
2. Udział w spotkaniach i aktywność naukowa są na bieżąco ewidencjonowane w systemie CRM.
3. W razie jakichkolwiek pytań zachęcamy do kontaktu mailowego z Zarządem Koła.

Serdecznie witamy w naszym zespole i życzymy owocnej pracy naukowej!

{PODPIS}`,
  },
  meeting: {
    id: 'meeting',
    name: '📅 Zaproszenie na spotkanie naukowe',
    badge: 'Seminaria / Journal Club',
    subject: 'Zaproszenie na spotkanie naukowe {ORGANIZACJA}',
    body: `Dzień dobry {IMIE},

Serdecznie zapraszamy do udziału w najbliższym spotkaniu naukowym {ORGANIZACJA}.

Szczegóły spotkania:
• Data i godzina: [Wpisz datę i godzinę spotkania]
• Temat przewodni: [Wpisz temat wystąpienia/seminarium]
• Prowadzący / Prelegenci: [Wpisz prelegentów]
• Link do spotkania (Google Meet / Sala): [Wklej link]

Przypominamy, że obecność jest ewidencjonowana na podstawie aktywnego udziału i generuje punkty aktywności naukowej.

Do zobaczenia na spotkaniu!

{PODPIS}`,
  },
  certificate: {
    id: 'certificate',
    name: '📜 Informacja o zaświadczeniu / statusie',
    badge: 'Certyfikacja & Oceny',
    subject: 'Informacja o statusie członkowskim i zaświadczeniu – {ORGANIZACJA}',
    body: `Dzień dobry {IMIE},

Informujemy, że Twoje podsumowanie aktywności naukowej w {ORGANIZACJA} za bieżący okres zostało zaktualizowane w systemie CRM.

• Student: {IMIE_NAZWISKO} (indeks: {INDEKS})
• Status: Aktywny Członek Koła Naukowego

Oficjalne zaświadczenia z podpisami Opiekunów Naukowych oraz Zarządu Koła są generowane zgodnie z regulaminem działalności.

W razie pytań dotyczących punktacji lub dokumentacji prosimy o kontakt zwrotny.

{PODPIS}`,
  },
  custom: {
    id: 'custom',
    name: '✍️ Własna wiadomość',
    badge: 'Niestandardowa korespondencja',
    subject: 'Wiadomość od Zarządu {ORGANIZACJA}',
    body: `Dzień dobry {IMIE},

[Wpisz treść wiadomości...]

{PODPIS}`,
  },
};

export default function WelcomeMailModal({
  isOpen,
  onClose,
  member = null,
  members = [],
  onRegistered = null,
  onApproveMember = null,
  initialTemplateKey = 'welcome',
}) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || 'skn-psychoonkologia';
  const orgName = currentOrg?.name || 'Studenckie Koło Naukowe Psychoonkologii WSKZ';

  // Email configuration from storage
  const [emailConfig, setEmailConfig] = useState(() => getEmailConfig(orgId));

  useEffect(() => {
    if (isOpen) {
      setEmailConfig(getEmailConfig(orgId));
    }
  }, [isOpen, orgId]);

  // Selected recipient state
  const [selectedMember, setSelectedMember] = useState(member);
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [customRecipientIndex, setCustomRecipientIndex] = useState('');
  const [customRecipientField, setCustomRecipientField] = useState('');
  const [customRecipientYear, setCustomRecipientYear] = useState('');

  // Selected template & custom text state
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(initialTemplateKey);
  const [subjectText, setSubjectText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'preview'
  const [copiedField, setCopiedField] = useState(null);
  const [registeredEntry, setRegisteredEntry] = useState(null);
  const [approveOnSend, setApproveOnSend] = useState(true);

  // Sync recipient when member prop changes or modal opens
  useEffect(() => {
    if (member) {
      setSelectedMember(member);
      setCustomRecipientEmail(member.email || '');
      setCustomRecipientName(member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim());
      setCustomRecipientIndex(member.index || '');
      setCustomRecipientField(member.field || 'Psychologia');
      setCustomRecipientYear(member.year ? `${member.year} rok` : 'I rok');
    } else {
      setSelectedMember(null);
      setCustomRecipientEmail('');
      setCustomRecipientName('');
      setCustomRecipientIndex('');
      setCustomRecipientField('Psychologia');
      setCustomRecipientYear('I rok');
    }
    setRegisteredEntry(null);
    setCopiedField(null);
  }, [member, isOpen]);

  // Extract recipient first name for personalized greeting
  const recipientFirstName = useMemo(() => {
    const fullName = selectedMember?.fullName || customRecipientName || '';
    if (!fullName) return '';
    const firstPart = fullName.trim().split(/\s+/)[0];
    return firstPart || '';
  }, [selectedMember, customRecipientName]);

  const recipientFullName = useMemo(() => {
    return (
      selectedMember?.fullName ||
      `${selectedMember?.firstName || ''} ${selectedMember?.lastName || ''}`.trim() ||
      customRecipientName ||
      'Członku Koła'
    );
  }, [selectedMember, customRecipientName]);

  const recipientEmail = useMemo(() => {
    return selectedMember?.email || customRecipientEmail || '';
  }, [selectedMember, customRecipientEmail]);

  const recipientIndex = useMemo(() => {
    return selectedMember?.index || customRecipientIndex || '—';
  }, [selectedMember, customRecipientIndex]);

  const recipientField = useMemo(() => {
    return selectedMember?.field || customRecipientField || 'Psychologia';
  }, [selectedMember, customRecipientField]);

  const recipientYear = useMemo(() => {
    const y = selectedMember?.year || customRecipientYear || '';
    if (!y) return 'rok I';
    if (String(y).includes('rok')) return String(y);
    return `${y} rok`;
  }, [selectedMember, customRecipientYear]);

  // Replace placeholders helper
  const replaceTokens = (text) => {
    if (!text) return '';
    return text
      .replace(/{IMIE}/g, recipientFirstName || 'Studencie')
      .replace(/{IMIE_NAZWISKO}/g, recipientFullName)
      .replace(/{NAZWISKO}/g, selectedMember?.lastName || '')
      .replace(/{INDEKS}/g, recipientIndex)
      .replace(/{KIERUNEK}/g, recipientField)
      .replace(/{ROK}/g, recipientYear)
      .replace(/{ORGANIZACJA}/g, orgName)
      .replace(/{PODPIS}/g, emailConfig.footerSignature || 'Z poważaniem,\nZarząd Koła Naukowego');
  };

  // Re-generate template when template key changes or recipient changes
  useEffect(() => {
    const template = EMAIL_TEMPLATES[selectedTemplateKey] || EMAIL_TEMPLATES.welcome;
    let rawSubject = template.subject;
    let rawBody = template.body;

    // If using emailConfig customized welcome template and welcome template is selected
    if (selectedTemplateKey === 'welcome' && emailConfig?.welcomeSubjectTemplate) {
      rawSubject = emailConfig.welcomeSubjectTemplate;
    }
    if (selectedTemplateKey === 'welcome' && emailConfig?.welcomeBodyTemplate) {
      rawBody = emailConfig.welcomeBodyTemplate;
    }

    setSubjectText(replaceTokens(rawSubject));
    setBodyText(replaceTokens(rawBody));
  }, [selectedTemplateKey, selectedMember, customRecipientName, customRecipientEmail, customRecipientIndex, customRecipientField, customRecipientYear, emailConfig]);

  if (!isOpen) return null;

  // Handlers
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const createRegistryRecord = () => {
    const log = getCorrespondenceLog(orgId);
    const nextNum = String(log.length + 1).padStart(2, '0');
    const now = new Date();
    const year = now.getFullYear();
    const dateStr = now.toISOString().split('T')[0];

    // Determine prefix based on org
    const orgCode = orgId.includes('seks') ? 'SEKS' : orgId.includes('uzal') || orgId.includes('sknu') ? 'SKNU' : 'PSY';
    const entryId = `KANC/${orgCode}/OUT/${nextNum}/${year}`;

    const senderFull = `${emailConfig.senderName || 'Zarząd SKN'} <${emailConfig.senderEmail || 'skn@wskz.pl'}>`;
    const recipientFull = `${recipientFullName} <${recipientEmail}>`;

    const newEntry = {
      id: entryId,
      date: dateStr,
      direction: 'OUT',
      sender: senderFull,
      recipient: recipientFull,
      subject: subjectText,
      summary: bodyText.slice(0, 350) + (bodyText.length > 350 ? '...' : ''),
      status: 'Zarejestrowane / Wysłane',
      fromSheet: 'Ewidencja_Poczty',
      notes: `Wygenerowano z szablonu [${EMAIL_TEMPLATES[selectedTemplateKey]?.name || 'Powiadomienie'}] w CRM`,
      createdAt: now.toISOString(),
    };

    addCorrespondenceEntry(orgId, newEntry);
    setRegisteredEntry(newEntry);
    if (onRegistered) onRegistered(newEntry);

    // If candidate from quarantine and approve option is enabled
    if (approveOnSend && onApproveMember && selectedMember?.id) {
      onApproveMember(selectedMember.id);
    }

    return newEntry;
  };

  /**
   * Półautomatyczne zatwierdzenie i wysłanie:
   * 1. Otwiera klienta pocztowego (mailto:) z gotowym tematem i treścią
   * 2. Zapisuje wpis w Dzienniku Podawczym / Ewidencja_Poczty
   * 3. Opcjonalnie zatwierdza kandydata do Zarządzania
   */
  const handleConfirmAndSend = () => {
    if (!recipientEmail) {
      alert('Brak adresu e-mail odbiorcy! Wpisz poprawny adres studenta.');
      return;
    }

    // 1. Rejestruj w Ewidencja_Poczty
    createRegistryRecord();

    // 2. Otwórz w domyślnym programie pocztowym
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, '_blank');
  };

  /**
   * Rejestracja w arkuszu bez wywoływania mailto
   */
  const handleOnlyRegister = () => {
    if (!recipientEmail) {
      alert('Brak adresu e-mail odbiorcy!');
      return;
    }
    createRegistryRecord();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Mail size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Podgląd i zatwierdzenie wysyłki wiadomości
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Ewidencja_Poczty
                </span>
              </div>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                Półautomatyczna wysyłka z oficjalnego adresu koła oraz wpis do rejestru spraw
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Anuluj"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sender & Recipient Overview Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-3.5 px-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <AtSign size={13} />
            </div>
            <div>
              <span className="text-slate-500 font-medium">Nadawca: </span>
              <strong className="text-slate-800">{emailConfig.senderName}</strong>{' '}
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-semibold">
                &lt;{emailConfig.senderEmail}&gt;
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <User size={13} />
            </div>
            <div>
              <span className="text-slate-500 font-medium">Adresat: </span>
              <strong className="text-slate-800">{recipientFullName}</strong>{' '}
              <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 font-semibold">
                &lt;{recipientEmail || 'brak adresu'}&gt;
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="px-5 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-white text-indigo-600 border-slate-200 -mb-px shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <PenLine size={14} />
              <span>Edycja & Parametry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-indigo-600 border-slate-200 -mb-px shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Eye size={14} />
              <span>Podgląd e-mail (Render)</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Szablon: <strong>{EMAIL_TEMPLATES[selectedTemplateKey]?.name}</strong></span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Success Banner */}
          {registeredEntry && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <strong>Zatwierdzono i zarejestrowano!</strong> Sygnatura:{' '}
                  <span className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">
                    {registeredEntry.id}
                  </span>{' '}
                  zapisana w karcie <strong className="font-mono text-emerald-800">Ewidencja_Poczty</strong>.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compose' ? (
            <div className="space-y-4">
              {/* Recipient Details & Switcher */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Dane Studenta / Adresata
                    </span>
                  </div>
                  {members.length > 0 && (
                    <div className="text-xs">
                      <select
                        value={selectedMember?.id || ''}
                        onChange={(e) => {
                          const found = members.find((m) => m.id === e.target.value);
                          if (found) {
                            setSelectedMember(found);
                            setCustomRecipientEmail(found.email || '');
                            setCustomRecipientName(found.fullName || `${found.firstName || ''} ${found.lastName || ''}`.trim());
                            setCustomRecipientIndex(found.index || '');
                            setCustomRecipientField(found.field || 'Psychologia');
                            setCustomRecipientYear(found.year ? `${found.year} rok` : 'I rok');
                          }
                        }}
                        className="p-1 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                      >
                        <option value="">-- Zmień studenta z bazy ({members.length}) --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName || `${m.firstName || ''} ${m.lastName || ''}`} ({m.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      Imię i Nazwisko:
                    </label>
                    <input
                      type="text"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                      placeholder="Imię i nazwisko"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      Adres e-mail:
                    </label>
                    <input
                      type="email"
                      required
                      value={customRecipientEmail}
                      onChange={(e) => setCustomRecipientEmail(e.target.value)}
                      placeholder="student@student.wskz.pl"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      Nr Indeksu:
                    </label>
                    <input
                      type="text"
                      value={customRecipientIndex}
                      onChange={(e) => setCustomRecipientIndex(e.target.value)}
                      placeholder="np. 34327"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Template Selector Pills */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Wybierz szablon wiadomości:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Znaczniki {'{IMIE}'}, {'{INDEKS}'} podmieniane automatycznie
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(EMAIL_TEMPLATES).map((tmpl) => {
                    const isSelected = selectedTemplateKey === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateKey(tmpl.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{tmpl.name}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{tmpl.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Temat wiadomości:</label>
                  <button
                    type="button"
                    onClick={() => handleCopy(subjectText, 'subject')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'subject' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    <span>{copiedField === 'subject' ? 'Skopiowano temat!' : 'Kopiuj temat'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={subjectText}
                  onChange={(e) => setSubjectText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Body Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Edytowalna treść wiadomości:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(bodyText, 'body')}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'body' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedField === 'body' ? 'Skopiowano treść!' : 'Kopiuj treść'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={9}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-y font-normal"
                />
              </div>

              {/* Quarantine Auto-Approve Checkbox if applicable */}
              {onApproveMember && selectedMember?.id && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="autoApproveCheck"
                    checked={approveOnSend}
                    onChange={(e) => setApproveOnSend(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="autoApproveCheck" className="text-xs text-indigo-950 font-medium cursor-pointer">
                    Automatycznie zatwierdź kandydata do <strong>Zarządzania Bazy Członków</strong> po zatwierdzeniu wysyłki
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="border-b border-slate-100 pb-3 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-16">Od:</span>
                    <span className="font-semibold text-slate-900">
                      {emailConfig.senderName} &lt;{emailConfig.senderEmail}&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-16">Do:</span>
                    <span className="font-semibold text-indigo-700">
                      {recipientFullName} &lt;{recipientEmail || 'brak@email.com'}&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-16">Temat:</span>
                    <span className="font-bold text-slate-900">{subjectText}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {bodyText}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic text-center">
                Wiadomość zostanie przygotowana do wysłania z programu pocztowego koła oraz wpisana do Dziennika Podawczego.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions (Half-automatic Approval & Dispatch) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(`${subjectText}\n\n${bodyText}`, 'all')}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              {copiedField === 'all' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedField === 'all' ? 'Skopiowano całość!' : 'Kopiuj całość'}</span>
            </button>

            <button
              type="button"
              onClick={handleOnlyRegister}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Zarejestruj pismo w Dzienniku Podawczym bez otwierania poczty"
            >
              <FileSpreadsheet size={13} />
              <span>Tylko rejestruj</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Anuluj
            </button>

            {/* Main Primary Action Button */}
            <button
              type="button"
              onClick={handleConfirmAndSend}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-900/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Send size={14} />
              <span>Zatwierdź i wyślij / Otwórz pocztę</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
