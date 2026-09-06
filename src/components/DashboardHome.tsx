import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { TemplateId, JournalEntry, UserUsage, StartSessionOptions } from '../types';
import { ProductPromise } from '../constants/promises';
import { incrementDailyGeminiCall } from '../services/usageService';
import { Logo } from './Logo';
import { 
  ArrowRight, 
  Calendar,
  Sparkles,
  Feather,
  Compass,
  Layers,
  PenLine
} from 'lucide-react';

interface DashboardHomeProps {
  user: User;
  onStartSession: (templateId: TemplateId, options?: StartSessionOptions) => void;
  onNavigateToHistory: () => void;
  entries: JournalEntry[];
  usage?: UserUsage;
  initialPromise?: ProductPromise;
}

const ROTATING_EXAMPLES = [
  "I keep thinking about...",
  "Something has been bothering me...",
  "I don't know why this feels difficult...",
  "Part of me wants to...",
  "I think I already know the answer...",
];

const REFLECTION_STARTERS = [
  {
    id: 'thread',
    headline: "I keep thinking about something",
    subtext: "Let's follow the thread.",
    template: 'journal-reflection' as TemplateId,
    greeting: "Okay. Start wherever feels natural. What's the thought you keep coming back to?",
    icon: Feather,
  },
  {
    id: 'start',
    headline: "I know what I want, but can't start",
    subtext: "Let's make it easier.",
    template: 'habit-tracking' as TemplateId,
    greeting: "Let's make it smaller. What are you wanting to begin, and what feels like the heaviest part right now?",
    icon: Compass,
  },
  {
    id: 'too-much',
    headline: "I have too much in my head",
    subtext: "Let's sort through it.",
    template: 'journal-reflection' as TemplateId,
    greeting: "Let's sort through it together. Just drop whatever is loudest in your mind first.",
    icon: Layers,
  },
  {
    id: 'just-write',
    headline: "I just want to write",
    subtext: "No structure. Just thoughts.",
    template: 'journal-reflection' as TemplateId,
    greeting: "Take all the space you need. No structure required—I'm here whenever you want to pause.",
    icon: PenLine,
  },
];

