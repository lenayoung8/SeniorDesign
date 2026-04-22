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
import { useEffect, useState } from 'react';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Deer() {
  const deviceImages = {
    'Phone': phoneImg,
    'Printer': printerImg,
    'Laptop': laptopImg,
    'Tablet': tabletImg,
    'Desktop': desktopImg,
    'Router': routerImg,
    'Smart TV': smarttvImg,
    'Security Camera': cameraImg,
  };

  const navigate = useNavigate();
  const [name, setName] = useState('User');
  const [devices, setDevices] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setName(user?.name || user?.username || 'User');
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
    axios.get('/api/jules/anomalies')
      .then((res) => setAnomalies(res.data?.anomalies || []))
      .catch(() => setAnomalies([]));
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

  return (
    <>
      <div className="topnav">
        <span id="idname">Hello, {String(name || 'User').split(' ')[0]}!</span>
        <a href="#home">Home</a>
      </div>

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
            <div style={{ marginTop: '12px' }}>
              <h3>Anomalies</h3>
              {anomalies.length === 0 ? (
                <p>No recent anomalies detected.</p>
              ) : (
                <ul>
                  {anomalies.slice(0, 5).map((a, i) => (
                    <li key={`${a.kind}-${i}`}>{a.kind}: {a.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
