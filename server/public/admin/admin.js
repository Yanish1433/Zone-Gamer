// Zone Gamer admin dashboard. All user-supplied text is inserted with textContent (never innerHTML).
const $ = (id) => document.getElementById(id)
const TOKEN_KEY = 'zonegamer.admin.token'
const GAME_NAMES = { pubg: 'PUBG Mobile', freefire: 'Free Fire', efootball: 'eFootball' }
const TOURNAMENT_GAMES = ['pubg', 'freefire'] // games with hasTournament in server/src/config/games.js
const LIMIT = 25
const REFRESH_MS = 30000

const h = (tag, attrs, ...kids) => {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (v !== undefined && v !== false && v !== null) el.setAttribute(k, v === true ? '' : v)
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)))
  return el
}

const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const ago = (d) => {
  const s = Math.round((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return fmtDate(d)
}
const when = (d) => h('span', { title: fmtDate(d) }, ago(d))
const num = (n) => Number(n ?? 0).toLocaleString()
const rs = (n) => `Rs ${num(n)}`
const pill = (s) => h('span', { class: `pill ${s}` }, s)
const who = (u) => (u ? h('div', {}, u.name, h('div', { class: 'sub' }, u.email)) : '—')
const game = (id) => GAME_NAMES[id] || id || '—'

let toastTimer
function toast(msg, bad) {
  const t = $('toast')
  t.textContent = msg
  t.className = `toast${bad ? ' err' : ''}`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.add('hidden'), bad ? 5000 : 2500)
}

function copy(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => toast('Could not copy', true))
}

async function api(path, { method = 'GET', body } = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY)
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && path !== '/auth/login') {
    logout(data.error || 'Session expired, please sign in again')
    throw new Error(data.error || 'Session expired')
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

// Proof images are admin-only, so they are fetched with the token and shown from a blob URL.
async function fetchImage(id) {
  const res = await fetch(`/api/admin/uploads/${id}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}` } })
  if (!res.ok) throw new Error('Could not load the image')
  return URL.createObjectURL(await res.blob())
}

async function uploadImage(path, file) {
  const res = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': file.type, Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}` }, body: file })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Upload failed')
}

async function viewProof(id, title) {
  try {
    const url = await fetchImage(id)
    const img = h('img', { src: url, alt: title, class: 'proof' })
    showModal(h('h3', {}, title), h('a', { href: url, target: '_blank', rel: 'noopener', class: 'sub' }, 'Open full size'), img, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Close')))
    $('modal-body').classList.add('wide')
  } catch (e) {
    toast(e.message, true)
  }
}

const proofBtn = (id, label, title) => (id ? actionBtn(label, '', () => viewProof(id, title)) : h('span', { class: 'sub' }, `${label}: none`))

// Run an action, report errors as toasts, then refresh the view. The button is locked while it runs.
async function act(fn, ok, btn) {
  btn?.classList.add('busy')
  try {
    await fn()
    if (ok) toast(ok)
    await render({ quiet: true })
  } catch (e) {
    toast(e.message, true)
  } finally {
    btn?.classList.remove('busy')
  }
}

// ---- modal ----
const closeModal = () => $('modal').classList.add('hidden')
const showModal = (...nodes) => {
  $('modal-body').classList.toggle('wide', nodes.wide === true)
  $('modal-body').replaceChildren(...nodes)
  $('modal').classList.remove('hidden')
}
$('modal').addEventListener('mousedown', (e) => e.target === $('modal') && closeModal())
document.addEventListener('keydown', (e) => e.key === 'Escape' && (closeModal(), setMenu(false)))

function openModal(title, fields, onSubmit, submitLabel = 'Save', intro) {
  const form = h('form', { style: 'display:grid;gap:12px' })
  const grid = h('div', { class: 'grid2' })
  for (const f of fields) {
    const control = f.options
      ? h('select', { name: f.name }, f.options.map(([v, l]) => h('option', { value: v }, l)))
      : h('input', { name: f.name, type: f.type || 'text', value: f.value ?? '', placeholder: f.placeholder, required: f.required !== false, min: f.min, maxlength: f.max, step: f.type === 'number' ? 1 : undefined, inputmode: f.type === 'number' ? 'numeric' : undefined })
    if (f.options && f.value) control.value = f.value
    grid.append(h('label', { style: f.full ? 'grid-column:1/-1' : '' }, f.label, control, f.hint && h('span', { class: 'sub', style: 'text-transform:none;letter-spacing:0' }, f.hint)))
  }
  const err = h('p', { class: 'error', role: 'alert' })
  const submit = h('button', { class: 'btn primary', type: 'submit' }, submitLabel)
  form.append(grid, err, h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'), submit))
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    err.textContent = ''
    submit.classList.add('busy')
    try {
      await onSubmit(Object.fromEntries(new FormData(form)))
      closeModal()
      await render({ quiet: true })
    } catch (ex) {
      err.textContent = ex.message
    } finally {
      submit.classList.remove('busy')
    }
  })
  showModal(h('h3', {}, title), intro && h('p', { class: 'sub' }, intro), form)
  form.querySelector('input,select')?.focus()
}

