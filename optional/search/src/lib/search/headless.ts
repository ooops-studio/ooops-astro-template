export type SearchIndexItem = {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  tags?: string[];
};

export function searchItems(items: SearchIndexItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => {
    const haystack = [item.title, item.excerpt, ...(item.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
}
