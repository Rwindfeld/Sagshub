// =============================================================================
// SAGSHUB REACT APPLIKATION ENTRY POINT
// =============================================================================
// Dette er hovedindgangspunktet for React frontend applikationen og indeholder:
// - React 18 concurrent features setup
// - React DOM rendering til HTML
// - Global CSS imports
// - Root komponenter mounting
// - Development mode konfiguration
// =============================================================================

// =================================================================
// REACT FRAMEWORK IMPORTS
// =================================================================
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

// =================================================================
// APPLICATION IMPORTS
// =================================================================
import App from './src/App.tsx';                               // Hoved React applikationskomponent

// =================================================================
// GLOBAL STYLING IMPORTS
// =================================================================
import './src/index.css';                                      // Global CSS styles og TailwindCSS base

// =================================================================
// DEVELOPMENT TOOLS
// =================================================================
// Kun tilgængelig i development mode
if (import.meta.env.DEV) {
  // React DevTools og Hot Module Replacement er automatisk aktiveret via Vite
  console.log('🚀 SagsHub development mode aktiveret');        // Development mode indikator
}

// =============================================================================
// REACT APPLICATION BOOTSTRAP
// =============================================================================

// =================================================================
// DOM ELEMENT REFERENCE
// =================================================================
// Henter root element fra index.html hvor React skal mountes
const rootElement = document.getElementById('root');           // HTML root element fra index.html

// =================================================================
// REACT 18 ROOT CREATION
// =================================================================
// Opretter React 18 concurrent root til moderne features
const root = ReactDOM.createRoot(rootElement);                // React 18 root creation (root element fra HTML)

// =================================================================
// APPLICATION RENDERING
// =================================================================
// Renderer hele React applikationen til DOM
root.render(
  <React.StrictMode>                                          {/* Udviklings mode med ekstra warnings og checks */}
    <App />                                                   {/* Hoved applikationskomponent */}
  </React.StrictMode>
);

// =============================================================================
// REACT STRICT MODE FORDELE
// =============================================================================
// React.StrictMode aktiverer:
// - Detektion af unsafe lifecycle methods
// - Warnings om deprecated APIs  
// - Dobbelt rendering i development (for side effect detection)
// - Warnings om legacy string ref usage
// - Detektion af uventede side effects

// =============================================================================
// HOT MODULE REPLACEMENT (HMR)
// =============================================================================
// Vite håndterer automatisk hot reloading af komponenter i development
// Ingen manuel HMR konfiguration nødvendig - fungerer out-of-the-box

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus('Forsøger at logge ind...');
    
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Login fejlede. Kontroller brugernavn og adgangskode.');
      }
      
      const data = await response.json();
      setUser(data);
      setLoggedIn(true);
      setStatus(`Logget ind som ${data.name}`);
    } catch (error) {
      setStatus(`Fejl: ${error.message}`);
      console.error('Login fejl:', error);
    }
  };
  
  return (
    <div style={{ fontFamily: 'Arial', maxWidth: '500px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
      <h1>SagsHub</h1>
      
      {!loggedIn ? (
        <div>
          <h2>Log ind</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Brugernavn:</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Adgangskode:</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            
            <button 
              type="submit"
              style={{ background: '#4CAF50', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
            >
              Log ind
            </button>
            
            <p>Brug f.eks. Brugernavn: Rattana / Adgangskode: password123</p>
            
            {status && <p style={{ color: status.includes('Fejl') ? 'red' : 'green', marginTop: '15px' }}>{status}</p>}
          </form>
        </div>
      ) : (
        <div>
          <h2>Velkommen, {user.name}!</h2>
          <p>Du er nu logget ind i SagsHub systemet.</p>
          <p>Rolle: {user.isAdmin ? 'Administrator' : user.isWorker ? 'Medarbejder' : 'Bruger'}</p>
        </div>
      )}
    </div>
  );
} 