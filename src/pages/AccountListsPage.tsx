import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ListPlus, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MediaCard } from '@/components/MediaCard';
import { PaginationControls } from '@/components/PaginationControls';
import { MediaCategoryToggle, MEDIA_TYPE_OPTIONS } from '@/components/MediaCategoryToggle';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { accountQueryKeys, invalidateAccountCache } from '@/lib/accountCache';
import { tmdbService, type TMDBUserListItem } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { TMDBImage } from '@/components/TMDBImage';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const USER_LIST_PAGE_SIZE = 20;

const accountNavigation = [
  { to: '/account/watchlist', label: 'Watchlist' },
  { to: '/account/favorites', label: 'Favorites' },
  { to: '/account/ratings', label: 'Ratings' },
  { to: '/account/lists', label: 'Custom lists' },
];

export function AccountListsPage() {
  const { listId: listIdParam } = useParams<{ listId?: string }>();
  const parsedListId = Number(listIdParam);
  const listId = Number.isSafeInteger(parsedListId) && parsedListId > 0 ? parsedListId : null;
  const {
    canConnectLists,
    connectTMDBAccount,
    isConnected,
    isListAccountConnected,
    listAccountId,
  } = useTMDBAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { region } = useEmbedSettings();
  const { page, setPage, searchParams, setSearchParams } = usePagination();
  const [revision, setRevision] = useState(0);
  const [pendingMediaKey, setPendingMediaKey] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListIsPublic, setNewListIsPublic] = useState(false);
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');
  const [searchRequestRevision, setSearchRequestRevision] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const selectedMediaType = searchParams.get('type');
  const mediaType = selectedMediaType === 'movie' || selectedMediaType === 'tv' ? selectedMediaType : 'all';

  const listsQuery = useCachedQuery(
    accountQueryKeys.accountLists(listAccountId, page, revision),
    (signal) => tmdbService.getAccountLists(page, signal),
    { enabled: isListAccountConnected && !listId },
  );
  const listSummaries = listsQuery.data?.results ?? [];
  const listPreviewsQuery = useCachedQuery(
    accountQueryKeys.listPreviews(listAccountId, page, revision),
    (signal) => tmdbService.getAccountListPreviews(listSummaries, signal),
    {
      enabled: isListAccountConnected
        && !listId
        && !listsQuery.loading
        && !listsQuery.error
        && listSummaries.length > 0,
    },
  );
  const detailQuery = useCachedQuery(
    accountQueryKeys.userList(listAccountId, listId, mediaType === 'all' ? page : 1, revision),
    (signal) => tmdbService.getUserList(listId ?? 0, mediaType === 'all' ? page : 1, signal),
    { enabled: isListAccountConnected && Boolean(listId) },
  );
  const filteredItemsQuery = useCachedQuery(
    accountQueryKeys.userListItems(listAccountId, listId, revision),
    (signal) => tmdbService.getAllUserListItems(listId ?? 0, signal),
    { enabled: isListAccountConnected && Boolean(listId) && mediaType !== 'all' },
  );
  const list = detailQuery.data;
  const listSearchResultsQuery = useCachedQuery(
    `account-list-search:${listAccountId}:${listId}:${searchType}:${region}:${submittedSearchQuery.toLowerCase()}:${searchRequestRevision}`,
    async (signal) => {
      if (searchType === 'movie') {
        const response = await tmdbService.searchMovies(submittedSearchQuery, 1, { signal }, region);
        return response.results.map((item) => ({ ...item, media_type: 'movie' as const }));
      }
      const response = await tmdbService.searchTVShows(submittedSearchQuery, 1, { signal });
      return response.results.map((item) => ({ ...item, media_type: 'tv' as const }));
    },
    { enabled: isListAccountConnected && Boolean(list) && Boolean(listId) && Boolean(submittedSearchQuery) },
  );
  usePageTitle(list ? list.name : 'Your Lists');

  const handleMediaTypeChange = (nextType: 'all' | 'movie' | 'tv') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextType === 'all') nextParams.delete('type');
    else nextParams.set('type', nextType);
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setIsSubmittingCreate(true);
    try {
      const createdList = await tmdbService.createUserList(
        name,
        newListDescription.trim(),
        newListIsPublic,
        region || 'US',
      );
      invalidateAccountCache();
      toast({ title: `Created ${name}` });
      navigate(`/account/lists/${createdList.id}`);
    } catch (error) {
      toast({
        title: 'Could not create list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleSearchListItems = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearchQuery(listSearchQuery.trim());
    setSearchRequestRevision((value) => value + 1);
  };

  const handleAddItem = async (item: TMDBUserListItem) => {
    if (!listId) return;
    const mediaKey = `${item.media_type}:${item.id}`;
    setPendingMediaKey(mediaKey);
    try {
      await tmdbService.addMediaToUserList(listId, item.media_type, item.id);
      invalidateAccountCache();
      setRevision((value) => value + 1);
      toast({ title: `Added ${item.media_type === 'movie' ? item.title : item.name} to list` });
    } catch (error) {
      toast({
        title: 'Could not add title to list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingMediaKey(null);
    }
  };

  const handleRemoveItem = async (mediaType: 'movie' | 'tv', mediaId: number) => {
    if (!listId) return;
    const mediaKey = `${mediaType}:${mediaId}`;
    setPendingMediaKey(mediaKey);
    try {
      await tmdbService.removeMediaFromUserList(listId, mediaType, mediaId);
      invalidateAccountCache();
      setRevision((value) => value + 1);
      toast({ title: 'Title removed from list' });
    } catch (error) {
      toast({
        title: 'Could not remove title from list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingMediaKey(null);
    }
  };

  const handleDeleteList = async () => {
    if (!listId) return;
    setIsDeleting(true);
    try {
      await tmdbService.deleteUserList(listId);
      invalidateAccountCache();
      toast({ title: 'List deleted' });
      setIsDeleteDialogOpen(false);
      navigate('/account/lists');
    } catch (error) {
      toast({
        title: 'Could not delete list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isDeleteDialogOpen) deleteCancelButtonRef.current?.focus();
  }, [isDeleteDialogOpen]);

  const handleDeleteDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isDeleting) setIsDeleteDialogOpen(false);
  };

  const startEditingList = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDescription(list.description ?? '');
    setEditIsPublic(list.public ?? false);
    setIsEditing(true);
  };

  const handleUpdateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listId || !list) return;
    const name = editName.trim();
    if (!name) return;
    setIsSavingEdit(true);
    try {
      await tmdbService.updateUserList(
        listId,
        name,
        editDescription.trim(),
        editIsPublic,
        list.iso_639_1 || 'en',
      );
      invalidateAccountCache();
      setRevision((value) => value + 1);
      setIsEditing(false);
      toast({ title: 'List updated' });
    } catch (error) {
      toast({
        title: 'Could not update list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConnectLists = () => {
    void connectTMDBAccount().catch((error: unknown) => {
      toast({
        title: 'Could not connect your TMDB account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  if (!isListAccountConnected) {
    return (
      <main className="container py-8 matinee-account-lists page-account-lists">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-semibold">Connect your TMDB account</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connect your TMDB account to view and manage watchlists, favorites, ratings, and custom lists.
            </p>
            {!isConnected || canConnectLists ? (
              <Button type="button" onClick={handleConnectLists}>Connect TMDB account</Button>
            ) : (
              <p role="alert" className="text-sm text-destructive">
                Custom lists are not configured on this app. Please contact its administrator.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (listId) {
    const listItems = mediaType === 'all'
      ? list?.results ?? []
      : (filteredItemsQuery.data ?? []).filter((item) => item.media_type === mediaType);
    const totalPages = mediaType === 'all'
      ? list?.total_pages ?? 1
      : Math.max(1, Math.ceil(listItems.length / USER_LIST_PAGE_SIZE));
    const currentPage = mediaType !== 'all' && filteredItemsQuery.data
      ? Math.min(page, totalPages)
      : page;
    const items = mediaType === 'all'
      ? listItems
      : listItems.slice((currentPage - 1) * USER_LIST_PAGE_SIZE, currentPage * USER_LIST_PAGE_SIZE);
    const loading = detailQuery.loading || (mediaType !== 'all' && filteredItemsQuery.loading);
    const error = detailQuery.error ?? (mediaType !== 'all' ? filteredItemsQuery.error : null);
    return (
      <main className="container space-y-6 py-6 matinee-account-lists page-account-lists">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2 break-words text-3xl font-bold tracking-tight">
              <Link to="/account/lists" className="text-muted-foreground hover:text-foreground">Your Lists</Link>
              <span aria-hidden="true" className="text-muted-foreground">&gt;</span>
              <span>{list?.name ?? 'List'}</span>
              {typeof list?.public === 'boolean' && (
                <Badge variant="outline" className="text-xs font-normal">
                  {list.public ? 'Public' : 'Private'}
                </Badge>
              )}
            </h1>
            {list?.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{list.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" disabled={!list} onClick={startEditingList}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit list
            </Button>
            <Button type="button" variant="destructive" className="gap-2" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete list
            </Button>
            <MediaCategoryToggle
              label="Media type"
              options={MEDIA_TYPE_OPTIONS}
              value={mediaType}
              onChange={handleMediaTypeChange}
            />
          </div>
        </div>

        <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
          {accountNavigation.map(({ to, label }) => (
            <Button key={to} asChild variant={to === '/account/lists' ? 'selected' : 'ghost'} size="sm">
              <Link to={to}>{label}</Link>
            </Button>
          ))}
        </nav>

        {isEditing && (
          <form onSubmit={(event) => void handleUpdateList(event)} className="max-w-xl space-y-3 rounded-lg border p-4">
            <h2 className="font-semibold">Edit list details</h2>
            <label className="sr-only" htmlFor={`edit-list-name-${listId}`}>List name</label>
            <Input
              id={`edit-list-name-${listId}`}
              value={editName}
              maxLength={100}
              required
              placeholder="List name"
              onChange={(event) => setEditName(event.currentTarget.value)}
            />
            <label className="sr-only" htmlFor={`edit-list-description-${listId}`}>Description</label>
            <textarea
              id={`edit-list-description-${listId}`}
              value={editDescription}
              maxLength={500}
              rows={3}
              placeholder="Description (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setEditDescription(event.currentTarget.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editIsPublic}
                onChange={(event) => setEditIsPublic(event.currentTarget.checked)}
              />
              Make this list public
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isSavingEdit} onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEdit || !editName.trim()}>
                {isSavingEdit ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}

        <section aria-labelledby="add-list-items-title" className="space-y-3 rounded-lg border p-4">
          <div>
            <h2 id="add-list-items-title" className="font-semibold">Add titles to this list</h2>
            <p className="text-sm text-muted-foreground">Search for a movie or TV show to add.</p>
          </div>
          <form onSubmit={handleSearchListItems} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="sr-only" htmlFor={`list-item-search-${listId}`}>Search titles</label>
            <Input
              id={`list-item-search-${listId}`}
              type="search"
              value={listSearchQuery}
              placeholder="Search titles"
              onChange={(event) => setListSearchQuery(event.currentTarget.value)}
            />
            <Select value={searchType} onValueChange={(value) => setSearchType(value === 'tv' ? 'tv' : 'movie')}>
              <SelectTrigger aria-label="Title type" className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV shows</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={!list || !listSearchQuery.trim()}>Search</Button>
          </form>
          {submittedSearchQuery && (
            <div aria-live="polite">
              {listSearchResultsQuery.loading ? (
                <p className="py-2 text-sm text-muted-foreground">Searching…</p>
              ) : listSearchResultsQuery.error ? (
                <Alert variant="destructive"><AlertDescription>{listSearchResultsQuery.error.message}</AlertDescription></Alert>
              ) : listSearchResultsQuery.data?.length ? (
                <ul className="space-y-2">
                  {listSearchResultsQuery.data.map((item) => {
                    const existingIds = [
                      ...(list?.object_ids?.[item.media_type] ?? []).map(Number),
                      ...(list?.results
                        .filter((existingItem) => existingItem.media_type === item.media_type)
                        .map((existingItem) => existingItem.id) ?? []),
                    ];
                    const isAdded = existingIds.includes(item.id);
                    const title = item.media_type === 'movie' ? item.title : item.name;
                    return (
                      <li key={`${item.media_type}:${item.id}`} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <span className="min-w-0 truncate text-sm">{title}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={isAdded ? 'selected' : 'outline'}
                          disabled={!list || isAdded || pendingMediaKey !== null}
                          onClick={() => void handleAddItem(item)}
                        >
                          {isAdded ? 'Added' : pendingMediaKey === `${item.media_type}:${item.id}` ? 'Adding…' : 'Add to list'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No matching titles found.</p>
              )}
            </div>
          )}
        </section>

        {isDeleteDialogOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget && !isDeleting) setIsDeleteDialogOpen(false);
            }}
            onKeyDown={handleDeleteDialogKeyDown}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-list-title"
              aria-describedby="delete-list-description"
              className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl sm:p-6"
            >
              <h2 id="delete-list-title" className="text-lg font-semibold">Delete list?</h2>
              <p id="delete-list-description" className="mt-2 text-sm text-muted-foreground">
                Delete “{list?.name ?? 'this list'}”? This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  ref={deleteCancelButtonRef}
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteList()}
                >
                  {isDeleting ? 'Deleting…' : 'Delete list'}
                </Button>
              </div>
            </section>
          </div>
        )}

        {loading ? (
          <MediaGridSkeleton />
        ) : error ? (
          <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {mediaType === 'all'
              ? 'This list is empty.'
              : `No ${mediaType === 'movie' ? 'movies' : 'TV shows'} in this list.`}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            {items.map((item) => (
              <MediaCard
                key={`${item.media_type}:${item.id}`}
                item={item}
                type={item.media_type}
                metadataAction={(
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${item.media_type === 'movie' ? item.title : item.name} from ${list?.name ?? 'list'}`}
                    title="Remove from list"
                    disabled={pendingMediaKey === `${item.media_type}:${item.id}`}
                    onClick={() => void handleRemoveItem(item.media_type, item.id)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                )}
              />
            ))}
          </div>
        )}
        {list && (
          <PaginationControls page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        )}

      </main>
    );
  }

  const totalPages = Math.min(listsQuery.data?.total_pages ?? 1, 500);

  return (
    <main className="container space-y-6 py-6 matinee-account-lists page-account-lists">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Lists</h1>
      </div>
      <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
        {accountNavigation.map(({ to, label }) => (
          <Button key={to} asChild variant={to === '/account/lists' ? 'selected' : 'ghost'} size="sm">
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Create and organize your personal movie and TV collections.</p>
        {!isCreatingList && (
          <Button type="button" onClick={() => setIsCreatingList(true)}>Create a list</Button>
        )}
      </div>
      {isCreatingList && (
        <form onSubmit={(event) => void handleCreateList(event)} className="max-w-xl space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Create a custom list</h2>
          <label className="sr-only" htmlFor="new-account-list-name">List name</label>
          <Input
            id="new-account-list-name"
            value={newListName}
            maxLength={100}
            required
            placeholder="List name"
            onChange={(event) => setNewListName(event.currentTarget.value)}
          />
          <label className="sr-only" htmlFor="new-account-list-description">Description (optional)</label>
          <Input
            id="new-account-list-description"
            value={newListDescription}
            maxLength={500}
            placeholder="Description (optional)"
            onChange={(event) => setNewListDescription(event.currentTarget.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newListIsPublic}
              onChange={(event) => setNewListIsPublic(event.currentTarget.checked)}
            />
            Make this list public
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={isSubmittingCreate} onClick={() => setIsCreatingList(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingCreate || !newListName.trim()}>
              {isSubmittingCreate ? 'Creating…' : 'Create list'}
            </Button>
          </div>
        </form>
      )}
      {listsQuery.loading ? (
        <MediaGridSkeleton />
      ) : listsQuery.error ? (
        <Alert variant="destructive"><AlertDescription>{listsQuery.error.message}</AlertDescription></Alert>
      ) : listSummaries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No custom lists yet. Create one here, or use <ListPlus aria-hidden="true" className="inline h-4 w-4" /> Add to list on a movie or TV show page.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listSummaries.map((userList) => {
            const preview = listPreviewsQuery.data?.[userList.id];
            const posterItems = preview?.items.filter((item) => item.poster_path) ?? [];
            return (
              <Link key={userList.id} to={`/account/lists/${userList.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="h-full overflow-hidden transition-colors hover:bg-accent/50">
                  <CardContent className="flex min-h-32 items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="line-clamp-2 font-semibold">{userList.name}</h2>
                        {typeof preview?.isPublic === 'boolean' && (
                          <Badge variant="outline" className="shrink-0">
                            {preview.isPublic ? 'Public' : 'Private'}
                          </Badge>
                        )}
                      </div>
                      {userList.description && <p className="line-clamp-2 text-sm text-muted-foreground">{userList.description}</p>}
                      <p className="text-xs text-muted-foreground">
                        {preview === undefined
                          ? listPreviewsQuery.error ? 'Could not load title count' : 'Loading title count…'
                          : `${preview.count} ${preview.count === 1 ? 'title' : 'titles'}`}
                      </p>
                    </div>
                    {posterItems.length > 0 && (
                      <ListPosterStack items={posterItems} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {listPreviewsQuery.error && (
        <Alert variant="destructive">
          <AlertDescription>Could not load custom-list title counts: {listPreviewsQuery.error.message}</AlertDescription>
        </Alert>
      )}
      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </main>
  );
}

function ListPosterStack({ items }: { items: TMDBUserListItem[] }) {
  const stackPositions = [
    'left-0 top-2 rotate-[-12deg]',
    'left-5 top-1 rotate-[-2deg]',
    'left-10 top-2 rotate-[9deg]',
  ];

  return (
    <div aria-hidden="true" className="relative h-24 w-24 shrink-0">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={`${item.media_type}:${item.id}`}
          className={`absolute h-[4.75rem] w-[3.2rem] overflow-hidden rounded-md border border-background bg-muted shadow-md ${stackPositions[index]}`}
        >
          <TMDBImage
            path={item.poster_path}
            alt=""
            width={185}
            height={278}
            sizes="52px"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
