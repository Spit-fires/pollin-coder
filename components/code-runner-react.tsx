"use client";

import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { shadcnFiles, dependencies } from "@/lib/sandpack-files";

// Simple code viewer component as fallback
function SimpleCodeViewer({ code }: { code: string }) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("code");

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex border-b border-gray-200 p-2">
        <button
          onClick={() => setActiveTab("code")}
          className={`px-3 py-1 rounded-md ${
            activeTab === "code" ? "bg-gray-200" : ""
          }`}
        >
          Code
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-3 py-1 ml-2 rounded-md ${
            activeTab === "preview" ? "bg-gray-200" : ""
          }`}
        >
          Preview (Unavailable)
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "code" ? (
          <pre className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-md overflow-auto">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="p-4 bg-red-50 rounded-md border border-red-200">
            <h3 className="text-lg font-medium text-red-800 mb-2">Preview Error</h3>
            <p className="text-sm text-red-600">
              Unable to preview the code. The code sandbox could not be initialized.
              The code is still displayed in the {"\""} Code {"\""} tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReactCodeRunner({
  code,
  onRequestFix,
}: {
  code: string;
  onRequestFix?: (e: string) => void;
}) {
  const [hasError, setHasError] = useState(false);

  // Use simple code viewer when there's an error
  if (hasError) {
    return <SimpleCodeViewer code={code} />;
  }

  return (
    <ErrorBoundary 
      fallbackRender={({ error }) => {
        console.error("Sandpack error:", error);
        if (onRequestFix) {
          // Only call onRequestFix if it's available
          onRequestFix(error.message || "Unknown error in code sandbox");
        }
        return <SimpleCodeViewer code={code} />;
      }}
      onError={() => setHasError(true)}
    >
      <SandpackWrapper code={code} onRequestFix={onRequestFix} />
    </ErrorBoundary>
  );
}

// Import Sandpack in a separate component to better handle errors
import dynamic from "next/dynamic";

const DynamicSandpack = dynamic(
  () => import("./sandpack-components"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-6 text-xl font-medium text-purple-600">Loading code preview...</div>
          <div className="flex justify-center space-x-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}>1</div>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }}>2</div>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold animate-bounce" style={{ animationDelay: "600ms", animationDuration: "1s" }}>3</div>
          </div>
          <div className="h-3 w-64 bg-gray-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-purple-500 animate-pulse" style={{ animationDuration: "1.5s" }}></div>
          </div>
        </div>
      </div>
    ),
  }
);

function SandpackWrapper({ code, onRequestFix }: { code: string; onRequestFix?: (e: string) => void }) {
  return <DynamicSandpack code={code} onRequestFix={onRequestFix} dependencies={dependencies} shadcnFiles={shadcnFiles} />;
}
