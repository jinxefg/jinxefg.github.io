import { useState, useEffect } from "react";

const P = {
  bg: "#0A090E",
  surface: "#13111A",
  card: "#18151F",
  border: "#241F30",
  accent: "#9B6DFF",
  accentDim: "#7B4FE0",
  accentSoft: "#1E1530",
  text: "#EDE9F8",
  muted: "#6B6478",
  mutedLight: "#9B93AA",
  pill: "#1C1826",
};

const CATEGORIES = ["All", "Tech", "Science", "Business", "Politics", "Culture", "Health", "Other"];
const CAT_COLORS = {
  Tech: "#9B6DFF", Science: "#34C78A", Business: "#F5A623",
  Politics: "#E05A5A", Culture: "#FF7EB3", Health: "#52CCCC", Other: "#6B6478",
};

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}
function readTime(text) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

// Calls our own serverless function (api/process.js) instead of the
// Anthropic API directly — keeps the API key server-side and avoids CORS.
async function processWithAI(content, source) {
  const res = await fetch("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 3000), source: source || "unknown" }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Icons (stroke only, no fill) ──────────────────────────────────────────────
function Ico({ d, size = 20, color = P.muted, strokeWidth = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

const ICONS = {
  plus: "M12 5v14M5 12h14",
  arrow: "M19 12H5M12 19l-7-7 7-7",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  link: ["M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"],
  bookmark: ["M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 9a3 3 0 100 6 3 3 0 000-6z"],
  share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spin() {
  return <span style={{
    display: "inline-block", width: 15, height: 15,
    border: "1.5px solid rgba(255,255,255,0.2)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin .7s linear infinite",
  }} />;
}

// ── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onClose, onSave, prefillUrl = "" }) {
  const [tab, setTab] = useState("url");
  const [url, setUrl] = useState(prefillUrl);
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    const content = tab === "url" ? url : text;
    if (!content.trim()) { setErr("Nothing to save."); return; }
    setLoading(true); setErr("");
    try {
      const src = tab === "url" ? url : (source || "Clipped text");
      const meta = await processWithAI(content, src);
      onSave({
        id: (Date.now() + Math.random()).toString(36),
        raw: content, url: tab === "url" ? url : "", source: src,
        title: meta.title || "Untitled", category: meta.category || "Other",
        summary: meta.summary || "", savedAt: new Date().toISOString(),
        read: false, readTime: readTime(content),
      });
    } catch {
      setErr("Couldn't process — try again.");
    }
    setLoading(false);
  };

  const inp = {
    width: "100%", background: P.bg, border: `1px solid ${P.border}`,
    borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 15,
    resize: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
      display: "flex", flexDirection: "column", justifyContent: "flex-end"
    }}>
      <div style={{ background: P.surface, borderRadius: "22px 22px 0 0", padding: "22px 20px 44px" }}>
        <div style={{ width: 36, height: 4, background: P.border, borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ color: P.text, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>Save for later</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Ico d={ICONS.x} color={P.muted} size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 18, background: P.bg, borderRadius: 10, padding: 3 }}>
          {["url", "text"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === t ? P.accent : "transparent",
              color: tab === t ? "#fff" : P.muted, fontWeight: 600, fontSize: 13,
            }}>{t === "url" ? "URL" : "Text clip"}</button>
          ))}
        </div>

        {tab === "url"
          ? <textarea value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://…" rows={2} style={inp} />
          : <>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste the text you want to save…" rows={5} style={inp} />
              <input value={source} onChange={e => setSource(e.target.value)}
                placeholder="Source (optional)" style={{ ...inp, marginTop: 8, resize: undefined }} />
            </>
        }

        {err && <p style={{ color: "#E05A5A", fontSize: 13, margin: "8px 0 0" }}>{err}</p>}

        <button onClick={save} disabled={loading} style={{
          marginTop: 14, width: "100%", padding: "14px 0", borderRadius: 13, border: "none",
          background: loading ? P.border : P.accent,
          color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          letterSpacing: "-0.2px",
        }}>
          {loading ? <><Spin /> Processing…</> : "Save & categorize"}
        </button>
      </div>
    </div>
  );
}

