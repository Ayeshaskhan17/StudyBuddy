// ============================================================================
// StudyBuddy Authentication Client Service (src/services/authService.js)
// Manages real JWT sessions, login, signup, user profile, and logout.
// ============================================================================

const TOKEN_KEY = 'studybuddy_auth_token_v2';
const USER_KEY = 'studybuddy_auth_user_v2';

class AuthService {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated() {
    return Boolean(this.getToken() && this.getUser());
  }

  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async signup({ name, email, password, college, branch, semester }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(name || '').trim(),
        email: cleanEmail,
        password: String(password || ''),
        college: college ? String(college).trim() : '',
        branch: branch ? String(branch).trim() : '',
        semester: semester || 'Semester 1'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account.');
    }

    this.setSession(data.token, data.user);
    return data.user;
  }

  async login({ email, password }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: String(password || '')
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials.');
    }

    this.setSession(data.token, data.user);
    return data.user;
  }

  async fetchMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      this.clearSession();
      return null;
    } catch {
      return this.getUser();
    }
  }

  async forgotPassword(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });
    return res.json();
  }

  hasCompletedWelcome(userId) {
    if (!userId) return false;
    return localStorage.getItem(`studybuddy_welcome_completed_${userId}`) === 'true';
  }

  setWelcomeCompleted(userId) {
    if (!userId) return;
    localStorage.setItem(`studybuddy_welcome_completed_${userId}`, 'true');
    const user = this.getUser();
    if (user && user.id === userId) {
      user.welcomeCompleted = true;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  logout() {
    this.clearSession();
  }
}

export const authService = new AuthService();
