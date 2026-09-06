import React, { useState } from 'react';
import { JournalEntry, EntryType, TemplateId, StartSessionOptions } from '../types';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  X, 
  Copy, 
  Check,
  Bookmark,
  Compass,
  Feather,
  Trash2,
  Sparkle,
  Sun
} from 'lucide-react';
import { auth } from '../firebase';
import { deleteJournalEntry } from '../services/entryService';

interface HistoryViewProps {
  entries: JournalEntry[];
  onStartNewSession: () => void;
  onStartSession?: (templateId: TemplateId, options?: StartSessionOptions) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  entries,
  onStartNewSession,
  onStartSession,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setIsDeleting(true);
      await deleteJournalEntry(uid, deleteConfirmId);
      if (selectedEntry?.id === deleteConfirmId) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.title && entry.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Archive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E2D8] dark:border-[#2A2724]">
        <div>
          <div className="flex items-center space-x-2 text-xs font-sans-ui text-[#8A7D70] dark:text-[#9E9182] uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Personal Journal Archive</span>
          </div>
          <h1 className="font-serif-journal text-3xl font-medium text-[#24211E] dark:text-[#FAF7F2]">
            Pages of Clarity
          </h1>
          <p className="font-serif-journal text-sm text-[#5A4E42] dark:text-[#B8ACA0] mt-1">
            Browse, reflect, and revisit your saved habit blueprints and journal reflections.
          </p>
        </div>

        <button
          onClick={onStartNewSession}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] font-sans-ui text-xs sm:text-sm font-medium transition-all shadow-sm"
        >
          ✦ New Insight
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Entries' },
            { id: 'habit', label: 'Habits' },
            { id: 'journal', label: 'Reflections' },
            { id: 'retrospective', label: 'Insights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans-ui font-medium transition-colors ${
                filterType === tab.id
                  ? 'bg-[#2E2822] text-[#FAF7F2] dark:bg-[#EAE4DC] dark:text-[#201D1A]'
                  : 'bg-[#F5F0E6] text-[#6E6152] hover:bg-[#EAE2D5] dark:bg-[#201D1A] dark:text-[#A89F95] dark:hover:bg-[#2C2825]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#8A7D70] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search journal entries..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] font-sans-ui text-xs text-[#24211E] dark:text-[#FAF7F2] outline-none focus:border-[#A89684]"
          />
        </div>
      </div>

      {/* Entries List - Date First Paper Cards */}
      {filteredEntries.length === 0 ? (
        <div className="bg-[#F5F0E6]/50 dark:bg-[#201D1A]/50 border border-dashed border-[#DDD3C4] dark:border-[#38322C] rounded-2xl p-12 text-center space-y-3">
          {entries.length === 0 ? (
            <>
              <p className="font-serif-journal text-lg sm:text-xl text-[#24211E] dark:text-[#FAF7F2]">
                Nothing here yet. That&apos;s okay.
              </p>
              <p className="font-serif-journal text-sm text-[#7A6D60] dark:text-[#9E9182] max-w-sm mx-auto leading-relaxed">
                Most clarity starts as something messy.
              </p>
              <div className="pt-2">
                <button
                  onClick={onStartNewSession}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] text-xs font-sans-ui font-medium transition-colors"
                >
                  <span>Start with a thought</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <BookOpen className="w-8 h-8 text-[#8A7D70] mx-auto opacity-70" />
              <h3 className="font-serif-journal text-lg text-[#24211E] dark:text-[#FAF7F2]">
                No entries match your search.
              </h3>
              <p className="text-xs text-[#8A7D70] dark:text-[#8E8377] max-w-sm mx-auto font-sans-ui">
                Try clearing your search query or selecting a different filter.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredEntries.map((entry) => {
            const date = entry.createdAt && typeof entry.createdAt.toDate === 'function' 
              ? entry.createdAt.toDate() 
              : new Date(entry.createdAt);
            const dateFormatted = date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            const timeFormatted = date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const getIcon = (type: string) => {
              if (type === 'habit') return Compass;
              if (type === 'retrospective') return Sparkle;
              return Feather;
            };
            const Icon = getIcon(entry.type);

            return (
              <article
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="group bg-[#F5F0E6] dark:bg-[#201D1A] border border-[#E2D8C8] dark:border-[#2F2A26] hover:border-[#C4B4A2] dark:hover:border-[#4D453E] rounded-2xl p-6 cursor-pointer transition-all shadow-sm hover:shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Date First Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8DFC8] dark:border-[#2C2723] text-xs font-sans-ui text-[#8A7D70] dark:text-[#8E8377]">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-medium">{dateFormatted}</span>
                      <span>&bull;</span>
                      <span>{timeFormatted}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[#EAE2D5] text-[#5C4D3E] dark:bg-[#2D2824] dark:text-[#C5B7A8] flex items-center space-x-1">
                        <Icon className="w-3 h-3" />
                        <span>{entry.type === 'retrospective' ? 'Insight' : entry.type}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(entry.id);
                        }}
                        className="p-1.5 rounded-lg text-[#8A7D70] hover:text-red-600 dark:text-[#8E8377] dark:hover:text-red-400 hover:bg-[#EAE2D5] dark:hover:bg-[#2D2824] transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif-journal text-xl font-medium text-[#24211E] dark:text-[#FAF7F2] group-hover:text-[#4A3D30] dark:group-hover:text-[#FFF] transition-colors line-clamp-1">
                    {entry.title || (entry.type === 'habit' ? 'Habit Blueprint' : 'Journal Reflection')}
                  </h3>
                  {entry.title === 'Weekly Insight' && (
                    <p className="text-xs font-sans-ui text-[#8A7D70] dark:text-[#9E9182] mt-0.5">
                      {(() => {
                        const date = entry.createdAt && typeof entry.createdAt.toDate === 'function' ? entry.createdAt.toDate() : new Date(entry.createdAt || Date.now());
                        const pastDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
                        const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        return `${fmt(pastDate)} – ${fmt(date)}`;
                      })()}
                    </p>
                  )}

                  {/* Content Preview */}
                  <p className="font-serif-journal text-sm text-[#5A4E42] dark:text-[#B8ACA0] leading-relaxed line-clamp-4 whitespace-pre-line">
                    {entry.content}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E8DFC8] dark:border-[#2C2723] flex items-center justify-between text-xs font-sans-ui text-[#7A6A58] dark:text-[#C4B4A2]">
                  <span className="font-medium flex items-center space-x-1">
                    <span>Open full page</span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                  </span>
                  {(entry.type === 'habit' || entry.type === 'journal') && onStartSession ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const templateId = entry.type === 'habit' ? 'habit-tracking' : 'journal-reflection';
                        onStartSession(templateId, {
                          initialUserMessage: entry.content,
                          starterTitle: entry.title ? `Continuing: ${entry.title}` : `Continuing ${entry.type === 'habit' ? 'Habit' : 'Thought'}`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] text-[11px] font-medium flex items-center space-x-1.5 transition-all shadow-xs"
                    >
                      <Feather className="w-3.5 h-3.5" />
                      <span>Continue thought</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#9E9182]">Tap to read</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Expandable Journal Page Reader Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-[#FAF7F2] dark:bg-[#1C1917] border border-[#E2D8C8] dark:border-[#2C2825] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Reader Header */}
            <div className="px-6 py-4 border-b border-[#E8E2D8] dark:border-[#2A2724] flex items-center justify-between bg-[#F5F0E6] dark:bg-[#221F1C]">
              <div className="flex items-center space-x-2 text-xs font-sans-ui text-[#7A6D60] dark:text-[#A89C8E]">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {(() => {
                    const dateObj = selectedEntry.createdAt && typeof selectedEntry.createdAt.toDate === 'function' 
                      ? selectedEntry.createdAt.toDate() 
                      : new Date(selectedEntry.createdAt);
                    return dateObj.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  })()}
                </span>
                <span>&bull;</span>
                <span className="capitalize font-medium">{selectedEntry.type} entry</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(selectedEntry.content)}
                  title="Copy Entry Text"
                  className="p-1.5 rounded-lg text-[#7A6D60] hover:text-[#24211E] dark:text-[#A89C8E] dark:hover:text-[#FAF7F2] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-1.5 rounded-lg text-[#7A6D60] hover:text-[#24211E] dark:text-[#A89C8E] dark:hover:text-[#FAF7F2] hover:bg-[#EAE2D5] dark:hover:bg-[#2C2825] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Paper Body */}
            <div className="p-8 sm:p-10 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-[#FAF7F2] dark:bg-[#181716]">
              <h2 className="font-serif-journal text-2xl sm:text-3xl font-medium text-[#24211E] dark:text-[#FAF7F2]">
                {selectedEntry.title || (selectedEntry.type === 'habit' ? 'Habit Formation Blueprint' : 'Reflective Clarity')}
              </h2>
              {selectedEntry.title === 'Weekly Insight' && (
                <p className="text-xs font-sans-ui text-[#8A7D70] dark:text-[#9E9182]">
                  {(() => {
                    const date = selectedEntry.createdAt && typeof selectedEntry.createdAt.toDate === 'function' ? selectedEntry.createdAt.toDate() : new Date(selectedEntry.createdAt || Date.now());
                    const pastDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    return `${fmt(pastDate)} – ${fmt(date)}`;
                  })()}
                </p>
              )}
              <div className="border-b pb-4 border-[#E8E2D8] dark:border-[#2A2724]"></div>

              <div className="font-serif-journal text-base sm:text-lg leading-relaxed text-[#24211E] dark:text-[#E8E4DF] whitespace-pre-wrap selection:bg-[#EAE2D5] dark:selection:bg-[#3D3732]">
                {selectedEntry.content}
              </div>

              {selectedEntry.type === 'retrospective' && onStartSession && (
                <div className="pt-6 border-t border-[#E8E2D8] dark:border-[#2A2724] flex items-center justify-between">
                  <span className="text-xs font-sans-ui text-[#7A6D60] dark:text-[#A89C8E]">
                    Want to explore this further?
                  </span>
                  <button
                    onClick={() => {
                      const lines = selectedEntry.content.split('\n').map(l => l.trim()).filter(Boolean);
                      const closingQuestion = lines[lines.length - 1] || selectedEntry.content;
                      setSelectedEntry(null);
                      onStartSession('journal-reflection', {
                        initialUserMessage: closingQuestion,
                        starterTitle: selectedEntry.title ? `Continuing: ${selectedEntry.title}` : 'Continuing Insight',
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] font-sans-ui text-xs font-medium flex items-center space-x-2 transition-all shadow-sm"
                  >
                    <Feather className="w-4 h-4" />
                    <span>Continue this thought</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reader Footer */}
            <div className="px-6 py-3.5 border-t border-[#E8E2D8] dark:border-[#2A2724] bg-[#F5F0E6] dark:bg-[#221F1C] flex items-center justify-between text-xs text-[#8A7D70] font-sans-ui">
              <span>Saved in Clarity Archive</span>
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-3 py-1 rounded-lg bg-[#2E2822] text-[#FAF7F2] dark:bg-[#EAE4DC] dark:text-[#201D1A] font-medium"
              >
                Close Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] dark:bg-[#1C1A18] border border-[#DDD3C4] dark:border-[#2F2A26] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-serif-journal text-lg font-medium text-[#24211E] dark:text-[#FAF7F2]">
                Remove this page?
              </h3>
              <p className="text-xs text-[#8A7D70] dark:text-[#9E9182] font-sans-ui max-w-[280px] mx-auto">
                This can't be undone.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl border border-[#DDD3C4] dark:border-[#2F2A26] text-xs font-medium font-sans-ui text-[#5A4E42] dark:text-[#C4B4A2] hover:bg-[#F5F0E6] dark:hover:bg-[#252220] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium font-sans-ui transition-colors disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
