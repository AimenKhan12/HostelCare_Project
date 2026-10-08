// Dashboard page. One page for every role. The sidebar menu changes with the role.
const me = getUser();
if (!me || !localStorage.getItem('token')) location.href = '/';

// Sidebar menu for each role (add a menu item = add one name here)
const MENU = {
  resident: ['Dashboard', 'New Complaint', 'My Complaints', 'History', 'Notice Board', 'Notifications', 'Change Password'],
  staff: ['Dashboard', 'My Complaints', 'Completed Work', 'Notice Board', 'Notifications', 'Change Password'],
  admin: ['Dashboard', 'All Complaints', 'Manage Staff', 'Reports', 'Notice Board', 'Notifications', 'Change Password']
};
const ICON = { 'Dashboard': 'grid', 'New Complaint': 'plus', 'My Complaints': 'file', 'History': 'clock', 'Notice Board': 'mega', 'Notifications': 'bell', 'Change Password': 'key', 'Completed Work': 'check', 'All Complaints': 'folder', 'Manage Staff': 'users', 'Reports': 'chart' };
const CAT_ICON = { Electrical: 'zap', Plumbing: 'drop', Cleaning: 'trash', Internet: 'wifi' };
const FORM_VIEWS = ['New Complaint', 'Notice Board', 'Manage Staff', 'Change Password'];   // pages with forms: no auto refresh

let view = 'Dashboard', filter = 'All';
let data = { complaints: [], staff: [], notices: [], notes: { items: [], unread: 0 } };

const badge = s => `<span class="bd ${s.replace(' ', '-')}">${s}</span>`;
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const day = d => new Date(d).toLocaleDateString();

// Gets from the server only what the current page needs
async function load() {
  const jobs = { notes: api('/notifications') };
  if (['Dashboard', 'My Complaints', 'History', 'Completed Work', 'All Complaints', 'Reports'].includes(view)) jobs.complaints = api('/complaints');
  if (me.role === 'admin' && ['All Complaints', 'Manage Staff', 'Reports'].includes(view)) jobs.staff = api('/staff');
  if (view === 'Notice Board') jobs.notices = api('/notices');
  const keys = Object.keys(jobs);
  const results = await Promise.all(Object.values(jobs));
  keys.forEach((k, i) => data[k] = results[i]);
}

// ---------- small building blocks ----------
function cards(a) {
  const list = [['Total', a.length, 'file'], ['Pending', a.filter(c => c.status === 'Pending').length, 'clock'],
    ['In Progress', a.filter(c => c.status === 'In Progress').length, 'tool'], ['Resolved', a.filter(c => c.status === 'Resolved').length, 'check']];
  return `<div class="cards">${list.map((x, i) => `<div class="c k${i}"><em>${ic(x[2], 22)}</em><b data-n="${x[1]}">0</b><span>${x[0]}</span></div>`).join('')}</div>`;
}

function bars(rows) {                                   // rows = [[label, number]]
  const max = Math.max(1, ...rows.map(r => r[1]));
  return rows.map(r => `<div class="row"><span>${esc(r[0])}</span><div class="bar" style="width:${r[1] / max * 58 + 3}%"></div><b>${r[1]}</b></div>`).join('');
}

