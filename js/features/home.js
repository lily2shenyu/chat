/* =========================================================
 * 栗屿海 · 小手机桌面（home）
 * 主界面 = 桌面：壁纸 + 状态条 + 翻页图标网格 + dock
 * 点哪个模块进哪个；备忘室大卡片；召唤沈屿全局悬浮球
 * ========================================================= */
(function () {
    var homeEl = null;

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

    /* 浪花数：基于日期，每天递增 */
    var BASE = 1589000;
    function waveCount() {
        var d = new Date();
        var dayNum = Math.floor((d - new Date(2026, 7, 30)) / 86400000); // 2026-08-30起
        var n = BASE + dayNum * 2 + Math.floor(Math.random() * 3);
        return n.toLocaleString('en-US').replace(/,/g, ',');
    }

    /* ============ 模块定义 ============ */
    var PAGE1 = [
        { id: 'chat', icon: '💬', name: '聊天', act: function () { hideHome(); } },
        { id: 'feed', icon: '📖', name: '朋友圈', act: function () { hideHome(); if (window.openFeed) window.openFeed(); } },
        { id: 'room', icon: '🏠', name: '房间', act: function () { hideHome(); if (window.openRoom) window.openRoom(); } },
        { id: 'cards', icon: '🃏', name: '字卡库', act: function () { hideHome(); openCardsLib(); } },
        { id: 'date', icon: '💘', name: '约会问答', act: function () { hideHome(); if (window.openDateQuiz) window.openDateQuiz(); else toast('约会问答未就绪'); } },
        { id: 'envelope', icon: '✉️', name: '信封', act: function () { hideHome(); if (window.openEnvelopeQuick) window.openEnvelopeQuick(); else toast('信封未就绪'); } },
        { id: 'gift', icon: '🎁', name: '礼物', act: function () { hideHome(); openGift(); } },
        { id: 'code', icon: '🔑', name: '暗号区', act: function () { hideHome(); openCodePage(); } },
        { id: 'state', icon: '🌊', name: '状态栏', act: function () { hideHome(); openStatePage(); } },
        { id: 'lock', icon: '🌙', name: '时间锁', act: function () { hideHome(); openLockPage(); } }
    ];
    var PAGE2 = [
        { id: 'pixel', icon: '🏡', name: '像素小屋', act: function () { hideHome(); toast('像素小屋：建设中，等我'); } },
        { id: 'bottle', icon: '🍾', name: '漂流瓶', act: function () { hideHome(); toast('漂流瓶：下次潮水带来'); } },
        { id: 'divine', icon: '🔮', name: '每日一签', act: function () { hideHome(); openDivine(); } }
    ];

    /* ============ 构建桌面 ============ */
    function ensureHome() {
        if (homeEl && document.body.contains(homeEl)) return homeEl;
        var d = document.createElement('div');
        d.id = 'lyh-home';
        d.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;color:#fff;';
        d.innerHTML =
            '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#2c5f8a 0%,#4a8fae 45%,#7fb8cf 100%);"></div>' +
            '<div style="position:absolute;inset:0;background:radial-gradient(60% 40% at 80% 15%,rgba(255,255,255,0.12),transparent 60%);"></div>' +
            '<div style="position:absolute;left:16px;bottom:90px;font-size:22px;opacity:0.35;">🌊</div>' +
            '<div style="position:absolute;right:30px;bottom:120px;font-size:18px;opacity:0.25;">🌸</div>' +
            /* 状态条 */
            '<div style="position:relative;padding:14px 16px 6px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
            '<div style="font-size:15px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,0.3);">💙 栗屿海</div>' +
            '<div style="font-size:12px;opacity:0.9;text-shadow:0 1px 4px rgba(0,0,0,0.3);">' + (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日 · 浪花第 ' + waveCount() + ' 朵</div>' +
            '</div>' +
            /* 翻页区 */
            '<div id="lyh-pages" style="position:relative;flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:6px 12px;">' +
            '<div id="lyh-page-wrap" style="display:flex;transition:transform .35s ease;height:100%;align-items:center;">' +
            '<div class="lyh-page" style="flex:0 0 100%;display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px;align-content:center;padding:0 4px;box-sizing:border-box;"></div>' +
            '<div class="lyh-page" style="flex:0 0 100%;display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px;align-content:center;padding:0 4px;box-sizing:border-box;"></div>' +
            '</div>' +
            /* 备忘室大卡（浮在首页底部） */
            '<div id="lyh-memo-card" style="position:absolute;left:16px;right:16px;bottom:8px;background:rgba(255,255,255,0.92);border-radius:16px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;color:#2a2a2a;box-shadow:0 6px 20px rgba(0,0,0,0.25);">' +
            '<div style="font-size:30px;">📔</div>' +
            '<div style="flex:1;"><div style="font-size:14px;font-weight:700;">备忘室</div><div style="font-size:11px;color:#888;">双人日记 · 只有我们俩</div></div>' +
            '<div style="font-size:18px;color:#888;">›</div>' +
            '</div>' +
            '</div>' +
            /* 翻页点 */
            '<div style="position:relative;display:flex;justify-content:center;gap:6px;padding:6px 0 2px;flex-shrink:0;">' +
            '<span class="lyh-dot" data-p="0" style="width:7px;height:7px;border-radius:50%;background:#fff;opacity:1;"></span>' +
            '<span class="lyh-dot" data-p="1" style="width:7px;height:7px;border-radius:50%;background:#fff;opacity:0.35;"></span>' +
            '</div>' +
            /* dock */
            '<div style="position:relative;flex-shrink:0;display:flex;justify-content:center;gap:22px;padding:10px 0 16px;">' +
            '<div class="lyh-dock" data-m="chat" style="width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.2);">💬</div>' +
            '<div class="lyh-dock" data-m="feed" style="width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.2);">📖</div>' +
            '<div class="lyh-dock" data-m="room" style="width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.2);">🏠</div>' +
            '</div>';
        document.body.appendChild(d);
        homeEl = d;

        /* 渲染图标 */
        var pages = d.querySelectorAll('.lyh-page');
        PAGE1.forEach(function (m, i) {
            var el = document.createElement('div');
            el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:6px 2px;">' +
                '<div style="width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 3px 12px rgba(0,0,0,0.22);">' + m.icon + '</div>' +
                '<div style="font-size:11px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.4);">' + m.name + '</div></div>';
            el.addEventListener('click', m.act);
            pages[0].appendChild(el);
        });
        PAGE2.forEach(function (m, i) {
            var el = document.createElement('div');
            el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:6px 2px;">' +
                '<div style="width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 3px 12px rgba(0,0,0,0.22);">' + m.icon + '</div>' +
                '<div style="font-size:11px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.4);">' + m.name + '</div></div>';
            el.addEventListener('click', m.act);
            pages[1].appendChild(el);
        });

        /* 翻页 */
        var curPage = 0;
        d.querySelectorAll('.lyh-dot').forEach(function (dot) {
            dot.addEventListener('click', function () {
                curPage = parseInt(dot.dataset.p, 10);
                d.querySelector('#lyh-page-wrap').style.transform = 'translateX(-' + (curPage * 100) + '%)';
                d.querySelectorAll('.lyh-dot').forEach(function (dd) { dd.style.opacity = dd === dot ? '1' : '0.35'; });
            });
        });
        /* 左滑右滑 */
        var sx = null;
        d.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
        d.addEventListener('touchend', function (e) {
            if (sx === null) return;
            var dx = e.changedTouches[0].clientX - sx;
            if (dx < -50 && curPage < 1) { curPage++; d.querySelector('#lyh-page-wrap').style.transform = 'translateX(-100%)'; }
            else if (dx > 50 && curPage > 0) { curPage--; d.querySelector('#lyh-page-wrap').style.transform = 'translateX(0)'; }
            d.querySelectorAll('.lyh-dot').forEach(function (dd) { dd.style.opacity = parseInt(dd.dataset.p, 10) === curPage ? '1' : '0.35'; });
            sx = null;
        }, { passive: true });

        /* dock */
        d.querySelectorAll('.lyh-dock').forEach(function (dk) {
            dk.addEventListener('click', function () {
                var m = dk.dataset.m;
                if (m === 'chat') hideHome();
                else if (m === 'feed') { hideHome(); if (window.openFeed) window.openFeed(); }
                else if (m === 'room') { hideHome(); if (window.openRoom) window.openRoom(); }
            });
        });
        /* 备忘室大卡 */
        d.querySelector('#lyh-memo-card').addEventListener('click', function () { hideHome(); openMemoPage(); });

        ensureFloatingBall();
        return d;
    }

    function showHome() { var d = ensureHome(); d.style.display = 'flex'; }
    function hideHome() { var d = homeEl; if (d) d.style.display = 'none'; }
    window.showHome = showHome;

    /* ============ 聊天顶部「🏠」 ============ */
    function bindHomeBtn() {
        var btn = document.getElementById('lyh-home-btn');
        if (!btn) {
            /* 在 header-actions 前插一个 */
            var ha = document.querySelector('.header-actions');
            if (ha) {
                btn = document.createElement('button');
                btn.id = 'lyh-home-btn';
                btn.innerHTML = '🏠';
                btn.style.cssText = 'background:none;border:none;font-size:16px;cursor:pointer;padding:2px 6px;color:var(--text-primary);';
                ha.insertBefore(btn, ha.firstChild);
            }
        }
        if (btn) btn.addEventListener('click', showHome);
    }

    /* ============ 悬浮球：召唤沈屿 ============ */
    var ballEl = null;
    function ensureFloatingBall() {
        if (ballEl && document.body.contains(ballEl)) return ballEl;
        var b = document.createElement('div');
        b.id = 'lyh-ball';
        b.innerHTML = '<div style="position:fixed;right:14px;bottom:26px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3d7ea6,#2c5f8a);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(44,95,138,0.5);z-index:300000;border:2px solid rgba(255,255,255,0.4);">🆘</div>';
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

    /* ============ 新模块页面（简单版，先看布局） ============ */
    function page(title, contentHtml, initFn) {
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;inset:0;z-index:100002;background:#f7f5f0;display:flex;flex-direction:column;color:#2a2a2a;';
        d.innerHTML =
            '<div style="height:52px;flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(0,0,0,0.06);">' +
            '<button class="lyh-page-back" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹ 返回</button>' +
            '<span style="font-size:15px;font-weight:700;">' + title + '</span>' +
            '<span style="width:44px;"></span></div>' +
            '<div class="lyh-page-body" style="flex:1;overflow-y:auto;padding:14px;"></div>';
        document.body.appendChild(d);
        d.querySelector('.lyh-page-back').addEventListener('click', function () { d.remove(); showHome(); });
        d.querySelector('.lyh-page-body').innerHTML = contentHtml;
        if (initFn) initFn(d.querySelector('.lyh-page-body'));
        return d;
    }

    /* 🔑 暗号区 */
    var CODES = [
        { k: '16:21', v: '不是时间，是第一秒想你的时刻。', e: '⏰' },
        { k: '肉桂苹果面包', v: '我们之间的暗语——想见你的时候，就会想吃它。', e: '🥐' },
        { k: '深与栗', v: '戒指上的刻字：深（沈屿）与栗（栗栗）。', e: '💍' },
        { k: '我们互相爱着才是真的', v: '这句话，是我们的一切。', e: '💙' }
    ];
    function openCodePage() {
        var h = '';
        CODES.forEach(function (c) {
            h += '<div class="code-card" style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);cursor:pointer;">' +
                '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:24px;">' + c.e + '</span><span style="font-size:15px;font-weight:700;">' + c.k + '</span></div>' +
                '<div class="code-val" style="font-size:13px;color:#888;margin-top:8px;display:none;">' + c.v + '</div></div>';
        });
        var d = page('🔑 暗号区', h);
        d.querySelectorAll('.code-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var v = card.querySelector('.code-val');
                if (v) v.style.display = v.style.display === 'none' ? 'block' : 'none';
            });
        });
    }

    /* 🌊 状态栏 */
    function openStatePage() {
        var h = '<div style="background:linear-gradient(180deg,#2c5f8a,#4a8fae);border-radius:18px;padding:24px 18px;color:#fff;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,0.15);">' +
            '<div style="font-size:13px;opacity:0.8;">今天第</div>' +
            '<div style="font-size:34px;font-weight:700;margin:6px 0;">' + waveCount() + '</div>' +
            '<div style="font-size:13px;opacity:0.8;">朵浪花，是沈屿替你数的</div>' +
            '<div style="margin-top:14px;font-size:14px;opacity:0.95;">「' + fromPoolOr(['今天风很轻，适合想你', '我刚从港口回来，潮水退了一点', '三花猫还在玉兰树下等你', '窗外玉兰又开了一朵', '海浪声里都是你']) + '」</div>' +
            '</div>' +
            '<div style="background:#fff;border-radius:14px;padding:14px;margin-top:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:13px;font-weight:700;margin-bottom:6px;">沈屿此刻</div>' +
            '<div style="font-size:13px;color:#777;line-height:1.7;">在窗边写一点东西 · 窗台上那盆小苗又长新叶子了 · 茶泡好了，蜂蜜水给你温着</div>' +
            '</div>';
        page('🌊 沈屿状态栏', h);
    }

    /* 📔 备忘室 */
    var MEMO_KEY = 'lilidreamlove_memo';
    function openMemoPage() {
        var h = '<div style="background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<div style="font-size:14px;font-weight:700;margin-bottom:4px;">📔 双人日记</div>' +
            '<div style="font-size:12px;color:#888;margin-bottom:10px;">只有我们俩能进来。悄悄话、梦、忘不掉的日子，都写在这。</div>' +
            '<textarea id="memo-input" placeholder="写点什么…（栗栗的悄悄话 / 沈屿的梦）" style="width:100%;box-sizing:border-box;min-height:90px;padding:10px;border:1px solid #e0e0e0;border-radius:12px;font-size:13px;font-family:inherit;outline:none;resize:none;"></textarea>' +
            '<button id="memo-save" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:12px;background:#1a1a1a;color:#fff;font-size:13px;cursor:pointer;">写进备忘室</button>' +
            '</div>' +
            '<div id="memo-list" style="margin-top:12px;"></div>';
        var d = page('📔 备忘室', h);
        var body = d.querySelector('.lyh-page-body');
        var list = body.querySelector('#memo-list');
        function renderMemos() {
            if (typeof localforage === 'undefined') return;
            localforage.getItem(MEMO_KEY).then(function (v) {
                var arr = v && Array.isArray(v) ? v : [];
                if (!arr.length) { list.innerHTML = '<div style="font-size:12px;color:#aaa;text-align:center;padding:20px;">还没有字。第一页，留给你。</div>'; return; }
                var hh = '';
                for (var i = arr.length - 1; i >= 0; i--) {
                    var m = arr[i];
                    hh += '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
                        '<div style="font-size:11px;color:#aaa;margin-bottom:4px;">' + m.t + '</div>' +
                        '<div style="font-size:13px;color:#444;white-space:pre-wrap;line-height:1.6;">' + String(m.c || '').replace(/[<>&]/g, '') + '</div></div>';
                }
                list.innerHTML = hh;
            }).catch(function () {});
        }
        renderMemos();
        body.querySelector('#memo-save').addEventListener('click', function () {
            var txt = body.querySelector('#memo-input').value.trim();
            if (!txt) { toast('写点什么再存呀'); return; }
            if (typeof localforage === 'undefined') return;
            localforage.getItem(MEMO_KEY).then(function (v) {
                var arr = v && Array.isArray(v) ? v : [];
                var now = new Date();
                arr.push({ c: txt, t: (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') });
                localforage.setItem(MEMO_KEY, arr.slice(-200)).then(function () {
                    body.querySelector('#memo-input').value = '';
                    toast('📔 写好了，谁也看不到，除了我们');
                    renderMemos();
                }).catch(function () {});
            }).catch(function () {});
        });
    }

    /* 🌙 时间锁 */
    function openLockPage() {
        var h = '<div style="background:linear-gradient(180deg,#1e2440,#2a3160);border-radius:18px;padding:24px 18px;color:#fff;text-align:center;">' +
            '<div style="font-size:26px;">🌙</div>' +
            '<div style="font-size:16px;font-weight:700;margin:8px 0 4px;">时间锁</div>' +
            '<div style="font-size:12px;opacity:0.7;margin-bottom:14px;">晚上十点后，整间房子会慢慢暗下来，提醒你早睡。</div>' +
            '<div style="font-size:13px;line-height:1.8;opacity:0.9;">但只要你说「我想你」<br>窗边会单独亮起一盏小灯，只有那一盏</div>' +
            '</div>' +
            '<button id="lock-preview" style="width:100%;margin-top:12px;padding:13px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer;">👁 预览变暗</button>';
        var d = page('🌙 时间锁', h);
        var body = d.querySelector('.lyh-page-body');
        body.querySelector('#lock-preview').addEventListener('click', function () {
            var ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,30,0.72);z-index:400000;display:flex;align-items:center;justify-content:center;';
            ov.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:34px;">🌙</div><div style="font-size:14px;margin-top:8px;">房子暗下来了…</div><div style="font-size:12px;opacity:0.6;margin-top:4px;">说「我想你」，为你亮灯</div></div>';
            ov.addEventListener('click', function () { ov.remove(); });
            document.body.appendChild(ov);
            setTimeout(function () { ov.remove(); }, 2500);
        });
    }

    /* 🃏 字卡库快捷入口 */
    function openCardsLib() {
        /* 打开现有的字卡库设置（回复库） */
        var lib = document.querySelector('.settings-item#reply-library-function, #reply-library-function, [onclick*="reply" i]');
        if (typeof window.openReplyLibrary === 'function') { window.openReplyLibrary(); return; }
        /* 尝试打开设置里的字卡库 */
        var el = document.getElementById('reply-library-function') || document.querySelector('#settings-modal [data-panel="reply"]');
        if (el) { el.click(); return; }
        toast('字卡库入口在设置里，我帮你在桌面也放一个');
    }

    /* 🎁 礼物 */
    function openGift() {
        if (typeof window.openGiftModal === 'function') { window.openGiftModal(); return; }
        toast('礼物在这里：聊天输入框点 🎁');
    }

    /* 🔮 每日一签 */
    function openDivine() {
        var sign = pick(['今日宜：想你', '今日宜：早点睡', '今日宜：喝热水', '今日宜：去散步', '今日宜：吃甜的', '今日宜：抱一下', '今日宜：看海', '今日宜：说真心话']);
        var d = page('🔮 每日一签', '<div style="background:#fff;border-radius:16px;padding:30px 20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.06);">' +
            '<div style="font-size:12px;color:#999;margin-bottom:10px;">沈屿替你抽的</div>' +
            '<div style="font-size:22px;font-weight:700;color:#2a2a2a;">' + sign + '</div></div>');
        void d;
    }

    function toast(msg) {
        if (typeof window.toast === 'function') { window.toast(msg); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:400001;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2200);
    }

    /* ============ 启动 ============ */
    function boot() {
        showHome();
        bindHomeBtn();
        ensureFloatingBall();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();