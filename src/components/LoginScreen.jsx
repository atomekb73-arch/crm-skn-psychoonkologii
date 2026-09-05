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
  CheckCircle2,
  Key,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { loginWithCredentials, changePassword } = useAuth();

  // Step state: 'login' | 'change_password'
  const [step, setStep] = useState('login');

  // Step 1: Login state - explicitly empty
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 2: First-time password change state
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changeError, setChangeError] = useState(null);
  const [changeLoading, setChangeLoading] = useState(false);

  // Validation rules for new password
  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isNotStarterPassword =
    newPassword.length > 0 &&
    newPassword !== 'Psycho2026!' &&
    newPassword !== 'Psychoonkologia2026!' &&
    newPassword !== 'wskz2026' &&
    newPassword !== 'skn2026';
  const isFormValid = hasMinLength && passwordsMatch && isNotStarterPassword;

  // Handle standard login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = loginWithCredentials(email.trim(), password);
      if (res.requiresPasswordChange) {
        setPendingEmail(email.trim().toLowerCase());
        setPendingUser(res.user);
        setStep('change_password');
        setPassword('');
        setError(null);
      } else if (!res.success) {
        setError(res.error || 'Błąd uwierzytelniania. Sprawdź wprowadzone dane.');
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd podczas logowania.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change submit on first login
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeError(null);

    if (!hasMinLength) {
      setChangeError('Hasło musi zawierać co najmniej 8 znaków.');
      return;
    }
    if (!passwordsMatch) {
      setChangeError('Podane hasła nie są identyczne.');
      return;
    }
    if (!isNotStarterPassword) {
      setChangeError('Nowe hasło nie może być hasłem startowym. Wybierz własne unikalne hasło.');
      return;
    }

    setChangeLoading(true);
    try {
      const res = changePassword(pendingEmail, newPassword, confirmPassword, pendingUser);
      if (!res.success) {
        setChangeError(res.error || 'Nie udało się zapisać nowego hasła.');
      }
      // On success, AuthContext automatically sets user & isAuthenticated = true, redirecting into CRM
    } catch (err) {
      setChangeError('Wystąpił nieoczekiwany błąd podczas zapisu hasła.');
    } finally {
      setChangeLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setNewPassword('');
    setConfirmPassword('');
    setChangeError(null);
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

        {/* Dynamic Card Container */}
        {step === 'login' ? (
          /* STEP 1: LOGIN FORM */
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-900 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
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
            <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
              
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
                    autoComplete="off"
                    spellCheck="false"
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
                    autoComplete="new-password"
                    spellCheck="false"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wprowadź hasło koła lub hasło startowe..."
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

          </div>
        ) : (
          /* STEP 2: FORCED PASSWORD CHANGE ON FIRST LOGIN */
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-900 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Ustaw nowe hasło</h2>
                  <p className="text-[11px] text-slate-500">Wymagane przy pierwszym logowaniu do koła</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                1. wejście
              </span>
            </div>

            {/* Account Pill */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span className="text-xs font-mono font-medium text-slate-700">{pendingEmail}</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                Konto autoryzowane
              </span>
            </div>

            {/* Change Error Notice */}
            {changeError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-bold">Błąd walidacji hasła</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">{changeError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleChangePasswordSubmit} autoComplete="off" className="space-y-4">
              
              {/* New Password field */}
              <div className="space-y-1.5">
                <label htmlFor="change-new-password" className="block text-xs font-bold text-slate-700">
                  Nowe hasło
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="change-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    spellCheck="false"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Wprowadź minimum 8 znaków..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition font-medium text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-1.5">
                <label htmlFor="change-confirm-password" className="block text-xs font-bold text-slate-700">
                  Powtórz nowe hasło
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="change-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    spellCheck="false"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Wpisz ponownie to samo hasło..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition font-medium text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Real-time Checklist */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-300" />
                  )}
                  <span className={hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                    Co najmniej 8 znaków
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-300" />
                  )}
                  <span className={passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                    Hasła są identyczne
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isNotStarterPassword ? (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-300" />
                  )}
                  <span className={isNotStarterPassword ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                    Różne od hasła startowego
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={changeLoading || !isFormValid}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {changeLoading ? (
                  <span>Zapisywanie nowego hasła…</span>
                ) : (
                  <>
                    <span>Zapisz hasło i wejdź do CRM</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {/* Back to login button */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Wróć do logowania</span>
              </button>
            </form>

          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-[11px] text-purple-200/50 space-y-1">
          <p>Instytut Psychologii WSKZ • Bezpieczne połączenie szyfrowane</p>
          <p className="text-[10px]">W razie trudności z logowaniem zgłoś się do administratora systemu.</p>
        </div>

      </div>
    </div>
  );
}
