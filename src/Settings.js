import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeContext';
import AppContent from './App_content';
import ForgotPopup from "./Forgotpopup";
import { FaPalette, FaSave, FaLock, FaClock } from "react-icons/fa";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import config from './Apiconfig';

const SettingsPage = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idleTime, setIdleTime] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const fetchIdleTime = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/getSettings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_code: sessionStorage.getItem('selectedCompanyCode'),
          }),
        });
        if (response.ok) {
          const searchData = await response.json();

          const [{ Idle_time_display }] = searchData

          const [hours, minutes] = Idle_time_display.split('.');
          const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
          setIdleTime(formattedTime);

        }
        else if (response.status = 404) {
          console.log("Data not found");
          setIdleTime('')
        } else {
          const errorResponse = await response.json();
          console.error(errorResponse.message);
        }
      } catch (error) {
        console.error("Error fetching idle time:", error);
      }
    };

    fetchIdleTime();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      let decimalTime = 0;
      if (idleTime) {
        const [hours, minutes] = idleTime.split(":");
        const h = parseInt(hours);
        const m = parseInt(minutes);
        decimalTime = parseFloat(`${h}.${m.toString().padStart(2, '0')}`);
      }

      const response = await fetch(`${config.apiBaseUrl}/addSettings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_code: sessionStorage.getItem('selectedCompanyCode'),
          created_by: sessionStorage.getItem('selectedUserCode'),
          Idle_time: decimalTime,
        }),
      });

      if (response.ok) {
        console.log("Data inserted successfully");
        toast.success("Data inserted successfully!");
        window.dispatchEvent(new Event("loginSuccess"));
      } else {
        const errorResponse = await response.json();
        console.warn(errorResponse.message);
        toast.warning(errorResponse.message);
      }
    } catch (error) {
      console.error("Error inserting data:", error);
      toast.error('Error inserting data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider>
      <ToastContainer position="top-right" className="toast-design" theme="colored" />
      <div className="container-fluid Topnav-screen py-1">

        <div className="card shadow-sm mb-2">
          <div className="card-body">
            <div className="row align-items-center">

              <div className="col-12 col-md-6 mb-3 mb-md-0 text-center text-md-start">
                <h1 className="h4 text-primary mb-0 d-flex justify-content-center justify-content-md-start align-items-center flex-wrap">
                  <FaPalette className="me-2" />
                  Application Settings
                </h1>
              </div>

              <div className="col-12 col-md-6 text-center text-md-end">
                <div className="d-flex flex-wrap justify-content-center justify-content-md-end gap-2">
                  <button
                    className="btn btn-success d-flex align-items-center justify-content-center px-3"
                    onClick={handleSave}
                    disabled={loading}
                    title="Save settings"
                  >
                    <FaSave className="me-2" /> {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    className="btn btn-primary d-flex align-items-center justify-content-center px-3"
                    onClick={handleOpen}
                    title="Reset password"
                  >
                    <FaLock className="me-2" /> Reset Password
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="card shadow-lg">
          <div className="card-body p-4">
            <div className="row gy-4">

              <div className="col-12 col-lg-6">
                <h5 className="fw-bold text-secondary border-bottom pb-2 mb-3 d-flex align-items-center">
                  <FaPalette className="me-2" /> Theme Customization
                </h5>
                <label htmlFor="theme" className="fw-normal fs-6 d-block mb-2">
                  Select your preferred application theme:
                </label>
                <div className='mt-2'>
                  <ThemeProvider>
                    <AppContent />
                  </ThemeProvider>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <h5 className="fw-bold text-secondary border-bottom pb-2 mb-3 d-flex align-items-center">
                  <FaClock className="me-2" /> Idle Time Limit
                </h5>
                <label htmlFor="idleTime" className="fw-normal fs-6">
                  Idle Time (HH:MM):
                </label>
                <input
                  type="time"
                  id="idleTime"
                  className="form-control mt-2"
                  placeholder="Select time"
                  value={idleTime}
                  onChange={(e) => {
                    let [hours, minutes] = e.target.value.split(":");
                    let h = parseInt(hours);
                    if (h > 12) h = h - 12;
                    const formatted = `${h.toString().padStart(2, "0")}:${minutes}`;
                    setIdleTime(formatted);
                  }}
                  step="60"
                  style={{ maxWidth: "250px" }}
                />
                <small className="form-text text-muted d-block mt-1">
                  Enter time in <strong>HH:MM</strong> (12-hour format). Example: <strong>01:30</strong>.
                </small>
              </div>

            </div>
          </div>
        </div>

        {/* ===== Popup ===== */}
        {open && <ForgotPopup onClose={handleClose} />}

      </div>
    </ThemeProvider>
  );
};

export default SettingsPage;