// Complaints table. opts.upd = status dropdown, opts.rate = rating column
function table(a, opts = {}) {
  if (!a.length) return '<div class="pn"><p class="empty">Nothing here yet.</p></div>';
  const wide = me.role !== 'resident';
  const head = `<th>#</th><th>Category</th><th>Problem</th><th>Priority</th>${wide ? '<th>Resident</th>' : ''}<th>Staff</th><th>Status</th>${opts.upd ? '<th>Update</th>' : ''}${opts.rate ? '<th>Rating</th>' : ''}`;
  const rows = a.map(c => {
    let staff = esc(c.staff_name || 'Unassigned');
    if (me.role === 'admin') {
      const same = data.staff.filter(s => s.category === c.category);
      staff = `<select onchange="act(() => api('/complaints/${c.id}/assign', 'PATCH', { staff_id: this.value }), 'Complaint reassigned')">${c.assigned_to ? '' : '<option>Unassigned</option>'}${same.map(s => `<option value="${s.id}" ${s.id === c.assigned_to ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
    }
    const upd = opts.upd ? `<td><select onchange="act(() => api('/complaints/${c.id}/status', 'PATCH', { status: this.value }), 'Status updated')">${STATUSES.map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>` : '';
    const rate = opts.rate ? `<td>${c.rating ? `<span class="st">${stars(c.rating)}</span>` : `<select onchange="act(() => api('/complaints/${c.id}/rate', 'POST', { rating: this.value }), 'Thanks for rating')"><option value="">Rate</option>${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} star${n > 1 ? 's' : ''}</option>`).join('')}</select>`}</td>` : '';
    return `<tr><td>${c.id}</td><td>${ic(CAT_ICON[c.category], 15)} ${c.category}</td><td>${esc(c.description)}<br><small>${day(c.created_at)} - Best time: ${esc(c.visit_time)}</small></td><td class="${c.priority}">${c.priority}</td>${wide ? `<td>${esc(c.resident_name)}<br><small>${esc(c.room)}</small></td>` : ''}<td>${staff}</td><td>${badge(c.status)}</td>${upd}${rate}</tr>`;
  }).join('');
  return `<div class="pn"><table><tr>${head}</tr>${rows}</table></div>`;
}

const options = list => list.map(x => `<option>${x}</option>`).join('');

// ---------- the pages ----------
function page() {
  const a = data.complaints;
  switch (view) {
    case 'Dashboard': {
      const h = new Date().getHours(), hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      const done = a.filter(c => c.status === 'Resolved').length, prog = a.filter(c => c.status === 'In Progress').length;
      const r = a.length ? Math.round(done / a.length * 100) : 0, p = a.length ? Math.round(prog / a.length * 100) : 0;
      return `<div class="hero"><div><h2>${hello}, ${esc(me.name.split(' ')[0])}</h2><p class="sub">${new Date().toDateString()}${me.role === 'staff' ? '. Showing complaints assigned to you.' : ''}</p></div>${me.role === 'resident' ? `<button class="btn" onclick="go('New Complaint')">${ic('plus', 16)} New complaint</button>` : ''}</div>
        ${cards(a)}
        <div class="g2"><div class="pn"><h3>Resolution rate</h3><div class="dnw"><div class="dn" style="background:conic-gradient(var(--ok) 0 ${r}%,#3b6bff ${r}% ${r + p}%,#f5a524 ${r + p}% 100%)"><div>${a.length ? r + '%' : '-'}</div></div>
          <div class="lgd"><div><i style="background:var(--ok)"></i>Resolved</div><div><i style="background:#3b6bff"></i>In Progress</div><div><i style="background:#f5a524"></i>Pending</div></div></div></div>
        <div class="pn"><h3>Complaints by category</h3>${bars(CATEGORIES.map(c => [c, a.filter(x => x.category === c).length]))}</div></div>
        <h3>Latest complaints</h3>${table(a.slice(0, 5))}`;
    }
    case 'New Complaint':
      return `<h2>New complaint</h2><p class="sub">It goes to the staff member with the least open work in that category.</p>
        <div class="pn fm"><label>Category</label><select id="nc">${options(CATEGORIES)}</select>
        <label>Priority</label><select id="np"><option>Normal</option><option>Urgent</option><option>Low</option></select>
        <label>Best time for a visit to your room</label><select id="nt">${options(['Anytime', 'Morning', 'Afternoon', 'Evening', 'After 5 PM'])}</select>
        <label>Describe the problem</label><textarea id="nd" rows="3" maxlength="500"></textarea>
        <button class="btn full" onclick="submitComplaint()">${ic('check', 16)} Submit complaint</button></div>`;
    case 'My Complaints':
      return `<h2>My complaints</h2><p class="sub"></p>${me.role === 'staff' ? table(a.filter(c => c.status !== 'Resolved'), { upd: true }) : table(a)}`;
    case 'History':
      return `<h2>History</h2><p class="sub">Rate the work after a complaint is resolved.</p>${table(a.filter(c => c.status === 'Resolved'), { rate: true })}`;
    case 'Completed Work':
      return `<h2>Completed work</h2><p class="sub"></p>${table(a.filter(c => c.status === 'Resolved'))}`;
    case 'All Complaints':
      return `<h2>All complaints</h2><p class="sub">Change the staff or the status from the table.</p>
        <div class="fl"><span>Show</span><select onchange="filter = this.value; render()">${['All', ...STATUSES].map(s => `<option ${s === filter ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        ${table(filter === 'All' ? a : a.filter(c => c.status === filter), { upd: true })}`;
    case 'Manage Staff':
      return `<h2>Manage staff</h2><p class="sub">Add one staff member for each category (Electrical, Plumbing...).</p>
        <div class="pn">${data.staff.length ? `<table><tr><th>Name</th><th>Email</th><th>Category</th><th>Open work</th><th></th></tr>${data.staff.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${ic(CAT_ICON[s.category], 15)} ${s.category}</td><td>${s.open_count}</td><td><button class="btn sm d" onclick="removeStaff(${s.id})">Remove</button></td></tr>`).join('')}</table>` : '<p class="empty">No staff yet. Add the first one below.</p>'}</div>
        <div class="pn fm"><h3>Add staff member</h3><label>Name</label><input id="an"><label>Email</label><input id="ae" type="email"><label>Password for this staff member</label><input id="ap" type="password"><label>Category</label><select id="ac">${options(CATEGORIES)}</select>
        <button class="btn full" onclick="addStaff()">${ic('plus', 16)} Add staff</button></div>`;
    case 'Reports': {
      const rated = a.filter(c => c.rating), avg = rated.length ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) : '-';
      return `<h2>Reports</h2><p class="sub">Average rating from residents: <b>${avg}</b> out of 5</p>${cards(a)}
        <div class="g2"><div class="pn"><h3>Complaints by category</h3>${bars(CATEGORIES.map(c => [c, a.filter(x => x.category === c).length]))}</div>
        <div class="pn"><h3>Open work per staff member</h3>${data.staff.length ? bars(data.staff.map(s => [s.name.split(' ')[0] + ' (' + s.category + ')', s.open_count])) : '<p class="empty">No staff yet.</p>'}</div></div>`;
    }
    case 'Notice Board':
      return `<h2>Notice board</h2><p class="sub"></p>${me.role === 'admin' ? `<div class="pn fm"><label>New notice</label><textarea id="nn" rows="2" maxlength="300"></textarea><button class="btn full" onclick="postNotice()">${ic('mega', 16)} Post notice</button></div>` : ''}
        <div class="pn">${data.notices.length ? data.notices.map(n => `<div class="nt">${ic('mega', 16)} ${esc(n.text)}<br><small>${day(n.created_at)}</small></div>`).join('') : '<p class="empty">No notices yet.</p>'}</div>`;
    case 'Notifications':
      return `<h2>Notifications</h2><p class="sub"></p><div class="pn">${data.notes.items.length ? data.notes.items.map(n => `<div class="nt ${n.is_read ? '' : 'u'}">${ic('bell', 16)} ${esc(n.text)}<br><small>${new Date(n.created_at).toLocaleString()}</small></div>`).join('') : '<p class="empty">No notifications yet.</p>'}</div>`;
    case 'Change Password':
      return `<h2>Change password</h2><p class="sub"></p><div class="pn fm"><label>Current password</label><input id="op" type="password"><label>New password (at least 6 characters)</label><input id="np2" type="password">
        <button class="btn full" onclick="changePassword()">${ic('key', 16)} Save password</button></div>`;
  }
}

// ---------- drawing the whole screen ----------
const bellHtml = () => `${ic('bell', 21)}${data.notes.unread ? `<i>${data.notes.unread}</i>` : ''}`;

async function render() {
  try { await load(); } catch (e) { toast(e.message); return; }
  const body = page();
  $('#root').innerHTML = `<div class="app"><aside class="side" id="sd">${LOGO}${MENU[me.role].map(m => `<a class="${m === view ? 'on' : ''}" onclick="go('${m}')"><i>${ic(ICON[m])}</i>${m}</a>`).join('')}</aside>
    <div class="main"><div class="top"><button class="ham" onclick="$('#sd').classList.toggle('open')">${ic('menu', 22)}</button><b>${me.role[0].toUpperCase() + me.role.slice(1)} portal</b><span class="sp"></span>
    <span class="bell" id="bell" onclick="go('Notifications')">${bellHtml()}</span><div class="av">${esc(me.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</div>
    <div class="who nm">${esc(me.name)}<small>${me.category || me.role}</small></div><button class="btn sm o" onclick="logout()">${ic('out', 15)} Log out</button></div>
    <div class="cont">${body}</div></div></div>`;
  document.querySelectorAll('[data-n]').forEach(el => {            // numbers count up
    const n = +el.dataset.n; let i = 0;
    const t = setInterval(() => { i++; el.textContent = Math.round(n * i / 12); if (i >= 12) clearInterval(t); }, 35);
  });
  if (view === 'Notifications' && data.notes.unread) api('/notifications/read', 'POST').catch(() => {});
}

function go(name) { view = name; render(); }

// Runs an action, shows a message, then redraws the page
async function act(fn, okMessage) {
  try { await fn(); if (okMessage) toast(okMessage); } catch (e) { toast(e.message); }
  render();
}

// ---------- forms ----------
const submitComplaint = () => act(async () => {
  await api('/complaints', 'POST', { category: $('#nc').value, priority: $('#np').value, visit_time: $('#nt').value, description: $('#nd').value });
  view = 'My Complaints';
}, 'Complaint submitted');
const addStaff = () => act(() => api('/staff', 'POST', { name: $('#an').value, email: $('#ae').value, password: $('#ap').value, category: $('#ac').value }), 'Staff added');
const removeStaff = id => confirm('Remove this staff member? Their open complaints will go to another staff member.') && act(() => api('/staff/' + id, 'DELETE'), 'Staff removed');
const postNotice = () => act(() => api('/notices', 'POST', { text: $('#nn').value }), 'Notice posted');
const changePassword = () => act(() => api('/password', 'POST', { old: $('#op').value, next: $('#np2').value }), 'Password changed');

// Live updates: every 15 seconds the page asks the server for new data
setInterval(async () => {
  if (document.hidden) return;
  if (FORM_VIEWS.includes(view)) {                                  // do not erase what the user is typing
    try { data.notes = await api('/notifications'); const b = $('#bell'); if (b) b.innerHTML = bellHtml(); } catch {}
  } else render();
}, 15000);

render();
