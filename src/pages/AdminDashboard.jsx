// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import styles from "./AdminDashboard.module.css";
import moment from "moment"; // still used for any fallback if ever needed
import { exportMonthlyReportToPDF } from "../utils/exportPdf";

const AdminDashboard = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceList, setAttendanceList] = useState([]);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [editPunches, setEditPunches] = useState({});
  const [editEmployees, setEditEmployees] = useState({});
  const [historyUserDetails, setHistoryUserDetails] = useState(null);

  // Monthly summary states
  const [monthlyUser, setMonthlyUser] = useState(null);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthlyTotalMinutes, setMonthlyTotalMinutes] = useState(0);
  const [monthlyTotalLateMinutes, setMonthlyTotalLateMinutes] = useState(0);
  const [monthlyTotalOvertimeMinutes, setMonthlyTotalOvertimeMinutes] = useState(0);
  const [monthlyUserDetails, setMonthlyUserDetails] = useState(null);

  const user = historyUserDetails;

  const formatTo12Hour = (timeStr) => {
    if (!timeStr) return "--";
    const [hour, minute] = timeStr.split(":");
    const h = parseInt(hour, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${minute} ${suffix}`;
  };

  const formatMinutes = (mins = 0) => {
    const m = Math.max(0, Number(mins) || 0);
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}h ${r}m`;
  };

  const fetchByDate = async () => {
    try {
      const res = await axiosClient.get(`/api/admin/attendance`, {
        params: { date },
      });
      const attendance = res.data.attendance || [];

      const punches = {};
      const employees = {};
      attendance.forEach((att) => {
        punches[att._id] = att.punches.map((p) => ({ ...p }));
        employees[att.user._id] = {
          fullName: att.user.fullName || "",
          email: att.user.email || "",
          phoneNumber: att.user.phoneNumber || "",
          address: att.user.address || "",
          salary: att.user.salary || "",
          shiftTimings: att.user.shiftTimings || [{ start: "", end: "" }],
        };
      });

      setAttendanceList(attendance);
      setEditPunches(punches);
      setEditEmployees(employees);

      // Clear history & monthly when changing date
      setHistoryUser(null);
      setHistoryRecords([]);
      setHistoryUserDetails(null);

      setMonthlyUser(null);
      setMonthlyRecords([]);
      setMonthlyTotalMinutes(0);
      setMonthlyTotalLateMinutes(0);
      setMonthlyTotalOvertimeMinutes(0);
      setMonthlyUserDetails(null);
    } catch (err) {
      console.error("Error fetching attendance by date:", err);
    }
  };

  const fetchHistory = async (userId) => {
    try {
      const res = await axiosClient.get(`/api/admin/attendance/${userId}/history`);
      setHistoryUser(userId);
      setHistoryRecords(res.data.history || []);
      setHistoryUserDetails(res.data.user || null);

      // Clear monthly on history view
      setMonthlyUser(null);
      setMonthlyRecords([]);
      setMonthlyTotalMinutes(0);
      setMonthlyTotalLateMinutes(0);
      setMonthlyTotalOvertimeMinutes(0);
      setMonthlyUserDetails(null);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  // Monthly summary for current month (backend already respects month param)
  const fetchMonthlySummary = async (userId) => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    try {
      const res = await axiosClient.get(`/api/admin/attendance/${userId}/month`, {
        params: { month },
      });

      const records = res.data.records || [];
      const summary = res.data.summary || {};

      setMonthlyUser(userId);
      setMonthlyRecords(records);
      setMonthlyTotalMinutes(summary.totalMinutes || 0);
      setMonthlyTotalLateMinutes(summary.totalLateMinutes || 0);
      setMonthlyTotalOvertimeMinutes(summary.totalOvertimeMinutes || 0);
      setMonthlyUserDetails(res.data.user || null);

      // Clear history when viewing monthly summary
      setHistoryUser(null);
      setHistoryRecords([]);
      setHistoryUserDetails(null);
    } catch (err) {
      console.error("Error fetching monthly summary:", err);
    }
  };

  const handlePunchChange = (attendanceId, index, field, value) => {
    setEditPunches((prev) => {
      const arr = prev[attendanceId] ? [...prev[attendanceId]] : [];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [attendanceId]: arr };
    });
  };

  const savePunchChanges = async (attendanceId, index) => {
    const punch = editPunches[attendanceId][index];
    try {
      await axiosClient.put(`/api/admin/attendance/${attendanceId}/edit`, {
        punchIndex: index,
        inTime: punch.inTime,
        outTime: punch.outTime,
      });
      await fetchByDate();
      if (historyUser) {
        fetchHistory(historyUser);
      }
      if (monthlyUser) {
        fetchMonthlySummary(monthlyUser);
      }
    } catch (err) {
      alert("Failed to update punch times");
      console.error("Edit punch error:", err);
    }
  };

  const handleEmployeeChange = (userId, field, value) => {
    setEditEmployees((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleShiftChange = (userId, index, field, value) => {
    setEditEmployees((prev) => {
      const shifts = prev[userId]?.shiftTimings ? [...prev[userId].shiftTimings] : [];
      shifts[index] = { ...shifts[index], [field]: value };
      return {
        ...prev,
        [userId]: { ...prev[userId], shiftTimings: shifts },
      };
    });
  };

  const saveEmployeeChanges = async (userId) => {
    try {
      const updated = editEmployees[userId];
      await axiosClient.put(`/api/admin/employees/${userId}`, updated);
      alert("Employee updated");
      await fetchByDate();
      if (historyUser) {
        fetchHistory(historyUser);
      }
      if (monthlyUser) {
        fetchMonthlySummary(monthlyUser);
      }
    } catch (err) {
      alert("Failed to update employee");
      console.error(err);
    }
  };

  const deleteEmployee = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this employee and all their data?")) return;
    try {
      await axiosClient.delete(`/api/admin/employees/${userId}`);
      alert("Employee deleted successfully");
      await fetchByDate();
    } catch (err) {
      console.error("Error deleting employee:", err);
      alert("Failed to delete employee");
    }
  };

  useEffect(() => {
    fetchByDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h2 className={styles.heading}>Attendance — {date}</h2>
        <div className={styles.filterSection}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.dateInput}
          />
          <button onClick={fetchByDate} className={styles.loadButton}>
            Load
          </button>
        </div>
      </div>

      <div className={styles.listSection}>
        {attendanceList.length === 0 && (
          <p className={styles.noRecords}>No records for this date.</p>
        )}
        {attendanceList.map((att) => {
          const user = att.user;
          const punches = editPunches[att._id] || [];
          const empEdit = editEmployees[user._id] || {};

          return (
            <div key={att._id} className={styles.employeeCard}>
              <div className={styles.empHeader}>
                <div>
                  <h3 className={styles.empName}>{user.fullName}</h3>
                  <p className={styles.empEmail}>{user.email}</p>
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.historyButton}
                    onClick={() => fetchHistory(user._id)}
                  >
                    View History
                  </button>
                  <button
                    className={styles.historyButton}
                    onClick={() => fetchMonthlySummary(user._id)}
                  >
                    View Monthly Summary
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => deleteEmployee(user._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div className={styles.empDetails}>
                <div className={styles.empDetailRow}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={empEdit.fullName}
                    onChange={(e) =>
                      handleEmployeeChange(user._id, "fullName", e.target.value)
                    }
                  />
                </div>
                <div className={styles.empDetailRow}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={empEdit.email}
                    onChange={(e) =>
                      handleEmployeeChange(user._id, "email", e.target.value)
                    }
                  />
                </div>
                <div className={styles.empDetailRow}>
                  <label>Phone</label>
                  <input
                    type="text"
                    value={empEdit.phoneNumber}
                    onChange={(e) =>
                      handleEmployeeChange(user._id, "phoneNumber", e.target.value)
                    }
                  />
                </div>
                <div className={styles.empDetailRow}>
                  <label>Address</label>
                  <input
                    type="text"
                    value={empEdit.address}
                    onChange={(e) =>
                      handleEmployeeChange(user._id, "address", e.target.value)
                    }
                  />
                </div>
                <div className={styles.empDetailRow}>
                  <label>Salary</label>
                  <input
                    type="text"
                    value={empEdit.salary}
                    onChange={(e) =>
                      handleEmployeeChange(user._id, "salary", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className={styles.shiftSection}>
                <h4 className={styles.subheading}>Shift Timings</h4>
                {(empEdit.shiftTimings || []).map((shift, i) => (
                  <div key={i} className={styles.shiftRowEditable}>
                    <div className={styles.shiftInputGroup}>
                      <label>Start</label>
                      <input
                        type="time"
                        value={shift.start}
                        onChange={(e) =>
                          handleShiftChange(user._id, i, "start", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.shiftInputGroup}>
                      <label>End</label>
                      <input
                        type="time"
                        value={shift.end}
                        onChange={(e) =>
                          handleShiftChange(user._id, i, "end", e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                className={styles.saveButton}
                onClick={() => saveEmployeeChanges(user._id)}
              >
                Save Employee
              </button>

              {/* Totals from backend: totalMinutes excludes OT > 30; late & OT separate */}
              {att.totalMinutes !== undefined && (
                <div className={styles.totalWork}>
                  🕒 Total Work: {formatMinutes(att.totalMinutes)}
                </div>
              )}
              {(att.totalLateMinutes !== undefined ||
                att.totalOvertimeMinutes !== undefined) && (
                <div className={styles.totalWork}>
                  ⚠️ Late: {formatMinutes(att.totalLateMinutes || 0)} • ⏫ Overtime:{" "}
                  {formatMinutes(att.totalOvertimeMinutes || 0)}
                </div>
              )}

              <div className={styles.punchContainer}>
                <h4 className={styles.subheading}>Punch Records</h4>
                {punches.length === 0 && (
                  <p className={styles.noRecordsSmall}>No punches</p>
                )}
                {punches.map((p, idx) => {
                  // Always trust backend durationInMinutes (already handles overnight & OT)
                  const durationMin = p.durationInMinutes;

                  return (
                    <div key={idx} className={styles.punchRow}>
                      <div className={styles.punchField}>
                        <label>In</label>
                        <input
                          type="time"
                          value={p.inTime || ""}
                          onChange={(e) =>
                            handlePunchChange(att._id, idx, "inTime", e.target.value)
                          }
                        />
                        {p.lateMark && (
                          <span className={styles.late}>
                            Late{p.lateMinutes ? ` (+${p.lateMinutes}m)` : ""}
                          </span>
                        )}
                      </div>

                      <div className={styles.punchField}>
                        <label>Out</label>
                        <input
                          type="time"
                          value={p.outTime || ""}
                          onChange={(e) =>
                            handlePunchChange(att._id, idx, "outTime", e.target.value)
                          }
                        />
                        {p.overtimeMark && (
                          <span className={styles.overtime}>
                            Overtime
                            {p.overtimeMinutes ? ` (+${p.overtimeMinutes}m)` : ""}
                          </span>
                        )}
                      </div>

                      {durationMin != null && (
                        <div className={styles.durationDisplay}>
                          ⏱️ Duration: {formatMinutes(durationMin)}
                        </div>
                      )}

                      <button
                        className={styles.savePunchButton}
                        onClick={() => savePunchChanges(att._id, idx)}
                      >
                        Save
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Summary Section */}
      {monthlyUser && (
        <div className={styles.historySection}>
          <h3 className={styles.historyHeading}>Monthly Summary</h3>
          <p>
            Total Worked: {formatMinutes(monthlyTotalMinutes)} • Late:{" "}
            {formatMinutes(monthlyTotalLateMinutes)} • Overtime:{" "}
            {formatMinutes(monthlyTotalOvertimeMinutes)}
          </p>

          <button
            onClick={() =>
              exportMonthlyReportToPDF(
                monthlyUserDetails,
                monthlyRecords,
                monthlyTotalMinutes
              )
            }
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📄 Export PDF
          </button>

          {monthlyRecords.map((att) => (
            <div key={att._id} className={styles.historyCard}>
              <p>
                <strong>Date:</strong> {att.date} — ⏱️ Worked:{" "}
                {formatMinutes(att.dayMinutes || att.totalMinutes || 0)} • ⚠️ Late:{" "}
                {formatMinutes(att.totalLateMinutes || 0)} • ⏫ OT:{" "}
                {formatMinutes(att.totalOvertimeMinutes || 0)}
              </p>

              {att.punches.length === 0 && <p>No punches</p>}
              {att.punches.map((p, idx) => (
                <div key={idx} className={styles.historyPunch}>
                  <p>
                    <strong>In:</strong> {formatTo12Hour(p.inTime)}{" "}
                    {p.lateMark && (
                      <span className={styles.late}>
                        (Late{p.lateMinutes ? ` +${p.lateMinutes}m` : ""})
                      </span>
                    )}
                  </p>
                  {p.inPhotoUrl && (
                    <img
                      src={p.inPhotoUrl}
                      alt="In Punch"
                      className={styles.punchImage}
                      style={{ maxWidth: "100px", marginBottom: "8px" }}
                    />
                  )}
                  <p>
                    <strong>Out:</strong> {formatTo12Hour(p.outTime)}{" "}
                    {p.overtimeMark && (
                      <span className={styles.overtime}>
                        (Overtime{p.overtimeMinutes ? ` +${p.overtimeMinutes}m` : ""})
                      </span>
                    )}
                  </p>
                  {p.outPhotoUrl && (
                    <img
                      src={p.outPhotoUrl}
                      alt="Out Punch"
                      className={styles.punchImage}
                      style={{ maxWidth: "100px", marginBottom: "8px" }}
                    />
                  )}
                  {p.durationInMinutes != null && (
                    <p className={styles.durationSmall}>
                      ⏱️ Worked: {formatMinutes(p.durationInMinutes)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Attendance History Section */}
      {historyUser && (
        <div className={styles.historySection}>
          <h3 className={styles.historyHeading}>Attendance History</h3>

          {user?.image && (
            <img
              src={user.image}
              alt="Employee"
              className={styles.empImage}
              style={{
                width: "80px",
                borderRadius: "50%",
                marginBottom: "10px",
              }}
            />
          )}

          {historyRecords.length === 0 && <p>No history found.</p>}

          {[...historyRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((att) => (
              <div key={att._id} className={styles.historyCard}>
                <p>
                  <strong>Date:</strong> {att.date}
                </p>
                {att.punches.length === 0 && <p>No punches</p>}

                {att.punches.map((p, idx) => (
                  <div key={idx} className={styles.historyPunch}>
                    <p>
                      <strong>In:</strong> {formatTo12Hour(p.inTime)}{" "}
                      {p.lateMark && (
                        <span className={styles.late}>
                          (Late{p.lateMinutes ? ` +${p.lateMinutes}m` : ""})
                        </span>
                      )}
                    </p>
                    {p.inPhotoUrl && (
                      <img
                        src={p.inPhotoUrl}
                        alt="In Punch"
                        className={styles.punchImage}
                        style={{
                          maxWidth: "100px",
                          borderRadius: "4px",
                          marginBottom: "6px",
                        }}
                      />
                    )}

                    <p>
                      <strong>Out:</strong> {formatTo12Hour(p.outTime)}{" "}
                      {p.overtimeMark && (
                        <span className={styles.overtime}>
                          (Overtime{p.overtimeMinutes ? ` +${p.overtimeMinutes}m` : ""})
                        </span>
                      )}
                    </p>
                    {p.outPhotoUrl && (
                      <img
                        src={p.outPhotoUrl}
                        alt="Out Punch"
                        className={styles.punchImage}
                        style={{
                          maxWidth: "100px",
                          borderRadius: "4px",
                          marginBottom: "6px",
                        }}
                      />
                    )}

                    {p.durationInMinutes != null && (
                      <p className={styles.durationSmall}>
                        ⏱️ Worked: {formatMinutes(p.durationInMinutes)}
                      </p>
                    )}
                  </div>
                ))}

                {att.totalMinutes !== undefined && (
                  <p className={styles.totalDurationSmall}>
                    Total Worked: {formatMinutes(att.totalMinutes)} • Late:{" "}
                    {formatMinutes(att.totalLateMinutes || 0)} • OT:{" "}
                    {formatMinutes(att.totalOvertimeMinutes || 0)}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
