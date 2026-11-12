const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const getToken = () => localStorage.getItem('cl_token');

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(BASE + path, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Check your connection and try again.'); }
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); }
  catch {
    if (res.ok) throw new Error('The API returned an unexpected response. Set VITE_API_URL to your backend URL in Vercel, then redeploy.');
  }
  if (res.status === 401 && t && !path.startsWith('/api/auth/login')) {
    localStorage.removeItem('cl_token'); localStorage.removeItem('cl_user');
    window.location.assign('/login');
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
