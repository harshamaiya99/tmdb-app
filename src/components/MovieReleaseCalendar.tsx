import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MediaSection } from '@/components/MediaSection';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { tmdbService } from '@/lib/tmdb';
import { formatDate } from '@/lib/utils';

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function MovieReleaseCalendar({ region }: { region: string }) {
  const today = new Date();
  const [displayedMonth, setDisplayedMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(today));

  const monthKey = `${displayedMonth.getFullYear()}-${String(displayedMonth.getMonth() + 1).padStart(2, '0')}`;
  const releases = useCachedQuery(
    `release-calendar:movies:${selectedDate}:${region}`,
    (signal) => tmdbService.getMoviesByReleaseDateRange(selectedDate, selectedDate, 1, { signal }, region),
  );
  const selectedMovies = releases.data?.results.filter((movie) => movie.release_date === selectedDate) ?? [];
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(displayedMonth);
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 7 + index);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  });
  const daysInMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
  const leadingDays = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const changeMonth = (amount: number) => {
    const nextMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + amount, 1);
    setDisplayedMonth(nextMonth);
    setSelectedDate(nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() === today.getMonth()
      ? getDateKey(today)
      : getDateKey(nextMonth));
  };

  return (
    <section aria-labelledby="movie-release-calendar-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="movie-release-calendar-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Movie Release Calendar
          </h2>
        </div>
      </div>

      <Card className="p-3 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <div>
            <div className="mb-4 flex min-h-11 items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold" aria-live="polite">{monthLabel}</h3>
              <div className="flex items-center gap-2">
                {monthKey !== currentMonthKey && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => changeMonth(
                    (today.getFullYear() - displayedMonth.getFullYear()) * 12 + today.getMonth() - displayedMonth.getMonth(),
                  )}>
                    Today
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div role="group" aria-label={`${monthLabel} movie releases`}>
              <div className="mb-2 grid grid-cols-7">
                {weekdays.map((weekday) => (
                  <div key={weekday} className="py-2 text-center text-xs font-medium text-muted-foreground">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((day, index) => {
                  if (day === null) return <div key={`empty-${index}`} aria-hidden="true" />;
                  const date = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day);
                  const dateKey = getDateKey(date);
                  const isSelected = selectedDate === dateKey;
                  const isToday = getDateKey(today) === dateKey;
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      aria-label={formatSelectedDate(dateKey)}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedDate(dateKey)}
                      className={`flex min-h-9 items-center justify-center rounded-lg border text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'border-transparent'
                      } ${isToday && !isSelected ? 'border-primary/50 font-semibold' : ''}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-w-0 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">
                {formatDate(selectedDate)}
              </h3>
              {releases.data && releases.data.total_results > 6 && (
                <Button asChild type="button" variant="ghost" size="sm">
                  <Link to={`/releases/${selectedDate}`} aria-label={`See all movies released on ${formatSelectedDate(selectedDate)}`}>
                    See More &rarr;
                  </Link>
                </Button>
              )}
            </div>
            {releases.loading ? (
              <p className="text-sm text-muted-foreground">Loading releases…</p>
            ) : releases.error ? (
              <p className="text-sm text-muted-foreground">Movie releases could not be loaded.</p>
            ) : selectedMovies.length > 0 ? (
              <MediaSection
                title=""
                items={selectedMovies}
                type="movie"
                hideSeeMore
                limit={7}
                horizontalScroll
                horizontalColumns={7}
                className="space-y-0"
              />
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No movies found for this date.
              </p>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
