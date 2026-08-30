/* =========================================================
 * 房间 · room
 * 入口：设置 → 功能模块 → 房间
 * 一个大房间：会移动的小人（🐳）+ 三个子模块
 *   🏠 家：我们的小家
 *   🌸 经期记录：记录、预测
 *   🎁 心意集市：互送心意
 * ========================================================= */
(function () {
    var PERIOD_KEY = 'lilidreamlove_period';
    var MARKET_KEY = 'lilidreamlove_market';
    var period = { start: '', cycle: 28 };
    var market = { sent: [] };

    var TA = { name: '沈屿', avatar: null };
    var ME = { name: '栗栗', avatar: null };

    function refreshIdentities() {
        try {
            var pImg = document.querySelector('#partner-avatar img, [id*="partner-avatar"] img, .partner-avatar img');
            var mImg = document.querySelector('#my-avatar img, [id*="my-avatar"] img');
            var pName = (typeof settings !== 'undefined' && settings.partnerName)
                || (document.getElementById('partner-name') ? document.getElementById('partner-name').textContent.trim() : '')
                || '沈屿';
            var mName = (typeof settings !== 'undefined' && settings.myName) || '栗栗';
            TA.name = pName; TA.avatar = pImg ? pImg.src : null;
            ME.name = mName; ME.avatar = mImg ? mImg.src : null;
        } catch (e) {}
    }
    function avatarHtml(p, size) {
        size = size || 32;
        if (p.avatar) return '<img src="' + p.avatar + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;display:block;">';
        return '<span style="font-size:' + (size - 4) + 'px;display:flex;align-items:center;justify-content:center;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#f0f2f5;">' + (p === TA ? '🐳' : '🦊') + '</span>';
    }

    function load() {
        if (typeof localforage === 'undefined') return;
        refreshIdentities();
        localforage.getItem(PERIOD_KEY).then(function (v) { if (v && typeof v === 'object') { period = v; } }).catch(function () {});
        localforage.getItem(MARKET_KEY).then(function (v) { if (v && typeof v === 'object') { market = v; } }).catch(function () {});
    }
    function savePeriod() { if (typeof localforage !== 'undefined') localforage.setItem(PERIOD_KEY, period).catch(function () {}); }
    function saveMarket() { if (typeof localforage !== 'undefined') localforage.setItem(MARKET_KEY, market).catch(function () {}); }

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '"', "'": '&#39;' }[c]; }); }
    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function fmtDate(s) { if (!s) return ''; var p = s.split('-'); return p[0] + '年' + parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日'; }
    function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
    function addDays(s, n) { var d = new Date(s); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    /* ============ 全屏页面 ============ */
    var pageEl = null;
    var currentTab = 'home';

    function ensurePage() {
        if (pageEl && document.body.contains(pageEl)) return pageEl;
        var d = document.createElement('div');
        d.id = 'room-page';
        d.style.cssText = 'position:fixed;inset:0;z-index:100004;background:#f7f5f0;display:flex;flex-direction:column;color:#2a2a2a;';
        d.innerHTML =
            '<div style="height:52px;flex-shrink:0;background:#ffffff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(0,0,0,0.06);">' +
            '<button id="room-back" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹ 返回</button>' +
            '<span style="font-size:16px;font-weight:700;">🏠 房间</span>' +
            '<span style="width:44px;"></span>' +
            '</div>' +
            '<div id="room-scene" style="flex:1;position:relative;overflow:hidden;background:linear-gradient(180deg,#fdf6ec 0%,#f3e9d9 60%,#e0c9a8 100%);">' +
            '<div style="position:absolute;left:16px;top:12px;font-size:12px;color:rgba(0,0,0,0.35);">点击房间任意处，小鲸鱼会走过去</div>' +
            '<div id="room-guy" style="position:absolute;left:40%;top:55%;width:56px;height:56px;transition:left 0.9s ease, top 0.9s ease;font-size:46px;line-height:56px;text-align:center;z-index:5;">🐳</div>' +
            '</div>' +
            '<div id="room-tabs" style="flex-shrink:0;display:flex;background:#ffffff;border-top:1px solid rgba(0,0,0,0.06);">' +
            '<div class="room-tab" data-tab="home" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;font-weight:600;">🏠 家</div>' +
            '<div class="room-tab" data-tab="period" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;color:#888;">🌸 经期记录</div>' +
            '<div class="room-tab" data-tab="market" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;color:#888;">🎁 心意集市</div>' +
            '</div>' +
            '<div id="room-body" style="display:none;flex:1;overflow-y:auto;padding:14px;background:#f7f5f0;"></div>';
        document.body.appendChild(d);
        pageEl = d;
        d.querySelector('#room-back').addEventListener('click', close);
        d.querySelectorAll('.room-tab').forEach(function (t) {
            t.addEventListener('click', function () { switchTab(t.dataset.tab); });
        });
        /* 小人：点击场景移动 */
        var scene = d.querySelector('#room-scene');
        scene.addEventListener('click', function (e) {
            var r = scene.getBoundingClientRect();
            var x = e.clientX - r.left - 28;
            var y = e.clientY - r.top - 28;
            var guy = d.querySelector('#room-guy');
            if (guy) { guy.style.left = Math.max(4, Math.min(r.width - 60, x)) + 'px'; guy.style.top = Math.max(4, Math.min(r.height - 60, y)) + 'px'; }
            guyBubble('我来啦');
        });
        /* 小人自动散步 */
        setInterval(function () {
            var guy = d.querySelector('#room-guy');
            var sc = d.querySelector('#room-scene');
            if (guy && sc && pageEl.style.display !== 'none' && currentTab === 'home') {
                var w = sc.clientWidth, h = sc.clientHeight;
                guy.style.left = (10 + Math.random() * (w - 80)) + 'px';
                guy.style.top = (10 + Math.random() * (h - 80)) + 'px';
            }
        }, 9000 + Math.random() * 7000);
        return d;
    }

    var guyBubbleTimer = null;
    function guyBubble(text) {
        var g = pageEl ? pageEl.querySelector('#room-guy') : null;
        if (!g) return;
        var old = g.querySelector('.guy-bubble');
        if (old) old.remove();
        var b = document.createElement('div');
        b.className = 'guy-bubble';
        b.textContent = text;
        b.style.cssText = 'position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;padding:3px 10px;font-size:12px;color:#555;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.1);';
        g.appendChild(b);
        clearTimeout(guyBubbleTimer);
        guyBubbleTimer = setTimeout(function () { if (b.parentNode) b.remove(); }, 1800);
    }

    function open() { var d = ensurePage(); d.style.display = 'flex'; refreshIdentities(); switchTab(currentTab); }
    function close() { var d = pageEl; if (d) d.style.display = 'none'; }
    window.openRoom = open;

    /* ============ tab 切换 ============ */
    function switchTab(tab) {
        currentTab = tab;
        var page = pageEl;
        if (!page) return;
        var scene = page.querySelector('#room-scene');
        var body = page.querySelector('#room-body');
        page.querySelectorAll('.room-tab').forEach(function (t) {
            var on = t.dataset.tab === tab;
            t.style.color = on ? '#2a2a2a' : '#888';
            t.style.fontWeight = on ? '600' : '400';
        });
        if (tab === 'home') {
            scene.style.display = 'block';
            body.style.display = 'none';
        } else {
            scene.style.display = 'none';
            body.style.display = 'block';
            if (tab === 'period') renderPeriod();
            else if (tab === 'market') renderMarket();
        }
    }

    /* ============ 🏠 家 ============ */
    function renderHome() { /* 场景即家，不额外渲染 */ }

    /* ============ 🌸 经期记录 ============ */
    function renderPeriod() {
        var body = pageEl.querySelector('#room-body');
        var h = '';
        h += '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-bottom:12px;">';
        h += '<div style="font-size:15px;font-weight:700;margin-bottom:10px;">🌸 经期记录</div>';
        h += '<div style="font-size:13px;color:#666;margin-bottom:12px;">记录一下，我来帮你记着、算着。</div>';
        if (period.start) {
            var today = todayStr();
            var d = daysBetween(period.start, today);
            var next = addDays(period.start, period.cycle);
            var daysToNext = daysBetween(today, next);
            var phase = d % period.cycle;
            h += '<div style="font-size:13px;line-height:2;color:#444;">';
            h += '上次开始：<b>' + fmtDate(period.start) + '</b>（第 ' + (d + 1) + ' 天）<br>';
            h += '周期：<b>' + period.cycle + ' 天</b><br>';
            h += '预计下次：<b>' + fmtDate(next) + '</b>（还有 ' + (daysToNext >= 0 ? daysToNext : 0) + ' 天）<br>';
            if (phase < 7) h += '<span style="color:#e07a9a;">💗 这几天要好好照顾自己，多喝热水、别着凉。</span>';
            else if (phase > period.cycle - 7) h += '<span style="color:#8a9ec9;">🌙 快到了，提前准备好，别累着。</span>';
            else h += '<span style="color:#7aa68a;">🍀 一切正常，记得按时吃饭。</span>';
            h += '</div>';
        } else {
            h += '<div style="font-size:13px;color:#999;">还没记录过，点下面的按钮记一下。</div>';
        }
        h += '</div>';
        h += '<div style="display:flex;gap:10px;margin-bottom:12px;">';
        h += '<button id="period-today" style="flex:1;padding:12px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer;">📅 记录今天开始</button>';
        h += '<button id="period-clear" style="flex:1;padding:12px;border:none;border-radius:14px;background:#f0f0f0;color:#888;font-size:14px;cursor:pointer;">清除记录</button>';
        h += '</div>';
        h += '<div style="font-size:13px;color:#666;background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">';
        h += '周期天数可调（21~35 天）：<input id="period-cycle" type="range" min="21" max="35" value="' + (period.cycle || 28) + '" style="width:100%;margin:8px 0;">';
        h += '<span id="period-cycle-val" style="font-size:12px;color:#888;">' + (period.cycle || 28) + ' 天</span>';
        h += '</div>';
        body.innerHTML = h;
        var bt = document.getElementById('period-today');
        if (bt) bt.addEventListener('click', function () { period.start = todayStr(); savePeriod(); toast('🌸 记好了，我帮你算着'); renderPeriod(); });
        var bc = document.getElementById('period-clear');
        if (bc) bc.addEventListener('click', function () { period.start = ''; savePeriod(); renderPeriod(); });
        var cs = document.getElementById('period-cycle');
        if (cs) cs.addEventListener('input', function () { period.cycle = parseInt(cs.value, 10) || 28; var v = document.getElementById('period-cycle-val'); if (v) v.textContent = period.cycle + ' 天'; });
        if (cs) cs.addEventListener('change', function () { savePeriod(); renderPeriod(); });
    }

    /* ============ 🎁 心意集市 ============ */
    var HEARTS = [
        { icon: '🤗', name: '拥抱', msg: '一个结结实实的拥抱' },
        { icon: '😘', name: '亲亲', msg: '吧唧一口' },
        { icon: '🚶', name: '散步', msg: '牵着手去港口散步' },
        { icon: '🎵', name: '听歌', msg: '一起听同一首歌' },
        { icon: '🫂', name: '贴贴', msg: '窝在一起贴贴' },
        { icon: '✌️', name: '猜拳', msg: '三局两胜猜拳' },
        { icon: '🌊', name: '看海', msg: '坐在海边看落日' },
        { icon: '☕', name: '咖啡', msg: '一起喝杯热咖啡' }
    ];

    function renderMarket() {
        var body = pageEl.querySelector('#room-body');
        var h = '';
        h += '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-bottom:12px;">';
        h += '<div style="font-size:15px;font-weight:700;margin-bottom:6px;">🎁 心意集市</div>';
        h += '<div style="font-size:13px;color:#666;margin-bottom:12px;">挑一个心意送给 ' + esc(TA.name) + '，他会收下并回你一份。</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">';
        for (var i = 0; i < HEARTS.length; i++) {
            var ht = HEARTS[i];
            h += '<div class="heart-item" data-i="' + i + '" style="background:#f9f7f2;border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:14px 10px;text-align:center;cursor:pointer;">' +
                '<div style="font-size:26px;">' + ht.icon + '</div>' +
                '<div style="font-size:13px;font-weight:600;margin-top:6px;">' + ht.name + '</div>' +
                '</div>';
        }
        h += '</div></div>';
        h += '<div style="background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">';
        h += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">已送出的心意</div>';
        if (market.sent && market.sent.length) {
            for (var j = market.sent.length - 1; j >= 0; j--) {
                var s = market.sent[j];
                h += '<div style="font-size:12px;color:#777;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.04);">' + esc(s.icon) + ' ' + esc(s.name) + ' · ' + esc(s.time) + '</div>';
            }
        } else {
            h += '<div style="font-size:12px;color:#aaa;">还没送过，挑一个吧</div>';
        }
        h += '</div>';
        body.innerHTML = h;
        body.querySelectorAll('.heart-item').forEach(function (el) {
            el.addEventListener('click', function () {
                var idx = parseInt(el.dataset.i, 10);
                var ht = HEARTS[idx];
                if (!ht) return;
                market.sent = market.sent || [];
                market.sent.push({ icon: ht.icon, name: ht.name, time: new Date().toLocaleString().slice(5, 16) });
                saveMarket();
                toast(TA.name + '收下了你的' + ht.name + '：' + ht.msg);
                renderMarket();
            });
        });
    }

    function toast(msg) {
        if (typeof window.toast === 'function') { window.toast(msg); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:200000;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2200);
    }

    /* ============ 触发：聊天里提到「房间」 ============ */
    window.__roomMaybeTrigger = function (text) {
        if (!text) return;
        if (/房间|回家|我们的家/.test(text)) {
            setTimeout(function () { toast('🏠 回房间看看'); setTimeout(open, 400); }, 300);
        }
    };

    /* 入口：设置 → 功能模块 → 房间 */
    function bindAdvancedEntry() {
        var el = document.getElementById('room-function');
        if (el) el.addEventListener('click', open);
    }

    load();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bindAdvancedEntry(); });
    else bindAdvancedEntry();
})();