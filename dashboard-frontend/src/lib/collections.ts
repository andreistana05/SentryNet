export function extractCollection<T>(payload: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  if ("data" in payload && Array.isArray(payload.data)) return payload.data;
  if ("items" in payload && Array.isArray(payload.items)) return payload.items;
  return [];
}
