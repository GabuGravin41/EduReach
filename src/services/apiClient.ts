import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Use the same normalised base URL as the rest of the app (always ends in /api).
// Never construct paths with a leading /api/ — the base already includes it.
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient as default };
