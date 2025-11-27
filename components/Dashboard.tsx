import React, { useState } from 'react';
import { Plus, Calendar, Music, Trash2, ArrowRight, Menu, X, LayoutDashboard, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Playlist } from '../types';
import { ChordIdentifier } from './tools/ChordIdentifier';

interface Props {
  playlists: Playlist[];
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const Dashboard: React.FC<Props> = ({ playlists, onCreate, onSelect, onDelete }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'gigs' | 'chords'>('gigs');

  // Helper to close sidebar on mobile when selecting an item
  const handleViewChange = (view: 'gigs' | 'chords') => {
    setActiveView(view);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      {/* Mobile Toggle */}
      <button 
        className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-violet-600 text-white rounded-full shadow-2xl"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -250, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -250, opacity: 0 }}
            className={`
              fixed md:static inset-y-0 left-0 w-72 bg-zinc-950 border-r border-zinc-800 z-40 
              flex flex-col md:h-[calc(100vh-80px)] overflow-hidden
            `}
          >
             {/* Sidebar Header (Mobile only really needs it, but good for consistency if we wanted it) */}
             <div className="p-6 md:hidden flex items-center gap-3 border-b border-zinc-800">
                <span className="font-bold text-white text-xl">Menu</span>
             </div>

             <div className="p-6 space-y-8 mt-4 md:mt-0">
                {/* Main Section */}
                <div>
                   <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider mb-4 px-3">Main</h3>
                   <button
                     onClick={() => handleViewChange('gigs')}
                     className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all font-semibold text-lg mb-2 ${
                       activeView === 'gigs'
                         ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                         : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                     }`}
                   >
                     <LayoutDashboard size={24} />
                     <span>My Gigs</span>
                   </button>
                </div>

                {/* Tools Section */}
                <div>
                   <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider mb-4 px-3">Tools</h3>
                   <button
                     onClick={() => handleViewChange('chords')}
                     className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all font-semibold text-lg ${
                       activeView === 'chords'
                         ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20'
                         : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                     }`}
                   >
                     <Wand2 size={24} />
                     <span>Chord Identifier</span>
                   </button>
                </div>
             </div>

             {/* Footer Info */}
             <div className="mt-auto p-6 border-t border-zinc-800">
                <div className="text-sm text-zinc-500 text-center font-medium">
                  GigFlow v1.0.2
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)] bg-[#09090b]">
        {activeView === 'gigs' ? (
          <div className="max-w-6xl mx-auto px-6 py-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <h1 className="text-5xl font-black tracking-tight text-white mb-3">My Gigs</h1>
                <p className="text-zinc-400 text-lg">Manage your setlists and performance assets.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCreate}
                className="flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] transition-all border border-violet-500"
              >
                <Plus size={24} />
                Create New Gig
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Create New Card (Visual shortcut) */}
              <motion.button
                onClick={onCreate}
                whileHover={{ y: -5 }}
                className="group relative h-72 rounded-2xl border-2 border-dashed border-violet-500 bg-zinc-900/50 flex flex-col items-center justify-center gap-4 transition-all overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]"
              >
                <div className="p-5 rounded-full bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                  <Plus size={40} />
                </div>
                <span className="font-semibold text-xl text-violet-200/90 group-hover:text-violet-100">Create New Gig</span>
              </motion.button>

              {/* Playlist Cards */}
              {playlists.map((playlist) => (
                <motion.div
                  key={playlist.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -8 }}
                  onClick={() => onSelect(playlist.id)}
                  className="group relative h-72 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-8 flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-black/50 transition-all overflow-hidden"
                >
                  {/* Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-zinc-800 rounded-2xl text-violet-400 group-hover:text-white group-hover:bg-violet-500 transition-colors shadow-inner">
                        <Music size={28} />
                      </div>
                      <button
                        onClick={(e) => onDelete(playlist.id, e)}
                        className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors z-20"
                        title="Delete Gig"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 group-hover:text-violet-200 transition-colors leading-tight">
                      {playlist.name}
                    </h3>
                  </div>

                  <div className="relative z-10 border-t border-zinc-800 pt-5 flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Created</span>
                      <div className="flex items-center gap-2 text-zinc-300 text-base font-medium">
                        <Calendar size={16} />
                        {new Date(playlist.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Items</span>
                      <span className="text-zinc-200 font-mono font-bold text-xl">{playlist.items.length}</span>
                    </div>
                  </div>

                  {/* Hover Action */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
                    <ArrowRight size={80} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <ChordIdentifier />
          </div>
        )}
      </div>
    </div>
  );
};