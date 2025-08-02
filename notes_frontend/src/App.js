import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * API_ROOT: Change to backend URL as appropriate.
 * The backend must support CORS for frontend to communicate directly.
 * If deploying behind proxy, may keep as '/api'.
 */
const API_ROOT = process.env.REACT_APP_API_ROOT || "http://localhost:5000";

/**
 * Minimalistic authentication and notes app:
 * - Sidebar: user info, logout, create/search notes, note list
 * - Main: view/edit note
 * - Auth screens as modal overlay
 * - Responsive layout for desktop/mobile
 */

/** Helper: fetch with auth (JWT in localStorage). */
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("token");
  opts.headers = {
    ...(opts.headers || {}),
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const resp = await fetch(`${API_ROOT}${path}`, opts);
  if (resp.status === 401) {
    // Logout on unauthorized
    localStorage.removeItem("token");
    window.location.reload();
    return;
  }
  return resp.json();
}

/** Login / signup form component */
function AuthModal({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // PUBLIC_INTERFACE
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    const res = await fetch(`${API_ROOT}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      onAuthenticated();
    } else {
      setError(data.message || "Authentication failed.");
    }
  }

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h2 style={{ marginBottom: 16 }}>
          {mode === "login" ? "Sign In" : "Sign Up"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <input
            style={fieldStyle}
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          <input
            style={fieldStyle}
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={e => setPassword(e.target.value)}
            minLength={4}
          />
          {error && <div style={{ color: "#F45B69", fontSize: 14, margin: "8px 0" }}>{error}</div>}
          <button type="submit" style={buttonStyle}>
            {mode === "login" ? "Sign In" : "Sign Up"}
          </button>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              type="button"
              style={linkButton}
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login"
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Notes Sidebar (note list, filter, create, user/logout) */
function Sidebar({ user, notes, onSelect, onCreate, selectedId, onLogout, search, setSearch }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="user-initial">{user.email[0]?.toUpperCase() || "U"}</span>
        <span style={{ fontWeight: 600 }}>{user.email}</span>
        <button className="logout-btn" title="Logout" onClick={onLogout}>⎋</button>
      </div>
      <div className="sidebar-controls">
        <input
          className="sidebar-search"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="add-note-btn" onClick={onCreate}>＋</button>
      </div>
      <nav className="notes-list">
        {notes.length === 0 && <div className="empty-info">No notes</div>}
        {notes.map(n => (
          <div
            key={n.id}
            className={`note-item${selectedId === n.id ? " selected" : ""}`}
            onClick={() => onSelect(n.id)}
            tabIndex={0}
          >
            <div className="note-title">{n.title || "Untitled"}</div>
            <div className="note-snippet">{(n.body || "").slice(0, 40)}</div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Note editor/view/panel */
function NoteMain({ note, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState({ title: "", body: "" });
  useEffect(() => {
    setVal(note || { title: "", body: "" });
    setEdit(false);
  }, [note]);

  if (!note) {
    return (
      <main className="main-content empty">
        <div>Select or create a note.</div>
      </main>
    );
  }

  // PUBLIC_INTERFACE
  return (
    <main className="main-content">
      <div className="main-header">
        {!edit && <h2 style={{ margin: 0, flex: 1 }}>{note.title || "Untitled"}</h2>}
        {edit && (
          <input
            className="note-title-edit"
            value={val.title}
            onChange={e => setVal(v => ({ ...v, title: e.target.value }))}
            placeholder="Title"
            style={{ fontSize: 22, fontWeight: 700, marginRight: 8, flex: 1 }}
            maxLength={80}
            autoFocus
          />
        )}
        <button style={{ ...buttonStyle, padding: "6px 14px" }} onClick={() => setEdit(e => !e)}>
          {edit ? "Cancel" : "Edit"}
        </button>
      </div>
      <div style={{ flexGrow: 1 }}>
        {edit ? (
          <textarea
            className="note-body-edit"
            value={val.body}
            onChange={e => setVal(v => ({ ...v, body: e.target.value }))}
            placeholder="Note details..."
            rows={12}
            style={{ width: "100%", marginTop: 10, fontSize: 16, padding: 8, borderRadius: 8, border: "1px solid var(--border-color)" }}
          />
        ) : (
          <div className="note-body-view">{note.body || <i>Empty note</i>}</div>
        )}
      </div>
      <div className="main-footer">
        {edit ? (
          <button
            className="save-btn"
            onClick={() => {
              onSave(val);
              setEdit(false);
            }}
            style={{ ...buttonStyle, background: "var(--kavia-orange,#4F8A8B)" }}
          >
            Save
          </button>
        ) : (
          <button
            className="delete-btn"
            onClick={() => window.confirm("Delete this note?") && onDelete()}
            style={{ ...buttonStyle, background: "#F45B69" }}
          >
            Delete
          </button>
        )}
      </div>
    </main>
  );
}

// PUBLIC_INTERFACE
function App() {
  // App-level theme state and application state
  const [theme, setTheme] = useState("light");
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  // Fetch theme from localStorage or system
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch current user (once authenticated)
  useEffect(() => {
    if (!authenticated) return;
    apiFetch("/auth/me").then(res => {
      if (res && res.email) setUser(res);
      else {
        setAuthenticated(false);
        localStorage.removeItem("token");
      }
    });
  }, [authenticated]);

  // Fetch notes for user
  useEffect(() => {
    if (!authenticated) return;
    apiFetch("/notes").then(res => {
      if (Array.isArray(res)) setNotes(res);
      else setNotes([]);
    });
  }, [authenticated]);

  // Select first note by default
  useEffect(() => {
    if (notes.length > 0) setSelectedId(notes[0].id);
    else setSelectedId(null);
  }, [notes]);

  // Filters notes by search string
  const filteredNotes = notes.filter(
    n => n.title?.toLowerCase().includes(search.toLowerCase()) ||
         n.body?.toLowerCase().includes(search.toLowerCase())
  );

  // Handlers for note CRUD
  const handleSelect = (id) => setSelectedId(id);
  const handleCreate = async () => {
    const res = await apiFetch("/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", body: "" }),
    });
    if (res && res.id) {
      setNotes([res, ...notes]);
      setSelectedId(res.id);
    }
  };
  const handleSave = async (val) => {
    const cur = notes.find(n => n.id === selectedId);
    if (!cur) return;
    const res = await apiFetch(`/notes/${cur.id}`, {
      method: "PUT",
      body: JSON.stringify(val),
    });
    if (res && res.id) {
      setNotes(notes.map(n => (n.id === cur.id ? res : n)));
    }
  };
  const handleDelete = async () => {
    const cur = notes.find(n => n.id === selectedId);
    if (!cur) return;
    await apiFetch(`/notes/${cur.id}`, { method: "DELETE" });
    setNotes(notes.filter(n => n.id !== cur.id));
    setSelectedId(notes.length > 1 ? notes.find(n => n.id !== cur.id).id : null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthenticated(false);
    setUser(null);
  };

  // Main rendering
  return (
    <div className="App" style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", display: "flex", flexDirection: "column" }}>
      <header style={navbarStyle}>
        <div style={{ fontWeight: 700, letterSpacing: 2, color: "#4F8A8B", fontSize: 22 }}>
          notemaster
        </div>
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => (t === "light" ? "dark" : "light"))}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          style={{ marginLeft: "auto" }}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>
      <div className="body-region" style={{ flex: 1, display: "flex", height: "calc(100vh - 64px)" }}>
        {!authenticated || !user ? (
          <AuthModal onAuthenticated={() => setAuthenticated(true)} />
        ) : (
          <>
            <Sidebar
              user={user}
              notes={filteredNotes}
              onSelect={handleSelect}
              onCreate={handleCreate}
              selectedId={selectedId}
              onLogout={handleLogout}
              search={search}
              setSearch={setSearch}
            />
            <NoteMain
              note={notes.find(n => n.id === selectedId)}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Minimal/modern inline styles for quick prototyping
const buttonStyle = {
  background: "#4F8A8B",
  color: "#FFF",
  border: "none",
  borderRadius: 8,
  padding: "8px 18px",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  marginTop: 8,
  marginBottom: 4,
  transition: "all 0.2s",
};
const linkButton = {
  ...buttonStyle,
  background: "none",
  color: "#4F8A8B",
  boxShadow: "none",
  fontWeight: 400,
  fontSize: 14,
  padding: 0,
  marginTop: 0,
  marginBottom: 0,
  border: "none",
  cursor: "pointer"
};
const fieldStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  marginBottom: 10,
  fontSize: 16,
};

const navbarStyle = {
  background: "var(--bg-secondary)",
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  height: 64,
  borderBottom: "1px solid var(--border-color)",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  modal: {
    background: "#fff",
    padding: "2.5rem 2.25rem",
    borderRadius: 16,
    boxShadow: "0 8px 32px 0 rgba(60, 72, 85,0.16)",
    minWidth: 320,
    minHeight: 320,
    color: "#222",
    maxWidth: "90vw",
  },
};

// PUBLIC_INTERFACE
export default App;