// ── Reader ────────────────────────────────────────────────────────────────────
function Reader({ item, onClose, onToggleRead, onDelete }) {
  const cc = CAT_COLORS[item.category] || P.muted;
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: item.title, url: item.url || undefined, text: item.summary }); }
      catch { /* user cancelled share sheet — ignore */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(item.url || item.title);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: P.bg, zIndex: 50, overflowY: "auto" }}>
      <div style={{
        position: "sticky", top: 0, background: P.bg + "EE",
        backdropFilter: "blur(10px)", borderBottom: `1px solid ${P.border}`,
        padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
          <Ico d={ICONS.arrow} color={P.mutedLight} size={20} />
        </button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={onToggleRead} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Ico d={ICONS.check} color={item.read ? P.accent : P.muted} size={20} />
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Ico d={ICONS.trash} color="#C0524A" size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: "26px 20px 64px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{
            background: cc + "1A", color: cc, borderRadius: 4, padding: "3px 8px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase"
          }}>
            {item.category}
          </span>
          {item.source && <span style={{ color: P.muted, fontSize: 13 }}>{getDomain(item.source)}</span>}
        </div>

        <h1 style={{ color: P.text, fontSize: 24, fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.3px", margin: "0 0 12px" }}>
          {item.title}
        </h1>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20, color: P.muted, fontSize: 13 }}>
          <span>{timeAgo(item.savedAt)}</span>
          <span style={{ color: P.border }}>·</span>
          <span>{item.readTime} min read</span>
        </div>

        {item.summary && (
          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 22 }}>
            <p style={{ color: P.mutedLight, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.summary}</p>
          </div>
        )}

        {item.raw && (
          <p style={{ color: P.text, fontSize: 16, lineHeight: 1.7, margin: "0 0 26px", whiteSpace: "pre-wrap" }}>
            {item.raw}
          </p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
              background: P.pill, border: `1px solid ${P.border}`, borderRadius: 10,
              padding: "9px 14px", color: P.mutedLight, fontSize: 13, fontWeight: 600,
            }}>
              <Ico d={ICONS.link} color={P.mutedLight} size={15} /> Open original
            </a>
          )}
          <button onClick={handleShare} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: P.pill, border: `1px solid ${P.border}`, borderRadius: 10,
            padding: "9px 14px", color: P.mutedLight, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <Ico d={ICONS.share} color={P.mutedLight} size={15} /> {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ item, onClick }) {
  const cc = CAT_COLORS[item.category] || P.muted;
  return (
    <div onClick={onClick} style={{
      background: P.card, borderRadius: 14, padding: "15px 16px", marginBottom: 10,
      cursor: "pointer", border: `1px solid ${P.border}`, opacity: item.read ? 0.55 : 1,
      transition: "opacity 0.15s",
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 7, flexWrap: "wrap" }}>
        <span style={{
          background: cc + "1A", color: cc, borderRadius: 4, padding: "2px 7px",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap"
        }}>
          {item.category}
        </span>
        {item.source &&
          <span style={{ color: P.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
            {getDomain(item.source)}
          </span>
        }
        {item.read && <span style={{ color: P.accent, fontSize: 11, marginLeft: "auto", opacity: 0.8 }}>read</span>}
      </div>

      <p style={{
        color: P.text, fontWeight: 700, fontSize: 15, margin: "0 0 5px",
        lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.2px"
      }}>
        {item.title}
      </p>

      {item.summary &&
        <p style={{
          color: P.muted, fontSize: 13, margin: "0 0 10px", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
        }}>
          {item.summary}
        </p>
      }

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: P.muted, fontSize: 12 }}>{timeAgo(item.savedAt)}</span>
        <span style={{ color: P.border }}>·</span>
        <span style={{ color: P.muted, fontSize: 12 }}>{item.readTime} min read</span>
      </div>
    </div>
  );
}