function extractInsightPreview(entry: JournalEntry): string {
  if (!entry || !entry.content) return '';
  const content = entry.content;

  // Check for "### What became clearer" section
  const clearerMatch = content.match(/### What became clearer\s*\n+([^#\n]+)/i);
  if (clearerMatch && clearerMatch[1]) {
    return clearerMatch[1].trim();
  }

  // Check for Core Realization pattern
  const coreMatch = content.match(/\*\*Core Realization\*\*:\s*([^\n]+)/i);
  if (coreMatch && coreMatch[1]) {
    return coreMatch[1].trim();
  }

  // Clean lines like Title: ...
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith('title:'));
  return lines[0] || '';
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  user,
  onStartSession,
  onNavigateToHistory,
  entries,
  usage,
}) => {
  const [quickThought, setQuickThought] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Subtly rotate placeholder examples
  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setExampleIndex((prev) => (prev + 1) % ROTATING_EXAMPLES.length);
        setIsFading(false);
      }, 300);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  const recentEntries = entries.slice(0, 3);
  const latestEntry = entries.length > 0 ? entries[0] : null;

  const displayName = user.displayName?.split(' ')[0] || 'Friend';
  const greeting = `${getTimeOfDayGreeting()}, ${displayName.toUpperCase()}`;

  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const handleQuickSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const thought = quickThought.trim();
    if (!thought || isRouting) return;

    setIsRouting(true);
    setRouteError(null);

    try {
      if (user.uid && user.uid !== 'guest_user') {
        try {
          await incrementDailyGeminiCall(user.uid);
        } catch (err: any) {
          if (err?.message === 'CAP_REACHED') {
            throw new Error('Daily Gemini call allowance reached (60/60)');
          }
          console.warn('Could not increment dailyGeminiCallCount:', err);
        }
      }

      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thought }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to classify thought');
      }

      const { templateId } = data;
      onStartSession(templateId, {
        starterTitle: thought.length > 40 ? thought.substring(0, 40) + '...' : thought,
        initialUserMessage: thought,
      });
    } catch (err: any) {
      console.error('Intake router error:', err);
      setRouteError(err.message || 'Failed to route thought');
    } finally {
      setIsRouting(false);
    }
  };

  const handleSelectExample = (exampleText: string) => {
    setQuickThought(exampleText);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 sm:space-y-14">
      {/* 1. Primary Invitation & Low-Friction Entry */}
      <section className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-sans-ui tracking-[0.2em] font-semibold text-[#8A7D70] dark:text-[#9E9182]">
            {greeting}
          </p>

          <h1 className="font-serif-journal text-3xl sm:text-4xl md:text-5xl font-medium text-[#24211E] dark:text-[#FAF7F2] tracking-tight leading-tight">
            What&apos;s on your mind?
          </h1>

          <p className="font-serif-journal text-base sm:text-lg text-[#6E6152] dark:text-[#BDB0A2] max-w-xl font-normal leading-relaxed">
            You don&apos;t need to have it figured out. Start wherever you are.
          </p>
        </div>

        {/* Conversational Thought Entry Box - unwired until classification step */}
        <form id="onboarding-step-1-target" onSubmit={handleQuickSubmit} className="relative group">
          <div className="rounded-2xl bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] group-focus-within:border-[#A89684] dark:group-focus-within:border-[#524B44] transition-all duration-200 p-2 sm:p-2.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={quickThought}
                onChange={(e) => setQuickThought(e.target.value)}
                placeholder="Drop a thought here..."
                className="w-full bg-transparent border-none outline-none font-serif-journal text-base sm:text-lg text-[#24211E] dark:text-[#FAF7F2] placeholder-[#9E9182] dark:placeholder-[#6E655C] px-3 py-2"
              />

              <button
                type="submit"
                disabled={isRouting}
                className="self-end sm:self-center px-4 py-2.5 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] font-sans-ui text-xs sm:text-sm font-medium flex items-center space-x-1.5 transition-all shadow-xs whitespace-nowrap active:scale-[0.98]"
              >
                <span>{isRouting ? 'Routing...' : 'Start thinking'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {routeError && (
              <div className="mt-2 px-3 py-1 text-xs text-red-600 dark:text-red-400 font-sans-ui">
                {routeError}
              </div>
            )}

            {/* Subtle Rotating Example Prompts */}
            <div className="pt-2 px-3 pb-1 flex items-center space-x-2 text-xs font-serif-journal text-[#8A7D70] dark:text-[#8E8377] border-t border-[#EAE2D5]/70 dark:border-[#2A2623]/70">
              <span className="font-sans-ui text-[11px] text-[#A89C8E] dark:text-[#70675E] select-none">
                Or begin with:
              </span>
              <button
                type="button"
                onClick={() => handleSelectExample(ROTATING_EXAMPLES[exampleIndex])}
                className={`text-left hover:text-[#24211E] dark:hover:text-[#FAF7F2] hover:underline transition-opacity duration-300 italic ${
                  isFading ? 'opacity-0' : 'opacity-100'
                }`}
              >
                &ldquo;{ROTATING_EXAMPLES[exampleIndex]}&rdquo;
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 2. Primary Reflection Entry Points */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-journal text-xl sm:text-2xl font-medium text-[#24211E] dark:text-[#FAF7F2]">
            Talk it through
          </h2>
          <span className="text-xs text-[#8A7D70] dark:text-[#8E8377] font-sans-ui">
            Select a starting thread
          </span>
        </div>

        <div id="onboarding-step-2-target" className="grid gap-3.5 sm:grid-cols-2">
          {REFLECTION_STARTERS.map((starter) => {
            const Icon = starter.icon;

            return (
              <button
                key={starter.id}
                id={`starter-${starter.id}-btn`}
                onClick={() =>
                  onStartSession(starter.template, {
                    openingModelGreeting: starter.greeting,
                    starterTitle: starter.headline,
                  })
                }
                className="group text-left p-5 rounded-2xl bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] hover:border-[#8A7D70] dark:hover:border-[#524B44] hover:bg-[#EFE9DD] dark:hover:bg-[#272320] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-serif-journal text-base sm:text-lg font-medium text-[#24211E] dark:text-[#FAF7F2] group-hover:text-[#000] dark:group-hover:text-[#FFF] transition-colors">
                      {starter.headline}
                    </p>
                    <p className="font-serif-journal text-xs sm:text-sm text-[#7A6D60] dark:text-[#9E9182] leading-relaxed">
                      {starter.subtext}
                    </p>
                  </div>
                  <Icon className="w-4 h-4 text-[#8A7D70] dark:text-[#7A7169] flex-shrink-0 mt-1 transition-colors group-hover:text-[#24211E] dark:group-hover:text-[#FAF7F2]" />
                </div>

                <div className="mt-4 pt-3 border-t border-[#EAE2D5] dark:border-[#2A2623] flex items-center justify-between text-[11px] font-sans-ui text-[#8A7D70] dark:text-[#8E8377]">
                  <span className="group-hover:text-[#24211E] dark:group-hover:text-[#FAF7F2] transition-colors font-medium">
                    Begin reflection
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Returning User Experience: A Thread Worth Revisiting */}
      {latestEntry && (
        <section className="p-5 sm:p-6 rounded-2xl bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[11px] font-sans-ui font-semibold uppercase tracking-wider text-[#8A7D70] dark:text-[#9E9182]">
              A thread worth revisiting
            </span>
            <p className="font-serif-journal text-base sm:text-lg font-medium text-[#24211E] dark:text-[#FAF7F2]">
              &ldquo;{latestEntry.title || 'Previous thought'}&rdquo;
            </p>
            {extractInsightPreview(latestEntry) && (
              <p className="text-xs sm:text-sm text-[#6E6152] dark:text-[#BDB0A2] font-serif-journal line-clamp-2 leading-relaxed">
                {extractInsightPreview(latestEntry)}
              </p>
            )}
          </div>

          <button
            onClick={() =>
              onStartSession('journal-reflection', {
                initialUserMessage: `I'd like to continue this reflection from earlier: "${latestEntry.title || 'my previous thought'}"`,
                starterTitle: latestEntry.title || 'Revisiting reflection',
              })
            }
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] text-xs font-medium font-sans-ui flex items-center space-x-1.5 whitespace-nowrap transition-colors"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* 4. Saved Content: What became clearer */}
      <section className="space-y-4 pt-4 border-t border-[#E8E2D8] dark:border-[#2A2724]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif-journal text-xl sm:text-2xl font-medium text-[#24211E] dark:text-[#FAF7F2]">
              What became clearer
            </h2>
            <p className="text-xs text-[#8A7D70] dark:text-[#8E8377] font-sans-ui mt-0.5">
              The things you&apos;ve figured out along the way.
            </p>
          </div>

          {entries.length > 0 && (
            <button
              onClick={onNavigateToHistory}
              className="text-xs sm:text-sm font-medium text-[#5C4A38] dark:text-[#CBBDB0] hover:underline flex items-center space-x-1"
            >
              <span>View All ({entries.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentEntries.length === 0 ? (
          /* Empty State */
          <div className="bg-[#F5F0E6]/50 dark:bg-[#201D1A]/50 border border-dashed border-[#DDD3C4] dark:border-[#38322C] rounded-2xl p-8 sm:p-12 text-center space-y-3">
            <p className="font-serif-journal text-lg sm:text-xl text-[#24211E] dark:text-[#FAF7F2]">
              Nothing here yet. That&apos;s okay.
            </p>
            <p className="font-serif-journal text-sm text-[#7A6D60] dark:text-[#9E9182] max-w-sm mx-auto leading-relaxed">
              Most clarity starts as something messy.
            </p>
            <div className="pt-2">
              <button
                onClick={() =>
                  onStartSession('journal-reflection', {
                    openingModelGreeting: "Start anywhere. What's the thought you keep coming back to?",
                    starterTitle: "Starting a thought",
                  })
                }
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] text-xs font-sans-ui font-medium transition-colors"
              >
                <span>Start with a thought</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {recentEntries.map((entry) => {
              const dateObj = entry.createdAt && typeof entry.createdAt.toDate === 'function' 
                ? entry.createdAt.toDate() 
                : new Date(entry.createdAt);
              const dateStr = dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              const insight = extractInsightPreview(entry);

              return (
                <div
                  key={entry.id}
                  onClick={onNavigateToHistory}
                  className="group bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] hover:border-[#8A7D70] dark:hover:border-[#524B44] rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#8A7D70] dark:text-[#8E8377]">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>

                    <h3 className="font-serif-journal text-base font-medium text-[#24211E] dark:text-[#FAF7F2] leading-snug">
                      {entry.title || (entry.type === 'habit' ? 'Making it easier' : 'Thought reflection')}
                    </h3>

                    {insight && (
                      <p className="font-serif-journal text-xs sm:text-[13px] text-[#6E6152] dark:text-[#BDB0A2] line-clamp-3 leading-relaxed italic">
                        &ldquo;{insight}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EAE2D5] dark:border-[#2A2623] flex items-center justify-between text-[11px] font-sans-ui text-[#8A7D70] dark:text-[#8E8377]">
                    <span className="group-hover:text-[#24211E] dark:group-hover:text-[#FAF7F2] transition-colors font-medium">
                      Read reflection
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-[#E8E2D8]/60 dark:border-[#2A2724]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-sans-ui text-[#9E9182] dark:text-[#7A7169]">
        <div className="flex items-center space-x-1.5 select-none">
          <Logo size={18} />
          <span className="font-serif-journal font-medium text-[#24211E] dark:text-[#EAE6E1]">Clarity</span>
        </div>
        <span className="text-[#8E8276] dark:text-[#6E645A] font-light">© 2026 Clarity. All rights reserved.</span>
        <span>Take your time.</span>
      </footer>
    </div>
  );
};
