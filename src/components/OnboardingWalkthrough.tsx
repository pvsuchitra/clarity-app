import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Sparkles, BookOpen, Bookmark, ArrowRight, ArrowLeft, X, HelpCircle } from 'lucide-react';

interface OnboardingWalkthroughProps {
  uid: string;
  onComplete: () => void;
}

const steps = [
  {
    number: 1,
    title: "Drop a thought",
    text: "Type anything on your mind, we'll help you figure out whether it's a habit to build or a thought to untangle.",
    targetId: "onboarding-step-1-target",
    icon: Sparkles
  },
  {
    number: 2,
    title: "Talk it through",
    text: "Or start from one of these, if any feels closer to where you are right now.",
    targetId: "onboarding-step-2-target",
    icon: HelpCircle
  },
  {
    number: 3,
    title: "Your Archive",
    text: "Everything you save lives here, filterable and searchable, whenever you want to look back.",
    targetId: "onboarding-step-3-target",
    icon: BookOpen
  },
  {
    number: 4,
    title: "Daily Allowance",
    text: "You get 5 saves a day, on purpose, it keeps you distilling what matters rather than piling up drafts.",
    targetId: "onboarding-step-4-target",
    icon: Bookmark
  },
  {
    number: 5,
    title: "Start wherever you are",
    text: "That's it. Start wherever you are.",
    targetId: "",
    icon: Logo
  }
];

export const OnboardingWalkthrough: React.FC<OnboardingWalkthroughProps> = ({ uid, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    const updateCoords = () => {
      if (!currentStep.targetId) {
        setCoords(null);
        return;
      }
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    
    // Retry shortly in case layout is rendering/transitioning
    const timer = setTimeout(updateCoords, 250);

    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [stepIndex, currentStep.targetId]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Determine dynamic placement for the desktop tooltip card
  let tooltipStyle: React.CSSProperties = {};
  if (coords) {
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      // Anchored overlay positions for smaller screens
      if (currentStep.number === 3 || currentStep.number === 4) {
        tooltipStyle = {
          position: 'fixed',
          top: coords.top + coords.height + 16,
          left: '16px',
          right: '16px',
        };
      } else {
        tooltipStyle = {
          position: 'fixed',
          bottom: '24px',
          left: '16px',
          right: '16px',
        };
      }
    } else {
      const tooltipWidth = 340;
      let left = coords.left + (coords.width - tooltipWidth) / 2;
      left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
      
      let top = coords.top + coords.height + 12;
      
      // Step 2 is lower on screen, position tooltip above it
      if (currentStep.number === 2) {
        top = coords.top - 180;
      }

      tooltipStyle = {
        position: 'fixed',
        top: top,
        left: left,
        width: `${tooltipWidth}px`,
      };
    }
  }

  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto">
      {/* 1. Backdrop overlay with spotlight effect */}
      {coords ? (
        <>
          {/* Spotlight highlight div with giant box shadow */}
          <div
            className="fixed transition-all duration-300 ease-out border-2 border-[#C4B5A5] dark:border-[#524B44] rounded-2xl pointer-events-none"
            style={{
              top: coords.top - 6,
              left: coords.left - 6,
              width: coords.width + 12,
              height: coords.height + 12,
              boxShadow: '0 0 0 9999px rgba(15, 13, 11, 0.7)',
              zIndex: 51,
            }}
          />
          {/* Unclickable blocker for clicks outside the tooltip */}
          <div className="fixed inset-0 bg-transparent z-50 pointer-events-auto" />
        </>
      ) : (
        /* Normal fullscreen dim backdrop for center steps */
        <div className="fixed inset-0 bg-[#0F0D0B]/75 z-50 flex items-center justify-center p-4" />
      )}

      {/* 2. Tooltip Card container */}
      <div 
        className="z-[52] transition-all duration-300"
        style={
          coords 
            ? tooltipStyle 
            : {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '380px',
                maxWidth: 'calc(100vw - 32px)',
              }
        }
      >
        <div className="p-6 bg-[#FAF7F2] dark:bg-[#201D1A] border border-[#DDD3C4] dark:border-[#2F2A26] rounded-2xl shadow-xl flex flex-col space-y-4">
          
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EAE2D5] dark:bg-[#2C2825] flex items-center justify-center border border-[#D5CBBF] dark:border-[#3D3833] text-[#5C4D3E] dark:text-[#C5B7A8]">
                {StepIcon === Logo ? (
                  <Logo size={18} />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <h4 className="font-serif-journal text-lg font-semibold text-[#24211E] dark:text-[#FAF7F2]">
                {currentStep.title}
              </h4>
            </div>
            
            <button
              onClick={handleSkip}
              className="text-xs text-[#8A7D70] dark:text-[#8E8377] hover:text-[#24211E] dark:hover:text-[#FAF7F2] transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Description */}
          <p className="font-serif-journal text-sm leading-relaxed text-[#5A4F44] dark:text-[#B8ACA0]">
            {currentStep.text}
          </p>

          {/* Progress Indicator and Nav Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D8] dark:border-[#2D2824] text-xs font-sans-ui">
            <div className="text-[#8A7D70] dark:text-[#8E8377]">
              Step {currentStep.number} of {steps.length}
            </div>

            <div className="flex items-center space-x-2">
              {stepIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="px-2.5 py-1.5 rounded-lg border border-[#DDD3C4] dark:border-[#2F2A26] text-[#6E645A] dark:text-[#A89F95] hover:bg-[#EAE2D5]/50 dark:hover:bg-[#2C2825] flex items-center space-x-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-3.5 py-1.5 rounded-lg bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] font-medium flex items-center space-x-1 transition-all"
              >
                <span>{currentStep.number === steps.length ? 'Got it' : 'Next'}</span>
                {currentStep.number < steps.length && <ArrowRight className="w-3 h-3" />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
