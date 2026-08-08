export type PlaylistItem = { id: string; title: string; src: string; type?: 'audio' | 'video' };

export function nextPlaylistIndex(current: number, length: number, direction: 1 | -1) {
  if (length <= 0) return -1;
  return (current + direction + length) % length;
}

export function mediaKeyAction(key: string): 'toggle' | 'next' | 'previous' | null {
  if (key === ' ' || key === 'Enter') return 'toggle';
  if (key === 'ArrowRight') return 'next';
  if (key === 'ArrowLeft') return 'previous';
  return null;
}
