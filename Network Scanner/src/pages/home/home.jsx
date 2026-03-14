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
        <span id="idname">Hi, John</span>
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
                    <th>SafetyRating</th>
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
              {/* Use Chart.JS to display a graph here */}
              <p>Use Chart.JS to display a graph here maybe?</p>
              <img src={deerGif} alt="deer" />
              <img src={deerGif} alt="deer" />
              <br />
              <img src={deerGif} alt="deer" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}