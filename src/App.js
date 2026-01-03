import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyA1Gz-ys-SHmapDBLoo__hWOrGqbxNHS6c",
  authDomain: "iaas-emergency-system.firebaseapp.com",
  databaseURL: "https://iaas-emergency-system-default-rtdb.firebaseio.com",
  projectId: "iaas-emergency-system",
  storageBucket: "iaas-emergency-system.firebasestorage.app",
  messagingSenderId: "929039028",
  appId: "1:929039028:web:bf1a328f2e4b1fd0370de1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [view, setView] = useState('login'); 
  const [isVerified, setIsVerified] = useState(false);
  const [adminAuth, setAdminAuth] = useState({ user: '', pass: '' });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const statusRef = ref(db, 'system');
    onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsVerified(data.verified);
      }
    });
  }, []);

  const containerStyle = { 
    backgroundColor: '#0f172a', 
    minHeight: '100vh', 
    color: 'white', 
    padding: '40px', 
    textAlign: 'center', 
    fontFamily: 'sans-serif' 
  };
  
  const buttonStyle = { 
    width: '100%', 
    padding: '20px', 
    margin: '10px 0', 
    borderRadius: '8px', 
    border: 'none', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '16px'
  };

  const inputStyle = {
    width: '100%',
    padding: '15px',
    margin: '10px 0',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: 'white'
  };

  // --- VIEW: LOGIN PAGE ---
  if (view === 'login') {
    return (
      <div style={containerStyle}>
        <h1 style={{ color: '#ef4444', marginBottom: '40px' }}>EMERGENCY PORTAL</h1>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <button onClick={() => setView('driver')} style={{ ...buttonStyle, backgroundColor: '#2563eb', color: 'white' }}>DRIVER LOGIN</button>
          <button onClick={() => setView('admin')} style={{ ...buttonStyle, backgroundColor: '#475569', color: 'white' }}>ADMIN LOGIN</button>
        </div>
      </div>
    );
  }

  // --- VIEW: ADMIN AUTH & PANEL ---
  if (view === 'admin') {
    if (!isAdminLoggedIn) {
      return (
        <div style={containerStyle}>
          <button onClick={() => setView('login')} style={{ background: 'none', color: '#60a5fa', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
          <h2>Admin Login</h2>
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <input 
              placeholder='Username' 
              style={inputStyle} 
              onChange={(e) => setAdminAuth({...adminAuth, user: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder='Password' 
              style={inputStyle} 
              onChange={(e) => setAdminAuth({...adminAuth, pass: e.target.value})} 
            />
            <button 
              style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white' }}
              onClick={() => {
                if(adminAuth.user === 'Admin' && adminAuth.pass === '12345678') {
                  setIsAdminLoggedIn(true);
                } else {
                  alert("Invalid Credentials");
                }
              }}
            >Login</button>
          </div>
        </div>
      );
    }
    return (
      <div style={containerStyle}>
        <button onClick={() => setIsAdminLoggedIn(false)} style={{ background: 'none', color: '#60a5fa', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>← Logout Admin</button>
        <h2 style={{ marginBottom: '30px' }}>Admin Verification Panel</h2>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', maxWidth: '500px', margin: '0 auto', border: '1px solid #334155' }}>
          <p style={{ marginBottom: '20px' }}>User Device: <strong>ESP32-VEHICLE-01</strong></p>
          <button 
            onClick={() => update(ref(db, 'system'), { verified: !isVerified })}
            style={{ ...buttonStyle, backgroundColor: isVerified ? '#dc2626' : '#16a34a', color: 'white' }}
          >
            {isVerified ? "REVOKE ACCESS" : "VERIFY USER"}
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: DRIVER DASHBOARD ---
  return (
    <div style={containerStyle}>
      <button onClick={() => setView('login')} style={{ background: 'none', color: '#60a5fa', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>← Logout</button>
      <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>Driver Command Center</h2>
      
      {/* Phone Validation UI */}
      <div style={{ maxWidth: '400px', margin: '0 auto 20px auto' }}>
          <input 
            placeholder="Enter 10-digit Phone" 
            maxLength={10}
            style={inputStyle} 
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
          />
      </div>

      <div style={{ border: `2px solid ${isVerified ? '#ef4444' : '#334155'}`, padding: '40px', borderRadius: '15px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ marginBottom: '30px', fontWeight: 'bold' }}>
          STATUS: {isVerified ? "✅ VERIFIED" : "⏳ AWAITING ADMIN APPROVAL"}
        </p>
        <button 
          disabled={!isVerified || phone.length !== 10}
          onClick={() => {
            update(ref(db, 'system'), { trigger: true });
            setTimeout(() => update(ref(db, 'system'), { trigger: false }), 2000);
            alert("EMERGENCY SIGNAL SENT!");
          }}
          style={{ 
            ...buttonStyle, 
            height: '200px', 
            fontSize: '24px', 
            backgroundColor: (isVerified && phone.length === 10) ? '#ef4444' : '#1e293b', 
            color: (isVerified && phone.length === 10) ? 'white' : '#475569',
            boxShadow: (isVerified && phone.length === 10) ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none'
          }}
        >
          {(isVerified && phone.length === 10) ? "TRIGGER EMERGENCY" : "SYSTEM LOCKED"}
        </button>
      </div>
    </div>
  );
}
