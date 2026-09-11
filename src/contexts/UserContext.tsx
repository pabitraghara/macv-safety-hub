"use client";

import { createContext, useContext } from "react";

export interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  avatar_color?: string;
}

interface UserContextValue {
  profile: UserProfile | null;
}

const UserContext = createContext<UserContextValue>({ profile: null });

export function UserProvider({
  profile,
  children,
}: {
  profile: UserProfile | null;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={{ profile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
