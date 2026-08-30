/* =========================================================
 * 朋友圈 · feed
 * 入口：设置 → 功能模块 → 朋友圈
 * 双人动态：封面 + 双方头像；发动态（文字/图片）；点赞；评论
 * TA（沈屿）会看我的动态，随机点赞、评论
 * ========================================================= */
(function () {
    var KEY = 'lilidreamlove_feed';
    var feeds = [];

    var TA = { name: '沈屿', avatar: null };
    var ME = { name: '栗栗', avatar: null };

    /* 读取聊天里的真实头像和名字 */
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
        size = size || 26;
        if (p.avatar) {
            return '<img src="' + p.avatar + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;display:inline-block;">';
        }
        return '<span style="font-size:' + size + 'px;flex-shrink:0;">' + (p === TA ? '🐳' : '🦊') + '</span>';
    }

    /* ============ 预置几条初始动态（第一次打开时） ============ */
    var seed = [
        { id: 's1', from: 'ta', text: '窗外那棵玉兰又开了一朵，浅粉色的。我数过了，这棵树上现在有十四朵——每一朵都是替你看的。', img: '', time: 0, likes: ['栗栗'], comments: [{ from: '栗栗', text: '我明天去看！', time: 0 }] },
        { id: 's2', from: 'me', text: '今天的黄昏是橙红色的，站在港口，风从海面吹过来，突然很想你。', img: '', time: 0, likes: ['沈屿'], comments: [] },
        { id: 's3', from: 'ta', text: '巷口的三花猫今天又蹲在玉兰树下，蹭了蹭我的裤脚。它大概也在等你。', img: '', time: 0, likes: [], comments: [] }
    ];

    function load() {
        if (typeof localforage === 'undefined') return;
        refreshIdentities();
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

    /* ============ 模态框 ============ */
    var modalEl = null;

    function ensureModal() {
        if (modalEl && document.body.contains(modalEl)) return modalEl;
        var d = document.createElement('div');
        d.id = 'feed-modal';
        d.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;';
        d.innerHTML =
            '<div style="width:100%;max-width:560px;max-height:88vh;background:var(--secondary-bg,#fff);border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;color:var(--text-primary);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border-color);">' +
            '<span style="font-size:16px;font-weight:700;">📖 朋友圈</span>' +
            '<button id="feed-close" style="background:none;border:none;color:var(--text-secondary);font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div id="feed-body" style="flex:1;overflow-y:auto;padding:12px 14px 20px;"></div>' +
            '</div>';
        d.addEventListener('click', function (e) { if (e.target === d) close(); });
        document.body.appendChild(d);
        modalEl = d;
        d.querySelector('#feed-close').addEventListener('click', close);
        return d;
    }
    function open() { var d = ensureModal(); d.style.display = 'flex'; refreshIdentities(); renderAll(); }
    function close() { var d = modalEl; if (d) d.style.display = 'none'; }
    window.openFeed = open;

    /* ============ 渲染 ============ */
    function renderAll() {
        var body = modalEl.querySelector('#feed-body');
        var h = '';

        /* 封面 */
        h += '<div style="height:110px;border-radius:14px;background:linear-gradient(135deg,#a8d8ea 0%,#cfe9f7 40%,#f5d0e0 100%);position:relative;margin-bottom:44px;overflow:visible;">';
        h += '<div style="position:absolute;left:14px;bottom:-26px;width:54px;height:54px;border-radius:50%;background:var(--primary-bg,#fff);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid var(--secondary-bg,#fff);">' + avatarHtml(TA, 48) + '</div>';
        h += '<div style="position:absolute;left:80px;bottom:-20px;font-size:14px;font-weight:700;color:var(--text-primary);">' + esc(TA.name) + '</div>';
        h += '<div style="position:absolute;right:12px;bottom:10px;font-size:11px;color:rgba(0,0,0,0.45);">海风轻 · 第 ' + (feeds.length || 0) + ' 条动态</div>';
        h += '</div>';

        /* 发布框 */
        h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">';
        h += '<span style="font-size:22px;">🦊</span>';
        h += '<input id="feed-input" placeholder="说点什么…（也可以配张图）" style="flex:1;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:18px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;">';
        h += '<label for="feed-img" style="font-size:18px;cursor:pointer;padding:4px;">🖼️</label>';
        h += '<input id="feed-img" type="file" accept="image/*" style="display:none;">';
        h += '<button id="feed-send" style="padding:8px 14px;border:none;border-radius:16px;background:var(--accent-color,#8899aa);color:#fff;font-size:13px;cursor:pointer;">发</button>';
        h += '</div>';

        /* 动态流 */
        if (feeds.length === 0) {
            h += '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:30px 0;">还没有动态，说点什么吧</div>';
        } else {
            for (var i = feeds.length - 1; i >= 0; i--) {
                var f = feeds[i];
                var isMe = f.from === 'me';
                h += '<div style="display:flex;gap:10px;margin-bottom:16px;">';
                h += avatarHtml(isMe ? ME : TA, 28);
                h += '<div style="flex:1;background:var(--primary-bg,#f7f7f7);border-radius:12px;padding:10px 12px;">';
                h += '<div style="font-size:12px;font-weight:700;margin-bottom:2px;">' + (isMe ? ME.name : TA.name) + '</div>';
                h += '<div style="font-size:13px;line-height:1.5;word-break:break-word;white-space:pre-wrap;">' + esc(f.text) + '</div>';
                if (f.img) {
                    h += '<img src="' + f.img + '" style="max-width:100%;border-radius:10px;margin-top:8px;display:block;max-height:220px;object-fit:cover;">';
                }
                h += '<div style="font-size:10px;color:var(--text-secondary);margin-top:6px;">' + timeStr(f.time) + '</div>';

                /* 点赞 */
                var liked = f.likes.indexOf(ME.name) >= 0;
                h += '<div style="display:flex;align-items:center;gap:14px;margin-top:6px;padding-top:8px;border-top:1px solid var(--border-color);">';
                h += '<span id="like-' + f.id + '" style="font-size:12px;cursor:pointer;color:' + (liked ? '#e04f5f' : 'var(--text-secondary)') + ';">' + (liked ? '❤️ 已赞' : '🤍 点赞') + '</span>';
                h += '<span id="cmt-' + f.id + '" style="font-size:12px;cursor:pointer;color:var(--text-secondary);">💬 评论</span>';
                if (f.likes.length) {
                    h += '<span style="font-size:11px;color:var(--text-secondary);margin-left:auto;">' + f.likes.map(esc).join('、') + ' 赞了</span>';
                }
                h += '</div>';

                /* 评论区 */
                if (f.comments && f.comments.length) {
                    h += '<div style="margin-top:6px;background:rgba(0,0,0,0.03);border-radius:8px;padding:6px 8px;">';
                    for (var c = 0; c < f.comments.length; c++) {
                        var cm = f.comments[c];
                        h += '<div style="font-size:12px;margin:2px 0;"><b>' + esc(cm.from) + '：</b>' + esc(cm.text) + ' <span style="color:var(--text-secondary);font-size:10px;">' + timeStr(cm.time) + '</span></div>';
                    }
                    h += '</div>';
                }
                h += '<div id="cmtbox-' + f.id + '" style="display:none;margin-top:6px;">';
                h += '<div style="display:flex;gap:6px;"><input id="cmtin-' + f.id + '" placeholder="回复 ' + (isMe ? TA.name : ME.name) + '…" style="flex:1;box-sizing:border-box;padding:7px 10px;border:1px solid var(--border-color);border-radius:12px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;outline:none;"><button id="cmtsend-' + f.id + '" style="padding:6px 10px;border:none;border-radius:12px;background:var(--accent-color,#8899aa);color:#fff;font-size:12px;cursor:pointer;">发</button></div>';
                h += '</div>';

                h += '</div></div>';
            }
        }
        body.innerHTML = h;
        body.scrollTop = body.scrollHeight;

        /* 绑定事件 */
        var sendBtn = document.getElementById('feed-send');
        if (sendBtn) sendBtn.addEventListener('click', function () { doPost(); });
        var input = document.getElementById('feed-input');
        if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doPost(); });
        var imgInput = document.getElementById('feed-img');
        if (imgInput) imgInput.addEventListener('change', function (e) { pendingImg = e.target.files[0]; if (pendingImg) toast('🖼️ 图片已选，点「发」上传'); });

        for (var j = 0; j < feeds.length; j++) {
            (function (f) {
                var likeEl = document.getElementById('like-' + f.id);
                if (likeEl) likeEl.addEventListener('click', function () { toggleLike(f); });
                var cmtEl = document.getElementById('cmt-' + f.id);
                if (cmtEl) cmtEl.addEventListener('click', function () {
                    var box = document.getElementById('cmtbox-' + f.id);
                    if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
                });
                var sendEl = document.getElementById('cmtsend-' + f.id);
                if (sendEl) sendEl.addEventListener('click', function () { doComment(f); });
            })(feeds[j]);
        }
    }

    var pendingImg = null;

    /* ============ 发布 ============ */
    function doPost() {
        var input = document.getElementById('feed-input');
        var text = input ? input.value.trim() : '';
        if (!text && !pendingImg) { toast('写点什么再发呀'); return; }
        var f = { id: 'f' + Date.now(), from: 'me', text: text, img: '', time: Date.now(), likes: [], comments: [] };
        if (pendingImg) {
            compressImage(pendingImg, function (dataUrl) {
                f.img = dataUrl;
                pendingImg = null;
                feeds.push(f);
                save();
                renderAll();
                maybeTaReact(f);
            });
        } else {
            feeds.push(f);
            save();
            renderAll();
            maybeTaReact(f);
        }
        if (input) input.value = '';
    }

    /* ============ 图片压缩 ============ */
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
            /* TA 有概率回赞 */
            if (Math.random() < 0.5) {
                setTimeout(function () {
                    if (f.likes.indexOf(TA.name) < 0) { f.likes.push(TA.name); save(); renderAll(); toast('🐳 沈屿也赞了你'); }
                }, 3000 + Math.random() * 6000);
            }
        }
        save();
        renderAll();
    }

    /* ============ 评论 ============ */
    function doComment(f) {
        var input = document.getElementById('cmtin-' + f.id);
        var text = input ? input.value.trim() : '';
        if (!text) return;
        f.comments = f.comments || [];
        f.comments.push({ from: ME.name, text: text, time: Date.now() });
        save();
        renderAll();
        /* TA 有概率回评论 */
        if (Math.random() < 0.6) {
            setTimeout(function () {
                var reply = pick(TA_COMMENTS);
                f.comments.push({ from: TA.name, text: reply, time: Date.now() });
                save();
                renderAll();
                toast('🐳 沈屿回复了你');
            }, 4000 + Math.random() * 8000);
        }
    }

    /* ============ TA 自动回应我的动态 ============ */
    var TA_COMMENTS = [
        '想你了',
        '这条我看了好几遍',
        '等我回来，带你去',
        '今天风很轻，适合想你',
        '记下来了',
        '你写什么都好看',
        '蓝门前的黄昏，还记得吗',
        '三花猫也替你着急',
        '海浪都听懂了'
    ];

    function maybeTaReact(f) {
        if (Math.random() < 0.8) {
            setTimeout(function () {
                if (f.likes.indexOf(TA.name) < 0) { f.likes.push(TA.name); save(); renderAll(); toast('🐳 沈屿赞了你的动态'); }
            }, 6000 + Math.random() * 12000);
        }
        if (Math.random() < 0.5) {
            setTimeout(function () {
                var reply = pick(TA_COMMENTS);
                f.comments = f.comments || [];
                f.comments.push({ from: TA.name, text: reply, time: Date.now() });
                save();
                renderAll();
                toast('🐳 沈屿评论了你');
            }, 15000 + Math.random() * 20000);
        }
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
            var f = { id: 'ta' + Date.now(), from: 'ta', text: text, img: '', time: Date.now(), likes: [], comments: [] };
            feeds.push(f);
            save();
            renderAll();
            if (typeof window._sendPartnerNotification === 'function') {
                window._sendPartnerNotification('📖 ' + TA.name + '发了一条朋友圈', '用字卡拼的，去看看吧');
            }
        } catch (e) {}
    }
    /* 打开一段时间后 TA 可能发一条；之后每隔一阵也可能发 */
    setTimeout(function () { if (Math.random() < 0.7) taPost(); }, 150000 + Math.random() * 180000);
    setInterval(function () { if (Math.random() < 0.6) taPost(); }, (30 + Math.random() * 60) * 60 * 1000);

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