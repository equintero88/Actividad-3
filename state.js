export const auth = {
  get token() { return localStorage.getItem('sid_token') || ''; },
  set token(v) { v ? localStorage.setItem('sid_token', v) : localStorage.removeItem('sid_token'); },

  get username() { return localStorage.getItem('sid_username') || ''; },
  set username(v) { v ? localStorage.setItem('sid_username', v) : localStorage.removeItem('sid_username'); },

  isAuth() { return !!this.token && !!this.username; },
  clear() { this.token = ''; this.username = ''; },
};
