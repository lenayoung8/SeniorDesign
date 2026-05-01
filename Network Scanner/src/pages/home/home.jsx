import './home.css';
import deerGif from '../../assets/deer-buck.gif';

import phoneImg from '../../assets/phone.png';
import printerImg from '../../assets/printer.png';
import laptopImg from '../../assets/laptop.png';
import tabletImg from '../../assets/tablet.png';
import desktopImg from '../../assets/desktop.png';
import routerImg from '../../assets/router.png';
import smarttvImg from '../../assets/smarttv.png';
import cameraImg from '../../assets/camera.png';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Deer() {
  const deviceImages = {
    Phone: phoneImg,
    Printer: printerImg,
    Laptop: laptopImg,
    Tablet: tabletImg,
    Desktop: desktopImg,
    Router: routerImg,
    'Smart TV': smarttvImg,
    'Security Camera': cameraImg,
  };

  const navigate = useNavigate();
  const [name, setName] = useState('User');
  const [username, setUsername] = useState('');
  const [devices, setDevices] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyError, setAnomalyError] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [actionBusy, setActionBusy] = useState({});
  const lastAnomalySignatureRef = useRef('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setName(user?.name || user?.username || 'User');
      setUsername(user?.username || '');
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    axios.get('/api/devices/untrusted')
      .then((res) => setDevices(res.data))
      .catch((err) => console.error('Failed to fetch devices:', err));

    axios.get('/api/devices/trusted')
      .then((res) => setTrustedDevices(res.data))
      .catch((err) => console.error('Failed to fetch trusted devices:', err));
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchAnomalies = async () => {
      try {
        const res = await axios.get('/api/jules/anomalies');
        const next = res.data?.anomalies || [];
        const signature = next.map((a) => `${a.kind}|${a.source_ip || ''}|${a.destination_ip || ''}|${a.mac_addr || ''}`).join('||');

        if (mounted) {
          setAnomalies(next);
          setAnomalyError('');

          if (next.length > 0 && signature !== lastAnomalySignatureRef.current) {
            const text = `Security alert: ${next[0].message || 'Anomaly detected.'}`;
            setPopupMessage(text);
            window.alert(text);
          }

          lastAnomalySignatureRef.current = signature;
        }
      } catch {
        if (mounted) {
          setAnomalyError('Could not load anomaly status.');
        }
      }
    };

    fetchAnomalies();
    const timer = setInterval(fetchAnomalies, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const date = new Date();
  const formattedDate = date.toDateString();

  const getLast5Days = () => {
    const days = [];
    for (let i = 4; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return days;
  };

  const randomData = () => {
    const data = [];
    for (let i = 0; i < 5; i += 1) {
      data.push(Math.floor(Math.random() * 10));
    }
    return data;
  };

  const displayPort = (portValue) => {
    if (portValue === null || portValue === undefined) return '';
    if (typeof portValue === 'number' || typeof portValue === 'string') return portValue;
    const data = Array.isArray(portValue?.data) ? portValue.data : null;
    if (data && data.length) {
      return data.reduce((acc, byte) => (acc << 8) + byte, 0);
    }
    return String(portValue);
  };

  const topAnomalyText = useMemo(() => {
    if (!anomalies.length) return '';
    return anomalies[0]?.message || 'Anomaly detected.';
  }, [anomalies]);

  const applyAnomalyAction = async (anomaly, decision, idx) => {
    if (!username) {
      window.alert('No logged-in username found. Please log in again.');
      return;
    }

    const key = `${idx}-${decision}`;
    setActionBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await axios.post('/api/jules/anomalies/action', {
        requester_username: username,
        anomaly,
        decision,
      });
      const msg = res.data?.message || 'Action saved.';
      window.alert(msg);
      setPopupMessage(msg);

      const next = anomalies.filter((_, i) => i !== idx);
      setAnomalies(next);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to apply anomaly action.';
      window.alert(msg);
    } finally {
      setActionBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <>
      <div className="topnav">
        <span id="idname">Hello, {String(name || 'User').split(' ')[0]}!</span>
        <a href="#home">Home</a>
      </div>

      {anomalies.length > 0 && (
        <div className="alert-banner">
          <strong>Security Alert:</strong> {topAnomalyText}
        </div>
      )}

      <div style={{ padding: '60px 20px 0' }}>
        <h3>Your Devices At a Glance</h3>

        <div id="DevicesBox">
          <p>Trusted Devices</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            padding: '10px'
          }}>
            {trustedDevices.length === 0 ? (
              <p>No trusted devices found.</p>
            ) : (
              trustedDevices.map((device) => (
                <div key={device.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '10px',
                }}>
                  <img
                    src={deviceImages[device.type] || deerGif}
                    alt={device.type}
                    width="180px"
                  />
                  <span style={{ marginTop: '8px', fontWeight: 'bold' }}>
                    {device.type}
                  </span>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    Family
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="add-device-container">
          <button
            type="button"
            className="add-device-btn"
            onClick={() => navigate('/register')}
          >
            Add New Device
          </button>
        </div>

        <div className="container">
          <div className="column">
            <h3>Devices Trying to Connect</h3>
            <div id="DevicesConnected">
              <table id="DevicesTable">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>MAC Address</th>
                    <th>IP Address</th>
                    <th>Connection</th>
                    <th>Port</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan="5">No untrusted devices found.</td>
                    </tr>
                  ) : (
                    devices.map((device) => (
                      <tr key={device.id}>
                        <td>{device.type}</td>
                        <td>{device.mac_address}</td>
                        <td>{device.ip_address}</td>
                        <td>{device.connection_type}</td>
                        <td>{displayPort(device.port)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="column">
            <h3>Graph</h3>
            <div id="GraphBox">
              <Bar
                data={{
                  labels: getLast5Days(),
                  datasets: [{
                    label: 'Devices Connected',
                    data: randomData(),
                    backgroundColor: '#a9ba96',
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: ['Weekly Device Activity', `${formattedDate}`] }
                  }
                }}
              />
            </div>

            <div id="AnomalyBox">
              <h3>Security Anomalies</h3>
              {anomalyError && <p className="anomaly-error">{anomalyError}</p>}
              {anomalies.length === 0 ? (
                <p className="anomaly-empty">No recent anomalies detected.</p>
              ) : (
                <div className="anomaly-list">
                  {anomalies.slice(0, 8).map((a, i) => {
                    const allowKey = `${i}-allow`;
                    const denyKey = `${i}-deny`;
                    return (
                      <div className="anomaly-card" key={`${a.kind}-${i}`}>
                        <div className="anomaly-title">{a.kind.replaceAll('_', ' ')}</div>
                        <div className="anomaly-message">{a.message}</div>
                        <div className="anomaly-meta">
                          <span>Source: {a.source_ip || 'n/a'}</span>
                          <span>Destination: {a.destination_ip || 'n/a'}</span>
                          <span>MAC: {a.mac_addr || 'n/a'}</span>
                        </div>
                        <div className="anomaly-actions">
                          <button
                            type="button"
                            className="anomaly-btn allow"
                            disabled={!!actionBusy[allowKey] || !!actionBusy[denyKey]}
                            onClick={() => applyAnomalyAction(a, 'allow', i)}
                          >
                            Allow
                          </button>
                          <button
                            type="button"
                            className="anomaly-btn deny"
                            disabled={!!actionBusy[allowKey] || !!actionBusy[denyKey]}
                            onClick={() => applyAnomalyAction(a, 'deny', i)}
                          >
                            Block
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {popupMessage && <p className="anomaly-note">{popupMessage}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
