import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FabricVisualizer({ parameters }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !parameters) return;

    // Cleanup previous scene
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    // Parse parameters with defaults
    const fit = parameters.Fit ?? 0.5;
    const mesh = parameters.Mesh ?? 0.5;
    const thickness = parameters.Thickness ?? 0.5;
    const airflow = parameters.Airflow ?? 0.5;
    const support = parameters.Support ?? 0.5;

    // Map parameters to actual values
    const scale = 0.8 + fit * 0.4; // 0.8x to 1.2x
    const gridSize = Math.round(4 + mesh * 12); // 4 to 16
    const numLayers = Math.round(1 + thickness * 4); // 1 to 5
    const layerSpacing = 0.2;
    const outlineThickness = 0.5 + airflow * 2.5; // thin to thick (for line rendering)
    const deformationStrength = (1 - support) * 0.4; // more curves when support is low

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // Position camera based on grid size for better framing
    const cameraDistance = Math.max(8, gridSize * 1.2);
    camera.position.set(cameraDistance, cameraDistance * 0.8, cameraDistance);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight1.position.set(5, 10, 5);
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // Generate cube grid with shared vertices
    const cubeSize = 1.0;
    const halfSize = cubeSize / 2;
    const gridWidth = gridSize;
    const gridHeight = gridSize;

    // Create vertex grid (one extra vertex per dimension for shared corners)
    const vertexGrid = [];
    const totalVertices = (gridWidth + 1) * (gridHeight + 1);

    // Generate base vertex positions with deformation
    for (let z = 0; z <= gridHeight; z++) {
      for (let x = 0; x <= gridWidth; x++) {
        const baseX = (x - gridWidth / 2) * cubeSize;
        const baseZ = (z - gridHeight / 2) * cubeSize;

        // Apply wave deformation based on Support parameter
        const waveX = Math.sin(baseX * 0.5) * Math.cos(baseZ * 0.3) * deformationStrength;
        const waveZ = Math.cos(baseX * 0.4) * Math.sin(baseZ * 0.6) * deformationStrength;
        const waveY = Math.sin(baseX * 0.3 + baseZ * 0.4) * deformationStrength * 0.5;

        vertexGrid.push({
          x: baseX + waveX,
          z: baseZ + waveZ,
          y: waveY,
        });
      }
    }

    // Create layers
    for (let layer = 0; layer < numLayers; layer++) {
      const layerY = layer * layerSpacing - (numLayers - 1) * layerSpacing * 0.5;

      // Create geometry for all cubes in this layer
      const geometries = [];
      const outlineGeometries = [];

      for (let z = 0; z < gridHeight; z++) {
        for (let x = 0; x < gridWidth; x++) {
          // Get corner vertices for this cube
          const v00 = vertexGrid[z * (gridWidth + 1) + x];
          const v10 = vertexGrid[z * (gridWidth + 1) + x + 1];
          const v01 = vertexGrid[(z + 1) * (gridWidth + 1) + x];
          const v11 = vertexGrid[(z + 1) * (gridWidth + 1) + x + 1];

          // Create cube geometry from corner positions
          const geometry = new THREE.BufferGeometry();
          const positions = [];
          const normals = [];
          const indices = [];

          // Apply 3D deformation to cube vertices
          // Use the Y deformation from vertex grid and apply it to both bottom and top faces
          // Also add layer-based Y variation for 3D effect
          const baseY00 = layerY + v00.y;
          const baseY10 = layerY + v10.y;
          const baseY01 = layerY + v01.y;
          const baseY11 = layerY + v11.y;

          // Define 8 vertices of the cube (using deformed corners with 3D Y deformation)
          const vertices = [
            // Bottom face (with Y deformation)
            new THREE.Vector3(v00.x, baseY00 - halfSize, v00.z),
            new THREE.Vector3(v10.x, baseY10 - halfSize, v10.z),
            new THREE.Vector3(v11.x, baseY11 - halfSize, v11.z),
            new THREE.Vector3(v01.x, baseY01 - halfSize, v01.z),
            // Top face (with Y deformation)
            new THREE.Vector3(v00.x, baseY00 + halfSize, v00.z),
            new THREE.Vector3(v10.x, baseY10 + halfSize, v10.z),
            new THREE.Vector3(v11.x, baseY11 + halfSize, v11.z),
            new THREE.Vector3(v01.x, baseY01 + halfSize, v01.z),
          ];

          // Add vertices to positions array
          const baseIndex = positions.length / 3;
          vertices.forEach((v) => {
            positions.push(v.x, v.y, v.z);
          });

          // Calculate normals for each face
          const faceNormals = [
            // Bottom face (pointing down)
            new THREE.Vector3(0, -1, 0),
            // Top face (pointing up)
            new THREE.Vector3(0, 1, 0),
            // Front face
            new THREE.Vector3()
              .subVectors(vertices[1], vertices[0])
              .cross(new THREE.Vector3().subVectors(vertices[4], vertices[0]))
              .normalize(),
            // Back face
            new THREE.Vector3()
              .subVectors(vertices[2], vertices[3])
              .cross(new THREE.Vector3().subVectors(vertices[7], vertices[3]))
              .normalize(),
            // Right face
            new THREE.Vector3()
              .subVectors(vertices[2], vertices[1])
              .cross(new THREE.Vector3().subVectors(vertices[5], vertices[1]))
              .normalize(),
            // Left face
            new THREE.Vector3()
              .subVectors(vertices[3], vertices[0])
              .cross(new THREE.Vector3().subVectors(vertices[4], vertices[0]))
              .normalize(),
          ];

          // Define cube faces (6 faces, each with 2 triangles)
          const faces = [
            // Bottom face
            [0, 1, 2, 0, 2, 3],
            // Top face
            [4, 7, 6, 4, 6, 5],
            // Front face
            [0, 4, 5, 0, 5, 1],
            // Back face
            [2, 6, 7, 2, 7, 3],
            // Right face
            [1, 5, 6, 1, 6, 2],
            // Left face
            [3, 7, 4, 3, 4, 0],
          ];

          faces.forEach((face, faceIdx) => {
            const normal = faceNormals[faceIdx];
            const idx = baseIndex;
            // First triangle
            indices.push(idx + face[0], idx + face[1], idx + face[2]);
            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);
            // Second triangle
            indices.push(idx + face[3], idx + face[4], idx + face[5]);
            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);
          });

          geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
          geometry.setIndex(indices);
          geometry.computeBoundingSphere();

          geometries.push(geometry);

          // Create outline geometry (edges only)
          const outlineGeometry = new THREE.EdgesGeometry(geometry);
          outlineGeometries.push(outlineGeometry);
        }
      }

      // Create material for cubes (transparent)
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.05,
      });

      // Create outline material
      // Note: linewidth doesn't work in WebGL, so we use opacity and color intensity
      // to simulate thickness variation
      const outlineOpacity = 0.3 + airflow * 0.7; // More airflow (0) = more transparent, Less airflow (1) = more opaque
      const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0x222222,
        opacity: outlineOpacity,
        transparent: true,
      });

      // Create a group for this layer to apply scale
      const layerGroup = new THREE.Group();
      layerGroup.scale.set(scale, scale, scale);

      // Create meshes and outlines for each cube
      geometries.forEach((geom, idx) => {
        // Create mesh
        const mesh = new THREE.Mesh(geom, material);
        layerGroup.add(mesh);

        // Create outline
        const outlineGeom = outlineGeometries[idx];
        const outline = new THREE.LineSegments(outlineGeom, outlineMaterial);
        layerGroup.add(outline);
      });

      scene.add(layerGroup);
    }

    // Add controls for rotation and zoom
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let rotationX = 0;
    let rotationY = 0;
    let zoomLevel = 1.0;
    const minZoom = 0.3;
    const maxZoom = 3.0;
    
    // Store initial camera distance for zoom calculations
    const initialCameraDistance = cameraDistance;

    const onMouseDown = (e) => {
      mouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!mouseDown) return;
      const deltaX = e.clientX - mouseX;
      const deltaY = e.clientY - mouseY;
      rotationY += deltaX * 0.01;
      rotationX += deltaY * 0.01;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseUp = () => {
      mouseDown = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.001;
      zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel - delta));
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mouseleave", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Apply rotation
      scene.rotation.y = rotationY;
      scene.rotation.x = rotationX;

      // Apply zoom by adjusting camera distance from origin
      // Since scene rotates, we maintain camera's world position direction
      const newDistance = initialCameraDistance / zoomLevel;
      const direction = new THREE.Vector3(1, 0.8, 1).normalize();
      camera.position.copy(direction.multiplyScalar(newDistance));
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mouseleave", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [parameters]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "500px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#f5f5f5",
      }}
    />
  );
}

