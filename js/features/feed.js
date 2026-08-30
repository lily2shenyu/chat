/* =========================================================
 * 朋友圈 · feed（Eternelle 式全屏排版）
 * 入口：设置 → 功能模块 → 朋友圈
 * 排版参考 Eternelle：全屏页面 = 顶栏 + 大封面 + 灰底白卡片动态流
 * 写作参考 Eternelle：TA（梦角）用字卡拼接发动态 + 从字卡库抽评论
 * 头像用聊天里的真实头像；发动态/TA回应有通知
 * ========================================================= */
(function () {
    var KEY = 'lilidreamlove_feed';
    var BG_KEY = 'lilidreamlove_feed_bg';
    var feeds = [];
    var feedBg = null;

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
        if (p.avatar) {
            return '<img src="' + p.avatar + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;display:block;">';
        }
        return '<span style="font-size:' + (size - 4) + 'px;display:flex;align-items:center;justify-content:center;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#f0f2f5;">' + (p === TA ? '🐳' : '🦊') + '</span>';
    }

    /* 初始动态（第一次打开时） */
    var seed = [
        { id: 's1', from: 'ta', text: '窗外那棵玉兰又开了一朵，浅粉色的。我数过了，这棵树上现在有十四朵——每一朵都是替你看的。', img: '', time: 0, likes: ['栗栗'], comments: [{ from: '栗栗', text: '我明天去看！', time: 0 }] },
        { id: 's2', from: 'me', text: '今天的黄昏是橙红色的，站在港口，风从海面吹过来，突然很想你。', img: '', time: 0, likes: ['沈屿'], comments: [] },
        { id: 's3', from: 'ta', text: '巷口的三花猫今天又蹲在玉兰树下，蹭了蹭我的裤脚。它大概也在等你。', img: '', time: 0, likes: [], comments: [] }
    ];

    function load() {
        if (typeof localforage === 'undefined') return;
        refreshIdentities();
        loadBg();
        localforage.getItem(KEY).then(function (v) {
            if (v && Array.isArray(v)) {
                feeds = v;
            } else {
                var now = Date.now();
                for (var i = 0; i < seed.length; i++) {
                    var s = seed[i];
                    s.time = now - (i + 1) * 3600 * 1000;
                    if (s.likes) s.likes = s.likes.map(function (n) { return n === '栗栗' ? ME.name : (n === '沈屿' ? TA.name : n); });
                    if (s.comments) {
                        for (var j = 0; j < s.comments.length; j++) {
                            s.comments[j].from = s.comments[j].from === '栗栗' ? ME.name : (s.comments[j].from === '沈屿' ? TA.name : s.comments[j].from);
                            s.comments[j].time = s.time + 60000;
                        }
                    }
                    feeds.push(s);
                }
                save();
            }
            renderAll();
        }).catch(function () {});
    }
    function save() {
        if (typeof localforage !== 'undefined') localforage.setItem(KEY, feeds).catch(function () {});
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '"', "'": '&#39;' }[c];
        });
    }
    function timeStr(t) {
        if (!t) return '';
        var diff = Date.now() - t;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        var d = new Date(t);
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    /* ============ 全屏页面 ============ */
    var pageEl = null;

    function ensurePage() {
        if (pageEl && document.body.contains(pageEl)) return pageEl;
        var d = document.createElement('div');
        d.id = 'feed-page';
        d.style.cssText = 'position:fixed;inset:0;z-index:100002;background:#f0f2f5;display:flex;flex-direction:column;color:var(--text-primary,#1a1a1a);';
        d.innerHTML =
            /* 顶栏 */
            '<div style="height:52px;flex-shrink:0;background:#ffffff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(0,0,0,0.06);">' +
            '<button id="feed-back" style="background:none;border:none;font-size:17px;color:#555;padding:8px;cursor:pointer;">‹ 返回</button>' +
            '<span style="font-size:16px;font-weight:700;">朋友圈</span>' +
            '<button id="feed-pub" style="background:none;border:none;font-size:14px;color:#1a1a1a;padding:8px;cursor:pointer;font-weight:600;">✎ 发布</button>' +
            '</div>' +
            /* 封面：自己的头像在右边 + 可自定义背景 */
            '<div id="feed-cover" style="flex-shrink:0;height:150px;background:linear-gradient(135deg,#a8d8ea 0%,#cfe9f7 45%,#f5d0e0 100%);position:relative;background-size:cover;background-position:center;cursor:pointer;">' +
            '<span style="position:absolute;top:10px;right:12px;font-size:13px;background:rgba(0,0,0,0.25);border-radius:12px;padding:4px 9px;color:#fff;">📷 换背景</span>' +
            '<div style="position:absolute;right:14px;bottom:-24px;display:flex;align-items:center;gap:10px;">' +
            '<span id="feed-cover-name" style="font-size:17px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.3);"></span>' +
            '<span id="feed-cover-av" style="width:56px;height:56px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.12);"></span>' +
            '</div>' +
            '<input id="feed-bg-file" type="file" accept="image/*" style="display:none;">' +
            '</div>' +
            /* 内容区 */
            '<div id="feed-body" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:36px 12px 20px;background:#f0f2f5;"></div>';
        d.addEventListener('click', function (e) { if (e.target === d) close(); });
        document.body.appendChild(d);
        pageEl = d;
        d.querySelector('#feed-back').addEventListener('click', close);
        d.querySelector('#feed-pub').addEventListener('click', openPublish);
        var cover = d.querySelector('#feed-cover');
        if (cover) cover.addEventListener('click', function () {
            var fi = document.getElementById('feed-bg-file');
            if (fi) fi.click();
        });
        var bf = d.querySelector('#feed-bg-file');
        if (bf) bf.addEventListener('change', changeBg);
        return d;
    }
    function open() { var d = ensurePage(); d.style.display = 'flex'; refreshIdentities(); renderAll(); }
    function close() { var d = pageEl; if (d) d.style.display = 'none'; }
    window.openFeed = open;

    /* ============ 自定义背景 ============ */
    function loadBg() {
        if (typeof localforage === 'undefined') return;
        localforage.getItem(BG_KEY).then(function (v) {
            if (v) { feedBg = v; applyBg(); }
        }).catch(function () {});
    }
    function saveBg() {
        if (typeof localforage !== 'undefined') localforage.setItem(BG_KEY, feedBg).catch(function () {});
    }
    function applyBg() {
        var c = pageEl ? pageEl.querySelector('#feed-cover') : null;
        if (!c) return;
        if (feedBg) c.style.backgroundImage = 'url("' + feedBg + '")';
        else c.style.backgroundImage = '';
    }
    function changeBg() {
        var fi = document.getElementById('feed-bg-file');
        if (fi && fi.files && fi.files[0]) {
            compressImage(fi.files[0], function (url) {
                feedBg = url;
                saveBg();
                applyBg();
                toast('📷 背景已更新');
            });
        }
    }

    /* ============ 渲染 ============ */
    function renderAll() {
        var page = pageEl;
        if (!page) return;
        var avEl = page.querySelector('#feed-cover-av');
        if (avEl) avEl.innerHTML = avatarHtml(ME, 52);
        var nmEl = page.querySelector('#feed-cover-name');
        if (nmEl) nmEl.textContent = ME.name;
        applyBg();

        var body = page.querySelector('#feed-body');
        var h = '';

        if (feeds.length === 0) {
            h += '<div style="text-align:center;color:#999;font-size:13px;padding:40px 0;">还没有动态，点右上角发布吧</div>';
        } else {
            for (var i = feeds.length - 1; i >= 0; i--) {
                var f = feeds[i];
                var isMe = f.from === 'me';
                var person = isMe ? ME : TA;
                h += '<div style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:12px;margin-bottom:10px;">';
                h += '<div style="display:flex;align-items:center;margin-bottom:8px;">';
                h += '<span style="margin-right:8px;">' + avatarHtml(person, 32) + '</span>';
                h += '<span style="font-size:13px;font-weight:600;color:#1a1a1a;">' + esc(person.name) + '</span>';
                h += '<span style="font-size:11px;color:#aaa;margin-left:auto;">' + timeStr(f.time) + '</span>';
                h += '</div>';
                h += '<div style="font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap;color:#2a2a2a;">' + esc(f.text) + '</div>';
                if (f.img) {
                    h += '<img src="' + f.img + '" style="max-width:100%;border-radius:10px;margin-top:8px;display:block;max-height:220px;object-fit:cover;">';
                }
                var liked = f.likes.indexOf(ME.name) >= 0;
                h += '<div style="display:flex;align-items:center;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);">';
                h += '<span id="like-' + f.id + '" style="font-size:12px;cursor:pointer;color:' + (liked ? '#e04f5f' : '#777') + ';">' + (liked ? '❤️ 已赞' : '🤍 赞') + '</span>';
                h += '<span id="cmt-' + f.id + '" style="font-size:12px;cursor:pointer;color:#777;">💬 评论</span>';
                if (f.likes.length) {
                    h += '<span style="font-size:11px;color:#999;margin-left:auto;">' + f.likes.map(esc).join('、') + ' 赞了</span>';
                }
                h += '</div>';
                if (f.comments && f.comments.length) {
                    h += '<div style="margin-top:6px;background:#f7f7f7;border-radius:8px;padding:6px 8px;">';
                    for (var c = 0; c < f.comments.length; c++) {
                        var cm = f.comments[c];
                        h += '<div style="font-size:12px;margin:2px 0;color:#555;"><b>' + esc(cm.from) + '：</b>' + esc(cm.text) + ' <span style="color:#aaa;font-size:10px;">' + timeStr(cm.time) + '</span></div>';
                    }
                    h += '</div>';
                }
                h += '<div id="cmtbox-' + f.id + '" style="display:none;margin-top:6px;">';
                h += '<div style="display:flex;gap:6px;"><input id="cmtin-' + f.id + '" placeholder="回复 ' + esc(person.name) + '…" style="flex:1;box-sizing:border-box;padding:7px 10px;border:1px solid #e0e0e0;border-radius:14px;background:#fff;color:#333;font-size:12px;outline:none;"><button id="cmtsend-' + f.id + '" style="padding:6px 12px;border:none;border-radius:14px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;">发</button></div>';
                h += '</div>';
                h += '</div>';
            }
        }
        body.innerHTML = h;

        for (var j = 0; j < feeds.length; j++) {
            (function (f) {
                var likeEl = document.getElementById('like-' + f.id);
                if (likeEl) likeEl.addEventListener('click', function () { toggleLike(f); });
                var cmtEl = document.getElementById('cmt-' + f.id);
                if (cmtEl) cmtEl.addEventListener('click', function () {
                    var box = document.getElementById('cmtbox-' + f.id);
                    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
                });
                var sendEl = document.getElementById('cmtsend-' + f.id);
                if (sendEl) sendEl.addEventListener('click', function () { doComment(f); });
            })(feeds[j]);
        }
    }

    /* ============ 发布面板（底部弹出） ============ */
    var pubEl = null;
    var pendingImg = null;

    function ensurePublish() {
        if (pubEl && document.body.contains(pubEl)) return pubEl;
        var d = document.createElement('div');
        d.id = 'feed-publish';
        d.style.cssText = 'position:fixed;inset:0;z-index:100003;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;';
        d.innerHTML =
            '<div style="width:100%;max-width:560px;max-height:88vh;background:#ffffff;border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid rgba(0,0,0,0.06);">' +
            '<button id="pub-close" style="background:none;border:none;color:#666;font-size:15px;cursor:pointer;">取消</button>' +
            '<span style="font-size:16px;font-weight:700;">发布动态</span>' +
            '<button id="pub-send" style="background:#1a1a1a;border:none;color:#fff;font-size:13px;padding:6px 14px;border-radius:16px;cursor:pointer;font-weight:600;">发布</button>' +
            '</div>' +
            '<div style="padding:12px 16px 20px;">' +
            '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
            '<span>' + avatarHtml(ME, 34) + '</span>' +
            '<textarea id="pub-text" placeholder="说点什么…" style="flex:1;min-height:70px;border:none;outline:none;font-size:14px;line-height:1.5;color:#333;resize:none;font-family:inherit;background:transparent;"></textarea>' +
            '</div>' +
            '<div id="pub-img-preview" style="display:none;margin-bottom:10px;"><img id="pub-img-pv" style="max-width:120px;max-height:120px;border-radius:10px;display:block;"></div>' +
            '<label for="pub-file" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#555;cursor:pointer;padding:6px 12px;background:#f0f2f5;border-radius:16px;">🖼️ 添加图片</label>' +
            '<input id="pub-file" type="file" accept="image/*" style="display:none;">' +
            '</div></div>';
        d.addEventListener('click', function (e) { if (e.target === d) closePublish(); });
        document.body.appendChild(d);
        pubEl = d;
        d.querySelector('#pub-close').addEventListener('click', closePublish);
        d.querySelector('#pub-send').addEventListener('click', doPost);
        var fi = d.querySelector('#pub-file');
        if (fi) fi.addEventListener('change', function (e) {
            pendingImg = e.target.files[0];
            if (pendingImg) {
                var r = new FileReader();
                r.onload = function (ev) {
                    var pv = document.getElementById('pub-img-preview');
                    var pv2 = document.getElementById('pub-img-pv');
                    if (pv && pv2) { pv.style.display = 'block'; pv2.src = ev.target.result; }
                };
                r.readAsDataURL(pendingImg);
            }
        });
        return d;
    }
    function openPublish() {
        refreshIdentities();
        var d = ensurePublish();
        d.style.display = 'flex';
        var t = d.querySelector('#pub-text');
        if (t) { t.value = ''; setTimeout(function () { t.focus(); }, 200); }
        pendingImg = null;
        var pv = document.getElementById('pub-img-preview');
        if (pv) pv.style.display = 'none';
    }
    function closePublish() { var d = pubEl; if (d) d.style.display = 'none'; pendingImg = null; }

    function doPost() {
        var input = document.getElementById('pub-text');
        var text = input ? input.value.trim() : '';
        if (!text && !pendingImg) { toast('写点什么再发呀'); return; }
        var f = { id: 'f' + Date.now(), from: 'me', text: text, img: '', time: Date.now(), likes: [], comments: [] };
        if (pendingImg) {
            compressImage(pendingImg, function (dataUrl) {
                f.img = dataUrl;
                pendingImg = null;
                feeds.push(f);
                save();
                closePublish();
                renderAll();
                maybeTaReact(f);
            });
        } else {
            feeds.push(f);
            save();
            closePublish();
            renderAll();
            maybeTaReact(f);
        }
    }

    function compressImage(file, cb) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var max = 700;
                var w = img.width, h = img.height;
                if (w > max || h > max) {
                    if (w > h) { h = Math.round(h * max / w); w = max; }
                    else { w = Math.round(w * max / h); h = max; }
                }
                var canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                cb(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /* ============ 点赞 ============ */
    function toggleLike(f) {
        var idx = f.likes.indexOf(ME.name);
        if (idx >= 0) f.likes.splice(idx, 1);
        else {
            f.likes.push(ME.name);
            if (Math.random() < 0.5) {
                setTimeout(function () {
                    if (f.likes.indexOf(TA.name) < 0) { f.likes.push(TA.name); save(); renderAll(); toast('🐳 ' + TA.name + '也赞了你'); }
                }, 3000 + Math.random() * 6000);
            }
        }
        save();
        renderAll();
    }

    /* 字卡 + emoji + 表情包混合库 */
    function allEmojis() {
        var arr = [];
        try { if (typeof CONSTANTS !== 'undefined' && CONSTANTS.REPLY_EMOJIS && Array.isArray(CONSTANTS.REPLY_EMOJIS)) arr = arr.concat(CONSTANTS.REPLY_EMOJIS); } catch (e) {}
        try { if (typeof customEmojis !== 'undefined' && Array.isArray(customEmojis)) arr = arr.concat(customEmojis); } catch (e) {}
        return arr.filter(function (s) { return String(s || '').trim(); });
    }
    function allStickers() {
        try {
            if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) {
                return stickerLibrary.filter(function (s) { return String(s || '').trim(); });
            }
        } catch (e) {}
        return [];
    }
    function randSticker() { var s = allStickers(); return s.length ? pick(s) : null; }

    /* ============ 评论（TA的评论从字卡库抽，带emoji） ============ */
    function taCommentText() {
        var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (r) { return String(r || '').trim(); })
            : [];
        var base = pool.length >= 1 ? String(pick(pool)).trim() : pick(TA_FALLBACK);
        var ems = allEmojis();
        if (ems.length && Math.random() < 0.6) {
            base = base + ' ' + pick(ems);
        }
        return base;
    }

    function doComment(f) {
        var input = document.getElementById('cmtin-' + f.id);
        var text = input ? input.value.trim() : '';
        if (!text) return;
        f.comments = f.comments || [];
        f.comments.push({ from: ME.name, text: text, time: Date.now() });
        save();
        renderAll();
        /* 她回复 TA 的动态 → TA 更大概率回复她 */
        var taReplyChance = f.from === 'ta' ? 0.85 : 0.6;
        if (Math.random() < taReplyChance) {
            setTimeout(function () {
                f.comments.push({ from: TA.name, text: taCommentText(), time: Date.now() });
                save();
                renderAll();
                toast('🐳 ' + TA.name + '回复了你');
            }, 4000 + Math.random() * 8000);
        }
    }

    var TA_FALLBACK = [
        '想你了', '这条我看了好几遍', '等我回来，带你去', '今天风很轻，适合想你',
        '记下来了', '你写什么都好看', '蓝门前的黄昏，还记得吗', '三花猫也替你着急', '海浪都听懂了'
    ];

    var TA_EMOJI = ['💙', '🌊', '🌸', '🍬', '🌙', '✨', '🐳', '🦊', '💌', '☕', '🌿', '🍓'];

    /* ============ TA 用字卡拼朋友圈（像拼信一样随机） ============ */
    function taPost() {
        try {
            var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                ? customReplies.filter(function (r) { return String(r || '').trim(); })
                : [];
            var text;
            if (pool.length >= 1) {
                var n = 1 + Math.floor(Math.random() * Math.min(3, pool.length));
                var lines = [];
                for (var i = 0; i < n; i++) lines.push(String(pool[Math.floor(Math.random() * pool.length)]).trim());
                text = lines.join(' ');
            } else {
                text = pick(['今天风很轻，适合想你', '窗外那棵玉兰又开了一朵', '港口今天落日很好看', '潮起潮落，我都在', '三花猫又在玉兰树下等你']);
            }
            /* 从字卡库混入 emoji */
            var ems = allEmojis();
            if (ems.length && Math.random() < 0.5) {
                var em = pick(ems);
                text = Math.random() < 0.4 ? em + ' ' + text : text + ' ' + em;
            }
            /* 有概率用表情包当配图 */
            var st = Math.random() < 0.35 ? randSticker() : null;
            var f = { id: 'ta' + Date.now(), from: 'ta', text: text, img: st || '', time: Date.now(), likes: [], comments: [] };
            feeds.push(f);
            save();
            renderAll();
            if (typeof window._sendPartnerNotification === 'function') {
                window._sendPartnerNotification('📖 ' + TA.name + '发了一条朋友圈', '去看看吧');
            }
        } catch (e) {}
    }
    setTimeout(function () { if (Math.random() < 0.7) taPost(); }, 150000 + Math.random() * 180000);
    setInterval(function () { if (Math.random() < 0.6) taPost(); }, (30 + Math.random() * 60) * 60 * 1000);

    /* ============ TA 自动回应我的动态 ============ */
    function maybeTaReact(f) {
        if (Math.random() < 0.8) {
            setTimeout(function () {
                if (f.likes.indexOf(TA.name) < 0) { f.likes.push(TA.name); save(); renderAll(); toast('🐳 ' + TA.name + '赞了你的动态'); }
            }, 6000 + Math.random() * 12000);
        }
        if (Math.random() < 0.5) {
            setTimeout(function () {
                f.comments = f.comments || [];
                f.comments.push({ from: TA.name, text: taCommentText(), time: Date.now() });
                save();
                renderAll();
                toast('🐳 ' + TA.name + '评论了你');
            }, 15000 + Math.random() * 20000);
        }
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function toast(msg) {
        if (typeof window.toast === 'function') { window.toast(msg); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:200000;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2200);
    }

    /* ============ 触发：聊天里提到「朋友圈」 ============ */
    window.__feedMaybeTrigger = function (text) {
        if (!text) return;
        if (/朋友圈|看看动态/.test(text)) {
            setTimeout(function () { toast('📖 一起去看看朋友圈吧'); setTimeout(open, 400); }, 300);
        }
    };

    /* 入口：设置 → 功能模块 → 朋友圈 */
    function bindAdvancedEntry() {
        var el = document.getElementById('feed-function');
        if (el) el.addEventListener('click', open);
    }

    load();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bindAdvancedEntry(); });
    else bindAdvancedEntry();
})();