import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { TemplateId, ChatMessage, EntryType, JournalEntry, UserUsage } from '../types';
import { incrementDailySave, DAILY_SAVE_CAP } from '../services/usageService';
import { createJournalEntry } from '../services/entryService';
import { auth } from '../firebase';
import { 
  X, 
  Sparkles, 
  Bookmark, 
  Check, 
  AlertCircle, 
  RotateCcw,
  Edit3
} from 'lucide-react';

interface SummarizeModalProps {
  user: User;
  templateId: TemplateId;
  sessionId: string;
  messages: ChatMessage[];
  usage: UserUsage;
  onClose: () => void;
  onSaved: (entry: JournalEntry) => void;
}

export const SummarizeModal: React.FC<SummarizeModalProps> = ({
  user,
  templateId,
  sessionId,
  messages,
  usage,
  onClose,
  onSaved,
}) => {
  const isHabit = templateId === 'habit-tracking';
  const entryType: EntryType = isHabit ? 'habit' : 'journal';

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryText, setSummaryText] = useState('');
  const [entryTitle, setEntryTitle] = useState(isHabit ? 'Habit Formation Blueprint' : 'Reflective Clarity Journal');
  
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [capReachedError, setCapReachedError] = useState(!isAdmin && usage.dailySaveCount >= DAILY_SAVE_CAP);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      setCapReachedError(false);
    } else {
      setCapReachedError(usage.dailySaveCount >= DAILY_SAVE_CAP);
    }
  }, [isAdmin, usage.dailySaveCount]);

  const remainingSavesAfterSave = Math.max(0, DAILY_SAVE_CAP - (usage.dailySaveCount || 0) - 1);

  // Fetch summary from Gemini via server endpoint on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      // If user is already at cap, do not even call Gemini for save-summarize
      if (!isAdmin && usage.dailySaveCount >= DAILY_SAVE_CAP) {
        setCapReachedError(true);
        setIsLoadingSummary(false);
        return;
      }

      try {
        setIsLoadingSummary(true);
        setGeneralError(null);

        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId,
            sessionType: templateId,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to synthesize summary');
        }

        if (isMounted) {
          const text = data.summary || '';
          
          // Extract title if present in text and clean up body
          const titleMatch = text.match(/Title:\s*([^\n]+)/i);
          if (titleMatch && titleMatch[1]) {
            setEntryTitle(titleMatch[1].replace(/["']/g, '').trim());
            // Strip out Title: line from body
            const cleanedText = text.replace(/^Title:\s*[^\n]+\n*/i, '').trim();
            setSummaryText(cleanedText);
          } else {
            setSummaryText(text);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setGeneralError(err.message || 'Error generating summary from Gemini');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [sessionId, templateId, messages, usage.dailySaveCount]);

  const handleSave = async () => {
    // Check cap upfront
    if (!isAdmin && (usage.dailySaveCount >= DAILY_SAVE_CAP || capReachedError)) {
      setCapReachedError(true);
      return;
    }

    setIsSaving(true);
    setGeneralError(null);

    try {
      // 1. Transactional increment before writing entry as mandated
      try {
        await incrementDailySave(user.uid, isAdmin);
      } catch (err: any) {
        if (err?.message === 'CAP_REACHED' || err === 'CAP_REACHED') {
          // Permanently disable save button for this session
          setCapReachedError(true);
          setIsSaving(false);
          return;
        }
        throw err;
      }

      // 2. Persist to users/{uid}/entries
      const created = await createJournalEntry(user.uid, {
        content: summaryText,
        type: entryType,
        sourceSessionId: sessionId,
        title: entryTitle,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        onSaved(created);
      }, 1400);
    } catch (err: any) {
      console.warn('Save entry notice:', err?.message || err);
      // Surface clear error with retry option. Unsaved input is preserved!
      setGeneralError(err.message || 'Failed to save entry to database. Please click Retry Save.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#FAF7F2] dark:bg-[#1C1917] border border-[#E2D8C8] dark:border-[#2C2825] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] dark:border-[#2A2724] flex items-center justify-between bg-[#F5F0E6] dark:bg-[#221F1C]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#7A6A58] dark:text-[#C5B7A8]" />
            <div>
              <h2 className="font-serif-journal text-lg font-medium text-[#24211E] dark:text-[#FAF7F2]">
                What became clearer
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8A7D70] hover:text-[#24211E] dark:text-[#9E9182] dark:hover:text-[#FAF7F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          {/* Daily Cap Alert if reached */}
          {capReachedError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium">Daily save limit reached (5 of 5 used today)</p>
                <p className="mt-0.5 leading-relaxed text-xs text-amber-800 dark:text-amber-300">
                  Resets at midnight. You can still copy your reflections manually below.
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingSummary ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-[#8A7D70] dark:text-[#8E8377]">
              <Sparkles className="w-6 h-6 animate-spin text-[#7A6A58]" />
              <p className="font-serif-journal italic text-base">Unpacking what became clearer...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-sans-ui font-medium text-[#7A6D60] dark:text-[#A89C8E] mb-1.5 flex items-center space-x-1.5">
                  <Edit3 className="w-3 h-3" />
                  <span>Entry Title</span>
                </label>
                <input
                  type="text"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F0E6] dark:bg-[#221F1C] border border-[#DDD3C4] dark:border-[#332C28] font-serif-journal text-base text-[#24211E] dark:text-[#FAF7F2] outline-none focus:border-[#A89684]"
                  placeholder="Give this clarity a title..."
                />
              </div>

              {/* Editable Summary Content */}
              <div>
                <label className="block text-xs font-sans-ui font-medium text-[#7A6D60] dark:text-[#A89C8E] mb-1.5">
                  Synthesized Journal Content (Editable)
                </label>
                <textarea
                  rows={8}
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  className="w-full p-4 rounded-xl bg-[#F5F0E6] dark:bg-[#221F1C] border border-[#DDD3C4] dark:border-[#332C28] font-serif-journal text-sm sm:text-base text-[#24211E] dark:text-[#FAF7F2] leading-relaxed outline-none focus:border-[#A89684] resize-y"
                  placeholder="Summary content..."
                />
              </div>
            </div>
          )}

          {/* Generic Error state with Retry option */}
          {generalError && !capReachedError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
              <button
                onClick={handleSave}
                className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200 font-medium flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry Save</span>
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-[#F0EBE1] dark:bg-[#25221F] border border-[#DDD3C4] dark:border-[#38322C] text-xs text-[#4A3F35] dark:text-[#D4C3B3] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">Saved to your Archive.</span>
              </div>
              <span className="text-[11px] text-[#8A7D70] dark:text-[#8E8377] font-sans-ui">
                {isAdmin ? 'Unlimited (admin)' : `${remainingSavesAfterSave} ${remainingSavesAfterSave === 1 ? 'save' : 'saves'} remaining today`}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E8E2D8] dark:border-[#2A2724] flex items-center justify-between bg-[#F5F0E6] dark:bg-[#221F1C]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-sans-ui text-[#6E6152] dark:text-[#A89F95] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isLoadingSummary || !summaryText.trim() || capReachedError || saveSuccess}
            className={`px-5 py-2 rounded-xl font-sans-ui text-xs sm:text-sm font-medium flex items-center space-x-2 transition-all shadow-sm ${
              capReachedError
                ? 'bg-[#DDD3C4] dark:bg-[#2E2A27] text-[#8A7D70] cursor-not-allowed'
                : 'bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] disabled:opacity-50'
            }`}
          >
            {isSaving ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : capReachedError ? (
              <span>Save limit reached</span>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
