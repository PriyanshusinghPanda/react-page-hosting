import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://api-deploydash.nstsdc.org",
  withCredentials: true,
});

export default api;
