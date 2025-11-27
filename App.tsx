import React, { useState, useEffect } from 'react';
import { ListMusic, Loader2 } from 'lucide-react';
import { Playlist } from './types';
import { ClickEffect } from './components/ui/ClickEffect';
import { Dashboard } from './components/Dashboard';
import { PlaylistEditor } from './components/PlaylistEditor';
import { AudioProvider } from './components/AudioProvider';
import { getPlaylistsFromDB, savePlaylistsToDB } from './db';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // State for all playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // State for navigation
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Load from Persistence (IndexedDB with LocalStorage fallback/migration)
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Try IndexedDB first
        const dbData = await getPlaylistsFromDB();
        
        if (dbData && dbData.length > 0) {
          setPlaylists(dbData);
        } else {
          // 2. Check LocalStorage for migration
          const lsData = localStorage.getItem('gigflow_playlists');
          if (lsData) {
            try {
              const parsed = JSON.parse(lsData);
              setPlaylists(parsed);
              // It will save to DB automatically in the next effect
              console.log("Migrated data from LocalStorage to IndexedDB");
            } catch (e) {
              console.error("Migration failed", e);
            }
          } else {
            // 3. Default state
            setPlaylists([
              {
                id: 'demo-1',
                name: 'Saturday Night Gig',
                createdAt: Date.now(),
                items: []
              }
            ]);
          }
        }
      } catch (e) {
        console.error("Failed to load playlists:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  // Save to Persistence (Debounced)
  useEffect(() => {
    if (!isLoaded) return;

    const save = async () => {
      try {
        await savePlaylistsToDB(playlists);
      } catch (e) {
        console.error("Database Save Failed:", e);
      }
    };

    const timeoutId = setTimeout(save, 1000); // Debounce saves by 1 second
    return () => clearTimeout(timeoutId);
  }, [playlists, isLoaded]);

  const handleCreatePlaylist = () => {
    const newPlaylist: Playlist = {
      id: generateId(),
      name: 'New Untitled Gig',
      createdAt: Date.now(),
      items: []
    };
    setPlaylists([newPlaylist, ...playlists]);
    setActivePlaylistId(newPlaylist.id);
  };

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this gig?')) {
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (activePlaylistId === id) setActivePlaylistId(null);
    }
  };

  const handleUpdatePlaylist = (updatedPlaylist: Playlist) => {
    setPlaylists(prev => 
      prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p)
    );
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="text-sm font-medium tracking-wide animate-pulse">Initializing Database...</p>
      </div>
    );
  }

  return (
    <AudioProvider>
      <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 relative selection:bg-violet-500/30 font-sans">
        <ClickEffect />
        
        {/* Global Header */}
        <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePlaylistId(null)}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <ListMusic className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight">GigFlow</h1>
                <p className="text-xs text-zinc-500 font-medium">Musician's Toolkit</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {activePlaylistId && (
                <button 
                  onClick={() => setActivePlaylistId(null)}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Back to Dashboard
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Router */}
        <main className="relative">
          {activePlaylistId && activePlaylist ? (
            <PlaylistEditor 
              playlist={activePlaylist}
              onUpdate={handleUpdatePlaylist}
              onBack={() => setActivePlaylistId(null)}
            />
          ) : (
            <Dashboard 
              playlists={playlists}
              onCreate={handleCreatePlaylist}
              onSelect={setActivePlaylistId}
              onDelete={handleDeletePlaylist}
            />
          )}
        </main>
      </div>
    </AudioProvider>
  );
};

export default App;