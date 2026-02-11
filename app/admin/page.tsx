"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

interface Chat {
  id: string;
  title: string;
  prompt: string;
  model: string;
  quality: string;
  createdAt: string;
  user: { email: string; name: string | null } | null;
  _count: { messages: number };
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await adminFetch("/api/admin/chats");
      
      if (!response.ok) {
        throw new Error("Failed to fetch chats");
      }

      const data = await response.json();
      setChats(data.chats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (chatId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete chat "${title}"? This will also delete all messages.`)) {
      return;
    }

    setDeletingId(chatId);
    try {
      const response = await adminFetch(`/api/admin/chats?id=${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      // Refresh list
      await fetchChats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete chat");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Chats Management</h1>
        <div className="text-gray-400">Loading chats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Chats Management</h1>
        <div className="text-red-400 bg-red-900/20 p-4 rounded-md">{error}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-6">Chats Management</h1>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Model</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Messages</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {chats.map((chat) => (
              <tr key={chat.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                  {chat.title || 'Untitled'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {chat.user?.email || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{chat.model}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{chat._count.messages}</td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => handleDelete(chat.id, chat.title)}
                    disabled={deletingId === chat.id}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === chat.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {chats.length === 0 && (
          <div className="text-center py-8 text-gray-400">No chats found</div>
        )}
      </div>
    </div>
  );
}
