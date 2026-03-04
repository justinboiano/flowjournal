import { useState, useMemo } from "react";

const INSTRUMENTS = ["MNQ", "MES", "NQ", "ES", "CL", "GC", "RTY", "YM"];
const SETUPS = ["Zero Print Long", "Zero Print Short", "DOM Absorption", "Iceberg", "Sweep & Reverse", "Momentum Scalp", "Other"];
const SESSIONS = ["Pre-Market", "RTH Open", "AM Session", "Lunch", "PM Session", "AH"];

// Orderflow signal tags grouped by category
const SIGNAL_TAGS = {
  "Prints": ["0P (Zero Print)", "Volume Tail", "B-Shape", "P-Shape"],
  "Order Flow": ["Delta Outlier", "CVD Divergence", "Absorption", "Bid", "Offer"],
  "Structure": ["LVN", "Supply", "Demand", "MSD", "MSS", "Gap"],
};
const OUTCOME_TAGS = ["A+ Setup", "Target Hit", "Early Exit", "Stop Hit", "Revenge Trade", "Oversize", "News Risk", "Best Trade"];

const BE_THRESHOLD = 25; // trades within ±$25 count as breakeven
function tradeResult(pnl) {
  if (Math.abs(pnl) <= BE_THRESHOLD) return "BE";
  return pnl > 0 ? "WIN" : "LOSS";
}

