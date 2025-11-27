import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

export interface MixerSettings {
  masterVolume: number;
  low: number;
  mid: number;
  high: number;
  distortion: number;
  delayTime: number;
  delayFeedback: number;
  resonance: number;
  filterFreq: number; // Cutoff
  release: number;
  // FX Layers
  pitch: number; // Semitones
  tremoloDepth: number;
  tremoloRate: number;
}

const DEFAULT_MIXER_SETTINGS: MixerSettings = {
  masterVolume: 1,
  low: 0,
  mid: 0,
  high: 0,
  distortion: 0,
  delayTime: 0,
  delayFeedback: 0,
  resonance: 0,
  filterFreq: 20000,
  release: 0.25,
  pitch: 0,
  tremoloDepth: 0,
  tremoloRate: 4,
};

interface AudioContextType {
  currentId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  analyserNode: AnalyserNode | null;
  mixerSettings: MixerSettings;
  detectedKey: string | null; // New detected key state
  playTrack: (id: string, url: string) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setMixerSetting: (key: keyof MixerSettings, value: number) => void;
  resetMixer: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// --- Audio Analysis Helpers (Duplicated from ChordIdentifier for integration) ---
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) sumOfSquares += buffer[i] * buffer[i];
  const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
  if (rootMeanSquare < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }

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
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
};

const noteFromPitch = (frequency: number) => {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
};

