"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface Features {
  uploadEnabled: boolean;
  screenshotFlowEnabled: boolean;
  shadcnEnabled: boolean;
}

const FLAG_META: {
  key: keyof Features;
  label: string;
  description: string;
}[] = [
  {
    key: "uploadEnabled",
    label: "Upload Enabled",
    description: "Allow users to upload images",
  },
  {
    key: "screenshotFlowEnabled",
    label: "Screenshot Flow Enabled",
    description: "Enable screenshot-to-code functionality",
  },
  {
    key: "shadcnEnabled",
    label: "Shadcn Enabled",
    description: "Include Shadcn UI components in generation",
  },
];

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<Features | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await adminFetch("/api/admin/features");
      if (!response.ok) throw new Error("Failed to fetch features");
      const data = await response.json();
      setFeatures(data.features || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load features");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof Features, enabled: boolean) => {
    if (!features) return;
    setToggling(key);
    setError("");

    // Optimistic update
    const prev = { ...features };
    setFeatures({ ...features, [key]: enabled });

    try {
      const response = await adminFetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: key, enabled }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update feature flag");
      }
    } catch (err) {
      // Revert on error
      setFeatures(prev);
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setToggling(null);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Feature Flags</h1>
        <div className="text-gray-400">Loading features...</div>
      </div>
    );
  }

  if (error && !features) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Feature Flags</h1>
        <div className="text-red-400 bg-red-900/20 p-4 rounded-md">{error}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-6">Feature Flags</h1>

      {error && (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Runtime Feature Flags</CardTitle>
          <CardDescription className="text-gray-400">
            Toggle features on or off. Changes take effect immediately and are
            persisted in the database (with environment variable fallback).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FLAG_META.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-md"
              >
                <div>
                  <div className="text-white font-medium">{label}</div>
                  <div className="text-gray-400 text-sm">{description}</div>
                </div>
                <Switch
                  checked={features?.[key] ?? false}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                  disabled={toggling === key}
                  aria-label={`Toggle ${label}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
