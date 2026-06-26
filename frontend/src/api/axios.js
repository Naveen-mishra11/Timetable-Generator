import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.PROD
    ? "/api"
    : import.meta.env.VITE_SERVER_URL + "/api",
});

export default axiosInstance;