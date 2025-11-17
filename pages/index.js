import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 600, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>Garment Logic Analyzer</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your day or plan..."
          style={{ width: "100%", padding: 8 }}
        />
        <button
          type="submit"
          style={{
            marginTop: 12,
            padding: "8px 16px",
            background: "#111",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Analyze
        </button>
      </form>
      <div
        style={{
          marginTop: 20,
          background: "#f4f4f4",
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          Parameter Meanings:
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
          <li><strong>Fit</strong> → 0 = close, 1 = loose</li>
          <li><strong>Mesh</strong> → 0 = open, 1 = fine</li>
          <li><strong>Thickness</strong> → 0 = thin, 1 = thick</li>
          <li><strong>Airflow</strong> → 0 = most breathable, 1 = least breathable</li>
          <li><strong>Support</strong> → 0 = soft, 1 = rigid</li>
        </ul>
      </div>
      {loading && <p>Analyzing...</p>}
      {result && (
        <pre
          style={{
            marginTop: 0,
            background: "#f4f4f4",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}

