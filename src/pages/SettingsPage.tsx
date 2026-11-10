import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { useToast } from '@/components/ui/use-toast';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTheme } from '@/hooks/useTheme';
import {
  createEmbedLink,
  createEmbedSettingsFile,
  isValidEmbedUrlTemplate,
  normalizeEmbedLinks,
  parseEmbedSettingsFile,
  type EmbedLink,
} from '@/lib/embedSettings';
import { tmdbService, type TMDBCountry } from '@/lib/tmdb';

function createDraftLinks(links: EmbedLink[]): EmbedLink[] {
  return links.length ? links : [{ name: '', urlTemplate: '' }];
}

export function SettingsPage() {
  const { movieLinks, tvLinks, region, saveRegion, saveSettings, resetSettings } = useEmbedSettings();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [movieLinkInputs, setMovieLinkInputs] = useState(() => createDraftLinks(movieLinks));
  const [tvLinkInputs, setTvLinkInputs] = useState(() => createDraftLinks(tvLinks));
  const [regionInput, setRegionInput] = useState(region);
  const [settingsError, setSettingsError] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const countriesQuery = useCachedQuery<TMDBCountry[]>(
    'tmdb:countries',
    (signal) => tmdbService.getCountries({ signal }),
    { ttlMs: 24 * 60 * 60 * 1000 },
  );
  usePageTitle('Settings');

  const updateLink = (mediaType: 'movie' | 'tv', index: number, value: string) => {
    const update = (links: EmbedLink[]) => links.map((link, linkIndex) => (
      linkIndex === index ? createEmbedLink(value) : link
    ));
    if (mediaType === 'movie') setMovieLinkInputs(update);
    else setTvLinkInputs(update);
  };

  const addLink = (mediaType: 'movie' | 'tv') => {
    const add = (links: EmbedLink[]) => [...links, { name: '', urlTemplate: '' }];
    if (mediaType === 'movie') setMovieLinkInputs(add);
    else setTvLinkInputs(add);
  };

  const removeLink = (mediaType: 'movie' | 'tv', index: number) => {
    const remove = (links: EmbedLink[]) => {
      const remaining = links.filter((_, linkIndex) => linkIndex !== index);
      return remaining.length ? remaining : [{ name: '', urlTemplate: '' }];
    };
    if (mediaType === 'movie') setMovieLinkInputs(remove);
    else setTvLinkInputs(remove);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const imported = parseEmbedSettingsFile(await file.text());
      setMovieLinkInputs(createDraftLinks(imported.movieLinks));
      setTvLinkInputs(createDraftLinks(imported.tvLinks));
      if (imported.region) setRegionInput(imported.region);
      setSettingsError('');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not read the selected settings file.');
    }
  };

  const handleExport = () => {
    setSettingsError('');
    try {
      const file = new Blob(
        [createEmbedSettingsFile(movieLinkInputs, tvLinkInputs, regionInput)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(file);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'tmdb-embed-settings.json';
      downloadLink.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not export settings.');
    }
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsError('');

    const links = [
      ...normalizeEmbedLinks(movieLinkInputs, { omitEmpty: true }),
      ...normalizeEmbedLinks(tvLinkInputs, { omitEmpty: true }),
    ].map((link) => link.urlTemplate);
    if (!links.every(isValidEmbedUrlTemplate)) {
      setSettingsError('Enter a valid http or https URL template for each link.');
      return;
    }

    try {
      saveSettings({
        movieLinks: normalizeEmbedLinks(movieLinkInputs, { omitEmpty: true }),
        tvLinks: normalizeEmbedLinks(tvLinkInputs, { omitEmpty: true }),
        region: regionInput,
      });
      toast({ title: 'Settings saved', description: 'Your preferences are saved in this browser.' });
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not save settings. Check browser storage and try again.');
    }
  };

  const handleSaveCountry = () => {
    setSettingsError('');
    try {
      saveRegion(regionInput);
      toast({ title: 'Country saved', description: 'Your content country is saved in this browser.' });
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not save country. Check browser storage and try again.');
    }
  };

  const handleReset = () => {
    setSettingsError('');
    try {
      const defaults = resetSettings();
      setMovieLinkInputs(createDraftLinks(defaults.movieLinks));
      setTvLinkInputs(createDraftLinks(defaults.tvLinks));
      setRegionInput(defaults.region);
      toast({ title: 'Content settings reset', description: 'Country and embed links are back to their defaults.' });
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not reset settings. Check browser storage and try again.');
    }
  };

  const sortedCountries = countriesQuery.data
    ?.slice()
    .sort((a, b) => a.english_name.localeCompare(b.english_name)) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your regional content, appearance, and playback links.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Content country</CardTitle>
            <CardDescription>
              Choose the country used for release certifications, streaming availability, provider searches, and regional movie results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {countriesQuery.error && (
              <Alert variant="destructive">
                <AlertDescription>Country options could not be loaded: {countriesQuery.error.message}</AlertDescription>
              </Alert>
            )}
            {countriesQuery.loading && <p className="text-sm text-muted-foreground">Loading countries...</p>}
            <label htmlFor="content-region" className="text-sm font-medium">Country</label>
            <div className="flex min-w-0 items-center gap-2">
              <select
                id="content-region"
                aria-label="Content country"
                value={regionInput}
                onChange={(event) => setRegionInput(event.target.value)}
                disabled={countriesQuery.loading || Boolean(countriesQuery.error)}
                className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {regionInput && !sortedCountries.some((country) => country.iso_3166_1 === regionInput) && (
                  <option value={regionInput}>{regionInput}</option>
                )}
                {sortedCountries.map((country) => (
                  <option key={country.iso_3166_1} value={country.iso_3166_1}>
                    {country.english_name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={handleSaveCountry}
                disabled={countriesQuery.loading || Boolean(countriesQuery.error)}
                className="shrink-0"
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embed links</CardTitle>
            <CardDescription>
              Configure movie and TV playback links. Link names are derived from their domains.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              aria-label="Import embed settings JSON"
              className="hidden"
              onChange={(event) => void handleImport(event)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => importFileInputRef.current?.click()} className="gap-2">
                <Upload aria-hidden="true" className="h-4 w-4" />
                Import JSON
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download aria-hidden="true" className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
            {([
              { mediaType: 'movie' as const, label: 'Movie', links: movieLinkInputs, placeholder: 'https://example.com/movie/{TMDB_ID}/{IMDB_ID}' },
              { mediaType: 'tv' as const, label: 'TV', links: tvLinkInputs, placeholder: 'https://example.com/tv/{TMDB_ID}/{SEASON}/{EPISODE}' },
            ]).map(({ mediaType, label, links, placeholder }) => (
              <section key={mediaType} className="space-y-3 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">{label} links</h3>
                {links.map((link, index) => (
                  <div key={`${mediaType}-link-${index}`} className="flex min-w-0 items-center gap-2">
                    <span className="hidden w-28 shrink-0 truncate text-xs text-muted-foreground sm:block">
                      {createEmbedLink(link.urlTemplate).name || `Link ${index + 1}`}
                    </span>
                    <Input
                      aria-label={`${label} link URL template ${index + 1}`}
                      value={link.urlTemplate}
                      onChange={(event) => updateLink(mediaType, index, event.target.value)}
                      placeholder={placeholder}
                      autoComplete="url"
                      className="min-w-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(mediaType, index)}
                      aria-label={`Remove ${label.toLowerCase()} link ${index + 1}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addLink(mediaType)} className="gap-2">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add {label.toLowerCase()} link
                </Button>
              </section>
            ))}
            <p className="rounded-md bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Use {'{TMDB_ID}'} and {'{IMDB_ID}'} for movies. TV links also support {'{SEASON}'} and {'{EPISODE}'}. Removing all links disables that watch button.
            </p>
            {settingsError && <p role="alert" className="text-sm text-destructive">{settingsError}</p>}
            <div className="flex flex-col-reverse justify-between gap-3 border-t pt-4 sm:flex-row">
              <Button type="button" variant="ghost" onClick={handleReset}>Reset content defaults</Button>
              <Button type="submit">Save content settings</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the app looks on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <label htmlFor="dark-mode-toggle" className="text-sm font-medium">Dark mode</label>
          <button
            id="dark-mode-toggle"
            type="button"
            role="switch"
            aria-label="Dark mode"
            aria-checked={theme === 'dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              theme === 'dark' ? 'bg-primary' : 'bg-input'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
