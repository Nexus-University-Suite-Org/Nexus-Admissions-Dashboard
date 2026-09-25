import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // resolvedTheme is undefined until next-themes has read storage, so
  // render a disabled placeholder rather than guessing the wrong icon.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        disabled
        className="rounded-lg text-[hsl(var(--muted-foreground))]"
      >
        <Sun size={18} />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const target = isDark ? 'light' : 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      data-testid="button-theme-toggle"
      aria-label={`Switch to ${target} mode`}
      title={`Switch to ${target} mode`}
      onClick={() => setTheme(target)}
      className="rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
