import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Play, Pause, Trash2, Volume2, VolumeX, AlertTriangle, Save } from 'lucide-react';
import { RecordingItem } from '../../types';
import { useAudio } from '../AudioProvider';

interface Props {
  data: RecordingItem;
  onUpdate: (data: RecordingItem) => void;
  onDelete: () => void;
}

export const RecordingWidget: React.FC<Props> = ({ data, onUpdate, onDelete }) => {
  // Global Audio Context
  const { 
    playTrack, 
    togglePlay, 
    seek, 
    setVolume,
    currentId, 
    isPlaying: isGlobalPlaying, 
    currentTime, 
    duration, 
    volume: globalVolume 
  } = useAudio();

  const isCurrentTrack = currentId === data.id;
  const isPlaying = isCurrentTrack && isGlobalPlaying;

  // Local Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Check if current URL is a blob URL (session only)
  // With limits removed, this will likely be false for new files, but kept for legacy session items
  const isSessionOnly = data.audioUrl?.startsWith('blob:');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      // Pause playback if recording starts
      if (isGlobalPlaying) togglePlay();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Removed size limit check: Always use FileReader for persistence
        const reader = new FileReader();
        reader.onload = () => {
           onUpdate({ 
             ...data, 
             audioUrl: reader.result as string, 
             fileName: `Recording ${new Date().toLocaleTimeString()}` 
           });
        };
        reader.readAsDataURL(blob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Removed size limit check: Always use FileReader for persistence
      const reader = new FileReader();
      reader.onload = () => {
        onUpdate({
          ...data,
          audioUrl: reader.result as string,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayToggle = () => {
    if (data.audioUrl) {
      playTrack(data.id, data.audioUrl);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-neutral-800/50 backdrop-blur-sm border rounded-xl p-6 shadow-xl transition-all duration-300 ${isCurrentTrack && isGlobalPlaying ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'border-neutral-700 hover:border-violet-500/30'}`}>
      <div className="flex justify-between items-center mb-4">
        <input 
          value={data.title}
          onChange={(e) => onUpdate({...data, title: e.target.value})}
          className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b border-violet-500 w-full mr-4 placeholder-neutral-500"
          placeholder="Recording Title"
        />
        <button onClick={onDelete} className="text-neutral-400 hover:text-red-500 transition-colors p-2">
          <Trash2 size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {!data.audioUrl ? (
          <div className="flex gap-4">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] box-shadow-glow-red"
                style={{ boxShadow: '0 0 10px rgba(220, 38, 38, 0.5)' }}
              >
                <Mic size={24} />
                Record
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium animate-pulse border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              >
                <Square size={24} className="fill-current" />
                Stop ({formatTime(recordingTime)})
              </button>
            )}
            
            <div className="relative flex-1">
              <input
                type="file"
                accept="audio/mpeg, audio/wav, audio/x-wav, audio/mp4, audio/x-m4a, .mp3, .wav, .alac"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div 
                className="w-full h-full flex items-center justify-center gap-2 py-4 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium text-lg border border-neutral-600 transition-all"
                style={{ boxShadow: '0 0 10px rgba(255, 255, 255, 0.2)' }}
              >
                <Upload size={24} />
                Upload File
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 bg-neutral-900/50 p-4 rounded-lg border border-neutral-700 relative overflow-hidden">
               {/* Session Only Warning Indicator */}
               {isSessionOnly && (
                 <div className="absolute top-0 right-0 p-1.5 bg-amber-500/20 text-amber-500 rounded-bl-lg" title="Session Only: File not saved permanently">
                   <AlertTriangle size={16} />
                 </div>
               )}

              <button 
                onClick={handlePlayToggle}
                className={`p-3 rounded-full text-white transition-all active:scale-90 flex-shrink-0 ${isPlaying ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]'}`}
              >
                {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current" />}
              </button>
              
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <p className="text-lg font-semibold text-violet-200 truncate">{data.fileName}</p>
                     {!isSessionOnly ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded border border-green-500/30 font-bold tracking-wide">
                            <Save size={12} /> Saved
                        </span>
                     ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-500/30 font-bold tracking-wide">
                            Session Only
                        </span>
                     )}
                  </div>
                  <span className="text-base text-neutral-300 font-mono font-medium flex-shrink-0 ml-2">
                    {isCurrentTrack ? formatTime(currentTime) : "0:00"} / {isCurrentTrack ? formatTime(duration) : "--:--"}
                  </span>
                </div>
                
                {/* SEEKER SLIDER */}
                <input
                  type="range"
                  min={0}
                  max={isCurrentTrack ? duration : 100}
                  value={isCurrentTrack ? currentTime : 0}
                  onChange={(e) => {
                    if (isCurrentTrack) {
                      seek(parseFloat(e.target.value));
                    }
                  }}
                  disabled={!isCurrentTrack}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-violet-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button 
                onClick={() => onUpdate({...data, audioUrl: undefined})}
                className="text-neutral-500 hover:text-white transition-colors text-sm uppercase font-bold tracking-wider ml-4"
              >
                Replace
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 px-2">
              <button 
                onClick={() => setVolume(globalVolume === 0 ? 1 : 0)}
                className="text-neutral-400 hover:text-white"
              >
                {globalVolume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isCurrentTrack ? globalVolume : 1}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                disabled={!isCurrentTrack}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-violet-300 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};