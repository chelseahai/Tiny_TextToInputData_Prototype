import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

const FabricVisualizer = dynamic(() => import("../components/FabricVisualizer"), {
  ssr: false,
  loading: () => <div style={{ color: "#ccc", fontSize: "14px", fontWeight: 300 }}>Loading visualization...</div>
});

// Dynamically import client-side API (only if needed for GitHub Pages)
let analyzeTextClientSide = null;
if (typeof window !== 'undefined') {
  import('../lib/openai-client').then(module => {
    analyzeTextClientSide = module.analyzeTextClientSide;
  }).catch(() => {
    // Client-side module not available
  });
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      // Try server-side API route first (works on Vercel/local)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      if (!res.ok) {
        // If API route doesn't exist (GitHub Pages), try client-side
        if (res.status === 404 && typeof window !== 'undefined') {
          const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
          if (apiKey && analyzeTextClientSide) {
            const data = await analyzeTextClientSide(input, apiKey);
            setResult(data);
            setLoading(false);
            return;
          } else if (!apiKey) {
            alert("API route not available. Please set NEXT_PUBLIC_OPENAI_API_KEY for GitHub Pages deployment, or deploy to Vercel for server-side API routes.");
            setLoading(false);
            return;
          }
        }
        
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        alert(`Error: ${errorData.error || "Failed to analyze"}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (error) {
      // Network error - try client-side fallback for GitHub Pages
      if (typeof window !== 'undefined' && error.message.includes('Failed to fetch')) {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        if (apiKey && analyzeTextClientSide) {
          try {
            const data = await analyzeTextClientSide(input, apiKey);
            setResult(data);
            setLoading(false);
            return;
          } catch (clientError) {
            console.error("Client-side API Error:", clientError);
            alert(`Error: ${clientError.message || "Failed to analyze"}`);
            setLoading(false);
            return;
          }
        } else if (!apiKey) {
          alert("API route not available. Please set NEXT_PUBLIC_OPENAI_API_KEY for GitHub Pages deployment, or deploy to Vercel for server-side API routes.");
          setLoading(false);
          return;
        }
      }
      
      console.error("Fetch Error:", error);
      alert(`Error: ${error.message || "Failed to connect to server"}`);
    } finally {
      setLoading(false);
    }
  }, [input]);

  // Keyboard shortcut: Enter to analyze
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (!input.trim() || loading) return;
        
        // Reuse the same handleSubmit logic
        handleSubmit(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, loading, handleSubmit]);

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
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "transparent"
        }}>
          {loading ? (
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              {/* Skeleton Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
                width: "200px",
                height: "200px"
              }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "#f0f0f0",
                      borderRadius: "2px",
                      animation: "pulse 1.5s ease-in-out infinite",
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>
            </div>
          ) : result ? (
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
            {/* Helper function to render a slider */}
            {(() => {
              const renderSlider = (label, value, leftLabel, rightLabel) => {
                // If result is null or value is undefined/null, use 0 as default
                // Otherwise use the actual value
                let displayValue = 0; // Default to 0
                if (result !== null && value !== undefined && value !== null) {
                  displayValue = value; // Use actual value when result exists
                }
                const position = `calc(80px + ${displayValue * 100}% * (100% - 170px) / 100%)`;
                
                return (
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
                      <span style={{ width: "90px" }}>{label}</span>
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
                        <span style={{ fontSize: "10px", color: "#999", position: "absolute", left: "0", whiteSpace: "nowrap" }}>{leftLabel}</span>
                        <div style={{
                          position: "absolute",
                          left: "80px",
                          right: "90px",
                          height: "1px",
                          background: "#e0e0e0"
                        }} />
                        <div style={{
                          position: "absolute",
                          left: position,
                          width: "1px",
                          height: "16px",
                          background: "#000",
                          transform: "translateX(-50%)",
                          transition: "left 0.8s ease-out"
                        }} />
                        <span style={{ fontSize: "10px", color: "#999", position: "absolute", right: "0", whiteSpace: "nowrap" }}>{rightLabel}</span>
                      </div>
                      <span style={{ 
                        width: "50px", 
                        textAlign: "right",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: "#000",
                        marginLeft: "12px"
                      }}>
                        {displayValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderSlider("FIT", result?.Fit, "Close", "Loose")}
                  {renderSlider("MESH", result?.Mesh, "Open", "Fine")}
                  {renderSlider("THICKNESS", result?.Thickness, "Thin", "Thick")}
                  {renderSlider("AIRFLOW", result?.Airflow, "Breathable", "Unbreathable")}
                  {renderSlider("SUPPORT", result?.Support, "Soft", "Rigid")}
                </>
              );
            })()}
          </div>
        </div>
      </main>
    </>
  );
}

