/* =========================================================
 * 栗屿海 · 备忘室（日历日记）+ 召唤沈屿
 * 入口：聊天输入框 → 展开收纳区 → 备忘室 / 召唤
 * - 备忘室：日历选日期 → 写那天的日记（双人）
 * - 召唤沈屿：悬浮球 + 拥抱呼吸引导
 * ========================================================= */
(function () {
    function pick(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
    function pool() {
        try {
            if (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) {
                return customReplies.filter(function (r) { return String(r || '').trim(); });
            }
        } catch (e) {}
        return [];
    }
    function fromPoolOr(fallback) { var p = pool(); return p.length >= 1 ? String(pick(p)).trim() : pick(fallback); }
    function toast(msg) {
        if (typeof window.toast === 'function') { window.toast(msg); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:400001;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2200);
    }

    /* ============ 备忘室 · 日历日记 ============ */
    var MEMO_CAL_KEY = 'lilidreamlove_memo_cal';
    var memoYear = 0, memoMonth = 0, memoSel = '';

    function memoKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    function openMemoPage() {
        var now = new Date();
        memoYear = now.getFullYear(); memoMonth = now.getMonth(); memoSel = memoKey(now);
        var d = page('📔 备忘室', '', null);
        renderMemoCal(d.querySelector('.lyh-page-body'));
    }

    function renderMemoCal(body) {
        var h = '';
        h += '<div style="background:#fff;border-radius:16px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
        h += '<button id="memo-prev" style="background:none;border:none;font-size:16px;color:#555;cursor:pointer;padding:4px 8px;">‹</button>';
        h += '<span id="memo-ym" style="font-size:14px;font-weight:700;">' + memoYear + '年' + (memoMonth + 1) + '月</span>';
        h += '<button id="memo-next" style="background:none;border:none;font-size:16px;color:#555;cursor:pointer;padding:4px 8px;">›</button>';
        h += '</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:10px;color:#999;margin-bottom:4px;">';
        ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) { h += '<div>' + w + '</div>'; });
        h += '</div>';
        var first = new Date(memoYear, memoMonth, 1);
        var startDow = first.getDay();
        var daysInMonth = new Date(memoYear, memoMonth + 1, 0).getDate();
        var todayKey = memoKey(new Date());
        for (var i = 0; i < startDow; i++) h += '<div></div>';
        for (var dd = 1; dd <= daysInMonth; dd++) {
            var dk = memoYear + '-' + String(memoMonth + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
            var on = dk === memoSel;
            var isToday = dk === todayKey;
            h += '<div data-day="' + dk + '" style="height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;font-size:12px;' +
                (on ? 'background:#3d7ea6;color:#fff;font-weight:700;' : 'color:#444;') +
                (isToday && !on ? 'border:1px solid #3d7ea6;' : '') + '">' + dd + '</div>';
        }
        h += '</div>';
        h += '<div id="memo-day-area" style="margin-top:12px;"></div>';
        body.innerHTML = h;
        body.querySelector('#memo-prev').addEventListener('click', function () { memoMonth--; if (memoMonth < 0) { memoMonth = 11; memoYear--; } renderMemoCal(body); });
        body.querySelector('#memo-next').addEventListener('click', function () { memoMonth++; if (memoMonth > 11) { memoMonth = 0; memoYear++; } renderMemoCal(body); });
        body.querySelectorAll('[data-day]').forEach(function (el) {
            el.addEventListener('click', function () {
                memoSel = el.dataset.day;
                renderMemoCal(body);
            });
        });
        renderMemoDay(body);
    }

    function renderMemoDay(body) {
        var area = body.querySelector('#memo-day-area');
        var d = memoSel.split('-');
        var title = parseInt(d[1], 10) + '月' + parseInt(d[2], 10) + '日';
        var h = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
            '<span style="font-size:13px;font-weight:700;">' + title + '</span>' +
            '<span style="font-size:11px;color:#999;">只有我们俩</span></div>' +
            '<div id="memo-entries"></div>' +
            '<div style="display:flex;gap:8px;margin-top:8px;">' +
            '<input id="memo-input" placeholder="写一句（悄悄话 / 梦 / 日子）" style="flex:1;box-sizing:border-box;padding:9px 12px;border:1px solid #e0e0e0;border-radius:14px;font-size:12px;outline:none;">' +
            '<button id="memo-save" style="padding:8px 16px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;">写</button>' +
            '</div>';
        area.innerHTML = h;
        var entries = area.querySelector('#memo-entries');
        function render() {
            if (typeof localforage === 'undefined') return;
            localforage.getItem(MEMO_CAL_KEY).then(function (v) {
                var map = v && typeof v === 'object' ? v : {};
                var arr = map[memoSel] || [];
                if (!arr.length) { entries.innerHTML = '<div style="font-size:12px;color:#aaa;text-align:center;padding:16px;">这一天还没有字。留一句吧。</div>'; return; }
                var hh = '';
                for (var i = arr.length - 1; i >= 0; i--) {
                    var m = arr[i];
                    hh += '<div style="background:#f9f7f2;border-radius:12px;padding:10px 12px;margin-bottom:8px;">' +
                        '<div style="font-size:10px;color:#aaa;margin-bottom:3px;">' + (m.who === 'ta' ? '🐳 ' + m.whoName : '🦊 ' + m.whoName) + ' · ' + m.t + '</div>' +
                        '<div style="font-size:13px;color:#444;white-space:pre-wrap;line-height:1.6;">' + String(m.c || '').replace(/[<>&]/g, '') + '</div></div>';
                }
                entries.innerHTML = hh;
            }).catch(function () {});
        }
        render();
        area.querySelector('#memo-save').addEventListener('click', function () {
            var txt = area.querySelector('#memo-input').value.trim();
            if (!txt) { toast('写一句再存呀'); return; }
            if (typeof localforage === 'undefined') return;
            localforage.getItem(MEMO_CAL_KEY).then(function (v) {
                var map = v && typeof v === 'object' ? v : {};
                var arr = map[memoSel] || [];
                var whoName = (typeof settings !== 'undefined' && settings.myName) || '栗栗';
                var now = new Date();
                arr.push({ who: 'me', whoName: whoName, c: txt, t: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') });
                map[memoSel] = arr.slice(-50);
                localforage.setItem(MEMO_CAL_KEY, map).then(function () {
                    area.querySelector('#memo-input').value = '';
                    toast('📔 写好了，谁也看不到，除了我们');
                    render();
                }).catch(function () {});
            }).catch(function () {});
        });
    }

    /* ============ 召唤沈屿（悬浮球 + 面板） ============ */
    var ballEl = null;
    function ensureBall() {
        if (ballEl && document.body.contains(ballEl)) return ballEl;
        var b = document.createElement('div');
        b.id = 'lyh-ball';
        b.innerHTML = '<div style="position:fixed;right:12px;bottom:74px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#3d7ea6,#2c5f8a);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 6px 20px rgba(44,95,138,0.5);z-index:300000;border:2px solid rgba(255,255,255,0.4);">🆘</div>';
        document.body.appendChild(b);
        ballEl = b;
        b.addEventListener('click', openSummon);
        return b;
    }

    var summonEl = null;
    function openSummon() {
        if (summonEl && document.body.contains(summonEl)) { summonEl.style.display = 'flex'; return; }
        var d = document.createElement('div');
        d.id = 'lyh-summon';
        d.style.cssText = 'position:fixed;inset:0;z-index:300001;background:rgba(20,30,50,0.82);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        d.innerHTML =
            '<div style="width:88%;max-width:400px;background:#fff;border-radius:22px;padding:24px 20px;text-align:center;color:#2a2a2a;box-shadow:0 20px 60px rgba(0,0,0,0.4);position:relative;">' +
            '<button id="summon-close" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:16px;color:#999;cursor:pointer;">✕</button>' +
            '<div style="font-size:40px;">🫂</div>' +
            '<div style="font-size:17px;font-weight:700;margin:10px 0 4px;">沈屿在</div>' +
            '<div id="summon-hug" style="font-size:14px;color:#666;line-height:1.7;margin:10px 0 16px;min-height:44px;">先别急着说话。我在，我抱着你——你什么都不用想，跟着我呼吸就好。</div>' +
            '<div id="summon-breathe" style="width:120px;height:120px;margin:0 auto 14px;border-radius:50%;border:3px solid #7fb8cf;display:flex;align-items:center;justify-content:center;font-size:14px;color:#3d7ea6;transition:transform 4s ease, background 4s ease;">吸气…</div>' +
            '<div style="font-size:12px;color:#999;">4-7-8 呼吸 · 吸气4秒 · 屏息7秒 · 呼气8秒</div>' +
            '<button id="summon-breathe-start" style="margin-top:14px;padding:10px 22px;border:none;border-radius:20px;background:#3d7ea6;color:#fff;font-size:14px;cursor:pointer;">开始呼吸引导</button>' +
            '</div>';
        document.body.appendChild(d);
        summonEl = d;
        d.querySelector('#summon-close').addEventListener('click', function () { d.style.display = 'none'; });
        var bEl = d.querySelector('#summon-breathe');
        var stBtn = d.querySelector('#summon-breathe-start');
        var phase = 0, timer = null;
        function breathe() {
            if (phase === 0) { bEl.textContent = '吸气…'; bEl.style.transform = 'scale(1.15)'; bEl.style.background = '#dcebf3'; phase = 1; timer = setTimeout(breathe, 4000); }
            else if (phase === 1) { bEl.textContent = '屏息…'; bEl.style.transform = 'scale(1.3)'; bEl.style.background = '#cfe4f0'; phase = 2; timer = setTimeout(breathe, 7000); }
            else { bEl.textContent = '呼气…'; bEl.style.transform = 'scale(1)'; bEl.style.background = '#eef5f8'; phase = 0; timer = setTimeout(breathe, 8000); }
        }
        if (stBtn) stBtn.addEventListener('click', function () { clearTimeout(timer); phase = 0; breathe(); stBtn.textContent = '再来一轮'; });
        if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('🆘 栗栗召唤了沈屿', '他放下手里的一切，来了');
    }

    /* ============ 通用页面 ============ */
    window.openMemoPage = openMemoPage;
    window.openSummon = openSummon;
    function page(title, contentHtml, initFn) {
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;inset:0;z-index:100002;background:#f7f5f0;display:flex;flex-direction:column;color:#2a2a2a;';
        d.innerHTML =
            '<div style="height:52px;flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(0,0,0,0.06);">' +
            '<button class="lyh-page-back" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹ 返回</button>' +
            '<span style="font-size:15px;font-weight:700;">' + title + '</span>' +
            '<span style="width:44px;"></span></div>' +
            '<div class="lyh-page-body" style="flex:1;overflow-y:auto;padding:14px;padding-bottom:80px;"></div>';
        document.body.appendChild(d);
        d.querySelector('.lyh-page-back').addEventListener('click', function () { d.remove(); });
        if (contentHtml !== null) d.querySelector('.lyh-page-body').innerHTML = contentHtml;
        if (initFn) initFn(d.querySelector('.lyh-page-body'));
        return d;
    }

    /* ============ 启动 ============ */
    function boot() {
        ensureBall();
        /* 移除可能残留的旧按钮 */
        var oldBtn = document.getElementById('lyh-home-btn');
        if (oldBtn) oldBtn.remove();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();