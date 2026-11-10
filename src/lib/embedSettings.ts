import { getEmbedLinkName } from '@/lib/utils';

export interface EmbedLink {
  name: string;
  urlTemplate: string;
}

interface EmbedSettingsFile {
  version: 1;
  movieLinks: string[];
  tvLinks: string[];
  region?: string;
}

export function createEmbedLink(urlTemplate: string): EmbedLink {
  return { name: getEmbedLinkName(urlTemplate), urlTemplate };
}

export function normalizeEmbedLinks(
  links: readonly EmbedLink[],
  options: { omitEmpty?: boolean } = {},
): EmbedLink[] {
  return links
    .map((link) => createEmbedLink(link.urlTemplate.trim()))
    .filter((link) => !options.omitEmpty || Boolean(link.urlTemplate));
}

export function isValidRegion(region: string): boolean {
  return /^[A-Z]{2}$/i.test(region);
}

export function normalizeRegion(region: string): string {
  const normalizedRegion = region.trim().toUpperCase();
  if (normalizedRegion && !isValidRegion(normalizedRegion)) {
    throw new Error('Choose a valid country for regional TMDB content.');
  }
  return normalizedRegion;
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
  const links = normalizeEmbedLinks(
    templates.map((urlTemplate) => ({ name: '', urlTemplate })),
    { omitEmpty: true },
  );
  if (
    links.length !== templates.length
    || !links.every((link) => isValidEmbedUrlTemplate(link.urlTemplate))
  ) {
    throw new Error('The JSON contains an invalid URL template.');
  }

  return links;
}

export function parseEmbedSettingsFile(contents: string): { movieLinks: EmbedLink[]; tvLinks: EmbedLink[]; region?: string } {
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
    || ('region' in parsed && typeof parsed.region !== 'string')
    || ('region' in parsed && typeof parsed.region === 'string' && !isValidRegion(parsed.region))
  ) {
    throw new Error('This file is not a supported embed settings export.');
  }

  return {
    movieLinks: toEmbedLinks(parsed.movieLinks),
    tvLinks: toEmbedLinks(parsed.tvLinks),
    ...('region' in parsed && typeof parsed.region === 'string' ? { region: normalizeRegion(parsed.region) } : {}),
  };
}

export function createEmbedSettingsFile(movieLinks: EmbedLink[], tvLinks: EmbedLink[], region?: string): string {
  const normalizedRegion = region ? normalizeRegion(region) : '';
  const file: EmbedSettingsFile = {
    version: 1,
    movieLinks: normalizeEmbedLinks(movieLinks, { omitEmpty: true }).map((link) => link.urlTemplate),
    tvLinks: normalizeEmbedLinks(tvLinks, { omitEmpty: true }).map((link) => link.urlTemplate),
    ...(normalizedRegion ? { region: normalizedRegion } : {}),
  };

  const normalizedLinks = [...file.movieLinks, ...file.tvLinks];
  if (!normalizedLinks.every(isValidEmbedUrlTemplate)) {
    throw new Error('The JSON contains an invalid URL template.');
  }

  return JSON.stringify(file, null, 2);
}
