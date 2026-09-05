import React from 'react';
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
}) {
  // Check if main tab is active, considering legacy tab ID aliases
  const isMainTabActive = (tab) => {
    if (activeTab === tab.id) return true;
    if (tab.aliases && tab.aliases.includes(activeTab)) return true;
    return false;
  };

  // Safe handler for main tab click
  const handleMainTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'members' && !membersSubTab) setMembersSubTab('management');
    if (tabId === 'documentation' && !documentationSubTab) setDocumentationSubTab('reports');
    if (tabId === 'settings_tools' && !settingsToolsSubTab) setSettingsToolsSubTab('settings');
  };

  // Determine current active main tab for rendering sub-bars
  const currentTab = activeTab === 'management' || activeTab === 'quarantine' ? 'members'
    : activeTab === 'reports' || activeTab === 'documents' || activeTab === 'repository' ? 'documentation'
    : activeTab === 'settings' || activeTab === 'tools' ? 'settings_tools'
    : activeTab;

  return (
    <div className="space-y-3 print:hidden">
      {/* ── Main 5 Condensed Navigation Bar ───────────────────────────────── */}
      <div className="w-full flex items-center gap-1.5 justify-start overflow-x-auto py-1 px-2 bg-slate-100/80 rounded-2xl border border-slate-200/60">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = isMainTabActive(tab);
          return (
            <button
              key={tab.id}
              onClick={() => handleMainTabClick(tab.id)}
              className={`flex items-center gap-2 text-xs md:text-sm font-medium px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>

              {/* Quarantine / Pending Count Badge on Członkowie tab */}
              {tab.id === 'members' && pendingCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold shadow-xs transition-colors ${
                  isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sub-Navigation Bars per Main Tab ──────────────────────────────── */}

      {/* Sub-bar for Członkowie */}
      {currentTab === 'members' && (
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl w-fit border border-slate-200/80 animate-in fade-in duration-150">
          <button
            onClick={() => {
              setActiveTab('members');
              setMembersSubTab('management');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              membersSubTab === 'management' || activeTab === 'management'
                ? 'bg-white text-indigo-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Users size={13} className={membersSubTab === 'management' || activeTab === 'management' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Główna lista członków</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('members');
              setMembersSubTab('quarantine');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              membersSubTab === 'quarantine' || activeTab === 'quarantine'
                ? 'bg-white text-amber-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <ShieldAlert size={13} className={membersSubTab === 'quarantine' || activeTab === 'quarantine' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Kwarantanna & Zgłoszenia</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Sub-bar for Dokumentacja */}
      {currentTab === 'documentation' && (
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl w-fit border border-slate-200/80 animate-in fade-in duration-150">
          <button
            onClick={() => {
              setActiveTab('documentation');
              setDocumentationSubTab('reports');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              documentationSubTab === 'reports' || activeTab === 'reports'
                ? 'bg-white text-indigo-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <FileText size={13} className={documentationSubTab === 'reports' || activeTab === 'reports' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Certyfikaty & Sprawozdania</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('documentation');
              setDocumentationSubTab('documents');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              documentationSubTab === 'documents' || activeTab === 'documents' || activeTab === 'repository'
                ? 'bg-white text-indigo-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <FolderKanban size={13} className={documentationSubTab === 'documents' || activeTab === 'documents' || activeTab === 'repository' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Rejestr Uchwał & Statut</span>
          </button>
        </div>
      )}

      {/* Sub-bar for Ustawienia & Narzędzia */}
      {currentTab === 'settings_tools' && (
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl w-fit border border-slate-200/80 animate-in fade-in duration-150">
          <button
            onClick={() => {
              setActiveTab('settings_tools');
              setSettingsToolsSubTab('settings');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              settingsToolsSubTab === 'settings' || activeTab === 'settings'
                ? 'bg-white text-indigo-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Settings size={13} className={settingsToolsSubTab === 'settings' || activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Konfiguracja Koła</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('settings_tools');
              setSettingsToolsSubTab('tools');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              settingsToolsSubTab === 'tools' || activeTab === 'tools'
                ? 'bg-white text-indigo-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Wrench size={13} className={settingsToolsSubTab === 'tools' || activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Narzędzia & Mailing</span>
          </button>
        </div>
      )}
    </div>
  );
}
