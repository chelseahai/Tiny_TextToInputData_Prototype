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
    const gridSize = Math.round(9 * Math.pow(2, mesh * 2)); // 9 to 36 (mesh=0→9, mesh=0.5→18, mesh=1→36)
    const numLayers = Math.round(1 + thickness * 4); // 1 to 5
    const layerSpacing = 0.2;
    const outlineThickness = 1 + airflow * 7; // 1 to 8 (airflow=0→1, airflow=0.5→4.0, airflow=1→8.0)
    const deformationStrength = (1 - support) * 0.8; // 0.8 to 0.0 (support=0→0.8, support=0.5→0.4, support=1→0.0)

    // Create scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // Position camera at fixed distance (independent of grid size)
    const cameraDistance = 45; // Fixed camera distance
    camera.position.set(cameraDistance, cameraDistance * 0.8, cameraDistance);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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

    // Create layers - each layer's top vertices become the next layer's bottom vertices
    let currentLayerBottomVertices = null; // Will store top vertices of previous layer
    
    // Store all geometries and their original positions for animation
    const allGeometries = [];
    const originalPositions = [];
    const geometryToOutlineMap = new Map(); // Map main geometry index to outline LineSegments
    const geometryToDiagonalsMap = new Map(); // Map main geometry index to diagonal Line objects array
    const geometryToCubeVerticesMap = new Map(); // Map main geometry index to original cube vertices
    const geometryToFaceXMap = new Map(); // Map main geometry index to face X Line objects array
    
    // Store airflow for use in animation loop
    const storedAirflow = airflow;
    

    for (let layer = 0; layer < numLayers; layer++) {
      // Create geometry for all cubes in this layer
      const geometries = [];
      const outlineGeometries = [];
      const cubeVertices = []; // Store vertices for diagonal lines
      const cubePositions = []; // Store cube grid positions (x, z) for color gradient (per layer)
      
      // Store top vertices of this layer for the next layer
      const currentLayerTopVertices = [];

      for (let z = 0; z < gridHeight; z++) {
        for (let x = 0; x < gridWidth; x++) {
          // Get corner vertices for this cube
          let v00, v10, v01, v11;
          
          if (layer === 0) {
            // First layer: use vertex grid for bottom face
            v00 = vertexGrid[z * (gridWidth + 1) + x];
            v10 = vertexGrid[z * (gridWidth + 1) + x + 1];
            v01 = vertexGrid[(z + 1) * (gridWidth + 1) + x];
            v11 = vertexGrid[(z + 1) * (gridWidth + 1) + x + 1];
          } else {
            // Subsequent layers: use previous layer's top vertices as bottom vertices
            // currentLayerBottomVertices is a 2D array [z][x]
            v00 = currentLayerBottomVertices[z][x];
            v10 = currentLayerBottomVertices[z][x + 1];
            v01 = currentLayerBottomVertices[z + 1][x];
            v11 = currentLayerBottomVertices[z + 1][x + 1];
          }

          // Create cube geometry from corner positions
          const geometry = new THREE.BufferGeometry();
          const positions = [];
          const normals = [];
          const indices = [];

          // Calculate bottom face Y positions (from vertex grid or previous layer)
          const bottomY00 = v00.y;
          const bottomY10 = v10.y;
          const bottomY01 = v01.y;
          const bottomY11 = v11.y;

          // Top face is cubeSize above bottom face
          const topY00 = bottomY00 + cubeSize;
          const topY10 = bottomY10 + cubeSize;
          const topY01 = bottomY01 + cubeSize;
          const topY11 = bottomY11 + cubeSize;

          // Store top vertices for next layer (initialize on first cube)
          if (z === 0 && x === 0) {
            // Initialize array to match vertex grid structure
            for (let i = 0; i <= gridHeight; i++) {
              currentLayerTopVertices[i] = [];
              for (let j = 0; j <= gridWidth; j++) {
                currentLayerTopVertices[i][j] = null;
              }
            }
          }
          
          // Store all four corners (only store if not already set to avoid overwriting shared vertices)
          if (currentLayerTopVertices[z][x] === null) {
            currentLayerTopVertices[z][x] = { x: v00.x, y: topY00, z: v00.z };
          }
          if (currentLayerTopVertices[z][x + 1] === null) {
            currentLayerTopVertices[z][x + 1] = { x: v10.x, y: topY10, z: v10.z };
          }
          if (currentLayerTopVertices[z + 1][x] === null) {
            currentLayerTopVertices[z + 1][x] = { x: v01.x, y: topY01, z: v01.z };
          }
          currentLayerTopVertices[z + 1][x + 1] = { x: v11.x, y: topY11, z: v11.z };

          // Define 8 vertices of the cube
          const vertices = [
            // Bottom face
            new THREE.Vector3(v00.x, bottomY00, v00.z),
            new THREE.Vector3(v10.x, bottomY10, v10.z),
            new THREE.Vector3(v11.x, bottomY11, v11.z),
            new THREE.Vector3(v01.x, bottomY01, v01.z),
            // Top face
            new THREE.Vector3(v00.x, topY00, v00.z),
            new THREE.Vector3(v10.x, topY10, v10.z),
            new THREE.Vector3(v11.x, topY11, v11.z),
            new THREE.Vector3(v01.x, topY01, v01.z),
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
          
          // Store cube position for color gradient
          cubePositions.push({ x, z, layer });
          
          // Store vertices for diagonal lines
          cubeVertices.push(vertices);
          
          // Store geometry and original positions for animation
          const geomIndex = allGeometries.length;
          allGeometries.push(geometry);
          // Store a deep copy of positions array
          originalPositions.push(new Float32Array(positions));
          geometryToCubeVerticesMap.set(geomIndex, vertices); // Store original vertices for diagonal lines

          // Create outline geometry (edges only)
          const outlineGeometry = new THREE.EdgesGeometry(geometry);
          outlineGeometries.push(outlineGeometry);
        }
      }

      // Set top vertices of this layer as bottom vertices for next layer
      currentLayerBottomVertices = currentLayerTopVertices;

      // Helper function to calculate color based on position for gradient
      // Uses (x + z + layer) so adjacent cubes in any dimension have the same hue
      const getCubeColor = (x, z, layer, gridWidth, gridHeight, numLayers) => {
        // Give layer more weight so it has visible impact
        // x and z typically range 0-8 or more, layer is usually 0-4, so we weight layer more
        const layerWeight = Math.max(gridWidth, gridHeight); // Match the max of x or z range
        // Reduce xy variation by scaling down x and z contribution
        const xyScale = 0.6; // Reduce xy variation (was 1.0)
        const sum = (x + z) * xyScale + (layer * layerWeight);
        
        // Multiply by factor to create larger hue jumps between adjacent cubes
        const sumMultiplier = 10; // Creates more noticeable color differences
        const adjustedSum = sum * sumMultiplier;
        
        // Use modulo to wrap around the hue range, creating distinct color bands
        // This way the multiplier actually creates larger jumps
        const hue = adjustedSum % 360;
        const saturation = 0.6; // Moderate saturation
        const lightness = 0.5; // Medium lightness for cubes
        
        // Convert HSL to RGB
        const color = new THREE.Color();
        color.setHSL(hue / 360, saturation, lightness);
        return color;
      };
      
      // Helper function to get darker version of color for outlines
      const getOutlineColor = (x, z, layer, gridWidth, gridHeight, numLayers) => {
        // Give layer more weight so it has visible impact
        const layerWeight = Math.max(gridWidth, gridHeight);
        const xyScale = 0.6;
        const sum = (x + z) * xyScale + (layer * layerWeight);
        const sumMultiplier = 10;
        const adjustedSum = sum * sumMultiplier;
        const hue = adjustedSum % 360;
        const saturation = 0.6;
        const lightness = 0.3; // Darker lightness for outlines
        
        // Convert HSL to RGB
        const color = new THREE.Color();
        color.setHSL(hue / 360, saturation, lightness);
        return color;
      };

      // Outline opacity - less transparent than cubes (cubes are 0.05)
      const baseOutlineOpacity = 0.5 + airflow * 0.4;

      // Create a group for this layer to apply scale
      const layerGroup = new THREE.Group();
      layerGroup.scale.set(scale, scale, scale);

      // Create meshes and outlines for each cube
      geometries.forEach((geom, idx) => {
        // Create unique material for each cube with gradient color
        const cubePos = cubePositions[idx];
        const cubeColor = getCubeColor(cubePos.x, cubePos.z, cubePos.layer, gridWidth, gridHeight, numLayers);
        
        const cubeMaterial = new THREE.MeshStandardMaterial({
          color: cubeColor,
          metalness: 0.3,
          roughness: 0.7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.05,
        });
        
        // Create mesh with unique colored material
        const mesh = new THREE.Mesh(geom, cubeMaterial);
        layerGroup.add(mesh);

        // Create outline as simple lines with darker version of cube color
        const outlineGeom = outlineGeometries[idx];
        // Use darker version of the cube color for outlines
        const outlineColor = getOutlineColor(cubePos.x, cubePos.z, cubePos.layer, gridWidth, gridHeight, numLayers);
        const outlineMaterial = new THREE.LineBasicMaterial({
          color: outlineColor,
          opacity: baseOutlineOpacity,
          transparent: true,
        });
        const outline = new THREE.LineSegments(outlineGeom, outlineMaterial);
        layerGroup.add(outline);
        
        // Store outline references for animation
        const geomIndex = allGeometries.indexOf(geom);
        if (geomIndex !== -1) {
          geometryToOutlineMap.set(geomIndex, outline);
        }

        // Add diagonal lines inside cube based on airflow
        const vertices = cubeVertices[idx];
        let numDiagonals = 0;
        
        if (airflow >= 0.33 && airflow < 0.66) {
          numDiagonals = 2; // 2 diagonals forming X pattern
        } else if (airflow >= 0.66) {
          numDiagonals = 4; // All 4 space diagonals
        }
        
        const diagonalLines = [];
        if (numDiagonals > 0) {
          // Cube vertices: 0=bottom-front-left, 1=bottom-front-right, 2=bottom-back-right, 3=bottom-back-left
          //               4=top-front-left, 5=top-front-right, 6=top-back-right, 7=top-back-left
          
          const diagonalPairs = [
            [0, 6], // bottom-front-left to top-back-right
            [1, 7], // bottom-front-right to top-back-left
            [2, 4], // bottom-back-right to top-front-left
            [3, 5], // bottom-back-left to top-front-right
          ];
          
          // Create diagonal lines
          for (let i = 0; i < numDiagonals; i++) {
            const [startIdx, endIdx] = diagonalPairs[i];
            const start = vertices[startIdx];
            const end = vertices[endIdx];
            const diagonalGeometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(start.x, start.y, start.z),
              new THREE.Vector3(end.x, end.y, end.z),
            ]);
            const diagonalLine = new THREE.Line(diagonalGeometry, outlineMaterial);
            layerGroup.add(diagonalLine);
            diagonalLines.push(diagonalLine);
          }
        }
        
        // Store diagonal lines reference for animation
        if (geomIndex !== -1 && diagonalLines.length > 0) {
          geometryToDiagonalsMap.set(geomIndex, diagonalLines);
        }

        // Add face X patterns based on airflow
        const faceXLines = [];
        if (airflow >= 0.34 && airflow < 0.67) {
          // X pattern on top and bottom faces only
          // Bottom face: vertices 0, 1, 2, 3
          // Top face: vertices 4, 5, 6, 7
          const bottomX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z),
              new THREE.Vector3(vertices[2].x, vertices[2].y, vertices[2].z)
            ]),
            outlineMaterial
          );
          const bottomX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[1].x, vertices[1].y, vertices[1].z),
              new THREE.Vector3(vertices[3].x, vertices[3].y, vertices[3].z)
            ]),
            outlineMaterial
          );
          const topX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[4].x, vertices[4].y, vertices[4].z),
              new THREE.Vector3(vertices[6].x, vertices[6].y, vertices[6].z)
            ]),
            outlineMaterial
          );
          const topX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[5].x, vertices[5].y, vertices[5].z),
              new THREE.Vector3(vertices[7].x, vertices[7].y, vertices[7].z)
            ]),
            outlineMaterial
          );
          layerGroup.add(bottomX1);
          layerGroup.add(bottomX2);
          layerGroup.add(topX1);
          layerGroup.add(topX2);
          faceXLines.push({ face: 'bottom', lines: [bottomX1, bottomX2] });
          faceXLines.push({ face: 'top', lines: [topX1, topX2] });
        } else if (airflow >= 0.67) {
          // X pattern on all 6 faces
          // Bottom face: 0→2, 1→3
          const bottomX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z),
              new THREE.Vector3(vertices[2].x, vertices[2].y, vertices[2].z)
            ]),
            outlineMaterial
          );
          const bottomX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[1].x, vertices[1].y, vertices[1].z),
              new THREE.Vector3(vertices[3].x, vertices[3].y, vertices[3].z)
            ]),
            outlineMaterial
          );
          // Top face: 4→6, 5→7
          const topX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[4].x, vertices[4].y, vertices[4].z),
              new THREE.Vector3(vertices[6].x, vertices[6].y, vertices[6].z)
            ]),
            outlineMaterial
          );
          const topX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[5].x, vertices[5].y, vertices[5].z),
              new THREE.Vector3(vertices[7].x, vertices[7].y, vertices[7].z)
            ]),
            outlineMaterial
          );
          // Front face: 0→5, 1→4
          const frontX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z),
              new THREE.Vector3(vertices[5].x, vertices[5].y, vertices[5].z)
            ]),
            outlineMaterial
          );
          const frontX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[1].x, vertices[1].y, vertices[1].z),
              new THREE.Vector3(vertices[4].x, vertices[4].y, vertices[4].z)
            ]),
            outlineMaterial
          );
          // Back face: 2→7, 3→6
          const backX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[2].x, vertices[2].y, vertices[2].z),
              new THREE.Vector3(vertices[7].x, vertices[7].y, vertices[7].z)
            ]),
            outlineMaterial
          );
          const backX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[3].x, vertices[3].y, vertices[3].z),
              new THREE.Vector3(vertices[6].x, vertices[6].y, vertices[6].z)
            ]),
            outlineMaterial
          );
          // Right face: 1→6, 2→5
          const rightX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[1].x, vertices[1].y, vertices[1].z),
              new THREE.Vector3(vertices[6].x, vertices[6].y, vertices[6].z)
            ]),
            outlineMaterial
          );
          const rightX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[2].x, vertices[2].y, vertices[2].z),
              new THREE.Vector3(vertices[5].x, vertices[5].y, vertices[5].z)
            ]),
            outlineMaterial
          );
          // Left face: 3→4, 0→7
          const leftX1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[3].x, vertices[3].y, vertices[3].z),
              new THREE.Vector3(vertices[4].x, vertices[4].y, vertices[4].z)
            ]),
            outlineMaterial
          );
          const leftX2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z),
              new THREE.Vector3(vertices[7].x, vertices[7].y, vertices[7].z)
            ]),
            outlineMaterial
          );
          
          layerGroup.add(bottomX1);
          layerGroup.add(bottomX2);
          layerGroup.add(topX1);
          layerGroup.add(topX2);
          layerGroup.add(frontX1);
          layerGroup.add(frontX2);
          layerGroup.add(backX1);
          layerGroup.add(backX2);
          layerGroup.add(rightX1);
          layerGroup.add(rightX2);
          layerGroup.add(leftX1);
          layerGroup.add(leftX2);
          
          faceXLines.push({ face: 'bottom', lines: [bottomX1, bottomX2] });
          faceXLines.push({ face: 'top', lines: [topX1, topX2] });
          faceXLines.push({ face: 'front', lines: [frontX1, frontX2] });
          faceXLines.push({ face: 'back', lines: [backX1, backX2] });
          faceXLines.push({ face: 'right', lines: [rightX1, rightX2] });
          faceXLines.push({ face: 'left', lines: [leftX1, leftX2] });
        }
        
        // Store face X lines reference for animation
        if (geomIndex !== -1 && faceXLines.length > 0) {
          geometryToFaceXMap.set(geomIndex, faceXLines);
        }

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
    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.01; // Increment time for animation

      // Apply subtle idle animation to fabric
      // Gentle wave effect that makes the fabric appear to breathe
      const animationStrength = 0.75; // 1.5x stronger (was 0.5)
      const waveSpeed = 2.0; // Faster wave speed
      
      // Only animate if we have geometries
      if (allGeometries.length === 0 || originalPositions.length === 0) {
        // Apply rotation
        scene.rotation.y = rotationY;
        scene.rotation.x = rotationX;

        // Apply zoom by adjusting camera distance from origin
        const newDistance = initialCameraDistance / zoomLevel;
        const direction = new THREE.Vector3(1, 0.8, 1).normalize();
        camera.position.copy(direction.multiplyScalar(newDistance));
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        return;
      }
      
      allGeometries.forEach((geometry, geomIdx) => {
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
          return;
        }
        
        const originalPos = originalPositions[geomIdx];
        if (!originalPos) {
          return;
        }
        
        const positions = geometry.attributes.position.array;
        const vertexCount = originalPos.length / 3;
        
        // Helper function to calculate wave offset for a given position
        const getWaveOffset = (x, y, z) => {
          const wave1 = Math.sin(x * 0.3 + time * waveSpeed) * Math.cos(z * 0.25 + time * waveSpeed * 0.7);
          const wave2 = Math.cos(x * 0.2 + time * waveSpeed * 0.5) * Math.sin(z * 0.35 + time * waveSpeed * 1.2);
          const wave3 = Math.sin((x + z) * 0.15 + time * waveSpeed * 0.8);
          const yOffset = (wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.3) * animationStrength;
          return {
            x: x + wave1 * animationStrength * 0.1,
            y: y + yOffset,
            z: z + wave2 * animationStrength * 0.1
          };
        };
        
        // Get the position attribute array directly
        const positionAttribute = geometry.attributes.position;
        if (!positionAttribute || !positionAttribute.array) {
          return;
        }
        
        const positionArray = positionAttribute.array;
        
        for (let i = 0; i < vertexCount; i++) {
          const baseX = originalPos[i * 3];
          const baseY = originalPos[i * 3 + 1];
          const baseZ = originalPos[i * 3 + 2];
          
          // Calculate animated position
          const animated = getWaveOffset(baseX, baseY, baseZ);
          
          // Update position directly in the array
          positionArray[i * 3] = animated.x;
          positionArray[i * 3 + 1] = animated.y;
          positionArray[i * 3 + 2] = animated.z;
        }
        
        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals(); // Recalculate normals for proper lighting
        
        // Update outline geometry (recreate EdgesGeometry from animated geometry)
        const outline = geometryToOutlineMap.get(geomIdx);
        if (outline) {
          const oldGeometry = outline.geometry;
          outline.geometry = new THREE.EdgesGeometry(geometry);
          if (oldGeometry) oldGeometry.dispose();
        }
        
        // Update diagonal lines - update positions directly
        const diagonalLines = geometryToDiagonalsMap.get(geomIdx);
        if (diagonalLines) {
          const originalVertices = geometryToCubeVerticesMap.get(geomIdx);
          if (originalVertices) {
            // Cube vertices: 0=bottom-front-left, 1=bottom-front-right, 2=bottom-back-right, 3=bottom-back-left
            //               4=top-front-left, 5=top-front-right, 6=top-back-right, 7=top-back-left
            const diagonalPairs = [
              [0, 6], [1, 7], [2, 4], [3, 5]
            ];
            
            diagonalLines.forEach((line, lineIdx) => {
              const [startIdx, endIdx] = diagonalPairs[lineIdx];
              const origStart = originalVertices[startIdx];
              const origEnd = originalVertices[endIdx];
              
              // Calculate animated positions
              const animatedStart = getWaveOffset(origStart.x, origStart.y, origStart.z);
              const animatedEnd = getWaveOffset(origEnd.x, origEnd.y, origEnd.z);
              
              // Update line position
              const linePositions = line.geometry.attributes.position;
              if (linePositions) {
                linePositions.array[0] = animatedStart.x;
                linePositions.array[1] = animatedStart.y;
                linePositions.array[2] = animatedStart.z;
                linePositions.array[3] = animatedEnd.x;
                linePositions.array[4] = animatedEnd.y;
                linePositions.array[5] = animatedEnd.z;
                linePositions.needsUpdate = true;
              }
            });
          }
        }
        
        // Update face X lines - update positions directly
        const faceXLines = geometryToFaceXMap.get(geomIdx);
        if (faceXLines) {
          const originalVertices = geometryToCubeVerticesMap.get(geomIdx);
          if (originalVertices) {
            // Define vertex pairs for each face X pattern
            const faceVertexPairs = {
              bottom: [[0, 2], [1, 3]],
              top: [[4, 6], [5, 7]],
              front: [[0, 5], [1, 4]],
              back: [[2, 7], [3, 6]],
              right: [[1, 6], [2, 5]],
              left: [[3, 4], [0, 7]]
            };
            
            faceXLines.forEach((faceX) => {
              const pairs = faceVertexPairs[faceX.face];
              faceX.lines.forEach((line, lineIdx) => {
                const [startIdx, endIdx] = pairs[lineIdx];
                const origStart = originalVertices[startIdx];
                const origEnd = originalVertices[endIdx];
                
                // Calculate animated positions
                const animatedStart = getWaveOffset(origStart.x, origStart.y, origStart.z);
                const animatedEnd = getWaveOffset(origEnd.x, origEnd.y, origEnd.z);
                
                // Update line position
                const linePositions = line.geometry.attributes.position;
                if (linePositions) {
                  linePositions.array[0] = animatedStart.x;
                  linePositions.array[1] = animatedStart.y;
                  linePositions.array[2] = animatedStart.z;
                  linePositions.array[3] = animatedEnd.x;
                  linePositions.array[4] = animatedEnd.y;
                  linePositions.array[5] = animatedEnd.z;
                  linePositions.needsUpdate = true;
                }
              });
            });
          }
        }
      });

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
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "transparent",
      }}
    />
  );
}

