import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { TemplateId, ChatMessage, UserUsage, StartSessionOptions } from '../types';
import { updateSessionTurnCount } from '../services/sessionService';
import { DAILY_SAVE_CAP, SESSION_TURN_CAP, incrementDailyGeminiCall, incrementDailySave } from '../services/usageService';
import { createJournalEntry } from '../services/entryService';
import { auth } from '../firebase';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Bookmark, 
  AlertCircle, 
  RotateCcw, 
  Compass, 
  Feather,
  Info,
  Check
} from 'lucide-react';

interface ConversationViewProps {
  user: User;
  templateId: TemplateId;
  sessionId: string;
  onBack: () => void;
  onOpenSummarize: (messages: ChatMessage[]) => void;
  usage: UserUsage;
  sessionOptions?: StartSessionOptions;
}

const TEMPLATE_META = {
  'habit-tracking': {
    title: 'Make it easier',
    subtitle: 'Turn an intention into something small and realistic to begin',
    icon: Compass,
    welcomeMessage: "Let's make it smaller. What are you wanting to begin, and what feels like the heaviest part right now?",
  },
  'journal-reflection': {
    title: 'Talk it through',
    subtitle: 'Think out loud, follow the thread, and see what’s underneath',
    icon: Feather,
    welcomeMessage: "Start anywhere. I'm listening. What's the thought you keep coming back to?",
  },
};