function Empty({ filtered }) {
  return (
    <div style={{ textAlign: "center", padding: "70px 24px" }}>
      <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.4 }}>
        <Ico d={ICONS.bookmark} color={P.muted} size={40} />
      </div>
      <p style={{ color: P.text, fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
        {filtered ? "Nothing here" : "Nothing saved yet"}
      </p>
      <p style={{ color: P.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
        {filtered ? "Try a different filter." : "Tap + to save a URL or clip some text."}
      </p>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "rl_items";

export default function App() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [cat, setCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [prefillUrl, setPrefillUrl] = useState("");
  const [reading, setReading] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* storage full/unavailable */ }
  }, [items]);

  // Check URL params for share target (when installed as PWA)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url") || params.get("text") || params.get("title");
    if (sharedUrl) {
      setPrefillUrl(sharedUrl);
      setShowAdd(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const save = (item) => { setItems(p => [item, ...p]); setShowAdd(false); setPrefillUrl(""); };
  const del = (id) => { setItems(p => p.filter(i => i.id !== id)); setReading(null); };
  const toggleRead = (id) => {
    setItems(p => p.map(i => i.id === id ? { ...i, read: !i.read } : i));
  };

  const filtered = items.filter(i => {
    const cm = cat === "All" || i.category === cat;
    const rm = !unreadOnly || !i.read;
    return cm && rm;
  });

  const unread = items.filter(i => !i.read).length;
  const readingItem = reading ? items.find(i => i.id === reading) : null;

  return (
    <div style={{ background: P.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: P.text }}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{display:none}
        textarea,input{outline:none}
        textarea::placeholder,input::placeholder{color:${P.muted}}
        button{-webkit-tap-highlight-color:transparent}
      `}</style>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: P.bg + "F0",
        backdropFilter: "blur(12px)", borderBottom: `1px solid ${P.border}`,
        padding: "16px 18px 10px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: P.text }}>Later</h1>
            <p style={{ margin: 0, color: P.muted, fontSize: 12, marginTop: 1 }}>
              {unread > 0 ? `${unread} unread` : "all read"} · {items.length} saved
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setUnreadOnly(v => !v)} style={{
              background: unreadOnly ? P.accentSoft : P.pill,
              border: `1px solid ${unreadOnly ? P.accent + "66" : "transparent"}`,
              color: unreadOnly ? P.accent : P.muted,
              borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <Ico d={ICONS.eye} color={unreadOnly ? P.accent : P.muted} size={14} />
            </button>
            <button onClick={() => { setPrefillUrl(""); setShowAdd(true); }} style={{
              background: P.accent, border: "none", color: "#fff",
              borderRadius: 11, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico d={ICONS.plus} color="#fff" size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
          {CATEGORIES.map(c => {
            const n = c === "All" ? items.length : items.filter(i => i.category === c).length;
            if (c !== "All" && n === 0) return null;
            const active = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} style={{
                background: active ? P.accent : P.pill,
                color: active ? "#fff" : P.mutedLight,
                border: `1px solid ${active ? "transparent" : P.border}`,
                borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                letterSpacing: "-0.1px",
              }}>
                {c}{c !== "All" && n > 0 ? ` ${n}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "12px 14px 100px" }}>
        {filtered.length === 0
          ? <Empty filtered={cat !== "All" || unreadOnly} />
          : filtered.map(item => (
              <Card key={item.id} item={item} onClick={() => setReading(item.id)} />
            ))
        }
      </div>

      {readingItem && (
        <Reader
          item={readingItem}
          onClose={() => setReading(null)}
          onToggleRead={() => toggleRead(readingItem.id)}
          onDelete={() => del(readingItem.id)}
        />
      )}

      {showAdd && (
        <AddModal prefillUrl={prefillUrl} onClose={() => { setShowAdd(false); setPrefillUrl(""); }} onSave={save} />
      )}
    </div>
  );
}
