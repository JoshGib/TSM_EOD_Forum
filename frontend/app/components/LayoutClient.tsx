'use client';

import { AuthProvider } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { ReactNode } from "react";

export function LayoutClient({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
