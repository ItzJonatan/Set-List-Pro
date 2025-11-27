import React from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
  color?: string;
}

export const Knob: React.FC<Props> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  unit = '',
  color = 'violet' 
}) => {
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="h-32 relative w-12 bg-neutral-900 rounded-full border border-neutral-800 flex justify-center py-2 shadow-inner">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ appearance: 'slider-vertical' as any }} // Webkit specific but falls back gracefully
          {...({ orient: "vertical" } as any)}
        />
        
        {/* Track visualization */}
        <div className="absolute bottom-2 w-1.5 bg-neutral-800 rounded-full h-[calc(100%-16px)] overflow-hidden pointer-events-none">
           <div 
             className={`absolute bottom-0 w-full transition-all duration-75 bg-${color}-500 group-hover:bg-${color}-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]`}
             style={{ height: `${((value - min) / (max - min)) * 100}%` }}
           />
        </div>

        {/* Thumb visualization */}
        <div 
            className={`absolute w-8 h-8 rounded-full border-2 border-${color}-500 bg-neutral-900 shadow-lg pointer-events-none transition-all duration-75 flex items-center justify-center`}
            style={{ 
                bottom: `calc(${((value - min) / (max - min)) * 100}% - 16px + 8px)` // Adjust for padding
            }}
        >
            <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-1.5 shadow-black drop-shadow-sm">{label}</div>
        <div className={`text-base font-mono font-medium text-${color}-400`}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </div>
      </div>
    </div>
  );
};