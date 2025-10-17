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

const calculateDuration = (start, end) => {
  if (!start || !end) return "--";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const diff = endMins - startMins;
  if (diff < 0) return "--";
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}h ${mins}m`;
};

const MonthlyAttendanceTable = () => {
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
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
      const res = await axiosClient.get(`/api/admin/attendance/${selectedUser}/history`);
      const all = res.data.history || [];
      const filtered = all.filter((att) => att.date.startsWith(month));
      setRecords(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching history", err);
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

      {currentRecords.length > 0 && (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Duration</th>
                <th>Late</th>
                <th>Overtime</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((att) =>
                att.punches.map((punch, idx) => (
                  <tr key={att._id + idx}>
                    <td>{att.date}</td>
                    <td>{formatTo12Hour(punch.inTime)}</td>
                    <td>{formatTo12Hour(punch.outTime)}</td>
                    <td>{calculateDuration(punch.inTime, punch.outTime)}</td>
                    <td>{punch.late ? "Yes" : "No"}</td>
                    <td>{punch.overtime ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
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
