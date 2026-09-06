import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChanged } from './firebase';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { DashboardHome } from './components/DashboardHome';
import { ConversationView } from './components/ConversationView';
import { SummarizeModal } from './components/SummarizeModal';
import { HistoryView } from './components/HistoryView';
import { NewReflectionModal } from './components/NewReflectionModal';
import { LimitationModal } from './components/LimitationModal';
import { subscribeUserUsage } from './services/usageService';
import { subscribeJournalEntries } from './services/entryService';
import { initSessionDoc } from './services/sessionService';
import { subscribeUserProfile, setHasSeenOnboarding } from './services/userService';
import { OnboardingWalkthrough } from './components/OnboardingWalkthrough';
import { TemplateId, JournalEntry, UserUsage, ChatMessage, StartSessionOptions } from './types';
import { ProductPromise, getSessionPromise, rotateLoginPromise } from './constants/promises';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean>(true);
  const [activePromise, setActivePromise] = useState<ProductPromise>(() => getSessionPromise());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNewReflectionModalOpen, setIsNewReflectionModalOpen] = useState(false);
  const [limitationModal, setLimitationModal] = useState<{ open: boolean; type: 'save' | 'retrospective' }>({
    open: false,
    type: 'save',
  });

  // App View State: 'dashboard' | 'history' | 'session'
  const [currentView, setCurrentView] = useState<'dashboard' | 'history' | 'session'>('dashboard');

  // Active Session State
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('habit-tracking');
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionOptions, setSessionOptions] = useState<StartSessionOptions | undefined>(undefined);
  
  // Summarize Modal State
  const [summarizeSession, setSummarizeSession] = useState<{
    open: boolean;
    messages: ChatMessage[];
  }>({ open: false, messages: [] });

  // Usage and Entries State
  const [usage, setUsage] = useState<UserUsage>({
    dailySaveCount: 0,
    dailyGeminiCallCount: 0,
    lastResetDate: new Date().toISOString().slice(0, 10),
  });
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Rotate promise dynamically upon login
        const newPromise = rotateLoginPromise(user.uid);
        setActivePromise(newPromise);
      }
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        setCurrentView('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function checkAdmin() {
      try {
        if (currentUser) {
          const res = await currentUser.getIdTokenResult();
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
  }, [currentUser]);

  // 2. Subscriptions for user data
  useEffect(() => {
    if (!currentUser) {
      setEntries([]);
      return;
    }

    const unsubUsage = subscribeUserUsage(currentUser.uid, (data) => {
      setUsage(data);
    });

    const unsubEntries = subscribeJournalEntries(currentUser.uid, (data) => {
      setEntries(data);
    });

    return () => {
      unsubUsage();
      unsubEntries();
    };
  }, [currentUser]);

  // 3. Subscription for user profile (onboarding)
  useEffect(() => {
    if (!currentUser) {
      setHasSeenOnboardingState(true);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const unsubProfile = subscribeUserProfile(currentUser.uid, (profile) => {
      setHasSeenOnboardingState(profile.hasSeenOnboarding ?? false);
      setProfileLoading(false);
    });

    return () => {
      unsubProfile();
    };
  }, [currentUser]);

  const handleOnboardingComplete = async () => {
    if (currentUser) {
      setHasSeenOnboardingState(true);
      try {
        await setHasSeenOnboarding(currentUser.uid);
      } catch (err) {
        console.error('Failed to save onboarding completed state:', err);
      }
    }
  };

  // Start a new conversation session
  const handleStartSession = (templateId: TemplateId, options?: StartSessionOptions) => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Set view and state immediately - transition to actual chat session!
    setActiveTemplate(templateId);
    setActiveSessionId(newSessionId);
    setSessionOptions(options);
    setCurrentView('session');

    // Non-blocking background session document initialization
    const uid = currentUser?.uid || 'guest_user';
    initSessionDoc(uid, newSessionId, templateId).catch((err) => {
      console.warn('Background initSessionDoc notice:', err);
    });
  };

  const handleAttemptStartSession = (templateId: TemplateId, options?: StartSessionOptions) => {
    if (!isAdmin && (usage.dailySaveCount || 0) >= 5) {
      setLimitationModal({ open: true, type: 'save' });
      return;
    }
    handleStartSession(templateId, options);
  };

  const handleAttemptNewReflection = () => {
    if (!isAdmin && (usage.dailyRetrospectiveCount || 0) >= 1) {
      setLimitationModal({ open: true, type: 'retrospective' });
      return;
    }
    setIsNewReflectionModalOpen(true);
  };

  // Trigger Summarize Modal from active session
  const handleOpenSummarize = (messages: ChatMessage[]) => {
    setSummarizeSession({
      open: true,
      messages,
    });
  };

  // When an entry is saved successfully from the modal
  const handleEntrySaved = (newEntry: JournalEntry) => {
    setSummarizeSession({ open: false, messages: [] });
    setCurrentView('history');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#24211E] dark:bg-[#181716] dark:text-[#E8E4DF] flex flex-col items-center justify-center space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-[#7A6A58]" />
        <span className="font-serif-journal italic text-base">Opening Clarity...</span>
      </div>
    );
  }

  return !currentUser ? (
    <LandingPage />
  ) : (
    <div className="min-h-screen bg-[#FAF7F2] text-[#24211E] dark:bg-[#181716] dark:text-[#E8E4DF] transition-colors flex flex-col selection:bg-[#EAE2D5] dark:selection:bg-[#3D3732]">
      <Header
        user={currentUser}
        currentView={currentView === 'session' ? 'dashboard' : currentView}
        onNavigate={(view) => {
          setCurrentView(view);
        }}
        usage={usage}
        entriesCount={entries.length}
      />

      <main className="flex-1">
        {currentView === 'dashboard' && (
          <DashboardHome
            user={currentUser}
            onStartSession={handleAttemptStartSession}
            onNavigateToHistory={() => setCurrentView('history')}
            entries={entries}
            usage={usage}
            initialPromise={activePromise}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            entries={entries}
            onStartNewSession={handleAttemptNewReflection}
            onStartSession={handleAttemptStartSession}
          />
        )}

        {currentView === 'session' && (
          <ConversationView
            user={currentUser}
            templateId={activeTemplate}
            sessionId={activeSessionId}
            onBack={() => setCurrentView('dashboard')}
            onOpenSummarize={handleOpenSummarize}
            usage={usage}
            sessionOptions={sessionOptions}
          />
        )}
      </main>

      <LimitationModal
        isOpen={limitationModal.open}
        onClose={() => setLimitationModal((prev) => ({ ...prev, open: false }))}
        type={limitationModal.type}
      />

      {summarizeSession.open && (
        <SummarizeModal
          user={currentUser}
          templateId={activeTemplate}
          sessionId={activeSessionId}
          messages={summarizeSession.messages}
          usage={usage}
          onClose={() => setSummarizeSession({ open: false, messages: [] })}
          onSaved={handleEntrySaved}
        />
      )}

      {currentUser && (
        <NewReflectionModal
          isOpen={isNewReflectionModalOpen}
          onClose={() => setIsNewReflectionModalOpen(false)}
          user={currentUser}
          usage={usage}
          entries={entries}
          onStartSession={(templateId, options) => {
            setIsNewReflectionModalOpen(false);
            handleStartSession(templateId, options);
          }}
          onNavigateToHistory={() => {
            setIsNewReflectionModalOpen(false);
            setCurrentView('history');
          }}
          isAdmin={isAdmin}
        />
      )}

      {currentUser && currentView === 'dashboard' && !hasSeenOnboarding && !profileLoading && (
        <OnboardingWalkthrough
          uid={currentUser.uid}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
