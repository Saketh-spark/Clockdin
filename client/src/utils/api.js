import axios from 'axios';

const FALLBACK_API_BASE = 'https://clockdin-api.onrender.com';
const rawBase = (process.env.REACT_APP_API_BASE || FALLBACK_API_BASE).trim();
const normalizedBase = rawBase.replace(/\/$/, '');
const ensureLeadingSlash = path => path.startsWith('/') ? path : `/${path}`;

export const buildApiUrl = path => `${normalizedBase}${ensureLeadingSlash(path)}`;

export const apiFetch = (path, options = {}) => {
  const url = buildApiUrl(path);
  return fetch(url, options);
};

export const apiAxios = axios.create({
  baseURL: normalizedBase || undefined,
  withCredentials: true,
});
