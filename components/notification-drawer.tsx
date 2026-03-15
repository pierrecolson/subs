"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, Plus, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  sent_at: string;
  read_at: string | null;
  subscription_id?: string;
}

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onAction: (notificationId: string, action: string) => void;
}

export function NotificationDrawer({
  open,
  onOpenChange,
  notifications,
  onMarkRead,
  onAction,
}: NotificationDrawerProps) {
  const getActions = (type: string) => {
    switch (type) {
      case "detected":
        return [
          { label: "Add it", icon: Plus, action: "add" },
          { label: "Ignore", icon: X, action: "ignore" },
        ];
      case "cancelled":
        return [
          { label: "Archive", icon: Archive, action: "archive" },
          { label: "Keep it", icon: Check, action: "keep" },
        ];
      case "trial_warning":
        return [
          { label: "Cancel", icon: X, action: "cancel" },
          { label: "Keep it", icon: Check, action: "keep" },
        ];
      default:
        return [{ label: "Dismiss", icon: Check, action: "dismiss" }];
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border ${n.read_at ? "bg-card border-border opacity-60" : "bg-secondary/50 border-border"}`}
            >
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                  </p>
                  {!n.read_at && (
                    <div className="flex gap-2 mt-2">
                      {getActions(n.type).map((a) => (
                        <Button
                          key={a.action}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            onAction(n.id, a.action);
                            onMarkRead(n.id);
                          }}
                        >
                          <a.icon className="w-3 h-3 mr-1" />
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
