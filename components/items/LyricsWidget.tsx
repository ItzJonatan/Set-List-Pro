import React, { useState } from 'react';
import { Type, Image as ImageIcon, Upload, Trash2, Maximize2 } from 'lucide-react';
import { LyricsItem } from '../../types';

interface Props {
  data: LyricsItem;
  onUpdate: (data: LyricsItem) => void;
  onDelete: () => void;
}

export const LyricsWidget: React.FC<Props> = ({ data, onUpdate, onDelete }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({
          ...data,
          imageUrl: reader.result as string,
          mode: 'image'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`
      bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 shadow-xl 
      hover:border-pink-500/30 transition-all duration-300
      ${isFullscreen ? 'fixed inset-4 z-50 bg-neutral-900 border-pink-500 shadow-2xl overflow-auto' : ''}
    `}>
      <div className="flex justify-between items-center mb-4">
        <input 
          value={data.title}
          onChange={(e) => onUpdate({...data, title: e.target.value})}
          className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b border-pink-500 w-full mr-4 placeholder-neutral-500"
          placeholder="Song Lyrics Title"
        />
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="text-neutral-400 hover:text-white transition-colors p-2"
            title="Toggle Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
          <button onClick={onDelete} className="text-neutral-400 hover:text-red-500 transition-colors p-2">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 bg-neutral-900/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => onUpdate({ ...data, mode: 'text' })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            data.mode === 'text' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type size={14} /> Text
        </button>
        <button
          onClick={() => onUpdate({ ...data, mode: 'image' })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            data.mode === 'image' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ImageIcon size={14} /> Image
        </button>
      </div>

      <div className={`relative ${isFullscreen ? 'h-[calc(100%-100px)]' : 'min-h-[200px]'}`}>
        {data.mode === 'text' ? (
          <textarea
            value={data.content}
            onChange={(e) => onUpdate({ ...data, content: e.target.value })}
            className="w-full h-full min-h-[200px] bg-neutral-900/30 p-4 rounded-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-pink-500/50 resize-y font-serif leading-relaxed whitespace-pre-wrap"
            placeholder="Enter lyrics here..."
          />
        ) : (
          <div className="w-full h-full min-h-[200px] bg-neutral-900/30 border-2 border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            {data.imageUrl ? (
              <>
                <img src={data.imageUrl} alt="Lyrics" className="max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <button className="bg-white text-black px-4 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(255,255,255,0.4)]">Change Image</button>
                   </div>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <Upload size={32} className="mx-auto text-neutral-500 mb-2" />
                <p className="text-neutral-400 font-medium">Click to upload image</p>
                <p className="text-neutral-600 text-sm">Supports JPG, PNG</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};