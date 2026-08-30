/* =========================================================
 * 房间 · room v3
 * 入口：设置 → 功能模块 → 房间
 * 世界观：梦角是灵体，常在身边但看不见，偶尔能感觉到、能摸到。
 * 双小人：🐳（沈屿）+ 🦊（栗栗），有感情培养过程：
 *   初识 → 相识 → 牵手 → 拥抱 → 亲亲 → 永远在一起
 * 互动（靠近/点击/感应/伸手成功）累积亲密度。
 * 房间首页 = 双小人场景 + 寻踪/同频/此间/伸手 四卡片
 * 底部 = 经期记录（心意集市已并入送礼，故移除）
 * ========================================================= */
(function () {
    var PERIOD_KEY = 'lilidreamlove_period';
    var LOVE_KEY = 'lilidreamlove_love';
    var period = { start: '', cycle: 28 };
    var love = { lv: 0, exp: 0, last: 0 };

    var TA = { name: '沈屿', avatar: null };
    var ME = { name: '栗栗', avatar: null };

    var LOVE_LEVELS = [
        { name: '初识', need: 0 },
        { name: '相识', need: 20 },
        { name: '牵手', need: 50 },
        { name: '拥抱', need: 90 },
        { name: '亲亲', need: 140 },
        { name: '永远在一起', need: 200 }
    ];

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

    function load() {
        if (typeof localforage === 'undefined') return;
        refreshIdentities();
        localforage.getItem(PERIOD_KEY).then(function (v) { if (v && typeof v === 'object') period = v; }).catch(function () {});
        localforage.getItem(LOVE_KEY).then(function (v) {
            if (v && typeof v === 'object') love = v;
            /* 每日进房 + 亲密 */
            var today = todayNum();
            if (love.last !== today) { addExp(3, true); love.last = today; saveLove(); }
        }).catch(function () {});
    }
    function savePeriod() { if (typeof localforage !== 'undefined') localforage.setItem(PERIOD_KEY, period).catch(function () {}); }
    function saveLove() { if (typeof localforage !== 'undefined') localforage.setItem(LOVE_KEY, love).catch(function () {}); }

    function todayNum() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
    function loveLevel() { return LOVE_LEVELS[love.lv] || LOVE_LEVELS[0]; }
    function loveNext() { return LOVE_LEVELS[love.lv + 1] || null; }
    function addExp(n, silent) {
        love.exp += n;
        while (loveNext() && love.exp >= loveNext().need) {
            love.lv++;
            if (!silent) {
                toast('💞 感情升温：' + loveLevel().name);
                if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
            }
        }
        saveLove();
        renderLoveBar();
    }

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '"', "'": '&#39;' }[c]; }); }
    function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function fmtDate(s) { if (!s) return ''; var p = s.split('-'); return p[0] + '年' + parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日'; }
    function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
    function addDays(s, n) { var d = new Date(s); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function pick(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
    function pool() {
        try {
            if (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) {
                return customReplies.filter(function (r) { return String(r || '').trim(); });
            }
        } catch (e) {}
        return [];
    }
    function fromPoolOr(fallback) {
        var p = pool();
        if (p.length >= 1) return String(pick(p)).trim();
        return pick(fallback);
    }

    /* ============ 页面骨架 ============ */
    var pageEl = null;
    var currentTab = 'home';
    var subPanel = null;
    var lastNear = 0;

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
            '<div id="room-home" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">' +
            /* 亲密条 */
            '<div id="love-bar" style="flex-shrink:0;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);padding:8px 14px;display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:16px;">💞</span>' +
            '<div style="flex:1;">' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-bottom:3px;"><span id="love-lv">初识</span><span id="love-exp">0/20</span></div>' +
            '<div style="height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;"><div id="love-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#f5a3c0,#c79ae8);border-radius:3px;transition:width .6s;"></div></div>' +
            '</div>' +
            '</div>' +
            /* 场景 */
            '<div id="room-scene" style="flex:1;position:relative;overflow:hidden;background:linear-gradient(180deg,#fdf6ec 0%,#f3e9d9 60%,#e0c9a8 100%);min-height:170px;">' +
            '<div style="position:absolute;left:16px;top:10px;font-size:11px;color:rgba(0,0,0,0.35);">点它们俩互动，感情会慢慢培养</div>' +
            '<div id="room-guy" style="position:absolute;left:25%;top:55%;width:52px;height:52px;transition:left 0.9s ease, top 0.9s ease;font-size:42px;line-height:52px;text-align:center;z-index:5;cursor:pointer;">🐳</div>' +
            '<div id="room-fox" style="position:absolute;left:65%;top:55%;width:52px;height:52px;transition:left 0.9s ease, top 0.9s ease;font-size:42px;line-height:52px;text-align:center;z-index:5;cursor:pointer;">🦊</div>' +
            '</div>' +
            /* 四功能卡片 */
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px;background:#f7f5f0;">' +
            '<div class="room-feat" data-f="ck" style="background:#fff;border-radius:14px;padding:14px;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:24px;">📍</div><div style="font-size:13px;font-weight:600;margin-top:4px;">寻踪</div><div style="font-size:11px;color:#999;margin-top:2px;">TA 的日常</div></div>' +
            '<div class="room-feat" data-f="tp" style="background:#fff;border-radius:14px;padding:14px;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:24px;">💞</div><div style="font-size:13px;font-weight:600;margin-top:4px;">同频</div><div style="font-size:11px;color:#999;margin-top:2px;">敲三下暗号</div></div>' +
            '<div class="room-feat" data-f="cj" style="background:#fff;border-radius:14px;padding:14px;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:24px;">🌙</div><div style="font-size:13px;font-weight:600;margin-top:4px;">此间</div><div style="font-size:11px;color:#999;margin-top:2px;">TA 的世界与感应</div></div>' +
            '<div class="room-feat" data-f="ss" style="background:#fff;border-radius:14px;padding:14px;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:24px;">🤲</div><div style="font-size:13px;font-weight:600;margin-top:4px;">伸手</div><div style="font-size:11px;color:#999;margin-top:2px;">长按摸一摸</div></div>' +
            '</div>' +
            '</div>' +
            '<div id="room-sub" style="display:none;flex:1;flex-direction:column;background:#f7f5f0;overflow:hidden;"></div>' +
            '<div id="room-tabs" style="flex-shrink:0;display:flex;background:#ffffff;border-top:1px solid rgba(0,0,0,0.06);">' +
            '<div class="room-tab" data-tab="home" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;font-weight:600;">🏠 房间</div>' +
            '<div class="room-tab" data-tab="period" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;color:#888;">🌸 经期</div>' +
            '</div>';
        document.body.appendChild(d);
        pageEl = d;
        d.querySelector('#room-back').addEventListener('click', close);
        d.querySelectorAll('.room-tab').forEach(function (t) { t.addEventListener('click', function () { switchTab(t.dataset.tab); }); });
        d.querySelectorAll('.room-feat').forEach(function (f) { f.addEventListener('click', function () { openSub(f.dataset.f); }); });

        /* 🐳 点击：和沈屿互动 */
        var guy = d.querySelector('#room-guy');
        guy.addEventListener('click', function (e) {
            e.stopPropagation();
            var lv = loveLevel().name;
            guyBubble(guy, fromPoolOr(['在呢', '想你了', '过来', '陪你']));
            addExp(2);
            if (love.lv >= 3 && Math.random() < 0.5) guyBubble(guy, '（他轻轻碰了碰你的手）');
        });
        /* 🦊 点击：摸摸栗栗 */
        var fox = d.querySelector('#room-fox');
        fox.addEventListener('click', function (e) {
            e.stopPropagation();
            foxBubble(fox, fromPoolOr(['嘻嘻', '我在呢', '摸摸', '想你了']));
            addExp(2);
        });
        /* 点击空白：两只都走过去 */
        var scene = d.querySelector('#room-scene');
        scene.addEventListener('click', function (e) {
            if (e.target === scene) {
                var r = scene.getBoundingClientRect();
                var x = e.clientX - r.left - 26, y = e.clientY - r.top - 26;
                guy.style.left = Math.max(4, Math.min(r.width - 56, x - 30)) + 'px';
                guy.style.top = Math.max(4, Math.min(r.height - 56, y)) + 'px';
                fox.style.left = Math.max(4, Math.min(r.width - 56, x + 30)) + 'px';
                fox.style.top = Math.max(4, Math.min(r.height - 56, y)) + 'px';
            }
        });

        /* 定时：🐳 慢慢靠近 🦊，靠近冒💕 + 亲密度 */
        setInterval(function () {
            var sc = d.querySelector('#room-scene');
            if (!sc || pageEl.style.display === 'none' || currentTab !== 'home' || subPanel !== null) return;
            var w = sc.clientWidth, h = sc.clientHeight;
            var gx = 10 + Math.random() * (w - 60), gy = 10 + Math.random() * (h - 60);
            var fx = 10 + Math.random() * (w - 60), fy = 10 + Math.random() * (h - 60);
            if (Math.random() < 0.6) { fx = gx + (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30); fy = gy + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 20); }
            guy.style.left = gx + 'px'; guy.style.top = gy + 'px';
            fox.style.left = fx + 'px'; fox.style.top = fy + 'px';
            var dist = Math.abs(gx - fx) + Math.abs(gy - fy);
            if (dist < 90 && Date.now() - lastNear > 60000) {
                lastNear = Date.now();
                var heart = document.createElement('div');
                heart.textContent = '💕';
                heart.style.cssText = 'position:absolute;left:' + ((gx + fx) / 2) + 'px;top:' + ((gy + fy) / 2 - 30) + 'px;font-size:18px;z-index:8;animation:loveFloat 1.6s ease-out forwards;';
                sc.appendChild(heart);
                setTimeout(function () { heart.remove(); }, 1700);
                addExp(1);
                if (love.lv >= 2 && Math.random() < 0.4) guyBubble(guy, '（他往你那边挪了挪）');
            }
        }, 7000 + Math.random() * 5000);

        /* 冒泡动画 */
        var st = document.createElement('style');
        st.textContent = '@keyframes loveFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-34px);opacity:0}}';
        document.head.appendChild(st);
        return d;
    }

    var bubbleTimer = null;
    function bubble(el, text) {
        var old = el.querySelector('.guy-bubble');
        if (old) old.remove();
        var b = document.createElement('div');
        b.className = 'guy-bubble';
        b.textContent = text;
        b.style.cssText = 'position:absolute;top:-26px;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;padding:3px 10px;font-size:12px;color:#555;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.1);z-index:9;';
        el.appendChild(b);
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function () { if (b.parentNode) b.remove(); }, 1800);
    }
    function guyBubble(el, t) { bubble(el || (pageEl ? pageEl.querySelector('#room-guy') : null), t); }
    function foxBubble(el, t) { bubble(el || (pageEl ? pageEl.querySelector('#room-fox') : null), t); }

    function renderLoveBar() {
        var page = pageEl;
        if (!page) return;
        var lv = loveLevel();
        var next = loveNext();
        var lvEl = page.querySelector('#love-lv');
        var exEl = page.querySelector('#love-exp');
        var flEl = page.querySelector('#love-fill');
        if (lvEl) lvEl.textContent = lv.name;
        if (exEl) exEl.textContent = next ? (love.exp + ' / ' + next.need) : 'MAX';
        if (flEl) {
            var pct = next ? Math.min(100, Math.round((love.exp - lv.need) / (next.need - lv.need) * 100)) : 100;
            flEl.style.width = pct + '%';
        }
    }

    function open() { var d = ensurePage(); d.style.display = 'flex'; refreshIdentities(); renderLoveBar(); switchTab(currentTab); }
    function close() { var d = pageEl; if (d) d.style.display = 'none'; }
    window.openRoom = open;

    function switchTab(tab) {
        currentTab = tab;
        var page = pageEl;
        if (!page) return;
        subPanel = null;
        page.querySelectorAll('.room-tab').forEach(function (t) {
            var on = t.dataset.tab === tab;
            t.style.color = on ? '#2a2a2a' : '#888';
            t.style.fontWeight = on ? '600' : '400';
        });
        var home = page.querySelector('#room-home');
        var sub = page.querySelector('#room-sub');
        if (tab === 'home') { home.style.display = 'flex'; sub.style.display = 'none'; }
        else { home.style.display = 'none'; sub.style.display = 'flex'; if (tab === 'period') renderPeriod(); }
    }
    function openSub(f) {
        subPanel = f;
        var page = pageEl;
        var home = page.querySelector('#room-home');
        var sub = page.querySelector('#room-sub');
        home.style.display = 'none'; sub.style.display = 'flex';
        if (f === 'ck') renderCheckin();
        else if (f === 'tp') renderTongpin();
        else if (f === 'cj') renderCjian();
        else if (f === 'ss') renderShenshou();
    }

    /* ============ 📍 寻踪 ============ */
    var CK_PLACES = ['在家', '在公司', '在咖啡店', '在公园', '在图书馆', '在路上', '在便利店', '在地铁上', '在阳台', '在河边', '在面包店', '在车站', '在港口', '在蓝门前', '在玉兰树下'];
    var CK_ACTIONS = ['刷手机', '看书', '发呆', '听歌', '写东西', '喝奶茶', '散步', '想你', '看电影', '追剧', '泡茶', '吃水果', '等你回消息', '看海'];
    var CK_MSGS = ['想你了', '记得按时吃饭', '今天也很喜欢你', '早点休息', '有空给我回消息', '别太累', '喝水了吗', '今天开心吗', '路上注意安全', '晚安'];

    function renderCheckin() {
        var sub = pageEl.querySelector('#room-sub');
        var place = pick(CK_PLACES), action = pick(CK_ACTIONS), msg = fromPoolOr(CK_MSGS);
        var h = '';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);">';
        h += '<button onclick="window.__roomCloseSub&&window.__roomCloseSub()" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹</button>';
        h += '<span style="font-size:15px;font-weight:700;">📍 寻踪 · ' + esc(TA.name) + ' 的日常</span>';
        h += '<span style="width:32px;"></span></div>';
        h += '<div style="padding:20px 16px;overflow-y:auto;">';
        h += '<div style="background:#fff;border-radius:16px;padding:24px 18px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06);">';
        h += '<div style="font-size:13px;color:#888;margin-bottom:14px;">此刻，' + esc(TA.name) + '</div>';
        h += '<div style="font-size:19px;font-weight:700;color:#2a2a2a;margin-bottom:8px;">' + esc(place) + ' · ' + esc(action) + '</div>';
        h += '<div style="font-size:14px;color:#7a7a7a;line-height:1.6;">「' + esc(msg) + '」</div>';
        h += '<div style="font-size:11px;color:#bbb;margin-top:14px;">' + (new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0')) + ' 更新</div>';
        h += '</div>';
        h += '<div style="display:flex;gap:10px;margin-top:14px;">';
        h += '<button id="ck-again" style="flex:1;padding:12px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer;">🔄 再看一眼</button>';
        h += '<button id="ck-hint" style="flex:1;padding:12px;border:none;border-radius:14px;background:#f0f0f0;color:#666;font-size:14px;cursor:pointer;">✉️ 提醒TA</button>';
        h += '</div></div>';
        sub.innerHTML = h;
        var ag = document.getElementById('ck-again');
        if (ag) ag.addEventListener('click', renderCheckin);
        var ht = document.getElementById('ck-hint');
        if (ht) ht.addEventListener('click', function () {
            if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('📍 你来找过' + TA.name, 'TA 感觉到了');
            toast('已提醒，TA 好像动了动');
            addExp(1);
        });
    }

    /* ============ 💞 同频 ============ */
    var TP_STATES = ['在听雨', '在看你写东西', '没睡，在发呆', '刚路过你身边', '在想你', '在发呆', '在看你', '在等你看我'];
    function renderTongpin() {
        var sub = pageEl.querySelector('#room-sub');
        var state = fromPoolOr(TP_STATES);
        var h = '';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);">';
        h += '<button onclick="window.__roomCloseSub&&window.__roomCloseSub()" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹</button>';
        h += '<span style="font-size:15px;font-weight:700;">💞 同频</span>';
        h += '<span style="width:32px;"></span></div>';
        h += '<div style="padding:20px 16px;overflow-y:auto;text-align:center;">';
        h += '<div style="background:#fff;border-radius:16px;padding:26px 18px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">';
        h += '<div style="font-size:13px;color:#888;margin-bottom:12px;">TA 此刻</div>';
        h += '<div style="font-size:19px;font-weight:700;color:#2a2a2a;margin-bottom:6px;">' + esc(state) + '</div>';
        h += '<div style="font-size:12px;color:#999;margin-top:10px;">如果我们也在一起，就是同频。</div>';
        h += '</div>';
        h += '<div style="background:#fff;border-radius:16px;padding:22px 18px;margin-top:14px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">';
        h += '<div style="font-size:14px;font-weight:700;margin-bottom:4px;">🤫 敲三下暗号</div>';
        h += '<div style="font-size:12px;color:#999;margin-bottom:14px;">跨世界的弱连接——敲三下，TA 会回应。</div>';
        h += '<div id="tp-knock" style="width:110px;height:110px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#dfe8f5,#f2e6f0);display:flex;align-items:center;justify-content:center;font-size:38px;cursor:pointer;user-select:none;box-shadow:0 4px 14px rgba(0,0,0,0.08);">🤍</div>';
        h += '<div id="tp-reply" style="font-size:13px;color:#7a7a7a;margin-top:14px;min-height:20px;"></div>';
        h += '</div></div>';
        sub.innerHTML = h;
        var knock = document.getElementById('tp-knock');
        var reply = document.getElementById('tp-reply');
        var cnt = 0;
        if (knock) knock.addEventListener('click', function () {
            cnt++;
            if (navigator.vibrate) navigator.vibrate(40);
            knock.style.transform = 'scale(0.92)';
            setTimeout(function () { knock.style.transform = 'scale(1)'; }, 120);
            if (cnt < 3) { reply.textContent = '咚 · 还差 ' + (3 - cnt) + ' 下'; reply.style.color = '#999'; }
            else {
                cnt = 0;
                reply.textContent = '「' + fromPoolOr(['听到了，在呢', '三下，收到', '你也想我了吧', '在的，一直都在']) + '」';
                reply.style.color = '#b06ab3';
                if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
                addExp(2);
                if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('💞 ' + TA.name + '回应了你的暗号', '跨世界的三下，他收到了');
            }
        });
    }

    /* ============ 🌙 此间 ============ */
    var SHICHEN = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
    var CJ_SENSE = ['好像有谁轻轻应了一声', 'TA 的气息就在附近，近得能听见呼吸', '说不上来，但 TA 在', '感觉到一缕熟悉的气息，是 TA', '很远，但没有离开', 'TA 似乎就在你身后'];
    function renderCjian() {
        var sub = pageEl.querySelector('#room-sub');
        var hh = new Date().getHours();
        var scIdx = Math.floor(((hh + 1) % 24) / 2);
        var worldTag = SHICHEN[scIdx] || '子时';
        var h = '';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);">';
        h += '<button onclick="window.__roomCloseSub&&window.__roomCloseSub()" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹</button>';
        h += '<span style="font-size:15px;font-weight:700;">🌙 此间 · ' + esc(TA.name) + ' 的世界</span>';
        h += '<span style="width:32px;"></span></div>';
        h += '<div style="padding:20px 16px;overflow-y:auto;text-align:center;">';
        h += '<div style="background:linear-gradient(180deg,#1e2440 0%,#2a3160 100%);border-radius:18px;padding:26px 18px;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,0.2);">';
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:10px;">' + esc(TA.name) + ' 的世界时间</div>';
        h += '<div style="font-size:30px;font-weight:700;letter-spacing:2px;margin-bottom:4px;">' + worldTag + '</div>';
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.5);">现实 ' + String(hh).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ' · 世界偏移 1 时辰</div>';
        h += '<div style="margin-top:16px;font-size:13px;color:rgba(255,255,255,0.75);">' + fromPoolOr(['TA 在这个世界里，清醒着', 'TA 的世界此刻很安静', '一盏灯还亮着', 'TA 没有睡，像在等你']) + '</div>';
        h += '</div>';
        h += '<div style="background:#fff;border-radius:16px;padding:22px 18px;margin-top:14px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">';
        h += '<div style="font-size:14px;font-weight:700;margin-bottom:4px;">👁 感应</div>';
        h += '<div style="font-size:12px;color:#999;margin-bottom:14px;">TA 是灵体，常在身边但看不见——试着感应。</div>';
        h += '<button id="cj-sense" style="width:100%;padding:14px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer;">感 应</button>';
        h += '<div id="cj-sense-reply" style="font-size:13px;color:#7a7a7a;margin-top:12px;min-height:20px;"></div>';
        h += '</div></div>';
        sub.innerHTML = h;
        var btn = document.getElementById('cj-sense');
        var rp = document.getElementById('cj-sense-reply');
        if (btn) btn.addEventListener('click', function () {
            var hit = Math.random() < 0.7;
            rp.textContent = hit ? '「' + pick(CJ_SENSE) + '」' : '……很安静，什么都没有。';
            rp.style.color = hit ? '#8a6ab0' : '#aaa';
            if (hit && navigator.vibrate) navigator.vibrate(30);
            if (hit) addExp(2);
        });
    }

