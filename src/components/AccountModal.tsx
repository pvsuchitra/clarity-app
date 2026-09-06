import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserUsage } from '../types';
import { DAILY_SAVE_CAP, SESSION_TURN_CAP } from '../services/usageService';
import { logoutUser, auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { 
  X, 
  Bookmark, 
  Clock, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  usage: UserUsage;
  entriesCount: number;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  user,
  usage,
  entriesCount,
}) => {
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkAdmin() {
      try {
        if (auth.currentUser) {
          const res = await auth.currentUser.getIdTokenResult();
          if (isMounted && res.claims.isAdmin === true) {
            setIsAdmin(true);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    checkAdmin();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const savesUsed = usage.dailySaveCount || 0;
  const savesRemaining = Math.max(0, DAILY_SAVE_CAP - savesUsed);
  const percentUsed = Math.min(100, Math.round((savesUsed / DAILY_SAVE_CAP) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#FAF7F2] dark:bg-[#1C1917] border border-[#E2D8C8] dark:border-[#2C2825] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] dark:border-[#2A2724] flex items-center justify-between bg-[#F5F0E6] dark:bg-[#221F1C]">
          <h2 id="account-modal-title" className="font-serif-journal text-lg font-medium text-[#24211E] dark:text-[#FAF7F2]">
            Settings &amp; Account
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A7D70] hover:text-[#24211E] dark:text-[#8E8377] dark:hover:text-[#FAF7F2] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 font-sans-ui text-xs sm:text-sm">
          {/* User Profile Card */}
          <div className="p-4 rounded-xl bg-[#F5F0E6] dark:bg-[#221F1C] border border-[#DDD3C4] dark:border-[#2F2A26] flex items-center space-x-3.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full ring-2 ring-[#D5CBBF] dark:ring-[#3D3833]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#E2D8C9] dark:bg-[#332E2A] flex items-center justify-center text-base font-serif-journal text-[#4A3F35] dark:text-[#D4C3B3]">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-serif-journal text-base font-medium text-[#24211E] dark:text-[#FAF7F2] truncate">
                {user.displayName || 'Clarity Member'}
              </p>
              <p className="text-xs text-[#8A7D70] dark:text-[#8E8377] truncate">
                {user.email || 'Google Account'}
              </p>
              <div className="flex items-center space-x-1 mt-1 text-[11px] text-[#7A6D60] dark:text-[#9E9182]">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Google Sign-In verified</span>
              </div>
            </div>
          </div>

          {/* Full Quota Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7D70] dark:text-[#9E9182]">
                Daily Save Allowance
              </span>
              <span className="text-xs font-medium text-[#24211E] dark:text-[#FAF7F2]">
                {isAdmin ? 'Unlimited (admin)' : `${savesUsed} of ${DAILY_SAVE_CAP} used`}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F0E6] dark:bg-[#221F1C] border border-[#DDD3C4] dark:border-[#2F2A26] space-y-3">
              {/* Discrete Pips / Progress */}
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: DAILY_SAVE_CAP }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-colors ${
                      isAdmin
                        ? 'bg-emerald-600/70 dark:bg-emerald-500/70'
                        : i < savesUsed
                        ? 'bg-[#5C4A38] dark:bg-[#C5B7A8]'
                        : 'bg-[#E0D5C5] dark:bg-[#332E2A]'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-[#5C4A38] dark:text-[#C5B7A8]">
                <span>
                  {isAdmin ? (
                    <strong className="text-emerald-700 dark:text-emerald-400 font-medium">Unlimited (admin)</strong>
                  ) : (
                    <>
                      <strong>{savesRemaining}</strong> {savesRemaining === 1 ? 'save' : 'saves'} remaining today
                    </>
                  )}
                </span>
                <span className="text-[11px] text-[#8A7D70] dark:text-[#8E8377] flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Resets at midnight</span>
                </span>
              </div>

              <p className="font-serif-journal text-xs text-[#7A6D60] dark:text-[#9E9182] leading-relaxed pt-1 border-t border-[#EAE2D5] dark:border-[#2A2623]">
                Clarity keeps a gentle daily cap of 5 saves to encourage distilling your thoughts down to what genuinely matters, rather than hoarding unfinished drafts.
              </p>
            </div>
          </div>

          {/* Session Quota Info */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7D70] dark:text-[#9E9182]">
              Session Length Limit
            </span>
            <div className="p-3.5 rounded-xl bg-[#F5F0E6] dark:bg-[#221F1C] border border-[#DDD3C4] dark:border-[#2F2A26] flex items-start space-x-2.5">
              <Bookmark className="w-4 h-4 text-[#7A6D60] dark:text-[#9E9182] mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-[#24211E] dark:text-[#FAF7F2]">
                  Up to {SESSION_TURN_CAP} turns per reflection
                </p>
                <p className="text-xs text-[#7A6D60] dark:text-[#9E9182] font-serif-journal">
                  Designed to help you reach a clear understanding without circular overthinking.
                </p>
              </div>
            </div>
          </div>

          {/* Appearance / Theme */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7D70] dark:text-[#9E9182]">
              Appearance
            </span>
            <div className="p-3.5 rounded-xl bg-[#F5F0E6] dark:bg-[#221F1C] border border-[#DDD3C4] dark:border-[#2F2A26] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-[#A89F95]" />
                ) : (
                  <Sun className="w-4 h-4 text-[#6E645A]" />
                )}
                <div>
                  <p className="text-xs font-medium text-[#24211E] dark:text-[#FAF7F2]">
                    {theme === 'dark' ? 'Dark Twilight theme' : 'Warm Paper theme'}
                  </p>
                  <p className="text-[11px] text-[#8A7D70] dark:text-[#8E8377]">
                    Quiet editorial styling for deep reading and reflection
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-lg bg-[#EAE2D5] dark:bg-[#2C2825] text-xs font-medium text-[#24211E] dark:text-[#FAF7F2] hover:bg-[#DDD2C2] dark:hover:bg-[#38332F] transition-colors"
              >
                Switch
              </button>
            </div>
          </div>

          {/* Archive Statistics */}
          <div className="p-3 rounded-xl bg-[#F5F0E6]/60 dark:bg-[#221F1C]/60 border border-[#DDD3C4]/60 dark:border-[#2F2A26]/60 flex items-center justify-between text-xs text-[#7A6D60] dark:text-[#9E9182]">
            <span>Saved in your Journal Archive</span>
            <span className="font-serif-journal font-medium text-[#24211E] dark:text-[#FAF7F2]">
              {entriesCount} {entriesCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>

        {/* Modal Footer with Log Out and Close */}
        <div className="px-6 py-4 border-t border-[#E8E2D8] dark:border-[#2A2724] flex items-center justify-between bg-[#F5F0E6] dark:bg-[#221F1C]">
          <button
            onClick={() => {
              onClose();
              logoutUser();
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
