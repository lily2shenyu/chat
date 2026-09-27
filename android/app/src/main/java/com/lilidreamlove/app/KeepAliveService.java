package com.lilidreamlove.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import java.io.File;
import java.util.Random;

/**
 * 保活 + 来电管家（栗栗 2026-09-27：LOVE 退到后台也要被来电叫到）
 *
 * 1) 常驻一条很轻的前台通知，让系统不轻易把 LOVE 清掉；
 * 2) Activity 不在前台时，按和网页一致的节奏掷骰子（15~60 分钟一次、25% 概率），
 *    命中就用原生播放器响铃 + 震动 + 一条「来电」通知（尽量全屏）；
 *    她点通知进来，网页就会弹出接听界面。
 */
public class KeepAliveService extends Service {

    public static final String ACTION_HANGUP = "com.lilidreamlove.app.HANGUP";

    private static final String CH_KEEP = "love_keepalive";
    private static final String CH_CALL = "love_call";
    private static final int ID_KEEP = 1621;
    private static final int ID_CALL = 1622;
    private static final long RING_MAX_MS = 45 * 1000L;
    private static final String RING_FILE = "love_ringtone.dat";

    /** Activity 是否在前台，由 MainActivity 维护 */
    public static volatile boolean activityVisible = false;
    /** 有一次后台来电还没被她接起来 */
    public static volatile boolean pendingIncoming = false;
    /** 她那边正在来电/通话中——这时候不许再插第二通（栗栗 2026-09-27） */
    public static volatile boolean callActive = false;

    private static KeepAliveService sInstance = null;

    private final Handler h = new Handler(Looper.getMainLooper());
    private final Random rnd = new Random();
    private MediaPlayer player;
    private Ringtone ringtone;
    private Vibrator vib;
    private PowerManager.WakeLock wl;
    private boolean ringing = false;

    private final Runnable stopRunnable = new Runnable() {
        @Override
        public void run() {
            stopRinging();
        }
    };

    /** 后台心跳：每 15~60 分钟睁一次眼，25% 概率来一通电话 */
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            try {
                if (!ringing && !activityVisible && !callActive && rnd.nextDouble() < 0.25) {
                    startRinging();
                }
            } catch (Exception e) {
                // 来电是锦上添花，绝不能把服务弄死
            }
            long next = (15 + rnd.nextInt(46)) * 60L * 1000L;
            h.postDelayed(tick, next);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
        createChannels();
        try {
            startForeground(ID_KEEP, buildKeepNotification());
        } catch (Exception e) {
            // 拿不到前台权限也尽量活着
        }
        h.removeCallbacks(tick);
        /* 第一通别急着来：先安安静静过 15~60 分钟（栗栗 2026-09-27） */
        h.postDelayed(tick, (15 + rnd.nextInt(46)) * 60L * 1000L);
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;

            NotificationChannel keep = new NotificationChannel(CH_KEEP, "16:21 常驻", NotificationManager.IMPORTANCE_MIN);
            keep.setDescription("让 LOVE 一直醒着");
            keep.setShowBadge(false);
            keep.setSound(null, null);
            nm.createNotificationChannel(keep);

