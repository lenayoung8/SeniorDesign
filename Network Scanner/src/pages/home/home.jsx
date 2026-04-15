import './home.css';
import deerGif from '../../assets/deer-buck.gif';
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
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Deer() {

  // HANDLE USER
  const navigate = useNavigate();
  const [name, setName] = useState('User'); // 👈 Default fallback

  useEffect(() => {
    // Read the user from localStorage that was saved on login
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setName(user.name); // 👈 Pull the name from stored user
    } else {
      // If no user is logged in, redirect back to login
      navigate('/');
    }
  }, []);


  // HANDLE DEVICES
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    axios.get('/api/devices/untrusted')
      .then(res => setDevices(res.data))
      .catch(err => console.error('Failed to fetch devices:', err));
  }, []);

  /*

    TODO: 
  - Randomize graph data for each time run dev
  - Set up other tables in database
  - show fake devices in upper div and left graph

  */
  const date = new Date();
  const formattedDate = date.toDateString()


  return (
    <>
      <div className="topnav">
        <span id="idname">Hello, {name.split(" ")[0]}!</span>
        <a href="#home">Home</a>
      </div>

      <div style={{ padding: "60px 20px 0" }}>
        <h3>Your Devices At a Glance</h3>
        
        {/* Devices Box */}
        <div id="DevicesBox">
          <p>Display Devices and Icons Here</p>
          <img src={deerGif} alt="deer" />
          <img src={deerGif} alt="deer" />
          <br />
          <img src={deerGif} alt="deer" />
        </div>

        
        {/* Add Device Button */}
        <div className="add-device-container">
          <button
            type="button"
            className="add-device-btn"
            onClick={() => navigate("/register")}
          >
            Add New Device
          </button>
        </div>

        {/* Main lower container */}
        <div className="container">
          {/* Left column */}
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
                    devices.map(device => (
                      <tr key={device.id}>
                        <td>{device.type}</td>
                        <td>{device.mac_address}</td>
                        <td>{device.ip_address}</td>
                        <td>{device.connection_type}</td>
                        <td>{device.port}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="column">
            <h3>Graph</h3>
            <div id="GraphBox">
              <Bar
                data={{
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                  datasets: [{
                    label: 'Devices Connected',
                    data: [3, 5, 2, 8, 4],
                    backgroundColor: '#a9ba96',
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: [`Weekly Device Activity`, `${formattedDate}`] }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}