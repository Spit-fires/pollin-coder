"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Spinner from "@/components/spinner";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
  _count?: {
    messages: number;
  };
}

interface ChatsResponse {
  chats: Chat[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const { toast } = useToast();

  const fetchChats = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await adminFetch(
        `/api/admin/chats?page=${page}&limit=20`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch chats");
      }

      const data: ChatsResponse = await response.json();
      setChats(data.chats);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch chats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleDelete = async (chatId: string) => {
    if (!confirm("Are you sure you want to delete this chat and all its messages?")) {
      return;
    }

    try {
      setDeleting(chatId);
      const response = await adminFetch(`/api/admin/chats?chatId=${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete chat");
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: result.message || "Chat deleted successfully",
      });

      // Refresh the list
      await fetchChats(pagination.page);
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete chat",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchChats(newPage);
  };

  if (loading && chats.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all user chats
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {chats.length} of {pagination.total} chats
          </div>
          {loading && (
            <Spinner className="w-4 h-4" />
          )}
        </div>

        <div className="space-y-4">
          {chats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No chats found
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Chat {chat.id.slice(0, 8)}
                    </div>
                    {chat.user && (
                      <div className="text-sm text-muted-foreground">
                        by {chat.user.displayName || chat.user.username}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div>
                      Created:{" "}
                      {new Date(chat.createdAt).toLocaleDateString()}
                    </div>
                    {chat._count && (
                      <div>{chat._count.messages} messages</div>
                    )}
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(chat.id)}
                  disabled={deleting === chat.id}
                >
                  {deleting === chat.id ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
