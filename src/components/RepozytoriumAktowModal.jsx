import React, { useState, useEffect } from 'react';
import {
  FileText,
  X,
  FolderOpen,
  Eye,
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { getDriveFolderUrl } from '../utils/storage';

export default function RepozytoriumAktowModal({
  isOpen,
  onClose,
  onSave,
  editingDoc = null,
  selectedCategory = 'Wszystkie',
  documentsCount = 0,
}) {
  const { currentOrg } = useOrg();

  const getOrgDocTag = (org) => {
    if (!org) return 'SKN-ONKO';
    if (org.id === 'skn-psychoonkologia' || org.id === 'skn_psychoonkologia' || org.tag === 'SKN-ONKO' || org.tag === 'WSKZ') {
      return 'SKN-ONKO';
    }
    if (org.id === 'sknu' || org.tag === 'SKNU') {
      return 'SKNU';
    }
    if (org.id === 'skn_seksuologii' || org.tag === 'SKN-SEKS' || org.tag === 'SEKS') {
      return 'SEKS';
    }
    return org.tag || (org.shortName ? org.shortName.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'SKN');
  };

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    category: 'Uchwały Zarządu',
    date: new Date().toISOString().split('T')[0],
    linkDrive: '',
    driveUrl: '',
    status: 'Obowiązujący',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editingDoc) {
      setFormData({
        code: editingDoc.code || '',
        title: editingDoc.title || '',
        category: editingDoc.category || 'Uchwały Zarządu',
        date: editingDoc.date || new Date().toISOString().split('T')[0],
        linkDrive: editingDoc.linkDrive || editingDoc.driveUrl || '',
        driveUrl: editingDoc.driveUrl || editingDoc.linkDrive || '',
        status: editingDoc.status || 'Obowiązujący',
        description: editingDoc.description || '',
      });
    } else {
      const orgTag = getOrgDocTag(currentOrg);
      let cat = 'Uchwały Zarządu';
      let prefix = 'UCHWAŁA';
      if (selectedCategory === 'Regulaminy i Statut') {
        cat = 'Regulaminy i Statut';
        prefix = 'STATUT';
      } else if (selectedCategory === 'Protokoły Zebrań') {
        cat = 'Protokoły Zebrań';
        prefix = 'PROT';
      } else if (selectedCategory === 'Wnioski i Granty') {
        cat = 'Wnioski i Granty';
        prefix = 'WNIOSEK';
      } else if (selectedCategory === 'Uchwały Zarządu') {
        cat = 'Uchwały Zarządu';
        prefix = 'UCHWAŁA';
      }

      setFormData({
        code: `${prefix}/${orgTag}/${String(documentsCount + 1).padStart(2, '0')}/2026`,
        title: '',
        category: cat,
        date: new Date().toISOString().split('T')[0],
        linkDrive: '',
        driveUrl: '',
        status: 'Obowiązujący',
        description: '',
      });
    }
  }, [isOpen, editingDoc, selectedCategory, documentsCount, currentOrg]);

  const handlePreviewFile = () => {
    const link = formData.linkDrive || formData.driveUrl;
    if (!link) return;
    const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
    const previewUrl = match ? `https://drive.google.com/file/d/${match[1]}/preview` : link;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Wpisz tytuł dokumentu!');
      return;
    }
    const finalDoc = {
      ...formData,
      driveUrl: formData.linkDrive || formData.driveUrl,
      linkDrive: formData.linkDrive || formData.driveUrl,
    };
    onSave(finalDoc);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-start pt-8 justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden font-sans my-auto">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {editingDoc ? 'Edycja Dokumentu / Uchwały' : 'Rejestracja Nowego Dokumentu'}
              </h3>
              <p className="text-[11px] text-slate-400">{currentOrg?.name || 'SKN Psychoonkologii'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kategoria Dokumentu:</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  let newPrefix = 'UCHWAŁA';
                  if (newCat === 'Regulaminy i Statut') newPrefix = 'STATUT';
                  else if (newCat === 'Protokoły Zebrań') newPrefix = 'PROT';
                  else if (newCat === 'Wnioski i Granty') newPrefix = 'WNIOSEK';

                  const orgTag = getOrgDocTag(currentOrg);
                  const updatedCode = editingDoc
                    ? formData.code
                    : `${newPrefix}/${orgTag}/${String(documentsCount + 1).padStart(2, '0')}/2026`;

                  setFormData({ ...formData, category: newCat, code: updatedCode });
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-indigo-500"
              >
                <option value="Uchwały Zarządu">Uchwały Zarządu</option>
                <option value="Protokoły Zebrań">Protokoły Zebrań</option>
                <option value="Regulaminy i Statut">Regulaminy i Statut</option>
                <option value="Wnioski i Granty">Wnioski i Granty</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sygnatura / Nr Aktu:</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="np. UCHWAŁA/SKN-ONKO/01/2026"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tytuł / Przedmiot Dokumentu:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Wpisz pełny tytuł uchwały lub protokołu..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Data Uchwalenia / Wydania:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Status Obowiązywania:</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-indigo-500"
              >
                <option value="Obowiązujący">🟢 Obowiązujący</option>
                <option value="W toku">🟡 W toku</option>
                <option value="Zastąpiony">⚪ Zastąpiony</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Link do pliku w Google Drive:</label>
              <button
                type="button"
                onClick={() => window.open(getDriveFolderUrl(currentOrg?.id), '_blank')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <FolderOpen size={13} />
                <span>📂 Otwórz Dysk Koła</span>
              </button>
            </div>
            <input
              type="url"
              value={formData.linkDrive || formData.driveUrl || ''}
              onChange={(e) => setFormData({ ...formData, linkDrive: e.target.value, driveUrl: e.target.value })}
              placeholder="https://docs.google.com/document/d/... (Wklej dokładnie ten link/ID pliku)"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notatka / Streszczenie Aktu:</label>
            <textarea
              rows={7}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Opisz krótko cel aktu prawno-organizacyjnego..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans min-h-[160px] resize-y focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              <button
                type="button"
                onClick={handlePreviewFile}
                disabled={!formData.linkDrive && !formData.driveUrl}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                  formData.linkDrive || formData.driveUrl
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                }`}
              >
                👁️ Podgląd dokumentu
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Zapisz w Rejestrze
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
