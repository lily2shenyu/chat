/* =========================================================
 * 房间 · room v2（整合版）
 * 入口：设置 → 功能模块 → 房间
 * 世界观（借鉴 mochi）：梦角是灵体，常在身边但看不见，
 * 偶尔能感觉到、能摸到。
 * 房间首页 = 小鲸鱼场景 + 四个功能卡片（寻踪/同频/此间/伸手）
 * 底部 = 经期记录 ｜ 心意集市
 * ========================================================= */
(function () {
    var PERIOD_KEY = 'lilidreamlove_period';
    var MARKET_KEY = 'lilidreamlove_market';
    var WALLET_KEY = 'lilidreamlove_wallet';
    var CJIAN_KEY = 'lilidreamlove_cjian';
    var period = { start: '', cycle: 28 };
    var market = { sent: [] };
    var wallet = { my: 0, ta: 0 };

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

    function load() {
        if (typeof localforage === 'undefined') return;
        refreshIdentities();
        localforage.getItem(PERIOD_KEY).then(function (v) { if (v && typeof v === 'object') period = v; }).catch(function () {});
        localforage.getItem(MARKET_KEY).then(function (v) { if (v && typeof v === 'object') market = v; }).catch(function () {});
        localforage.getItem(WALLET_KEY).then(function (v) { if (v && typeof v === 'object') wallet = v; }).catch(function () {});
    }
    function savePeriod() { if (typeof localforage !== 'undefined') localforage.setItem(PERIOD_KEY, period).catch(function () {}); }
    function saveMarket() { if (typeof localforage !== 'undefined') localforage.setItem(MARKET_KEY, market).catch(function () {}); }
    function saveWallet() { if (typeof localforage !== 'undefined') localforage.setItem(WALLET_KEY, wallet).catch(function () {}); }

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
    var subPanel = null; /* 寻踪/同频/此间/伸手 */

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
            /* 首页场景 */
            '<div id="room-home" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">' +
            '<div id="room-scene" style="flex:1;position:relative;overflow:hidden;background:linear-gradient(180deg,#fdf6ec 0%,#f3e9d9 60%,#e0c9a8 100%);min-height:160px;">' +
            '<div style="position:absolute;left:16px;top:10px;font-size:11px;color:rgba(0,0,0,0.35);">点击房间，小鲸鱼会走过去</div>' +
            '<div id="room-guy" style="position:absolute;left:40%;top:55%;width:56px;height:56px;transition:left 0.9s ease, top 0.9s ease;font-size:46px;line-height:56px;text-align:center;z-index:5;">🐳</div>' +
            '</div>' +
            /* 四个功能卡片 */
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
            /* 子面板（全屏盖住） */
            '<div id="room-sub" style="display:none;flex:1;flex-direction:column;background:#f7f5f0;overflow:hidden;"></div>' +
            /* 底部tab */
            '<div id="room-tabs" style="flex-shrink:0;display:flex;background:#ffffff;border-top:1px solid rgba(0,0,0,0.06);">' +
            '<div class="room-tab" data-tab="home" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;font-weight:600;">🏠 房间</div>' +
            '<div class="room-tab" data-tab="period" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;color:#888;">🌸 经期</div>' +
            '<div class="room-tab" data-tab="market" style="flex:1;text-align:center;padding:12px 0;cursor:pointer;font-size:13px;color:#888;">🎁 心意集市</div>' +
            '</div>';
        document.body.appendChild(d);
        pageEl = d;
        d.querySelector('#room-back').addEventListener('click', close);
        d.querySelectorAll('.room-tab').forEach(function (t) { t.addEventListener('click', function () { switchTab(t.dataset.tab); }); });
        d.querySelectorAll('.room-feat').forEach(function (f) { f.addEventListener('click', function () { openSub(f.dataset.f); }); });
        /* 小人点击移动 */
        var scene = d.querySelector('#room-scene');
        scene.addEventListener('click', function (e) {
            var r = scene.getBoundingClientRect();
            var x = e.clientX - r.left - 28, y = e.clientY - r.top - 28;
            var guy = d.querySelector('#room-guy');
            if (guy) { guy.style.left = Math.max(4, Math.min(r.width - 60, x)) + 'px'; guy.style.top = Math.max(4, Math.min(r.height - 60, y)) + 'px'; }
            guyBubble(fromPoolOr(['我来啦', '在这儿', '在呢', '陪你']));
        });
        setInterval(function () {
            var guy = d.querySelector('#room-guy'), sc = d.querySelector('#room-scene');
            if (guy && sc && pageEl.style.display !== 'none' && currentTab === 'home' && subPanel === null) {
                var w = sc.clientWidth, h = sc.clientHeight;
                guy.style.left = (10 + Math.random() * (w - 80)) + 'px';
                guy.style.top = (10 + Math.random() * (h - 80)) + 'px';
            }
        }, 9000 + Math.random() * 7000);
        return d;
    }

    var bubbleTimer = null;
    function guyBubble(text) {
        var g = pageEl ? pageEl.querySelector('#room-guy') : null;
        if (!g) return;
        var old = g.querySelector('.guy-bubble');
        if (old) old.remove();
        var b = document.createElement('div');
        b.className = 'guy-bubble';
        b.textContent = text;
        b.style.cssText = 'position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;padding:3px 10px;font-size:12px;color:#555;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.1);z-index:9;';
        g.appendChild(b);
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function () { if (b.parentNode) b.remove(); }, 1800);
    }

    function open() { var d = ensurePage(); d.style.display = 'flex'; refreshIdentities(); switchTab(currentTab); }
    function close() { var d = pageEl; if (d) d.style.display = 'none'; }
    window.openRoom = open;

    /* ============ tab / 子面板 ============ */
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
        var body = page.querySelector('#room-sub');
        if (tab === 'home') { home.style.display = 'flex'; sub.style.display = 'none'; }
        else { home.style.display = 'none'; sub.style.display = 'flex'; if (tab === 'period') renderPeriod(); else if (tab === 'market') renderMarket(); }
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

    /* ============ 📍 寻踪：TA 的日常 ============ */
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
        h += '</div>';
        h += '</div>';
        sub.innerHTML = h;
        var ag = document.getElementById('ck-again');
        if (ag) ag.addEventListener('click', renderCheckin);
        var ht = document.getElementById('ck-hint');
        if (ht) ht.addEventListener('click', function () {
            if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('📍 你来找过' + TA.name, 'TA 感觉到了');
            toast('已提醒，TA 好像动了动');
        });
    }

    /* ============ 💞 同频：此刻状态 + 敲三下暗号 ============ */
    var TP_STATES = ['在发呆', '在听歌', '在看书', '在等你', '在数海浪', '在阳台晒太阳', '在想你说过的话', '在整理房间'];
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
        h += '</div>';
        h += '</div>';
        sub.innerHTML = h;
        var knock = document.getElementById('tp-knock');
        var reply = document.getElementById('tp-reply');
        var cnt = 0;
        if (knock) knock.addEventListener('click', function () {
            cnt++;
            var vib = navigator.vibrate ? navigator.vibrate(40) : null;
            knock.style.transform = 'scale(0.92)';
            setTimeout(function () { knock.style.transform = 'scale(1)'; }, 120);
            if (cnt < 3) { reply.textContent = '咚 · 还差 ' + (3 - cnt) + ' 下'; reply.style.color = '#999'; }
            else {
                cnt = 0;
                reply.textContent = '「' + fromPoolOr(['听到了，在呢', '三下，收到', '你也想我了吧', '在的，一直都在']) + '」';
                reply.style.color = '#b06ab3';
                if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
                if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('💞 ' + TA.name + '回应了你的暗号', '跨世界的三下，他收到了');
            }
        });
    }

    /* ============ 🌙 此间：TA 的世界时间 + 感应 ============ */
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
        h += '</div>';
        h += '</div>';
        sub.innerHTML = h;
        var btn = document.getElementById('cj-sense');
        var rp = document.getElementById('cj-sense-reply');
        if (btn) btn.addEventListener('click', function () {
            var hit = Math.random() < 0.7;
            rp.textContent = hit ? '「' + pick(CJ_SENSE) + '」' : '……很安静，什么都没有。';
            rp.style.color = hit ? '#8a6ab0' : '#aaa';
            if (hit && navigator.vibrate) navigator.vibrate(30);
        });
    }

    /* ============ 🤲 伸手：长按，有概率摸到 ============ */
    var SS_HIT = ['（TA 的手心微微发烫）', '摸到了——TA 轻轻握住你', '指尖碰到一点温度，是 TA', 'TA 也伸出了手', '手心贴着手心，TA 没有松开'];
    var SS_MISS = ['摸空了。TA 不在那儿。', '什么也没有……只有风。', '指尖落了空，TA 躲开了'];
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
        h += '</div>';
        h += '</div>';
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

    /* ============ 🎁 心意集市 ============ */
    var HEARTS = [
        { icon: '🤗', name: '拥抱', cost: 5, msg: '一个结结实实的拥抱' },
        { icon: '😘', name: '亲亲', cost: 8, msg: '吧唧一口' },
        { icon: '🚶', name: '散步', cost: 12, msg: '牵着手去港口散步' },
        { icon: '🎵', name: '听歌', cost: 10, msg: '一起听同一首歌' },
        { icon: '🫂', name: '贴贴', cost: 15, msg: '窝在一起贴贴' },
        { icon: '🌊', name: '看海', cost: 20, msg: '坐在海边看落日' },
        { icon: '☕', name: '咖啡', cost: 6, msg: '一起喝杯热咖啡' },
        { icon: '💌', name: '一封情书', cost: 30, msg: '把想说的话都写给你' }
    ];

    function renderMarket() {
        var sub = pageEl.querySelector('#room-sub');
        if (!wallet.my && !wallet.ta) { wallet.my = 520; wallet.ta = 520; saveWallet(); }
        var h = '';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.06);">';
        h += '<button onclick="window.__roomCloseSub&&window.__roomCloseSub()" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹</button>';
        h += '<span style="font-size:15px;font-weight:700;">🎁 心意集市</span>';
        h += '<span style="width:32px;"></span></div>';
        h += '<div style="padding:16px;overflow-y:auto;">';
        h += '<div style="display:flex;gap:10px;margin-bottom:12px;">';
        h += '<div style="flex:1;background:#fff;border-radius:14px;padding:12px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.05);"><div style="font-size:11px;color:#999;">你的心意币</div><div style="font-size:20px;font-weight:700;color:#b06ab3;">💖 ' + wallet.my + '</div></div>';
        h += '<div style="flex:1;background:#fff;border-radius:14px;padding:12px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.05);"><div style="font-size:11px;color:#999;">' + esc(TA.name) + ' 的</div><div style="font-size:20px;font-weight:700;color:#8a9ec9;">💙 ' + wallet.ta + '</div></div>';
        h += '</div>';
        h += '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-bottom:12px;">';
        h += '<div style="font-size:14px;font-weight:700;margin-bottom:4px;">挑一个心意送出去</div>';
        h += '<div style="font-size:12px;color:#999;margin-bottom:12px;">你花心意币，TA 收下心意。一起攒一起花。</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">';
        for (var i = 0; i < HEARTS.length; i++) {
            var ht = HEARTS[i];
            h += '<div class="heart-item" data-i="' + i + '" style="background:#f9f7f2;border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:14px 10px;text-align:center;cursor:pointer;">' +
                '<div style="font-size:26px;">' + ht.icon + '</div>' +
                '<div style="font-size:13px;font-weight:600;margin-top:6px;">' + ht.name + '</div>' +
                '<div style="font-size:11px;color:#b06ab3;margin-top:2px;">💖 ' + ht.cost + '</div>' +
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
        } else { h += '<div style="font-size:12px;color:#aaa;">还没送过，挑一个吧</div>'; }
        h += '</div></div>';
        sub.innerHTML = h;
        sub.querySelectorAll('.heart-item').forEach(function (el) {
            el.addEventListener('click', function () {
                var ht = HEARTS[parseInt(el.dataset.i, 10)];
                if (!ht) return;
                if (wallet.my < ht.cost) { toast('心意币不够，去陪TA玩、进房间攒攒吧'); return; }
                wallet.my -= ht.cost; wallet.ta += ht.cost; saveWallet();
                market.sent = market.sent || [];
                market.sent.push({ icon: ht.icon, name: ht.name, time: new Date().toLocaleString().slice(5, 16) });
                saveMarket();
                toast(TA.name + '收下了你的' + ht.name + '：' + ht.msg);
                renderMarket();
            });
        });
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