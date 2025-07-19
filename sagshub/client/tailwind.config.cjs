// =============================================================================
// SAGSHUB TAILWINDCSS KONFIGURATION
// =============================================================================
// Denne fil konfigurerer TailwindCSS utility-first CSS framework og indeholder:
// - Content paths for CSS purging optimization
// - Custom theme udvidelser og farvepalette
// - Dark mode konfiguration
// - Plugin system med animations
// - Design system tokens til konsistent styling
// =============================================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  // =================================================================
  // DARK MODE KONFIGURATION
  // =================================================================
  darkMode: "class",                                          // Aktiverer dark mode via CSS class på html element

  // =================================================================
  // CONTENT SCANNING FOR CSS PURGING
  // =================================================================
  // Definerer hvor TailwindCSS skal scanne for class names til optimization
  content: [
    "./pages/**/*.{ts,tsx}",                                  // Next.js pages (hvis brugt)
    "./components/**/*.{ts,tsx}",                             // Standalone komponenter
    "./app/**/*.{ts,tsx}",                                    // App directory komponenter
    "./src/**/*.{ts,tsx}",                                    // Alle TypeScript/React filer i src
  ],

  // =================================================================
  // CUSTOM THEME UDVIDELSER
  // =================================================================
  theme: {
    // Container component konfiguration
    container: {
      center: true,                                           // Centrerer container automatisk
      padding: "2rem",                                        // Standard padding på container
      screens: {                                              // Responsive breakpoints
        "2xl": "1400px",                                      // Maximum bredde på største skærme
      },
    },
    
    // Custom theme udvidelser
    extend: {
      // =============================================================
      // FARVEPALETTE SYSTEM
      // =============================================================
      // Design system farver med CSS custom properties til dark mode support
      colors: {
        // Brand farver
        border: "hsl(var(--border))",                         // Standard border farve
        input: "hsl(var(--input))",                           // Input field border
        ring: "hsl(var(--ring))",                             // Focus ring farve
        background: "hsl(var(--background))",                 // Hovedbaggrund
        foreground: "hsl(var(--foreground))",                 // Hovedtekst farve
        
        // Primary brand farver (hovedfarve tema)
        primary: {
          DEFAULT: "hsl(var(--primary))",                     // Primary farve (buttons, links)
          foreground: "hsl(var(--primary-foreground))",       // Tekst på primary baggrund
        },
        
        // Secondary brand farver (sekundær farve tema)
        secondary: {
          DEFAULT: "hsl(var(--secondary))",                   // Secondary baggrund farve
          foreground: "hsl(var(--secondary-foreground))",     // Tekst på secondary baggrund
        },
        
        // Destruktive handlinger (slet, fjern, fejl)
        destructive: {
          DEFAULT: "hsl(var(--destructive))",                 // Farlige handlinger (rød)
          foreground: "hsl(var(--destructive-foreground))",   // Tekst på destructive baggrund
        },
        
        // Dæmpede/muted elementer
        muted: {
          DEFAULT: "hsl(var(--muted))",                       // Dæmpet baggrund
          foreground: "hsl(var(--muted-foreground))",         // Dæmpet tekst
        },
        
        // Accent farver (highlighting, call-to-action)
        accent: {
          DEFAULT: "hsl(var(--accent))",                      // Accent farve
          foreground: "hsl(var(--accent-foreground))",        // Tekst på accent baggrund
        },
        
        // Popover/dropdown styling
        popover: {
          DEFAULT: "hsl(var(--popover))",                     // Popover baggrund
          foreground: "hsl(var(--popover-foreground))",       // Popover tekst
        },
        
        // Card komponenter
        card: {
          DEFAULT: "hsl(var(--card))",                        // Card baggrund
          foreground: "hsl(var(--card-foreground))",          // Card tekst
        },
      },
      
      // =============================================================
      // BORDER RADIUS SYSTEM
      // =============================================================
      // Konsistente border radius værdier gennem design systemet
      borderRadius: {
        lg: "var(--radius)",                                  // Large radius (buttons, cards)
        md: "calc(var(--radius) - 2px)",                     // Medium radius
        sm: "calc(var(--radius) - 4px)",                     // Small radius
      },
      
      // =============================================================
      // ANIMATION SYSTEM
      // =============================================================
      // Custom animationer til smooth UI transitions
      keyframes: {
        // Accordion slide down animation
        "accordion-down": {
          from: { height: "0" },                             // Start lukket
          to: { height: "var(--radix-accordion-content-height)" }, // Åbn til content højde
        },
        
        // Accordion slide up animation  
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" }, // Start åben
          to: { height: "0" },                               // Luk til 0 højde
        },
      },
      
      // Animation class names
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",    // Accordion åbne animation
        "accordion-up": "accordion-up 0.2s ease-out",        // Accordion lukke animation
      },
    },
  },
  
  // =================================================================
  // PLUGINS SYSTEM
  // =================================================================
  // TailwindCSS plugins til udvidet funktionalitet
  plugins: [
    require("tailwindcss-animate"),                           // Animation utilities plugin
    // Tilføj flere plugins her efter behov:
    // require('@tailwindcss/forms'),                        // Bedre form styling
    // require('@tailwindcss/typography'),                   // Prose/content styling
  ],
}; 