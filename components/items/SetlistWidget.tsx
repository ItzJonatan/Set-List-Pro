import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { SetlistItem, SetlistRow } from '../../types';

interface Props {
  data: SetlistItem;
  onUpdate: (data: SetlistItem) => void;
  onDelete: () => void;
}

export const SetlistWidget: React.FC<Props> = ({ data, onUpdate, onDelete }) => {
  const addRow = () => {
    const newRow: SetlistRow = {
      id: Date.now().toString(),
      name: '',
      scale: '',
      bpm: ''
    };
    onUpdate({
      ...data,
      rows: [...data.rows, newRow]
    });
  };

  const updateRow = (id: string, field: keyof SetlistRow, value: string) => {
    const newRows = data.rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    );
    onUpdate({ ...data, rows: newRows });
  };

  const removeRow = (id: string) => {
    onUpdate({
      ...data,
      rows: data.rows.filter(row => row.id !== id)
    });
  };

  return (
    <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 shadow-xl hover:border-blue-500/30 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <input 
          value={data.title}
          onChange={(e) => onUpdate({...data, title: e.target.value})}
          className="bg-transparent text-2xl font-bold text-white focus:outline-none focus:border-b border-blue-500 w-full mr-4 placeholder-neutral-500"
          placeholder="Setlist Title"
        />
        <button onClick={onDelete} className="text-neutral-400 hover:text-red-500 transition-colors p-2">
          <Trash2 size={20} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-base font-bold tracking-wide text-neutral-300 uppercase border-b border-neutral-700">
              <th className="pb-4 pl-2 w-10">#</th>
              <th className="pb-4 w-[45%]">Song Name</th>
              <th className="pb-4 w-[25%]">Scale</th>
              <th className="pb-4 w-[20%]">BPM</th>
              <th className="pb-4 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/50">
            {data.rows.map((row, index) => (
              <tr key={row.id} className="group hover:bg-neutral-700/20 transition-colors">
                <td className="py-3 pl-2 text-neutral-500 font-mono text-base">{index + 1}</td>
                <td className="py-3">
                  <input 
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    className="w-full bg-transparent text-neutral-200 placeholder-neutral-600 focus:outline-none focus:text-white text-lg font-medium"
                    placeholder="Song Title"
                  />
                </td>
                <td className="py-3">
                  <input 
                    value={row.scale}
                    onChange={(e) => updateRow(row.id, 'scale', e.target.value)}
                    className="w-full bg-transparent text-amber-400 placeholder-neutral-600 focus:outline-none font-mono text-base font-semibold"
                    placeholder="Key"
                  />
                </td>
                <td className="py-3">
                  <input 
                    value={row.bpm}
                    onChange={(e) => updateRow(row.id, 'bpm', e.target.value)}
                    className="w-full bg-transparent text-emerald-400 placeholder-neutral-600 focus:outline-none font-mono text-base font-semibold"
                    placeholder="120"
                  />
                </td>
                <td className="py-3 text-right">
                  <button 
                    onClick={() => removeRow(row.id)}
                    className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        onClick={addRow}
        className="mt-6 w-full py-3 border-2 border-dashed border-blue-500/30 text-blue-500/80 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2 text-base font-bold uppercase tracking-wide shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]"
      >
        <Plus size={20} /> Add Song
      </button>
    </div>
  );
};