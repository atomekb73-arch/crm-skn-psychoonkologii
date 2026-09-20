import React, { useState } from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  Minus,
  Plus,
  Save,
  Printer,
  FolderPlus,
} from 'lucide-react';
import { OfficialMeetingMinutesTemplate } from './DocumentTemplates';

/**
 * Modal edycji i wydruku Protokołu / Notatki ze Spotkania Naukowego dla SKN Psychoonkologii
 */
export default function MeetingProtocolModal({
  isOpen,
  onClose,
  meeting,
  protocolForm,
  setProtocolForm,
  onSave,
  onSaveToDocsRepo,
  onPrint,
  saveStatus,
  currentOrg,
  academicYear = '2025/2026',
}) {
  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-6 h-6 shrink-0" size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Protokół / Notatka ze Spotkania Naukowego
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentOrg?.name || 'SKN Psychoonkologii'} • {meeting.code || meeting.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 shrink-0" size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {saveStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 w-5 h-5" />
              <span>{saveStatus}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Sygnatura / Nr Protokołu:
              </label>
              <input
                type="text"
                value={protocolForm.protocolNumber}
                onChange={(e) =>
                  setProtocolForm({ ...protocolForm, protocolNumber: e.target.value })
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Data:</label>
              <input
                type="text"
                value={protocolForm.date}
                onChange={(e) => setProtocolForm({ ...protocolForm, date: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Godziny / Czas trwania:
              </label>
              <input
                type="text"
                value={protocolForm.time}
                onChange={(e) => setProtocolForm({ ...protocolForm, time: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tytuł spotkania / referatu:
              </label>
              <input
                type="text"
                value={protocolForm.title}
                onChange={(e) => setProtocolForm({ ...protocolForm, title: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Prelegent / Prowadzący:
              </label>
              <input
                type="text"
                value={protocolForm.speaker}
                onChange={(e) => setProtocolForm({ ...protocolForm, speaker: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Miejsce / Platforma:
              </label>
              <input
                type="text"
                value={protocolForm.location}
                onChange={(e) => setProtocolForm({ ...protocolForm, location: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Liczba obecnych:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setProtocolForm({
                      ...protocolForm,
                      attendeesCount: Math.max(0, (protocolForm.attendeesCount || 0) - 1),
                    })
                  }
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  value={protocolForm.attendeesCount}
                  onChange={(e) =>
                    setProtocolForm({
                      ...protocolForm,
                      attendeesCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full text-center p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-800 focus:outline-none focus:border-indigo-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setProtocolForm({
                      ...protocolForm,
                      attendeesCount: (protocolForm.attendeesCount || 0) + 1,
                    })
                  }
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Protokolant:
              </label>
              <input
                type="text"
                value={protocolForm.recorder}
                onChange={(e) => setProtocolForm({ ...protocolForm, recorder: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              1. Cel spotkania / Porządek obrad:
            </label>
            <textarea
              rows={3}
              value={protocolForm.agenda}
              onChange={(e) => setProtocolForm({ ...protocolForm, agenda: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs resize-y min-h-[90px]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              2. Przebieg posiedzenia, streszczenie prelekcji i dyskusja:
            </label>
            <textarea
              rows={4}
              value={protocolForm.content}
              onChange={(e) => setProtocolForm({ ...protocolForm, content: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs resize-y min-h-[90px]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              3. Ustalenia końcowe / Zadania i wnioski:
            </label>
            <textarea
              rows={3}
              value={protocolForm.conclusions}
              onChange={(e) => setProtocolForm({ ...protocolForm, conclusions: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs resize-y min-h-[90px]"
            />
          </div>

          {/* Include attendees toggle */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block">
                Dołącz imienną listę obecnych do protokołu
              </span>
              <span className="text-[11px] text-slate-500">
                Załącznik zawiera listę zweryfikowanych uczestników ({protocolForm.attendees?.length || 0} osób).
              </span>
            </div>
            <input
              type="checkbox"
              checked={protocolForm.includeAttendeesList}
              onChange={(e) =>
                setProtocolForm({ ...protocolForm, includeAttendeesList: e.target.checked })
              }
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onSaveToDocsRepo}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            title="Dodaje protokół jako oficjalny dokument do Repozytorium Dokumentów i Rejestru Uchwał"
          >
            <FolderPlus className="w-5 h-5 shrink-0" size={20} />
            <span>Zapisz w Dzienniku Dokumentów Koła</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Save className="w-5 h-5 shrink-0" size={20} />
              <span>Zapisz zmiany</span>
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-5 h-5 shrink-0" size={20} />
              <span>Drukuj Protokół (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
