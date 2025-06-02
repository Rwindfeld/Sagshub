import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 