function makeDistortionCurve(amount: number) {
  const k = amount;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [mixerSettings, setMixerSettings] = useState<MixerSettings>(DEFAULT_MIXER_SETTINGS);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    source: MediaElementAudioSourceNode | null;
    gain: GainNode | null;
    lowEq: BiquadFilterNode | null;
    midEq: BiquadFilterNode | null;
    highEq: BiquadFilterNode | null;
    distortion: WaveShaperNode | null;
    delay: DelayNode | null;
    feedback: GainNode | null;
    filter: BiquadFilterNode | null;
    compressor: DynamicsCompressorNode | null;
    tremoloGain: GainNode | null;
    tremoloOsc: OscillatorNode | null;
    tremoloDepthGain: GainNode | null;
    // Pitch Shifter Nodes
    pitchShifterInput: GainNode | null;
    pitchShifterOutput: GainNode | null;
    mod1Gain: GainNode | null;
    mod2Gain: GainNode | null;
    mod1: OscillatorNode | null;
    mod2: OscillatorNode | null;
    analyser: AnalyserNode | null;
  }>({
    source: null, gain: null, lowEq: null, midEq: null, highEq: null,
    distortion: null, delay: null, feedback: null, filter: null,
    compressor: null, tremoloGain: null, tremoloOsc: null, tremoloDepthGain: null,
    pitchShifterInput: null, pitchShifterOutput: null, mod1Gain: null, mod2Gain: null, mod1: null, mod2: null,
    analyser: null
  });

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;

    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain(); 
    const lowEq = ctx.createBiquadFilter();
    const midEq = ctx.createBiquadFilter();
    const highEq = ctx.createBiquadFilter();
    const dist = ctx.createWaveShaper();
    const filter = ctx.createBiquadFilter(); 
    const delay = ctx.createDelay(5.0);
    const feedback = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const tremoloGain = ctx.createGain(); 
    const tremoloOsc = ctx.createOscillator();
    const tremoloDepthGain = ctx.createGain();
    const analyser = ctx.createAnalyser();

    // Pitch Shifter Graph
    const pitchShifterInput = ctx.createGain();
    const pitchShifterOutput = ctx.createGain();
    // Delay lines
    const delay1 = ctx.createDelay(1.0);
    const delay2 = ctx.createDelay(1.0);
    const fade1 = ctx.createGain();
    const fade2 = ctx.createGain();
    const mix1 = ctx.createGain(); // Mix to output
    const mix2 = ctx.createGain();
    // Modulators
    const mod1 = ctx.createOscillator();
    const mod2 = ctx.createOscillator();
    const mod1Gain = ctx.createGain();
    const mod2Gain = ctx.createGain();

    // --- Configuration ---
    lowEq.type = 'lowshelf'; lowEq.frequency.value = 320;
    midEq.type = 'peaking'; midEq.frequency.value = 1000; midEq.Q.value = 0.5;
    highEq.type = 'highshelf'; highEq.frequency.value = 3200;
    filter.type = 'lowpass'; filter.frequency.value = 20000; 
    dist.curve = makeDistortionCurve(0); dist.oversample = '4x';
    tremoloOsc.type = 'sine'; tremoloOsc.frequency.value = 4;
    analyser.fftSize = 256;

    // Pitch Shifter Config
    // Sawtooth waves for delay modulation
    mod1.type = 'sawtooth';
    mod2.type = 'sawtooth';
    mod1.start();
    mod2.start();
    
    // Connections for pitch shifter
    // Input -> Delay1 -> Mix1 -> Output
    // Input -> Delay2 -> Mix2 -> Output
    pitchShifterInput.connect(delay1);
    pitchShifterInput.connect(delay2);
    delay1.connect(mix1);
    delay2.connect(mix2);
    mix1.connect(pitchShifterOutput);
    mix2.connect(pitchShifterOutput);

    // Modulation
    // Mod -> ModGain -> Delay.delayTime
    mod1.connect(mod1Gain);
    mod2.connect(mod2Gain);
    mod1Gain.connect(delay1.delayTime);
    mod2Gain.connect(delay2.delayTime);
    
    // Store nodes
    nodesRef.current = {
      source, gain, lowEq, midEq, highEq, dist, 
      delay, feedback, filter, compressor, 
      tremoloGain, tremoloOsc, tremoloDepthGain,
      pitchShifterInput, pitchShifterOutput, mod1Gain, mod2Gain, mod1, mod2,
      analyser
    };

    // Connections Graph
    // source -> pitchShifter -> dist -> filter -> EQ -> Tremolo -> Compressor -> Gain -> Dest
    
    source.connect(pitchShifterInput);
    pitchShifterOutput.connect(dist);
    dist.connect(filter);
    filter.connect(lowEq);
    lowEq.connect(midEq);
    midEq.connect(highEq);
    
    // Send to Delay
    highEq.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(tremoloGain);

    highEq.connect(tremoloGain);
    tremoloGain.connect(compressor);
    compressor.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    
    // Tremolo modulation
    tremoloOsc.connect(tremoloDepthGain);
    tremoloDepthGain.connect(tremoloGain.gain);

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      ctx.close();
    };
  }, []);

  // Analyze Key Logic
  const analyzeKey = async (url: string) => {
    if (!url) {
        setDetectedKey("Unknown");
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch failed");

        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Use try-catch for decodeAudioData as it can fail with corrupt files
        let audioBuffer;
        try {
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn("Decode failed", e);
            setDetectedKey("Unknown");
            audioCtx.close();
            return;
        }
        
        const pcmData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const chromaSum = new Array(12).fill(0);
        
        // Analyze first 30 seconds
        const limit = Math.min(pcmData.length, sampleRate * 30);
        const step = 2048;

        for(let i=0; i < limit; i+=step) {
            const chunk = pcmData.slice(i, i+step);
            const freq = autoCorrelate(chunk, sampleRate);
            if(freq > 0) {
                const midi = noteFromPitch(freq);
                chromaSum[midi % 12]++;
            }
        }

        let bestCorr = -1;
        let bestKey = -1;
        let bestMode = 'Major';

        // Match Profiles
        for (let i = 0; i < 12; i++) {
            let majCorr = 0;
            let minCorr = 0;
            for (let j = 0; j < 12; j++) {
                majCorr += chromaSum[(i + j) % 12] * MAJOR_PROFILE[j];
                minCorr += chromaSum[(i + j) % 12] * MINOR_PROFILE[j];
            }
            if (majCorr > bestCorr) { bestCorr = majCorr; bestKey = i; bestMode = 'Major'; }
            if (minCorr > bestCorr) { bestCorr = minCorr; bestKey = i; bestMode = 'Minor'; }
        }

        if (bestKey !== -1) {
            setDetectedKey(`${NOTE_NAMES[bestKey]} ${bestMode}`);
        } else {
            setDetectedKey("Unknown");
        }
        audioCtx.close();
    } catch (e) {
        console.warn("Key analysis failed (likely invalid source):", e);
        setDetectedKey("Unknown");
    }
  };

  useEffect(() => {
    const nodes = nodesRef.current;
    if (!nodes.gain || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const s = mixerSettings;
    const t = ctx.currentTime;

    nodes.gain.gain.setTargetAtTime(s.masterVolume, t, 0.01);
    if (nodes.lowEq) nodes.lowEq.gain.setTargetAtTime(s.low, t, 0.01);
    if (nodes.midEq) nodes.midEq.gain.setTargetAtTime(s.mid, t, 0.01);
    if (nodes.highEq) nodes.highEq.gain.setTargetAtTime(s.high, t, 0.01);
    if (nodes.distortion) nodes.distortion.curve = makeDistortionCurve(s.distortion);
    if (nodes.delay) nodes.delay.delayTime.setTargetAtTime(s.delayTime, t, 0.01);
    if (nodes.feedback) nodes.feedback.gain.setTargetAtTime(s.delayFeedback, t, 0.01);
    if (nodes.filter) {
        nodes.filter.Q.setTargetAtTime(s.resonance, t, 0.01);
        nodes.filter.frequency.setTargetAtTime(s.filterFreq, t, 0.01);
    }
    if (nodes.compressor) nodes.compressor.release.setTargetAtTime(s.release, t, 0.01);
    if (nodes.tremoloOsc && nodes.tremoloDepthGain) {
        nodes.tremoloOsc.frequency.setTargetAtTime(s.tremoloRate, t, 0.01);
        nodes.tremoloDepthGain.gain.setTargetAtTime(s.tremoloDepth, t, 0.01);
        if (nodes.tremoloGain) nodes.tremoloGain.gain.setTargetAtTime(1, t, 0.01);
    }

    // Update Pitch Shifter
    if (nodes.mod1 && nodes.mod2 && nodes.mod1Gain && nodes.mod2Gain) {
        if (s.pitch === 0) {
            nodes.mod1Gain.gain.setTargetAtTime(0, t, 0.01);
            nodes.mod2Gain.gain.setTargetAtTime(0, t, 0.01);
        } else {
            const bufferWindow = 0.05; // 50ms window
            const ratio = Math.pow(2, s.pitch / 12);
            // The frequency of the sawtooth determines the speed of the delay tap movement.
            // f = (1 - ratio) / window
            const freq = Math.abs((1 - ratio) / bufferWindow);
            nodes.mod1.frequency.setTargetAtTime(freq, t, 0.01);
            nodes.mod2.frequency.setTargetAtTime(freq, t, 0.01);
            
            // Depth of modulation corresponds to window size roughly
            nodes.mod1Gain.gain.setTargetAtTime(bufferWindow * 0.5, t, 0.01);
            nodes.mod2Gain.gain.setTargetAtTime(bufferWindow * 0.5, t, 0.01);
        }
    }
    
    // Ensure playback rate is 1 (we are shifting pitch in DSP now, not changing speed)
    if (audioRef.current) {
        audioRef.current.preservesPitch = true;
        audioRef.current.playbackRate = 1.0; 
    }

  }, [mixerSettings]);

  const playTrack = async (id: string, url: string) => {
    if (!audioRef.current || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    
    if (currentId === id) {
      togglePlay();
      return;
    }

    audioRef.current.src = url;
    audioRef.current.load();
    audioRef.current.volume = volume;
    
    // Detect Key on load
    setDetectedKey(null); // Reset
    analyzeKey(url);

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setCurrentId(id);
    } catch (e) {
      console.warn("Playback error (likely invalid source or interrupted):", e);
      setIsPlaying(false);
      setCurrentId(null);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) { 
          console.warn("Resume error:", e); 
      }
    }
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    if (Number.isFinite(time)) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = vol;
    setVolumeState(vol);
  };

  const setMixerSetting = (key: keyof MixerSettings, value: number) => {
    setMixerSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetMixer = () => {
    setMixerSettings(DEFAULT_MIXER_SETTINGS);
  };

  return (
    <AudioContext.Provider value={{
      currentId, isPlaying, currentTime, duration, volume,
      audioContext: audioContextRef.current,
      sourceNode: nodesRef.current.source,
      analyserNode: nodesRef.current.analyser,
      mixerSettings, detectedKey,
      playTrack, togglePlay, seek, setVolume, setMixerSetting, resetMixer
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within AudioProvider");
  return context;
};