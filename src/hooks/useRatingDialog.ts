import { useRef, useState } from 'react';

export function useRatingDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const actionInProgress = useRef(false);

  const openDialog = () => setIsOpen(true);

  const closeDialog = () => {
    if (actionInProgress.current) return;
    setIsOpen(false);
    setHoveredRating(null);
  };

  const runAction = async (rating: number, action: () => Promise<void>) => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setPendingRating(rating);
    try {
      await action();
      setIsOpen(false);
      setHoveredRating(null);
    } finally {
      actionInProgress.current = false;
      setPendingRating(null);
    }
  };

  return {
    isOpen,
    hoveredRating,
    pendingRating,
    setHoveredRating,
    openDialog,
    closeDialog,
    runAction,
  };
}
