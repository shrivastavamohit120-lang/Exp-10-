import { createContext, useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api.js';

export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const CATEGORIES = ['Electronics', 'Books', 'Clothing', 'Stationery', 'Sports', 'ID & Cards', 'Other'];
const TYPES = { lost: 'Lost', found: 'Found', borrow: 'Lend' };
const arr = (d) => (Array.isArray(d) ? d : []);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '');
const Badge = ({ s }) => <span className={'badge ' + s}>{s}</span>;
const Err = ({ msg }) => (msg ? <p className="error" role="alert">{msg}</p> : null);

/* ---------- Browse ---------- */
export function Home() {
  const [f, setF] = useState({ q: '', type: '', category: '', status: '' });
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
      api('/api/listings?' + p).then((d) => { setItems(arr(d)); setErr(''); }).catch((e) => { setItems([]); setErr(e.message); });
    }, 250);
    return () => clearTimeout(t);
  }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <section className="hero">
        <h1>Lost it? Found it? Need it for a day?</h1>
        <p>Search what your campus has posted, or add your own.</p>
      </section>
      <div className="filters">
        <input placeholder="Search items" value={f.q} onChange={set('q')} aria-label="Search" />
        <select value={f.type} onChange={set('type')} aria-label="Type">
          <option value="">All types</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={f.category} onChange={set('category')} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.status} onChange={set('status')} aria-label="Status">
          <option value="">Any status</option>
          {['open', 'claimed', 'resolved', 'borrowed', 'returned'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Err msg={err} />
      {items === null ? <p className="empty">Loading…</p> : items.length === 0 && !err ? (
        <p className="empty">No listings match. Try other filters or <Link to="/new">post an item</Link>.</p>
      ) : (
        <div className="grid">
          {items.map((l) => (
            <Link to={`/listing/${l._id}`} className="card" key={l._id}>
              {l.imageUrl && <img src={l.imageUrl} alt="" loading="lazy" />}
              <div className="card-body">
                <div className="row"><span className={'type ' + l.type}>{TYPES[l.type]}</span><Badge s={l.status} /></div>
                <h3>{l.title}</h3>
                <p className="muted">{l.category}{l.location ? ` · ${l.location}` : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Login / Register ---------- */
export function AuthPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api(`/api/auth/${mode}`, { method: 'POST', body: form });
      login(r.token, r.user); nav('/');
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
      {mode === 'register' && <label>Name<input value={form.name} onChange={set('name')} minLength={2} maxLength={50} required /></label>}
      <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
      <label>Password<input type="password" minLength={6} maxLength={72} value={form.password} onChange={set('password')} required /></label>
      <Err msg={err} />
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
      <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
        {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
      </button>
    </form>
  );
}

/* ---------- Listing detail + request ---------- */
export function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [l, setL] = useState(null);
  const [req, setReq] = useState({ message: '', returnDate: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/listings/' + id).then(setL).catch((e) => setErr(e.message)); }, [id]);
  if (!l) return <p className="empty">{err || 'Loading…'}</p>;
  const mine = user && l.owner?._id === user.id;
  const act = async (fn) => { setErr(''); setMsg(''); try { await fn(); } catch (e) { setErr(e.message); } };
  const send = (e) => { e.preventDefault(); act(async () => {
    await api('/api/requests', { method: 'POST', body: { listingId: l._id, ...req } });
    setMsg('Request sent. Track it on your dashboard.');
  }); };
  const remove = () => confirm('Delete this listing and its requests?') && act(async () => { await api('/api/listings/' + l._id, { method: 'DELETE' }); nav('/dashboard'); });
  const setStatus = (status) => act(async () => setL(await api('/api/listings/' + l._id, { method: 'PUT', body: { status } })));
  const report = () => { const reason = prompt('Why are you reporting this listing?'); if (reason) act(async () => setMsg((await api(`/api/listings/${l._id}/report`, { method: 'POST', body: { reason } })).message)); };
  const verb = l.type === 'borrow' ? 'Request to borrow' : l.type === 'found' ? 'Claim this item' : 'I found this';
  const closed = l.type === 'borrow' ? 'returned' : 'resolved';
  return (
    <article className="panel">
      {l.imageUrl && <img className="hero-img" src={l.imageUrl} alt={l.title} />}
      <div className="row"><span className={'type ' + l.type}>{TYPES[l.type]}</span><Badge s={l.status} /></div>
      <h2>{l.title}</h2>
      <p>{l.description}</p>
      <p className="muted">{l.category} · {l.location || 'No location given'} · {fmt(l.date)} · Posted by {l.owner?.name}</p>
      <Err msg={err} />{msg && <p className="ok">{msg}</p>}
      {mine ? (
        <div className="actions">
          <Link className="btn sm" to={`/edit/${l._id}`}>Edit</Link>
          {l.status === 'open' && <button className="btn sm ghost" onClick={() => setStatus(closed)}>Mark as {closed}</button>}
          {['resolved', 'returned'].includes(l.status) && <button className="btn sm ghost" onClick={() => setStatus('open')}>Reopen</button>}
          <button className="btn sm danger" onClick={remove}>Delete</button>
        </div>
      ) : user && l.status === 'open' ? (
        <form onSubmit={send} className="stack">
          <label>Message to the owner<textarea rows={3} maxLength={500} value={req.message} onChange={(e) => setReq({ ...req, message: e.target.value })} placeholder="Describe a detail only the owner would know" /></label>
          {l.type === 'borrow' && <label>Return date<input type="date" min={today()} required value={req.returnDate} onChange={(e) => setReq({ ...req, returnDate: e.target.value })} /></label>}
          <button className="btn">{verb}</button>
        </form>
      ) : !user ? <p><Link to="/login">Log in</Link> to send a request.</p> : <p className="muted">This listing is {l.status}.</p>}
      {user && !mine && <button className="link" onClick={report}>Report this listing</button>}
    </article>
  );
}

/* ---------- Create / edit listing ---------- */
export function ListingForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ type: 'lost', title: '', description: '', category: 'Other', date: today(), location: '' });
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    api('/api/listings/' + id).then((l) => {
      setF({ type: l.type, title: l.title, description: l.description, category: l.category, date: (l.date || '').slice(0, 10), location: l.location || '' });
      setImageUrl(l.imageUrl || '');
    }).catch((e) => setErr(e.message));
  }, [id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      let url = imageUrl;
      if (file) { const form = new FormData(); form.append('image', file); url = (await api('/api/upload', { method: 'POST', form })).url; }
      const body = { ...f, imageUrl: url || undefined };
      const l = id ? await api('/api/listings/' + id, { method: 'PUT', body }) : await api('/api/listings', { method: 'POST', body });
      nav('/listing/' + l._id);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h2>{id ? 'Edit listing' : 'Post an item'}</h2>
      <label>What is this?
        <select value={f.type} onChange={set('type')}>
          <option value="lost">I lost something</option><option value="found">I found something</option><option value="borrow">I can lend something</option>
        </select>
      </label>
      <label>Title<input value={f.title} onChange={set('title')} maxLength={100} required /></label>
      <label>Description<textarea rows={4} value={f.description} onChange={set('description')} maxLength={1000} required /></label>
      <label>Category<select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Location<input value={f.location} onChange={set('location')} maxLength={100} placeholder="Library, Lab 3, Canteen…" /></label>
      <label>Date<input type="date" max={today()} value={f.date} onChange={set('date')} /></label>
      {imageUrl && !file && <img className="hero-img" src={imageUrl} alt="Current" />}
      <label>Photo (optional, max 2 MB)<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></label>
      <Err msg={err} />
      <button className="btn" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Post listing'}</button>
    </form>
  );
}

/* ---------- Dashboard ---------- */
export function Dashboard() {
  const [mine, setMine] = useState([]);
  const [inc, setInc] = useState([]);
  const [out, setOut] = useState([]);
  const [err, setErr] = useState('');
  const load = () => Promise.all([api('/api/listings/mine'), api('/api/requests/incoming'), api('/api/requests/outgoing')])
    .then(([a, b, c]) => { setMine(arr(a)); setInc(arr(b)); setOut(arr(c)); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const act = async (id, action) => { setErr(''); try { await api('/api/requests/' + id, { method: 'PATCH', body: { action } }); load(); } catch (e) { setErr(e.message); } };
  const shared = (r, who) => ['accepted', 'completed'].includes(r.status) && r[who]?.email ? ` · contact: ${r[who].email}` : '';
  return (
    <>
      <Err msg={err} />
      <div className="stats">
        <div className="stat"><b>{mine.length}</b>My listings</div>
        <div className="stat"><b>{inc.filter((r) => r.status === 'pending').length}</b>Pending requests for me</div>
        <div className="stat"><b>{out.filter((r) => r.status === 'pending').length}</b>My pending requests</div>
      </div>
      <h2>Requests for my items</h2>
      {inc.length === 0 ? <p className="empty">No requests yet.</p> : inc.map((r) => (
        <div className="item" key={r._id}>
          <div><strong>{r.requester?.name}</strong> on <Link to={`/listing/${r.listing?._id}`}>{r.listing?.title}</Link>
            <p className="muted">{r.message || 'No message'}{r.returnDate ? ` · return by ${fmt(r.returnDate)}` : ''}{shared(r, 'requester')}</p></div>
          <div className="actions"><Badge s={r.status} />
            {r.status === 'pending' && <><button className="btn sm" onClick={() => act(r._id, 'accept')}>Accept</button><button className="btn sm ghost" onClick={() => act(r._id, 'reject')}>Reject</button></>}
            {r.status === 'accepted' && <button className="btn sm" onClick={() => act(r._id, 'complete')}>{r.listing?.type === 'borrow' ? 'Mark returned' : 'Mark resolved'}</button>}
          </div>
        </div>
      ))}
      <h2>My requests</h2>
      {out.length === 0 ? <p className="empty">You haven't requested anything. <Link to="/">Browse items</Link>.</p> : out.map((r) => (
        <div className="item" key={r._id}>
          <div><Link to={`/listing/${r.listing?._id}`}>{r.listing?.title}</Link><p className="muted">Owner: {r.owner?.name}{shared(r, 'owner')}</p></div>
          <Badge s={r.status} />
        </div>
      ))}
      <h2>My listings</h2>
      {mine.length === 0 ? <p className="empty">Nothing posted yet. <Link to="/new">Post an item</Link>.</p> : mine.map((l) => (
        <div className="item" key={l._id}><div><Link to={`/listing/${l._id}`}>{l.title}</Link><p className="muted">{TYPES[l.type]} · {l.category}</p></div>
          <div className="actions"><Badge s={l.status} /><Link className="btn sm ghost" to={`/edit/${l._id}`}>Edit</Link></div></div>
      ))}
    </>
  );
}

/* ---------- Admin ---------- */
export function Admin() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const load = () => api('/api/admin/reported').then((d) => setItems(arr(d))).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setErr(''); try { await fn(); load(); } catch (e) { setErr(e.message); } };
  return (
    <>
      <h2>Reported listings</h2>
      <Err msg={err} />
      {items.length === 0 ? <p className="empty">No reports to review.</p> : items.map((l) => (
        <div className="item" key={l._id}>
          <div><Link to={`/listing/${l._id}`}>{l.title}</Link><p className="muted">By {l.owner?.name} ({l.owner?.email}) · Reason: {l.reportReason}</p></div>
          <div className="actions">
            <button className="btn sm danger" onClick={() => confirm('Remove this listing?') && run(() => api('/api/listings/' + l._id, { method: 'DELETE' }))}>Remove</button>
            <button className="btn sm ghost" onClick={() => run(() => api('/api/admin/dismiss/' + l._id, { method: 'PATCH' }))}>Dismiss</button>
          </div>
        </div>
      ))}
    </>
  );
}
