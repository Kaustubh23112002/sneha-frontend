// src/api/axiosClient.js
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5000", // ✅ correct backend URL
  withCredentials: true,                // ✅ important for cookies (auth)
});

export default axiosClient;
