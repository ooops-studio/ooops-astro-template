export type FilterState = Record<string, string[]>;

export function readFilterState(searchParams: URLSearchParams, keys: string[]): FilterState {
  return Object.fromEntries(keys.map((key) => [key, searchParams.getAll(key).filter(Boolean)]));
}

export function writeFilterState(url: URL, state: FilterState) {
  for (const key of Object.keys(state)) url.searchParams.delete(key);
  for (const [key, values] of Object.entries(state)) {
    for (const value of values) url.searchParams.append(key, value);
  }
  return url;
}

export function toggleFilterValue(state: FilterState, key: string, value: string): FilterState {
  const values = new Set(state[key] ?? []);
  if (values.has(value)) values.delete(value);
  else values.add(value);
  return { ...state, [key]: [...values] };
}
