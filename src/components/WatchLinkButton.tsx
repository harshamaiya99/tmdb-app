import { PlayCircle, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button, type ButtonProps } from '@/components/ui/button';

interface WatchLink {
  name: string;
  url: string;
}

interface WatchLinkButtonProps {
  links: WatchLink[];
  label: string;
  className?: string;
  size?: ButtonProps['size'];
  onEmpty?: () => void;
}

export function WatchLinkButton({ links, label, className, size, onEmpty }: WatchLinkButtonProps) {
  const handleEmptyClick = () => {
    if (links.length === 0) {
      onEmpty?.();
    }
  };

  if (links.length === 1) {
    return (
      <Button asChild size={size} className={`gap-2 ${className ?? ''}`}>
        <a href={links[0].url} target="_blank" rel="noopener noreferrer">
          <PlayCircle className="h-5 w-5" />
          {label}
        </a>
      </Button>
    );
  }

  if (links.length > 1) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button type="button" size={size} className={`gap-2 ${className ?? ''}`}>
            <PlayCircle className="h-5 w-5" />
            {label}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            className="z-[110] min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {links.map((link, index) => (
              <DropdownMenu.Item key={`${link.name}:${index}`} asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-10 cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent"
                >
                  {link.name}
                </a>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={handleEmptyClick}
      disabled={links.length === 0}
      className={`gap-2 ${className ?? ''}`}
    >
      <PlayCircle className="h-5 w-5" />
      {label}
    </Button>
  );
}