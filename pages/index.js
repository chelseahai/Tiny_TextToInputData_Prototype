import { useState } from "react";
import Head from "next/head";
import FabricVisualizer from "../components/FabricVisualizer";

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
    <>
      <Head>
        <title>Garment Logic Analyzer</title>
        <meta name="description" content="Convert natural language descriptions into garment parameters" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ maxWidth: 600, margin: "80px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
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
        <>
          <div
            style={{
              marginTop: 20,
              background: "#fff",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 12,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Current Parameters:
            </h3>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>Fit:</strong> {result.Fit?.toFixed(2) ?? "N/A"}</div>
              <div><strong>Mesh:</strong> {result.Mesh?.toFixed(2) ?? "N/A"}</div>
              <div><strong>Thickness:</strong> {result.Thickness?.toFixed(2) ?? "N/A"}</div>
              <div><strong>Airflow:</strong> {result.Airflow?.toFixed(2) ?? "N/A"}</div>
              <div><strong>Support:</strong> {result.Support?.toFixed(2) ?? "N/A"}</div>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              3D Fabric Visualization
            </h3>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              Drag to rotate • Scroll to zoom • Cubes are connected with shared vertices
            </p>
            <FabricVisualizer parameters={result} />
          </div>
        </>
      )}
      </main>
    </>
  );
}

