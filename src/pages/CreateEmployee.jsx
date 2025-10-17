import React, { useState } from "react";
import axios from "../api/axiosClient";
import styles from "./CreateEmployee.module.css";

const CreateEmployee = () => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    address: "",
    salary: "",
    shiftTimings: [{ start: "", end: "" }],
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleShiftChange = (index, field, value) => {
    const updated = [...form.shiftTimings];
    updated[index][field] = value;
    setForm({ ...form, shiftTimings: updated });
  };

  const addShift = () => {
    setForm({
      ...form,
      shiftTimings: [...form.shiftTimings, { start: "", end: "" }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sanitizedSalary = Number(form.salary);
    const sanitizedShifts = form.shiftTimings.filter(
      (shift) => shift.start.trim() && shift.end.trim()
    );

    const payload = {
      ...form,
      salary: sanitizedSalary,
      shiftTimings: sanitizedShifts,
    };

    try {
      await axios.post("api/auth/create-employee", payload);
      alert("✅ Employee Created!");
    } catch (err) {
      console.error("❌ Create employee error:", err.response?.data || err.message);
      alert(
        `❌ Failed to create employee: ${
          err.response?.data?.errors?.[0]?.msg || "Unknown error"
        }`
      );
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Create New Employee</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          name="fullName"
          onChange={handleChange}
          placeholder="Full Name"
          className={styles.input}
          required
        />
        <input
          name="email"
          type="email"
          onChange={handleChange}
          placeholder="Email"
          className={styles.input}
          required
        />
        <input
          name="password"
          type="password"
          onChange={handleChange}
          placeholder="Password"
          className={styles.input}
          required
        />
        <input
          name="phoneNumber"
          onChange={handleChange}
          placeholder="Phone Number"
          className={styles.input}
          required
        />
        <input
          name="address"
          onChange={handleChange}
          placeholder="Address"
          className={styles.input}
          required
        />
        <input
          name="salary"
          type="number"
          onChange={handleChange}
          placeholder="Salary"
          className={styles.input}
          required
        />

        <div className={styles.shiftSection}>
          <h4>Shift Timings</h4>
          {form.shiftTimings.map((shift, idx) => (
            <div key={idx} className={styles.shiftRow}>
              <input
                type="time"
                value={shift.start}
                onChange={(e) => handleShiftChange(idx, "start", e.target.value)}
                className={styles.shiftInput}
              />
              <input
                type="time"
                value={shift.end}
                onChange={(e) => handleShiftChange(idx, "end", e.target.value)}
                className={styles.shiftInput}
              />
            </div>
          ))}
          <button type="button" onClick={addShift} className={styles.addShiftButton}>
            + Add Shift
          </button>
        </div>

        <button type="submit" className={styles.submitButton}>
          Create Employee
        </button>
      </form>
    </div>
  );
};

export default CreateEmployee;
