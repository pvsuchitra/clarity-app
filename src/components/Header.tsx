import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { UserUsage } from '../types';
import { AccountModal } from './AccountModal';
import { Logo } from './Logo';
import { 
  BookOpen, 
  LayoutDashboard, 
  Sun, 
  Moon, 
  Settings,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  user: User;
  currentView: 'dashboard' | 'history';
  onNavigate: (view: 'dashboard' | 'history') => void;
  usage: UserUsage;
  entriesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentView,
  onNavigate,
  usage,
  entriesCount,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[#E8E2D8] dark:border-[#2A2724] bg-[#FAF7F2]/90 dark:bg-[#181716]/90 backdrop-blur-md transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-3.5 cursor-pointer select-none group"
          >
            <Logo size={44} className="transition-transform group-hover:scale-105 shrink-0" />
            <div className="flex flex-col justify-center">
              <span className="font-serif-journal text-2xl font-semibold tracking-tight text-[#3E342B] dark:text-[#FAF7F2] leading-none select-none">
                Clarity
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#6E645A] dark:text-[#A89F95] font-sans-ui font-light tracking-wide leading-none mt-1">
                A quiet space to think
              </span>
            </div>
          </div>

          {/* Navigation & Stats */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Navigation links */}
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  currentView === 'dashboard'
                    ? 'bg-[#EAE2D5] text-[#24211E] dark:bg-[#2C2825] dark:text-[#EAE6E1]'
                    : 'text-[#6E645A] dark:text-[#A89F95] hover:text-[#24211E] dark:hover:text-[#EAE6E1]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>

              <button
                id="onboarding-step-3-target"
                onClick={() => onNavigate('history')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  currentView === 'history'
                    ? 'bg-[#EAE2D5] text-[#24211E] dark:bg-[#2C2825] dark:text-[#EAE6E1]'
                    : 'text-[#6E645A] dark:text-[#A89F95] hover:text-[#24211E] dark:hover:text-[#EAE6E1]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Archive</span>
                {entriesCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#D8CEBF] dark:bg-[#3D3732] text-[#4A3F35] dark:text-[#C5BAB0]">
                    {entriesCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Daily Save Allowance Pill */}
            <div 
              id="onboarding-step-4-target"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAE2D5]/60 dark:bg-[#2C2825] text-[10px] sm:text-xs font-medium font-sans-ui text-[#5C4D3E] dark:text-[#C5B7A8] select-none border border-[#DDD3C4]/40 dark:border-[#2F2A26]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A7D70] dark:bg-[#8E8377]" />
              <span>{usage?.dailySaveCount || 0}/5 saves</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-[#6E645A] dark:text-[#A89F95] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Account & Settings Trigger */}
            <div className="flex items-center pl-2 border-l border-[#E8E2D8] dark:border-[#2A2724] space-x-2">
              <button
                onClick={() => setIsAccountModalOpen(true)}
                title="Settings & Account"
                aria-label="Settings & Account"
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors text-[#6E645A] dark:text-[#A89F95] hover:text-[#24211E] dark:hover:text-[#EAE6E1]"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full ring-1 ring-[#D5CBBF] dark:ring-[#3D3833]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E2D8C9] dark:bg-[#332E2A] flex items-center justify-center text-xs font-serif-journal text-[#4A3F35] dark:text-[#D4C3B3]">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline-block text-xs font-sans-ui font-medium">
                  Settings
                </span>
                <Settings className="w-3.5 h-3.5 text-[#8A7D70] dark:text-[#8E8377]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Account & Quota Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
        usage={usage}
        entriesCount={entriesCount}
      />
    </>
  );
};