export const ConversationView: React.FC<ConversationViewProps> = ({
  user,
  templateId,
  sessionId,
  onBack,
  onOpenSummarize,
  usage,
  sessionOptions,
}) => {
  const meta = TEMPLATE_META[templateId];
  const Icon = meta.icon;
  const isHabit = templateId === 'habit-tracking';

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'model',
      content: sessionOptions?.openingModelGreeting || meta.welcomeMessage,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [savedDocPath, setSavedDocPath] = useState<string | null>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (sessionOptions?.initialUserMessage && !autoSentRef.current) {
      autoSentRef.current = true;
      handleSendMessage(sessionOptions.initialUserMessage);
    }
  }, [sessionOptions]);

  // Turn count = number of user messages sent in this session
  const userTurnCount = messages.filter((m) => m.role === 'user').length;
  const isTurnCapReached = userTurnCount >= SESSION_TURN_CAP;
  const isNearTurnCap = userTurnCount >= 15 && userTurnCount < SESSION_TURN_CAP;

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
  const isSaveCapReached = !isAdmin && savesUsed >= DAILY_SAVE_CAP;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isGenerating || isTurnCapReached) return;

    setErrorMessage(null);
    setLastFailedInput(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsGenerating(true);

    const nextTurnCount = userTurnCount + 1;

    try {
      // 1. Increment dailyGeminiCallCount in users/{uid}/usage/counters using incrementCounter from counterService.js
      if (user.uid && user.uid !== 'guest_user') {
        try {
          await incrementDailyGeminiCall(user.uid, isAdmin);
          console.log(`[Usage] Incremented dailyGeminiCallCount in users/${user.uid}/usage/counters`);
        } catch (counterErr: any) {
          if (counterErr?.message === 'CAP_REACHED') {
            throw new Error('Daily Gemini call allowance reached (60/60)');
          }
          console.warn('Could not increment dailyGeminiCallCount:', counterErr);
        }
      }

      // 2. Sync turn count to session doc (non-blocking)
      if (user.uid && user.uid !== 'guest_user') {
        updateSessionTurnCount(user.uid, sessionId, nextTurnCount).catch((err) => {
          console.warn('Non-blocking session turn update notice:', err);
        });
      }

      // 3. Call server-side /api/chat with habit-tracking template
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionTurnCount: nextTurnCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to receive AI response from Gemini');
      }

      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const updated = [...prev, modelMessage];
        const finalUserTurns = updated.filter((m) => m.role === 'user').length;
        if (finalUserTurns >= SESSION_TURN_CAP && !savedDocPath && !isSavingEntry) {
          setTimeout(() => {
            handleSaveAction();
          }, 500);
        }
        return updated;
      });
    } catch (err: any) {
      if (err?.message?.includes('GEMINI_API_KEY') || err?.message?.includes('Settings > Secrets')) {
        console.warn('Gemini API key required:', err.message);
      } else {
        console.error('Chat error:', err);
      }
      // NEVER clear unsent user input on error: restore it!
      setErrorMessage(err.message || 'Error communicating with Gemini. Your message was preserved.');
      setLastFailedInput(text);
      // Remove the failed user message from UI list so it can be cleanly retried
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInputText(text);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAction = async () => {
    if (isSavingEntry || userTurnCount === 0) return;
    setIsSavingEntry(true);
    setErrorMessage(null);
    setSavedDocPath(null);

    try {
      // 3a. Calls incrementCounter from the existing counterService.js
      try {
        await incrementDailySave(user.uid, isAdmin);
        console.log(`[Usage] Incremented dailySaveCount for user ${user.uid}`);
      } catch (countErr: any) {
        if (countErr?.message === 'CAP_REACHED') {
          throw new Error('Daily save limit reached (5 of 5 used today)');
        }
        console.warn('Daily save counter notice:', countErr?.message || countErr);
      }

      // 3b. Writes one document to users/{uid}/entries with real authenticated user's uid, real content, type: "habit", and a createdAt timestamp
      const realContent = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => `${m.role === 'user' ? 'User' : 'Clarity'}: ${m.content}`)
        .join('\n\n') || messages.map((m) => `${m.role === 'user' ? 'User' : 'Clarity'}: ${m.content}`).join('\n\n');

      const isHabit = templateId === 'habit-tracking';
      const entry = await createJournalEntry(user.uid, {
        content: realContent,
        type: isHabit ? 'habit' : 'journal',
        sourceSessionId: sessionId,
        title: sessionOptions?.starterTitle || (isHabit ? 'Habit Session' : 'Journal Session'),
      });

      // 4. After the write, log to browser console the exact document path and data that was written
      const docPath = entry.id.startsWith('entry_')
        ? `local:users/${user.uid}/entries/${entry.id}`
        : `users/${user.uid}/entries/${entry.id}`;
      console.log('Saved to:', docPath, entry);

      setSavedDocPath(docPath);
    } catch (err: any) {
      console.warn('Entry save notice:', err?.message || err);
      setErrorMessage(err.message || 'Failed to save habit entry');
    } finally {
      setIsSavingEntry(false);
    }
  };

  // If session began with an initial thought from the dashboard, auto-send it
  useEffect(() => {
    if (sessionOptions?.initialUserMessage && !autoSentRef.current) {
      autoSentRef.current = true;
      handleSendMessage(sessionOptions.initialUserMessage);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-4rem)]">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D8] dark:border-[#2A2724]">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-[#6E6152] dark:text-[#A89F95] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
            title="Back to Today"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <Icon className="w-4 h-4 text-[#5C4A38] dark:text-[#D4C3B3]" />
              <h1 className="font-serif-journal text-lg font-medium text-[#24211E] dark:text-[#FAF7F2]">
                {sessionOptions?.starterTitle || meta.title}
              </h1>
            </div>
            <p className="text-[11px] text-[#8A7D70] dark:text-[#8E8377] font-sans-ui hidden sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Turn indicator */}
          <div className="px-2.5 py-1 rounded-full text-xs font-sans-ui bg-[#EAE2D5] dark:bg-[#2A2623] text-[#5C4D3E] dark:text-[#C5B7A8]">
            Turn {userTurnCount} / {SESSION_TURN_CAP}
          </div>
        </div>
      </div>

      {/* Save Success Banner */}
      {savedDocPath && (
        <div className="mt-3 p-3 rounded-xl bg-[#F0EBE1] dark:bg-[#25221F] border border-[#DDD3C4] dark:border-[#38322C] text-xs text-[#4A3F35] dark:text-[#D4C3B3] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">
              Saved to your journal.
            </span>
          </div>
        </div>
      )}

      {/* Visible Error Banner */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Near Cap or Reached Cap Warning Banners */}
      {isTurnCapReached && (
        <div className="mt-3 p-3 rounded-xl bg-[#F0E6D8] dark:bg-[#2A241F] border border-[#D5C6B3] dark:border-[#3D352E] flex items-center justify-between text-xs text-[#5C4A38] dark:text-[#D4C3B3]">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              You have completed all 20 turns of this reflection. Please synthesize your insights into a journal entry.
            </span>
          </div>
          <button
            onClick={() => onOpenSummarize(messages)}
            disabled={isSaveCapReached}
            className="px-3 py-1 rounded-lg bg-[#2E2822] text-[#FAF7F2] dark:bg-[#EAE4DC] dark:text-[#201D1A] font-medium text-xs ml-3 flex-shrink-0"
          >
            Summarize Now
          </button>
        </div>
      )}

      {isNearTurnCap && (
        <div className="mt-3 p-2.5 rounded-xl bg-[#F5EFE6] dark:bg-[#221E1B] border border-[#E2D8C8] dark:border-[#332C28] flex items-center space-x-2 text-xs text-[#7A6A58] dark:text-[#BDB0A2]">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Save {isHabit ? 'Habit' : 'Journal'} Session</span>
        </div>
      )}

      {/* Flowing Reflective Dialogue Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 space-y-6 pr-2">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-5 sm:p-6 transition-all ${
                  isUser
                    ? 'bg-[#EBE2D4] dark:bg-[#2A2623] border border-[#DDD3C4] dark:border-[#3A342F] text-[#24211E] dark:text-[#EAE6E1]'
                    : 'bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#E2D8C8] dark:border-[#2F2A26] text-[#24211E] dark:text-[#FAF7F2] shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between space-x-4 mb-2 pb-1 border-b border-[#E0D5C5] dark:border-[#2B2622] text-[11px] font-sans-ui text-[#8A7D70] dark:text-[#8E8377]">
                  <span className="font-medium tracking-wide">
                    {isUser ? user.displayName || 'You' : meta.title}
                  </span>
                  <span>{time}</span>
                </div>

                <div className="font-serif-journal text-base sm:text-lg leading-relaxed whitespace-pre-wrap selection:bg-[#D5C6B3] dark:selection:bg-[#4D453E]">
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex flex-col items-start">
            <div className="bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#E2D8C8] dark:border-[#2F2A26] rounded-2xl p-5 max-w-md flex items-center space-x-3 text-xs text-[#7A6D60] dark:text-[#A89C8E]">
              <Sparkles className="w-4 h-4 animate-spin text-[#8A7D70]" />
              <span className="font-serif-journal italic text-sm">Reflecting on your thoughts...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Reflection generation failed</p>
                <p className="mt-0.5 text-red-700 dark:text-red-400">{errorMessage}</p>
              </div>
            </div>

            {lastFailedInput && (
              <button
                onClick={() => handleSendMessage(lastFailedInput)}
                className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/60 hover:bg-red-200 text-red-800 dark:text-red-200 font-medium text-xs flex items-center space-x-1 flex-shrink-0 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-3 border-t border-[#E8E2D8] dark:border-[#2A2724] relative space-y-3">
        <div className="relative rounded-2xl bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] focus-within:border-[#B5A390] dark:focus-within:border-[#4A423A] transition-colors p-2 shadow-xs">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || isTurnCapReached}
            placeholder={
              isTurnCapReached
                ? 'This session reached 20 turns. Tap Summarize & Save below.'
                : 'Drop a thought here... (Press Enter to send, Shift+Enter for new line)'
            }
            className="w-full bg-transparent resize-none border-none outline-none font-serif-journal text-base text-[#24211E] dark:text-[#FAF7F2] placeholder-[#9E9182] dark:placeholder-[#6E655C] px-3 py-1 disabled:opacity-60"
          />

          <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-sans-ui text-[#9E9182] dark:text-[#6E655C]">
            <span>
              {isTurnCapReached
                ? 'Session capped'
                : `${SESSION_TURN_CAP - userTurnCount} turns remaining in this session`}
            </span>

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isGenerating || isTurnCapReached}
              className="p-2 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] disabled:opacity-40 transition-all active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Save Action Controls */}
        <div className="flex items-center justify-center">
          <button
            id="save-habit-action"
            onClick={handleSaveAction}
            disabled={userTurnCount === 0 || isSavingEntry || isSaveCapReached}
            className={`w-full sm:w-auto px-5 py-2 rounded-xl font-sans-ui text-sm font-medium flex items-center justify-center space-x-2 transition-all shadow-sm ${
              isSaveCapReached
                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 cursor-not-allowed border border-amber-300 dark:border-amber-800'
                : userTurnCount === 0
                ? 'bg-[#E5DCD0] dark:bg-[#2B2724] text-[#8A7D70] dark:text-[#7A7169] cursor-not-allowed'
                : savedDocPath
                ? 'bg-[#433B32] text-[#FAF7F2] dark:bg-[#EAE4DC] dark:text-[#201D1A]'
                : 'bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>
              {isSavingEntry
                ? 'Saving...'
                : savedDocPath
                ? 'Saved to your journal'
                : isSaveCapReached
                ? 'Save limit reached'
                : isHabit
                ? 'Save Habit Session'
                : 'Save Journal Session'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
