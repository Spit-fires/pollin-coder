"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  overview: {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    totalGeneratedApps: number;
  };
  recent: {
    newUsersLast7Days: number;
    newChatsLast7Days: number;
  };
  breakdown: {
    chatsByModel: Array<{ model: string; count: number }>;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminFetch("/api/admin/stats");
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
        <div className="text-gray-400">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
        <div className="text-red-400 bg-red-900/20 p-4 rounded-md">{error}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Users</CardDescription>
            <CardTitle className="text-3xl text-white">{stats?.overview.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Chats</CardDescription>
            <CardTitle className="text-3xl text-white">{stats?.overview.totalChats}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Messages</CardDescription>
            <CardTitle className="text-3xl text-white">{stats?.overview.totalMessages}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Generated Apps</CardDescription>
            <CardTitle className="text-3xl text-white">{stats?.overview.totalGeneratedApps}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>New Users:</span>
                <span className="font-bold text-green-400">{stats?.recent.newUsersLast7Days}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>New Chats:</span>
                <span className="font-bold text-blue-400">{stats?.recent.newChatsLast7Days}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Chats by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.breakdown.chatsByModel.slice(0, 5).map((item) => (
                <div key={item.model} className="flex justify-between text-gray-300">
                  <span>{item.model}:</span>
                  <span className="font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
