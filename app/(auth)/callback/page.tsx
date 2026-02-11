"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThreeBackgroundScene from "@/components/ThreeBackgroundScene";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Spinner from "@/components/spinner";
import LogoSmall from "@/components/icons/logo-small";

export default function CallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Extract api_key from URL fragment (#api_key=...)
        const fragment = window.location.hash.slice(1); // Remove the #
        const params = new URLSearchParams(fragment);
        const apiKey = params.get("api_key");

        if (!apiKey) {
          setStatus("error");
          setErrorMessage("No API key received from Pollinations. Please try again.");
          return;
        }

        // Validate the key format
        const validKeyFormat = /^(sk_|pk_)[a-zA-Z0-9_-]{10,500}$/.test(apiKey);
        if (!validKeyFormat) {
          setStatus("error");
          setErrorMessage("Invalid API key format received.");
          return;
        }

        // Clear the key from URL hash to prevent leakage via history/referrer
        window.history.replaceState(null, "", window.location.pathname);

        // Send the key to our server to set as cookie
        const response = await fetch("/api/auth/set-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to authenticate");
        }

        setStatus("success");
        
        // Redirect to home after a brief delay
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred"
        );
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <ThreeBackgroundScene />
      </div>

      {/* Status Card */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center mb-2">
              <LogoSmall />
            </div>
            <CardTitle className="text-2xl font-bold text-purple-600">
              {status === "loading" && "Connecting..."}
              {status === "success" && "Connected!"}
              {status === "error" && "Connection Failed"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Setting up your authentication..."}
              {status === "success" && "Redirecting you to the app..."}
              {status === "error" && "We couldn't connect your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {status === "loading" && (
              <div className="py-8">
                <Spinner />
              </div>
            )}
            
            {status === "success" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">Successfully connected to Pollinations!</p>
              </div>
            )}
            
            {status === "error" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-red-600 text-sm">{errorMessage}</p>
                <button
                  onClick={() => router.push("/login")}
                  className="text-purple-600 hover:underline text-sm font-medium"
                >
                  Return to login
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
