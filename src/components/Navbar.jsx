// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutUser } from "../utils/logout";
import styles from "./Navbar.module.css"; // ✅ Import CSS module
import { FaBars, FaTimes } from "react-icons/fa"; // ✅ Install react-icons if not already

const Navbar = ({ user, setUser }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser(navigate);
    setUser(null);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>Attendance App</div>

      <button className={styles.hamburger} onClick={toggleMenu}>
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className={`${styles.links} ${menuOpen ? styles.active : ""}`}>
        {!user && (
          <NavLink to="/login" onClick={closeMenu} className={styles.link}>
            Login
          </NavLink>
        )}

        {user?.role === "admin" && (
          <>
            <NavLink to="/admin" onClick={closeMenu} className={styles.link}>
              Admin Dashboard
            </NavLink>
            <NavLink
              to="/create-employee"
              onClick={closeMenu}
              className={styles.link}
            >
              Create Employee
            </NavLink>
          </>
        )}

        {user?.role === "employee" && (
          <NavLink to="/dashboard" onClick={closeMenu} className={styles.link}>
            Dashboard
          </NavLink>
        )}

        {user && (
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
