// Central frontend logic for KJ Connect (localStorage-based demo)
(function () {
    const NOTICE_KEY = 'kj_notices_v1';
    const USERS_KEY = 'kj_users_v1';
    const CATS_KEY = 'kj_cats_v1';

    // Init default categories if missing
    function init() {
        if (!localStorage.getItem(CATS_KEY)) {
            const defaultCats = ['BSH','IT','COMPS','EXTC','IEEE','IET','IETE'];
            localStorage.setItem(CATS_KEY, JSON.stringify(defaultCats));
        }

        if (!localStorage.getItem(USERS_KEY)) {
            localStorage.setItem(USERS_KEY, JSON.stringify([]));
        }

        if (!localStorage.getItem(NOTICE_KEY)) {
            localStorage.setItem(NOTICE_KEY, JSON.stringify([]));
        }
    }

    function readJSON(key) { return JSON.parse(localStorage.getItem(key) || 'null'); }
    function writeJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

    // Notices
    function getNotices() { return readJSON(NOTICE_KEY) || []; }
    function saveNotices(list) { writeJSON(NOTICE_KEY, list); }

    function addNotice(notice) {
        const list = getNotices();
        notice.id = 'n_' + Date.now();
        notice.createdAt = new Date().toISOString();
        list.unshift(notice);
        saveNotices(list);
    }

    // Users
    function getUsers() { return readJSON(USERS_KEY) || []; }
    function saveUsers(list) { writeJSON(USERS_KEY, list); }

    function addUser(user) {
        const list = getUsers();
        user.id = 'u_' + Date.now();
        user.status = 'pending';
        list.unshift(user);
        saveUsers(list);
    }

    function approveUserByEmail(email) {
        const list = getUsers();
        const u = list.find(x => x.email === email);
        if (u) { u.status = 'approved'; saveUsers(list); renderPendingUsers(); }
    }

    function rejectUserByEmail(email) {
        let list = getUsers();
        list = list.filter(x => x.email !== email);
        saveUsers(list); renderPendingUsers();
    }

    // Categories
    function getCategories() { return readJSON(CATS_KEY) || []; }
    function addCategory(cat) {
        const list = getCategories();
        if (!list.includes(cat)) { list.push(cat); writeJSON(CATS_KEY, list); }
        renderCategoryList();
    }

    // Attachment helper (File -> dataURL)
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Form handler used by admin-notices.html
    async function handleNoticeForm(event) {
        event.preventDefault();
        const poster = document.getElementById('posterName')?.value || 'Admin';
        const title = document.getElementById('noticeTitle').value;
        const departments = Array.from(document.getElementById('department').selectedOptions).map(o => o.value);
        const classSel = document.getElementById('classSelect').value;
        const years = Array.from(document.getElementById('year').selectedOptions).map(o => o.value);
        const content = document.getElementById('noticeContent').value;
        const fileInput = document.getElementById('attachment');
        let attachment = null;
        if (fileInput && fileInput.files && fileInput.files[0]) {
            attachment = await readFileAsDataURL(fileInput.files[0]);
        }

        addNotice({ poster, title, departments, classSel, years, content, attachment });
        alert('Notice posted (local demo).');
        if (event.target) event.target.reset();
        renderRecentNotices();
    }

    // Renders recent notices inside admin-notices.html demo area
    function renderRecentNotices(containerSelector) {
        const list = getNotices();
        const container = document.querySelector('.notices-list') || document.body;
        if (!container) return;
        // If specific container exists, replace its innerHTML, otherwise do nothing
        if (!document.querySelector('.notices-list')) return;
        const html = list.map(n => {
            const att = n.attachment ? `<button class="reject-btn" onclick="app.viewAttachment('${n.id}')">View / Download</button>` : '';
            const dept = (n.departments || []).join(', ');
            return `
                <div class="notice-card">
                    <div class="flex-between">
                        <div>
                            <div class="notice-title">${escapeHtml(n.title)}</div>
                            <div class="notice-meta">
                                <span class="badge">${n.poster}</span>
                                <span class="badge">${dept}</span>
                                <span class="badge">${(n.years||[]).join(', ')}</span>
                            </div>
                        </div>
                        <span class="badge success">Published</span>
                    </div>
                    <p class="notice-content">${escapeHtml(n.content)}</p>
                    <div class="notice-actions">
                        <div class="seen-list"><span class="seen-item">Posted: ${new Date(n.createdAt).toLocaleString()}</span></div>
                        <div>${att}</div>
                    </div>
                </div>
            `;
        }).join('\n');
        document.querySelector('.notices-list').innerHTML = html;
    }

    // Render pending users table in admin-users.html
    function renderPendingUsers() {
        const users = getUsers().filter(u => u.status === 'pending');
        const tbody = document.getElementById('pendingUsersTbody');
        if (!tbody) return;
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.role)}</td>
                <td>${escapeHtml(u.department||u.committee||'')}</td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge pending">Pending</span></td>
                <td>
                    <button class="approve-btn" onclick="app.approveUser('${u.email}')">Approve</button>
                    <button class="reject-btn" onclick="app.rejectUser('${u.email}')">Reject</button>
                </td>
            </tr>
        `).join('\n');
    }

    // Render categories in admin-notices page
    function renderCategoryList() {
        const list = getCategories();
        const el = document.getElementById('categoryList');
        if (!el) return;
        el.innerHTML = list.map(c => `<span class="tag">${escapeHtml(c)}</span>`).join(' ');
        const sel = document.getElementById('department');
        if (sel) {
            // clear existing options but keep special ones
            const keep = [];
            for (let i = sel.options.length -1; i >=0; i--) {
                const v = sel.options[i].value;
                if (v === 'All') { keep.push(sel.options[i]); }
                sel.remove(i);
            }
            list.forEach(c => {
                const o = document.createElement('option'); o.text = c; o.value = c; sel.add(o);
            });
            keep.forEach(o => sel.add(o));
        }
    }

    // Attachment view/download
    function viewAttachment(noticeId) {
        const n = getNotices().find(x => x.id === noticeId);
        if (!n || !n.attachment) { alert('No attachment'); return; }
        const a = n.attachment;
        const win = window.open();
        if (!win) { alert('Popups blocked.'); return; }
        win.document.write(`<title>${escapeHtml(a.name)}</title>`);
        if (a.type.startsWith('image/')) {
            win.document.write(`<img src="${a.data}" style="max-width:100%;height:auto;">`);
        } else if (a.type === 'application/pdf') {
            win.document.write(`<embed src="${a.data}" type="application/pdf" width="100%" height="100%">`);
        } else {
            win.document.write(`<a href="${a.data}" download="${escapeHtml(a.name)}">Download ${escapeHtml(a.name)}</a>`);
        }
    }

    function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // Expose public API
    window.app = {
        init,
        handleNoticeForm,
        renderRecentNotices,
        renderPendingUsers,
        approveUser: approveUserByEmail,
        rejectUser: rejectUserByEmail,
        addUser,
        getCategories,
        addCategory,
        viewAttachment
    };

    // Auto-init
    init();
})();
