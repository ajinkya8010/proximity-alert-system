import axios from "axios";

const apiRequest = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: true,
});

export default apiRequest;