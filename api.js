const BASE = 'https://sid-restapi.onrender.com';

async function http(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['x-token'] = token;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.msg || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// 1) Registro
export function apiRegister(username, password) {
  return http('/api/usuarios', {
    method: 'POST',
    body: { username, password },
  });
}

// 2) Login
export function apiLogin(username, password) {
  return http('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

// 3) Obtener perfil (requiere token)
export function apiGetProfile(username, token) {
  const q = new URLSearchParams({ username });
  return http(`/api/usuarios?${q.toString()}`, { token });
}

// 4) Actualizar data (por ejemplo score)
export function apiPatchUser(username, data, token) {
  return http('/api/usuarios', {
    method: 'PATCH',
    token,
    body: { username, data },
  });
}

// 5) Listar usuarios (leaderboard)
export function apiListUsers({ limit = 20, skip = 0, sort = true } = {}, token) {
  const q = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    sort: String(!!sort),
  });
  return http(`/api/usuarios?${q.toString()}`, { token });
}
