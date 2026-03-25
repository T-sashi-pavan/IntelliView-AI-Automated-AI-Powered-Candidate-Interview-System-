import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '../services/api';
import toast from 'react-hot-toast';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await axios.post('/auth/login', { email, password });
          const { user, accessToken } = res.data;
          set({ user, token: accessToken, isAuthenticated: true, loading: false });
          toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
          return { success: true, role: user.role };
        } catch (err) {
          set({ loading: false });
          toast.error(err.response?.data?.message || 'Login failed');
          return { success: false };
        }
      },

      register: async (data) => {
        set({ loading: true });
        try {
          const res = await axios.post('/auth/register', data);
          const { user, accessToken } = res.data;
          set({ user, token: accessToken, isAuthenticated: true, loading: false });
          toast.success('Account created! Please verify your email.');
          return { success: true, role: user.role };
        } catch (err) {
          set({ loading: false });
          toast.error(err.response?.data?.message || 'Registration failed');
          return { success: false };
        }
      },

      logout: async () => {
        try {
          await axios.post('/auth/logout');
        } catch {}
        set({ user: null, token: null, isAuthenticated: false });
        toast.success('Logged out successfully');
      },

      setUserFromToken: async (token) => {
        set({ token, loading: true });
        try {
          const res = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          set({ user: res.data.user, isAuthenticated: true, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      updateRole: async (role) => {
        try {
          const res = await axios.put('/auth/update-role', { role });
          set({ user: res.data.user });
          toast.success(`Switched to ${role} mode`);
        } catch (err) {
          toast.error('Failed to switch role');
        }
      },

      refreshUser: async () => {
        try {
          const res = await axios.get('/auth/me');
          set({ user: res.data.user });
        } catch {}
      },
    }),
    {
      name: 'interview-ai-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
