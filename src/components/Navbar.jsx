import React, { startTransition } from 'react';

const safeStartTransition = (fn) => {
  if (typeof startTransition === 'function') {
    startTransition(fn);
  } else if (typeof React !== 'undefined' && typeof React.startTransition === 'function') {
    React.startTransition(fn);
  } else {
    fn();
  }
};
import {
  Users,
  Calendar,
  FileText,
  GraduationCap,
  Microscope,
  Settings,
  ShieldAlert,
  FolderKanban,
  Wrench,
  Sparkles,
  FolderOpen,
} from 'lucide-react';

const ResearchIcon = Microscope || GraduationCap;

export const MAIN_TABS = [
  { id: 'members',       label: 'Członkowie',            icon: Users,        aliases: ['management', 'quarantine'] },
  { id: 'meetings',      label: 'Spotkania',             icon: Calendar,     aliases: [] },
  { id: 'documentation', label: 'Dokumentacja',          icon: FileText,     aliases: ['reports', 'documents', 'repository'] },
  { id: 'research',      label: 'Dorobek & Badania',    icon: ResearchIcon, aliases: [] },
  { id: 'settings_tools',label: 'Ustawienia & Narzędzia',icon: Settings,     aliases: ['settings', 'tools'] },
];

export default function Navbar({
  activeTab = 'members',
  setActiveTab = () => {},
  pendingCount = 0,
  membersSubTab = 'management',
  setMembersSubTab = () => {},
  documentationSubTab = 'reports',
  setDocumentationSubTab = () => {},
  settingsToolsSubTab = 'settings',
  setSettingsToolsSubTab = () => {},
  membersMetrics = null,
}) {
  // Check if main tab is active, considering legacy tab ID aliases
  const isMainTabActive = (tab) => {
    if (activeTab === tab.id) return true;
    if (tab.aliases && tab.aliases.includes(activeTab)) return true;
    return false;
  };

  // Safe handler for main tab click
  const handleMainTabClick = (tabId) => {
    safeStartTransition(() => {
      setActiveTab(tabId);
      if (tabId === 'members') setMembersSubTab('management');
      if (tabId === 'documentation' && !documentationSubTab) setDocumentationSubTab('reports');
      if (tabId === 'settings_tools' && !settingsToolsSubTab) setSettingsToolsSubTab('settings');
    });
  };

  // Determine current active main tab for rendering sub-bars
  const currentTab = activeTab === 'management' || activeTab === 'quarantine' ? 'members'
    : activeTab === 'reports' || activeTab === 'documents' || activeTab === 'repository' ? 'documentation'
    : activeTab === 'settings' || activeTab === 'tools' ? 'settings_tools'
    : activeTab;

  return (
    <div className="space-y-3 print:hidden">
      {/* ── Main 5 Condensed Navigation Bar ───────────────────────────────── */}
      <div className="w-full flex items-center gap-1.5 justify-start overflow-x-auto h-12 min-h-[48px] px-2 bg-slate-200 border border-slate-300 rounded-2xl shadow-xs shrink-0">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = isMainTabActive(tab);
          return (
            <button
              key={tab.id}
              onClick={() => handleMainTabClick(tab.id)}
              className={`flex items-center gap-2 text-xs md:text-sm px-3.5 py-2 rounded-xl transition-colors duration-150 whitespace-nowrap cursor-pointer font-semibold ${
                isActive
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/70'
              }`}
            >
              <Icon size={16} className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Sub-Navigation Bars per Main Tab ──────────────────────────────── */}

      {/* Sub-bar for Członkowie with inline compact metrics */}
      {currentTab === 'members' && (
        <div className="flex items-center justify-between gap-3 w-full flex-wrap xl:flex-nowrap animate-in fade-in duration-150 h-10 min-h-[40px]">
          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl w-fit border border-slate-300 shadow-2xs shrink-0 h-10 min-h-[40px]">
            <button
              onClick={() => {
                safeStartTransition(() => {
                  setActiveTab('members');
                  setMembersSubTab('management');
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
                membersSubTab === 'management' || activeTab === 'management'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
              }`}
            >
              <Users size={13} className={`w-3.5 h-3.5 shrink-0 ${membersSubTab === 'management' || activeTab === 'management' ? 'text-indigo-600' : 'text-slate-600'}`} />
              <span>Główna lista członków</span>
            </button>

            <button
              onClick={() => {
                safeStartTransition(() => {
                  setActiveTab('members');
                  setMembersSubTab('quarantine');
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
                membersSubTab === 'quarantine' || activeTab === 'quarantine'
                  ? 'bg-white text-amber-950 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
              }`}
            >
              <ShieldAlert size={13} className={`w-3.5 h-3.5 shrink-0 ${membersSubTab === 'quarantine' || activeTab === 'quarantine' ? 'text-amber-600' : 'text-slate-600'}`} />
              <span>Kwarantanna & Zgłoszenia</span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[11px] font-semibold leading-none text-white bg-amber-500 rounded-full select-none translate-y-[1px]">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* Compact 4 Metric Badges in single row */}
          {membersMetrics && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 ml-auto h-9 min-h-[36px]">
              {/* 1) Aktywni */}
              <div className="bg-slate-100/90 border border-slate-300 rounded-xl px-2.5 py-1 flex items-center gap-1.5 h-9 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-xs text-slate-900 font-mono">{membersMetrics.activeCount}</span>
                <span className="text-slate-800 font-semibold text-[11px] whitespace-nowrap">Aktywni członkowie</span>
              </div>

              {/* 2) Frekwencja */}
              <div className="bg-slate-100/90 border border-slate-300 rounded-xl px-2.5 py-1 flex items-center gap-1.5 h-9 shadow-2xs">
                <span className="font-bold text-xs text-slate-900 font-mono">{isNaN(membersMetrics.avgFreq) ? 0 : membersMetrics.avgFreq}%</span>
                <span className="text-slate-800 font-semibold text-[11px] whitespace-nowrap">Średnia frekwencja</span>
              </div>

              {/* 3) Zaświadczenia */}
              <div className="bg-slate-100/90 border border-slate-300 rounded-xl px-2.5 py-1 flex items-center gap-1.5 h-9 shadow-2xs">
                <span className="font-bold text-xs text-slate-900 font-mono">{membersMetrics.certReady}</span>
                <span className="text-slate-800 font-semibold text-[11px] whitespace-nowrap">Gotowe zaświadczenia</span>
              </div>

              {/* 4) Mailing */}
              <div className="bg-slate-100/90 border border-slate-300 rounded-xl px-2.5 py-1 flex items-center gap-1.5 h-9 shadow-2xs">
                <span className="font-bold text-xs text-slate-900 font-mono">{membersMetrics.mailingConsentsCount}</span>
                <span className="text-slate-800 font-semibold text-[11px] whitespace-nowrap">Zgody na mailing</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-bar for Dokumentacja */}
      {currentTab === 'documentation' && (
        <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl w-fit border border-slate-300 shadow-2xs animate-in fade-in duration-150 h-10 min-h-[40px] shrink-0">
          <button
            onClick={() => {
              safeStartTransition(() => {
                setActiveTab('documentation');
                setDocumentationSubTab('reports');
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
              documentationSubTab === 'reports' || activeTab === 'reports'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
            }`}
          >
            <FileText size={13} className={`w-3.5 h-3.5 shrink-0 ${documentationSubTab === 'reports' || activeTab === 'reports' ? 'text-indigo-600' : 'text-slate-600'}`} />
            <span>Certyfikaty & Sprawozdania</span>
          </button>

          <button
            onClick={() => {
              safeStartTransition(() => {
                setActiveTab('documentation');
                setDocumentationSubTab('documents');
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
              documentationSubTab === 'documents' || activeTab === 'documents' || activeTab === 'repository'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
            }`}
          >
            <FolderKanban size={13} className={`w-3.5 h-3.5 shrink-0 ${documentationSubTab === 'documents' || activeTab === 'documents' || activeTab === 'repository' ? 'text-indigo-600' : 'text-slate-600'}`} />
            <span>Rejestr Uchwał & Statut</span>
          </button>
        </div>
      )}

      {/* Sub-bar for Ustawienia & Narzędzia */}
      {currentTab === 'settings_tools' && (
        <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl w-fit border border-slate-300 shadow-2xs animate-in fade-in duration-150 h-10 min-h-[40px] shrink-0">
          <button
            onClick={() => {
              safeStartTransition(() => {
                setActiveTab('settings_tools');
                setSettingsToolsSubTab('settings');
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
              settingsToolsSubTab === 'settings' || activeTab === 'settings'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
            }`}
          >
            <Settings size={13} className={`w-3.5 h-3.5 shrink-0 ${settingsToolsSubTab === 'settings' || activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-600'}`} />
            <span>Konfiguracja Koła</span>
          </button>

          <button
            onClick={() => {
              safeStartTransition(() => {
                setActiveTab('settings_tools');
                setSettingsToolsSubTab('tools');
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
              settingsToolsSubTab === 'tools' || activeTab === 'tools'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
            }`}
          >
            <Wrench size={13} className={`w-3.5 h-3.5 shrink-0 ${settingsToolsSubTab === 'tools' || activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-600'}`} />
            <span>Narzędzia & Mailing</span>
          </button>
        </div>
      )}
    </div>
  );
}