// Replaces window.confirm. `noteLabel` adds an optional note field that is sent with the action.
function confirmAction({ title, message, label = 'Confirm', danger, noteLabel, run, done }) {
  const note = noteLabel ? h('input', { name: 'note', placeholder: noteLabel, maxlength: 200 }) : null
  const err = h('p', { class: 'error', role: 'alert' })
  const go = h('button', { class: `btn ${danger ? 'bad' : 'primary'}`, type: 'submit' }, label)
  const form = h('form', { style: 'display:grid;gap:12px' }, h('p', {}, message), note && h('label', {}, noteLabel, note), err, h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'), go))
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    go.classList.add('busy')
    try {
      await run(note?.value.trim() || '')
      closeModal()
      toast(done)
      await render({ quiet: true })
    } catch (ex) {
      err.textContent = ex.message
    } finally {
      go.classList.remove('busy')
    }
  })
  showModal(h('h3', {}, title), form)
  go.focus()
}

// ---- generic table + pager ----
function table(cols, rows, empty = 'Nothing here yet') {
  if (!rows.length) return h('div', { class: 'card empty' }, empty)
  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      {},
      h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c.head)))),
      h('tbody', {}, rows.map((r) => h('tr', {}, cols.map((c) => h('td', { class: `${c.wrap ? 'wrap' : ''}${c.head ? '' : ' act'}`, 'data-label': c.head }, c.cell(r)))))),
    ),
  )
}

const state = { tab: 'overview', skip: 0, status: '', q: '', type: '' }

function pager(total) {
  const to = Math.min(state.skip + LIMIT, total)
  if (total <= LIMIT) return h('div', { class: 'pager' }, `${total} ${total === 1 ? 'result' : 'results'}`)
  return h(
    'div',
    { class: 'pager' },
    `${state.skip + 1}–${to} of ${total}`,
    h('button', { class: 'btn sm', disabled: state.skip === 0, onclick: () => ((state.skip = Math.max(0, state.skip - LIMIT)), render()) }, '‹ Prev'),
    h('button', { class: 'btn sm', disabled: to >= total, onclick: () => ((state.skip += LIMIT), render()) }, 'Next ›'),
  )
}

function statusTabs(options) {
  return h('div', { class: 'tabs' }, ['', ...options].map((s) => h('button', { class: state.status === s ? 'on' : '', onclick: () => ((state.status = s), (state.skip = 0), render()) }, s || 'all')))
}

const query = (extra = {}) => new URLSearchParams({ limit: LIMIT, skip: state.skip, ...(state.status ? { status: state.status } : {}), ...extra }).toString()
const actionBtn = (label, cls, fn) => h('button', { class: `btn sm ${cls}`, onclick: fn }, label)
const noteLine = (n) => n && h('div', { class: 'note' }, `Note: ${n}`)

// ---- payment setup ----
let paymentReady = true
// Players cannot top up until a payment QR exists, so say so wherever an admin is likely to look.
async function paymentBanner() {
  try {
    paymentReady = (await api('/admin/settings')).hasQr
  } catch {
    return null
  }
  renderNav()
  if (paymentReady) return null
  return h(
    'div',
    { class: 'card setup', role: 'alert' },
    h('div', {}, h('b', {}, 'Payments are not set up yet'), h('p', { class: 'sub' }, 'Players see “Payments are not set up” and cannot submit a top-up until you upload your payment QR.')),
    h('button', { class: 'btn primary', onclick: () => goTo('settings') }, 'Set up payment ›'),
  )
}

