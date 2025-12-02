import { Bell, Check, Trash2, CheckCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useLicenseEnforcement } from '@/hooks/useLicenseEnforcement';
import { useTranslation } from 'react-i18next';

export const NotificationCenter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isExpired, daysUntilExpiry, isActive, isReadOnly } = useLicenseEnforcement();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  // Check if we should show license warning
  const showLicenseWarning = isReadOnly || isExpired || !isActive || (daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0);
  const isLicenseExpiredOrReadOnly = isReadOnly || isExpired || !isActive;

  // Adjust unread count to include license warning
  const totalUnreadCount = unreadCount + (showLicenseWarning ? 1 : 0);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate to relevant entity
    if (notification.entity_type && notification.entity_id) {
      if (notification.entity_type === 'project') {
        navigate(`/projects/${notification.entity_id}`);
      } else if (notification.entity_type === 'sales') {
        navigate(`/sales/${notification.entity_id}`);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_overdue':
        return '🔴';
      case 'task_deadline_soon':
        return '⚠️';
      case 'task_created':
        return '📝';
      case 'sales_created':
      case 'sales_updated':
        return '💼';
      case 'project_created':
      case 'project_updated':
        return '📊';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Értesítések</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Összes olvasott
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Összes törlése
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-96">
          {/* Pinned License Warning */}
          {showLicenseWarning && (
            <>
              <div className={`p-4 ${isLicenseExpiredOrReadOnly ? 'bg-destructive/10' : 'bg-yellow-500/10'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-6 w-6 ${isLicenseExpiredOrReadOnly ? 'text-destructive' : 'text-yellow-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {isLicenseExpiredOrReadOnly ? t('license.expired') : t('license.expiringTitle')}
                      </p>
                      <Badge variant={isLicenseExpiredOrReadOnly ? 'destructive' : 'outline'} className="shrink-0">
                        {isLicenseExpiredOrReadOnly ? t('license.critical') : t('license.warning')}
                      </Badge>
                    </div>
                    <p className={`text-sm mt-1 ${isLicenseExpiredOrReadOnly ? 'text-destructive' : 'text-yellow-700 dark:text-yellow-300'}`}>
                      {isLicenseExpiredOrReadOnly 
                        ? t('license.readOnlyMode')
                        : t('license.expiringSoon', { days: daysUntilExpiry })}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Betöltés...</div>
          ) : notifications.length === 0 && !showLicenseWarning ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nincs értesítés</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id}>
                <div
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.is_read && (
                          <Badge variant="default" className="shrink-0">Új</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: hu,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
