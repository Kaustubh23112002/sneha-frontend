import React, { useRef, useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import Webcam from "react-webcam";
import "./Dashboard.css";

const Dashboard = () => {
  const webcamRef = useRef(null);
  const [attendance, setAttendance] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(false);

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  }

  const capture = async (type) => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) {
      alert("Could not capture image");
      return;
    }

    const blob = await fetch(screenshot).then((res) => res.blob());
    const formData = new FormData();
    formData.append("photo", blob, "photo.jpg");

    try {
      const endpoint = type === "in" ? "/api/attendance/punch-in" : "/api/attendance/punch-out";
      await axiosClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`✅ Punch ${type} successful`);
      fetchAttendance();
    } catch (err) {
      alert(err?.response?.data?.message || "Error punching");
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/api/attendance/my-attendance");
      const allAttendance = res.data.attendance || [];
      setAttendance(allAttendance);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
    setLoading(false);
  };

  const fetchProfile = async () => {
    try {
      const res = await axiosClient.get("/api/employees/me");
      setEmployee(res.data.employee);
    } catch (err) {
      console.error("Error fetching employee profile:", err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchProfile();
  }, []);

  const filteredAttendance = attendance.filter((entry) => entry.date === selectedDate);

  const formatTo12Hour = (timeStr) => {
    if (!timeStr) return "--";
    const [hour, minute] = timeStr.split(":");
    const h = parseInt(hour, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${minute} ${suffix}`;
  };

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-heading">Employee Dashboard</h2>

      {employee && (
        <div className="profile-card">
          <h3>Your Profile</h3>
          <p><strong>Full Name:</strong> {employee.fullName}</p>
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Phone Number:</strong> {employee.phoneNumber}</p>
          <p><strong>Address:</strong> {employee.address}</p>
          <p><strong>Salary:</strong> {employee.salary}</p>

          <div className="shift-info">
            <h4>Shift Timings</h4>
            {(employee.shiftTimings || []).map((shift, i) => (
              <p key={i}>
                Start: <strong>{formatTo12Hour(shift.start)}</strong> | 
                End: <strong>{formatTo12Hour(shift.end)}</strong>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="webcam-section">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="webcam"
          videoConstraints={{ facingMode: "user" }}
        />
        <div className="button-group">
          <button onClick={() => capture("in")} className="punch-btn">Punch In</button>
          <button onClick={() => capture("out")} className="punch-btn">Punch Out</button>
        </div>
      </div>

      <div className="filter-section">
        <h3>View Attendance by Date</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="single-date-input"
          max={getTodayDate()}
        />
      </div>

      <h3 className="attendance-heading">Attendance for {selectedDate}</h3>

      {loading ? (
        <p>Loading attendance...</p>
      ) : (
        <div className="attendance-list">
          {filteredAttendance.length === 0 ? (
            <p>No attendance record found for this date.</p>
          ) : (
            filteredAttendance.map((entry) => (
              <div key={entry._id} className="attendance-card">
                {entry.punches.map((punch, index) => (
                  <div key={index} className="punch-entry">
                    <p><strong>In:</strong> {punch.inTime} {punch.late && <span className="late">(Late)</span>}</p>
                    {punch.inPhotoUrl && <img src={punch.inPhotoUrl} alt="In Punch" />}
                    <p><strong>Out:</strong> {punch.outTime} {punch.overtime && <span className="overtime">(Overtime)</span>}</p>
                    {punch.outPhotoUrl && <img src={punch.outPhotoUrl} alt="Out Punch" />}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
