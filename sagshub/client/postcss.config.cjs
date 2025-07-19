// =============================================================================
// SAGSHUB POSTCSS KONFIGURATION
// =============================================================================
// Denne fil konfigurerer PostCSS CSS post-processor og indeholder:
// - TailwindCSS plugin til utility-first CSS framework
// - Autoprefixer til automatisk vendor prefix håndtering
// - CSS processing pipeline til optimeret styling
// =============================================================================

module.exports = {
  // =================================================================
  // CSS PROCESSING PLUGINS
  // =================================================================
  // PostCSS plugins køres i rækkefølge på alle CSS filer
  plugins: {
    // TailwindCSS - Utility-first CSS framework
    tailwindcss: {},                                          // Hovedstyling framework med utility classes
    
    // Autoprefixer - Automatisk vendor prefix tilføjelse
    autoprefixer: {},                                         // Tilføjer -webkit-, -moz-, -ms- prefixes automatisk
    // Eksempel: "transform" bliver til "-webkit-transform: ...; transform: ..."
    // Baseret på browserlist konfiguration for browser support
  },
}; 