const sampleTrades = [
  { id: 1,  date: "2026-02-02", time: "09:34", instrument: "MNQ", direction: "LONG",  entry: 21480.25, exit: 21492.75, contracts: 3, pnl: 468,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Clean zero print on DOM.", signals: ["0P (Zero Print)", "Absorption"], outcomes: ["A+ Setup", "Target Hit"], tags: [], duration: 4 },
  { id: 2,  date: "2026-02-02", time: "10:12", instrument: "MNQ", direction: "SHORT", entry: 21505.00, exit: 21501.25, contracts: 2, pnl: 120,  setup: "Absorption",       session: "AM Session",  notes: "Good absorption.",        signals: ["Absorption"],                  outcomes: ["Target Hit"],             tags: [], duration: 2 },
  { id: 3,  date: "2026-02-03", time: "09:31", instrument: "MES", direction: "LONG",  entry: 5912.25,  exit: 5908.75,  contracts: 5, pnl: 134,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Faded against me.",       signals: ["0P (Zero Print)"],             outcomes: ["Stop Hit"],               tags: [], duration: 1 },
  { id: 4,  date: "2026-02-03", time: "14:22", instrument: "MNQ", direction: "SHORT", entry: 21620.50, exit: 21556.00, contracts: 2, pnl: -87,  setup: "MSD",              session: "AM Session",  notes: "Beautiful sweep.",        signals: ["MSD", "LVN"],                  outcomes: ["A+ Setup"],               tags: [], duration: 7 },
  { id: 5,  date: "2026-02-04", time: "09:35", instrument: "MNQ", direction: "LONG",  entry: 21390.00, exit: 21402.50, contracts: 4, pnl: 229,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Textbook zero print.",    signals: ["0P (Zero Print)", "Delta Outlier"], outcomes: ["A+ Setup", "Target Hit"], tags: [], duration: 4 },
  { id: 6,  date: "2026-02-05", time: "10:00", instrument: "MNQ", direction: "LONG",  entry: 21400.00, exit: 21420.00, contracts: 2, pnl: 80,   setup: "Absorption",       session: "AM Session",  notes: "Solid trade.",            signals: ["Absorption"],                  outcomes: ["Target Hit"],             tags: [], duration: 5 },
  { id: 7,  date: "2026-02-07", time: "09:33", instrument: "MNQ", direction: "SHORT", entry: 21550.00, exit: 21530.00, contracts: 3, pnl: 63,   setup: "0P (Zero Print)", session: "RTH Open",   notes: "3 trades on the day.",    signals: ["0P (Zero Print)", "Offer"],    outcomes: ["A+ Setup"],               tags: [], duration: 3 },
  { id: 8,  date: "2026-02-07", time: "11:00", instrument: "MNQ", direction: "LONG",  entry: 21520.00, exit: 21525.00, contracts: 2, pnl: -12,  setup: "CVD Divergence",   session: "AM Session",  notes: "Lost a tick.",            signals: ["CVD Divergence"],              outcomes: ["Stop Hit"],               tags: [], duration: 1 },
  { id: 9,  date: "2026-02-07", time: "14:00", instrument: "MNQ", direction: "LONG",  entry: 21500.00, exit: 21520.00, contracts: 3, pnl: 12,   setup: "0P (Zero Print)", session: "AM Session",  notes: "Small win.",              signals: ["0P (Zero Print)"],             outcomes: [],                         tags: [], duration: 3 },
  { id: 10, date: "2026-02-08", time: "09:34", instrument: "MNQ", direction: "LONG",  entry: 21480.25, exit: 21510.75, contracts: 3, pnl: 715,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Big move.",               signals: ["0P (Zero Print)", "Demand", "Volume Tail"], outcomes: ["A+ Setup", "Target Hit", "Best Trade"], tags: [], duration: 6 },
  { id: 11, date: "2026-02-09", time: "09:31", instrument: "MES", direction: "SHORT", entry: 5912.25,  exit: 5905.75,  contracts: 4, pnl: 383,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Textbook.",               signals: ["0P (Zero Print)", "Supply"],   outcomes: ["A+ Setup"],               tags: [], duration: 4 },
  { id: 12, date: "2026-02-09", time: "13:00", instrument: "MNQ", direction: "LONG",  entry: 21400.00, exit: 21410.00, contracts: 2, pnl: -75,  setup: "CVD Divergence",   session: "AM Session",  notes: "Lunch trade, bad idea.",  signals: ["CVD Divergence"],              outcomes: ["Revenge Trade"],          tags: [], duration: 2 },
  { id: 13, date: "2026-02-10", time: "09:35", instrument: "MNQ", direction: "LONG",  entry: 21390.00, exit: 21402.50, contracts: 4, pnl: 92,   setup: "0P (Zero Print)", session: "RTH Open",   notes: "Decent.",                 signals: ["0P (Zero Print)"],             outcomes: [],                         tags: [], duration: 4 },
  { id: 14, date: "2026-02-10", time: "10:30", instrument: "MNQ", direction: "SHORT", entry: 21500.00, exit: 21495.00, contracts: 5, pnl: 50,   setup: "Absorption",       session: "AM Session",  notes: "Small.",                  signals: ["Absorption"],                  outcomes: [],                         tags: [], duration: 2 },
  { id: 15, date: "2026-02-10", time: "11:00", instrument: "MNQ", direction: "LONG",  entry: 21490.00, exit: 21487.00, contracts: 3, pnl: -18,  setup: "LVN",              session: "AM Session",  notes: "Faded.",                  signals: ["LVN"],                         outcomes: ["Stop Hit"],               tags: [], duration: 1 },
  { id: 16, date: "2026-02-10", time: "14:00", instrument: "MNQ", direction: "LONG",  entry: 21480.00, exit: 21502.00, contracts: 5, pnl: 220,  setup: "0P (Zero Print)", session: "AM Session",  notes: "Afternoon rip.",          signals: ["0P (Zero Print)", "Demand"],   outcomes: ["A+ Setup"],               tags: [], duration: 5 },
  { id: 17, date: "2026-02-10", time: "14:45", instrument: "MNQ", direction: "LONG",  entry: 21510.00, exit: 21516.00, contracts: 3, pnl: 36,   setup: "Delta Outlier",    session: "AM Session",  notes: "Quick scalp.",            signals: ["Delta Outlier"],               outcomes: [],                         tags: [], duration: 2 },
  { id: 18, date: "2026-02-11", time: "09:33", instrument: "MNQ", direction: "SHORT", entry: 21550.00, exit: 21530.00, contracts: 3, pnl: 206,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Big short.",              signals: ["0P (Zero Print)", "MSS"],      outcomes: ["A+ Setup", "Target Hit"], tags: [], duration: 6 },
  { id: 19, date: "2026-02-11", time: "10:00", instrument: "MNQ", direction: "LONG",  entry: 21520.00, exit: 21528.00, contracts: 3, pnl: 48,   setup: "Absorption",       session: "AM Session",  notes: "Quick.",                  signals: ["Absorption", "Bid"],           outcomes: [],                         tags: [], duration: 2 },
  { id: 20, date: "2026-02-11", time: "14:00", instrument: "MNQ", direction: "LONG",  entry: 21500.00, exit: 21520.00, contracts: 3, pnl: -48,  setup: "0P (Zero Print)", session: "AM Session",  notes: "Faked.",                  signals: ["0P (Zero Print)"],             outcomes: ["Stop Hit"],               tags: [], duration: 2 },
  { id: 21, date: "2026-02-13", time: "09:34", instrument: "MNQ", direction: "SHORT", entry: 21600.00, exit: 21550.00, contracts: 4, pnl: -586, setup: "0P (Zero Print)", session: "RTH Open",   notes: "Worst day. Revenge traded after first loss.", signals: ["0P (Zero Print)"], outcomes: ["Revenge Trade", "Stop Hit"], tags: [], duration: 8 },
  { id: 22, date: "2026-02-14", time: "09:35", instrument: "MNQ", direction: "LONG",  entry: 21390.00, exit: 21430.00, contracts: 5, pnl: 800,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "$800 in 4 minutes. Zero print + DOM stacking.", signals: ["0P (Zero Print)", "Absorption", "Demand"], outcomes: ["A+ Setup", "Target Hit", "Best Trade"], tags: [], duration: 4 },
  { id: 23, date: "2026-02-14", time: "10:00", instrument: "MNQ", direction: "LONG",  entry: 21440.00, exit: 21445.00, contracts: 3, pnl: 30,   setup: "Delta Outlier",    session: "AM Session",  notes: "",                        signals: ["Delta Outlier"],               outcomes: [],                         tags: [], duration: 2 },
  { id: 24, date: "2026-02-14", time: "11:30", instrument: "MNQ", direction: "SHORT", entry: 21460.00, exit: 21452.00, contracts: 3, pnl: 24,   setup: "Absorption",       session: "AM Session",  notes: "",                        signals: ["Absorption"],                  outcomes: [],                         tags: [], duration: 3 },
  { id: 25, date: "2026-02-14", time: "14:00", instrument: "MNQ", direction: "LONG",  entry: 21450.00, exit: 21460.00, contracts: 3, pnl: 26,   setup: "LVN",              session: "AM Session",  notes: "",                        signals: ["LVN", "Demand"],               outcomes: [],                         tags: [], duration: 2 },
  { id: 26, date: "2026-02-15", time: "09:34", instrument: "MNQ", direction: "LONG",  entry: 21480.25, exit: 21505.75, contracts: 3, pnl: 663,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Clean setup.",            signals: ["0P (Zero Print)", "Volume Tail", "Demand"], outcomes: ["A+ Setup", "Target Hit"], tags: [], duration: 5 },
  { id: 27, date: "2026-02-17", time: "09:35", instrument: "MNQ", direction: "LONG",  entry: 21390.00, exit: 21402.50, contracts: 4, pnl: 170,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Good open.",              signals: ["0P (Zero Print)"],             outcomes: ["Target Hit"],             tags: [], duration: 3 },
  { id: 28, date: "2026-02-18", time: "09:34", instrument: "MNQ", direction: "SHORT", entry: 21480.25, exit: 21492.75, contracts: 3, pnl: 311,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "",                        signals: ["0P (Zero Print)", "MSS"],      outcomes: ["Target Hit"],             tags: [], duration: 4 },
  { id: 29, date: "2026-02-18", time: "10:12", instrument: "MNQ", direction: "LONG",  entry: 21505.00, exit: 21501.25, contracts: 2, pnl: -25,  setup: "Absorption",       session: "AM Session",  notes: "",                        signals: ["Absorption"],                  outcomes: ["Stop Hit"],               tags: [], duration: 2 },
  { id: 30, date: "2026-02-19", time: "09:31", instrument: "MES", direction: "LONG",  entry: 5912.25,  exit: 5908.75,  contracts: 5, pnl: -222, setup: "0P (Zero Print)", session: "RTH Open",   notes: "Bad day.",                signals: ["0P (Zero Print)"],             outcomes: ["Stop Hit"],               tags: [], duration: 1 },
  { id: 31, date: "2026-02-19", time: "10:00", instrument: "MNQ", direction: "SHORT", entry: 21550.00, exit: 21530.00, contracts: 3, pnl: -42,  setup: "MSS",              session: "AM Session",  notes: "",                        signals: ["MSS"],                         outcomes: ["Stop Hit"],               tags: [], duration: 3 },
  { id: 32, date: "2026-02-19", time: "14:22", instrument: "MNQ", direction: "LONG",  entry: 21400.00, exit: 21410.00, contracts: 2, pnl: 42,   setup: "Delta Outlier",    session: "AM Session",  notes: "",                        signals: ["Delta Outlier"],               outcomes: [],                         tags: [], duration: 2 },
  { id: 33, date: "2026-02-20", time: "09:34", instrument: "MNQ", direction: "SHORT", entry: 21600.00, exit: 21550.00, contracts: 4, pnl: -546, setup: "Supply",           session: "RTH Open",   notes: "Tough day. Stop run.",    signals: ["Supply", "Gap"],               outcomes: ["Stop Hit", "News Risk"],  tags: [], duration: 5 },
  { id: 34, date: "2026-02-20", time: "11:00", instrument: "MNQ", direction: "LONG",  entry: 21540.00, exit: 21548.00, contracts: 3, pnl: -48,  setup: "LVN",              session: "AM Session",  notes: "",                        signals: ["LVN"],                         outcomes: ["Stop Hit"],               tags: [], duration: 2 },
  { id: 35, date: "2026-02-21", time: "09:35", instrument: "MNQ", direction: "LONG",  entry: 21390.00, exit: 21402.50, contracts: 4, pnl: 248,  setup: "Demand",           session: "RTH Open",   notes: "Bounce.",                 signals: ["Demand", "MSD"],               outcomes: ["Target Hit"],             tags: [], duration: 4 },
  { id: 36, date: "2026-02-24", time: "09:35", instrument: "MNQ", direction: "SHORT", entry: 21600.00, exit: 21540.00, contracts: 4, pnl: -493, setup: "MSD",              session: "RTH Open",   notes: "Thought it would sweep. Didn't.", signals: ["MSD", "Gap"],           outcomes: ["Stop Hit", "Oversize"],   tags: [], duration: 6 },
  { id: 37, date: "2026-02-24", time: "10:12", instrument: "MNQ", direction: "LONG",  entry: 21505.00, exit: 21520.00, contracts: 2, pnl: 60,   setup: "0P (Zero Print)", session: "AM Session",  notes: "Small recovery.",         signals: ["0P (Zero Print)"],             outcomes: [],                         tags: [], duration: 3 },
  { id: 38, date: "2026-02-24", time: "11:00", instrument: "MNQ", direction: "SHORT", entry: 21525.00, exit: 21520.00, contracts: 3, pnl: 30,   setup: "Absorption",       session: "AM Session",  notes: "",                        signals: ["Absorption", "Offer"],         outcomes: [],                         tags: [], duration: 2 },
  { id: 39, date: "2026-02-24", time: "14:00", instrument: "MNQ", direction: "LONG",  entry: 21510.00, exit: 21505.00, contracts: 3, pnl: -30,  setup: "CVD Divergence",   session: "AM Session",  notes: "",                        signals: ["CVD Divergence"],              outcomes: ["Stop Hit"],               tags: [], duration: 2 },
  { id: 40, date: "2026-02-24", time: "14:30", instrument: "MNQ", direction: "LONG",  entry: 21500.00, exit: 21495.00, contracts: 2, pnl: -20,  setup: "0P (Zero Print)", session: "AM Session",  notes: "",                        signals: ["0P (Zero Print)"],             outcomes: ["Stop Hit"],               tags: [], duration: 1 },
  { id: 41, date: "2026-02-26", time: "09:34", instrument: "MNQ", direction: "LONG",  entry: 21480.25, exit: 21510.75, contracts: 3, pnl: 570,  setup: "0P (Zero Print)", session: "RTH Open",   notes: "Great Friday close.",     signals: ["0P (Zero Print)", "Volume Tail", "Bid"], outcomes: ["A+ Setup", "Target Hit"], tags: [], duration: 5 },
];

function formatCurrencyFull(val) {
  if (val === undefined || val === null) return "$0.00";
  return (val >= 0 ? "+" : "-") + "$" + Math.abs(val).toFixed(2);
}
function formatCurrencyShort(val) {
  if (val === undefined || val === null) return "$0";
  const abs = Math.abs(val);
  const str = abs >= 1000 ? `$${(abs / 1000).toFixed(2)}K` : `$${abs.toFixed(0)}`;
  return (val < 0 ? "-" : "") + str;
}
function formatDate(d) {
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

const labelStyle = { display: "flex", flexDirection: "column", gap: 6 };
const labelText = { color: "#8b949e", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" };
const inputStyle = { background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };
const td = { padding: "12px 16px", fontSize: 13, color: "#c9d1d9" };

function AddTradeModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0], time: "09:30",
    instrument: "MNQ", direction: "LONG", entry: "", exit: "",
    contracts: 1, session: "RTH Open", notes: "",
    signals: [],
    outcomes: [],
    clc: { context: "", location: "", confirmation: "" },
    screenshot: null,
  });

  function calcPnl() {
    if (!form.entry || !form.exit) return null;
    const diff = parseFloat(form.exit) - parseFloat(form.entry);
    const dir = form.direction === "LONG" ? 1 : -1;
    const multipliers = { MNQ: 2, MES: 5, NQ: 20, ES: 50, CL: 10, GC: 10, RTY: 10, YM: 5 };
    return dir * diff * form.contracts * (multipliers[form.instrument] || 2);
  }
  const estimatedPnl = calcPnl();

  function toggleSignal(t) { setForm(f => ({ ...f, signals: f.signals.includes(t) ? f.signals.filter(x => x !== t) : [...f.signals, t] })); }
  function toggleOutcome(t) { setForm(f => ({ ...f, outcomes: f.outcomes.includes(t) ? f.outcomes.filter(x => x !== t) : [...f.outcomes, t] })); }

  function handleSave() {
    if (!form.entry || !form.exit) return;
    const tags = [...form.signals, ...form.outcomes];
    onSave({ ...form, id: Date.now(), pnl: estimatedPnl || 0, entry: parseFloat(form.entry), exit: parseFloat(form.exit), contracts: parseInt(form.contracts), duration: 0, tags, setup: form.signals[0] || "Untagged" });
  }

  const clcColors = { context: "#58a6ff", location: "#d29922", confirmation: "#3fb950" };
  const [customSignalInput, setCustomSignalInput] = useState("");
  const [customOutcomeInput, setCustomOutcomeInput] = useState("");
  function addCustomSignal() {
    const tag = customSignalInput.trim();
    if (!tag || form.signals.includes(tag)) return;
    setForm(f => ({ ...f, signals: [...f.signals, tag] }));
    setCustomSignalInput("");
  }
  function addCustomOutcome() {
    const tag = customOutcomeInput.trim();
    if (!tag || form.outcomes.includes(tag)) return;
    setForm(f => ({ ...f, outcomes: [...f.outcomes, tag] }));
    setCustomOutcomeInput("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 12, width: 700, maxHeight: "92vh", overflowY: "auto", padding: 32 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Space Mono', monospace", color: "#e6edf3", fontSize: 18, margin: 0 }}>Log Trade</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {/* Trade basics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[["Date", "date", "date"], ["Time", "time", "time"]].map(([label, key, type]) => (
            <label key={key} style={labelStyle}><span style={labelText}>{label}</span>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} /></label>
          ))}
          <label style={labelStyle}><span style={labelText}>Instrument</span>
            <select value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} style={inputStyle}>
              {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}</select></label>
          <label style={labelStyle}><span style={labelText}>Direction</span>
            <div style={{ display: "flex", gap: 8 }}>
              {["LONG", "SHORT"].map(d => (
                <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))}
                  style={{ flex: 1, padding: "10px", border: "1px solid", borderRadius: 6, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                    borderColor: form.direction === d ? (d === "LONG" ? "#3fb950" : "#f85149") : "#30363d",
                    background: form.direction === d ? (d === "LONG" ? "rgba(63,185,80,0.15)" : "rgba(248,81,73,0.15)") : "transparent",
                    color: form.direction === d ? (d === "LONG" ? "#3fb950" : "#f85149") : "#8b949e" }}>{d}</button>
              ))}</div></label>
          {[["Entry Price", "entry"], ["Exit Price", "exit"], ["Contracts", "contracts"]].map(([label, key]) => (
            <label key={key} style={labelStyle}><span style={labelText}>{label}</span>
              <input type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} step="0.25" /></label>
          ))}
          <label style={labelStyle}><span style={labelText}>Session</span>
            <select value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))} style={inputStyle}>
              {SESSIONS.map(s => <option key={s}>{s}</option>)}</select></label>
        </div>

        {/* P&L estimate */}
        {estimatedPnl !== null && (
          <div style={{ margin: "14px 0 0", padding: 12, background: estimatedPnl >= 0 ? "rgba(63,185,80,0.08)" : "rgba(248,81,73,0.08)", borderRadius: 8, border: `1px solid ${estimatedPnl >= 0 ? "rgba(63,185,80,0.25)" : "rgba(248,81,73,0.25)"}` }}>
            <span style={{ color: "#8b949e", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>EST. P&L  </span>
            <span style={{ color: estimatedPnl >= 0 ? "#3fb950" : "#f85149", fontSize: 20, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{formatCurrencyFull(estimatedPnl)}</span>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "#21262d", margin: "20px 0" }} />

        {/* CLC Law */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#e6edf3", fontWeight: 700, letterSpacing: "0.06em" }}>CLC LAW</span>
            <span style={{ fontSize: 11, color: "#8b949e" }}>Context · Location · Confirmation</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[["context", "Context", "What was the broader market doing? HTF bias, trend, range..."],
              ["location", "Location", "Where did you take the trade? POC, LVN, supply/demand zone..."],
              ["confirmation", "Confirmation", "What triggered entry? Zero print, delta divergence, absorption..."]
            ].map(([key, label, placeholder]) => (
              <label key={key} style={labelStyle}>
                <span style={{ ...labelText, color: clcColors[key] }}>{label}</span>
                <textarea
                  value={form.clc[key]}
                  onChange={e => setForm(f => ({ ...f, clc: { ...f.clc, [key]: e.target.value } }))}
                  placeholder={placeholder}
                  style={{ ...inputStyle, height: 72, resize: "vertical", fontSize: 12, lineHeight: 1.5,
                    borderColor: form.clc[key] ? clcColors[key] + "66" : "#30363d" }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#21262d", margin: "0 0 20px" }} />

        {/* Signal tags */}
        <div style={{ marginBottom: 18 }}>
          <span style={labelText}>Signals</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {Object.values(SIGNAL_TAGS).flat().map(t => (
              <button key={t} onClick={() => toggleSignal(t)}
                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace",
                  borderColor: form.signals.includes(t) ? "#58a6ff" : "#30363d",
                  background: form.signals.includes(t) ? "rgba(88,166,255,0.15)" : "transparent",
                  color: form.signals.includes(t) ? "#58a6ff" : "#8b949e" }}>{t}</button>
            ))}
            {/* Custom signals added this trade */}
            {form.signals.filter(s => !Object.values(SIGNAL_TAGS).flat().includes(s)).map(t => (
              <button key={t} onClick={() => toggleSignal(t)}
                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #58a6ff", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace", background: "rgba(88,166,255,0.15)", color: "#58a6ff", display: "flex", alignItems: "center", gap: 5 }}>
                {t} <span style={{ opacity: 0.7, fontSize: 13, lineHeight: 1 }}>×</span>
              </button>
            ))}
            {/* Add custom signal */}
            <div style={{ display: "flex", gap: 4 }}>
              <input value={customSignalInput} onChange={e => setCustomSignalInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomSignal()}
                placeholder="+ custom…"
                style={{ ...inputStyle, width: 110, padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "#30363d", height: "auto" }} />
              {customSignalInput.trim() && (
                <button onClick={addCustomSignal}
                  style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #58a6ff", background: "rgba(88,166,255,0.15)", color: "#58a6ff", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>+</button>
              )}
            </div>
          </div>
        </div>

        {/* Outcome tags */}
        <div style={{ marginBottom: 20 }}>
          <span style={labelText}>Outcome Tags</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {OUTCOME_TAGS.map(t => (
              <button key={t} onClick={() => toggleOutcome(t)}
                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace",
                  borderColor: form.outcomes.includes(t) ? "#d29922" : "#30363d",
                  background: form.outcomes.includes(t) ? "rgba(210,153,34,0.12)" : "transparent",
                  color: form.outcomes.includes(t) ? "#d29922" : "#8b949e" }}>{t}</button>
            ))}
            {/* Custom outcomes added this trade */}
            {form.outcomes.filter(s => !OUTCOME_TAGS.includes(s)).map(t => (
              <button key={t} onClick={() => toggleOutcome(t)}
                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #d29922", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace", background: "rgba(210,153,34,0.12)", color: "#d29922", display: "flex", alignItems: "center", gap: 5 }}>
                {t} <span style={{ opacity: 0.7, fontSize: 13, lineHeight: 1 }}>×</span>
              </button>
            ))}
            {/* Add custom outcome */}
            <div style={{ display: "flex", gap: 4 }}>
              <input value={customOutcomeInput} onChange={e => setCustomOutcomeInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomOutcome()}
                placeholder="+ custom…"
                style={{ ...inputStyle, width: 110, padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "#30363d", height: "auto" }} />
              {customOutcomeInput.trim() && (
                <button onClick={addCustomOutcome}
                  style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #d29922", background: "rgba(210,153,34,0.12)", color: "#d29922", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>+</button>
              )}
            </div>
          </div>
        </div>

        {/* Screenshot upload */}
        <div style={{ marginBottom: 20 }}>
          <span style={labelText}>Screenshot</span>
          <div style={{ marginTop: 10 }}>
            {form.screenshot ? (
              <div style={{ position: "relative" }}>
                <img src={form.screenshot} alt="Trade screenshot" style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 8, border: "1px solid #21262d", background: "#0d1117", display: "block" }} />
                <button onClick={() => setForm(f => ({ ...f, screenshot: null }))}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(248,81,73,0.85)", border: "none", borderRadius: 6, color: "#fff", padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>✕ Remove</button>
              </div>
            ) : (
              <label style={{ display: "block", cursor: "pointer" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setForm(f => ({ ...f, screenshot: ev.target.result }));
                  reader.readAsDataURL(file);
                }} />
                <div style={{ border: "2px dashed #30363d", borderRadius: 8, padding: "28px 20px", textAlign: "center", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#388bfd"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#8b949e" }}>Click to upload screenshot</div>
                  <div style={{ fontSize: 11, color: "#484f58", marginTop: 4 }}>PNG, JPG, WebP supported</div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Notes */}
        <label style={labelStyle}><span style={labelText}>Notes</span>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ ...inputStyle, height: 72, resize: "vertical" }} placeholder="Anything else worth noting..." /></label>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: "transparent", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 2, padding: 12, background: "linear-gradient(135deg, #1f6feb, #388bfd)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14 }}>Log Trade</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 10, padding: "20px 24px" }}>
      <div style={{ color: "#8b949e", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ color: color || "#e6edf3", fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#8b949e", fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function CalendarView({ trades }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const dayMap = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = { pnl: 0, count: 0, wins: 0, bes: 0, trades: [] };
      map[t.date].pnl += t.pnl;
      map[t.date].count++;
      if (tradeResult(t.pnl) === "WIN") map[t.date].wins++;
      if (tradeResult(t.pnl) === "BE") map[t.date].bes++;
      map[t.date].trades.push(t);
    });
    return map;
  }, [trades]);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = new Date(calYear, calMonth, 1).toLocaleString("default", { month: "long" });

  const monthEntries = Object.entries(dayMap).filter(([d]) => {
    const [y, m] = d.split("-");
    return parseInt(y) === calYear && parseInt(m) - 1 === calMonth;
  });
  const maxAbsPnl = Math.max(...monthEntries.map(([, v]) => Math.abs(v.pnl)), 1);

  const monthStats = useMemo(() => {
    const days = monthEntries.map(([, v]) => v);
    return {
      totalPnl: days.reduce((s, d) => s + d.pnl, 0),
      tradingDays: days.length,
      winDays: days.filter(d => d.pnl > 0).length,
    };
  }, [monthEntries]);

  const weeks = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [firstDay, daysInMonth]);

  function getDateKey(day) {
    if (!day) return null;
    return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getDayBg(data, intensity) {
    const result = tradeResult(data.pnl);
    if (result === "BE") return `rgba(210,153,34,${0.18 + intensity * 0.5})`;
    if (result === "WIN") return `rgba(35,134,54,${0.18 + intensity * 0.62})`;
    return `rgba(218,54,51,${0.18 + intensity * 0.62})`;
  }

  function getWeekPnl(week) {
    return week.reduce((sum, day) => {
      if (!day) return sum;
      const key = getDateKey(day);
      return sum + (dayMap[key]?.pnl || 0);
    }, 0);
  }

  function getWeekData(week) {
    let pnl = 0, days = 0, wins = 0;
    week.forEach(day => {
      if (!day) return;
      const key = getDateKey(day);
      const d = dayMap[key];
      if (!d) return;
      pnl += d.pnl;
      days++;
      if (d.pnl > 0) wins++;
    });
    return { pnl, days, wins };
  }

  const todayStr = today.toISOString().split("T")[0];
  const selectedKey = selectedDay ? getDateKey(selectedDay) : null;
  const selectedData = selectedKey ? dayMap[selectedKey] : null;

  function prevMonth() {
    let m = calMonth - 1, y = calYear;
    if (m < 0) { m = 11; y--; }
    setCalMonth(m); setCalYear(y); setSelectedDay(null);
  }
  function nextMonth() {
    let m = calMonth + 1, y = calYear;
    if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y); setSelectedDay(null);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", width: 34, height: 34, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 17, fontWeight: 700, color: "#e6edf3", minWidth: 170, textAlign: "center" }}>{monthName} {calYear}</span>
          <button onClick={nextMonth} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", width: 34, height: 34, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <button onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); setSelectedDay(null); }}
            style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>This month</button>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly P&L</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: monthStats.totalPnl >= 0 ? "#3fb950" : "#f85149" }}>{formatCurrencyShort(monthStats.totalPnl)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Trading Days</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e6edf3" }}>{monthStats.tradingDays}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Win Days</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#3fb950" }}>{monthStats.winDays}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* Calendar grid */}
        <div style={{ flex: 1 }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", padding: "6px 0", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {week.map((day, di) => {
                const key = getDateKey(day);
                const data = key ? dayMap[key] : null;
                const intensity = data ? Math.abs(data.pnl) / maxAbsPnl : 0;
                const isSelected = day && selectedDay === day;
                const isToday = key === todayStr;
                const winRate = data && data.count > 0 ? Math.round(data.wins / data.count * 100) : null;

                return (
                  <div key={di}
                    onClick={() => day && setSelectedDay(isSelected ? null : day)}
                    style={{
                      minHeight: 95,
                      borderRadius: 6,
                      padding: "8px 10px",
                      background: data ? getDayBg(data, intensity) : day ? "#0d1117" : "transparent",
                      border: isSelected ? "2px solid #388bfd" : isToday ? "1px solid rgba(56,139,253,0.4)" : data
                        ? `1px solid ${tradeResult(data.pnl) === "WIN" ? "rgba(63,185,80,0.25)" : tradeResult(data.pnl) === "BE" ? "rgba(210,153,34,0.25)" : "rgba(248,81,73,0.25)"}`
                        : day ? "1px solid #21262d" : "1px solid transparent",
                      cursor: day ? "pointer" : "default",
                      transition: "border-color 0.1s",
                      opacity: day ? 1 : 0,
                    }}
                    onMouseEnter={e => { if (day && !isSelected) e.currentTarget.style.borderColor = "#388bfd88"; }}
                    onMouseLeave={e => {
                      if (day && !isSelected) {
                        e.currentTarget.style.borderColor = data
                          ? (data.pnl >= 0 ? "rgba(63,185,80,0.25)" : "rgba(248,81,73,0.25)")
                          : "#21262d";
                      }
                    }}>
                    {day && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: isToday ? "#388bfd" : "#6e7681", fontWeight: isToday ? 700 : 400 }}>{day}</span>
                          {data && <span style={{ fontSize: 8, color: data.pnl >= 0 ? "#3fb950" : "#f85149" }}>●</span>}
                        </div>
                        {data ? (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: tradeResult(data.pnl) === "WIN" ? "#3fb950" : tradeResult(data.pnl) === "BE" ? "#d29922" : "#f85149", lineHeight: 1.2 }}>
                              {formatCurrencyShort(data.pnl)}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(230,237,243,0.6)", marginTop: 3, fontFamily: "'Space Mono', monospace" }}>
                              {data.count} trade{data.count !== 1 ? "s" : ""}
                            </div>
                            {data.count > 0 && (
                              <div style={{ fontSize: 10, color: "rgba(230,237,243,0.5)", fontFamily: "'Space Mono', monospace" }}>
                                {data.wins}W · {data.count - data.wins - data.bes}L{data.bes > 0 ? ` · ${data.bes}BE` : ""}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Weekly sidebar */}
        <div style={{ width: 120 }}>
          <div style={{ height: 28 }} />
          {weeks.map((week, wi) => {
            const { pnl, days } = getWeekData(week);
            return (
              <div key={wi} style={{ minHeight: 95, background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: "10px 12px", marginBottom: 4, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#6e7681", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Week {wi + 1}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: days > 0 ? (tradeResult(pnl) === "WIN" ? "#3fb950" : tradeResult(pnl) === "BE" ? "#d29922" : "#f85149") : "#6e7681" }}>
                  {days > 0 ? formatCurrencyShort(pnl) : "—"}
                </div>
                {days > 0 && <div style={{ fontSize: 10, color: "#6e7681", marginTop: 3, fontFamily: "'Space Mono', monospace" }}>{days} day{days !== 1 ? "s" : ""}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && selectedData && (
        <SelectedDayPanel selectedData={selectedData} selectedKey={selectedKey} />
      )}
    </div>
  );
}

function SelectedDayPanel({ selectedData, selectedKey }) {
  const [expandedId, setExpandedId] = useState(null);
  return (
    <div style={{ marginTop: 20, background: "#0d1117", border: "1px solid #388bfd44", borderRadius: 10, padding: 24 }}>
      {/* Day header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, color: "#e6edf3" }}>{formatDate(selectedKey)}</span>
          <span style={{ color: "#8b949e", fontSize: 13 }}>{selectedData.count} trade{selectedData.count !== 1 ? "s" : ""}</span>
          <span style={{ color: "#3fb950", fontSize: 13 }}>{selectedData.wins}W</span>
          <span style={{ color: "#f85149", fontSize: 13 }}>{selectedData.count - selectedData.wins - selectedData.bes}L</span>
          {selectedData.bes > 0 && <span style={{ color: "#d29922", fontSize: 13 }}>{selectedData.bes}BE</span>}
        </div>
        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 20, color: tradeResult(selectedData.pnl) === "WIN" ? "#3fb950" : tradeResult(selectedData.pnl) === "BE" ? "#d29922" : "#f85149" }}>{formatCurrencyFull(selectedData.pnl)}</span>
      </div>

      {/* Trade cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {selectedData.trades.map(t => {
          const isExpanded = expandedId === t.id;
          const result = tradeResult(t.pnl);
          const pnlColor = result === "WIN" ? "#3fb950" : result === "BE" ? "#d29922" : "#f85149";
          const hasCLC = t.clc && (t.clc.context || t.clc.location || t.clc.confirmation);
          const hasSignals = t.signals?.length > 0;
          const hasOutcomes = t.outcomes?.length > 0;
          const hasScreenshot = !!t.screenshot;
          const hasDetails = hasCLC || hasSignals || hasOutcomes || t.notes || hasScreenshot;

          return (
            <div key={t.id} style={{ background: "#161b22", borderRadius: 10, border: `1px solid ${isExpanded ? "#388bfd44" : "#21262d"}`, overflow: "hidden", transition: "border-color 0.15s" }}>
              {/* Collapsed row — always visible */}
              <div
                onClick={() => hasDetails && setExpandedId(isExpanded ? null : t.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", cursor: hasDetails ? "pointer" : "default" }}
              >
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", width: 40, flexShrink: 0 }}>{t.time}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13, color: t.direction === "LONG" ? "#3fb950" : "#f85149", width: 80, flexShrink: 0 }}>
                  {t.direction === "LONG" ? "▲" : "▼"} {t.instrument}
                </span>
                {/* Signals preview */}
                <div style={{ display: "flex", gap: 5, flex: 1, flexWrap: "wrap" }}>
                  {(t.signals || []).slice(0, 4).map(tag => (
                    <span key={tag} style={{ background: "rgba(88,166,255,0.1)", color: "#58a6ff", fontSize: 10, padding: "2px 7px", borderRadius: 8, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(88,166,255,0.18)" }}>{tag}</span>
                  ))}
                  {(t.outcomes || []).slice(0, 2).map(tag => (
                    <span key={tag} style={{ background: "rgba(210,153,34,0.1)", color: "#d29922", fontSize: 10, padding: "2px 7px", borderRadius: 8, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(210,153,34,0.18)" }}>{tag}</span>
                  ))}
                  {result === "BE" && <span style={{ background: "rgba(210,153,34,0.15)", color: "#d29922", fontSize: 10, padding: "2px 7px", borderRadius: 8, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(210,153,34,0.3)", fontWeight: 700 }}>BE</span>}
                </div>
                {/* Indicators */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {hasCLC && <span title="CLC" style={{ fontSize: 10, color: "#388bfd", fontFamily: "'Space Mono', monospace", background: "rgba(56,139,253,0.1)", padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(56,139,253,0.2)" }}>CLC</span>}
                  {hasScreenshot && <span style={{ fontSize: 13 }}>🖼</span>}
                  {hasDetails && <span style={{ color: "#484f58", fontSize: 14, marginLeft: 2 }}>{isExpanded ? "▲" : "▼"}</span>}
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: pnlColor, minWidth: 80, textAlign: "right", flexShrink: 0 }}>{formatCurrencyFull(t.pnl)}</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: "0 16px 18px", borderTop: "1px solid #21262d" }}>
                  {/* CLC */}
                  {hasCLC && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>CLC Law</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {[["Context", t.clc?.context, "#58a6ff"], ["Location", t.clc?.location, "#d29922"], ["Confirmation", t.clc?.confirmation, "#3fb950"]].map(([label, val, color]) => val ? (
                          <div key={label} style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${color}` }}>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
                            <div style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6 }}>{val}</div>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {t.notes && (
                    <div style={{ marginTop: 14, background: "#0d1117", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #388bfd" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Notes</div>
                      <div style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6 }}>{t.notes}</div>
                    </div>
                  )}

                  {/* Screenshot */}
                  {hasScreenshot && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Screenshot</div>
                      <img src={t.screenshot} alt="Trade screenshot" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #21262d", display: "block" }} />
                    </div>
                  )}

                  {/* Entry details */}
                  <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 12, borderTop: "1px solid #21262d" }}>
                    {[["Entry", t.entry?.toFixed(2)], ["Exit", t.exit?.toFixed(2)], ["Contracts", t.contracts], ["Session", t.session]].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#484f58", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#c9d1d9" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TradingJournal() {
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem("flowjournal_trades");
      return saved ? JSON.parse(saved) : sampleTrades;
    } catch { return sampleTrades; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterInstrument, setFilterInstrument] = useState("ALL");
  const [filterSetup, setFilterSetup] = useState("ALL");
  const [selectedTrade, setSelectedTrade] = useState(null);

  function saveTrades(updated) {
    setTrades(updated);
    try { localStorage.setItem("flowjournal_trades", JSON.stringify(updated)); } catch {}
  }

  function addTrade(t) { saveTrades([t, ...trades]); setShowAdd(false); }

  const filtered = useMemo(() => trades.filter(t => {
    if (filterInstrument !== "ALL" && t.instrument !== filterInstrument) return false;
    if (filterSetup !== "ALL") {
      const signals = t.signals || t.tags?.filter(tag => Object.values(SIGNAL_TAGS).flat().includes(tag)) || [];
      if (!signals.includes(filterSetup)) return false;
    }
    return true;
  }), [trades, filterInstrument, filterSetup]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, t) => s + t.pnl, 0);
    const wins = filtered.filter(t => tradeResult(t.pnl) === "WIN");
    const losses = filtered.filter(t => tradeResult(t.pnl) === "LOSS");
    const bes = filtered.filter(t => tradeResult(t.pnl) === "BE");
    // Win rate excludes BE trades from denominator
    const decisive = wins.length + losses.length;
    const winRate = decisive ? (wins.length / decisive) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const pf = losses.length && avgLoss !== 0 ? Math.abs((avgWin * wins.length) / (avgLoss * losses.length)) : 0;
    // Avg R: use avg loss as the 1R benchmark. Each trade's R = pnl / |avgLoss|
    const avgLossAbs = Math.abs(avgLoss) || 1;
    const rValues = filtered.filter(t => tradeResult(t.pnl) !== "BE").map(t => t.pnl / avgLossAbs);
    const avgR = rValues.length ? rValues.reduce((s, r) => s + r, 0) / rValues.length : 0;
    return { total, winRate, avgWin, avgLoss, wins: wins.length, losses: losses.length, bes: bes.length, total_trades: filtered.length, pf, avgR };
  }, [filtered]);

  const equityCurve = useMemo(() => {
    let running = 0;
    return [...filtered].reverse().map(t => { running += t.pnl; return { pnl: running }; });
  }, [filtered]);


  const tabStyle = t => ({
    padding: "10px 22px", background: "none", border: "none", cursor: "pointer",
    fontFamily: "'Space Mono', monospace", fontSize: 12,
    color: activeTab === t ? "#e6edf3" : "#8b949e",
    borderBottom: activeTab === t ? "2px solid #388bfd" : "2px solid transparent",
    transition: "all 0.15s", letterSpacing: "0.04em"
  });

  return (
    <div style={{ background: "#010409", minHeight: "100vh", color: "#e6edf3", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ borderBottom: "1px solid #21262d", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #1f6feb, #388bfd)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📊</div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, color: "#e6edf3" }}>FlowJournal</span>
          <span style={{ background: "rgba(88,166,255,0.15)", color: "#58a6ff", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(88,166,255,0.3)" }}>BETA</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ background: "linear-gradient(135deg, #1f6feb, #388bfd)", border: "none", borderRadius: 8, color: "#fff", padding: "8px 20px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13 }}>
          + Log Trade
        </button>
      </div>
      <div style={{ borderBottom: "1px solid #21262d", padding: "0 32px", display: "flex", gap: 4 }}>
        {[["dashboard", "Dashboard"], ["calendar", "Calendar"], ["trades", "Trade Log"]].map(([key, label]) => (
          <button key={key} style={tabStyle(key)} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {activeTab === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
              <StatCard label="Net P&L" value={formatCurrencyFull(stats.total)} color={stats.total >= 0 ? "#3fb950" : "#f85149"} sub={`${stats.total_trades} trades`} />
              <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? "#3fb950" : "#f85149"} sub={`${stats.wins}W · ${stats.losses}L · ${stats.bes}BE`} />
              <StatCard label="Profit Factor" value={stats.pf ? stats.pf.toFixed(2) : "—"} color={stats.pf >= 1.5 ? "#3fb950" : stats.pf >= 1 ? "#d29922" : "#f85149"} />
              <StatCard label="Avg Win / Loss" value={formatCurrencyFull(stats.avgWin)} sub={`Loss: ${formatCurrencyFull(stats.avgLoss)}`} color="#3fb950" />
              <StatCard label="Avg R Multiple" value={stats.avgR ? (stats.avgR >= 0 ? "+" : "") + stats.avgR.toFixed(2) + "R" : "—"} color={stats.avgR > 0 ? "#3fb950" : stats.avgR < 0 ? "#f85149" : "#8b949e"} sub="excl. BE trades" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
              <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 10, padding: 24 }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Equity Curve</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 22, color: stats.total >= 0 ? "#3fb950" : "#f85149", lineHeight: 1 }}>
                      {stats.total >= 0 ? "+" : ""}{stats.total < 0 ? "-" : ""}${Math.abs(stats.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", marginTop: 4 }}>{equityCurve.length} trades</div>
                  </div>
                </div>
                {equityCurve.length > 0 ? (() => {
                  const vals = equityCurve.map(d => d.pnl);
                  const rawMin = Math.min(...vals, 0);
                  const rawMax = Math.max(...vals, 0);
                  // Pad range slightly so line doesn't hug edges
                  const pad = (rawMax - rawMin) * 0.06 || 20;
                  const min = rawMin - pad;
                  const max = rawMax + pad;
                  const range = max - min;
                  const W = 560, H = 120;
                  const toX = i => (i / Math.max(equityCurve.length - 1, 1)) * W;
                  const toY = v => H - ((v - min) / range) * H;
                  const pts = equityCurve.map((d, i) => [toX(i), toY(d.pnl)]);
                  const linePath = "M " + pts.map(([x, y]) => `${x},${y}`).join(" L ");
                  const areaPath = `M ${pts[0][0]},${H} L ` + pts.map(([x, y]) => `${x},${y}`).join(" L ") + ` L ${pts[pts.length-1][0]},${H} Z`;
                  const zeroY = toY(0);
                  const color = stats.total >= 0 ? "#3fb950" : "#f85149";
                  const colorRgb = stats.total >= 0 ? "63,185,80" : "248,81,73";
                  const niceVal = v => {
                    const abs = Math.abs(v);
                    const str = abs >= 1000 ? `$${(abs/1000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
                    return (v >= 0 ? "+" : "-") + str;
                  };
                  const yLabels = [rawMax, (rawMax + rawMin) / 2, rawMin].filter((v, i, a) => a.indexOf(v) === i);
                  return (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 24, width: 52, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                        {yLabels.map((v, i) => (
                          <span key={i} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#484f58", lineHeight: 1, textAlign: "right", display: "block" }}>{niceVal(v)}</span>
                        ))}
                      </div>
                      <div style={{ marginLeft: 58 }}>
                        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                          <defs>
                            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={`rgb(${colorRgb})`} stopOpacity="0.18" />
                              <stop offset="100%" stopColor={`rgb(${colorRgb})`} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {yLabels.map((v, i) => (
                            <line key={i} x1="0" y1={toY(v)} x2={W} y2={toY(v)} stroke="#21262d" strokeWidth="1" strokeDasharray="3,5" />
                          ))}
                          {rawMin < 0 && rawMax > 0 && (
                            <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="#30363d" strokeWidth="1.5" strokeDasharray="4,4" />
                          )}
                          <path d={areaPath} fill="url(#eqGrad)" />
                          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill={color} />
                          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="7" fill={color} fillOpacity="0.2" />
                        </svg>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#484f58" }}>{filtered.length > 0 ? formatDate([...filtered].reverse()[0]?.date || "") : ""}</span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#484f58" }}>{filtered.length > 0 ? formatDate(filtered[0]?.date || "") : ""}</span>
                        </div>
                      </div>
                    </div>
                  );
                })() : <div style={{ color: "#8b949e", textAlign: "center", padding: 40 }}>No data</div>}

                {/* Tag Performance — sits directly under the chart */}
                {(() => {
                  const tagMap = {};
                  filtered.forEach(t => {
                    // only include signal tags, not outcome tags
                    const allTags = [...(t.signals || [])];
                    allTags.forEach(tag => {
                      if (!tagMap[tag]) tagMap[tag] = { pnl: 0, count: 0, wins: 0, losses: 0, bes: 0 };
                      tagMap[tag].pnl += t.pnl; tagMap[tag].count++;
                      const r = tradeResult(t.pnl);
                      if (r === "WIN") tagMap[tag].wins++;
                      else if (r === "LOSS") tagMap[tag].losses++;
                      else tagMap[tag].bes++;
                    });
                  });
                  const tags = Object.entries(tagMap)
                    .map(([tag, d]) => ({ tag, ...d, wr: (d.wins + d.losses) > 0 ? d.wins / (d.wins + d.losses) * 100 : 0 }))
                    .sort((a, b) => b.pnl - a.pnl);
                  if (tags.length === 0) return null;
                  const maxAbsPnl = Math.max(...tags.map(t => Math.abs(t.pnl)), 1);
                  return (
                    <div style={{ marginTop: 24, borderTop: "1px solid #21262d", paddingTop: 20 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Signal Performance</div>
                      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 52px 52px 64px 80px", gap: 10, alignItems: "center", paddingBottom: 7, borderBottom: "1px solid #21262d", marginBottom: 2 }}>
                        {["Signal", "P&L Bar", "Trades", "Win%", "W·L·BE", "Net P&L"].map(h => (
                          <span key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                        ))}
                      </div>
                      {tags.map(({ tag, pnl, count, wins, losses, bes, wr }) => {
                        return (
                          <div key={tag} style={{ display: "grid", gridTemplateColumns: "160px 1fr 52px 52px 64px 80px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #161b22" }}>
                            <span style={{ background: "rgba(88,166,255,0.1)", color: "#58a6ff", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(88,166,255,0.18)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tag}</span>
                            <div style={{ background: "#161b22", borderRadius: 3, height: 12, position: "relative", overflow: "hidden" }}>
                              <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 3, background: pnl >= 0 ? "rgba(63,185,80,0.55)" : "rgba(248,81,73,0.55)", width: `${Math.abs(pnl) / maxAbsPnl * 100}%` }} />
                            </div>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e" }}>{count}</span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: wr >= 60 ? "#3fb950" : wr >= 40 ? "#d29922" : "#f85149" }}>{wr.toFixed(0)}%</span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#8b949e" }}>{wins}·{losses}·{bes}</span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: pnl >= 0 ? "#3fb950" : "#f85149", textAlign: "right" }}>{formatCurrencyFull(pnl)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 10, padding: 24 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Recent Trades</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.slice(0, 7).map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#161b22", borderRadius: 8, cursor: "pointer", border: "1px solid #21262d", transition: "border-color 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#388bfd"} onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}>
                      <div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: t.direction === "LONG" ? "#3fb950" : "#f85149" }}>{t.direction === "LONG" ? "▲" : "▼"} {t.instrument}</span>
                        <div style={{ color: "#8b949e", fontSize: 11, marginTop: 2 }}>{formatDate(t.date)} · {t.time}</div>
                      </div>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: t.pnl >= 0 ? "#3fb950" : "#f85149" }}>{formatCurrencyFull(t.pnl)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "calendar" && <CalendarView trades={trades} />}

        {activeTab === "trades" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div><span style={{ ...labelText, display: "block", marginBottom: 4 }}>Instrument</span>
                <select value={filterInstrument} onChange={e => setFilterInstrument(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                  <option>ALL</option>{INSTRUMENTS.map(i => <option key={i}>{i}</option>)}</select></div>
              <div><span style={{ ...labelText, display: "block", marginBottom: 4 }}>Signal</span>
                <select value={filterSetup} onChange={e => setFilterSetup(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                  <option value="ALL">ALL</option>
                  {Object.values(SIGNAL_TAGS).flat().map(s => <option key={s}>{s}</option>)}
                </select></div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#8b949e" }}>{filtered.length} trades · <span style={{ color: stats.total >= 0 ? "#3fb950" : "#f85149" }}>{formatCurrencyFull(stats.total)}</span></div>
              </div>
            </div>
            <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#161b22" }}>
                  {["Date", "Time", "Instrument", "Direction", "Entry", "Exit", "Contracts", "P&L", "Signals", "Outcome"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#8b949e", fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 400, borderBottom: "1px solid #21262d" }}>{h}</th>
                  ))}</tr></thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.id} onClick={() => setSelectedTrade(selectedTrade?.id === t.id ? null : t)}
                      style={{ borderBottom: "1px solid #21262d", cursor: "pointer", background: selectedTrade?.id === t.id ? "rgba(88,166,255,0.05)" : i % 2 === 0 ? "transparent" : "#0d1117" }}>
                      <td style={td}>{formatDate(t.date)}</td>
                      <td style={td}>{t.time}</td>
                      <td style={{ ...td, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{t.instrument}</td>
                      <td style={td}><span style={{ color: t.direction === "LONG" ? "#3fb950" : "#f85149", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 12 }}>{t.direction === "LONG" ? "▲ LONG" : "▼ SHORT"}</span></td>
                      <td style={{ ...td, fontFamily: "'Space Mono', monospace" }}>{t.entry.toFixed(2)}</td>
                      <td style={{ ...td, fontFamily: "'Space Mono', monospace" }}>{t.exit.toFixed(2)}</td>
                      <td style={td}>{t.contracts}</td>
                      <td style={{ ...td, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: tradeResult(t.pnl) === "WIN" ? "#3fb950" : tradeResult(t.pnl) === "BE" ? "#d29922" : "#f85149" }}>
                        {formatCurrencyFull(t.pnl)}
                        {tradeResult(t.pnl) === "BE" && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(210,153,34,0.15)", color: "#d29922", padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(210,153,34,0.3)" }}>BE</span>}
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>{t.setup}</td>
                      <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(t.signals || t.tags?.filter(tag => Object.values(SIGNAL_TAGS).flat().includes(tag)) || []).slice(0, 3).map(tag => (
                        <span key={tag} style={{ background: "rgba(88,166,255,0.1)", color: "#58a6ff", fontSize: 10, padding: "2px 6px", borderRadius: 10, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(88,166,255,0.2)", whiteSpace: "nowrap" }}>{tag}</span>
                      ))}</div></td>
                      <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(t.outcomes || t.tags?.filter(tag => OUTCOME_TAGS.includes(tag)) || []).slice(0, 2).map(tag => (
                        <span key={tag} style={{ background: "rgba(210,153,34,0.1)", color: "#d29922", fontSize: 10, padding: "2px 6px", borderRadius: 10, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(210,153,34,0.2)", whiteSpace: "nowrap" }}>{tag}</span>
                      ))}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "#8b949e" }}>No trades. <button onClick={() => setShowAdd(true)} style={{ background: "none", border: "none", color: "#388bfd", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>+ Log trade</button></div>}
            </div>
            {selectedTrade && (
              <div style={{ marginTop: 20, background: "#0d1117", border: "1px solid #388bfd44", borderRadius: 10, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div><span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, color: selectedTrade.direction === "LONG" ? "#3fb950" : "#f85149" }}>{selectedTrade.direction === "LONG" ? "▲" : "▼"} {selectedTrade.instrument}</span>
                    <span style={{ color: "#8b949e", marginLeft: 12, fontSize: 14 }}>{formatDate(selectedTrade.date)} at {selectedTrade.time}</span></div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 22, color: tradeResult(selectedTrade.pnl) === "WIN" ? "#3fb950" : tradeResult(selectedTrade.pnl) === "BE" ? "#d29922" : "#f85149" }}>{formatCurrencyFull(selectedTrade.pnl)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                  {[["Session", selectedTrade.session], ["Entry", selectedTrade.entry.toFixed(2)], ["Exit", selectedTrade.exit.toFixed(2)], ["Contracts", selectedTrade.contracts]].map(([k, v]) => (
                    <div key={k}><div style={{ color: "#8b949e", fontSize: 11, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
                  ))}
                </div>

                {/* CLC Law */}
                {selectedTrade.clc && (selectedTrade.clc.context || selectedTrade.clc.location || selectedTrade.clc.confirmation) && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>CLC Law</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[["Context", selectedTrade.clc.context, "#58a6ff"], ["Location", selectedTrade.clc.location, "#d29922"], ["Confirmation", selectedTrade.clc.confirmation, "#3fb950"]].map(([label, val, color]) => val ? (
                        <div key={label} style={{ background: "#161b22", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${color}` }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
                          <div style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.5 }}>{val}</div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                {/* Signals */}
                {(selectedTrade.signals?.length > 0) && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Signals</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedTrade.signals.map(tag => (
                        <span key={tag} style={{ background: "rgba(88,166,255,0.12)", color: "#58a6ff", fontSize: 11, padding: "3px 10px", borderRadius: 12, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(88,166,255,0.25)" }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outcomes */}
                {(selectedTrade.outcomes?.length > 0) && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Outcome</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedTrade.outcomes.map(tag => (
                        <span key={tag} style={{ background: "rgba(210,153,34,0.12)", color: "#d29922", fontSize: 11, padding: "3px 10px", borderRadius: 12, fontFamily: "'Space Mono', monospace", border: "1px solid rgba(210,153,34,0.25)" }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrade.notes && <div style={{ background: "#161b22", borderRadius: 8, padding: "12px 16px", borderLeft: "3px solid #388bfd" }}>
                  <div style={{ color: "#8b949e", fontSize: 11, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "#c9d1d9" }}>{selectedTrade.notes}</div></div>}
              </div>
            )}
          </>
        )}

      </div>
      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} onSave={addTrade} />}
    </div>
  );
}
