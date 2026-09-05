import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = loginWithCredentials(email.trim(), password);
      if (!res.success) {
        setError(res.error || 'Błąd uwierzytelniania. Sprawdź wprowadzone dane.');
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd podczas logowania.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Psycho2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      
      {/* Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Brand & Organization Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-semibold backdrop-blur-md shadow-inner">
            <span className="text-base leading-none">🎗️</span>
            <span>Studenckie Koło Naukowe Psychoonkologii WSKZ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            System Ewidencji & CRM
          </h1>
          <p className="text-xs text-purple-200/70 max-w-xs mx-auto leading-relaxed">
            Dostęp autoryzowany wyłącznie dla członków zarządu, opiekunów naukowych oraz uprawnionych koordynatorów.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-900 space-y-5">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Autoryzacja Dostępowa</h2>
                <p className="text-[11px] text-slate-500">Wprowadź swoje dane, aby odblokować panel</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              2026/2027
            </span>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <p className="font-bold">Odmowa dostępu</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-700">
                Adres e-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="np. zarzad.psychoonkologia@wskz.pl"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                  Hasło dostępowe
                </label>
              </div>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wprowadź hasło koła..."
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition font-medium text-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? (
                <span>Weryfikacja uprawnień…</span>
              ) : (
                <>
                  <span>Zaloguj do systemu CRM</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Helper for Board & Supervisors */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Szybki wybór profilu z bazy uprawnień:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('zarzad.psychoonkologia@wskz.pl')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200/80 text-left transition cursor-pointer group"
              >
                <p className="text-[11px] font-bold text-slate-700 group-hover:text-purple-900 truncate">Zarząd Koła</p>
                <p className="text-[9.5px] text-slate-400 truncate font-mono">zarzad.psychoonkologia@wskz.pl</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('opiekun.psychoonkologia@wskz.pl')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200/80 text-left transition cursor-pointer group"
              >
                <p className="text-[11px] font-bold text-slate-700 group-hover:text-purple-900 truncate">Opiekun Naukowy</p>
                <p className="text-[9.5px] text-slate-400 truncate font-mono">opiekun.psychoonkologia@wskz.pl</p>
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-purple-200/50 space-y-1">
          <p>Instytut Psychologii WSKZ • Bezpieczne połączenie szyfrowane</p>
          <p className="text-[10px]">W razie trudności z logowaniem zgłoś się do administratora systemu.</p>
        </div>

      </div>
    </div>
  );
}
