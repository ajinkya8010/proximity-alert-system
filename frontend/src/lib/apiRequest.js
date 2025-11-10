import axios from "axios";

const apiRequest = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api",
    withCredentials: true,
});

export default apiRequest;