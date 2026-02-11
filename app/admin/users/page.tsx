"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

interface User {
  id: string;
  email: string;
  name: string | null;
  tier: string | null;
  role: string;
  createdAt: string;
  _count: { chats: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminFetch("/api/admin/users");
      
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This will also delete all their chats and messages.`)) {
      return;
    }

    setDeletingId(userId);
    try {
      const response = await adminFetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      const result = await response.json();
      alert(result.message || "User deleted successfully");

      // Refresh list
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Users Management</h1>
        <div className="text-gray-400">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Users Management</h1>
        <div className="text-red-400 bg-red-900/20 p-4 rounded-md">{error}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-6">Users Management</h1>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tier</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Chats</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-300">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{user.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{user.tier || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{user._count.chats}</td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    disabled={deletingId === user.id}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">No users found</div>
        )}
      </div>
    </div>
  );
}
