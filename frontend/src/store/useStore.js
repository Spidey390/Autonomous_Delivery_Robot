import { create } from 'zustand';

const useStore = create((set) => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  token: localStorage.getItem('token') || null,
  robotState: {
    lat: 0,
    lng: 0,
    battery: 100,
    status: 'Stopped',
    wifi: 100,
    obstacle: false
  },
  deliveries: [],
  presets: [],
  sysSettings: null,
  setUser: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
  setRobotState: (state) => set((prev) => ({ robotState: { ...prev.robotState, ...state } })),
  setDeliveries: (deliveries) => set({ deliveries }),
  setPresets: (presets) => set({ presets }),
  setSysSettings: (sysSettings) => set({ sysSettings }),
}));

export default useStore;
