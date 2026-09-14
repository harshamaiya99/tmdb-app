import { useSearchParams } from 'react-router-dom';

export function usePagination() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const setPage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(Math.max(1, nextPage)));
    setSearchParams(nextParams);
  };

  return { page, searchParams, setSearchParams, setPage };
}