import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Microscope,
  BookOpen,
  Award,
  Plus,
  Search,
  Printer,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Building,
  Calendar,
  Layers,
  BarChart2,
  GraduationCap,
  FileSpreadsheet,
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';

const DEFAULT_RESEARCH_SKNU = [
  {
    id: 'res_sknu_01',
    type: 'Publication',
    title: 'Profilaktyka uzależnień behawioralnych wśród młodzieży akademickiej w warunkach kształcenia zdalnego',
    authors: 'Magda Czepirska, Edyta Preobrażeńska, mgr Sławomir Pietrzak',
    venue: 'Czasopismo Psychologia i Zdrowie WSKZ (Tom 4/2026)',
    points: 40,
    year: '2026',
    link: 'https://doi.org/10.1234/wskz.2026.sknu.01',
    status: 'Opublikowane',
    description: 'Analiza czynników ryzyka oraz efektywności akademickich programów profilaktyki uzależnień od mediów cyfrowych.',
  },
  {
    id: 'res_sknu_02',
    type: 'Conference',
    title: 'Ewaluacja skuteczności rekomendowanego programu profilaktycznego "Unplugged"',
    conferenceName: 'I Ogólnopolska Konferencja Profilaktyki Uzależnień WSKZ',
    speakers: 'Igor Leśniewski, Magdalena Mosznińska, mgr Sławomir Pietrzak',
    form: 'Referat (Wystąpienie ustne)',
    date: '2026-06-20',
    link: '',
    status: 'Zrealizowane',
    description: 'Wystąpienie naukowe prezentujące metodologię wdrażania Unplugged na uczelni wyższej.',
  },
  {
    id: 'res_sknu_03',
    type: 'Project',
    title: 'Ogólnopolskie badanie zachowań ryzykownych i strategii radzenia sobie ze stresem u studentów psychologii',
    methodology: 'Kwestionariusz CAWI / Standaryzowane Skale Psychologiczne (COPE, PSS-10)',
    sampleSize: 450,
    leadResearcher: 'Zespół Badawczy SKNU (Magda Czepirska, dr Dorota Dyjakon)',
    status: 'W toku',
    description: 'Wieloośrodkowy projekt badawczy ukierunkowany na identyfikację wskaźników podatności na uzależnienia.',
  },
];

const DEFAULT_RESEARCH_SEKSUOLOGIA = [
  {
    id: 'res_seks_01',
    type: 'Publication',
    title: 'Współczesne wyzwania w diagnostyce zaburzeń pożądania seksualnego w ujęciu klasyfikacji ICD-11',
    authors: 'Tomasz Bratkowski, Ewelina Kozłowska, mgr Ewa Skupińska',
    venue: 'Przegląd Seksuologiczny WSKZ (Vol. 12/2026)',
    points: 70,
    year: '2026',
    link: 'https://doi.org/10.1234/wskz.2026.seks.01',
    status: 'Opublikowane',
    description: 'Praca przeglądowa poświęcona zmianom kryteriów diagnostycznych ICD-11 w praktyce klinicznej psychologa.',
  },
  {
    id: 'res_seks_02',
    type: 'Conference',
    title: 'Komunikacja intymna i asertywność seksualna w relacjach partnerskich',
    conferenceName: 'Ogólnopolska Konferencja Seksuologiczna „Budowanie Mostów” WSKZ',
    speakers: 'Tomasz Bratkowski, Nomin Galindev, Paula Kamzol',
    form: 'Referat (Wystąpienie ustne)',
    date: '2026-04-10',
    link: '',
    status: 'Zrealizowane',
    description: 'Referat w sekcji młodych naukowców połączony z organizacją sesji dyskusyjnej.',
  },
  {
    id: 'res_seks_03',
    type: 'Project',
    title: 'Ogólnopolskie badanie ankietowe postaw społecznych wobec edukacji seksualnej i zdrowia psychoseksualnego',
    methodology: 'Autorski kwestionariusz ankiety + analiza statystyczna SPSS',
    sampleSize: 140,
    leadResearcher: 'Zespół Badawczy Koła Seksuologii WSKZ',
    status: 'Zakończone',
    description: 'Empiryczne badanie ankietowe zrealizowane na grupie 140 respondentów.',
  },
];

