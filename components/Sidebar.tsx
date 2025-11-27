import React from 'react';
import { ListMusic, Sliders, Menu, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  activeView: 'setlist' | 'mixer';
  onViewChange: (view: 'setlist' | 'mixer') => void;
  onBack: () => void;
}

export const Sidebar: React.FC<Props> = ({ isOpen, onToggle, activeView, onViewChange, onBack }) => {
  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={onToggle}
        className="fixed top-24 left-4 z-50 p-3 bg-zinc-900 border border-zinc-700 text-white rounded-lg shadow-lg hover:bg-zinc-800 transition-colors md:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.div
        className={`fixed top-0 bottom-0 left-0 w-72 bg-zinc-950 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:h-[calc(100vh-80px)] md:border-none md:bg-transparent`}
      >
        <div className="p-6 h-full flex flex-col">
           <div className="flex items-center gap-3 mb-8 md:hidden">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <ListMusic className="text-white" size={20} />
            </div>
            <span className="font-bold text-white text-lg">GigFlow</span>
          </div>

          <div className="space-y-4">
            <div className="text-base font-bold text-zinc-400 uppercase tracking-wider mb-2 px-3">Menu</div>
            
            <button
              onClick={() => { onViewChange('setlist'); onToggle(); }}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all font-medium text-lg ${
                activeView === 'setlist' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <ListMusic size={24} />
              <span>Gig Overview</span>
            </button>

            <button
              onClick={() => { onViewChange('mixer'); onToggle(); }}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all font-medium text-lg ${
                activeView === 'mixer' 
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Sliders size={24} />
              <span>Pro Mixer</span>
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-800">
            <button
              onClick={onBack}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all font-medium text-base"
            >
              <ArrowLeft size={22} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};