import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  Award,
  ClipboardList,
  Copy,
  Check,
  Sparkles,
  Download,
  Share2,
  Calendar,
} from 'lucide-react';
import {
  MembershipCertificateTemplate,
  SpeakerDiplomaTemplate,
  AnnualReportProtocolTemplate,
  generateDocumentNumber,
  formatPolishDate,
} from './DocumentTemplates';
import { useSettings } from '../context/SettingsContext';
import { getStoredSupervisors } from '../utils/specialRoles';

export default function CertificateModal({
  isOpen,
  onClose,
  member,
  initialDocType = 'membership', // 'membership', 'speaker', 'protocol'
  freqData = { freq: 100, present: 12, absent: 0 },
  points = 0,
  allMembers = [],
  meetings = [],
  academicYear = '2025/2026',
}) {
  const [docType, setDocType] = useState(initialDocType);
  const [presentationTopic, setPresentationTopic] = useState('Analiza współczesnych modeli sekso-terapeutycznych w praktyce klinicznej');
  const [copied, setCopied] = useState(false);
  const { supervisors: contextSupervisors } = useSettings() || {};

  const supervisors = contextSupervisors && contextSupervisors.length > 0
    ? contextSupervisors
    : getStoredSupervisors();

  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
  }, [initialDocType, isOpen]);

  if (!isOpen) return null;

  const currentDocNumber = generateDocumentNumber(
    docType === 'speaker' ? 'SPEAKER' : docType === 'protocol' ? 'PROTOKOL-DZIEKANAT' : 'CERT',
    docType === 'protocol' ? 'ALL' : member?.index,
    academicYear
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDocNumber = () => {
    navigator.clipboard.writeText(currentDocNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* ── CSS Print Styles for Exact A4 Output ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-document-container,
          #print-document-container * {
            visibility: visible !important;
          }
          #print-document-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .doc-a4-sheet {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 12mm 10mm !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
        }
      `}</style>

      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden text-slate-100 print:bg-transparent print:border-none print:shadow-none">
        
        {/* ── Modal Header & Controls (Hidden during Print) ── */}
        <div className="p-4 sm:px-6 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Award size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Generator Dokumentów & Zaświadczeń</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                  {academicYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {docType === 'protocol'
                  ? 'Zbiorczy protokół roczny z działalności koła'
                  : `Student: ${member?.fullName || member?.name || 'Wybierz członka'}`}
              </p>
            </div>
          </div>

          {/* Template Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setDocType('membership')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                docType === 'membership'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileText size={14} />
              <span>Zaświadczenie Członka</span>
            </button>

            <button
              onClick={() => setDocType('speaker')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                docType === 'speaker'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Award size={14} />
              <span>Dyplom Prelegenta</span>
            </button>

            <button
              onClick={() => setDocType('protocol')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                docType === 'protocol'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ClipboardList size={14} />
              <span>Protokół Dziekanatu</span>
            </button>
          </div>

          {/* Action Buttons: Print & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDocNumber}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Skopiuj unikalny numer dokumentu"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Skopiowano!' : 'Kopiuj Nr'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>Drukuj / Pobierz PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zamknij podgląd"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Sub-bar for Custom Settings (e.g. Speaker Topic) ── */}
        {docType === 'speaker' && (
          <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex items-center gap-3 text-xs print:hidden">
            <label className="text-slate-400 whitespace-nowrap font-medium">Temat prelekcji / wystąpienia:</label>
            <input
              type="text"
              value={presentationTopic}
              onChange={(e) => setPresentationTopic(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              placeholder="Wpisz temat prezentacji prelegenta..."
            />
          </div>
        )}

        {/* ── Live Printable Document Preview Area ── */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-950/60 flex justify-center items-start print:p-0 print:bg-transparent">
          <div id="print-document-container" className="w-full">
            {docType === 'membership' && (
              <MembershipCertificateTemplate
                member={member || (allMembers && allMembers[0]) || { fullName: 'Imię i Nazwisko Studenta', index: '00000', field: 'Psychologia' }}
                freqData={freqData || { freq: 100, present: 12, absent: 0 }}
                points={typeof points === 'number' ? points : 0}
                supervisors={supervisors}
                academicYear={academicYear}
              />
            )}

            {docType === 'speaker' && (
              <SpeakerDiplomaTemplate
                member={member || (allMembers && allMembers[0]) || { fullName: 'Imię i Nazwisko Studenta', index: '00000', field: 'Psychologia' }}
                presentationTopic={presentationTopic}
                supervisors={supervisors}
                academicYear={academicYear}
              />
            )}

            {docType === 'protocol' && (
              <AnnualReportProtocolTemplate
                members={allMembers || []}
                meetings={meetings || []}
                supervisors={supervisors}
                academicYear={academicYear}
              />
            )}
          </div>
        </div>

        {/* ── Modal Footer Info ── */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Format: Arkusz A4 gotowy do druku i bezpośredniego zapisu w PDF.</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            ID: {currentDocNumber}
          </span>
        </div>

      </div>
    </div>
  );
}
