import { useState } from 'react';
import './deer.css';
import deerGif from '../../assets/deer-buck.gif';

export default function Deer() {
  const [count, setCount] = useState(0);

  return (
    <div className="deer-page">
      <h1>Home Page</h1>
      <img src={deerGif} width="300" alt="Deer" />
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>Edit <code>src/pages/deer/Deer.jsx</code> and save to test HMR</p>
      </div>
      <p className="read-the-docs">
        Congrats! You successfully installed it!
      </p>
    </div>
  );
}