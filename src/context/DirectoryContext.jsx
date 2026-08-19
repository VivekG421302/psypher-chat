import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(null);

export function DirectoryProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openDirectory  = useCallback(() => setOpen(true),  []);
  const closeDirectory = useCallback(() => setOpen(false), []);
  return <Ctx.Provider value={{ open, openDirectory, closeDirectory }}>{children}</Ctx.Provider>;
}

export function useDirectory() {
  return useContext(Ctx);
}
