const WIKIMEDIA_API_URL = 'https://commons.wikimedia.org/w/api.php';

export interface WikimediaImage {
  title: string;
  pageUrl: string;
  thumbnailUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  description?: string;
  artist?: string;
  license?: string;
}

interface WikimediaPage {
  title: string;
  fullurl?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    width?: number;
    height?: number;
    extmetadata?: {
      ImageDescription?: { value?: string };
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
    };
  }>;
}

interface WikimediaResponse {
  continue?: {
    gsroffset?: number;
  };
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
}

export async function searchWikimediaImages(
  personName: string,
  signal?: AbortSignal,
): Promise<WikimediaImage[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `"${personName}"`,
    gsrnamespace: '6',
    gsrlimit: '500',
    prop: 'imageinfo|info',
    inprop: 'url',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '500',
    format: 'json',
    origin: '*',
  });
  const images: WikimediaImage[] = [];

  while (true) {
    const url = new URL(WIKIMEDIA_API_URL);
    url.search = params.toString();
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Wikimedia request failed (${response.status})`);
    }

    const data = await response.json() as WikimediaResponse;
    images.push(...Object.values(data.query?.pages ?? {})
      .map((page): WikimediaImage | null => {
        const info = page.imageinfo?.[0];
        if (!info?.url || !info.thumburl || !page.fullurl || !info.width || !info.height) return null;

        return {
          title: page.title.replace(/^File:/, ''),
          pageUrl: page.fullurl,
          thumbnailUrl: info.thumburl,
          originalUrl: info.url,
          width: info.width,
          height: info.height,
          description: info.extmetadata?.ImageDescription?.value,
          artist: info.extmetadata?.Artist?.value,
          license: info.extmetadata?.LicenseShortName?.value,
        } satisfies WikimediaImage;
      })
      .filter((image): image is WikimediaImage => image !== null));

    const nextOffset = data.continue?.gsroffset;
    if (nextOffset === undefined) break;
    params.set('gsroffset', String(nextOffset));
  }

  return images;
}