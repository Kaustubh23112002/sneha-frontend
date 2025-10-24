import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://sneha-backend-ejzd.onrender.com",
  withCredentials: true, // keep cookie fallback
});

// Add Authorization from localStorage token for every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosClient;