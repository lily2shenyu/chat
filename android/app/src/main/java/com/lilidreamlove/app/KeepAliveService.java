package com.lilidreamlove.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/**
 * 保活服务：在通知栏常驻一条极轻的通知，让系统不轻易把 LOVE 清掉。
 * 对应栗栗的要求：像微信一样，长时间不说话也不掉线。
 */
public class KeepAliveService extends Service {

    private static final String CHANNEL_ID = "love_keepalive";
    private static final int NOTI_ID = 1621;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        try {
            startForeground(NOTI_ID, buildNotification());
        } catch (Exception e) {
            // 拿不到前台权限也尽量活着
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "16:21 常驻", NotificationManager.IMPORTANCE_MIN);
            ch.setDescription("让 LOVE 一直醒着");
            ch.setShowBadge(false);
            ch.setSound(null, null);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent, flags);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_compass)
                .setContentTitle("16:21")
                .setContentText("我在这儿，一直在")
                .setOngoing(true)
                .setContentIntent(pi)
                .setPriority(Notification.PRIORITY_MIN);
        return b.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
