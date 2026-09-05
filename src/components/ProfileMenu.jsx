import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  Building2,
  Settings,
  LogOut,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  UserCheck,
  Check,
} from 'lucide-react';
import { useAuth, ROLES, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';

export default function ProfileMenu({ onOpenSettings }) {
  const { user, isSuperAdmin, canAccessOrg, switchDemoAccount, logout } = useAuth();
  const { currentOrg, organizations, switchOrg } = useOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) {
    return (
      <button
        onClick={() => switchDemoAccount(DEMO_ACCOUNTS[0])}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
      >
        <User size={13} />
        <span>Zaloguj przez Google</span>
      </button>
    );
  }

  const roleConfig = ROLES[user.role] || ROLES.VIEWER;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // Filter organizations accessible by this user
  const accessibleOrganizations = organizations.filter(org => canAccessOrg(org.id));

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer group"
      >
        {/* Avatar / Initials */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Name */}
        <div className="text-left hidden sm:block min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate max-w-[130px]">
              {user.name}
            </span>
          </div>
        </div>

        <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 transition shrink-0 ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          
          {/* User Info Header Card */}
          <div className="p-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{user.name}</p>
                <p className="text-[11px] text-slate-300 font-mono truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Section 1: Active Organization Selector */}
          <div className="space-y-1 mb-2">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 size={11} className="text-indigo-600" />
                <span>Aktywne Koło Naukowe</span>
              </span>
              <span className="text-[9px] font-medium text-slate-400">
                {accessibleOrganizations.length} dostępne
              </span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {accessibleOrganizations.map(org => {
                const isSelected = org.id === currentOrg.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrg(org.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:border-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold">{org.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{org.tag || 'WSKZ'}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={15} className="text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Section 2: Super-Admin Settings */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenSettings) onOpenSettings();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
            >
              <Settings size={14} className="text-indigo-600" />
              <span>Konfiguracja Koła & Arkusze Google</span>
            </button>
          )}

          {/* Section 3: Demo Persona Switcher (Allows live testing) */}
          <div className="py-1">
            <button
              onClick={() => setShowDemoSelector(prev => !prev)}
              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span>Przełącz profil demonstracyjny</span>
              </span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${showDemoSelector ? 'rotate-180' : ''}`} />
            </button>

            {showDemoSelector && (
              <div className="p-1.5 bg-slate-50 rounded-2xl mt-1 space-y-1 border border-slate-200/60">
                {DEMO_ACCOUNTS.map(acc => {
                  const isCurrent = user.email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      onClick={() => {
                        switchDemoAccount(acc);
                        setShowDemoSelector(false);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-[11px] transition cursor-pointer ${
                        isCurrent
                          ? 'bg-white font-bold text-indigo-700 shadow-2xs border border-indigo-100'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">{acc.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{acc.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Section 4: Logout */}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <LogOut size={14} />
            <span>Wyloguj</span>
          </button>

        </div>
      )}
    </div>
  );
}
