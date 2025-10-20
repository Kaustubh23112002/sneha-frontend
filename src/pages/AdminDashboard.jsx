import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import styles from "./AdminDashboard.module.css";
import moment from "moment"; // add moment import if not already imported
import { exportMonthlyReportToPDF } from "../utils/exportPdf";


const AdminDashboard = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceList, setAttendanceList] = useState([]);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [editPunches, setEditPunches] = useState({});
  const [editEmployees, setEditEmployees] = useState({});
  const [historyUserDetails, setHistoryUserDetails] = useState(null);
  const [monthlyUserDetails, setMonthlyUserDetails] = useState(null);


  // New states for monthly summary
  const [monthlyUser, setMonthlyUser] = useState(null);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthlyTotalMinutes, setMonthlyTotalMinutes] = useState(0);

  const user = historyUserDetails;

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
      setHistoryUser(null);
      setHistoryRecords([]);
      // Clear monthly summary on date load to avoid confusion
      setMonthlyUser(null);
      setMonthlyRecords([]);
      setMonthlyTotalMinutes(0);
    } catch (err) {
      console.error("Error fetching attendance by date:", err);
    }
  };

  const fetchHistory = async (userId) => {
    try {
      const res = await axiosClient.get(
        `/api/admin/attendance/${userId}/history`
      );
      setHistoryUser(userId);
      setHistoryRecords(res.data.history || []);
      setHistoryUserDetails(res.data.user); // NEW
      // Clear monthly summary when viewing history
      setMonthlyUser(null);
      setMonthlyRecords([]);
      setMonthlyTotalMinutes(0);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  // New: Fetch monthly summary for a user for current month
  const fetchMonthlySummary = async (userId) => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    try {
      const res = await axiosClient.get(
        `/api/admin/attendance/${userId}/month`,
        {
          params: { month },
        }
      );

       console.log("Monthly Summary Response:", res.data); // 👈 ADD THIS LINE
      const records = res.data.records || [];

      let totalMin = 0;
      // Calculate total minutes in month
      records.forEach((att) => {
        att.punches.forEach((p) => {
          if (p.inTime && p.outTime) {
            const inM = moment(p.inTime, "hh:mm A");
            const outM = moment(p.outTime, "hh:mm A");
            const diff = outM.diff(inM, "minutes");
            if (diff > 0) totalMin += diff;
          }
        });
      });

      setMonthlyUser(userId);
      setMonthlyRecords(records);
      setMonthlyTotalMinutes(totalMin);
       setMonthlyUserDetails(res.data.user); // ✅ Set full user object here

      // Clear history when viewing monthly summary
      setHistoryUser(null);
      setHistoryRecords([]);
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
      const shifts = prev[userId]?.shiftTimings
        ? [...prev[userId].shiftTimings]
        : [];
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
    } catch (err) {
      alert("Failed to update employee");
      console.error(err);
    }
  };

  const formatTo12Hour = (timeStr) => {
    if (!timeStr) return "--";
    const [hour, minute] = timeStr.split(":");
    const h = parseInt(hour, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${minute} ${suffix}`;
  };

  useEffect(() => {
    fetchByDate();
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
                <button
                  className={styles.historyButton}
                  onClick={() => fetchHistory(user._id)}
                >
                  View History
                </button>
                {/* New: Monthly Summary Button */}
                <button
                  className={styles.historyButton}
                  onClick={() => fetchMonthlySummary(user._id)}
                  style={{ marginLeft: "8px" }}
                >
                  View Monthly Summary
                </button>
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
                      handleEmployeeChange(
                        user._id,
                        "phoneNumber",
                        e.target.value
                      )
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
                          handleShiftChange(
                            user._id,
                            i,
                            "start",
                            e.target.value
                          )
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

              {att.totalHours !== undefined && (
                <div className={styles.totalWork}>
                  🕒 Total Work:{" "}
                  {(() => {
                    const hours = Math.floor(att.totalMinutes / 60);
                    const minutes = att.totalMinutes % 60;
                    return `${hours}h ${minutes}m`;
                  })()}
                </div>
              )}

              <div className={styles.punchContainer}>
                <h4 className={styles.subheading}>Punch Records</h4>
                {punches.length === 0 && (
                  <p className={styles.noRecordsSmall}>No punches</p>
                )}
                {punches.map((p, idx) => (
                  <div key={idx} className={styles.punchRow}>
                    <div className={styles.punchField}>
                      <label>In</label>
                      <input
                        type="time"
                        value={p.inTime || ""}
                        onChange={(e) =>
                          handlePunchChange(
                            att._id,
                            idx,
                            "inTime",
                            e.target.value
                          )
                        }
                      />
                      {(() => {
                        const shift0 = empEdit.shiftTimings?.[0];
                        if (
                          shift0?.start &&
                          p.inTime &&
                          p.inTime > shift0.start
                        ) {
                          return <span className={styles.late}>Late</span>;
                        }
                        return null;
                      })()}
                    </div>
                    <div className={styles.punchField}>
                      <label>Out</label>
                      <input
                        type="time"
                        value={p.outTime || ""}
                        onChange={(e) =>
                          handlePunchChange(
                            att._id,
                            idx,
                            "outTime",
                            e.target.value
                          )
                        }
                      />
                      {p.overtime && (
                        <span className={styles.overtime}>Overtime</span>
                      )}
                    </div>
                    {p.inTime &&
                      p.outTime &&
                      (() => {
                        const [inHour, inMin] = p.inTime.split(":").map(Number);
                        const [outHour, outMin] = p.outTime
                          .split(":")
                          .map(Number);
                        const inTotal = inHour * 60 + inMin;
                        const outTotal = outHour * 60 + outMin;
                        const duration = outTotal - inTotal;
                        const hours = Math.floor(duration / 60);
                        const minutes = duration % 60;

                        return (
                          <div className={styles.durationDisplay}>
                            ⏱️ Duration: {hours}h {minutes}m
                          </div>
                        );
                      })()}

                    <button
                      className={styles.savePunchButton}
                      onClick={() => savePunchChanges(att._id, idx)}
                    >
                      Save
                    </button>
                  </div>
                ))}
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
            Total Worked: {Math.floor(monthlyTotalMinutes / 60)}h{" "}
            {monthlyTotalMinutes % 60}m
          </p>
          

          <button
            onClick={() =>
              exportMonthlyReportToPDF(monthlyUserDetails, monthlyRecords, monthlyTotalMinutes)
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
                <strong>Date:</strong> {att.date} —{" "}
                {(() => {
                  let total = 0;
                  att.punches.forEach((p) => {
                    if (p.inTime && p.outTime) {
                      const [inH, inM] = p.inTime.split(":").map(Number);
                      const [outH, outM] = p.outTime.split(":").map(Number);
                      const duration = outH * 60 + outM - (inH * 60 + inM);
                      if (duration > 0) total += duration;
                    }
                  });
                  const h = Math.floor(total / 60);
                  const m = total % 60;
                  return `⏱️ Worked: ${h}h ${m}m`;
                })()}
              </p>

              {att.punches.length === 0 && <p>No punches</p>}
              {att.punches.map((p, idx) => (
                <div key={idx} className={styles.historyPunch}>
                  <p>
                    <strong>In:</strong> {formatTo12Hour(p.inTime)}{" "}
                    {p.late && <span className={styles.late}>(Late)</span>}
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
                    {p.overtime && (
                      <span className={styles.overtime}>(Overtime)</span>
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
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // latest first
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
                      {(() => {
                        const userObj = attendanceList.find(
                          (a) => a.user._id === historyUser
                        )?.user;
                        const shift = userObj?.shiftTimings?.[0];
                        if (shift?.start && p.inTime > shift.start) {
                          return <span className={styles.late}>(Late)</span>;
                        }
                        return null;
                      })()}
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
                      {p.overtime && (
                        <span className={styles.overtime}>(Overtime)</span>
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

                    {p.inTime &&
                      p.outTime &&
                      (() => {
                        const [inHour, inMin] = p.inTime.split(":").map(Number);
                        const [outHour, outMin] = p.outTime
                          .split(":")
                          .map(Number);
                        const inTotal = inHour * 60 + inMin;
                        const outTotal = outHour * 60 + outMin;
                        const duration = outTotal - inTotal;
                        const hours = Math.floor(duration / 60);
                        const minutes = duration % 60;
                        return (
                          <p className={styles.durationSmall}>
                            ⏱️ Worked: {hours}h {minutes}m
                          </p>
                        );
                      })()}
                  </div>
                ))}
                {att.totalHours !== undefined && (
                  <p className={styles.totalDurationSmall}>
                    Total Duration: {att.totalHours}h {att.totalMinutes}m
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