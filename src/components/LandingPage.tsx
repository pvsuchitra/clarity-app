import React, { useState } from 'react';
import { signInWithGoogle } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Feather, Compass, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#24211E] dark:bg-[#181716] dark:text-[#E8E4DF] transition-colors flex flex-col justify-between selection:bg-[#EAE2D5] dark:selection:bg-[#3D3732]">
      {/* Top Bar */}
      <header className="max-w-5xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5 select-none">
          <Logo size={44} className="shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="font-serif-journal text-2xl font-semibold tracking-tight text-[#3E342B] dark:text-[#FAF7F2] leading-none">
              Clarity
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#6E645A] dark:text-[#A89F95] font-sans-ui font-light tracking-wide leading-none mt-1">
              A quiet space to think
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-[#6E645A] dark:text-[#A89F95] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Journal Centerpiece */}
      <main className="max-w-3xl w-full mx-auto px-6 py-12 flex flex-col items-center text-center">
        {/* Paper Card Frame */}
        <div className="w-full bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#E2D8C8] dark:border-[#2F2A26] rounded-2xl p-8 sm:p-14 shadow-sm relative overflow-hidden">
          {/* Subtle paper line watermark accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C2B29F]/40 dark:via-[#5A5046]/40 to-transparent" />

          {/* Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-sans-ui font-medium bg-[#EAE2D5] text-[#5C4D3E] dark:bg-[#2D2824] dark:text-[#C5B7A8] mb-6">
            <Feather className="w-3.5 h-3.5" />
            <span>A guided space to think, powered by Gemini</span>
          </div>

          {/* Primary Statement */}
          <h1 className="font-serif-journal text-3xl sm:text-5xl font-medium tracking-tight leading-tight text-[#24211E] dark:text-[#FAF7F2] mb-6">
            What’s on your mind?
            <span className="block mt-2 italic font-normal text-xl sm:text-3xl text-[#6B5D4E] dark:text-[#BDB0A2]">
              You don’t need to have it figured out. Start wherever you are.
            </span>
          </h1>

          <p className="font-serif-journal text-lg sm:text-xl text-[#5A4F44] dark:text-[#B8ACA0] leading-relaxed max-w-xl mx-auto mb-10">
            When your thoughts aren&apos;t clear, even the things you want most can turn into a spiral of &ldquo;wanting to do.&rdquo; Clarity gives you a space to think out loud with Gemini — talk through a habit, or untangle what&apos;s been on your mind. Your conversations become reflections you can return to, a quiet record of what actually mattered.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">
              {error}
            </div>
          )}

          {/* Action Button: Google Sign-In */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="inline-flex items-center justify-center space-x-3 px-8 py-3.5 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] font-sans-ui font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center space-x-2 text-xs text-[#8A7D70] dark:text-[#8E8377] font-sans-ui">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Owner-bound private journal &bull; Secured with Firebase</span>
            </div>
          </div>
        </div>

        {/* The Two Pillars Preview */}
        <div className="grid sm:grid-cols-2 gap-4 mt-8 w-full max-w-2xl text-left">
          <div className="p-5 rounded-xl bg-[#F5F0E6]/60 dark:bg-[#201D1A]/60 border border-[#E8DFC8] dark:border-[#2C2723]">
            <div className="flex items-center space-x-2 mb-2 text-[#4A3D30] dark:text-[#CBBDB0]">
              <Compass className="w-4 h-4" />
              <h2 className="font-serif-journal font-medium text-base">Habit Coaching</h2>
            </div>
            <p className="text-xs text-[#6E6152] dark:text-[#9E9182] font-sans-ui leading-relaxed">
              Ground your vision into daily behavioral routines. Overcome procrastination with tiny, repeatable steps.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#F5F0E6]/60 dark:bg-[#201D1A]/60 border border-[#E8DFC8] dark:border-[#2C2723]">
            <div className="flex items-center space-x-2 mb-2 text-[#4A3D30] dark:text-[#CBBDB0]">
              <Feather className="w-4 h-4" />
              <h2 className="font-serif-journal font-medium text-base">Journal & Brainstorm</h2>
            </div>
            <p className="text-xs text-[#6E6152] dark:text-[#9E9182] font-sans-ui leading-relaxed">
              Unpack messy thoughts and brainstorm possibilities in an empathetic dialogue that draws out clarity.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto px-6 py-8 border-t border-[#E8E2D8]/60 dark:border-[#2A2724]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-sans-ui text-[#9E9182] dark:text-[#7A7169]">
        <div className="flex items-center space-x-1.5 select-none">
          <Logo size={18} />
          <span className="font-serif-journal font-medium text-[#24211E] dark:text-[#EAE6E1]">Clarity</span>
        </div>
        <span className="text-[#8E8276] dark:text-[#6E645A] font-light">© 2026 Clarity. All rights reserved.</span>
        <span>Make moves that matter.</span>
      </footer>
    </div>
  );
};
