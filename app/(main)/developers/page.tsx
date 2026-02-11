"use client";

import Link from "next/link";
import Header from "@/components/header";
import ThreeBackgroundScene from "@/components/ThreeBackgroundScene";
import { useEffect, useState } from "react";

export default function DevelopersPage() {
  const [animationLoaded, setAnimationLoaded] = useState(false);

  useEffect(() => {
    setAnimationLoaded(true);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <ThreeBackgroundScene />
      </div>

      <div className="isolate flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 px-4 py-12 lg:py-20">
          <div
            className={`mx-auto max-w-4xl space-y-12 opacity-0 ${
              animationLoaded ? "animate-fadeIn" : ""
            }`}
            style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
          >
            {/* Header */}
            <div className="space-y-4 text-center">
              <h1 className="text-4xl font-bold text-white md:text-5xl">
                About the <span className="text-purple-400">Developers</span>
              </h1>
              <p className="text-lg text-gray-300">
                Meet the people behind Pollin Coder
              </p>
            </div>

            {/* Original Creator */}
            <div
              className={`rounded-2xl border-2 border-purple-500/30 bg-gray-900/50 p-8 backdrop-blur-sm opacity-0 ${
                animationLoaded ? "animate-slideUp" : ""
              }`}
              style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-2xl font-bold text-white">
                    R
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">R3AP3R / iotserver24</h2>
                    <p className="text-purple-400">Original Creator</p>
                  </div>
                </div>
                <p className="text-gray-300">
                  The visionary behind Pollin Coder. Created the original project that revolutionized
                  AI-powered code generation with a focus on simplicity and power.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://github.com/iotserver24/pollin-coder"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-purple-400 transition hover:text-purple-300 hover:underline"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    View Original Project
                  </a>
                </div>
              </div>
            </div>

            {/* Current Maintainer */}
            <div
              className={`rounded-2xl border-2 border-purple-500/30 bg-gray-900/50 p-8 backdrop-blur-sm opacity-0 ${
                animationLoaded ? "animate-slideUp" : ""
              }`}
              style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-2xl font-bold text-white">
                    S
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">spit-fires</h2>
                    <p className="text-purple-400">Current Maintainer & Developer</p>
                  </div>
                </div>
                <p className="text-gray-300">
                  Currently maintaining and enhancing Pollin Coder with new features, improvements,
                  and updates. Responsible for the latest BYOP (Bring Your Own Pollen) authentication
                  system and modern feature implementations.
                </p>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Recent Contributions:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                      <span>Migrated to Pollinations API v1 with BYOP authentication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                      <span>Implemented user-based API key management with secure cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                      <span>Added feature flags for optional functionality (uploads, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                      <span>Enhanced UI/UX with modern animations and responsive design</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Powered By */}
            <div
              className={`rounded-2xl border-2 border-purple-500/30 bg-gray-900/50 p-8 backdrop-blur-sm opacity-0 ${
                animationLoaded ? "animate-slideUp" : ""
              }`}
              style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
            >
              <div className="space-y-4 text-center">
                <h2 className="text-2xl font-bold text-white">Powered By</h2>
                <div className="flex flex-col items-center gap-4">
                  <div className="text-3xl font-bold text-purple-400">Pollinations AI</div>
                  <p className="max-w-2xl text-gray-300">
                    Advanced AI models powering code generation, text completion, and multimodal
                    understanding. Pollinations.ai provides the infrastructure for creative AI
                    applications.
                  </p>
                  <a
                    href="https://pollinations.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition hover:bg-purple-500"
                  >
                    Visit Pollinations.ai
                  </a>
                </div>
              </div>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-purple-400 transition hover:text-purple-300 hover:underline"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