// ---- views ----
const views = {
  async overview() {
    const [s, banner] = await Promise.all([api('/admin/stats'), paymentBanner()])
    const stat = (label, value, alert) => h('div', { class: `card stat${alert ? ' alert' : ''}` }, h('p', {}, label), h('b', {}, value))
    const link = (tab, status, label, n) =>
      h('button', { class: `card stat${n ? ' alert' : ''}`, onclick: () => goTo(tab, status) }, h('p', {}, label), h('b', {}, num(n)), h('span', { class: 'sub' }, n ? 'Review now ›' : 'All clear'))
    return [
      banner,
      h('h3', { class: 'section-title' }, 'Needs attention'),
      h('div', { class: 'stats' }, link('topups', 'pending', 'Pending top-ups', s.pendingTopups), link('redeems', 'pending', 'Pending redeems', s.pendingRedeems), link('challenges', 'disputed', 'Disputed matches', s.disputed)),
      h('h3', { class: 'section-title' }, 'Business'),
      h(
        'div',
        { class: 'stats' },
        stat('Players', num(s.users)),
        stat('Revenue (top-ups)', rs(s.revenue)),
        stat('Paid out', rs(s.paidOut)),
        stat('Match fees earned', `${num(s.matchFees)} pts`),
        stat('Matches played', num(s.matchesPlayed)),
        stat('Points in circulation', num(s.pointsInCirculation)),
        stat('Redeemable winnings (owed)', num(s.redeemableWinnings)),
        stat('Live 1v1 challenges', num(s.openChallenges)),
        stat('Upcoming tournaments', num(s.upcomingTournaments)),
      ),
      h('h3', { class: 'section-title' }, 'Signups by game'),
      h('div', { class: 'stats' }, Object.keys(GAME_NAMES).map((g) => stat(GAME_NAMES[g], num(s.signupsByGame[g] || 0)))),
    ]
  },

  async users() {
    const d = await api(`/admin/users?${query({ q: state.q })}`)
    return [
      table(
        [
          { head: 'Player', cell: (u) => h('div', {}, u.name, ' ', u.role === 'admin' && h('span', { class: 'pill' }, 'admin'), ' ', u.banned && pill('banned'), h('div', { class: 'sub' }, u.email)) },
          { head: 'Games', wrap: true, cell: (u) => (u.games.length ? u.games.map((g) => h('div', { class: 'sub' }, `${game(g.gameId)}: ${g.name} (${g.uid})`)) : '—') },
          { head: 'Points', cell: (u) => num(u.points) },
          { head: 'Winnings', cell: (u) => num(u.winnings) },
          { head: 'Joined', cell: (u) => when(u.createdAt) },
          {
            head: '',
            cell: (u) =>
              h(
                'div',
                { class: 'row' },
                actionBtn('Adjust', '', () =>
                  openModal(
                    `Adjust points · ${u.email}`,
                    [{ name: 'amount', label: 'Points (+ add / − remove)', type: 'number', full: true, placeholder: 'e.g. 100 or -50' }, { name: 'reason', label: 'Reason', full: true, max: 100 }],
                    (f) => api(`/admin/users/${u.id}/adjust`, { method: 'POST', body: { amount: Number(f.amount), reason: f.reason } }),
                    'Apply',
                    `Currently ${num(u.points)} points (${num(u.winnings)} redeemable). Removing points never goes below zero.`,
                  ),
                ),
                u.role !== 'admin' &&
                  actionBtn(u.banned ? 'Unban' : 'Ban', u.banned ? 'ok' : 'bad', () =>
                    confirmAction({
                      title: `${u.banned ? 'Unban' : 'Ban'} ${u.name}?`,
                      message: u.banned ? 'They will be able to log in again.' : 'They will be logged out and unable to play, top up or redeem.',
                      label: u.banned ? 'Unban' : 'Ban',
                      danger: !u.banned,
                      run: () => api(`/admin/users/${u.id}`, { method: 'PATCH', body: { banned: !u.banned } }),
                      done: u.banned ? 'Unbanned' : 'Banned',
                    }),
                  ),
              ),
          },
        ],
        d.rows,
        state.q ? `No players match “${state.q}”` : 'No players yet',
      ),
      pager(d.total),
    ]
  },

  async topups() {
    const [d, banner] = await Promise.all([api(`/admin/topups?${query()}`), paymentBanner()])
    return [
      banner,
      statusTabs(['pending', 'approved', 'rejected']),
      table(
        [
          { head: 'Player', cell: (t) => who(t.user) },
          { head: 'Points', cell: (t) => num(t.points) },
          { head: 'Amount', cell: (t) => h('b', {}, rs(t.price)) },
          { head: 'Method', cell: (t) => t.method },
          {
            head: 'Payment proof',
            cell: (t) => h('div', {}, t.reference ? h('span', { class: 'copy', title: 'Click to copy', onclick: () => copy(t.reference) }, t.reference) : h('span', { class: 'sub' }, 'no code'), h('div', {}, proofBtn(t.screenshot, 'Screenshot', `Payment · ${t.user?.email} · ${rs(t.price)}`))),
          },
          { head: 'Game', cell: (t) => game(t.gameId) },
          { head: 'Requested', cell: (t) => when(t.createdAt) },
          { head: 'Status', cell: (t) => h('div', {}, pill(t.status), noteLine(t.note)) },
          {
            head: '',
            cell: (t) =>
              t.status === 'pending' &&
              h(
                'div',
                { class: 'row' },
                actionBtn('Approve', 'ok', () =>
                  confirmAction({ title: 'Approve top-up', message: `Check the screenshot and your account first. Confirm you received ${rs(t.price)} (code ${t.reference || 'n/a'}) from ${t.user?.email}. ${num(t.points)} points will be credited.`, label: 'Credit points', noteLabel: 'Note (optional, e.g. transaction ref)', run: (note) => api(`/admin/topups/${t.id}/approve`, { method: 'POST', body: { note } }), done: 'Points credited' }),
                ),
                actionBtn('Reject', 'bad', () => confirmAction({ title: 'Reject top-up', message: `Reject ${rs(t.price)} from ${t.user?.email}? No points are credited.`, label: 'Reject', danger: true, noteLabel: 'Reason (optional)', run: (note) => api(`/admin/topups/${t.id}/reject`, { method: 'POST', body: { note } }), done: 'Rejected' })),
              ),
          },
        ],
        d.rows,
        state.status ? `No ${state.status} top-ups` : 'No top-ups',
      ),
      pager(d.total),
    ]
  },

  async redeems() {
    const d = await api(`/admin/redeems?${query()}`)
    return [
      statusTabs(['pending', 'paid', 'rejected']),
      table(
        [
          { head: 'Player', cell: (r) => who(r.user) },
          { head: 'Points', cell: (r) => num(r.points) },
          { head: 'Pay', cell: (r) => h('b', {}, rs(r.amount)) },
          { head: 'Payout to', cell: (r) => h('div', {}, h('span', { class: 'copy', title: 'Click to copy', onclick: () => copy(r.account) }, r.account), h('div', { class: 'sub' }, r.method)) },
          { head: 'Requested', cell: (r) => when(r.createdAt) },
          { head: 'Status', cell: (r) => h('div', {}, pill(r.status), noteLine(r.note)) },
          {
            head: '',
            cell: (r) =>
              r.status === 'pending' &&
              h(
                'div',
                { class: 'row' },
                actionBtn('Mark paid', 'ok', () => confirmAction({ title: 'Mark as paid', message: `Send ${rs(r.amount)} to ${r.account} (${r.method}) from the same account that receives deposits, then confirm.`, label: 'Mark paid', noteLabel: 'Note (optional, e.g. transfer ref)', run: (note) => api(`/admin/redeems/${r.id}/paid`, { method: 'POST', body: { note } }), done: 'Marked paid' })),
                actionBtn('Reject', 'bad', () => confirmAction({ title: 'Reject redeem', message: `${num(r.points)} points go back to the player as redeemable winnings.`, label: 'Reject & refund', danger: true, noteLabel: 'Reason (optional)', run: (note) => api(`/admin/redeems/${r.id}/reject`, { method: 'POST', body: { note } }), done: 'Rejected, points returned' })),
              ),
          },
        ],
        d.rows,
        state.status ? `No ${state.status} redeem requests` : 'No redeem requests',
      ),
      pager(d.total),
    ]
  },

  async challenges() {
    const d = await api(`/admin/challenges?${query()}`)
    const report = (c, side) => c.reports?.[side] || 'none'
    const resolve = (c, outcome, title, message, label) => confirmAction({ title, message, label, danger: outcome === 'refund', run: () => api(`/admin/challenges/${c.id}/resolve`, { method: 'POST', body: { outcome } }), done: 'Resolved' })
    return [
      statusTabs(['open', 'matched', 'disputed', 'completed', 'cancelled']),
      table(
        [
          { head: 'Game', cell: (c) => h('div', {}, game(c.gameId), h('div', { class: 'sub' }, c.mode)) },
          { head: 'Creator', cell: (c) => h('div', {}, who(c.creator), h('div', { class: 'sub' }, `reported: ${report(c, 'creator')}`)) },
          { head: 'Opponent', cell: (c) => (c.opponent ? h('div', {}, who(c.opponent), h('div', { class: 'sub' }, `reported: ${report(c, 'opponent')}`)) : '—') },
          { head: 'Stake', cell: (c) => h('div', {}, num(c.stake), c.payout && h('div', { class: 'sub' }, `payout ${num(c.payout)}`)) },
          { head: 'Result proof', cell: (c) => h('div', {}, proofBtn(c.shots?.creator, 'Creator', `Creator screenshot · ${c.creator?.name}`), h('div', {}, proofBtn(c.shots?.opponent, 'Opponent', `Opponent screenshot · ${c.opponent?.name}`))) },
          { head: 'Room', cell: (c) => (c.room ? h('span', { class: 'copy', title: 'Click to copy', onclick: () => copy(c.room) }, c.room) : '—') },
          { head: 'Winner', cell: (c) => (c.winner ? (c.winner === c.creator?._id ? 'Creator' : 'Opponent') : '—') },
          { head: 'Created', cell: (c) => when(c.createdAt) },
          { head: 'Status', cell: (c) => pill(c.status) },
          {
            head: '',
            cell: (c) =>
              ['disputed', 'matched'].includes(c.status) &&
              h(
                'div',
                { class: 'row' },
                actionBtn('Creator won', 'ok', () => resolve(c, 'creator', 'Creator wins', `Pay ${c.creator?.name} the pot (${num(c.stake * 2)} pts minus fee)?`, 'Award')),
                actionBtn('Opponent won', 'ok', () => resolve(c, 'opponent', 'Opponent wins', `Pay ${c.opponent?.name} the pot (${num(c.stake * 2)} pts minus fee)?`, 'Award')),
                actionBtn('Refund both', 'bad', () => resolve(c, 'refund', 'Refund both players', `Each player gets their ${num(c.stake)} point stake back. No fee is taken.`, 'Refund')),
              ),
          },
        ],
        d.rows,
        state.status ? `No ${state.status} challenges` : 'No challenges',
      ),
      pager(d.total),
    ]
  },

  async tournaments() {
    const rows = await api('/admin/tournaments')
    $('actions').replaceChildren(h('button', { class: 'btn primary', onclick: () => tournamentForm() }, '+ New tournament'))
    const set = (t, status, done) => act(() => api(`/admin/tournaments/${t.id}`, { method: 'PATCH', body: { status } }), done)
    return table(
      [
        { head: 'Tournament', cell: (t) => h('div', {}, t.name, h('div', { class: 'sub' }, `${game(t.gameId)} · ${t.map || '—'} · ${t.mode}`)) },
        { head: 'Starts', cell: (t) => h('span', { title: fmtDate(t.startsAt) }, fmtDate(t.startsAt)) },
        { head: 'Entry', cell: (t) => num(t.entry) },
        { head: 'Prize', cell: (t) => num(t.prize) },
        { head: 'Squads', cell: (t) => h('div', {}, `${t.filled}/${t.slots}`, h('div', { class: 'meter' }, h('i', { style: `width:${Math.min(100, (t.filled / t.slots) * 100)}%` }))) },
        { head: 'Status', cell: (t) => pill(t.status) },
        {
          head: '',
          cell: (t) =>
            h(
              'div',
              { class: 'row' },
              actionBtn('Squads', '', () => registrations(t)),
              !['cancelled', 'completed'].includes(t.status) && actionBtn('Edit', '', () => tournamentForm(t)),
              t.status === 'upcoming' && actionBtn('Go live', 'ok', (e) => set(t, 'live', 'Tournament is live')),
              t.status === 'live' && actionBtn('Complete', 'ok', () => confirmAction({ title: 'Complete tournament', message: 'Award prizes from the Squads list before or after completing.', label: 'Complete', run: () => api(`/admin/tournaments/${t.id}`, { method: 'PATCH', body: { status: 'completed' } }), done: 'Completed' })),
              ['upcoming', 'live'].includes(t.status) && actionBtn('Cancel', 'bad', () => confirmAction({ title: `Cancel ${t.name}`, message: `Every entry fee (${num(t.entry)} pts) is refunded to ${t.filled} squad${t.filled === 1 ? '' : 's'}. This cannot be undone.`, label: 'Cancel & refund', danger: true, run: () => api(`/admin/tournaments/${t.id}/cancel`, { method: 'POST', body: {} }), done: 'Cancelled, entries refunded' })),
            ),
        },
      ],
      rows,
      'No tournaments yet. Create one so players can register.',
    )
  },

  async settings() {
    const cur = await api('/admin/settings')
    paymentReady = cur.hasQr
    let qrUrl = null
    if (cur.hasQr) {
      // the QR is public, no token needed
      qrUrl = `/api/payment/qr?t=${Date.now()}`
    }
    const form = h('form', { class: 'card', style: 'display:grid;gap:12px;max-width:520px' })
    form.append(
      h('h3', {}, 'Payment page'),
      h('p', { class: 'sub' }, 'Players see this QR after choosing a top-up pack. They pay, then send you the payment code and a screenshot.'),
      h('label', {}, 'Account holder name', h('input', { name: 'payeeName', value: cur.payeeName, maxlength: 80, placeholder: 'Shown under the QR' })),
      h('label', {}, 'Instructions', h('input', { name: 'instructions', value: cur.instructions, maxlength: 500, placeholder: 'e.g. Pay the exact amount and keep the payment code' })),
      h('button', { class: 'btn primary', type: 'submit' }, 'Save'),
    )
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const f = Object.fromEntries(new FormData(form))
      act(() => api('/admin/settings', { method: 'PUT', body: f }), 'Saved')
    })

    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp' })
    const preview = h('img', { alt: 'Current payment QR', class: `proof${qrUrl ? '' : ' hidden'}`, style: 'max-width:260px', src: qrUrl || '' })
    const status = h('p', { class: qrUrl ? 'sub' : 'error' }, qrUrl ? 'This is the QR players see now.' : 'No QR uploaded yet. Players cannot top up until you add one.')
    file.addEventListener('change', () => {
      const f = file.files[0]
      if (!f) return
      preview.src = URL.createObjectURL(f)
      preview.classList.remove('hidden')
      status.className = 'sub'
      status.textContent = 'Preview only. Click the button below to publish it to players.'
    })
    const qr = h('div', { class: 'card', style: 'display:grid;gap:12px;max-width:520px;margin-top:16px' }, h('h3', {}, 'Payment QR'), preview, status, file)
    const saveQr = h('button', { class: 'btn primary', type: 'button' }, qrUrl ? 'Replace QR' : 'Upload QR')
    saveQr.addEventListener('click', () => {
      const f = file.files[0]
      if (!f) return toast('Choose an image first', true)
      if (f.size > 5 * 1024 * 1024) return toast('Image is over 5 MB', true)
      act(() => uploadImage('/admin/settings/qr', f), 'QR updated', saveQr)
    })
    qr.append(saveQr)
    return [form, qr]
  },

  async transactions() {
    const d = await api(`/admin/transactions?${query(state.type ? { type: state.type } : {})}`)
    return [
      table(
        [
          { head: 'When', cell: (t) => when(t.createdAt) },
          { head: 'Player', cell: (t) => who(t.user) },
          { head: 'Type', cell: (t) => t.type },
          { head: 'Description', wrap: true, cell: (t) => t.label },
          { head: 'Game', cell: (t) => game(t.gameId) },
          { head: 'Points', cell: (t) => h('b', { class: t.delta >= 0 ? 'pos' : 'neg' }, `${t.delta >= 0 ? '+' : ''}${num(t.delta)}`) },
        ],
        d.rows,
        state.type ? `No “${state.type}” transactions` : 'No transactions',
      ),
      pager(d.total),
    ]
  },
}

function tournamentForm(t) {
  const local = t ? new Date(new Date(t.startsAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
  openModal(
    t ? `Edit · ${t.name}` : 'New tournament',
    [
      { name: 'gameId', label: 'Game', options: TOURNAMENT_GAMES.map((g) => [g, game(g)]), value: t?.gameId, full: true },
      { name: 'name', label: 'Name', value: t?.name, full: true, placeholder: 'e.g. Weekend Warzone', max: 60 },
      { name: 'map', label: 'Map', value: t?.map, required: false, placeholder: 'Erangel', max: 40 },
      { name: 'mode', label: 'Mode', value: t?.mode ?? 'Squad', required: false, max: 40 },
      { name: 'startsAt', label: 'Starts', type: 'datetime-local', value: local, full: true },
      { name: 'entry', label: 'Entry (points)', type: 'number', min: 0, value: t?.entry ?? 100 },
      { name: 'prize', label: 'Prize pool', type: 'number', min: 0, value: t?.prize ?? 5000 },
      { name: 'slots', label: 'Squad slots', type: 'number', min: Math.max(1, t?.filled ?? 1), value: t?.slots ?? 25, hint: t?.filled ? `${t.filled} already registered` : undefined },
      { name: 'roomInfo', label: 'Room ID / password', hint: 'Only shown to registered squads', value: t?.roomInfo, required: false, full: true, max: 200 },
    ],
    (f) => {
      const body = { ...f, startsAt: new Date(f.startsAt).toISOString() }
      return t ? api(`/admin/tournaments/${t.id}`, { method: 'PATCH', body }) : api('/admin/tournaments', { method: 'POST', body })
    },
    t ? 'Save' : 'Create',
  )
}

async function registrations(t) {
  try {
    const rows = await api(`/admin/tournaments/${t.id}/registrations`)
    const content = rows.length
      ? table(
          [
            { head: 'Squad', cell: (r) => h('div', {}, r.team.name, h('div', { class: 'sub' }, r.user ? `${r.user.name} · ${r.user.email}` : '—')) },
            { head: 'Players', wrap: true, cell: (r) => r.team.players.join(', ') },
            {
              head: 'Prize',
              cell: (r) =>
                r.refunded
                  ? 'refunded'
                  : r.prizeAwarded
                    ? `${num(r.prizeAwarded)} paid`
                    : actionBtn('Award', 'ok', () =>
                        openModal(
                          `Prize · ${r.team.name}`,
                          [{ name: 'amount', label: 'Prize points', type: 'number', min: 1, full: true }],
                          async (f) => {
                            await api(`/admin/registrations/${r.id}/prize`, { method: 'POST', body: { amount: Number(f.amount) } })
                            toast('Prize paid')
                          },
                          'Award',
                          'Goes to the captain as redeemable winnings.',
                        ),
                      ),
            },
          ],
          rows,
        )
      : h('div', { class: 'empty' }, 'No squads registered yet')
    const nodes = [h('h3', {}, `${t.name} · squads`), content, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Close'))]
    nodes.wide = true
    showModal(...nodes)
  } catch (e) {
    toast(e.message, true)
  }
}

// ---- shell ----
const TABS = [
  ['overview', 'Overview'],
  ['users', 'Players'],
  ['topups', 'Top-ups'],
  ['redeems', 'Redeems'],
  ['challenges', '1v1 Matches'],
  ['tournaments', 'Tournaments'],
  ['transactions', 'Transactions'],
  ['settings', 'Payment settings'],
]
const DEFAULT_STATUS = { topups: 'pending', redeems: 'pending', challenges: '' }
const TX_TYPES = ['topup', 'stake', 'refund', 'win', 'entry', 'prize', 'redeem', 'admin']

function goTo(tab, status) {
  state.tab = tab
  state.skip = 0
  state.q = ''
  state.type = ''
  state.status = status ?? DEFAULT_STATUS[tab] ?? ''
  if (location.hash !== `#${tab}`) location.hash = tab
  setMenu(false)
  render()
}
window.addEventListener('hashchange', () => {
  const tab = location.hash.slice(1)
  if (tab !== state.tab && TABS.some((t) => t[0] === tab)) goTo(tab)
})

function setMenu(open) {
  $('app').classList.toggle('menu-open', open)
  $('menu').setAttribute('aria-expanded', open)
}
$('menu').addEventListener('click', () => setMenu(!$('app').classList.contains('menu-open')))
$('scrim').addEventListener('click', () => setMenu(false))

let counts = {}
function renderNav() {
  $('nav').replaceChildren(
    ...TABS.map(([id, label]) => {
      const n = counts[id]
      const setup = id === 'settings' && !paymentReady
      return h('button', { class: state.tab === id ? 'on' : '', 'aria-current': state.tab === id ? 'page' : undefined, onclick: () => goTo(id) }, label, setup ? h('span', { class: 'count', title: 'Payment QR missing' }, '!') : n ? h('span', { class: 'count' }, n) : null)
    }),
  )
}

function renderActions() {
  $('actions').replaceChildren()
  if (state.tab === 'users') {
    const input = h('input', { type: 'search', placeholder: 'Search name or email', value: state.q, 'aria-label': 'Search players' })
    let t
    input.addEventListener('input', () => {
      clearTimeout(t)
      t = setTimeout(() => ((state.q = input.value.trim()), (state.skip = 0), render({ quiet: true })), 350)
    })
    $('actions').append(input)
  } else if (state.tab === 'transactions') {
    const sel = h('select', { 'aria-label': 'Filter by type' }, h('option', { value: '' }, 'All types'), TX_TYPES.map((t) => h('option', { value: t }, t)))
    sel.value = state.type
    sel.addEventListener('change', () => ((state.type = sel.value), (state.skip = 0), render({ quiet: true })))
    $('actions').append(sel)
  }
}

let renderId = 0
// `quiet` keeps the current content on screen (no skeleton) while fresh data loads.
async function render({ quiet = false } = {}) {
  const myTab = state.tab
  const mine = ++renderId
  $('title').textContent = TABS.find((t) => t[0] === myTab)[1]
  document.title = `${$('title').textContent} · Zone Gamer Admin`
  // don't rebuild the search box while the admin is typing in it
  if (!(quiet && document.activeElement?.closest('#actions'))) renderActions()
  if (!quiet) $('view').replaceChildren(h('div', { class: 'skeleton' }, h('i'), h('i'), h('i'), h('i')))
  $('refresh').classList.add('spin')
  try {
    const content = await views[myTab]()
    if (mine !== renderId) return // a newer render took over
    $('view').replaceChildren(...[content].flat())
    $('updated').textContent = `Updated ${new Date().toLocaleTimeString([], { timeStyle: 'short' })}`
    api('/admin/stats')
      .then((s) => {
        counts = { topups: s.pendingTopups, redeems: s.pendingRedeems, challenges: s.disputed }
        renderNav()
      })
      .catch(() => {})
  } catch (e) {
    if (mine !== renderId) return
    $('view').replaceChildren(h('div', { class: 'card empty' }, e.message, h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: () => render() }, 'Try again'))))
  } finally {
    if (mine === renderId) $('refresh').classList.remove('spin')
  }
  renderNav()
}
$('refresh').addEventListener('click', () => render({ quiet: true }))

