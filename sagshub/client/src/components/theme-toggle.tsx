// =============================================================================
// SAGSHUB THEME TOGGLE KOMPONENT
// =============================================================================
// Denne komponent implementerer dark/light mode toggle funktionalitet og indeholder:
// - Button til at skifte mellem dark og light mode
// - Ikon der ændres baseret på nuværende theme
// - Integration med theme context for global state management
// - Accessibility support med proper labeling
// =============================================================================

// Import af React hooks
import { useEffect, useState } from "react";                   // React state management

// Import af UI komponenter
import { Button } from "@/components/ui/button";               // Button komponent
import { Moon, Sun } from "lucide-react";                      // Theme ikoner fra Lucide

// Import af theme context
import { useTheme } from "@/context/theme-context";            // Custom theme context hook

// =============================================================================
// THEME TOGGLE KOMPONENT
// =============================================================================
export function ThemeToggle() {
  // =================================================================
  // HOOKS OG STATE
  // =================================================================
  
  // Henter theme state og toggle funktion fra context
  const { theme, toggleTheme } = useTheme();                   // Global theme state management
  
  // Local state til at håndtere mounted state (forhindrer hydration mismatch)
  const [mounted, setMounted] = useState(false);               // Tracker om komponenten er mounted

  // =================================================================
  // EFFECTS
  // =================================================================
  
  // Effect til at sætte mounted state (forhindrer SSR/hydration issues)
  useEffect(() => {
    setMounted(true);                                          // Markerer komponenten som mounted efter første render
  }, []);

  // =================================================================
  // EARLY RETURN TIL SSR SUPPORT
  // =================================================================
  
  // Returnerer placeholder under server-side rendering for at undgå hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>            {/* Disabled placeholder button */}
        <Sun className="h-5 w-5" />                           {/* Default ikon under SSR */}
      </Button>
    );
  }

  // =================================================================
  // RENDER
  // =================================================================
  return (
    <Button
      variant="ghost"                                          // Ghost variant for subtil styling
      size="icon"                                              // Icon-only button størrelse
      onClick={toggleTheme}                                    // Kalder toggle funktion fra context
      aria-label={theme === "dark" ? "Skift til lys mode" : "Skift til mørk mode"} // Accessibility label
      title={theme === "dark" ? "Skift til lys mode" : "Skift til mørk mode"} // Tooltip tekst
    >
      {/* Conditional rendering af ikoner baseret på nuværende theme */}
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />                           // Sol ikon i dark mode (skift til light)
      ) : (
        <Moon className="h-5 w-5" />                          // Måne ikon i light mode (skift til dark)
      )}
    </Button>
  );
} 