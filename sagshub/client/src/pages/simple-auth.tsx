import React, { useState } from 'react';
import '../basic-styles.css';

export default function SimpleAuthPage() {
  const [activeTab, setActiveTab] = useState<'customer'|'worker'>('customer');
  
  return (
    <div className="login-container">
      <div>
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'customer' ? 'active' : ''}`} 
            onClick={() => setActiveTab('customer')}
          >
            Kunde Login
          </div>
          <div 
            className={`tab ${activeTab === 'worker' ? 'active' : ''}`}
            onClick={() => setActiveTab('worker')}
          >
            Medarbejder Login
          </div>
        </div>
        
        {activeTab === 'customer' && (
          <div className="login-card">
            <h1 className="login-title">Velkommen kunde</h1>
            <p className="login-description">Log ind for at se dine sager</p>
            
            <form className="login-form">
              <div className="form-group">
                <label className="form-label">Brugernavn</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Indtast brugernavn"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Adgangskode</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Indtast adgangskode"
                />
              </div>
              
              <button
                type="submit"
                className="login-button"
              >
                Log ind
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'worker' && (
          <div className="login-card">
            <h1 className="login-title">Medarbejder Login</h1>
            <p className="login-description">Log ind som medarbejder</p>
            
            <form className="login-form">
              <div className="form-group">
                <label className="form-label">Medarbejder ID</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Indtast medarbejder ID"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Adgangskode</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Indtast adgangskode"
                />
              </div>
              
              <button
                type="submit"
                className="login-button"
              >
                Log ind
              </button>
            </form>
          </div>
        )}
      </div>
      
      <div className="company-sidebar">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>TJdata</h1>
          <p style={{ fontSize: '18px', color: '#94a3b8' }}>TJdata ApS (CVR: 30550269)</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p>Ørstedsgade 8</p>
          <p>5000 Odense C</p>
          <a
            href="https://maps.google.com/?q=Ørstedsgade+8,+5000+Odense+C"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa' }}
          >
            Find vej med Google Maps
          </a>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p>Tlf: 46 93 20 61</p>
          <a 
            href="mailto:salg@tjdata.dk" 
            style={{ color: '#60a5fa' }}
          >
            salg@tjdata.dk
          </a>
        </div>

        <div>
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>Vores åbningstider:</p>
          <p>Mandag – Fredag: 10:00 – 17:30</p>
          <p>Første og Sidste Lørdag i en måned: 10:00 – 14:00</p>
          <p>Søndag & Helligdage: Lukket</p>
        </div>
      </div>
    </div>
  );
} 