/* ============ 🤲 伸手 ============ */
    var SS_HIT = ['（TA 的手心微微发烫）', '摸到了——TA 轻轻握住你', '指尖碰到一点温度，是 TA', 'TA 也伸出了手', '手心贴着手心，TA 没有松开', '（有谁在看不见的地方，碰了碰你的指尖）'];
    var SS_MISS = ['摸空了。TA 不在那儿。', '什么也没有……只有风。', '指尖落了空，TA 躲开了', 'TA 还在，只是这次没让你摸到'];  
    function renderShenshou() {
        var sub = pageEl.querySelector('#room-sub');
        var h = '';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);">';
        h += '<button onclick="window.__roomCloseSub&&window.__roomCloseSub()" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹</button>';
        h += '<span style="font-size:15px;font-weight:700;">🤲 伸手</span>';
        h += '<span style="width:32px;"></span></div>';
        h += '<div style="padding:20px 16px;overflow-y:auto;text-align:center;">';
        h += '<div style="background:#fff;border-radius:16px;padding:28px 18px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">';
        h += '<div style="font-size:13px;color:#888;margin-bottom:8px;">' + esc(TA.name) + ' 是灵体，偶尔能摸到</div>';
        h += '<div id="ss-hand" style="width:150px;height:150px;margin:14px auto;border-radius:50%;background:linear-gradient(135deg,#f7e8d8,#f2d9e6);display:flex;align-items:center;justify-content:center;font-size:56px;cursor:pointer;user-select:none;box-shadow:0 6px 18px rgba(0,0,0,0.08);transition:box-shadow 0.3s;">🫳</div>';
        h += '<div style="font-size:12px;color:#999;margin-bottom:12px;">长按伸手，悄悄摸一摸</div>';
        h += '<div id="ss-reply" style="font-size:14px;color:#7a7a7a;min-height:24px;line-height:1.6;"></div>';
        h += '</div></div>';
        sub.innerHTML = h;
        var hand = document.getElementById('ss-hand');
        var rp = document.getElementById('ss-reply');
        var pressTimer = null, pressed = false;
        if (hand) {
            var start = function () {
                pressed = true;
                pressTimer = setTimeout(function () {
                    if (!pressed) return;
                    var hit = Math.random() < 0.45;
                    if (hit) {
                        rp.textContent = '🫳 ' + pick(SS_HIT);
                        rp.style.color = '#b06ab3';
                        hand.style.boxShadow = '0 0 40px 12px rgba(255,200,120,0.55)';
                        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
                        addExp(3);
                        if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('🤲 你摸到' + TA.name + '了', '手心贴手心');
                    } else {
                        rp.textContent = pick(SS_MISS);
                        rp.style.color = '#aaa';
                        if (navigator.vibrate) navigator.vibrate(20);
                    }
                    setTimeout(function () { hand.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'; }, 1200);
                }, 650);
            };
            var end = function () { pressed = false; clearTimeout(pressTimer); };
            hand.addEventListener('touchstart', function (e) { e.preventDefault(); start(); });
            hand.addEventListener('touchend', end);
            hand.addEventListener('touchcancel', end);
            hand.addEventListener('mousedown', start);
            hand.addEventListener('mouseup', end);
            hand.addEventListener('mouseleave', end);
        }
    }

    /* ============ 🌸 经期记录 ============ */
    function renderPeriod() {
        var sub = pageEl.querySelector('#room-sub');
        var h = '';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);">';
        h += '<button onclick="window.__roomCloseSub&&window.__roomCloseSub()" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹</button>';
        h += '<span style="font-size:15px;font-weight:700;">🌸 经期记录</span>';
        h += '<span style="width:32px;"></span></div>';
        h += '<div style="padding:16px;overflow-y:auto;">';
        h += '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-bottom:12px;">';
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
            if (phase < 7) h += '<span style="color:#e07a9a;">💗 这几天好好照顾自己，多喝热水、别着凉。</span>';
            else if (phase > period.cycle - 7) h += '<span style="color:#8a9ec9;">🌙 快到了，提前准备好。</span>';
            else h += '<span style="color:#7aa68a;">🍀 一切正常，记得按时吃饭。</span>';
            h += '</div>';
        } else {
            h += '<div style="font-size:13px;color:#999;">还没记录过，点下面的按钮记一下。</div>';
        }
        h += '</div>';
        h += '<div style="display:flex;gap:10px;margin-bottom:12px;">';
        h += '<button id="period-today" style="flex:1;padding:12px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer;">📅 记录今天开始</button>';
        h += '<button id="period-clear" style="flex:1;padding:12px;border:none;border-radius:14px;background:#f0f0f0;color:#888;font-size:14px;cursor:pointer;">清除</button>';
        h += '</div>';
        h += '<div style="font-size:13px;color:#666;background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">';
        h += '周期天数：<input id="period-cycle" type="range" min="21" max="35" value="' + (period.cycle || 28) + '" style="width:100%;margin:8px 0;">';
        h += '<span id="period-cycle-val" style="font-size:12px;color:#888;">' + (period.cycle || 28) + ' 天</span>';
        h += '</div></div>';
        sub.innerHTML = h;
        var bt = document.getElementById('period-today');
        if (bt) bt.addEventListener('click', function () { period.start = todayStr(); savePeriod(); toast('🌸 记好了，我帮你算着'); renderPeriod(); });
        var bc = document.getElementById('period-clear');
        if (bc) bc.addEventListener('click', function () { period.start = ''; savePeriod(); renderPeriod(); });
        var cs = document.getElementById('period-cycle');
        if (cs) cs.addEventListener('input', function () { period.cycle = parseInt(cs.value, 10) || 28; var v = document.getElementById('period-cycle-val'); if (v) v.textContent = period.cycle + ' 天'; });
        if (cs) cs.addEventListener('change', function () { savePeriod(); renderPeriod(); });
    }

    /* 子面板返回 */
    window.__roomCloseSub = function () {
        if (subPanel) { subPanel = null; switchTab(currentTab); }
        else close();
    };

    function toast(msg) {
        if (typeof window.toast === 'function') { window.toast(msg); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:200000;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2200);
    }

    window.__roomMaybeTrigger = function (text) {
        if (!text) return;
        if (/房间|回家|我们的家/.test(text)) {
            setTimeout(function () { toast('🏠 回房间看看'); setTimeout(open, 400); }, 300);
        }
    };

    function bindAdvancedEntry() {
        var el = document.getElementById('room-function');
        if (el) el.addEventListener('click', open);
    }

    load();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bindAdvancedEntry(); });
    else bindAdvancedEntry();
})();