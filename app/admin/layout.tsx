"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated, adminLogout, adminFetch, clearAdminToken } from "@/lib/admin-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const hasToken = isAdminAuthenticated();
      const isLoginPage = pathname === '/admin/login';

      if (!hasToken && !isLoginPage) {
        router.push('/admin/login');
        setIsLoading(false);
        return;
      }

      if (hasToken && !isLoginPage) {
        // Verify token with server
        try {
          const response = await adminFetch('/api/admin/auth/verify', {
            method: 'POST',
          });

          if (!response.ok) {
            // Token is invalid or expired
            clearAdminToken();
            router.push('/admin/login');
            return;
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          clearAdminToken();
          router.push('/admin/login');
          return;
        }
      }

      if (hasToken && isLoginPage) {
        router.push('/admin/dashboard');
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await adminLogout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isLoginPage = pathname === '/admin/login';

  return (
    <div className="min-h-screen bg-gray-900">
      {!isLoginPage && (
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <span className="text-white font-bold text-xl mr-8">Admin Panel</span>
                <div className="flex space-x-4">
                  <Link
                    href="/admin/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/admin/dashboard'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/admin/users'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/chats"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/admin/chats'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    Chats
                  </Link>
                  <Link
                    href="/admin/features"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/admin/features'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    Features
                  </Link>
                </div>
              </div>
              <div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
