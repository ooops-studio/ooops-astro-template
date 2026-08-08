export type GalleryItem = { id: string; src: string; alt: string; group?: string };

export function groupGalleryItems(items: GalleryItem[]) {
  return items.reduce<Record<string, GalleryItem[]>>((groups, item) => {
    const key = item.group || 'default';
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

export function nextGalleryIndex(current: number, length: number, direction: 1 | -1) {
  if (length <= 0) return -1;
  return (current + direction + length) % length;
}

export function galleryActionFromKey(key: string): 'next' | 'previous' | 'close' | null {
  if (key === 'ArrowRight') return 'next';
  if (key === 'ArrowLeft') return 'previous';
  if (key === 'Escape') return 'close';
  return null;
}
