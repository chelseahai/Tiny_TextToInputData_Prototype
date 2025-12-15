import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

const FabricVisualizer = dynamic(() => import("../components/FabricVisualizer"), {
  ssr: false,
  loading: () => <div style={{ color: "#ccc", fontSize: "14px", fontWeight: 300 }}>Loading visualization...</div>
});

// Dynamically import client-side API (only if needed for GitHub Pages)
let analyzeTextClientSide = null;
let clientSideModulePromise = null;

// Preload the client-side module
if (typeof window !== 'undefined') {
  clientSideModulePromise = import('../lib/openai-client').then(module => {
    analyzeTextClientSide = module.analyzeTextClientSide;
    return module.analyzeTextClientSide;
  }).catch((err) => {
    console.error("Failed to load client-side API module:", err);
    return null;
  });
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Check if user has seen intro before
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenIntro = localStorage.getItem('hasSeenIntro');
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    }
  }, []);

  const handleCloseIntro = () => {
    setShowIntro(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasSeenIntro', 'true');
    }
  };

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
        // If API route doesn't exist (GitHub Pages returns 404 or 405), try client-side
        if ((res.status === 404 || res.status === 405) && typeof window !== 'undefined') {
          // Wait for client-side module to load if not ready
          if (!analyzeTextClientSide) {
            try {
              const module = await import('../lib/openai-client');
              analyzeTextClientSide = module.analyzeTextClientSide;
            } catch (err) {
              console.error("Failed to load client-side API:", err);
            }
          }
          
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
        
        // For other errors, try to get error message
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        alert(`Error: ${errorData.error || "Failed to analyze"}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (error) {
      // Network error or CORS error - try client-side fallback for GitHub Pages
      if (typeof window !== 'undefined' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        // Wait for client-side module to load if not ready
        if (!analyzeTextClientSide) {
          try {
            const module = await import('../lib/openai-client');
            analyzeTextClientSide = module.analyzeTextClientSide;
          } catch (err) {
            console.error("Failed to load client-side API:", err);
          }
        }
        
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧵</text></svg>" />
      </Head>
      <main style={{ 
        height: "100vh", 
        width: "100vw", 
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 300,
        position: "relative"
      }}>
        {/* Intro Overlay */}
        {showIntro && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            padding: "60px",
            overflowY: "auto",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 300
          }}>
            <div style={{
              maxWidth: "800px",
              margin: "0 auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}>
              <div style={{ flex: 1, overflowY: "auto", paddingRight: "20px" }}>
                <h2 style={{
                  fontSize: "28px",
                  fontWeight: 300,
                  marginBottom: "30px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Overview
                </h2>
                
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    This project is a living catalog that explores how everyday language can be collected, structured, and transformed into a material archive. Instead of cataloging images directly as static artifacts, the system treats short textual descriptions of daily situations as primary media, which are algorithmically translated into a structured set of garment-related parameters. These parameters then generate a dynamic, fabric-like visualization, positioning the catalog as a speculative record of lived conditions rather than fixed objects.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    Framed within the language of digital gardens and personal webcraft, the project functions as an evolving system rather than a closed archive. Each entry is both descriptive and generative, allowing the collection to grow, mutate, and reveal patterns over time as new data is added.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Project Concept as a Living Catalog
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    The collection represents a personal archive of "situations" — moments described through short, subjective text such as weather, movement, social context, and physical demand. Each description is parsed into five normalized attributes: Fit, Mesh, Thickness, Airflow, and Support. Together, these attributes form a structured dataset that acts as an indexable catalog of embodied conditions.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    Rather than displaying media as static thumbnails, the system reveals the collection through a generative fabric visualization. Each catalog entry produces a distinct spatial configuration, allowing the archive to be experienced as a material field rather than a list. The catalog therefore describes a world defined by climate, motion, and bodily negotiation, where structure becomes the primary storytelling device.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Structure as Story
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    Structure is central to how meaning is conveyed. Each text entry is reduced to a consistent five-parameter schema, creating comparability across entries while preserving variation. This normalization allows the collection to be read both qualitatively (through language) and quantitatively (through parameters), making the structure itself the narrative layer.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    The interface reinforces this logic by pairing explicit numeric sliders with an implicit spatial visualization. Sliders and values reveal the system's internal logic, while the fabric-like volume expresses the same data through density, layering, deformation, and motion. What is revealed is the system's interpretation; what remains hidden is the raw linguistic ambiguity that produced it.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Data Thinking and System Logic
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    From a technical perspective, the project practices data thinking by treating each description as structured data. Text input is processed via a backend API that returns strict JSON values for each parameter. On the client side, this data is stored, mirrored in the UI, and passed into a visualization system built with vanilla JavaScript and Three.js.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    This architecture allows the catalog to scale naturally. New entries can be added manually, fetched from a structured source such as a Google Sheet or local JSON, or swapped with peers, without changing the underlying logic. As the dataset grows, patterns emerge across parameters, turning the catalog into an analytical as well as experiential tool.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Multiple Ways of Seeing
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    The project supports multiple modes of reading the collection. One mode emphasizes explicit data: sliders and numeric values allow users to compare entries analytically. Another mode emphasizes spatial intuition: the 3D visualization translates the same parameters into form, motion, and density. Future extensions naturally support filtering or sorting entries by dominant parameters (e.g. high airflow vs. high support), enabling comparative views of the archive.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    This dual representation ensures the catalog can be experienced both as a dataset and as a sensory environment, satisfying the requirement for multiple ways of seeing.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Interaction as Meaningful System Behavior
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    The primary interaction is text input followed by pressing Enter, deliberately minimizing interface chrome. This gesture reinforces the idea that language is the organizing force of the catalog. A custom loading skeleton appears while the system processes the input, and the visualization responds continuously through animated deformation, making the interface feel alive and reactive.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    Direct manipulation of the 3D scene through drag and scroll further reinforces the tactile, exploratory quality of the archive. These interactions are not decorative but directly tied to how the catalog reveals its contents.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Responsiveness, Robustness, and Publishing
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    The site is built as a single-screen experience using semantic HTML, external CSS, and vanilla JavaScript. The layout adapts to smaller screens without breaking, maintaining functional access on mobile. Robust error handling ensures that when WebGL is unavailable, the system presents a clear fallback state rather than failing silently.
                  </p>
                  <p style={{ marginBottom: "20px" }}>
                    The project is structured as a public GitHub repository with a logical folder hierarchy and is deployed via GitHub Pages, complete with metadata and favicon for publishing.
                  </p>
                </div>

                <h3 style={{
                  fontSize: "20px",
                  fontWeight: 300,
                  marginTop: "40px",
                  marginBottom: "20px",
                  letterSpacing: "0.5px",
                  color: "#000"
                }}>
                  Summary
                </h3>
                <div style={{
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#333",
                  marginBottom: "30px"
                }}>
                  <p style={{ marginBottom: "20px" }}>
                    This project fulfills the goals of the living catalog assignment by treating structure as narrative, practicing structured data thinking, and designing an interface that feels personal, responsive, and open-ended. By cataloging lived situations rather than static images, it reframes the idea of an archive as something generative, mutable, and embodied — a system that grows through interaction and reveals meaning through form rather than representation.
                  </p>
                </div>
              </div>

              <div style={{
                marginTop: "40px",
                paddingTop: "30px",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "center"
              }}>
                <button
                  onClick={handleCloseIntro}
                  style={{
                    padding: "12px 40px",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 300,
                    letterSpacing: "0.5px",
                    color: "#000",
                    background: "transparent",
                    border: "1px solid #000",
                    borderRadius: "2px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textTransform: "uppercase"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#000";
                    e.target.style.color = "#fff";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#000";
                  }}
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        )}
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

