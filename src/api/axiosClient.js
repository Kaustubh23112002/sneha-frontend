// src/api/axiosClient.js
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://sneha-backend-ejzd.onrender.com", // ✅ correct backend URL
  withCredentials: true,                // ✅ important for cookies (auth)
});

export default axiosClient;