// Keep queues fresh without losing the admin's place; skipped while a dialog is open or the tab is hidden.
setInterval(() => {
  if (!$('app').classList.contains('hidden') && $('modal').classList.contains('hidden') && !document.hidden) render({ quiet: true })
}, REFRESH_MS)

function logout(message) {
  sessionStorage.removeItem(TOKEN_KEY)
  $('app').classList.add('hidden')
  $('login').classList.remove('hidden')
  $('login-note').textContent = typeof message === 'string' ? message : ''
  closeModal()
}
$('logout').addEventListener('click', () => logout())

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = Object.fromEntries(new FormData(e.target))
  const btn = e.target.querySelector('button[type=submit]')
  $('login-error').textContent = ''
  btn.classList.add('busy')
  try {
    const data = await api('/auth/login', { method: 'POST', body: f })
    if (data.user.role !== 'admin') throw new Error('This account is not an admin')
    sessionStorage.setItem(TOKEN_KEY, data.token)
    e.target.reset()
    start()
  } catch (ex) {
    $('login-error').textContent = ex.message
  } finally {
    btn.classList.remove('busy')
  }
})

async function start() {
  if (!sessionStorage.getItem(TOKEN_KEY)) return logout()
  try {
    const me = await api('/auth/me')
    if (me.user.role !== 'admin') throw new Error('This account is not an admin')
  } catch (e) {
    return logout(e.message)
  }
  const tab = location.hash.slice(1)
  if (TABS.some((t) => t[0] === tab)) {
    state.tab = tab
    state.status = DEFAULT_STATUS[tab] ?? ''
  }
  $('login').classList.add('hidden')
  $('login-note').textContent = ''
  $('app').classList.remove('hidden')
  render()
}
start()
