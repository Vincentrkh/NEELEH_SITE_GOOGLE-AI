"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { CityNode } from "./city-data";
import { createCityMaterials } from "./city-materials";
import {
  buildDataConduits,
  buildLandmarkBuilding,
  buildPedestrianSystem,
  buildSurroundingCity,
  buildVehicleTrafficSystem,
  type DataPathInstance,
  type LandmarkInstance,
} from "./city-geometry";
import { CityNodeIcon } from "./city-icons";
import { localeNumber } from "@/lib/format";

export type DashboardStats = {
  registrations: number;
  leads: number;
  courses: number;
  students: number;
  posts: number;
  drafts: number;
  files: number;
} | null;

type IsometricCityViewportProps = {
  nodes: CityNode[];
  activeNodeId: string | null;
  viewMode: "overview" | "entering" | "inside";
  hoveredNodeId: string | null;
  onHoverNode: (id: string | null) => void;
  onSelectNode: (node: CityNode) => void;
  onSoftwareGlChange?: (isSoftware: boolean) => void;
  stats: DashboardStats;
  lang: "fa" | "en";
  searchQuery: string;
  activeGroupFilter: "all" | "main" | "content" | "system";
  searchFocusNode: CityNode | null;
  onEnterFlightComplete?: () => void;
  resetSignal: number;
};

type ProjectedPin = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  scale: number;
};

function getStatBadge(
  node: CityNode,
  stats: DashboardStats,
  lang: "fa" | "en"
): string | null {
  if (!stats || !node.statKey) return null;
  const val = stats[node.statKey];
  if (typeof val !== "number") return null;
  return localeNumber(lang, val);
}

