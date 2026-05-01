import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./dev_reg.css";

export default function DeviceRegistration() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    owner: "",
    type: "",
    location: "",
    mac: "",
    notes: "",
    trusted: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      const msg = "You must be logged in to register devices.";
      setSubmitError(msg);
      alert(msg);
      return;
    }

    let user;
    try {
      user = JSON.parse(storedUser);
    } catch {
      const msg = "Invalid login session. Please log in again.";
      setSubmitError(msg);
      alert(msg);
      return;
    }

    if (Number(user.role) !== 1) {
      const msg = "Permission denied: only role=1 users can register devices.";
      setSubmitError(msg);
      alert(msg);
      return;
    }

    try {
      const infoParts = [
        form.name ? `name=${form.name}` : "",
        form.owner ? `owner=${form.owner}` : "",
        form.notes ? `notes=${form.notes}` : "",
      ].filter(Boolean);

      const payload = {
        requester_username: user.username,
        mac_address: form.mac,
        type: form.type,
        connection_type: "WiFi",
        network: form.location || "Home Network",
        info: infoParts.join("; "),
        is_trusted: form.trusted ? 1 : 0,
      };

      const response = await axios.post("/api/devices/register", payload);

      if (response.data?.success) {
        setSubmitted(true);
      } else {
        const msg = response.data?.message || "Failed to register device.";
        setSubmitError(msg);
        alert(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to register device.";
      setSubmitError(msg);
      alert(msg);
    }
  };

  const handleReset = () => {
    setForm({
      name: "",
      owner: "",
      type: "",
      location: "",
      mac: "",
      notes: "",
      trusted: false,
    });
    setSubmitError("");
  };

  // Success screen
  if (submitted) {
    return (
      <>
        <div className="topnav">
          <span id="idname">Hello, User</span>
          <a onClick={() => navigate("/home")}>Home</a>
        </div>

        <div className="page-wrap">
          <div className="success-panel">
            <h2>Device Registered!</h2>
            <p className="success-id">{form.name}</p>
            <button onClick={() => navigate("/home")}>
              Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // Form page
  return (
    <>
      <div className="topnav">
        <span id="idname">Hello, User</span>
        <a onClick={() => navigate("/home")}>Home</a>
      </div>

      <div className="page-wrap">
        <h2>Register New Device</h2>

        <form onSubmit={handleSubmit} className="panel">
          <div className="grid">

            {/* Device Name */}
            <div className="field">
              <label className="field-label">
                Device Name <span className="req">*</span>
              </label>
              <input
                className="field-input"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Device Owner */}
            <div className="field">
              <label className="field-label">
                Device Owner <span className="req">*</span>
              </label>
              <input
                className="field-input"
                type="text"
                name="owner"
                value={form.owner}
                onChange={handleChange}
                required
              />
            </div>

            {/* Type + Location */}
            <div className="grid-2">
              <div className="field">
                <label className="field-label">
                  Type <span className="req">*</span>
                </label>
                <input
                  className="field-input"
                  type="text"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">Location</label>
                <input
                  className="field-input"
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* MAC Address */}
            <div className="field">
              <label className="field-label">
                MAC Address <span className="req">*</span>
              </label>
              <input
                className="field-input"
                type="text"
                name="mac"
                value={form.mac}
                onChange={handleChange}
                required
              />
            </div>

            {/* Notes */}
            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="field-textarea"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
              />
            </div>

            {/* Trusted Device */}
            <div className="toggle-row">
              <label>
                <input
                  type="checkbox"
                  name="trusted"
                  checked={form.trusted}
                  onChange={handleChange}
                  style={{ marginRight: "6px" }}
                />
                Trust Device
              </label>
            </div>

            {submitError && (
              <div style={{ color: "#b00020", fontWeight: 600 }}>{submitError}</div>
            )}

            {/* Buttons */}
            <div className="form-footer">
              <button
                type="button"
                className="btn-reset"
                onClick={handleReset}
              >
                Reset
              </button>

              <button type="submit" className="btn-submit">
                Register
              </button>
            </div>

          </div>
        </form>
      </div>
    </>
  );
}
