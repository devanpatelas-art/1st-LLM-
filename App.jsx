import { useEffect, useRef, useState } from "react";
import {
  Bot, BookOpen, Bug, Check, Code2, Copy, Menu, Plus,
  Send, ShieldCheck, Sparkles, Trash2, User, X
} from "lucide-react";

const suggestions = [
  { icon: Code2, title: "Write an API example", prompt: "Show me a minimal Python example using the OpenAI Responses API, and explain how to run it." },
  { icon: Bug, title: "Debug an API error", prompt: "Help me troubleshoot an OpenAI API error. Ask me for the redacted error message and relevant code." },
  { icon: BookOpen, title: "Learn the Responses API", prompt: "Explain the OpenAI Responses API and how it differs from a typical chat-completions workflow." }
];

function MessageContent({ content }) {
  // Simple readable rendering for plain text and fenced code blocks.
  const parts = content.split(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g);
  const output = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) output.push(<p key={`p-${i}`}>{parts[i]}</p>);
    if (i + 2 < parts.length) {
      output.push(
        <pre key={`code-${i}`}>
          <div className="code-head">
            <span>{parts[i + 1] || "code"}</span>
            <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(parts[i + 2])} aria-label="Copy code">
              <Copy size={14} /> Copy
            </button>
          </div>
          <code>{parts[i + 2].replace(/\n$/, "")}</code>
        </pre>
      );
    }
  }
  return <div className="message-content">{output}</div>;
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [configured, setConfigured] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured);
        if (data.model) setModel(data.model);
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(text = draft) {
    const content = text.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-20) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.message || "Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    setMessages([]);
    setDraft("");
    setError("");
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Bot size={23} /></div>
          <div><strong>API Assistant</strong><span>Developer workspace</span></div>
          <button className="icon-btn close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <button className="new-chat" onClick={newChat}><Plus size={17} /> New conversation</button>
        <div className="sidebar-label">YOUR ASSISTANT</div>
        <div className="assistant-card">
          <div className="mini-bot"><Sparkles size={17} /></div>
          <div><strong>OpenAI API Assistant</strong><span>Documentation · Code · Debugging</span></div>
          <span className="online-dot" />
        </div>
        <div className="sidebar-spacer" />
        <div className="security-card">
          <ShieldCheck size={18} />
          <div><strong>API key protected</strong><p>Your key stays on the backend and is never sent to the browser.</p></div>
        </div>
        <div className="sidebar-footer"><span className="status-dot" /> Model: {model}</div>
      </aside>

      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>OpenAI API Assistant</strong></div>
          <div className="connection">
            <span className={`status-dot ${configured === false ? "offline" : ""}`} />
            {configured === null ? "Connecting…" : configured ? "Backend connected" : "API key not configured"}
          </div>
        </header>

        <section className={`chat-area ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon"><Bot size={30} /></div>
              <div className="eyebrow"><Sparkles size={14} /> YOUR DEVELOPER COMPANION</div>
              <h1>Build with the<br /><span>OpenAI API.</span></h1>
              <p className="welcome-copy">Ask technical questions, generate integration examples, and work through API errors — one step at a time.</p>
              <div className="suggestion-grid">
                {suggestions.map(({ icon: Icon, title, prompt }) => (
                  <button className="suggestion" key={title} onClick={() => sendMessage(prompt)} disabled={loading}>
                    <span className="suggestion-icon"><Icon size={18} /></span>
                    <span>{title}</span>
                    <span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
              {configured === false && <div className="setup-note"><ShieldCheck size={17} /><span>Configure <code>OPENAI_API_KEY</code> in <code>server/.env</code> to start chatting.</span></div>}
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <article className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
                  <div className={`avatar ${message.role}`} aria-hidden="true">
                    {message.role === "assistant" ? <Bot size={18} /> : <User size={17} />}
                  </div>
                  <div className="message-main">
                    <div className="message-author">{message.role === "assistant" ? "API Assistant" : "You"}</div>
                    <MessageContent content={message.content} />
                  </div>
                </article>
              ))}
              {loading && <article className="message-row assistant"><div className="avatar assistant"><Bot size={18} /></div><div className="message-main"><div className="message-author">API Assistant</div><div className="typing"><span /><span /><span /></div></div></article>}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="composer-wrap">
          {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
          <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about the OpenAI API…"
              rows={1}
              maxLength={12000}
              aria-label="Message the assistant"
              disabled={loading || configured === false}
            />
            <div className="composer-bottom">
              <span><kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line</span>
              <button className="send-btn" type="submit" disabled={!draft.trim() || loading || configured === false} aria-label="Send message">
                {loading ? <span className="send-spinner" /> : <Send size={17} />}
              </button>
            </div>
          </form>
          <p className="disclaimer">AI can make mistakes. Verify important details with official OpenAI documentation.</p>
        </div>
      </main>
    </div>
  );
}
