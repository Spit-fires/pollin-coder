"use client";

import { useState, useEffect } from "react";
import ThreeBackgroundScene from "@/components/ThreeBackgroundScene";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LogoSmall from "@/components/icons/logo-small";

export default function LoginPage() {
  const [models, setModels] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/v1/models");
        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }
        const data = await response.json();
        // Extract model values as comma-separated string
        const modelList = data.models?.map((m: { value: string }) => m.value).join(",");
        setModels(modelList || "openai,openai-fast,openai-large,claude,mistral");
      } catch (error) {
        console.error("Error fetching models:", error);
        // Fallback to basic model list
        setModels("openai,openai-fast,openai-large,claude,mistral");
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  const handleConnect = () => {
    const redirectUrl = encodeURIComponent(`${window.location.origin}/callback`);
    const authorizeUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance&models=${models}&expiry=30`;
    window.location.href = authorizeUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <ThreeBackgroundScene />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center mb-2">
              <LogoSmall />
            </div>
            <CardTitle className="text-3xl font-bold text-purple-600">
              Welcome to AI App Builder
            </CardTitle>
            <CardDescription className="text-base">
              Connect your Pollinations account to start building AI-powered apps instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                  1
                </div>
                <p>Click the button below to connect with Pollinations</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                  2
                </div>
                <p>Authorize the app to use your Pollen balance</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                  3
                </div>
                <p>Start building amazing apps with AI</p>
              </div>
            </div>

            <Button 
              onClick={handleConnect}
              disabled={isLoadingModels}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isLoadingModels ? "Loading models..." : "Connect with Pollinations 🌸"}
            </Button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>This app uses the Bring Your Own Pollen (BYOP) model.</p>
              <p>You pay for your own AI usage. We pay $0.</p>
              <p>
                Don&apos;t have an account?{" "}
                <a 
                  href="https://enter.pollinations.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  Sign up at Pollinations
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
