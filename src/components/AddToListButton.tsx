import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, ListPlus, Loader2, Plus, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService } from '@/lib/tmdb';

interface AddToListButtonProps {
  mediaId: number;
  mediaTitle: string;
}

export function AddToListButton({ mediaId, mediaTitle }: AddToListButtonProps) {
  const { account, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [pendingListId, setPendingListId] = useState<number | null>(null);
  const [membershipRevision, setMembershipRevision] = useState(0);
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [listPage, setListPage] = useState(1);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const membershipQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:user-list-memberships:${membershipRevision}`,
    (signal) => tmdbService.getAccountUserListMemberships(account?.id ?? 0, sessionId, signal),
    { enabled: Boolean(account) },
  );
  const listsQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:user-lists:${listPage}:${membershipRevision}`,
    (signal) => tmdbService.getAccountLists(account?.id ?? 0, listPage, sessionId, signal),
    { enabled: isOpen && Boolean(account) },
  );
  const lists = listsQuery.data?.results ?? [];
  const addedListIds = membershipQuery.data
    ?.filter((list) => list.mediaIds.includes(mediaId))
    .map((list) => list.listId) ?? [];
  const canToggleMembership = membershipQuery.data !== undefined && !membershipQuery.error;

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  const closeDialog = () => {
    setIsOpen(false);
    setIsCreateFormOpen(false);
    setListName('');
    setDescription('');
    setIsPublic(false);
    setListPage(1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && pendingListId === null && !isSubmittingCreate) closeDialog();
  };

  const handleToggleList = async (listId: number) => {
    const isAdded = addedListIds.includes(listId);
    setPendingListId(listId);
    try {
      if (isAdded) {
        await tmdbService.removeMediaFromUserList(listId, mediaId, sessionId);
      } else {
        await tmdbService.addMediaToUserList(listId, mediaId, sessionId);
      }
      clearRequestCache('account:');
      setMembershipRevision((revision) => revision + 1);
      const listName = lists.find((list) => list.id === listId)?.name ?? 'list';
      toast({ title: isAdded ? `Removed from ${listName}` : `Added to ${listName}` });
    } catch (error) {
      toast({
        title: isAdded ? 'Could not remove title from list' : 'Could not add title to list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingListId(null);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = listName.trim();
    if (!name) return;
    setIsSubmittingCreate(true);
    let createdListId: number | null = null;
    try {
      const createdList = await tmdbService.createUserList(name, description.trim(), isPublic, sessionId);
      createdListId = createdList.list_id;
      await tmdbService.addMediaToUserList(createdList.list_id, mediaId, sessionId);
      clearRequestCache('account:');
      setMembershipRevision((revision) => revision + 1);
      toast({ title: `Created ${name} and added title` });
      closeDialog();
    } catch (error) {
      clearRequestCache('account:');
      if (createdListId !== null) setMembershipRevision((revision) => revision + 1);
      toast({
        title: createdListId ? 'List created, but could not add title' : 'Could not create list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  return (
    <>
      <Button type="button" variant={addedListIds.length > 0 ? 'secondary' : 'outline'} size="sm" className="gap-1.5" onClick={() => setIsOpen(true)}>
        {membershipQuery.loading
          ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          : addedListIds.length > 0
          ? <Check aria-hidden="true" className="h-4 w-4" />
          : <ListPlus aria-hidden="true" className="h-4 w-4" />}
        {membershipQuery.loading
          ? 'Checking lists…'
          : membershipQuery.error
            ? 'Check list status'
            : addedListIds.length > 0
              ? 'Added to list'
              : 'Add to list'}
      </Button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && pendingListId === null && !isSubmittingCreate) closeDialog();
          }}
          onKeyDown={handleKeyDown}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-list-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-5 shadow-xl sm:p-6"
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="add-to-list-title" className="text-lg font-semibold">Add to list</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{mediaTitle}</p>
              </div>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close dialog"
                disabled={pendingListId !== null || isSubmittingCreate}
                onClick={closeDialog}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </header>

            {listsQuery.loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading your lists…</p>
            ) : listsQuery.error ? (
              <p role="alert" className="py-4 text-sm text-destructive">{listsQuery.error.message}</p>
            ) : lists.length > 0 ? (
              <>
                {membershipQuery.loading ? (
                  <p className="mb-2 text-xs text-muted-foreground">Checking which lists contain this movie…</p>
                ) : membershipQuery.error ? (
                  <Alert variant="destructive" className="mb-2">
                    <AlertDescription>Could not check list membership: {membershipQuery.error.message}</AlertDescription>
                  </Alert>
                ) : null}
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {lists.map((list) => {
                    const added = addedListIds.includes(list.id);
                    return (
                      <li key={list.id}>
                        <Button
                          type="button"
                          variant={added ? 'secondary' : 'ghost'}
                          className="h-auto min-h-10 w-full justify-between gap-3 px-3 py-2 text-left"
                          disabled={pendingListId !== null || !canToggleMembership}
                          aria-label={`${added ? 'Remove from' : 'Add to'} ${list.name}`}
                          onClick={() => void handleToggleList(list.id)}
                        >
                          <span className="min-w-0 truncate">{list.name}</span>
                          {pendingListId === list.id ? (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                              {added ? 'Removing…' : 'Adding…'}
                            </span>
                          ) : added ? (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                              <Check aria-hidden="true" className="h-4 w-4" />
                              Added
                              <X aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Plus aria-hidden="true" className="h-4 w-4" />
                              Add
                            </span>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">You don’t have any lists yet.</p>
            )}

            {(listsQuery.data?.total_pages ?? 1) > 1 && (
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <Button type="button" variant="ghost" size="sm" disabled={listPage <= 1} onClick={() => setListPage((current) => current - 1)}>Previous</Button>
                <span>Page {listPage} of {listsQuery.data?.total_pages}</span>
                <Button type="button" variant="ghost" size="sm" disabled={listPage >= (listsQuery.data?.total_pages ?? 1)} onClick={() => setListPage((current) => current + 1)}>Next</Button>
              </div>
            )}

            {!isCreateFormOpen ? (
              <Button type="button" variant="outline" className="mt-4 w-full" disabled={pendingListId !== null} onClick={() => setIsCreateFormOpen(true)}>
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
                Create a new list
              </Button>
            ) : (
              <form onSubmit={(event) => void handleCreate(event)} className="mt-4 space-y-3 border-t pt-4">
                <label className="sr-only" htmlFor={`new-list-name-${mediaId}`}>List name</label>
                <Input
                  id={`new-list-name-${mediaId}`}
                  value={listName}
                  maxLength={100}
                  required
                  placeholder="List name"
                  onChange={(event) => setListName(event.currentTarget.value)}
                />
                <label className="sr-only" htmlFor={`new-list-description-${mediaId}`}>Description (optional)</label>
                <Input
                  id={`new-list-description-${mediaId}`}
                  value={description}
                  maxLength={500}
                  placeholder="Description (optional)"
                  onChange={(event) => setDescription(event.currentTarget.value)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.currentTarget.checked)} />
                  Make this list public
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" disabled={isSubmittingCreate} onClick={() => setIsCreateFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmittingCreate || !listName.trim()}>
                    {isSubmittingCreate && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmittingCreate ? 'Creating and adding…' : 'Create and add'}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
