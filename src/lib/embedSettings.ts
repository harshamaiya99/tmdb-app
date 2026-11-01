import type { EmbedLink } from '@/contexts/EmbedSettingsContext';
import { getEmbedLinkName } from '@/lib/utils';

interface EmbedSettingsFile {
  version: 1;
  movieLinks: string[];
  tvLinks: string[];
}

export function isValidEmbedUrlTemplate(template: string): boolean {
  if (!template.trim()) return true;

  try {
    const url = new URL(template.trim().replace(/\{(TMDB_ID|IMDB_ID|SEASON|EPISODE)\}/g, '1'));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function toEmbedLinks(templates: string[]): EmbedLink[] {
  const trimmedTemplates = templates.map((template) => template.trim());
  if (!trimmedTemplates.every((template) => template && isValidEmbedUrlTemplate(template))) {
    throw new Error('The JSON contains an invalid URL template.');
  }

  return trimmedTemplates.map((urlTemplate) => ({
    name: getEmbedLinkName(urlTemplate),
    urlTemplate,
  }));
}

export function parseEmbedSettingsFile(contents: string): { movieLinks: EmbedLink[]; tvLinks: EmbedLink[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('version' in parsed)
    || parsed.version !== 1
    || !('movieLinks' in parsed)
    || !Array.isArray(parsed.movieLinks)
    || !parsed.movieLinks.every((template): template is string => typeof template === 'string')
    || !('tvLinks' in parsed)
    || !Array.isArray(parsed.tvLinks)
    || !parsed.tvLinks.every((template): template is string => typeof template === 'string')
  ) {
    throw new Error('This file is not a supported embed settings export.');
  }

  return {
    movieLinks: toEmbedLinks(parsed.movieLinks),
    tvLinks: toEmbedLinks(parsed.tvLinks),
  };
}

export function createEmbedSettingsFile(movieLinks: EmbedLink[], tvLinks: EmbedLink[]): string {
  const file: EmbedSettingsFile = {
    version: 1,
    movieLinks: movieLinks.map((link) => link.urlTemplate.trim()).filter(Boolean),
    tvLinks: tvLinks.map((link) => link.urlTemplate.trim()).filter(Boolean),
  };

  return JSON.stringify({
    ...file,
    movieLinks: toEmbedLinks(file.movieLinks).map((link) => link.urlTemplate),
    tvLinks: toEmbedLinks(file.tvLinks).map((link) => link.urlTemplate),
  }, null, 2);
}
