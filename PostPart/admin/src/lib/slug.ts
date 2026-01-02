/**
 * Utility functions for creating URL-friendly slugs from organization names
 */

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function slugToName(slug: string): string {
  // This is a reverse function - converts slug back to a searchable pattern
  // Since slugs are lossy, we'll use this for partial matching
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

