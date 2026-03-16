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

// You must register the components you use
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Deer() {
  
  return (
    <>
      <div className="topnav">
        <span id="idname">Hello, User</span>
        <a href="#home">Home</a>
      </div>

      <div style={{ padding: "60px 20px 0" }}>
        <h3>Your Devices At a Glance</h3>
        <div id="DevicesBox">
          <p>Display Devices and Icons Here</p>
          <img src={deerGif} alt="deer" />
          <img src={deerGif} alt="deer" />
          <br />
          <img src={deerGif} alt="deer" />
        </div>

        <div className="container">
          <div className="column">
            <h3>Devices Trying to Connect</h3>
            <div id="DevicesConnected">
              {/* Display Devices wanting to connect here */}
              <table id="DevicesTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Seen Before</th>
                    <th> Safety Rating</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Bass Speaker</td>
                    <td>BT Speaker</td>
                    <td>Yes</td>
                    <td>10</td>
                  </tr>
                  <tr>
                    <td>???</td>
                    <td>???</td>
                    <td>???</td>
                    <td>???</td>
                  </tr>
                  <tr>
                    <td>???</td>
                    <td>???</td>
                    <td>???</td>
                    <td>???</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

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
                    title: { display: true, text: 'Weekly Device Activity' }
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