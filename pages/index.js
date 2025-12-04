import { useState, useEffect } from "react";
import Head from "next/head";
import FabricVisualizer from "../components/FabricVisualizer";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    
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

  // Keyboard shortcut: Enter to analyze
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (!input.trim() || loading) return;
        
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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, loading]);

  return (
    <>
      <Head>
        <title>What are you doing for today?</title>
        <meta name="description" content="Convert natural language descriptions into garment parameters" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ 
        height: "100vh", 
        width: "100vw", 
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 300,
        position: "relative"
      }}>
        {/* Visualization - Full Viewport */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "600px",
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#fff"
        }}>
          {loading && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "14px",
              fontWeight: 300,
              color: "#999",
              zIndex: 10
            }}>
              Analyzing...
            </div>
          )}
          {result ? (
            <>
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <div style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%",
                  maxHeight: "100%"
                }}>
                  <FabricVisualizer parameters={result} />
                </div>
              </div>
              <p style={{ 
                position: "absolute",
                bottom: "40px",
                right: "40px",
                fontSize: "11px", 
                color: "#999", 
                fontWeight: 300,
                letterSpacing: "0.5px",
                margin: 0
              }}>
                Drag to rotate • Scroll to zoom
              </p>
            </>
          ) : (
            <div style={{
              color: "#ccc",
              fontSize: "14px",
              fontWeight: 300
            }}>
              Enter a description to generate visualization
            </div>
          )}
        </div>

        {/* Left Panel - Input (Overlay) */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "600px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
          background: "transparent",
          zIndex: 20
        }}>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: 300, 
            marginBottom: "40px",
            letterSpacing: "0.5px"
          }}>
            What are you doing for today?
          </h1>
          
          <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your day or plan..."
              style={{ 
                flex: 1,
                width: "100%",
                padding: "16px",
                border: "none",
                borderRadius: "4px",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 300,
                fontSize: "14px",
                resize: "none",
                background: "transparent",
                outline: "none"
              }}
            />
            <p style={{ 
              marginTop: "12px", 
              fontSize: "11px", 
              color: "#999",
              fontWeight: 300
            }}>
              Press Enter to analyze
            </p>
          </form>

          {/* Parameter Sliders */}
          <div style={{ marginTop: "40px", paddingTop: "40px" }}>
            {result ? (
              <>
                {/* FIT */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 300,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#000"
                  }}>
                    <span style={{ width: "90px" }}>FIT</span>
                    <div style={{ 
                      flex: 1, 
                      position: "relative", 
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      margin: "0 20px",
                      paddingLeft: "80px",
                      paddingRight: "90px"
                    }}>
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", left: "0", whiteSpace: "nowrap" }}>Close</span>
                      <div style={{
                        position: "absolute",
                        left: "80px",
                        right: "90px",
                        height: "1px",
                        background: "#e0e0e0"
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `calc(80px + ${(result.Fit ?? 0) * 100}% * (100% - 170px) / 100%)`,
                        width: "1px",
                        height: "16px",
                        background: "#000",
                        transform: "translateX(-50%)"
                      }} />
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", right: "0", whiteSpace: "nowrap" }}>Loose</span>
                    </div>
                    <span style={{ 
                      width: "50px", 
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: "#000",
                      marginLeft: "12px"
                    }}>
                      {(result.Fit ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* MESH */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 300,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#000"
                  }}>
                    <span style={{ width: "90px" }}>MESH</span>
                    <div style={{ 
                      flex: 1, 
                      position: "relative", 
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      margin: "0 20px",
                      paddingLeft: "80px",
                      paddingRight: "90px"
                    }}>
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", left: "0", whiteSpace: "nowrap" }}>Open</span>
                      <div style={{
                        position: "absolute",
                        left: "80px",
                        right: "90px",
                        height: "1px",
                        background: "#e0e0e0"
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `calc(80px + ${(result.Mesh ?? 0) * 100}% * (100% - 170px) / 100%)`,
                        width: "1px",
                        height: "16px",
                        background: "#000",
                        transform: "translateX(-50%)"
                      }} />
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", right: "0", whiteSpace: "nowrap" }}>Fine</span>
                    </div>
                    <span style={{ 
                      width: "50px", 
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: "#000",
                      marginLeft: "12px"
                    }}>
                      {(result.Mesh ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* THICKNESS */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 300,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#000"
                  }}>
                    <span style={{ width: "90px" }}>THICKNESS</span>
                    <div style={{ 
                      flex: 1, 
                      position: "relative", 
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      margin: "0 20px",
                      paddingLeft: "80px",
                      paddingRight: "90px"
                    }}>
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", left: "0", whiteSpace: "nowrap" }}>Thin</span>
                      <div style={{
                        position: "absolute",
                        left: "80px",
                        right: "90px",
                        height: "1px",
                        background: "#e0e0e0"
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `calc(80px + ${(result.Thickness ?? 0) * 100}% * (100% - 170px) / 100%)`,
                        width: "1px",
                        height: "16px",
                        background: "#000",
                        transform: "translateX(-50%)"
                      }} />
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", right: "0", whiteSpace: "nowrap" }}>Thick</span>
                    </div>
                    <span style={{ 
                      width: "50px", 
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: "#000",
                      marginLeft: "12px"
                    }}>
                      {(result.Thickness ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* AIRFLOW */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 300,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#000"
                  }}>
                    <span style={{ width: "90px" }}>AIRFLOW</span>
                    <div style={{ 
                      flex: 1, 
                      position: "relative", 
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      margin: "0 20px",
                      paddingLeft: "80px",
                      paddingRight: "90px"
                    }}>
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", left: "0", whiteSpace: "nowrap" }}>Breathable</span>
                      <div style={{
                        position: "absolute",
                        left: "80px",
                        right: "90px",
                        height: "1px",
                        background: "#e0e0e0"
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `calc(80px + ${(result.Airflow ?? 0) * 100}% * (100% - 170px) / 100%)`,
                        width: "1px",
                        height: "16px",
                        background: "#000",
                        transform: "translateX(-50%)"
                      }} />
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", right: "0", whiteSpace: "nowrap" }}>Unbreathable</span>
                    </div>
                    <span style={{ 
                      width: "50px", 
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: "#000",
                      marginLeft: "12px"
                    }}>
                      {(result.Airflow ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* SUPPORT */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 300,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#000"
                  }}>
                    <span style={{ width: "90px" }}>SUPPORT</span>
                    <div style={{ 
                      flex: 1, 
                      position: "relative", 
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      margin: "0 20px",
                      paddingLeft: "80px",
                      paddingRight: "90px"
                    }}>
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", left: "0", whiteSpace: "nowrap" }}>Soft</span>
                      <div style={{
                        position: "absolute",
                        left: "80px",
                        right: "90px",
                        height: "1px",
                        background: "#e0e0e0"
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `calc(80px + ${(result.Support ?? 0) * 100}% * (100% - 170px) / 100%)`,
                        width: "1px",
                        height: "16px",
                        background: "#000",
                        transform: "translateX(-50%)"
                      }} />
                      <span style={{ fontSize: "10px", color: "#999", position: "absolute", right: "0", whiteSpace: "nowrap" }}>Rigid</span>
                    </div>
                    <span style={{ 
                      width: "50px", 
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: "#000",
                      marginLeft: "12px"
                    }}>
                      {(result.Support ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: "12px", color: "#999", fontWeight: 300 }}>
                Enter a description to see parameters
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

