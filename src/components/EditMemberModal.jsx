import { useState, useEffect } from 'react';
import { X, User, Mail, Hash, BookOpen, Calendar, Phone, Sparkles, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function EditMemberModal({ member, isOpen, onClose, onSave }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [index, setIndex] = useState('');
  const [phone, setPhone] = useState('');
  const [field, setField] = useState('');
  const [year, setYear] = useState('');
  const [aliases, setAliases] = useState('');
  const [status, setStatus] = useState('active');
  const [mailingConsent, setMailingConsent] = useState(false);

  useEffect(() => {
    if (member) {
      setFullName(member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim());
      setEmail(member.email || '');
      setIndex(member.index || member.cleanIndex || member.nrIndeksu || '');
      setPhone(member.phone || member.telefon || '');
      setField(member.field || member.kierunek || '');
      setYear(member.year || '');
      setAliases(member.aliases || member.aliasy || member.alias || '');
      setStatus(member.status || 'active');

      const hasConsent =
        member.zgodaNaMailing === 'Zgoda na mailing' ||
        (member.mailingConsent === true && member.zgodaNaMailing !== 'Brak zgody' && member.consentStatus !== 'Brak zgody');
      setMailingConsent(Boolean(hasConsent));
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const dataWplywu = member.dataWplywu || member.timestamp || '—';
  const dataWeryfikacji = member.dataWeryfikacji || '—';
  const dataAktualizacji = member.dataAktualizacji || 'Brak modyfikacji';

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanIdx = index.replace(/\D/g, ''); // automatyczne czyszczenie ze liter i spacji
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';

    onSave({
      ...member,
      fullName: fullName.trim(),
      firstName,
      lastName,
      email: email.trim(),
      index: cleanIdx,
      cleanIndex: cleanIdx,
      nrIndeksu: cleanIdx,
      phone: phone.trim(),
      telefon: phone.trim(),
      field: field.trim(),
      kierunek: field.trim(),
      year: year.trim(),
      aliases: aliases.trim(),
      aliasy: aliases.trim(),
      status,
      mailingConsent,
      zgodaNaMailing: mailingConsent ? 'Zgoda na mailing' : 'Brak zgody',
      consent: mailingConsent,
      zgoda: mailingConsent,
      consentStatus: mailingConsent ? 'Zgody OK' : 'Brak zgody',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              ✏️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edycja danych członka</h3>
              <p className="text-xs text-slate-400">Punktowa aktualizacja profilu w arkuszu Google</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audit Dates Metadata Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 font-medium">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock size={13} className="text-indigo-600" />
              <span>Data wpływu zgłoszenia:</span>
            </span>
            <strong className="font-mono text-slate-800 font-semibold">{dataWplywu}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Data weryfikacji:</span>
            </span>
            <strong className="font-mono text-slate-800 font-semibold">{dataWeryfikacji}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <RefreshCw size={13} className="text-amber-600" />
              <span>Ostatnia aktualizacja:</span>
            </span>
            <strong className="font-mono text-slate-800 font-semibold">{dataAktualizacji}</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="edit-member-fullname" className="block text-xs font-semibold text-slate-700 mb-1">Imię i Nazwisko</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="edit-member-fullname"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                placeholder="np. Jan Kowalski"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-member-email" className="block text-xs font-semibold text-slate-700 mb-1">Adres E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="edit-member-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                  placeholder="student@gmail.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-member-index" className="block text-xs font-semibold text-slate-700 mb-1">
                Numer Indeksu {!index && <span className="text-amber-600 font-normal">(Wymagany)</span>}
              </label>
              <div className="relative">
                <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="edit-member-index"
                  name="index"
                  type="text"
                  value={index}
                  onChange={e => setIndex(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                  placeholder="np. 15998"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-member-phone" className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="edit-member-phone"
                  name="phone"
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
                  placeholder="np. +48 500 000 000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-member-alias" className="block text-xs font-semibold text-slate-700 mb-1">Aliasy Meet / Nickname</label>
              <div className="relative">
                <Sparkles size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="edit-member-alias"
                  name="aliases"
                  type="text"
                  value={aliases}
                  onChange={e => setAliases(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                  placeholder="np. Jan K., jankow"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-member-field" className="block text-xs font-semibold text-slate-700 mb-1">Kierunek studiów</label>
              <div className="relative">
                <BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="edit-member-field"
                  name="field"
                  type="text"
                  value={field}
                  onChange={e => setField(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                  placeholder="np. Psychologia"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-member-year" className="block text-xs font-semibold text-slate-700 mb-1">Rok studiów</label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="edit-member-year"
                  name="year"
                  type="text"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                  placeholder="np. Rok 2"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="edit-member-status" className="block text-xs font-semibold text-slate-700 mb-1">Status członkostwa</label>
              <select
                id="edit-member-status"
                name="status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none bg-white font-medium"
              >
                <option value="active">🟢 Aktywny</option>
                <option value="guest">🟣 Gość (Wolny słuchacz)</option>
                <option value="resigned">⚪ Nieaktywny (Rezygnacja)</option>
                <option value="pending">🟡 Oczekujący</option>
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
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-300 border-slate-300"
                />
                <span className="font-medium">Zgoda na mailing</span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              Zapisz zmiany
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
