import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, Globe2, Link2, Palette, Plus, Trash2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { useExperience } from '@/contexts/ExperienceContext';
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
  const { experience, setExperience } = useExperience();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [movieLinkInputs, setMovieLinkInputs] = useState(() => createDraftLinks(movieLinks));
  const [tvLinkInputs, setTvLinkInputs] = useState(() => createDraftLinks(tvLinks));
  const [regionInput, setRegionInput] = useState(region);
  const [settingsError, setSettingsError] = useState('');
  const [experienceError, setExperienceError] = useState('');
  const [activeSection, setActiveSection] = useState<'country' | 'links' | 'experience' | 'appearance'>('appearance');
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

  const addLink = (mediaType: 'movie' | 'tv', index: number) => {
    const add = (links: EmbedLink[]) => {
      if (links.some((link) => !link.urlTemplate.trim())) return links;
      return [
        ...links.slice(0, index + 1),
        { name: '', urlTemplate: '' },
        ...links.slice(index + 1),
      ];
    };
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

  const handleExperienceChange = (nextExperience: 'cinema' | 'expressive' | 'screenroom') => {
    setExperienceError('');
    try {
      setExperience(nextExperience);
    } catch (error) {
      setExperienceError(error instanceof Error ? error.message : 'Could not save your experience preference.');
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

  const settingsSections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'links', label: 'Embed links', icon: Link2 },
    { id: 'country', label: 'Content country', icon: Globe2 },
  ] as const;

  return (
    <div className="settings-page mx-auto max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="settings-navigation min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {settingsSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activeSection === id ? 'page' : undefined}
                aria-label={label}
                data-active={activeSection === id}
                onClick={() => setActiveSection(id)}
                className={`settings-navigation-item inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full ${
                  activeSection === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="settings-navigation-icon">
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        <section
          className="settings-section min-w-0"
          aria-label={settingsSections.find(({ id }) => id === activeSection)?.label}
        >
          {activeSection === 'country' && (
            <Card className="settings-panel">
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
                <label id="content-region-label" className="text-sm font-medium">Country</label>
                <div className="flex min-w-0 items-center gap-2">
                  <Select
                    value={regionInput}
                    onValueChange={setRegionInput}
                    disabled={countriesQuery.loading || Boolean(countriesQuery.error)}
                  >
                    <SelectTrigger aria-label="Content country" className="min-w-0 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    {regionInput && !sortedCountries.some((country) => country.iso_3166_1 === regionInput) && (
                      <SelectItem value={regionInput}>{regionInput}</SelectItem>
                    )}
                    {sortedCountries.map((country) => (
                      <SelectItem key={country.iso_3166_1} value={country.iso_3166_1}>
                        {country.english_name}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
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
          )}

          {activeSection === 'links' && (
            <form onSubmit={handleSave}>
              <Card className="settings-panel">
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
                      <Download aria-hidden="true" className="h-4 w-4" />
                      Import JSON
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleExport} className="gap-2">
                      <Upload aria-hidden="true" className="h-4 w-4" />
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
                          <div className="flex shrink-0 items-center">
                            <Button
                              type="button"
                              variant="selected"
                              size="icon"
                              onClick={() => addLink(mediaType, index)}
                              aria-label={`Add ${label.toLowerCase()} link after link ${index + 1}`}
                              className="text-primary-foreground"
                              disabled={!link.urlTemplate.trim() || links.some((existingLink) => !existingLink.urlTemplate.trim())}
                            >
                              <Plus aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLink(mediaType, index)}
                              aria-label={`Remove ${label.toLowerCase()} link ${index + 1}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
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
          )}

          {activeSection === 'appearance' && (
            <Card className="settings-panel">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose the color mode and web experience for this device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <section aria-labelledby="color-mode-heading" className="flex items-center justify-between gap-4">
                  <div>
                    <h4 id="color-mode-heading" className="text-sm font-semibold">Color mode</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Use a light or dark color palette.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-sm text-muted-foreground">Light</span>
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
                    <span aria-hidden="true" className="text-sm text-muted-foreground">Dark</span>
                  </div>
                </section>

                <section aria-labelledby="web-experience-heading" className="space-y-4 border-t pt-6">
                  <div>
                    <h4 id="web-experience-heading" className="text-sm font-semibold">Web experience</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Choose the visual style used across this app. Saved in this browser.</p>
                  </div>
                  <fieldset>
                    <legend className="sr-only">Web experience</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        { value: 'cinema', label: 'Studio', description: 'A clean, considered interface for exploring film and television.' },
                        { value: 'expressive', label: 'Midnight Matinee', description: 'A bold, colorful style with cinematic character.' },
                        { value: 'screenroom', label: 'Screenroom', description: 'A streaming-style experience built for browsing.' },
                      ] as const).map(({ value, label, description }) => (
                        <label
                          key={value}
                          htmlFor={`experience-${value}`}
                          className={`settings-experience-option flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                            experience === value ? 'border-primary bg-secondary/70' : 'hover:bg-muted/50'
                          }`}
                        >
                          <input
                            id={`experience-${value}`}
                            type="radio"
                            name="web-experience"
                            value={value}
                            checked={experience === value}
                            onChange={() => handleExperienceChange(value)}
                            className="mt-1 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span>
                            <span className="block text-sm font-medium">{label}</span>
                            <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {experienceError && <p role="alert" className="text-sm text-destructive">{experienceError}</p>}
                </section>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