export default function ResearchTab() {
  const { currentOrg, getStorageKey } = useOrg();
  const researchStorageKey = getStorageKey('research');

  // State for achievements / research items
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(researchStorageKey);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error('Błąd odczytu dorobku z storage:', e);
    }
    if (currentOrg.id === 'sknu') return DEFAULT_RESEARCH_SKNU;
    if (currentOrg.id === 'skn_seksuologii') return DEFAULT_RESEARCH_SEKSUOLOGIA;
    return [];
  });

  // Sync state when organization changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(researchStorageKey);
      if (saved !== null) {
        setItems(JSON.parse(saved));
      } else {
        const defaults = currentOrg.id === 'sknu' ? DEFAULT_RESEARCH_SKNU : (currentOrg.id === 'skn_seksuologii' ? DEFAULT_RESEARCH_SEKSUOLOGIA : []);
        setItems(defaults);
        localStorage.setItem(researchStorageKey, JSON.stringify(defaults));
      }
    } catch (e) {
      console.error('Błąd przy przełączaniu koła w dorobku:', e);
    }
  }, [currentOrg.id, researchStorageKey]);

  // Save items to localStorage
  const saveItems = (newItems) => {
    setItems(newItems);
    try {
      localStorage.setItem(researchStorageKey, JSON.stringify(newItems));
    } catch (e) {
      console.error('Błąd zapisu dorobku:', e);
    }
  };

  // UI States
  const [activeSubTab, setActiveSubTab] = useState('All'); // 'All' | 'Publication' | 'Conference' | 'Project'

  // ── Resizable Sidebar State (clamped min/max, persistent in localStorage) ──
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_research_sidebar_width');
      if (saved) return saved;
    }
    return '260px';
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarContainerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const screenWidth = window.innerWidth;
      const containerLeft = sidebarContainerRef.current ? sidebarContainerRef.current.getBoundingClientRect().left : 0;
      const newWidthPx = containerLeft > 0 ? (e.clientX - containerLeft) : e.clientX;

      const minAllowed = Math.max(200, screenWidth * 0.12);
      const maxAllowed = Math.min(420, screenWidth * 0.35);

      if (newWidthPx >= minAllowed && newWidthPx <= maxAllowed) {
        setSidebarWidth(`${newWidthPx}px`);
      } else if (newWidthPx < minAllowed) {
        setSidebarWidth(`${minAllowed}px`);
      } else if (newWidthPx > maxAllowed) {
        setSidebarWidth(`${maxAllowed}px`);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.removeProperty('user-select');
        localStorage.setItem('crm_research_sidebar_width', sidebarWidth);
      }
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Modal Form State
  const [formState, setFormState] = useState({
    type: 'Publication',
    title: '',
    authors: '',
    speakers: '',
    venue: '',
    conferenceName: '',
    form: 'Referat (Wystąpienie ustne)',
    points: 20,
    year: '2026',
    date: new Date().toISOString().split('T')[0],
    methodology: '',
    sampleSize: 100,
    leadResearcher: '',
    link: '',
    status: 'W toku',
    description: '',
  });

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalPoints = items
      .filter((i) => i.type === 'Publication')
      .reduce((acc, i) => acc + (Number(i.points) || 0), 0);
    const conferencesCount = items.filter((i) => i.type === 'Conference').length;
    const projectsCount = items.filter((i) => i.type === 'Project').length;
    const totalSample = items
      .filter((i) => i.type === 'Project')
      .reduce((acc, i) => acc + (Number(i.sampleSize) || 0), 0);

    return { totalPoints, conferencesCount, projectsCount, totalSample };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeSubTab === 'All' || item.type === activeSubTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.authors || item.speakers || item.leadResearcher || '').toLowerCase().includes(q) ||
        (item.venue || item.conferenceName || '').toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [items, activeSubTab, searchQuery]);

  // Handle open modal for new item
  const handleOpenAddModal = (type = 'Publication') => {
    setEditingItem(null);
    setFormState({
      type,
      title: '',
      authors: '',
      speakers: '',
      venue: '',
      conferenceName: '',
      form: 'Referat (Wystąpienie ustne)',
      points: 40,
      year: '2026',
      date: new Date().toISOString().split('T')[0],
      methodology: '',
      sampleSize: 100,
      leadResearcher: '',
      link: '',
      status: 'W toku',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormState({
      type: item.type || 'Publication',
      title: item.title || '',
      authors: item.authors || '',
      speakers: item.speakers || '',
      venue: item.venue || '',
      conferenceName: item.conferenceName || '',
      form: item.form || 'Referat (Wystąpienie ustne)',
      points: item.points || 0,
      year: item.year || '2026',
      date: item.date || '',
      methodology: item.methodology || '',
      sampleSize: item.sampleSize || 0,
      leadResearcher: item.leadResearcher || '',
      link: item.link || '',
      status: item.status || 'W toku',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      alert('Wpisz tytuł osiągnięcia / projektu!');
      return;
    }

    if (editingItem) {
      const updated = items.map((i) => (i.id === editingItem.id ? { ...i, ...formState } : i));
      saveItems(updated);
    } else {
      const newItem = {
        id: `res_${Date.now()}`,
        ...formState,
      };
      saveItems([newItem, ...items]);
    }
    setIsModalOpen(false);
  };

  // Handle Delete
  const handleDeleteItem = (id) => {
    if (confirm('Czy na pewno chcesz usunąć tę pozycję z dorobku naukowego?')) {
      const updated = items.filter((i) => i.id !== id);
      saveItems(updated);
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-12 font-sans animate-in fade-in duration-200 print:p-0 print:space-y-4">
      {/* ── HEADER BAR ────────────────────────────────────────────────────────── */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl text-white shadow-xs">
            <Microscope size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Dorobek Naukowy & Projekty Badawcze
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {currentOrg.shortName || currentOrg.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rejestracja publikacji, referatów konferencyjnych i projektów badawczych dla Dziekanatu i PKA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Czy na pewno chcesz wyczyścić cały dorobek naukowy dla tej instancji?')) {
                  saveItems([]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Wyczyść wszystkie wpisy dorobku"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Wyczyść listę</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Drukuj Wykaz (PDF)</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('Publication')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Dodaj Osiągnięcie</span>
          </button>
        </div>
      </div>

      {/* ── PRINT-ONLY REPORT HEADER ──────────────────────────────────────────── */}
      <div className="hidden print:block bg-white p-6 border-b-2 border-slate-900 mb-4 text-center font-sans">
        <h1 className="text-lg font-bold uppercase tracking-tight text-slate-950">
          WYŻSZA SZKOŁA KSZTAŁCENIA ZAWODOWEGO • {currentOrg.unit?.toUpperCase()}
        </h1>
        <h2 className="text-xl font-extrabold text-indigo-950 uppercase mt-1">
          OFICJALNY REJESTR DOROBKU NAUKOWEGO I PROJEKTÓW BADAWCZYCH
        </h2>
        <p className="text-xs text-slate-600 font-semibold mt-1">
          {currentOrg.name} • Rok Akademicki 2025/2026
        </p>
      </div>

      {/* ── TWO-COLUMN MASTER-DETAIL LAYOUT WITH RESIZABLE SIDEBAR ──────────── */}
      <div className="flex flex-col lg:flex-row items-stretch gap-0 w-full min-h-[calc(100vh-230px)]">
        
        {/* ── LEFT SIDEBAR: PIONOWY PANEL PODSUMOWAŃ I NAWIGACJI ─────────────── */}
        <div
          ref={sidebarContainerRef}
          className="w-full lg:shrink-0 flex flex-col space-y-3 pr-0 lg:pr-3 pb-4 lg:pb-0 print:hidden"
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : '100%' }}
        >
          {/* Section Header */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Dorobek Naukowy & Badania SKN
            </div>

            {/* Vertical Stats / Quick Filters */}
            <div className="space-y-1.5">
              {/* All Items Pill */}
              <button
                type="button"
                onClick={() => setActiveSubTab('All')}
                className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                  activeSubTab === 'All'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={15} className={activeSubTab === 'All' ? 'text-emerald-400' : 'text-slate-500'} />
                  <span>Wszystkie osiągnięcia</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeSubTab === 'All' ? 'bg-slate-800 text-emerald-200' : 'bg-white text-slate-700 border border-slate-200'
                }`}>
                  {items.length}
                </span>
              </button>

              {/* 1. Publikacje naukowe */}
              <button
                type="button"
                onClick={() => setActiveSubTab('Publication')}
                className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer text-left ${
                  activeSubTab === 'Publication'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : 'bg-purple-50/50 hover:bg-purple-100/60 text-purple-900 border border-purple-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${activeSubTab === 'Publication' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Publikacje naukowe</span>
                    <span className={`text-[10.5px] ${activeSubTab === 'Publication' ? 'text-purple-100' : 'text-purple-600'}`}>
                      Artykuły i monografie
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                  activeSubTab === 'Publication' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-800'
                }`}>
                  {items.filter((i) => i.type === 'Publication').length}
                </span>
              </button>

              {/* 2. Wystąpienia & Referaty */}
              <button
                type="button"
                onClick={() => setActiveSubTab('Conference')}
                className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer text-left ${
                  activeSubTab === 'Conference'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 border border-amber-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${activeSubTab === 'Conference' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    <Award size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Wystąpienia & Referaty</span>
                    <span className={`text-[10.5px] ${activeSubTab === 'Conference' ? 'text-amber-100' : 'text-amber-600'}`}>
                      Konferencje i sympozja
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                  activeSubTab === 'Conference' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {metrics.conferencesCount}
                </span>
              </button>

              {/* 3. Projekty badawcze */}
              <button
                type="button"
                onClick={() => setActiveSubTab('Project')}
                className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer text-left ${
                  activeSubTab === 'Project'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-blue-50/50 hover:bg-blue-100/60 text-blue-900 border border-blue-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${activeSubTab === 'Project' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    <BarChart2 size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Projekty badawcze</span>
                    <span className={`text-[10.5px] ${activeSubTab === 'Project' ? 'text-blue-100' : 'text-blue-600'}`}>
                      Badania empiryczne
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                  activeSubTab === 'Project' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {metrics.projectsCount}
                </span>
              </button>

              {/* 4. Łączne punkty MEiN / MNiSW */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">Łączne Punkty MEiN</span>
                    <span className="text-xs text-emerald-600 font-semibold">Ewaluacja dorobku</span>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-emerald-800 font-mono">
                  {metrics.totalPoints} pkt
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RESIZER HANDLE ──────────────────────────────────────────────────── */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className={`hidden lg:flex items-center justify-center w-[5px] shrink-0 cursor-col-resize select-none z-10 transition-colors duration-150 self-stretch my-0.5 rounded-full group print:hidden ${
            isResizing
              ? 'bg-emerald-500 shadow-xs'
              : 'hover:bg-emerald-400 bg-transparent hover:shadow-xs'
          }`}
          style={{
            width: '5px',
            cursor: 'col-resize',
            backgroundColor: isResizing ? '#10b981' : 'transparent',
            transition: 'background-color 0.15s ease',
            flexShrink: 0,
            userSelect: 'none',
            zIndex: 10,
          }}
          title="Przeciągnij krawędź, aby dostosować szerokość panelu bocznego"
        >
          <div className={`w-[1px] h-8 rounded-full transition-colors ${
            isResizing ? 'bg-white' : 'bg-slate-300 group-hover:bg-emerald-200'
          }`} />
        </div>

        {/* ── RIGHT MAIN WORKSPACE: REJESTR DOROBKU ────────────────────────────── */}
        <div className="flex-1 min-w-0 w-full pl-0 lg:pl-3 space-y-3 print:pl-0">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:border-none print:shadow-none print:p-0">
            
            {/* Top Toolbar (Filters, Search, Actions) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 print:hidden">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('All')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeSubTab === 'All'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Wszystkie ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('Publication')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeSubTab === 'Publication'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-100'
                  }`}
                >
                  Publikacje ({items.filter((i) => i.type === 'Publication').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('Conference')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeSubTab === 'Conference'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-100'
                  }`}
                >
                  Konferencje ({metrics.conferencesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('Project')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeSubTab === 'Project'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-100'
                  }`}
                >
                  Projekty Badawcze ({metrics.projectsCount})
                </button>
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-2 flex-1 lg:max-w-md justify-end">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj po tytule, autorze..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddModal('Publication')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:shadow-md transition cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>+ Dodaj</span>
                </button>
              </div>
            </div>

            {/* Full Items List / Table */}
            <div className="space-y-2.5 pt-1">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                  Brak pozycji dorobku naukowego w wybranym filtrze.
                </div>
              ) : (
                filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 print:border-slate-300 print:shadow-none print:py-2"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>

                        {item.type === 'Publication' && (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            📚 Publikacja
                          </span>
                        )}

                        {item.type === 'Conference' && (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            🎤 Referat / Konferencja
                          </span>
                        )}

                        {item.type === 'Project' && (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🔬 Projekt Badawczy
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {item.status}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-snug">
                        {item.title}
                      </h3>

                      {/* Context Details */}
                      <div className="text-[11.5px] text-slate-600 space-y-0.5">
                        {item.type === 'Publication' && (
                          <p>
                            <strong>Autorzy:</strong> {item.authors} • <strong>Wydawnictwo/Czasopismo:</strong>{' '}
                            {item.venue} ({item.year}) •{' '}
                            <strong className="text-purple-700">{item.points} pkt MEiN</strong>
                          </p>
                        )}

                        {item.type === 'Conference' && (
                          <p>
                            <strong>Prelegenci:</strong> {item.speakers || item.authors} •{' '}
                            <strong>Konferencja:</strong> {item.conferenceName} ({item.date}) •{' '}
                            <span className="font-semibold text-amber-800">{item.form}</span>
                          </p>
                        )}

                        {item.type === 'Project' && (
                          <p>
                            <strong>Kierownik / Zespół:</strong> {item.leadResearcher || item.authors} •{' '}
                            <strong>Metodologia:</strong> {item.methodology} •{' '}
                            <strong className="text-blue-700">Próba N = {item.sampleSize}</strong>
                          </p>
                        )}

                        {item.description && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 print:hidden">
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>DOI / Link</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Edytuj pozycję"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Usuń pozycję"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT RESEARCH ITEM ──────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Microscope size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {editingItem ? 'Edycja Dorobku Naukowego' : 'Nowe Osiągnięcie / Projekt'}
                  </h3>
                  <p className="text-[11px] text-slate-400">{currentOrg.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Typ Osiągnięcia:</label>
                <select
                  value={formState.type}
                  onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-emerald-500"
                >
                  <option value="Publication">📚 Publikacja Naukowo-Dydaktyczna</option>
                  <option value="Conference">🎤 Wystąpienie Konferencyjne</option>
                  <option value="Project">🔬 Projekt Badawczo-Ankietowy</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tytuł Osiągnięcia / Projektu:</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="Wpisz pełny tytuł artykułu, referatu lub badania..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {formState.type === 'Publication' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Autorzy:</label>
                      <input
                        type="text"
                        value={formState.authors}
                        onChange={(e) => setFormState({ ...formState, authors: e.target.value })}
                        placeholder="np. Jan Kowalski, Anna Nowak"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Punkty MEiN:</label>
                      <input
                        type="number"
                        value={formState.points}
                        onChange={(e) => setFormState({ ...formState, points: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Czasopismo / Wydawnictwo:</label>
                    <input
                      type="text"
                      value={formState.venue}
                      onChange={(e) => setFormState({ ...formState, venue: e.target.value })}
                      placeholder="np. Przegląd Seksuologiczny WSKZ (Vol. 12/2026)"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {formState.type === 'Conference' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Prelegenci:</label>
                      <input
                        type="text"
                        value={formState.speakers}
                        onChange={(e) => setFormState({ ...formState, speakers: e.target.value })}
                        placeholder="np. Jan Kowalski, Anna Nowak"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Forma wystąpienia:</label>
                      <select
                        value={formState.form}
                        onChange={(e) => setFormState({ ...formState, form: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Referat (Wystąpienie ustne)">🎤 Referat (Wystąpienie ustne)</option>
                        <option value="Poster (Sesja plakatowa)">🖼️ Poster (Sesja plakatowa)</option>
                        <option value="Warsztat Naukowy">🛠️ Warsztat Naukowy</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nazwa Konferencji:</label>
                    <input
                      type="text"
                      value={formState.conferenceName}
                      onChange={(e) => setFormState({ ...formState, conferenceName: e.target.value })}
                      placeholder="np. I Ogólnopolska Konferencja Profilaktyki Uzależnień WSKZ"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {formState.type === 'Project' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Kierownik / Zespół:</label>
                      <input
                        type="text"
                        value={formState.leadResearcher}
                        onChange={(e) => setFormState({ ...formState, leadResearcher: e.target.value })}
                        placeholder="np. Zespół Badawczy SKNU"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Liczebność próby (N):</label>
                      <input
                        type="number"
                        value={formState.sampleSize}
                        onChange={(e) => setFormState({ ...formState, sampleSize: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Metodologia / Narzędzia:</label>
                    <input
                      type="text"
                      value={formState.methodology}
                      onChange={(e) => setFormState({ ...formState, methodology: e.target.value })}
                      placeholder="np. Ankieta CAWI, Skala PSS-10, Analiza SPSS"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status Realizacji:</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="W toku">🟡 W toku</option>
                    <option value="Zakończone">🟢 Zakończone</option>
                    <option value="Opublikowane">🟣 Opublikowane</option>
                    <option value="W recenzji">⚪ W recenzji</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Link DOI / Publikacja:</label>
                  <input
                    type="url"
                    value={formState.link}
                    onChange={(e) => setFormState({ ...formState, link: e.target.value })}
                    placeholder="https://doi.org/10.1234/..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Opis / Notatka:</label>
                <textarea
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Krótki opis celu naukowego i wniosków..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-sans resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Zapisz Osiągnięcie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
