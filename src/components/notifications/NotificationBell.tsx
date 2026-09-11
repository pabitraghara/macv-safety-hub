'use client';

import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/api/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {loading && notifications.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
          {notifications.map((n, index) => (
            <div key={n.id}>
              <div
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                  !n.read_at && 'bg-blue-50/50 dark:bg-blue-950/20',
                )}
                onClick={() => {
                  if (!n.read_at) markRead(n.id);
                }}
              >
                {/* Unread indicator */}
                <div className="mt-1 flex-shrink-0">
                  {n.read_at ? (
                    <div className="h-2 w-2 rounded-full bg-transparent" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-snug', !n.read_at && 'font-medium')}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>

                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {index < notifications.length - 1 && <Separator />}
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
