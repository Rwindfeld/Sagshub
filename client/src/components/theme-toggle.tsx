import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '@/context/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={`Skift til ${theme === 'light' ? 'mørkt' : 'lyst'} tema`}
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      ) : (
        <Sun className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      )}
      <span className="sr-only">
        {theme === 'light' ? 'Skift til mørkt tema' : 'Skift til lyst tema'}
      </span>
    </Button>
  );
} 