export function IsometricCityViewport({
  nodes,
  activeNodeId,
  viewMode,
  hoveredNodeId,
  onHoverNode,
  onSelectNode,
  onSoftwareGlChange,
  stats,
  lang,
  searchQuery,
  activeGroupFilter,
  searchFocusNode,
  onEnterFlightComplete,
  resetSignal,
}: IsometricCityViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Refs synced into the animation loop without tearing down WebGL context
  const stateRef = useRef({
    activeNodeId,
    viewMode,
    hoveredNodeId,
    searchFocusNodeId: searchFocusNode?.id ?? null,
    onHoverNode,
    onSelectNode,
    onSoftwareGlChange,
    onEnterFlightComplete,
    nodes,
  });
  stateRef.current = {
    activeNodeId,
    viewMode,
    hoveredNodeId,
    searchFocusNodeId: searchFocusNode?.id ?? null,
    onHoverNode,
    onSelectNode,
    onSoftwareGlChange,
    onEnterFlightComplete,
    nodes,
  };

  // Camera pan/zoom offsets for interactive city exploration + single-result search auto-focus
  const panRef = useRef({ x: 0, z: 0, zoom: 1 });
  const autoPanRef = useRef<{ active: boolean; x: number; z: number; zoom: number }>({
    active: false,
    x: 0,
    z: 0,
    zoom: 1,
  });
  const [contextLost, setContextLost] = useState(false);

  // Reset camera when requested
  useEffect(() => {
    autoPanRef.current.active = false;
    panRef.current = { x: 0, z: 0, zoom: 1 };
  }, [resetSignal]);

  // حرکت خودکار دوربین به سمت ساختمان وقتی نتیجه جستجو دقیقاً یک مورد است
  useEffect(() => {
    if (!searchFocusNode || viewMode !== "overview") {
      autoPanRef.current.active = false;
      return;
    }
    autoPanRef.current = {
      active: true,
      x: THREE.MathUtils.clamp(searchFocusNode.x, -18, 18),
      z: THREE.MathUtils.clamp(searchFocusNode.z, -18, 18),
      zoom: 0.78,
    };
  }, [searchFocusNode, viewMode]);

  // Stabilize node ID list key to avoid unnecessary rebuilds
  const nodeKey = nodes.map((n) => n.id).join(",");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      // Probe GL context first to check software vs hardware renderer
      const probeCanvas = document.createElement("canvas");
      const probeGl =
        probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl");
      let isSoftwareGl = false;
      if (probeGl) {
        const dbg = probeGl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          const rendererStr = String(
            probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ""
          );
          isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
            rendererStr
          );
        }
      }
      stateRef.current.onSoftwareGlChange?.(isSoftwareGl);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: "high-performance",
        alpha: false,
      });
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      );
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = !isSoftwareGl;
      if (!isSoftwareGl) {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      const initW = Math.max(container.clientWidth, 320);
      const initH = Math.max(container.clientHeight, 320);
      renderer.setSize(initW, initH);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#ecece8");
      scene.fog = new THREE.FogExp2("#ecece8", 0.0062);

      // لنز آکسونومتریک تله برای حس اسکیس معماری برداری مطابق تصویر
      const camera = new THREE.PerspectiveCamera(20, initW / initH, 0.5, 320);
      const overviewBasePos = new THREE.Vector3(62, 53, 62);
      const overviewBaseTarget = new THREE.Vector3(0, 0.6, 0);
      const currentCamPos = overviewBasePos.clone();
      const currentTarget = overviewBaseTarget.clone();
      camera.position.copy(currentCamPos);
      camera.lookAt(currentTarget);

      // PMREM environment
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.28;

      // Architectural studio lighting
      const hemi = new THREE.HemisphereLight("#ffffff", "#b8c4d4", 1.15);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight("#fffdf8", 1.95);
      sun.position.set(28, 42, 22);
      if (!isSoftwareGl) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 6;
        sun.shadow.camera.far = 115;
        sun.shadow.camera.left = -32;
        sun.shadow.camera.right = 32;
        sun.shadow.camera.top = 32;
        sun.shadow.camera.bottom = -32;
        sun.shadow.bias = -0.0005;
      }
      scene.add(sun);

      const rimFill = new THREE.DirectionalLight("#93c5fd", 0.72);
      rimFill.position.set(-24, 16, -22);
      scene.add(rimFill);

      // Materials & Geometry
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const mats = createCityMaterials(maxAniso);

      // Ground plane
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(140, 140),
        mats.groundMat
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Surrounding irregular city blocks
      const currentNodes = stateRef.current.nodes;
      const cityBackdrop = buildSurroundingCity(currentNodes, mats);
      scene.add(cityBackdrop);

      // Animated human figures & moving vehicles on boulevards + elevated freeway
      const pedestrians = buildPedestrianSystem(mats);
      scene.add(pedestrians.group);

      const vehicles = buildVehicleTrafficSystem(mats);
      scene.add(vehicles.group);

      // Landmark buildings
      const landmarks: LandmarkInstance[] = currentNodes.map((n) => {
        const lm = buildLandmarkBuilding(n, mats);
        scene.add(lm.root);
        return lm;
      });
      const landmarkById = new Map(landmarks.map((l) => [l.node.id, l]));
      const hitMeshes = landmarks.map((l) => l.hitTarget);

      // Data conduits + animated light packets
      const { group: conduitGroup, paths } = buildDataConduits(currentNodes, mats);
      scene.add(conduitGroup);

      // 2 photon packets per data conduit
      const packetsPerPath = 2;
      const totalPackets = paths.length * packetsPerPath;
      const packetGeo = new THREE.SphereGeometry(0.17, 10, 10);
      const packetMesh = new THREE.InstancedMesh(
        packetGeo,
        mats.pulseMat,
        Math.max(1, totalPackets)
      );
      packetMesh.frustumCulled = false;
      scene.add(packetMesh);

      // Elongated cyan trail halos under each photon packet
      const trailGeo = new THREE.CapsuleGeometry(0.11, 0.58, 4, 6);
      const trailMesh = new THREE.InstancedMesh(
        trailGeo,
        new THREE.MeshBasicMaterial({
          color: "#38bdf8",
          transparent: true,
          opacity: 0.84,
        }),
        Math.max(1, totalPackets)
      );
      trailMesh.frustumCulled = false;
      scene.add(trailMesh);

      // Pointer & interaction helpers
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2(-99, -99);
      let isDragging = false;
      let dragMoved = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let lastX = 0;
      let lastY = 0;

      const onPointerDown = (e: PointerEvent) => {
        if (stateRef.current.viewMode !== "overview") return;
        autoPanRef.current.active = false;
        isDragging = true;
        dragMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        lastX = e.clientX;
        lastY = e.clientY;
      };

      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (isDragging && stateRef.current.viewMode === "overview") {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 5) {
            dragMoved = true;
          }
          // Pan along isometric axes
          const panSpeed = 0.042 * panRef.current.zoom;
          panRef.current.x = THREE.MathUtils.clamp(
            panRef.current.x - (dx + dy) * panSpeed * 0.7,
            -18,
            18
          );
          panRef.current.z = THREE.MathUtils.clamp(
            panRef.current.z + (dx - dy) * panSpeed * 0.7,
            -18,
            18
          );
          lastX = e.clientX;
          lastY = e.clientY;
          return;
        }

        if (stateRef.current.viewMode === "overview") {
          raycaster.setFromCamera(pointerNdc, camera);
          const hits = raycaster.intersectObjects(hitMeshes, false);
          const hitId =
            hits.length > 0 ? String(hits[0].object.userData.nodeId || "") : null;
          if (hitId !== stateRef.current.hoveredNodeId) {
            stateRef.current.onHoverNode(hitId || null);
          }
          renderer.domElement.style.cursor = hitId ? "pointer" : "grab";
        } else {
          renderer.domElement.style.cursor = "default";
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        if (isDragging) {
          isDragging = false;
        }
        if (dragMoved || stateRef.current.viewMode !== "overview") return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(hitMeshes, false);
        if (hits.length > 0) {
          const hitId = String(hits[0].object.userData.nodeId || "");
          const lm = landmarkById.get(hitId);
          if (lm) {
            stateRef.current.onSelectNode(lm.node);
          }
        }
      };

      const onWheel = (e: WheelEvent) => {
        if (stateRef.current.viewMode !== "overview") return;
        e.preventDefault();
        autoPanRef.current.active = false;
        panRef.current.zoom = THREE.MathUtils.clamp(
          panRef.current.zoom + e.deltaY * 0.0008,
          0.58,
          1.38
        );
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

      // Context loss safety
      const onContextLost = (ev: Event) => {
        ev.preventDefault();
        setContextLost(true);
      };
      const onContextRestored = () => {
        setContextLost(false);
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener(
        "webglcontextrestored",
        onContextRestored
      );

      // ResizeObserver
      const ro = new ResizeObserver(() => {
        if (!container) return;
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      ro.observe(container);

      // Software GL frame pacing helper
      const gl = renderer.getContext();
      const afterDraw = (cb: () => void) => {
        if (!isSoftwareGl) return requestAnimationFrame(cb);
        if (typeof (gl as WebGL2RenderingContext).fenceSync === "function") {
          const gl2 = gl as WebGL2RenderingContext;
          const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl2.flush();
          const check = () => {
            if (!sync) return cb();
            const res = gl2.clientWaitSync(sync, 0, 0);
            if (res === gl2.TIMEOUT_EXPIRED) {
              setTimeout(check, 24);
            } else {
              gl2.deleteSync(sync);
              setTimeout(cb, 70);
            }
          };
          setTimeout(check, 24);
          return 0;
        }
        return setTimeout(cb, 80) as unknown as number;
      };

      let timerId = 0;
      let stopped = false;
      let prevTime = performance.now();
      let enteringStartMs = 0;
      let lastEnteredKey = "";
      const desiredCamPos = new THREE.Vector3();
      const desiredTarget = new THREE.Vector3();
      const dummy = new THREE.Object3D();
      const tangentVec = new THREE.Vector3();
      const posVec = new THREE.Vector3();
      const upVec = new THREE.Vector3(0, 1, 0);
      const projVec = new THREE.Vector3();

      const tick = () => {
        if (stopped) return;
        const now = performance.now();
        const dt = Math.min((now - prevTime) / 1000, 0.05);
        prevTime = now;
        const tSec = now * 0.001;

        const {
          activeNodeId: activeId,
          viewMode: mode,
          hoveredNodeId: hoverId,
          searchFocusNodeId,
        } = stateRef.current;

        const targetLandmark = activeId ? landmarkById.get(activeId) : undefined;

        // 0. Smooth single-search auto-focus pan in overview mode
        if (mode === "overview" && autoPanRef.current.active) {
          if (prefersReducedMotion) {
            panRef.current.x = autoPanRef.current.x;
            panRef.current.z = autoPanRef.current.z;
            panRef.current.zoom = autoPanRef.current.zoom;
            autoPanRef.current.active = false;
          } else {
            panRef.current.x = THREE.MathUtils.damp(
              panRef.current.x,
              autoPanRef.current.x,
              5.4,
              dt
            );
            panRef.current.z = THREE.MathUtils.damp(
              panRef.current.z,
              autoPanRef.current.z,
              5.4,
              dt
            );
            panRef.current.zoom = THREE.MathUtils.damp(
              panRef.current.zoom,
              autoPanRef.current.zoom,
              5.4,
              dt
            );
            if (
              Math.hypot(
                panRef.current.x - autoPanRef.current.x,
                panRef.current.z - autoPanRef.current.z
              ) < 0.05 &&
              Math.abs(panRef.current.zoom - autoPanRef.current.zoom) < 0.01
            ) {
              autoPanRef.current.active = false;
            }
          }
        }

        // 1. Camera choreography: Overview vs Entering (smooth glide) vs Inside building
        if (mode === "overview" || !targetLandmark) {
          const z = panRef.current.zoom;
          desiredCamPos.set(
            overviewBasePos.x * z + panRef.current.x,
            overviewBasePos.y * z,
            overviewBasePos.z * z + panRef.current.z
          );
          desiredTarget.set(
            overviewBaseTarget.x + panRef.current.x,
            overviewBaseTarget.y,
            overviewBaseTarget.z + panRef.current.z
          );
        } else if (mode === "entering") {
          const n = targetLandmark.node;
          desiredCamPos.set(n.x + 19, n.height + 15.5, n.z + 19);
          desiredTarget.set(n.x, n.height * 0.45, n.z);
        } else {
          // کادربندی نزدیک ساختمان انتخاب‌شده در پس‌زمینه پنجره شیشه‌ای مات
          const n = targetLandmark.node;
          desiredCamPos.set(n.x + 23, n.height + 19, n.z + 23);
          desiredTarget.set(n.x, n.height * 0.42, n.z);
        }

        const dampLambda =
          mode === "entering" ? 4.4 : mode === "inside" ? 5.2 : autoPanRef.current.active ? 5.8 : 9.5;
        if (prefersReducedMotion) {
          currentCamPos.copy(desiredCamPos);
          currentTarget.copy(desiredTarget);
        } else {
          currentCamPos.x = THREE.MathUtils.damp(
            currentCamPos.x,
            desiredCamPos.x,
            dampLambda,
            dt
          );
          currentCamPos.y = THREE.MathUtils.damp(
            currentCamPos.y,
            desiredCamPos.y,
            dampLambda,
            dt
          );
          currentCamPos.z = THREE.MathUtils.damp(
            currentCamPos.z,
            desiredCamPos.z,
            dampLambda,
            dt
          );
          currentTarget.x = THREE.MathUtils.damp(
            currentTarget.x,
            desiredTarget.x,
            dampLambda,
            dt
          );
          currentTarget.y = THREE.MathUtils.damp(
            currentTarget.y,
            desiredTarget.y,
            dampLambda,
            dt
          );
          currentTarget.z = THREE.MathUtils.damp(
            currentTarget.z,
            desiredTarget.z,
            dampLambda,
            dt
          );
        }
        camera.position.copy(currentCamPos);
        camera.lookAt(currentTarget);

        // Notify parent once camera arrives at selected building during "entering" glide
        if (mode === "entering" && targetLandmark) {
          const enterKey = targetLandmark.node.id;
          if (lastEnteredKey !== enterKey) {
            lastEnteredKey = enterKey;
            enteringStartMs = now;
          }
          const elapsedMs = now - enteringStartMs;
          const distRemaining = currentCamPos.distanceTo(desiredCamPos);
          if (
            prefersReducedMotion ||
            (elapsedMs >= 650 && distRemaining < 1.8) ||
            elapsedMs >= 1350
          ) {
            lastEnteredKey = "";
            stateRef.current.onEnterFlightComplete?.();
          }
        } else {
          lastEnteredKey = "";
        }

        // 2. Landmark animations (roof cutaway lift when entered, hover/search glow, spin accents)
        const focusId = hoverId || activeId || searchFocusNodeId;
        landmarks.forEach((lm) => {
          const isHovered = lm.node.id === hoverId;
          const isSearchFocus = lm.node.id === searchFocusNodeId && mode === "overview";
          const isEntering =
            lm.node.id === activeId && (mode === "entering" || mode === "inside");

          const targetGlow = isEntering
            ? 2.2
            : isHovered || isSearchFocus
            ? 1.95
            : lm.node.id === "dashboard"
            ? 1.45
            : 0.92;
          lm.localGlowMat.emissiveIntensity = THREE.MathUtils.damp(
            lm.localGlowMat.emissiveIntensity,
            targetGlow,
            8,
            dt
          );

          // Roof smoothly opens upward as camera enters building
          const targetRoofLift = isEntering ? 2.6 : isHovered || isSearchFocus ? 0.28 : 0;
          lm.roofGroup.position.y = THREE.MathUtils.damp(
            lm.roofGroup.position.y,
            targetRoofLift,
            6,
            dt
          );

          const ringMat = lm.hoverRing.material as THREE.MeshBasicMaterial;
          const targetRingOp = isHovered || isSearchFocus ? 0.88 : isEntering ? 0.95 : 0.2;
          ringMat.opacity = THREE.MathUtils.damp(
            ringMat.opacity,
            targetRingOp,
            8,
            dt
          );
          const targetRingScale = isHovered || isSearchFocus ? 1.15 : 1;
          lm.hoverRing.scale.setScalar(
            THREE.MathUtils.damp(lm.hoverRing.scale.x, targetRingScale, 8, dt)
          );

          if (lm.spinPart && !prefersReducedMotion) {
            lm.spinPart.rotation.y += dt * (isHovered || isSearchFocus ? 1.4 : 0.45);
          }
        });

        // 2b. Walking human figures & moving traffic update
        pedestrians.update(tSec, prefersReducedMotion);
        vehicles.update(tSec, prefersReducedMotion);

        // 3. Data conduits & photon packet motion along splines
        let idx = 0;
        paths.forEach((p: DataPathInstance) => {
          const connected =
            focusId != null && (p.from === focusId || p.to === focusId);
          const targetOp = connected ? 0.96 : focusId ? 0.38 : 0.68;
          const targetEmissive = connected ? 1.55 : 0.45;
          p.mat.opacity = THREE.MathUtils.damp(p.mat.opacity, targetOp, 7, dt);
          p.mat.emissiveIntensity = THREE.MathUtils.damp(
            p.mat.emissiveIntensity,
            targetEmissive,
            7,
            dt
          );

          for (let k = 0; k < packetsPerPath; k++) {
            const u = prefersReducedMotion
              ? (p.offset + k * 0.5) % 1
              : (tSec * p.speed * (connected ? 1.45 : 1) + p.offset + k * 0.5) % 1;
            p.curve.getPointAt(u, posVec);
            p.curve.getTangentAt(u, tangentVec);

            // Glowing head sphere
            dummy.position.copy(posVec);
            dummy.position.y += 0.06;
            dummy.rotation.set(0, 0, 0);
            const s = connected ? 1.35 : 0.95;
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            packetMesh.setMatrixAt(idx, dummy.matrix);

            // Aligned glowing trail streak
            dummy.position.copy(posVec);
            dummy.position.y += 0.06;
            dummy.quaternion.setFromUnitVectors(upVec, tangentVec.normalize());
            dummy.scale.set(connected ? 1.25 : 0.85, connected ? 1.35 : 0.9, connected ? 1.25 : 0.85);
            dummy.updateMatrix();
            trailMesh.setMatrixAt(idx, dummy.matrix);

            idx++;
          }
        });
        packetMesh.instanceMatrix.needsUpdate = true;
        trailMesh.instanceMatrix.needsUpdate = true;

        // Render 3D scene
        renderer.render(scene, camera);

        // 4. Project 2D DOM pins accurately over landmarks (in overview mode)
        if (mode === "overview") {
          const w = renderer.domElement.clientWidth;
          const h = renderer.domElement.clientHeight;
          landmarks.forEach((lm) => {
            const btn = pinRefs.current[lm.node.id];
            if (!btn) return;
            projVec.set(lm.node.x, lm.node.height + 1.35, lm.node.z);
            projVec.project(camera);
            const inFront = projVec.z > -1 && projVec.z < 1;
            const px = (projVec.x * 0.5 + 0.5) * w;
            const py = (-projVec.y * 0.5 + 0.5) * h;
            const insideBounds =
              px > 44 && px < w - 44 && py > 86 && py < h - 28;
            if (inFront && insideBounds) {
              btn.style.opacity = "1";
              btn.style.pointerEvents = "auto";
              btn.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
            } else {
              btn.style.opacity = "0";
              btn.style.pointerEvents = "none";
            }
          });
        }

        timerId = afterDraw(tick);
      };

      // رندر فوری فریم اول بدون تاخیر روی مانت
      tick();

      return () => {
        stopped = true;
        if (timerId) {
          cancelAnimationFrame(timerId);
          clearTimeout(timerId);
        }
        ro.disconnect();
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener(
          "webglcontextrestored",
          onContextRestored
        );

        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });
        mats.dispose();
        envRT.dispose();
        roomEnv.dispose();
        pmrem.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch {
      setContextLost(true);
    }
  }, [nodeKey]);

  const query = searchQuery.trim().toLowerCase();

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Three.js Canvas Mount */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        aria-label={lang === "fa" ? "نقشه سه‌بعدی شهر ادمین" : "Isometric Admin City Map"}
      />

      {/* Fallback message if WebGL context drops */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#dfe4ec] text-slate-700 text-sm">
          {lang === "fa"
            ? "در حال بازیابی نمای سه‌بعدی شهر..."
            : "Restoring 3D city viewport..."}
        </div>
      )}

      {/* Projected 2D Building Pins (بدون backdrop-filter برای حفظ سرعت WebGL) */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${
          viewMode === "overview" ? "opacity-100" : "opacity-0"
        }`}
      >
        {nodes.map((node) => {
          const isHovered = hoveredNodeId === node.id;
          const isActive = activeNodeId === node.id;
          const matchesGroup =
            activeGroupFilter === "all" || node.group === activeGroupFilter;
          const matchesSearch =
            !query ||
            node.label.toLowerCase().includes(query) ||
            node.labelEn.toLowerCase().includes(query) ||
            node.districtFa.toLowerCase().includes(query) ||
            node.districtEn.toLowerCase().includes(query);
          const highlighted = matchesGroup && matchesSearch;
          const statBadge = getStatBadge(node, stats, lang);

          return (
            <button
              key={node.id}
              ref={(el) => {
                pinRefs.current[node.id] = el;
              }}
              type="button"
              onClick={() => onSelectNode(node)}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
              aria-label={lang === "fa" ? node.label : node.labelEn}
              style={{
                opacity: 0,
                pointerEvents: viewMode === "overview" ? "auto" : "none",
              }}
              className={`city-pin-badge ${
                isHovered || isActive ? "city-pin-active" : ""
              } ${!highlighted ? "city-pin-dimmed" : ""}`}
            >
              <span className="city-pin-icon">
                <CityNodeIcon iconKey={node.iconKey} className="size-3.5" />
              </span>
              <span className="city-pin-text">
                {lang === "fa" ? node.label : node.labelEn}
              </span>
              {statBadge && <span className="city-pin-count">{statBadge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
