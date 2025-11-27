import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Activity, Wand2, FileAudio, RotateCcw, Music2, Hash } from 'lucide-react';

interface Chord {
  time: number;
  name: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Schmuckler Key Profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export const ChordIdentifier: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ scale: string; chords: Chord[] } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [file]);

  // --- Audio Analysis Logic ---

  // 1. Autocorrelation for Pitch Detection
  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    const SIZE = buffer.length;
    let sumOfSquares = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      sumOfSquares += val * val;
    }
    
    const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
    if (rootMeanSquare < 0.01) return -1; // Not enough signal (silence)

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const sliced = buffer.slice(r1, r2);
    const c = new Float32Array(sliced.length);
    for (let i = 0; i < sliced.length; i++) {
      for (let j = 0; j < sliced.length - i; j++) {
        c[i] = c[i] + sliced[j] * sliced[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < sliced.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Parabolic interpolation
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  const noteFromPitch = (frequency: number) => {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    return midi;
  };

  const analyzeAudio = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setProgress(0);
    setResult(null);

    try {
      // 1. Decode Audio
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const pcmData = audioBuffer.getChannelData(0); // Use left channel
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;

      // 2. Process in chunks
      const chunkSize = 2048; // Size for autocorrelation
      const stepSize = Math.floor(sampleRate * 0.5); // Analyze every 0.5 seconds
      
      const detectedNotes: number[] = []; // MIDI numbers
      const timelineNotes: { time: number, noteIndex: number }[] = [];
      const chromaSum = new Array(12).fill(0);

      // Loop through audio
      for (let i = 0; i < pcmData.length; i += stepSize) {
        // Update progress UI
        if (i % (stepSize * 10) === 0) {
            setProgress(Math.round((i / pcmData.length) * 100));
            await new Promise(r => setTimeout(r, 0));
        }

        const chunk = pcmData.slice(i, i + chunkSize);
        if (chunk.length < chunkSize) break;

        // Detect Pitch
        const frequency = autoCorrelate(chunk, sampleRate);
        
        if (frequency !== -1 && frequency > 30 && frequency < 2000) {
          const midi = noteFromPitch(frequency);
          const noteIndex = midi % 12;
          
          detectedNotes.push(midi);
          chromaSum[noteIndex]++;
          
          timelineNotes.push({
            time: i / sampleRate,
            noteIndex: noteIndex
          });
        }
      }

      // 3. Determine Key (Krumhansl-Schmuckler)
      let bestCorrelation = -1;
      let bestKeyIndex = -1;
      let bestMode = 'Major'; // or 'Minor'

      // Check Major
      for (let i = 0; i < 12; i++) {
        let correlation = 0;
        for (let j = 0; j < 12; j++) {
           correlation += chromaSum[(i + j) % 12] * MAJOR_PROFILE[j];
        }
        if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestKeyIndex = i;
            bestMode = 'Major';
        }
      }

      // Check Minor
      for (let i = 0; i < 12; i++) {
        let correlation = 0;
        for (let j = 0; j < 12; j++) {
           correlation += chromaSum[(i + j) % 12] * MINOR_PROFILE[j];
        }
        if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestKeyIndex = i;
            bestMode = 'Minor';
        }
      }

      const detectedScale = `${NOTE_NAMES[bestKeyIndex]} ${bestMode}`;
      console.log("Detected Scale:", detectedScale);

      // 4. Generate Chords Timeline
      const chords: Chord[] = [];
      
      // Diatonic map logic
      const getChordQuality = (noteIdx: number, keyIdx: number, mode: string) => {
         const interval = (noteIdx - keyIdx + 12) % 12;
         if (mode === 'Major') {
             if ([0, 5, 7].includes(interval)) return ''; // Major
             if ([2, 4, 9].includes(interval)) return 'm'; // Minor
             if (interval === 11) return 'dim';
         }
         if (mode === 'Minor') {
             if ([0, 5, 7].includes(interval)) return 'm';
             if ([3, 8, 10].includes(interval)) return '';
             if (interval === 2) return 'dim';
         }
         return '';
      };

      // Filter and smooth timeline
      let lastChordName = '';
      let lastChordTime = -5;

      timelineNotes.forEach(point => {
          const rootName = NOTE_NAMES[point.noteIndex];
          const quality = getChordQuality(point.noteIndex, bestKeyIndex, bestMode);
          const chordName = `${rootName}${quality}`;

          if (chordName !== lastChordName && (point.time - lastChordTime > 1.5)) {
              chords.push({ time: point.time, name: chordName });
              lastChordName = chordName;
              lastChordTime = point.time;
          }
      });

      setResult({ scale: detectedScale, chords });

    } catch (e) {
      console.error("Analysis failed:", e);
      alert("Analysis failed. The file might be corrupted or format unsupported.");
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(f);
      setAudioUrl(url);
      setFile(f);
      setResult(null);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (err) {
          console.error("Playback interrupted:", err);
          setIsPlaying(false);
        }
      }
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    setFile(null);
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    }
    setResult(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
  };

  // Simple Waveform Visualizer
  useEffect(() => {
    if (!file) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3f3f46';
    
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = 2;
    const gap = 1;
    const bars = Math.floor(width / (barWidth + gap));

    for (let i = 0; i < bars; i++) {
        const h = result ? Math.random() * height * 0.6 + 10 : Math.random() * height * 0.3;
        const y = (height - h) / 2;
        ctx.fillRect(i * (barWidth + gap), y, barWidth, h);
    }
  }, [file, result]);

  // Derived State for UI
  const currentChord = result?.chords.reduce((prev, curr) => {
    return curr.time <= currentTime ? curr : prev;
  }, result.chords[0]);

  const currentChordIndex = result?.chords.findIndex(c => c === currentChord) ?? -1;

  // Auto-scroll logic
  useEffect(() => {
    if (currentChordIndex !== -1 && scrollContainerRef.current) {
      const el = scrollContainerRef.current.children[currentChordIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentChordIndex]);

  // Visual Helpers
  const getChordColor = (name: string, isActive: boolean) => {
    if (isActive) return 'bg-white text-black border-white scale-110 shadow-lg shadow-white/20';
    
    if (name.includes('dim')) return 'bg-orange-950/30 text-orange-400 border-orange-500/30 hover:border-orange-500';
    if (name.includes('m') && !name.includes('Maj')) return 'bg-cyan-950/30 text-cyan-400 border-cyan-500/30 hover:border-cyan-500';
    return 'bg-pink-950/30 text-pink-400 border-pink-500/30 hover:border-pink-500'; // Major
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Wand2 className="text-pink-500" /> Smart Chord Identifier
        </h2>
        <p className="text-zinc-400">Upload a song to detect its key scale and view the chord progression.</p>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-20 flex flex-col items-center justify-center text-zinc-500 hover:border-pink-500/50 hover:bg-zinc-900/30 transition-all group relative overflow-hidden bg-zinc-900/50">
          <input 
            type="file" 
            accept="audio/*"
            onChange={handleFileUpload} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <div className="p-6 bg-zinc-800 rounded-full mb-6 group-hover:scale-110 transition-transform shadow-2xl">
            <Upload size={48} className="text-zinc-400 group-hover:text-pink-400" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-300 mb-2">Drop your audio file here</h3>
          <p className="text-base font-medium">Supports MP3, WAV, FLAC, M4A</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header & Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <audio ref={audioRef} src={audioUrl || undefined} className="hidden" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20 flex-shrink-0">
                    <FileAudio className="text-white" size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate max-w-[300px]">{file.name}</h3>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-bold mt-1">
                      <Activity size={12} />
                      <span>{isAnalyzing ? 'Processing...' : result ? 'Analysis Complete' : 'Ready'}</span>
                    </div>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                 {!result && !isAnalyzing && (
                    <button 
                      onClick={analyzeAudio}
                      className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold shadow-lg shadow-pink-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Wand2 size={18} /> Analyze Chords
                    </button>
                  )}
                  <button 
                    onClick={handleReset} 
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Upload New"
                  >
                    <RotateCcw size={18} />
                  </button>
              </div>
            </div>

            {/* Timeline & Waveform */}
            <div className="relative mb-6 group">
                {/* Canvas Visualizer */}
                <div className="h-32 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative">
                    <canvas ref={canvasRef} width={1200} height={128} className="w-full h-full opacity-60" />
                    
                    {/* Progress Fill */}
                    <div 
                        className="absolute top-0 bottom-0 left-0 bg-pink-500/10 border-r border-pink-500 pointer-events-none transition-all duration-75"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    
                    {/* Analysis Overlay */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-mono text-pink-400 mt-2">ANALYZING WAVEFORM...</span>
                        </div>
                    )}

                    {/* Simple Timeline Markers (No text to avoid clutter) */}
                    {result && !isAnalyzing && result.chords.map((chord, i) => (
                        <div 
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-white/10 group-hover:bg-white/20 transition-colors pointer-events-none"
                            style={{ left: `${(chord.time / duration) * 100}%` }}
                        />
                    ))}
                </div>

                {/* Seeker */}
                <input 
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.01}
                    value={currentTime}
                    onChange={(e) => {
                        const t = parseFloat(e.target.value);
                        setCurrentTime(t);
                        if (audioRef.current) audioRef.current.currentTime = t;
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-center gap-6">
                <span className="text-sm font-mono text-zinc-500 w-12 text-right">
                    {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                </span>
                
                <button 
                  onClick={togglePlay}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 active:scale-95 ${
                      isPlaying 
                      ? 'bg-pink-500 shadow-pink-500/40' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                </button>

                <span className="text-sm font-mono text-zinc-500 w-12">
                    {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                </span>
            </div>
          </div>

          {/* Results Area */}
          {result && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Now Playing Card */}
                  <div className="lg:col-span-1 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50" />
                      
                      <div className="mb-6">
                          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Detected Key</span>
                          <div className="text-2xl font-black text-white flex items-center justify-center gap-2">
                              <Music2 size={24} className="text-violet-500" />
                              {result.scale}
                          </div>
                      </div>

                      <div className="w-full h-px bg-zinc-800 mb-6" />

                      <div className="relative">
                          <span className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-2 block animate-pulse">Current Chord</span>
                          <div className={`text-6xl font-black tracking-tighter ${
                              (currentChord?.name || '').includes('m') ? 'text-cyan-400' : 'text-pink-500'
                          }`}>
                              {currentChord?.name || '--'}
                          </div>
                          {currentChord && (
                             <div className="mt-2 text-zinc-500 font-mono text-base">
                                 {Math.floor(currentChord.time / 60)}:{Math.floor(currentChord.time % 60).toString().padStart(2, '0')}
                             </div>
                          )}
                      </div>
                  </div>

                  {/* Chord Sheet / Progression Grid */}
                  <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                              <Hash size={18} className="text-zinc-500" />
                              Chord Progression
                          </h4>
                          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                              {result.chords.length} Chords
                          </span>
                      </div>
                      
                      <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto max-h-[300px] grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-2 bg-zinc-950/50 rounded-xl border border-zinc-800/50"
                      >
                          {result.chords.map((chord, idx) => {
                              const isActive = currentChord === chord;
                              return (
                                  <button
                                      key={idx}
                                      onClick={() => {
                                          if(audioRef.current) {
                                              audioRef.current.currentTime = chord.time;
                                              setCurrentTime(chord.time);
                                          }
                                      }}
                                      className={`
                                        relative group flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300
                                        ${getChordColor(chord.name, isActive)}
                                      `}
                                  >
                                      <span className="text-xl font-black tracking-tight">{chord.name}</span>
                                      <span className={`text-xs font-mono mt-1 ${isActive ? 'text-black/60 font-bold' : 'text-zinc-500'}`}>
                                          {Math.floor(chord.time / 60)}:{Math.floor(chord.time % 60).toString().padStart(2, '0')}
                                      </span>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              </div>
          )}

        </div>
      )}
    </div>
  );
};