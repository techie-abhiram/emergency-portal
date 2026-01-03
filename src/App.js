import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, push, set } from 'firebase/database';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ROAD-SNAPPING ROUTE COMPONENT
const RoutingEngine = ({ start, end }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !start || !end) return;
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
      lineOptions: { styles: [{ color: '#2563eb', weight: 6, opacity: 0.8 }] },
      show: false,
      addWaypoints: false,
      createMarker: () => null 
    }).addTo(map);
    return () => map.removeControl(routingControl);
  }, [map, start, end]);
  return null;
};

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
  const [view, setView] = useState('landing');
  const [allUsers, setAllUsers] = useState({});
  const [adminAuth, setAdminAuth] = useState({ user: '', pass: '' });
  const [loginCreds, setLoginCreds] = useState({ user: '', pass: '' });
  const [regData, setRegData] = useState({ name: '', email: '', phone: '', vehicle: '', docs: '' });
  const [newPass, setNewPass] = useState('');
  const [tempUser, setTempUser] = useState(null);

  useEffect(() => {
    onValue(ref(db, 'users'), (snapshot) => setAllUsers(snapshot.val() || {}));
  }, []);

  const handleRegister = async () => {
    if (regData.phone.length !== 10) return alert("10-digit phone required.");
    const uRef = push(ref(db, 'users'));
    await set(uRef, { ...regData, status: 'pending', id: uRef.key, lat: 17.385, lng: 78.486, isEmergency: false });
    fetch('http://localhost:5000/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: regData.name, vehicleNo: regData.vehicle })
    });
    alert("Application submitted successfully.");
    setView('landing');
  };

  const handleApprove = async (user) => {
    const otp = Math.random().toString(36).slice(-8);
    await update(ref(db, `users/${user.id}`), { status: 'approved', password: otp, needsReset: true });
    fetch('http://localhost:5000/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email, userName: user.name, tempPass: otp })
    });
    alert(`User approved. OTP sent to ${user.email}`);
  };

  const handleRemove = async (userId) => {
    if(window.confirm("Immediately revoke access and delete this device?")) {
      await set(ref(db, `users/${userId}`), null);
      alert("Access Revoked.");
    }
  };

  const handleDriverLogin = () => {
    const userMatch = Object.values(allUsers).find(u => u.email === loginCreds.user && u.password === loginCreds.pass);
    if (userMatch) {
      if (userMatch.status !== 'approved') return alert("Access pending approval.");
      if (userMatch.needsReset) { setTempUser(userMatch); setView('reset-password'); }
      else { setTempUser(userMatch); setView('driver-dash'); }
    } else { alert("Invalid credentials."); }
  };

  // --- VIEWS ---

  if (view === 'reset-password') {
    return (
      <div style={containerStyle}>
        <div style={card}>
          <h2>Secure Your Account</h2>
          <p>Create a permanent password to continue.</p>
          <input type="password" placeholder="New Password" style={inputStyle} onChange={e => setNewPass(e.target.value)} />
          <button style={btnPri} onClick={async () => {
            await update(ref(db, `users/${tempUser.id}`), { password: newPass, needsReset: false });
            setView('driver-dash');
          }}>Set Password & Login</button>
        </div>
      </div>
    );
  }

  if (view === 'admin-dash') {
    const usersArr = Object.values(allUsers);
    const pending = usersArr.filter(u => u.status === 'pending');
    const approved = usersArr.filter(u => u.status === 'approved');
    return (
      <div style={containerStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2>Admin Sentinel Hub</h2>
          <button onClick={() => setView('landing')} style={btnSec}>Logout</button>
        </div>
        <div style={statsGrid}>
          <div style={card}><h3>Total Devices</h3><p>{usersArr.length}</p></div>
          <div style={card}><h3>Pending</h3><p style={{color:'#f59e0b'}}>{pending.length}</p></div>
        </div>
        <div style={{ height: '400px', borderRadius: '10px', overflow: 'hidden', margin: '20px 0', border: '1px solid #334155' }}>
          <MapContainer center={[17.3850, 78.4867]} zoom={12} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {usersArr.map(u => (
              <Marker key={u.id} position={[u.lat || 17.385, u.lng || 78.486]} icon={new L.Icon({
                iconUrl: u.isEmergency ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png' : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                iconSize: [25, 41]
              })}>
                <Popup>{u.name} - {u.vehicle} ({u.status})</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <h3>Verification Queue</h3>
        {pending.map(u => (
          <div key={u.id} style={{...card, display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
            <span>{u.name} | {u.vehicle}</span>
            <button onClick={() => handleApprove(u)} style={{background:'green', color:'white', border:'none', padding:'5px 15px', borderRadius:'4px', cursor:'pointer'}}>Approve</button>
          </div>
        ))}
        <h3 style={{marginTop:'30px'}}>Active Device Management</h3>
        {approved.map(u => (
          <div key={u.id} style={{...card, display:'flex', justifyContent:'space-between', marginTop:'10px', borderColor:'#16a34a'}}>
            <span>{u.name} ({u.vehicle})</span>
            <button onClick={() => handleRemove(u.id)} style={{background:'#ef4444', color:'white', border:'none', padding:'5px 15px', borderRadius:'4px', cursor:'pointer'}}>Revoke Access</button>
          </div>
        ))}
      </div>
    );
  }

  if (view === 'driver-dash') {
    return (
      <div style={{...containerStyle, padding: 0}}>
        <div style={{height:'70vh'}}>
          <MapContainer center={[17.3850, 78.4867]} zoom={13} style={{height:'100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RoutingEngine start={[17.3850, 78.4867]} end={[17.4483, 78.3915]} />
            <Marker position={[17.3850, 78.4867]}><Popup>My Vehicle</Popup></Marker>
          </MapContainer>
        </div>
        <div style={{padding:'20px', textAlign:'center'}}>
          <button onClick={() => {
            update(ref(db, `users/${tempUser.id}`), { isEmergency: true });
            update(ref(db, 'system'), { trigger: true });
            setTimeout(() => {
                update(ref(db, `users/${tempUser.id}`), { isEmergency: false });
                update(ref(db, 'system'), { trigger: false });
            }, 5000);
            alert("EMERGENCY BROADCAST ACTIVE");
          }} style={emergencyBtn}>START EMERGENCY</button>
          <button onClick={() => setView('landing')} style={{...btnSec, display:'block', margin:'15px auto'}}>Logout</button>
        </div>
      </div>
    );
  }

  if (view === 'admin-login') {
    return (
      <div style={containerStyle}>
        <div style={card}>
          <h2>Admin Login</h2>
          <input placeholder="Username" style={inputStyle} onChange={e => setAdminAuth({...adminAuth, user: e.target.value})} />
          <input type="password" placeholder="Password" style={inputStyle} onChange={e => setAdminAuth({...adminAuth, pass: e.target.value})} />
          <button style={btnPri} onClick={() => {
            if(adminAuth.user === 'admin' && adminAuth.pass === 'ResQFlow@AAMSUV') setView('admin-dash');
            else alert("Access Denied");
          }}>Login</button>
        </div>
      </div>
    );
  }

  if (view === 'driver-login') {
    return (
      <div style={containerStyle}>
        <div style={card}>
          <h2>Driver Login</h2>
          <input placeholder="Email" style={inputStyle} onChange={e => setLoginCreds({...loginCreds, user: e.target.value})} />
          <input type="password" placeholder="Password" style={inputStyle} onChange={e => setLoginCreds({...loginCreds, pass: e.target.value})} />
          <button style={btnPri} onClick={handleDriverLogin}>Login</button>
          <button onClick={() => setView('landing')} style={btnSec}>Back</button>
        </div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div style={containerStyle}>
        <div style={card}>
          <h2>Module Registration</h2>
          <input placeholder="Name" style={inputStyle} onChange={e => setRegData({...regData, name: e.target.value})} />
          <input placeholder="Email" style={inputStyle} onChange={e => setRegData({...regData, email: e.target.value})} />
          <input placeholder="Phone" maxLength={10} style={inputStyle} onChange={e => setRegData({...regData, phone: e.target.value})} />
          <input placeholder="Vehicle No" style={inputStyle} onChange={e => setRegData({...regData, vehicle: e.target.value})} />
          <button style={btnPri} onClick={handleRegister}>Apply</button>
          <button onClick={() => setView('landing')} style={btnSec}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{color:'#ef4444', fontSize:'2.5rem'}}>ResQFlow SENTINEL</h1>
      <p style={{color:'#94a3b8', marginBottom:'30px'}}>Level 3 Emergency Infrastructure</p>
      <button onClick={() => setView('driver-login')} style={btnPri}>DRIVER LOGIN</button>
      <button onClick={() => setView('register')} style={btnSec}>SIGN UP</button>
      <button onClick={() => setView('admin-login')} style={{...btnSec, display:'block', margin:'30px auto', border:'none'}}>Admin Portal</button>
    </div>
  );
}

const containerStyle = { backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: 'sans-serif', textAlign:'center' };
const card = { backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', maxWidth:'500px', margin:'0 auto' };
const statsGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' };
const btnPri = { background: '#2563eb', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width:'100%', maxWidth:'300px' };
const btnSec = { background: 'none', color: '#60a5fa', border: '1px solid #60a5fa', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', width:'100%', maxWidth:'300px' };
const emergencyBtn = { width: '280px', height: '90px', background: '#ef4444', color: 'white', fontSize: '20px', fontWeight: 'bold', border: 'none', borderRadius: '15px', cursor: 'pointer', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' };
const inputStyle = { width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#020617', color: 'white', boxSizing: 'border-box' };