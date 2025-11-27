export type ItemType = 'recording' | 'setlist' | 'lyrics';

export interface BaseItem {
  id: string;
  title: string;
  type: ItemType;
  createdAt: number;
}

export interface RecordingItem extends BaseItem {
  type: 'recording';
  audioUrl?: string; // Blob URL or base64
  fileName?: string;
  duration?: number;
}

export interface SetlistRow {
  id: string;
  name: string;
  scale: string;
  bpm: string;
}

export interface SetlistItem extends BaseItem {
  type: 'setlist';
  rows: SetlistRow[];
}

export interface LyricsItem extends BaseItem {
  type: 'lyrics';
  content: string; // Text content
  imageUrl?: string; // Data URL
  mode: 'text' | 'image';
}

export type PlaylistItem = RecordingItem | SetlistItem | LyricsItem;

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  items: PlaylistItem[];
}