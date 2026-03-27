import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login/login';
import Home from './pages/home/home';
import Deer from './pages/deer/deer';
import DeviceRegistration from './pages/device_registration/dev_reg';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register" element={<DeviceRegistration />} />
      </Routes>
    </Router>
  );
}

export default App;