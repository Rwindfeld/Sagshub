// Automatisk detektering af base URL afhængigt af host
const getBaseUrl = () => {
  // I udvikling: brug nuværende host eller lokalt fallback
  if (import.meta.env.DEV) {
    return window.location.origin.replace(':5174', ':3000');
  }
  
  // I produktion: brug samme host som clienten
  return window.location.origin;
};

export const BASE_URL = getBaseUrl();
export const WS_URL = BASE_URL.replace('http', 'ws');