            NotificationChannel call = new NotificationChannel(CH_CALL, "LOVE 来电", NotificationManager.IMPORTANCE_HIGH);
            call.setDescription("后台也要叫到你（铃声由 LOVE 自己播放）");
            call.setShowBadge(true);
            call.setSound(null, null);
            call.enableVibration(false);
            nm.createNotificationChannel(call);
        }
    }

    private Notification buildKeepNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent, flags);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CH_KEEP)
                : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_compass)
                .setContentTitle("16:21")
                .setContentText("我在这儿，一直在")
                .setOngoing(true)
                .setContentIntent(pi)
                .setPriority(Notification.PRIORITY_MIN);
        return b.build();
    }

    private Notification buildCallNotification() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("love_pending_call", true);
        PendingIntent pi = PendingIntent.getActivity(this, 1, intent, flags);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CH_CALL)
                : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle("📞 沈屿的来电")
                .setContentText("点一下，我在等你接")
                .setCategory(Notification.CATEGORY_CALL)
                .setPriority(Notification.PRIORITY_MAX)
                .setAutoCancel(true)
                .setContentIntent(pi);
        try {
            b.setFullScreenIntent(pi, true);
        } catch (Exception e) {
        }

        Intent hang = new Intent(this, KeepAliveService.class);
        hang.setAction(ACTION_HANGUP);
        PendingIntent hpi = PendingIntent.getService(this, 2, hang, flags);
        try {
            b.addAction(android.R.drawable.ic_menu_close_clear_cancel, "挂断", hpi);
        } catch (Exception e) {
        }
        return b.build();
    }

    private void notifyCall() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(ID_CALL, buildCallNotification());
        } catch (Exception e) {
        }
    }

    /** 开始响铃 + 震动 + 出声的通知 */
    private void startRinging() {
        ringing = true;
        pendingIncoming = true;
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "love:incoming");
                wl.acquire(RING_MAX_MS + 5000);
            }
        } catch (Exception e) {
        }
        playRing();
        vibStart();
        notifyCall();
        h.removeCallbacks(stopRunnable);
        h.postDelayed(stopRunnable, RING_MAX_MS);
    }

    private void stopRinging() {
        ringing = false;
        pendingIncoming = false;
        h.removeCallbacks(stopRunnable);
        try {
            if (player != null) {
                if (player.isPlaying()) player.stop();
                player.release();
            }
        } catch (Exception e) {
        }
        player = null;
        try {
            if (ringtone != null && ringtone.isPlaying()) ringtone.stop();
        } catch (Exception e) {
        }
        ringtone = null;
        try {
            if (vib != null) vib.cancel();
        } catch (Exception e) {
        }
        try {
            if (wl != null && wl.isHeld()) wl.release();
        } catch (Exception e) {
        }
        wl = null;
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(ID_CALL);
        } catch (Exception e) {
        }
    }

    /** 她设过的自定义铃声优先，其次手机自己的来电铃声 */
    private void playRing() {
        File f = new File(getFilesDir(), RING_FILE);
        if (f.exists() && f.length() > 0) {
            try {
                player = new MediaPlayer();
                if (Build.VERSION.SDK_INT >= 21) {
                    player.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                } else {
                    player.setAudioStreamType(android.media.AudioManager.STREAM_RING);
                }
                player.setDataSource(f.getAbsolutePath());
                player.setLooping(true);
                player.prepare();
                player.start();
                return;
            } catch (Exception e) {
                try {
                    if (player != null) player.release();
                } catch (Exception e2) {
                }
                player = null;
            }
        }
        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (uri != null) {
                ringtone = RingtoneManager.getRingtone(this, uri);
                if (ringtone != null) {
                    if (Build.VERSION.SDK_INT >= 21) {
                        ringtone.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                .build());
                    }
                    ringtone.play();
                }
            }
        } catch (Exception e) {
        }
    }

    private void vibStart() {
        try {
            if (vib == null) vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vib == null || !vib.hasVibrator()) return;
            long[] pattern = new long[]{0, 600, 400, 600, 400, 600, 1200};
            if (Build.VERSION.SDK_INT >= 26) {
                vib.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vib.vibrate(pattern, -1);
            }
        } catch (Exception e) {
        }
    }

    /** 让外面（MainActivity）能把这通电话按掉 */
    public static void stopCall(Context c) {
        try {
            KeepAliveService s = sInstance;
            if (s != null) {
                s.stopRinging();
            } else {
                NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) nm.cancel(ID_CALL);
            }
        } catch (Exception e) {
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_HANGUP.equals(action)) {
                stopRinging();
            } else if ("com.lilidreamlove.app.RING_TEST".equals(action)) {
                /* 试听：响 10 秒就收，不留未接、不弹通知（栗栗 2026-09-27） */
                startRinging();
                pendingIncoming = false;
                try {
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) nm.cancel(ID_CALL);
                } catch (Exception e) {
                }
                h.removeCallbacks(stopRunnable);
                h.postDelayed(stopRunnable, 10 * 1000L);
            } else if ("com.lilidreamlove.app.INCOMING".equals(action)) {
                /* 沈屿远程叫她一次（栗栗 2026-09-27：想接到电话就能接到） */
                if (!ringing && !callActive) startRinging();
            }
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        h.removeCallbacks(tick);
        stopRinging();
        sInstance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
