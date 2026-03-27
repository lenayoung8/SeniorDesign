import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Submitted:", form);

    // later: send to backend
    setSubmitted(true);
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