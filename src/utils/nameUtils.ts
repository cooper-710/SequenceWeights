/**
 * Convert a name to a URL-safe slug
 * Example: "John Doe" -> "john-doe"
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

