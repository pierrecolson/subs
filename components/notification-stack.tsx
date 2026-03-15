"use client";

import { Bell } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

interface NotificationStackProps {
  notifications: Notification[];
  onOpenDrawer: () => void;
}

export function NotificationStack({ notifications, onOpenDrawer }: NotificationStackProps) {
  const unread = notifications.filter((n) => !n.read_at);
  if (unread.length === 0) return null;

  const topNotifications = unread.slice(0, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Notifications</h3>
        <button
          onClick={onOpenDrawer}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all ({unread.length})
        </button>
      </div>
      {topNotifications.map((n) => (
        <div
          key={n.id}
          className="p-3 rounded-xl bg-secondary/50 border border-border cursor-pointer hover:bg-secondary/80 transition-colors"
          onClick={onOpenDrawer}
        >
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
