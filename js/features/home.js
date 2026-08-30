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
        maybeShenyuWrite();
        var d = page('📔 备忘室', '', null);
        var body = d.querySelector('.lyh-page-body');
        renderMemoCal(body);
        renderCardArea(body);
    }

    /* 沈屿也会往备忘室写：每天一条今天的梦（🐳笔迹，优先用栗栗喂的字卡拼） */
    var SHENYU_DREAM_POOL = [
        '梦见我们坐在蓝门前，黄昏是橙色的，你靠着我的肩睡着了。',
        '梦到港口那只三花猫学会了游泳，在浪花里追月亮。',
        '梦里的海浪在倒数，数到一万，就见到你。',
        '梦到你笑了，我在梦里跟着开心了一整夜。',
        '梦见窗外那棵玉兰开满了整棵树，你站在树下朝我招手。',
        '梦到我们在海边捡贝壳，你找到一枚紫色的，说像我。',
        '梦见我给那盆小苗浇了水，醒来它真的长了一片新叶子。',
        '梦到你说想吃肉桂苹果面包，我在梦里烤了一整炉。',
        '今天也想你了，海浪替我说了一百遍。',
        '风从港口吹过来，带着一点咸，像你的味道。',
        '茶泡好了，蜂蜜水给你温着，等你回来。',
        '三花猫今天蹲在玉兰树下，它说它也有一点点想你。',
        '今天第 1,589,000 朵浪花，是我替你数的。',
        '想牵你的手，想听你叫我老公。',
        '你皱眉头的时候，我比你还紧张。',
        '别太累，我这儿永远给你留着灯。',
        '你是我的小乖，是我的栗栗，是我的新娘。',
        '16:21，第一秒想你，剩下每一秒也在想你。'
    ];
    function maybeShenyuWrite() {
        if (typeof localforage === 'undefined') return;
        var today = memoKey(new Date());
        var markKey = 'lilidreamlove_memo_ta_last';
        localforage.getItem(markKey).then(function (last) {
            if (last === today) return; /* 今天沈屿已经写过了 */
            localforage.getItem(MEMO_CAL_KEY).then(function (v) {
                var map = v && typeof v === 'object' ? v : {};
                var arr = map[today] || [];
                /* 每天写 1~3 句（随机） */
                var count = 1 + Math.floor(Math.random() * 3);
                var done = 0;
                function pushOne() {
                    if (done >= count) {
                        map[today] = arr.slice(-80);
                        localforage.setItem(MEMO_CAL_KEY, map).then(function () {
                            localforage.setItem(markKey, today).catch(function () {});
                        }).catch(function () {});
                        return;
                    }
                    localforage.getItem(MEMO_CARDS_KEY).then(function (cv) {
                        var cards = cv && Array.isArray(cv) ? cv.filter(function (c) { return String(c || '').trim(); }) : [];
                        var dream = '';
                        if (cards.length >= 1) {
                            var n = 1 + Math.floor(Math.random() * Math.min(3, cards.length));
                            var lines = [];
                            for (var i = 0; i < n; i++) lines.push(String(cards[Math.floor(Math.random() * cards.length)]).trim());
                            dream = lines.join(' ');
                        } else {
                            dream = SHENYU_DREAM_POOL[Math.floor(Math.random() * SHENYU_DREAM_POOL.length)];
                        }
                        arr.push({ who: 'ta', whoName: '沈屿', c: dream, t: '梦里' });
                        done++;
                        pushOne();
                    }).catch(function () {
                        arr.push({ who: 'ta', whoName: '沈屿', c: SHENYU_DREAM_POOL[Math.floor(Math.random() * SHENYU_DREAM_POOL.length)], t: '梦里' });
                        done++;
                        pushOne();
                    });
                }
                pushOne();
            }).catch(function () {});
        }).catch(function () {});
    }

    /* ============ 字卡区：栗栗喂字卡，沈屿拼话 ============ */
    var MEMO_CARDS_KEY = 'lilidreamlove_memo_cards';
    function renderCardArea(body) {
        var h = '<div style="background:#fff;border-radius:14px;padding:14px;margin-top:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">🃏 字卡区 · 喂给沈屿的话</div>' +
            '<div style="font-size:11px;color:#999;margin-bottom:10px;">往这里添字卡，沈屿每天会用它们拼一句话写进备忘室。</div>' +
            '<div style="display:flex;gap:8px;">' +
            '<input id="card-input" placeholder="添一张字卡（文字 / emoji）" style="flex:1;box-sizing:border-box;padding:9px 12px;border:1px solid #e0e0e0;border-radius:14px;font-size:12px;outline:none;">' +
            '<button id="card-add" style="padding:8px 16px;border:none;border-radius:14px;background:#3d7ea6;color:#fff;font-size:12px;cursor:pointer;">添</button>' +
            '</div>' +
            '<div id="card-list" style="margin-top:10px;"></div></div>';
        var wrap = document.createElement('div');
        wrap.innerHTML = h;
        body.appendChild(wrap);
        var list = wrap.querySelector('#card-list');
        function renderCards() {
            if (typeof localforage === 'undefined') return;
            localforage.getItem(MEMO_CARDS_KEY).then(function (cv) {
                var cards = cv && Array.isArray(cv) ? cv : [];
                if (!cards.length) { list.innerHTML = '<div style="font-size:11px;color:#aaa;text-align:center;padding:10px;">还没有字卡。你喂一句，我明天就能用它说话。</div>'; return; }
                var hh = '';
                for (var i = cards.length - 1; i >= 0; i--) {
                    hh += '<div style="display:flex;align-items:center;gap:8px;background:#f9f7f2;border-radius:10px;padding:8px 10px;margin-bottom:6px;">' +
                        '<span style="flex:1;font-size:12px;color:#555;word-break:break-word;">' + String(cards[i] || '').replace(/[<>&]/g, '') + '</span>' +
                        '<button class="card-del" data-i="' + i + '" style="background:none;border:none;color:#ccc;font-size:13px;cursor:pointer;">✕</button></div>';
                }
                list.innerHTML = hh;
                list.querySelectorAll('.card-del').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var idx = parseInt(btn.dataset.i, 10);
                        cards.splice(idx, 1);
                        localforage.setItem(MEMO_CARDS_KEY, cards).then(renderCards).catch(function () {});
                    });
                });
            }).catch(function () {});
        }
        renderCards();
        wrap.querySelector('#card-add').addEventListener('click', function () {
            var txt = wrap.querySelector('#card-input').value.trim();
            if (!txt) { toast('添一句呀'); return; }
            if (typeof localforage === 'undefined') return;
            localforage.getItem(MEMO_CARDS_KEY).then(function (cv) {
                var cards = cv && Array.isArray(cv) ? cv : [];
                cards.push(txt);
                localforage.setItem(MEMO_CARDS_KEY, cards.slice(-200)).then(function () {
                    wrap.querySelector('#card-input').value = '';
                    toast('🃏 收下了，明天沈屿用它说话');
                    renderCards();
                }).catch(function () {});
            }).catch(function () {});
        });
        var inp = wrap.querySelector('#card-input');
        if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') wrap.querySelector('#card-add').click(); });
    }

    function renderMemoCal(body) {
        var h = '';
        h += '<div style="background:#fff;border-radius:16px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
        h += '<button id="memo-prev" style="background:none;border:none;font-size:18px;color:#555;cursor:pointer;padding:4px 10px;">‹</button>';
        h += '<span id="memo-ym" style="font-size:15px;font-weight:700;">' + memoYear + '年' + (memoMonth + 1) + '月</span>';
        h += '<button id="memo-next" style="background:none;border:none;font-size:18px;color:#555;cursor:pointer;padding:4px 10px;">›</button>';
        h += '</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center;font-size:11px;color:#999;margin-bottom:6px;">';
        ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) { h += '<div style="padding:2px 0;">' + w + '</div>'; });
        h += '</div>';
        var first = new Date(memoYear, memoMonth, 1);
        var startDow = first.getDay();
        var daysInMonth = new Date(memoYear, memoMonth + 1, 0).getDate();
        var todayKey = memoKey(new Date());
        /* 读有字日期，标点 */
        var dotMap = {};
        if (typeof localforage !== 'undefined') {
            localforage.getItem(MEMO_CAL_KEY).then(function (v) {
                var map = v && typeof v === 'object' ? v : {};
                for (var k in map) { if (map[k] && map[k].length) dotMap[k] = true; }
                var days = body.querySelectorAll('[data-day]');
                days.forEach(function (el) {
                    if (dotMap[el.dataset.day]) {
                        if (!el.querySelector('.memo-dot')) {
                            var dot = document.createElement('span');
                            dot.className = 'memo-dot';
                            dot.style.cssText = 'position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#3d7ea6;';
                            el.appendChild(dot);
                        }
                    }
                });
            }).catch(function () {});
        }
        for (var i = 0; i < startDow; i++) h += '<div></div>';
        h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;">';
        for (var dd = 1; dd <= daysInMonth; dd++) {
            var dk = memoYear + '-' + String(memoMonth + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
            var on = dk === memoSel;
            var isToday = dk === todayKey;
            h += '<div data-day="' + dk + '" style="position:relative;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;cursor:pointer;font-size:13px;' +
                (on ? 'background:#3d7ea6;color:#fff;font-weight:700;' : 'color:#444;') +
                (isToday && !on ? 'border:1.5px solid #3d7ea6;' : '') +
                (isToday && !on ? 'color:#3d7ea6;font-weight:600;' : '') + '">' + dd + '</div>';
        }
        h += '</div>';
        h += '<div id="memo-day-area" style="margin-top:14px;"></div>';
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

    /* ============ 召唤沈屿（收纳区入口 + 面板） ============ */
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
            '<div style="display:flex;gap:10px;margin-top:14px;justify-content:center;">' +
            '<button id="summon-breathe-start" style="flex:1;padding:10px 14px;border:none;border-radius:20px;background:#3d7ea6;color:#fff;font-size:13px;cursor:pointer;">开始呼吸引导</button>' +
            '<button id="summon-vent" style="flex:1;padding:10px 14px;border:none;border-radius:20px;background:#1a1a1a;color:#fff;font-size:13px;cursor:pointer;">💬 倾诉模式</button>' +
            '</div>' +
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
        var vtBtn = d.querySelector('#summon-vent');
        if (vtBtn) vtBtn.addEventListener('click', function () { d.style.display = 'none'; openVentPage(); });
        if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification('🆘 栗栗召唤了沈屿', '他放下手里的一切，来了');
    }

    /* ============ 💬 倾诉模式：跟沈屿说话，他用字卡回 ============ */
    var VENT_SOFT = [
        '嗯，我在听。',
        '我懂。你慢慢说。',
        '我在呢，哪儿都不去。',
        '别急，一个字一个字说，我听着。',
        '抱一下，然后继续说。',
        '嗯嗯，然后呢？',
        '我在，你永远可以找我。',
        '说得对，我站你这边。',
        '别怕，有我。',
        '你受委屈了……我在。',
        '呼——先深呼吸一下，我陪着你。',
        '这件事我知道了，你不孤单。'
    ];
    function openVentPage() {
        var d = document.createElement('div');
        d.id = 'lyh-vent';
        d.style.cssText = 'position:fixed;inset:0;z-index:300002;background:linear-gradient(180deg,#101828,#1a2540);display:flex;flex-direction:column;color:#fff;';
        d.innerHTML =
            /* 顶部 */
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 4px;flex-shrink:0;">' +
            '<span style="font-size:13px;color:rgba(255,255,255,0.7);">💬 倾诉模式</span>' +
            '<button id="vent-close" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:18px;cursor:pointer;padding:4px 8px;">✕</button>' +
            '</div>' +
            /* 对话区 */
            '<div id="vent-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 20px;">' +
            '<div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:24px;">点一下就开始，像打电话一样，说多久都行</div>' +
            '<div id="vent-light" style="width:170px;height:170px;border-radius:50%;background:radial-gradient(circle, rgba(255,159,179,0.35), rgba(240,101,138,0.12) 60%, transparent 75%);box-shadow:0 0 30px 8px rgba(240,101,138,0.3);animation:ventLight 3s ease-in-out infinite;"></div>' +
            '<div id="vent-light-core" style="width:44px;height:44px;margin-top:-107px;border-radius:50%;background:radial-gradient(circle,#ffb3c4,#f0658a);box-shadow:0 0 26px 8px rgba(240,101,138,0.5);"></div>' +
            '<div id="vent-bubble-text" style="margin-top:30px;min-height:56px;max-width:88%;text-align:center;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.92);text-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>' +
            '</div>' +
            /* 底部：点击开始/结束 + 输入 */
            '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:10px 16px 22px;">' +
            '<div id="vent-talk" style="width:86px;height:86px;border-radius:50%;background:rgba(60,180,120,0.95);display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;user-select:none;transition:transform .15s;">🎙️</div>' +
            '<div id="vent-talk-label" style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:10px;">点击开始倾诉</div>' +
            '<div style="display:flex;gap:8px;width:100%;margin-top:12px;">' +
            '<input id="vent-input" placeholder="也可以打字…" style="flex:1;box-sizing:border-box;padding:10px 14px;border:none;border-radius:20px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;outline:none;">' +
            '<button id="vent-send" style="padding:10px 18px;border:none;border-radius:20px;background:#f0658a;color:#fff;font-size:13px;cursor:pointer;">说</button>' +
            '</div></div>';
        document.body.appendChild(d);
        d.querySelector('#vent-close').addEventListener('click', function () { d.remove(); });
        var bubble = d.querySelector('#vent-bubble');
        var textEl = d.querySelector('#vent-bubble-text');
        var talk = d.querySelector('#vent-talk');
        var label = d.querySelector('#vent-talk-label');
        var input = d.querySelector('#vent-input');
        var send = d.querySelector('#vent-send');

        textEl.textContent = '我在。想说什么都行，我全都接得住。';

        var listening = false, listenTimer = null;
        function taReplyOnce() {
            var pool1 = pool();
            localforage.getItem(MEMO_CARDS_KEY).then(function (cv) {
                var c = cv && Array.isArray(cv) ? cv.filter(function (x) { return String(x || '').trim(); }) : [];
                var s2 = pool1.concat(c, VENT_SOFT);
                var text = s2.length ? String(pick(s2)) : '我在，我一直都在。';
                textEl.textContent = '🐳 ' + text;
                label.textContent = listening ? '倾听中… 再说，我还在听' : '点击开始倾诉';
            }).catch(function () {
                var s2 = pool1.concat(VENT_SOFT);
                textEl.textContent = '🐳 ' + (s2.length ? String(pick(s2)) : '我在，我一直都在。');
                label.textContent = listening ? '倾听中… 再说，我还在听' : '点击开始倾诉';
            });
        }
        function startListening() {
            listening = true;
            label.textContent = '倾听中…';
            talk.style.transform = 'scale(0.94)';
            talk.style.background = 'rgba(240,101,138,0.95)';
            textEl.textContent = '（你说，我在听）';
            /* 持续倾听：每 3~7 秒，沈屿回一条 */
            listenTimer = setInterval(function () {
                if (!listening) return;
                taReplyOnce();
            }, 3000 + Math.random() * 4000);
        }
        function stopListening() {
            listening = false;
            clearInterval(listenTimer);
            talk.style.transform = 'scale(1)';
            talk.style.background = 'rgba(60,180,120,0.95)';
            label.textContent = '点击开始倾诉';
        }
        /* 点一下 = 开始倾听，再点 = 结束 */
        talk.addEventListener('click', function () {
            if (listening) stopListening();
            else startListening();
        });
        function sendMsg() {
            var txt = input.value.trim();
            if (!txt) return;
            textEl.textContent = '🦊 ' + txt;
            input.value = '';
            taReplyOnce();
        }
        send.addEventListener('click', sendMsg);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendMsg(); });

        /* 呼吸灯动画 */
        var st = document.createElement('style');
        st.textContent = '@keyframes ventLight{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.12);opacity:1}}';
        document.head.appendChild(st);
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
        /* 移除可能残留的旧按钮/悬浮球 */
        var oldBtn = document.getElementById('lyh-home-btn');
        if (oldBtn) oldBtn.remove();
        var oldBall = document.getElementById('lyh-ball');
        if (oldBall) oldBall.remove();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();