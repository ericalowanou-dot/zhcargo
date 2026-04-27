"use client";

import { CartProvider } from "@/lib/cartContext";
import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3200,
            style: { background: "#1A3C6E", color: "#fff" },
          }}
        />
      </CartProvider>
    </SessionProvider>
  );
}
