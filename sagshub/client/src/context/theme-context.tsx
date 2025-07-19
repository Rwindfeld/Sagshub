// =============================================================================
// SAGSHUB THEME CONTEXT
// =============================================================================
// Denne fil implementerer global theme management for SagsHub applikationen og indeholder:
// - React Context til theme state management
// - Theme persistence i localStorage
// - System theme detection og automatic switching
// - Dark/light mode toggle funktionalitet
// - Theme provider komponent til wrapping af app
// =============================================================================

// Import af React hooks og funktionaliteter
import React, { createContext, useContext, useEffect, useState } from 'react'; // React context og hooks

// =============================================================================
// TYPE DEFINITIONER
// =============================================================================

// Theme type definition - kun dark og light understøttes
type Theme = 'dark' | 'light';

// Theme context interface definition
interface ThemeContextType {
  theme: Theme;                                                // Nuværende theme (dark/light)
  setTheme: (theme: Theme) => void;                           // Funktion til at sætte specifik theme
  toggleTheme: () => void;                                    // Funktion til at toggle mellem themes
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

// Opretter theme context med undefined default (kræver provider)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// THEME PROVIDER KOMPONENT
// =============================================================================

// Theme provider komponent der wrapper hele applikationen
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // =================================================================
  // STATE MANAGEMENT
  // =================================================================
  
  // State til at holde nuværende theme med lazy initialization
  const [theme, setThemeState] = useState<Theme>(() => {
    // Tjekker localStorage først for saved preference
    if (typeof window !== 'undefined') {                       // Sikrer vi er på client-side
      const saved = localStorage.getItem('sagshub-theme');      // Henter saved theme fra localStorage
      if (saved === 'dark' || saved === 'light') {             // Validerer at det er en valid theme
        return saved as Theme;                                  // Returnerer saved theme
      }
      
      // Fallback til system preference hvis ingen saved theme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Server-side rendering fallback
    return 'light';                                            // Default til light theme under SSR
  });

  // =================================================================
  // THEME MANAGEMENT FUNKTIONER
  // =================================================================
  
  // Funktion til at sætte theme og persistere i localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);                                   // Opdaterer state
    localStorage.setItem('sagshub-theme', newTheme);           // Gemmer i localStorage for persistence
    
    // Opdaterer DOM classes for styling
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');          // Tilføjer dark class til html element
    } else {
      document.documentElement.classList.remove('dark');       // Fjerner dark class fra html element
    }
  };

  // Funktion til at toggle mellem dark og light theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';      // Bestemmer modsat theme
    setTheme(newTheme);                                        // Sætter nyt theme
  };

  // =================================================================
  // EFFECTS
  // =================================================================
  
  // Effect til at initialize theme på første load
  useEffect(() => {
    // Sætter initial DOM class baseret på theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');          // Tilføjer dark class hvis dark theme
    } else {
      document.documentElement.classList.remove('dark');       // Fjerner dark class hvis light theme
    }
  }, [theme]);                                                 // Kører når theme ændres

  // Effect til at lytte til system theme changes
  useEffect(() => {
    // Opretter media query til at detecte system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Handler funktion til system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      // Kun opdater hvis der ikke er en saved preference
      const savedTheme = localStorage.getItem('sagshub-theme');
      if (!savedTheme) {                                       // Kun hvis ingen bruger preference
        const systemTheme = e.matches ? 'dark' : 'light';      // Bestemmer system theme
        setTheme(systemTheme);                                 // Opdaterer til system theme
      }
    };

    // Tilføjer event listener til media query
    mediaQuery.addEventListener('change', handleChange);       // Lytter til system theme changes

    // Cleanup function til at fjerne event listener
    return () => {
      mediaQuery.removeEventListener('change', handleChange);  // Fjerner listener ved unmount
    };
  }, []);                                                      // Kører kun på mount

  // =================================================================
  // CONTEXT VALUE OG PROVIDER
  // =================================================================
  
  // Context value objekt med alle theme funktioner
  const value: ThemeContextType = {
    theme,                                                     // Nuværende theme state
    setTheme,                                                  // Funktion til at sætte specifik theme
    toggleTheme,                                               // Funktion til at toggle theme
  };

  // Returnerer provider med context value
  return (
    <ThemeContext.Provider value={value}>
      {children}                                               {/* Render children komponenter */}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// CUSTOM HOOK TIL THEME ACCESS
// =============================================================================

// Custom hook til at bruge theme context
export function useTheme() {
  // Henter context fra React context
  const context = useContext(ThemeContext);
  
  // Thrower error hvis hook bruges uden for provider
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider'); // Developer error message
  }
  
  return context;                                              // Returnerer theme context
} 