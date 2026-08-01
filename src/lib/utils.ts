// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

export function buildEmbedUrl(template?: string, tmdbId?: number, imdbId?: string): string {
  if (!template) return '#';

  const tmdb = tmdbId !== undefined && tmdbId !== null ? tmdbId.toString() : '';
  const imdb = imdbId ?? '';

  return template
    .replace(/\{TMDB_ID\}/g, tmdb)
    .replace(/\{IMDB_ID\}/g, imdb);
}