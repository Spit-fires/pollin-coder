"use client";

import Link from "next/link";
import Image from "next/image";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/app/(main)/providers";
import { clearApiKey } from "@/lib/secure-storage";

export default function Header() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const authStatus = useContext(AuthContext);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear localStorage
      clearApiKey();
      localStorage.removeItem('pollinations_profile');
      
      // Call logout endpoint (optional, for server-side cleanup)
      await fetch("/api/auth/logout", { method: "POST" });
      
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-between px-4 py-6">
      <Link href="/" className="text-xl font-bold text-purple-400">
        AI App Builder
      </Link>
      <nav className="flex items-center gap-4">
        <Link 
          href="/projects" 
          className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
        >
          Projects Gallery
        </Link>
        
        {!authStatus.loading && authStatus.authenticated && (
          <>
            {/* User info */}
            <div className="flex items-center gap-3 text-sm text-gray-300">
              {authStatus.profile?.image && (
                <Image
                  src={authStatus.profile.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full border-2 border-purple-400"
                />
              )}
              <div className="text-right">
                {authStatus.profile?.name && (
                  <div className="font-medium">{authStatus.profile.name}</div>
                )}
                {authStatus.balance && (
                  <div className="text-xs text-purple-300">
                    {authStatus.balance.balance.toFixed(0)} Pollen
                  </div>
                )}
              </div>
            </div>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
