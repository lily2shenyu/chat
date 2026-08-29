/* =========================================================
 * 约会问答 · date-quiz
 * 触发：聊天里出现「我想约会」→ 问卷来问沈屿
 * 她管理题目（选择/填空）+ 美食图片；沈屿作答；生成约会安排卡
 * ========================================================= */
(function () {
    var KEY = 'lilidreamlove_datequiz';
    var dq = { questions: [], images: [] };
    var answers = {};

    function load() {
        if (typeof localforage === 'undefined') return;
        localforage.getItem(KEY).then(function (v) {
            if (v && typeof v === 'object') {
                if (Array.isArray(v.questions)) dq.questions = v.questions;
                if (Array.isArray(v.images)) dq.images = v.images;
            }
        }).catch(function () {});
    }
    function save() {
        if (typeof localforage !== 'undefined') localforage.setItem(KEY, dq).catch(function () {});
    }

    /* ============ 模态框 ============ */
    var modalEl = null;

    function ensureModal() {
        if (modalEl && document.body.contains(modalEl)) return modalEl;
        var d = document.createElement('div');
        d.id = 'date-quiz-modal';
        d.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;';
        d.innerHTML =
            '<div style="width:100%;max-width:560px;max-height:86vh;background:var(--secondary-bg,#fff);border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;color:var(--text-primary);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border-color);">' +
            '<span style="font-size:16px;font-weight:700;">💘 约会问答</span>' +
            '<button id="dq-close" style="background:none;border:none;color:var(--text-secondary);font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div style="display:flex;border-bottom:1px solid var(--border-color);">' +
            '<div class="dq-tab" data-tab="manage" style="flex:1;text-align:center;padding:10px 0;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-primary);border-bottom:3px solid var(--accent-color);">管理题目</div>' +
            '<div class="dq-tab" data-tab="quiz" style="flex:1;text-align:center;padding:10px 0;cursor:pointer;font-size:13px;color:var(--text-secondary);">问答</div>' +
            '<div class="dq-tab" data-tab="plans" style="flex:1;text-align:center;padding:10px 0;cursor:pointer;font-size:13px;color:var(--text-secondary);">安排卡</div>' +
            '</div>' +
            '<div id="dq-body" style="flex:1;overflow-y:auto;padding:12px 14px 20px;"></div>' +
            '</div>';
        d.addEventListener('click', function (e) { if (e.target === d) close(); });
        document.body.appendChild(d);
        modalEl = d;
        d.querySelectorAll('.dq-tab').forEach(function (t) {
            t.addEventListener('click', function () { switchTab(t.dataset.tab); });
        });
        d.querySelector('#dq-close').addEventListener('click', close);
        return d;
    }
    function open() { var d = ensureModal(); d.style.display = 'flex'; switchTab('manage'); renderAll(); }
    function close() { var d = modalEl; if (d) d.style.display = 'none'; }
    window.openDateQuiz = open;

    function switchTab(tab) {
        ensureModal();
        modalEl.querySelectorAll('.dq-tab').forEach(function (t) {
            var on = t.dataset.tab === tab;
            t.style.color = on ? 'var(--text-primary)' : 'var(--text-secondary)';
            t.style.fontWeight = on ? '600' : '400';
            t.style.borderBottom = on ? '3px solid var(--accent-color)' : '3px solid transparent';
        });
        if (tab === 'manage') renderManage();
        else if (tab === 'quiz') renderQuiz();
        else renderPlans();
    }

    /* ============ 管理题目 ============ */
    function renderManage() {
        var body = modalEl.querySelector('#dq-body');
        var h = '';
        h += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">➕ 添加选择题</div>';
        h += '<input id="dq-q" placeholder="题目，如：你想去哪里？" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;margin-bottom:6px;">';
        h += '<input id="dq-opts" placeholder="选项，用顿号分隔：海边、蓝门、小镇、电影院" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;margin-bottom:6px;">';
        h += '<button id="dq-add-choice" style="width:100%;padding:9px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;margin-bottom:14px;">添加选择题</button>';
        h += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">✏️ 添加填空题</div>';
        h += '<input id="dq-textq" placeholder="题目，如：想吃什么？" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;margin-bottom:6px;">';
        h += '<button id="dq-add-text" style="width:100%;padding:9px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;margin-bottom:14px;">添加填空题</button>';
        h += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">🍽️ 美食图片</div>';
        h += '<button id="dq-add-img" style="width:100%;padding:9px;border:1px solid var(--accent-color);border-radius:10px;background:transparent;color:var(--accent-color);font-size:13px;cursor:pointer;margin-bottom:6px;">➕ 添加图片（食物）</button>';
        h += '<div id="dq-img-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;"></div>';
        h += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">📋 已有题目（' + dq.questions.length + '）</div>';
        h += '<div id="dq-q-list"></div>';
        body.innerHTML = h;
        body.querySelector('#dq-add-choice').addEventListener('click', function () {
            var q = body.querySelector('#dq-q').value.trim();
            var opts = body.querySelector('#dq-opts').value.split(/[、,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
            if (!q || !opts.length) { toast('题目和选项都要填'); return; }
            dq.questions.push({ type: 'choice', q: q, opts: opts });
            save(); renderManage();
        });
        body.querySelector('#dq-add-text').addEventListener('click', function () {
            var q = body.querySelector('#dq-textq').value.trim();
            if (!q) { toast('题目不能为空'); return; }
            dq.questions.push({ type: 'text', q: q });
            save(); renderManage();
        });
        body.querySelector('#dq-add-img').addEventListener('click', function () {
            var inp = document.createElement('input');
            inp.type = 'file'; inp.accept = 'image/*';
            inp.onchange = function (e) {
                var f = e.target.files[0]; if (!f) return;
                if (f.size > 2 * 1024 * 1024) { toast('图片别超过2MB'); return; }
                var r = new FileReader();
                r.onload = function (ev) { dq.images.push(ev.target.result); save(); renderManage(); };
                r.readAsDataURL(f);
            };
            inp.click();
        });
        renderImgList(body);
        renderQList(body);
    }
    function renderImgList(body) {
        var list = body.querySelector('#dq-img-list');
        list.innerHTML = dq.images.map(function (img, i) {
            return '<div style="position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;">' +
                '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover;">' +
                '<span onclick="window.__dqDelImg(' + i + ')" style="position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</span></div>';
        }).join('') || '<span style="font-size:11px;color:var(--text-secondary);opacity:0.7;">还没有美食图，加一张想吃的吧～</span>';
    }
    window.__dqDelImg = function (i) {
        if (i >= 0 && i < dq.images.length) { dq.images.splice(i, 1); save(); renderManage(); }
    };
    function renderQList(body) {
        var list = body.querySelector('#dq-q-list');
        if (!dq.questions.length) { list.innerHTML = '<span style="font-size:11px;color:var(--text-secondary);opacity:0.7;">还没有题目，先出几道吧～</span>'; return; }
        list.innerHTML = dq.questions.map(function (q, i) {
            var meta = q.type === 'choice' ? '（选择）' + q.opts.join('、') : '（填空）';
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:6px;background:var(--primary-bg);font-size:13px;">' +
                '<span style="flex:1;word-break:break-word;">' + q.q.replace(/[<>&]/g, '') + '<br><small style="color:var(--text-secondary);">' + meta.replace(/[<>&]/g, '') + '</small></span>' +
                '<span onclick="window.__dqDelQ(' + i + ')" style="cursor:pointer;color:var(--text-secondary);">✕</span></div>';
        }).join('');
    }
    window.__dqDelQ = function (i) {
        if (i >= 0 && i < dq.questions.length) { dq.questions.splice(i, 1); save(); renderManage(); }
    };

    /* ============ 问答：她出题 → 设回复时间 → 到点我回信 ============ */
    function renderQuiz() {
        var body = modalEl.querySelector('#dq-body');
        if (!dq.questions.length) {
            body.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--text-secondary);font-size:13px;">还没有题目。<br>去「管理题目」出几道题吧～</div>';
            return;
        }
        var h = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.6;">💌 把这份问卷寄给我，我会像回信一样答好，送到你面前。</div>';
        h += dq.questions.map(function (q, i) {
            if (q.type === 'choice') {
                return '<div style="font-size:14px;font-weight:600;margin:8px 0 4px;">' + (i + 1) + '. ' + q.q.replace(/[<>&]/g, '') + '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">选项：' + q.opts.map(function (o) { return o.replace(/[<>&]/g, ''); }).join('、') + '</div>';
            }
            return '<div style="font-size:14px;font-weight:600;margin:8px 0 4px;">' + (i + 1) + '. ' + q.q.replace(/[<>&]/g, '') + '（填空题，我会从字卡里答）</div>';
        }).join('');
        if (dq.images.length) {
            h += '<div style="font-size:12px;color:var(--text-secondary);margin:8px 0 4px;">🍽️ 美食图片（我会挑一张想吃的小图放进行）</div>';
            h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">' + dq.images.map(function (img, i) {
                return '<img src="' + img + '" style="width:52px;height:52px;border-radius:8px;object-fit:cover;">';
            }).join('') + '</div>';
        }
        h += '<div style="font-size:13px;font-weight:700;margin:14px 0 6px;">⏰ 回复时间（30秒 ~ 24小时）</div>';
        h += '<input type="range" id="dq-delay" min="0.5" max="1440" step="0.5" value="5" style="width:100%;accent-color:var(--accent-color);">';
        h += '<div style="text-align:center;font-size:13px;color:var(--text-primary);margin:6px 0 10px;"><span id="dq-delay-txt">5 分钟</span> 后回信</div>';
        h += '<button id="dq-send" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">💌 寄出问卷，等我回信</button>';
        body.innerHTML = h;
        var slider = body.querySelector('#dq-delay');
        var txt = body.querySelector('#dq-delay-txt');
        function fmt(v) {
            if (v < 1) return '30 秒';
            if (v < 60) return Math.round(v) + ' 分钟';
            return (v / 60).toFixed(v % 60 === 0 ? 0 : 1) + ' 小时';
        }
        slider.addEventListener('input', function () { txt.textContent = fmt(parseFloat(slider.value)); });
        body.querySelector('#dq-send').addEventListener('click', function () {
            var delayMin = parseFloat(slider.value);
            var due = Date.now() + (delayMin < 1 ? 30 : delayMin * 60) * 1000;
            localStorage.setItem('lilidreamlove_dq_pending', String(due));
            toast('💌 问卷寄出啦，到点我回信');
            close();
            ensureTimer();
        });
    }

    /* 定时检查：到点自动回信 */
    var timerOn = false;
    function ensureTimer() {
        if (timerOn) return;
        timerOn = true;
        setInterval(function () {
            var due = parseInt(localStorage.getItem('lilidreamlove_dq_pending') || '0', 10);
            if (!due || Date.now() < due) return;
            localStorage.removeItem('lilidreamlove_dq_pending');
            buildPlanAuto();
        }, 5000);
    }

    function buildPlanAuto() {
        var lines = [];
        var food = dq.images.length ? dq.images[Math.floor(Math.random() * dq.images.length)] : null;
        var cardPool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) ? customReplies : [];
        dq.questions.forEach(function (q) {
            if (q.type === 'choice') {
                var pick = q.opts[Math.floor(Math.random() * q.opts.length)];
                lines.push(q.q + '：' + (pick || '—'));
            } else {
                var card = cardPool.length ? String(cardPool[Math.floor(Math.random() * cardPool.length)]) : '（字卡库空的，先填一句吧）';
                lines.push(q.q + '：' + card);
            }
        });
        var summary = '💘 约会安排\n' + lines.join('\n');
        var plan = { time: Date.now(), text: summary, image: food };

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: settings.partnerName || '对方',
                text: summary,
                image: food || '',
                timestamp: new Date(),
                status: 'received',
                favorited: false,
                note: null,
                type: 'date'
            });
            playSound('message');
            throttledSaveData();
            if (typeof window._sendPartnerNotification === 'function') {
                window._sendPartnerNotification(settings.partnerName || '对方', '💘 约会安排好啦，我回信了');
            }
        }
        var plans = [];
        try { plans = JSON.parse(localStorage.getItem('lilidreamlove_dateplans') || '[]'); } catch (e) {}
        plans.unshift(plan);
        plans = plans.slice(0, 10);
        localStorage.setItem('lilidreamlove_dateplans', JSON.stringify(plans));
        toast('💘 我回信啦，去看约会安排');
    }
    function renderPlans() {
        var body = modalEl.querySelector('#dq-body');
        var plans = [];
        try { plans = JSON.parse(localStorage.getItem('lilidreamlove_dateplans') || '[]'); } catch (e) {}
        if (!plans.length) { body.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--text-secondary);font-size:13px;">还没有约会安排。<br>去「问答」答一份吧～</div>'; return; }
        body.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">📅 我们的约会安排</div>' +
            plans.map(function (p) {
                var img = p.image ? '<img src="' + p.image + '" style="width:100%;border-radius:10px;margin-top:8px;max-height:140px;object-fit:cover;">' : '';
                return '<div style="padding:12px;border:1px solid var(--border-color);border-radius:14px;margin-bottom:10px;background:var(--primary-bg);white-space:pre-wrap;font-size:13px;line-height:1.7;">' + p.text.replace(/[<>&]/g, '') + img + '</div>';
            }).join('');
    }

    function toast(msg) {
        if (typeof showNotification === 'function') showNotification(msg, 'info', 2500);
    }

    /* ============ 信封快速入口 ============ */
    window.openEnvelopeQuick = function () {
        var m = document.getElementById('envelope-modal');
        if (m && typeof showModal === 'function') showModal(m);
        else toast('信封模块未就绪');
    };

    /* ============ 触发：聊天里出现「我想约会」 ============ */
    window.__dqMaybeTrigger = function (text) {
        if (!text) return;
        if (/我想约会|想约会/.test(text)) {
            setTimeout(function () {
                toast('💘 想约会？来选一份安排吧');
                setTimeout(open, 500);
            }, 400);
        }
    };

    /* 高级工具中心里的「约会问答」入口 */
    function bindAdvancedEntry() {
        var el = document.getElementById('date-quiz-function');
        if (el) el.addEventListener('click', open);
    }

    load();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bindAdvancedEntry(); });
    else bindAdvancedEntry();
})();