import { ReactNode } from "react";
import { Menu } from "./menu";
import { Loader2 } from "lucide-react";

interface MenuLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
}

export function MenuLayout({ children, isLoading = false }: MenuLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex h-full">
        <div className="w-52 flex-shrink-0">
          <Menu />
        </div>
        <main className="flex-1 min-w-0 w-full bg-gray-50 dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}