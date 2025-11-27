import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Music4, Activity, AlertCircle, RotateCcw, Layers, Plus, X, Minus, Speaker, Sliders } from 'lucide-react';
import { RecordingItem } from '../types';
import { Knob } from './ui/Knob';
import { useAudio } from './AudioProvider';

interface Props {
  recordings: RecordingItem[];
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const Mixer: React.FC<Props> = ({ recordings }) => {
  // Global Audio State
  const { 
    currentId, 
    isPlaying, 
    currentTime, 
    duration, 
    analyserNode,
    mixerSettings,
    detectedKey,
    playTrack, 
    togglePlay, 
    seek, 
    setMixerSetting,
    resetMixer
  } = useAudio();

  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Auto-activate layers if settings are non-default
  useEffect(() => {
    const layers = [];
    if (mixerSettings.pitch !== 0) layers.push('Transpose');
    if (mixerSettings.tremoloDepth > 0) layers.push('Tremolo');
    setActiveLayers(prev => Array.from(new Set([...prev, ...layers])));
  }, []);

  const toggleLayer = (layer: string) => {
    if (activeLayers.includes(layer)) {
      setActiveLayers(activeLayers.filter(l => l !== layer));
      if (layer === 'Transpose') setMixerSetting('pitch', 0);
      if (layer === 'Tremolo') setMixerSetting('tremoloDepth', 0);
    } else {
      setActiveLayers([...activeLayers, layer]);
    }
    setShowLayerMenu(false);
  };

  const getTransposedKey = (originalKey: string | null, semitones: number) => {
    if (!originalKey) return 'Unknown';
    if (semitones === 0) return originalKey;

    const parts = originalKey.split(' ');
    const root = parts[0];
    const mode = parts.slice(1).join(' ');

    const rootIndex = NOTE_NAMES.indexOf(root);
    if (rootIndex === -1) return originalKey;

    let newIndex = (rootIndex + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    return `${NOTE_NAMES[newIndex]} ${mode}`;
  };

  // Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const draw = () => {
    if (!canvasRef.current || !analyserNode) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas if needed
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
       canvas.width = canvas.clientWidth;
       canvas.height = canvas.clientHeight;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
    for (let i = 0; i < canvas.height; i += 40) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
    ctx.stroke();
    
    // Draw spectrum
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 255 * canvas.height;
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#7c3aed'); // Violet 600
      gradient.addColorStop(0.5, '#db2777'); // Pink 600
      gradient.addColorStop(1, '#06b6d4'); // Cyan 500

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
    animationRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    if (analyserNode) draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [analyserNode, isPlaying]);

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* 1. Track Sidebar */}
      <div className="w-full md:w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 z-20 shadow-2xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
           <h3 className="text-base font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
             <Layers size={16} /> Tracks
           </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {recordings.length === 0 ? (
            <div className="text-zinc-500 text-sm text-center py-8">No recordings available.<br/>Add them in the overview.</div>
          ) : (
            recordings.map(rec => (
              <button
                key={rec.id}
                onClick={() => playTrack(rec.id, rec.audioUrl || '')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group ${
                  currentId === rec.id 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-md ${currentId === rec.id ? 'bg-white/20' : 'bg-black/40'}`}>
                    {currentId === rec.id && isPlaying ? <Activity size={18} className="animate-pulse" /> : <Music4 size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{rec.title || 'Untitled'}</div>
                  <div className={`text-xs truncate font-mono ${currentId === rec.id ? 'opacity-80' : 'text-zinc-500'}`}>{rec.fileName}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. Main Console */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header / Transport Bar */}
        <div className="h-20 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-8 flex items-center justify-between shrink-0 z-10">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border border-zinc-800">
                <span className="text-base font-mono text-zinc-300 font-bold">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => seek(parseFloat(e.target.value))}
                    className="w-48 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-base font-mono text-zinc-500 font-medium">{formatTime(duration)}</span>
              </div>
           </div>

           <div className="flex items-center gap-6">
              <button 
                  onClick={() => { togglePlay(); seek(0); }}
                  className="p-3 text-zinc-400 hover:text-white transition-colors"
                  title="Stop"
              >
                  <Square size={22} className="fill-current" />
              </button>
              <button 
                  onClick={togglePlay}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isPlaying 
                      ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]' 
                      : 'bg-white text-black hover:scale-105'
                  }`}
              >
                  {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
              </button>
           </div>
           
           <div>
              <button 
                onClick={() => { resetMixer(); setActiveLayers([]); }}
                className="text-sm font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-800"
              >
                <RotateCcw size={16} /> Reset
              </button>
           </div>
        </div>

        {/* Visualizer Area */}
        <div className="h-[28vh] min-h-[180px] bg-black relative border-b border-zinc-800 shrink-0">
           <canvas ref={canvasRef} className="w-full h-full" />
           {/* Overlay Info */}
           <div className="absolute top-6 left-8 flex flex-col gap-2 pointer-events-none">
              <span className="text-base font-bold text-zinc-400 uppercase tracking-widest bg-black/50 px-2 rounded">Master Output</span>
              {detectedKey && (
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 border border-violet-500/30 rounded text-base font-mono font-semibold text-violet-300 shadow-lg">
                    <Music4 size={16} /> {detectedKey}
                 </div>
              )}
           </div>
        </div>

        {/* Rack Mount Controls - Scrollable Area */}
        <div className="flex-1 bg-[#101012] p-8 overflow-y-auto custom-scrollbar">
           <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Module: Source & Dynamics */}
              <div className="lg:col-span-3 bg-zinc-900 rounded-lg border border-zinc-800 p-1.5 relative shadow-xl">
                 <div className="absolute top-3 left-3 right-3 flex justify-between px-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                 </div>
                 <div className="border border-zinc-800/60 rounded p-6 h-full flex flex-col bg-gradient-to-b from-zinc-900 to-zinc-900/50">
                    <h4 className="text-center text-zinc-400 text-base font-bold uppercase tracking-widest mb-8 border-b border-zinc-800 pb-3">Dynamics</h4>
                    <div className="flex-1 flex flex-wrap justify-center gap-x-6 gap-y-8 items-center">
                        <Knob label="Comp Rel" value={mixerSettings.release} min={0} max={1} step={0.01} onChange={(v) => setMixerSetting('release', v)} unit="s" color="blue" />
                        <Knob label="Distortion" value={mixerSettings.distortion} min={0} max={100} onChange={(v) => setMixerSetting('distortion', v)} unit="%" color="orange" />
                        <Knob label="Drive" value={mixerSettings.masterVolume} min={0} max={1.5} step={0.01} onChange={(v) => setMixerSetting('masterVolume', v)} unit="" color="violet" />
                    </div>
                 </div>
                 <div className="absolute bottom-3 left-3 right-3 flex justify-between px-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                 </div>
              </div>

              {/* Module: Equalizer */}
              <div className="lg:col-span-5 bg-zinc-900 rounded-lg border border-zinc-800 p-1.5 relative shadow-xl">
                 <div className="absolute top-3 left-3 right-3 flex justify-between px-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                 </div>
                 <div className="border border-zinc-800/60 rounded p-6 h-full flex flex-col bg-gradient-to-b from-zinc-900 to-zinc-900/50">
                    <h4 className="text-center text-zinc-400 text-base font-bold uppercase tracking-widest mb-8 border-b border-zinc-800 pb-3">Parametric EQ</h4>
                    <div className="flex-1 flex justify-around items-center gap-2">
                        <Knob label="Low" value={mixerSettings.low} min={-20} max={20} onChange={(v) => setMixerSetting('low', v)} unit="dB" color="cyan" />
                        <Knob label="Mid" value={mixerSettings.mid} min={-20} max={20} onChange={(v) => setMixerSetting('mid', v)} unit="dB" color="cyan" />
                        <Knob label="High" value={mixerSettings.high} min={-20} max={20} onChange={(v) => setMixerSetting('high', v)} unit="dB" color="cyan" />
                        <div className="w-px h-24 bg-zinc-800 mx-4"></div>
                        <Knob label="Cutoff" value={mixerSettings.filterFreq} min={20} max={20000} step={100} onChange={(v) => setMixerSetting('filterFreq', v)} unit="Hz" color="emerald" />
                        <Knob label="Res" value={mixerSettings.resonance} min={0} max={20} onChange={(v) => setMixerSetting('resonance', v)} unit="" color="emerald" />
                    </div>
                 </div>
                 <div className="absolute bottom-3 left-3 right-3 flex justify-between px-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-800 shadow-inner"></div>
                 </div>
              </div>

              {/* Module: FX & Layers */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                 {/* Delay Unit */}
                 <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-1.5 relative shadow-xl flex-1">
                    <div className="border border-zinc-800/60 rounded p-6 h-full flex flex-col bg-gradient-to-b from-zinc-900 to-zinc-900/50">
                        <h4 className="text-center text-zinc-400 text-base font-bold uppercase tracking-widest mb-6 border-b border-zinc-800 pb-3">Stereo Delay</h4>
                        <div className="flex justify-around items-center">
                            <Knob label="Time" value={mixerSettings.delayTime} min={0} max={1} step={0.01} onChange={(v) => setMixerSetting('delayTime', v)} unit="s" color="pink" />
                            <Knob label="F-Back" value={mixerSettings.delayFeedback} min={0} max={0.9} step={0.01} onChange={(v) => setMixerSetting('delayFeedback', v)} unit="" color="pink" />
                        </div>
                    </div>
                 </div>

                 {/* FX Rack */}
                 <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 relative shadow-xl flex-1 min-h-[220px]">
                    <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-3">
                        <h4 className="text-zinc-400 text-base font-bold uppercase tracking-widest">FX Rack</h4>
                        <div className="relative">
                            <button onClick={() => setShowLayerMenu(!showLayerMenu)} className="flex items-center gap-1 text-violet-400 hover:text-white transition-colors text-sm font-bold">
                                <Plus size={16} /> Add Layer
                            </button>
                            {showLayerMenu && (
                                <div className="absolute top-8 right-0 z-30 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                                    {['Transpose', 'Tremolo'].map(l => (
                                        <button key={l} onClick={() => toggleLayer(l)} className="w-full text-left px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white border-b border-zinc-700/50 last:border-0">
                                            {activeLayers.includes(l) ? 'Remove ' : 'Add '}{l}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                       {activeLayers.length === 0 && (
                           <div className="text-center text-zinc-600 text-sm italic py-6">No effects active</div>
                       )}

                       {activeLayers.includes('Transpose') && (
                           <div className="bg-black/40 border border-zinc-800 rounded p-4 relative">
                               <button onClick={() => toggleLayer('Transpose')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500"><X size={16}/></button>
                               <div className="flex items-center gap-2 mb-3 text-violet-400 text-sm font-bold uppercase">
                                   <Sliders size={14} /> Transpose
                               </div>
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-700 p-1">
                                      <button onClick={() => setMixerSetting('pitch', mixerSettings.pitch - 1)} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-700 text-zinc-400 rounded transition-colors"><Minus size={16}/></button>
                                      <span className="w-12 text-center text-lg font-mono font-bold text-white">{mixerSettings.pitch > 0 ? '+' : ''}{mixerSettings.pitch}</span>
                                      <button onClick={() => setMixerSetting('pitch', mixerSettings.pitch + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-700 text-zinc-400 rounded transition-colors"><Plus size={16}/></button>
                                  </div>
                                  <div className="text-sm text-zinc-400 text-right leading-tight">
                                      <div>In: <span className="text-zinc-200 font-bold">{detectedKey || '-'}</span></div>
                                      <div>Out: <span className="text-violet-400 font-bold">{getTransposedKey(detectedKey, mixerSettings.pitch)}</span></div>
                                  </div>
                               </div>
                           </div>
                       )}

                       {activeLayers.includes('Tremolo') && (
                           <div className="bg-black/40 border border-zinc-800 rounded p-4 relative">
                               <button onClick={() => toggleLayer('Tremolo')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500"><X size={16}/></button>
                               <div className="flex items-center gap-2 mb-3 text-pink-400 text-sm font-bold uppercase">
                                   <Activity size={14} /> Tremolo
                               </div>
                               <div className="flex gap-4">
                                  <div className="flex-1">
                                     <label className="text-xs font-bold text-zinc-400 block mb-1.5">Depth</label>
                                     <input type="range" min="0" max="1" step="0.01" value={mixerSettings.tremoloDepth} onChange={(e) => setMixerSetting('tremoloDepth', parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full" />
                                  </div>
                                  <div className="flex-1">
                                     <label className="text-xs font-bold text-zinc-400 block mb-1.5">Rate</label>
                                     <input type="range" min="0" max="20" step="0.1" value={mixerSettings.tremoloRate} onChange={(e) => setMixerSetting('tremoloRate', parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full" />
                                  </div>
                               </div>
                           </div>
                       )}
                    </div>
                 </div>
              </div>

           </div>
           
           <div className="text-center text-zinc-500 text-sm font-mono font-medium mt-12 uppercase tracking-[0.2em] opacity-80">
              GigFlow Audio Engine v2.0 • 48kHz 32-bit Float
           </div>
        </div>
      </div>
    </div>
  );
};