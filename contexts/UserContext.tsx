'use client';

import { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  user: any;
  companyId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children, user, companyId }: { 
  children: ReactNode; 
  user: any;
  companyId: string | null;
}) {
  return (
    <UserContext.Provider value={{ user, companyId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}