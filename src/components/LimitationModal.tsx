import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface LimitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'save' | 'retrospective';
}

export const LimitationModal: React.FC<LimitationModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  if (!isOpen) return null;

  const isSave = type === 'save';
  const title = isSave ? "You've used today's reflections" : "One insight a day";
  const body = isSave
    ? "You've saved 5 thoughts today, that's the whole point of the cap, distilling what matters rather than piling up drafts. A pause is part of the process too. Come back tomorrow and pick up where you left off."
    : "You've already generated an insight today. Sit with this one for a bit, there's more to notice on a re-read than in generating a second one right away. Come back tomorrow for your next one.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] dark:bg-[#1C1A18] border border-[#DDD3C4] dark:border-[#2F2A26] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#EAE2D5] dark:bg-[#2A2623] flex items-center justify-center mx-auto text-[#7A6A58] dark:text-[#C4B4A2]">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif-journal text-xl font-medium text-[#24211E] dark:text-[#FAF7F2]">
            {title}
          </h2>
          <p className="font-serif-journal text-sm text-[#6E6152] dark:text-[#BDB0A2] leading-relaxed">
            {body}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#2E2822] text-[#FAF7F2] hover:bg-[#1E1A16] dark:bg-[#EAE4DC] dark:text-[#201D1A] dark:hover:bg-[#FFF] font-sans-ui text-sm font-medium transition-all shadow-sm cursor-pointer"
          >
            Okay
          </button>
          <p className="text-[11px] font-sans-ui text-[#8A7D70] dark:text-[#9E9182]">
            Resets at midnight.
          </p>
        </div>
      </div>
    </div>
  );
};
