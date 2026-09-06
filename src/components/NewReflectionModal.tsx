import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { JournalEntry, TemplateId, StartSessionOptions, UserUsage } from '../types';
import { incrementDailyRetrospective, DAILY_RETROSPECTIVE_CAP } from '../services/usageService';
import { createJournalEntry } from '../services/entryService';
import { X, Sparkles, ShieldAlert } from 'lucide-react';

interface NewReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  usage?: UserUsage;
  entries: JournalEntry[];
  onStartSession: (templateId: TemplateId, options?: StartSessionOptions) => void;
  onNavigateToHistory: () => void;
  isAdmin?: boolean;
}

export const NewReflectionModal: React.FC<NewReflectionModalProps> = ({
  isOpen,
  onClose,
  user,
  usage,
  entries,
  onStartSession,
  onNavigateToHistory,
  isAdmin = false,
}) => {
  const [retroPeriod, setRetroPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [isGeneratingRetro, setIsGeneratingRetro] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const retrosUsed = usage?.dailyRetrospectiveCount || 0;
  const isRetroCapReached = !isAdmin && retrosUsed >= DAILY_RETROSPECTIVE_CAP;

  const handleGenerateRetrospective = async () => {
    if (isGeneratingRetro || isRetroCapReached) return;
    setIsGeneratingRetro(true);
    setErrorMessage(null);

    try {
      if (user.uid && user.uid !== 'guest_user') {
        try {
          await incrementDailyRetrospective(user.uid, isAdmin);
        } catch (err: any) {
          if (err?.message === 'CAP_REACHED') {
            throw new Error('Daily insight limit reached (1/1 used today)');
          }
          throw err;
        }
      }

      // Filter entries by date range
      const now = new Date().getTime();
      const cutoffDays = retroPeriod === 'week' ? 7 : retroPeriod === 'month' ? 30 : 365;
      const cutoffTime = now - cutoffDays * 24 * 60 * 60 * 1000;

      const filteredEntries = entries.filter((e) => {
        const time = e.createdAt?.toMillis ? e.createdAt.toMillis() : new Date(e.createdAt || now).getTime();
        return time >= cutoffTime;
      });

      if (filteredEntries.length === 0) {
        throw new Error(`No journal entries found in the past ${retroPeriod}. Write some reflections first!`);
      }

      const res = await fetch('/api/retrospective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: retroPeriod,
          entries: filteredEntries.map((e) => ({
            type: e.type,
            title: e.title,
            content: e.content,
            createdAt: e.createdAt?.toDate ? e.createdAt.toDate().toISOString() : e.createdAt,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to generate insight summary');
      }

      const titleCapitalized = retroPeriod === 'week' ? 'Weekly' : retroPeriod.charAt(0).toUpperCase() + retroPeriod.slice(1);
      await createJournalEntry(user.uid, {
        content: data.summary,
        type: 'retrospective',
        sourceSessionId: `retro_${Date.now()}`,
        title: `${titleCapitalized} Insight`,
      });

      onClose();
      onNavigateToHistory();
    } catch (err: any) {
      console.error('Insight generation error:', err);
      setErrorMessage(err.message || 'Failed to generate insight summary');
    } finally {
      setIsGeneratingRetro(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] dark:bg-[#1C1A18] border border-[#DDD3C4] dark:border-[#2F2A26] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D5] dark:border-[#2A2623]">
          <div>
            <h2 className="font-serif-journal text-xl font-medium text-[#24211E] dark:text-[#FAF7F2]">
              Create an Insight
            </h2>
            <p className="text-xs text-[#8A7D70] dark:text-[#9E9182] font-sans-ui mt-0.5">
              Step back and notice what’s been unfolding in your thoughts and habits.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8A7D70] hover:text-[#24211E] dark:hover:text-[#FAF7F2] hover:bg-[#F5F0E6] dark:hover:bg-[#25221F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-sans-ui font-medium text-[#7A6A58] dark:text-[#9E9182]">
              Look back over
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'week', label: 'Past Week' },
                { id: 'month', label: 'Past Month' },
                { id: 'year', label: 'Past Year' },
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => setRetroPeriod(period.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-sans-ui font-medium border transition-all ${
                    retroPeriod === period.id
                      ? 'bg-[#2E2822] text-[#FAF7F2] border-[#2E2822] dark:bg-[#EAE4DC] dark:text-[#201D1A]'
                      : 'bg-[#F5F0E6] dark:bg-[#221F1C] text-[#6E6152] dark:text-[#BDB0A2] border-[#DDD3C4] dark:border-[#2F2A26]'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {isRetroCapReached && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Daily insight limit reached (1/1 used today).</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleGenerateRetrospective}
            disabled={isGeneratingRetro || isRetroCapReached}
            className={`w-full py-3 rounded-xl font-sans-ui text-sm font-medium flex items-center justify-center space-x-2 transition-all shadow-sm ${
              isGeneratingRetro || isRetroCapReached
                ? 'bg-[#E5DCD0] dark:bg-[#2B2724] text-[#8A7D70] dark:text-[#7A7169] cursor-not-allowed'
                : 'bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isGeneratingRetro ? 'Generating Insight...' : 'Generate Insight'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
