import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import styles from "../pages/AdminDashboard.module.css";

const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "--";
  const [hour, minute] = timeStr.split(":");
  const h = parseInt(hour);
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

const MonthlyAttendanceTable = () => {
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get("/api/admin/employees");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchMonthlyRecords = async () => {
    if (!selectedUser) return;
    try {
      // Use the monthly endpoint for proper calculation
      const res = await axiosClient.get(
        `/api/admin/attendance/${selectedUser}/month`,
        {
          params: { month },
        }
      );
      setRecords(res.data.records || []);
      setSummary(res.data.summary || null);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching monthly records", err);
      setRecords([]);
      setSummary(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchMonthlyRecords();
  }, [selectedUser, month]);

  // Pagination
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = records.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(records.length / recordsPerPage);

  return (
    <div className={styles.historySection}>
      <h3 className={styles.historyHeading}>Monthly Attendance View</h3>

      <div className={styles.filterSection}>
        <label>Select Employee:</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">-- Select --</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.fullName}
            </option>
          ))}
        </select>

        <label>Select Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      {currentRecords.length === 0 && selectedUser && (
        <p>No attendance found for this user in selected month.</p>
      )}

      {summary && (
        <div className={styles.summaryBox} style={{ 
          margin: "20px 0", 
          padding: "15px", 
          background: "#f5f5f5", 
          borderRadius: "8px" 
        }}>
          <h4>Monthly Summary</h4>
          <p>
            <strong>Total Worked:</strong> {formatMinutes(summary.totalMinutes)} •{" "}
            <strong>Total Late:</strong> {formatMinutes(summary.totalLateMinutes)} •{" "}
            <strong>Late Marks:</strong> {summary.lateMarkCount || 0} •{" "}
            <strong>Half Day Deductions:</strong> {summary.halfDayDeductions || 0}
          </p>
        </div>
      )}

      {currentRecords.length > 0 && (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Duration</th>
                <th>Day Total</th>
                <th>Late</th>
                <th>Half Day</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((att) => {
                // Group punches for the same date
                const firstPunch = att.punches[0] || {};
                const dayTotal = att.dayMinutes || 0;
                const isHalfDay = att.isHalfDayDeducted || false;
                const dayLate = att.totalLateMinutes || 0;

                return att.punches.map((punch, idx) => (
                  <tr key={att._id + idx}>
                    {idx === 0 && (
                      <>
                        <td rowSpan={att.punches.length}>{att.date}</td>
                      </>
                    )}
                    <td>{formatTo12Hour(punch.inTime)}</td>
                    <td>{formatTo12Hour(punch.outTime)}</td>
                    <td>{formatMinutes(punch.durationInMinutes || 0)}</td>
                    {idx === 0 && (
                      <>
                        <td rowSpan={att.punches.length}>
                          {formatMinutes(dayTotal)}
                        </td>
                        <td rowSpan={att.punches.length}>
                          {punch.lateMark ? (
                            <span style={{ color: "orange", fontWeight: "bold" }}>
                              Yes (+{punch.lateMinutes}m)
                            </span>
                          ) : (
                            "No"
                          )}
                        </td>
                        <td rowSpan={att.punches.length}>
                          {isHalfDay ? (
                            <span style={{ color: "red", fontWeight: "bold" }}>
                              ✓ Deducted
                            </span>
                          ) : (
                            "No"
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyAttendanceTable;
