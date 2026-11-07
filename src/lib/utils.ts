// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(
      Number(dateString.slice(0, 4)),
      Number(dateString.slice(5, 7)) - 1,
      Number(dateString.slice(8, 10)),
    )
    : new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function getEmbedLinkName(template: string): string {
  try {
    const url = new URL(template.trim().replace(/\{(TMDB_ID|IMDB_ID|SEASON|EPISODE)\}/g, '1'));
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function buildEmbedUrl(template?: string, tmdbId?: number, imdbId?: string): string {
  if (!template) return '#';

  const tmdb = tmdbId !== undefined && tmdbId !== null ? tmdbId.toString() : '';
  const imdb = imdbId ?? '';

  return template
    .replace(/\{TMDB_ID\}/g, tmdb)
    .replace(/\{IMDB_ID\}/g, imdb);
}