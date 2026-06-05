import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  const tok = localStorage.getItem('lunatick_token');
  if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  return cfg;
});

export function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

export function wsUrl(path) {
  const base = process.env.REACT_APP_BACKEND_URL || '';
  return base.replace(/^http/, 'ws') + path;
}
