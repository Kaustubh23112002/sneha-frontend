// src/utils/logout.js
import axiosClient from "../api/axiosClient";

export const logoutUser = async (navigate) => {
  try {
    await axiosClient.post("/api/auth/logout");
  } catch (err) {
    console.error("Logout error:", err.message);
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  navigate("/login");
};
