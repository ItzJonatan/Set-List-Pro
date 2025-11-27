import React, { useState } from 'react';
import { Plus, ListMusic, Music4, FileText, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Playlist, PlaylistItem, ItemType, RecordingItem } from '../types';
import { RecordingWidget } from './items/RecordingWidget';
import { SetlistWidget } from './items/SetlistWidget';
import { LyricsWidget } from './items/LyricsWidget';
import { Sidebar } from './Sidebar';
import { Mixer } from './Mixer';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface Props {
  playlist: Playlist;
  onUpdate: (updatedPlaylist: Playlist) => void;
  onBack: () => void;
}

export const PlaylistEditor: React.FC<Props> = ({ playlist, onUpdate, onBack }) => {
  const [activeView, setActiveView] = useState<'setlist' | 'mixer'>('setlist');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const addItem = (type: ItemType) => {
    let newItem: PlaylistItem;
    const base = {
      id: generateId(),
      title: '',
      createdAt: Date.now(),
    };

    switch (type) {
      case 'recording':
        newItem = { ...base, title: '', type: 'recording' };
        break;
      case 'setlist':
        newItem = { ...base, title: '', type: 'setlist', rows: [] };
        break;
      case 'lyrics':
        newItem = { ...base, title: '', type: 'lyrics', content: '', mode: 'text' };
        break;
    }

    onUpdate({
      ...playlist,
      items: [newItem, ...playlist.items]
    });
    setIsMenuOpen(false);
  };

  const updateItem = (updatedItem: PlaylistItem) => {
    onUpdate({
      ...playlist,
      items: playlist.items.map(item => item.id === updatedItem.id ? updatedItem : item)
    });
  };

  const deleteItem = (id: string) => {
    onUpdate({
      ...playlist,
      items: playlist.items.filter(item => item.id !== id)
    });
  };

  const handleSave = () => {
    console.log("Saving playlist...", playlist);
  };

  // Get recording items for mixer
  const recordingItems = playlist.items.filter(item => item.type === 'recording') as RecordingItem[];

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeView={activeView}
        onViewChange={setActiveView}
        onBack={onBack}
      />

      <div className={`flex-1 bg-[#09090b] relative flex flex-col ${activeView === 'mixer' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeView === 'setlist' ? (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 min-h-full">
            {/* Top Bar for Setlist View */}
            <div className="flex items-center justify-between mb-8 pl-12 md:pl-0">
               <div>
                 <h2 className="text-2xl font-bold text-white">{playlist.name}</h2>
                 <p className="text-zinc-400 text-sm">Manage your gig assets</p>
               </div>
               <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-colors shadow-lg shadow-zinc-900/20"
                >
                  <Save size={16} />
                  <span className="hidden sm:inline">Save Changes</span>
                </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key="setlist"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Add Button Area */}
                <div className="relative z-30">
                  {!isMenuOpen ? (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setIsMenuOpen(true)}
                      className="w-full py-4 rounded-xl border border-dashed border-violet-500/30 hover:border-violet-500/50 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-400 hover:text-violet-400 transition-all flex flex-col items-center justify-center gap-2 group shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                    >
                      <div className="p-3 rounded-full bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 transition-colors shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                        <Plus size={24} />
                      </div>
                      <span className="font-semibold text-sm uppercase tracking-wide text-violet-200/50 group-hover:text-violet-200">Add New Item</span>
                    </motion.button>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <button 
                        onClick={() => addItem('recording')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-red-500/30 hover:border-red-500/50 transition-all group shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                      >
                        <div className="p-3 rounded-full bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all shadow-[0_0_10px_rgba(220,38,38,0.2)]">
                          <Music4 size={24} />
                        </div>
                        <span className="text-sm font-medium text-red-200/80 group-hover:text-white">Recording</span>
                      </button>
                      
                      <button 
                        onClick={() => addItem('setlist')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-blue-500/30 hover:border-blue-500/50 transition-all group shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      >
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                          <ListMusic size={24} />
                        </div>
                        <span className="text-sm font-medium text-blue-200/80 group-hover:text-white">Setlist</span>
                      </button>

                      <button 
                        onClick={() => addItem('lyrics')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-pink-500/30 hover:border-pink-500/50 transition-all group shadow-[0_0_15px_rgba(236,72,153,0.15)] hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                      >
                        <div className="p-3 rounded-full bg-pink-500/10 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                          <FileText size={24} />
                        </div>
                        <span className="text-sm font-medium text-pink-200/80 group-hover:text-white">Lyrics</span>
                      </button>
                      
                      <button 
                        onClick={() => setIsMenuOpen(false)}
                        className="md:col-span-3 text-xs text-zinc-500 hover:text-zinc-300 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-6">
                  {playlist.items.length === 0 && !isMenuOpen && (
                    <div className="text-center py-20 opacity-30 select-none">
                      <Music4 size={64} className="mx-auto mb-4" />
                      <p className="text-xl font-bold">No items yet</p>
                      <p>Start by adding a setlist, lyrics, or recording.</p>
                    </div>
                  )}
                  
                  {playlist.items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                    >
                      {item.type === 'recording' && (
                        <RecordingWidget 
                          data={item as any} 
                          onUpdate={(d) => updateItem(d)} 
                          onDelete={() => deleteItem(item.id)}
                        />
                      )}
                      {item.type === 'setlist' && (
                        <SetlistWidget 
                          data={item as any} 
                          onUpdate={(d) => updateItem(d)} 
                          onDelete={() => deleteItem(item.id)}
                        />
                      )}
                      {item.type === 'lyrics' && (
                        <LyricsWidget 
                          data={item as any} 
                          onUpdate={(d) => updateItem(d)} 
                          onDelete={() => deleteItem(item.id)}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-full w-full">
            <Mixer recordings={recordingItems} />
          </div>
        )}
      </div>
    </div>
  );
};