import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadProfile, saveProfile } from '../lib/storage.js';
import { colorForName } from '../lib/crypto.js';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => loadProfile());

  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  const updateProfile = useCallback((patch) => {
    setProfile((prev) => {
      const next = { ...(prev || {}), ...patch };
      if (next.name && !patch.color && !next.color) {
        next.color = colorForName(next.name);
      }
      return next;
    });
  }, []);

  const setName = useCallback(
    (name) => {
      updateProfile({ name, color: colorForName(name) });
    },
    [updateProfile]
  );

  return (
    <ProfileContext.Provider value={{ profile, setName, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
