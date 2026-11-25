import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CITY_CAR_LANES,
  CITY_EDGES,
  CITY_ROAD_POLYLINES,
  CITY_WALKWAY_PATHS,
  FREEWAY_CURVE_POINTS,
  getDistanceToFreeway,
  getNearestRoadInfo,
  type CityNode,
} from "./city-data";
import type { CityMaterialPalette } from "./city-materials";

export type LandmarkInstance = {
  node: CityNode;
  root: THREE.Group;
  roofGroup: THREE.Group;
  spinPart: THREE.Object3D | null;
  hoverRing: THREE.Mesh;
  localGlowMat: THREE.MeshStandardMaterial;
  hitTarget: THREE.Mesh;
  interiorY: number;
};

export type DataPathInstance = {
  from: string;
  to: string;
  curve: THREE.CatmullRomCurve3;
  tube: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  speed: number;
  offset: number;
};

export type PedestrianSystem = {
  group: THREE.Group;
  update: (tSec: number, reducedMotion: boolean) => void;
};

export type VehicleTrafficSystem = {
  group: THREE.Group;
  update: (tSec: number, reducedMotion: boolean) => void;
};

function addShadow(mesh: THREE.Object3D, cast = true, receive = true) {
  mesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createBasePlinth(
  radius: number,
  mats: CityMaterialPalette,
  localGlowMat: THREE.MeshStandardMaterial
) {
  const plinthGroup = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 2.1, 0.24, radius * 2.1),
    mats.plinthMat
  );
  base.position.y = 0.12;
  plinthGroup.add(base);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.94, 0.08, radius * 1.94),
    localGlowMat
  );
  trim.position.y = 0.26;
  plinthGroup.add(trim);

  const hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.25, radius * 1.42, 40),
    mats.haloRingMat.clone()
  );
  hoverRing.rotation.x = -Math.PI / 2;
  hoverRing.position.y = 0.03;
  (hoverRing.material as THREE.MeshBasicMaterial).opacity = 0.22;
  plinthGroup.add(hoverRing);

  return { plinthGroup, hoverRing };
}

/**
 * ساخت ۱۶ تیپ ساختمان شاخص متمایز برای منوهای ادمین
 */
export function buildLandmarkBuilding(
  node: CityNode,
  mats: CityMaterialPalette
): LandmarkInstance {
  const root = new THREE.Group();
  root.position.set(node.x, 0, node.z);
  root.userData = { nodeId: node.id };

  const roofGroup = new THREE.Group();
  root.add(roofGroup);

  const localGlowMat = mats.glowCoreMat.clone();
  localGlowMat.emissiveIntensity = node.id === "dashboard" ? 1.55 : 0.95;

  const plinthRadius = node.id === "dashboard" ? 2.15 : 1.55;
  const { plinthGroup, hoverRing } = createBasePlinth(plinthRadius, mats, localGlowMat);
  root.add(plinthGroup);

  let spinPart: THREE.Object3D | null = null;
  const H = node.height;
  const interiorY = Math.max(1.5, H * 0.42);

  switch (node.archetype) {
    case "spire": {
      const tier1 = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.95, 2.2, 8),
        mats.landmarkShellMat
      );
      tier1.position.y = 1.35;
      root.add(tier1);

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, H - 1.2, 8),
        localGlowMat
      );
      core.position.y = (H - 1.2) / 2 + 0.5;
      root.add(core);

      const glassJacket = new THREE.Mesh(
        new THREE.CylinderGeometry(1.38, 1.52, H - 2.0, 8),
        mats.landmarkGlassMat
      );
      glassJacket.position.y = (H - 2.0) / 2 + 1.8;
      root.add(glassJacket);

      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, H - 1.6, 0.36),
          mats.landmarkRibMat
        );
        fin.position.set(Math.cos(ang) * 1.48, (H - 1.6) / 2 + 1.1, Math.sin(ang) * 1.48);
        fin.rotation.y = -ang;
        root.add(fin);
      }

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 1.35, 1.1, 8),
        mats.landmarkShellMat
      );
      crown.position.y = H + 0.35;
      roofGroup.add(crown);

      const beaconPivot = new THREE.Group();
      beaconPivot.position.y = H + 0.4;
      const beaconRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.08, 12, 32),
        localGlowMat
      );
      beaconRing.rotation.x = Math.PI / 2;
      beaconPivot.add(beaconRing);
      roofGroup.add(beaconPivot);

      const antenna = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 1.5, 6),
        localGlowMat
      );
      antenna.position.y = H + 1.5;
      roofGroup.add(antenna);
      spinPart = beaconPivot;
      break;
    }

    case "gate": {
      const leftPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, H, 1.25),
        mats.landmarkShellMat
      );
      leftPillar.position.set(-0.95, H / 2 + 0.25, 0);
      root.add(leftPillar);

      const rightPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, H, 1.25),
        mats.landmarkShellMat
      );
      rightPillar.position.set(0.95, H / 2 + 0.25, 0);
      root.add(rightPillar);

      const innerPortal = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, H * 0.72, 0.7),
        mats.landmarkGlassMat
      );
      innerPortal.position.set(0, (H * 0.72) / 2 + 0.28, 0);
      root.add(innerPortal);

      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(2.9, 0.65, 1.4),
        mats.landmarkShellMat
      );
      bridge.position.y = H + 0.35;
      roofGroup.add(bridge);

      const glowSpan = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.16, 1.48),
        localGlowMat
      );
      glowSpan.position.y = H + 0.12;
      roofGroup.add(glowSpan);
      break;
    }

    case "radar": {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.15, H * 0.78, 16),
        mats.landmarkShellMat
      );
      tower.position.y = (H * 0.78) / 2 + 0.25;
      root.add(tower);

      const ringMid = new THREE.Mesh(
        new THREE.CylinderGeometry(1.12, 1.12, 0.22, 16),
        localGlowMat
      );
      ringMid.position.y = H * 0.56;
      root.add(ringMid);

      const deck = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 0.95, 0.42, 16),
        mats.landmarkGlassMat
      );
      deck.position.y = H * 0.82;
      roofGroup.add(deck);

      const dishPivot = new THREE.Group();
      dishPivot.position.y = H * 0.94;
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
        mats.landmarkShellMat
      );
      dish.rotation.x = Math.PI * 0.72;
      dishPivot.add(dish);
      const emitter = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        localGlowMat
      );
      emitter.position.set(0, 0.42, 0.36);
      dishPivot.add(emitter);
      roofGroup.add(dishPivot);
      spinPart = dishPivot;
      break;
    }

    case "campus": {
      const hallA = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, H * 0.88, 1.3),
        mats.landmarkShellMat
      );
      hallA.position.set(-0.75, (H * 0.88) / 2 + 0.25, -0.2);
      root.add(hallA);

      const hallB = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, H * 0.65, 1.45),
        mats.landmarkGlassMat
      );
      hallB.position.set(0.75, (H * 0.65) / 2 + 0.25, 0.25);
      root.add(hallB);

      const skyBridge = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.42, 0.72),
        localGlowMat
      );
      skyBridge.position.set(0, H * 0.58, 0);
      root.add(skyBridge);

      const roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(1.36, 0.24, 1.46),
        mats.landmarkRibMat
      );
      roofCap.position.set(-0.75, H * 0.92, -0.2);
      roofGroup.add(roofCap);

      const lightFin = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.9, 1.2),
        localGlowMat
      );
      lightFin.position.set(-0.75, H * 0.98 + 0.35, -0.2);
      roofGroup.add(lightFin);
      break;
    }

    case "atrium": {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, H * 0.82, 1.7),
        mats.landmarkGlassMat
      );
      body.position.y = (H * 0.82) / 2 + 0.25;
      root.add(body);

      for (let i = -2; i <= 2; i++) {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, H * 0.86, 1.86),
          i === 0 ? localGlowMat : mats.landmarkShellMat
        );
        rib.position.set(i * 0.44, (H * 0.86) / 2 + 0.25, 0);
        root.add(rib);
      }

      const skylight = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 0.3, 1.85),
        mats.landmarkShellMat
      );
      skylight.position.y = H * 0.88;
      roofGroup.add(skylight);
      break;
    }

    case "rotunda": {
      for (let i = 0; i < 3; i++) {
        const tier = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5 - i * 0.28, 1.65 - i * 0.28, 0.7, 24),
          i === 1 ? mats.landmarkGlassMat : mats.landmarkShellMat
        );
        tier.position.y = 0.58 + i * 0.72;
        root.add(tier);
      }

      const haloPivot = new THREE.Group();
      haloPivot.position.y = H * 0.92;
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.1, 12, 32),
        localGlowMat
      );
      halo.rotation.x = Math.PI / 2;
      haloPivot.add(halo);
      roofGroup.add(haloPivot);
      spinPart = haloPivot;
      break;
    }

    case "pavilion": {
      for (let i = 0; i < 4; i++) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(2.1 - i * 0.15, 0.36, 1.65),
          i % 2 === 0 ? mats.landmarkShellMat : mats.landmarkGlassMat
        );
        slab.position.set(i % 2 === 0 ? -0.15 : 0.15, 0.55 + i * 0.78, 0);
        (i === 3 ? roofGroup : root).add(slab);
      }

      const coreCol = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, H * 0.82, 0.45),
        localGlowMat
      );
      coreCol.position.y = (H * 0.82) / 2 + 0.25;
      root.add(coreCol);
      break;
    }

    case "silos": {
      const offsets: Array<[number, number, number]> = [
        [-0.7, -0.45, H * 0.92],
        [0.72, -0.35, H * 0.78],
        [0.0, 0.68, H * 0.68],
      ];
      offsets.forEach(([ox, oz, sh], idx) => {
        const silo = new THREE.Mesh(
          new THREE.CylinderGeometry(0.56, 0.58, sh, 20),
          idx === 0 ? mats.landmarkShellMat : mats.landmarkGlassMat
        );
        silo.position.set(ox, sh / 2 + 0.25, oz);
        root.add(silo);

        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.58, 0.58, 0.14, 20),
          localGlowMat
        );
        cap.position.set(ox, sh + 0.3, oz);
        roofGroup.add(cap);
      });
      break;
    }

    case "commons": {
      const specs: Array<[number, number, number, number, number]> = [
        [-0.65, -0.4, 0.95, H * 0.95, 0.95],
        [0.65, -0.3, 0.85, H * 0.72, 0.9],
        [0.0, 0.65, 1.05, H * 0.62, 0.85],
      ];
      specs.forEach(([bx, bz, bw, bh, bd], idx) => {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, bd),
          idx === 0 ? mats.landmarkShellMat : mats.landmarkGlassMat
        );
        b.position.set(bx, bh / 2 + 0.25, bz);
        root.add(b);

        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(bw * 0.7, 0.14, bd * 0.7),
          localGlowMat
        );
        crown.position.set(bx, bh + 0.33, bz);
        roofGroup.add(crown);
      });
      break;
    }

    case "citadel": {
      const keep = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.45, H * 0.78, 6),
        mats.landmarkShellMat
      );
      keep.position.y = (H * 0.78) / 2 + 0.25;
      root.add(keep);

      const shieldBand = new THREE.Mesh(
        new THREE.CylinderGeometry(1.32, 1.32, 0.28, 6),
        localGlowMat
      );
      shieldBand.position.y = H * 0.64;
      root.add(shieldBand);

      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 1.15, 0.95, 6),
        mats.landmarkRibMat
      );
      turret.position.y = H * 0.88;
      roofGroup.add(turret);
      break;
    }

    case "interchange": {
      const hubCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.9, H * 0.85, 12),
        mats.landmarkShellMat
      );
      hubCore.position.y = (H * 0.85) / 2 + 0.25;
      root.add(hubCore);

      const armX = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.42, 0.68),
        mats.landmarkGlassMat
      );
      armX.position.y = H * 0.45;
      root.add(armX);

      const armZ = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.42, 2.7),
        mats.landmarkGlassMat
      );
      armZ.position.y = H * 0.65;
      root.add(armZ);

      const topRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.08, 10, 24),
        localGlowMat
      );
      topRing.rotation.x = Math.PI / 2;
      topRing.position.y = H * 0.92;
      roofGroup.add(topRing);
      break;
    }

    case "prism": {
      const baseCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.45, H * 0.56, 4),
        mats.landmarkShellMat
      );
      baseCone.rotation.y = Math.PI / 4;
      baseCone.position.y = (H * 0.56) / 2 + 0.25;
      root.add(baseCone);

      const prism = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.95, 0),
        localGlowMat
      );
      prism.scale.set(1, 1.35, 1);
      prism.position.y = H * 0.84;
      roofGroup.add(prism);
      spinPart = prism;
      break;
    }

    case "dome": {
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.45, H * 0.48, 24),
        mats.landmarkShellMat
      );
      drum.position.y = (H * 0.48) / 2 + 0.25;
      root.add(drum);

      const glowBelt = new THREE.Mesh(
        new THREE.CylinderGeometry(1.39, 1.39, 0.16, 24),
        localGlowMat
      );
      glowBelt.position.y = H * 0.52;
      root.add(glowBelt);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.26, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mats.landmarkGlassMat
      );
      dome.position.y = H * 0.54;
      roofGroup.add(dome);
      break;
    }

    case "globe": {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 1.15, H * 0.52, 16),
        mats.landmarkShellMat
      );
      stem.position.y = (H * 0.52) / 2 + 0.25;
      root.add(stem);

      const globePivot = new THREE.Group();
      globePivot.position.y = H * 0.78;

      const sphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.98, 1),
        mats.landmarkGlassMat
      );
      globePivot.add(sphere);

      const wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.01, 1),
        new THREE.MeshBasicMaterial({
          color: "#3b82f6",
          wireframe: true,
          transparent: true,
          opacity: 0.65,
        })
      );
      globePivot.add(wire);

      const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.06, 10, 36),
        localGlowMat
      );
      orbitRing.rotation.x = Math.PI * 0.36;
      orbitRing.rotation.y = Math.PI * 0.18;
      globePivot.add(orbitRing);

      roofGroup.add(globePivot);
      spinPart = globePivot;
      break;
    }

    case "reactor": {
      const cradle = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.5, H * 0.38, 12),
        mats.landmarkShellMat
      );
      cradle.position.y = (H * 0.38) / 2 + 0.25;
      root.add(cradle);

      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3;
        const pylon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.2, H * 0.66, 6),
          mats.landmarkShellMat
        );
        pylon.position.set(
          Math.cos(ang) * 1.25,
          (H * 0.66) / 2 + 0.35,
          Math.sin(ang) * 1.25
        );
        root.add(pylon);
      }

      const aiPivot = new THREE.Group();
      aiPivot.position.y = H * 0.76;

      const crystal = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.76, 0),
        localGlowMat
      );
      aiPivot.add(crystal);

      const ringA = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.05, 10, 32),
        mats.landmarkShellMat
      );
      ringA.rotation.x = Math.PI / 3;
      aiPivot.add(ringA);

      roofGroup.add(aiPivot);
      spinPart = aiPivot;
      break;
    }

    case "substation": {
      const mainBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, H * 0.72, 1.8),
        mats.landmarkShellMat
      );
      mainBox.position.y = (H * 0.72) / 2 + 0.25;
      root.add(mainBox);

      const sidePod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, H * 0.85, 12),
        mats.landmarkGlassMat
      );
      sidePod.position.set(-0.95, (H * 0.85) / 2 + 0.25, 0.6);
      root.add(sidePod);

      const gearPivot = new THREE.Group();
      gearPivot.position.y = H * 0.88;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.14, 10, 8),
        localGlowMat
      );
      ring.rotation.x = Math.PI / 2;
      gearPivot.add(ring);
      roofGroup.add(gearPivot);
      spinPart = gearPivot;
      break;
    }
  }

  const hitTarget = new THREE.Mesh(
    new THREE.BoxGeometry(plinthRadius * 2.2, H + 1.8, plinthRadius * 2.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitTarget.position.y = (H + 1.8) / 2;
  hitTarget.userData = { nodeId: node.id };
  root.add(hitTarget);

  addShadow(root, true, true);
  const meshesForEdges: THREE.Mesh[] = [];
  root.traverse((child) => {
    const m = child as THREE.Mesh;
    if (
      m.isMesh &&
      m !== hitTarget &&
      m !== hoverRing &&
      m.material !== localGlowMat
    ) {
      meshesForEdges.push(m);
    }
  });
  meshesForEdges.forEach((m) => {
    const edges = new THREE.EdgesGeometry(m.geometry, 24);
    const lines = new THREE.LineSegments(edges, mats.inkLineMat);
    m.add(lines);
  });

  hitTarget.castShadow = false;
  hitTarget.receiveShadow = false;
  hoverRing.castShadow = false;

  return {
    node,
    root,
    roofGroup,
    spinPart,
    hoverRing,
    localGlowMat,
    hitTarget,
    interiorY,
  };
}

function normalizeForMerge(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = g.index ? g.toNonIndexed() : g;
  if (!nonIndexed.getAttribute("uv")) {
    const count = nonIndexed.getAttribute("position").count;
    nonIndexed.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return nonIndexed;
}

/**
 * رنگ‌آمیزی شعاعی رئوس برای محو شدن نرم لبه‌های شهر و بزرگراه به رنگ کاغذ (#ecece8)
 */
function applyRadialVertexColors(
  geo: THREE.BufferGeometry,
  innerR: number,
  outerR: number,
  baseHex: string,
  fadeHex = "#ecece8"
) {
  const pos = geo.getAttribute("position");
  if (!pos) return;
  const baseCol = new THREE.Color(baseHex);
  const fadeCol = new THREE.Color(fadeHex);
  const tmp = new THREE.Color();
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    const raw = THREE.MathUtils.clamp((r - innerR) / Math.max(0.01, outerR - innerR), 0, 1);
    const t = raw * raw * (3 - 2 * raw); // smoothstep
    tmp.copy(baseCol).lerp(fadeCol, t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * ساخت بزرگراه معلق منحنی شبیه بزرگراه ۱۱۰ هاربر در داون‌تاون لس‌آنجلس
 */
function buildElevatedFreeway(mats: CityMaterialPalette): THREE.Group {
  const fwGroup = new THREE.Group();
  const pts = FREEWAY_CURVE_POINTS.map(([x, z]) => new THREE.Vector3(x, 1.92, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.45);

  const steps = 88;
  const halfW = 1.25;
  const barrierW = 0.14;
  const barrierH = 0.28;
  const deckThick = 0.28;

  const deckGeos: THREE.BufferGeometry[] = [];
  const edgeGeos: THREE.BufferGeometry[] = [];
  const pierGeos: THREE.BufferGeometry[] = [];

  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const p0 = curve.getPointAt(t0);
    const p1 = curve.getPointAt(t1);
    const segLen = p0.distanceTo(p1) * 1.04;
    const mx = (p0.x + p1.x) * 0.5;
    const mz = (p0.z + p1.z) * 0.5;
    const yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);

    const d = normalizeForMerge(unitBox.clone());
    d.scale(halfW * 2, deckThick, segLen);
    d.rotateY(yaw);
    d.translate(mx, 1.92 - deckThick * 0.5, mz);
    deckGeos.push(d);

    for (const side of [-1, 1]) {
      const b = normalizeForMerge(unitBox.clone());
      b.scale(barrierW, barrierH, segLen);
      b.translate(side * (halfW - barrierW * 0.5), barrierH * 0.5, 0);
      b.rotateY(yaw);
      b.translate(mx, 1.92, mz);
      deckGeos.push(b);
      if (i % 2 === 0) {
        edgeGeos.push(new THREE.EdgesGeometry(b, 25));
      }
    }

    if (i % 2 === 0) {
      edgeGeos.push(new THREE.EdgesGeometry(d, 25));
    }

    if (i % 7 === 3) {
      const col = normalizeForMerge(new THREE.CylinderGeometry(0.24, 0.3, 1.72, 8));
      col.translate(mx, 0.86, mz);
      pierGeos.push(col);
      edgeGeos.push(new THREE.EdgesGeometry(col, 25));

      const capBeam = normalizeForMerge(unitBox.clone());
      capBeam.scale(halfW * 1.65, 0.24, 0.42);
      capBeam.rotateY(yaw);
      capBeam.translate(mx, 1.62, mz);
      pierGeos.push(capBeam);
      edgeGeos.push(new THREE.EdgesGeometry(capBeam, 25));
    }
  }

  unitBox.dispose();

  if (deckGeos.length > 0) {
    const mergedDeck = mergeGeometries(deckGeos);
    deckGeos.forEach((g) => g.dispose());
    if (mergedDeck) {
      applyRadialVertexColors(mergedDeck, 25, 44, "#dcdcd6");
      const deckMesh = new THREE.Mesh(mergedDeck, mats.freewayDeckMat);
      deckMesh.castShadow = true;
      deckMesh.receiveShadow = true;
      fwGroup.add(deckMesh);
    }
  }

  if (pierGeos.length > 0) {
    const mergedPiers = mergeGeometries(pierGeos);
    pierGeos.forEach((g) => g.dispose());
    if (mergedPiers) {
      applyRadialVertexColors(mergedPiers, 25, 44, "#ebebe6");
      const pierMesh = new THREE.Mesh(mergedPiers, mats.freewayPierMat);
      pierMesh.castShadow = true;
      pierMesh.receiveShadow = true;
      fwGroup.add(pierMesh);
    }
  }

  if (edgeGeos.length > 0) {
    const mergedEdges = mergeGeometries(edgeGeos);
    edgeGeos.forEach((g) => g.dispose());
    if (mergedEdges) {
      applyRadialVertexColors(mergedEdges, 25, 44, "#262626");
      fwGroup.add(new THREE.LineSegments(mergedEdges, mats.radialInkLineMat));
    }
  }

  return fwGroup;
}

/**
 * ساخت هندسه ترکیبی تاج درخت نخل کالیفرنیا (۷ برگ قوس‌دار)
 */
function createPalmCrownGeometry(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    const blade = new THREE.PlaneGeometry(0.22, 0.78, 1, 3);
    const pos = blade.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const ly = pos.getY(v) + 0.39; // 0..0.78
      const t = ly / 0.78;
      const archY = Math.sin(t * Math.PI * 0.75) * 0.2 - t * t * 0.3;
      const taper = 1 - t * 0.72;
      pos.setX(v, pos.getX(v) * taper);
      pos.setY(v, archY);
      pos.setZ(v, ly);
    }
    blade.computeVertexNormals();
    blade.rotateY(ang);
    fronds.push(normalizeForMerge(blade));
    blade.dispose();
  }
  const merged = mergeGeometries(fronds);
  fronds.forEach((f) => f.dispose());
  return merged || new THREE.SphereGeometry(0.42, 6, 6);
}

/**
 * ساخت بافت شهری متراکم و حرفه‌ای لس‌آنجلس با بلوک‌های داون‌تاون، آرتز دیستریکت، حومه بنگالو،
 * نخل‌های کالیفرنیا، بزرگراه معلق و جزئیات پشت‌بام (تاسیسات، بالکن، سایه‌بان، برج آب، هلیکوپترپد)
 */
export function buildSurroundingCity(
  nodes: CityNode[],
  mats: CityMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  let seed = 10427;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const decoGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];
  const loftGeos: THREE.BufferGeometry[] = [];
  const bungalowGeos: THREE.BufferGeometry[] = [];
  const capGeos: THREE.BufferGeometry[] = [];
  const slopeRoofGeos: THREE.BufferGeometry[] = [];
  const unitGeos: THREE.BufferGeometry[] = [];
  const inkEdgeGeos: THREE.BufferGeometry[] = [];
  const parkedCarGeos: THREE.BufferGeometry[] = [];

  const treeCanopyMatrices: THREE.Matrix4[] = [];
  const treeTrunkMatrices: THREE.Matrix4[] = [];
  const palmTrunkMatrices: THREE.Matrix4[] = [];
  const palmCrownMatrices: THREE.Matrix4[] = [];
  const lampPostMatrices: THREE.Matrix4[] = [];

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();

  const pushTransformedPart = (
    targetList: THREE.BufferGeometry[],
    rawGeo: THREE.BufferGeometry,
    px: number,
    py: number,
    pz: number,
    yaw: number,
    localX = 0,
    localY = 0,
    localZ = 0,
    addInk = true
  ) => {
    const g = normalizeForMerge(rawGeo);
    g.translate(localX, localY, localZ);
    if (yaw !== 0) g.rotateY(yaw);
    g.translate(px, py, pz);
    targetList.push(g);
    if (addInk) {
      inkEdgeGeos.push(new THREE.EdgesGeometry(g, 22));
    }
  };

  const pushBoxRotated = (
    targetList: THREE.BufferGeometry[],
    px: number,
    py: number,
    pz: number,
    sx: number,
    sy: number,
    sz: number,
    yaw: number,
    localX = 0,
    localY = 0,
    localZ = 0,
    addInk = true
  ) => {
    const g = unitBox.clone();
    g.scale(sx, sy, sz);
    pushTransformedPart(targetList, g, px, py, pz, yaw, localX, localY, localZ, addInk);
    g.dispose();
  };

  const pushGableRoof = (
    px: number,
    baseY: number,
    pz: number,
    width: number,
    ridgeH: number,
    depth: number,
    yaw: number,
    localX = 0,
    localZ = 0
  ) => {
    const halfW = width * 0.5;
    const halfD = depth * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(0, ridgeH);
    shape.closePath();

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      steps: 1,
    });
    extrude.translate(0, 0, -halfD);
    pushTransformedPart(slopeRoofGeos, extrude, px, baseY, pz, yaw, localX, 0, localZ, true);
    extrude.dispose();
  };

  const pushSawtoothRoof = (
    px: number,
    baseY: number,
    pz: number,
    width: number,
    toothH: number,
    depth: number,
    yaw: number,
    teeth = 3
  ) => {
    const toothD = depth / teeth;
    for (let k = 0; k < teeth; k++) {
      const zOff = -depth * 0.5 + toothD * (k + 0.5);
      const shape = new THREE.Shape();
      shape.moveTo(-toothD * 0.5, 0);
      shape.lineTo(toothD * 0.5, 0);
      shape.lineTo(toothD * 0.25, toothH);
      shape.closePath();

      const extrude = new THREE.ExtrudeGeometry(shape, {
        depth: width * 0.94,
        bevelEnabled: false,
        steps: 1,
      });
      extrude.rotateY(Math.PI / 2);
      extrude.translate(-width * 0.47, 0, zOff);
      pushTransformedPart(slopeRoofGeos, extrude, px, baseY, pz, yaw, 0, 0, 0, true);
      extrude.dispose();
    }
  };

  // بزرگراه معلق لس‌آنجلس
  group.add(buildElevatedFreeway(mats));

  const placed: Array<{ x: number; z: number; r: number }> = [];

  // ۱. تولید شبکه متراکم پلاک‌های شهری کج‌شده هم‌راستا با داون‌تاون + گسترش شعاعی ارگانیک به حومه
  const candidates: Array<{ x: number; z: number }> = [];
  const coreTilt = -0.12;
  const cosT = Math.cos(coreTilt);
  const sinT = Math.sin(coreTilt);

  // شبکه بسیار متراکم در هسته و میان‌شهر (گام 1.65 واحد) برای پر شدن کامل بلوک‌های لس‌آنجلس
  for (let u = -26; u <= 26; u += 1.65) {
    for (let v = -24; v <= 24; v += 1.65) {
      const ju = u + (rand() - 0.5) * 0.36;
      const jv = v + (rand() - 0.5) * 0.36;
      const px = ju * cosT - jv * sinT;
      const pz = ju * sinT + jv * cosT;
      if (Math.hypot(px, pz) <= 27.5) {
        candidates.push({ x: px, z: pz });
      }
    }
  }

  // حلقه بیرونی حومه (از شعاع 24.5 تا 35.5 با تراکم کاهشی)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 190; i++) {
    const r = 24.2 + (i / 190) * 11.4;
    const ang = i * goldenAngle + (rand() - 0.5) * 0.35;
    candidates.push({
      x: Math.cos(ang) * r,
      z: Math.sin(ang) * r * 0.9,
    });
  }

  for (const cand of candidates) {
    const px = cand.x;
    const pz = cand.z;
    const distFromCenter = Math.hypot(px, pz);
    if (distFromCenter < 3.6 || distFromCenter > 35.5) continue;

    // کاهندگی نرم تراکم و ارتفاع با دور شدن از مرکز داون‌تاون
    const radialNorm = THREE.MathUtils.clamp((distFromCenter - 3.6) / 31.5, 0, 1);
    if (radialNorm > 0.68 && rand() > 1.0 - (radialNorm - 0.68) * 1.85) continue;

    const sizeScale = Math.pow(1 - radialNorm * 0.78, 1.15);

    const w = (1.12 + rand() * 0.58) * (0.5 + sizeScale * 0.66);
    const d = (1.12 + rand() * 0.58) * (0.5 + sizeScale * 0.66);
    const footExtent = Math.max(w, d) * 0.48;

    // هم‌جوار شدن نزدیک با سکوهای ساختمان‌های شاخص (مشابه بافت پیوسته تصویر مرجع)
    const tooCloseToLandmark = nodes.some((n) => {
      const dx = n.x - px;
      const dz = n.z - pz;
      const minClearance = (n.id === "dashboard" ? 2.55 : 1.85) + footExtent;
      return Math.hypot(dx, dz) < minClearance;
    });
    if (tooCloseToLandmark) continue;

    // عدم قرارگیری روی جاده‌ها یا زیر بزرگراه معلق (تکیه دقیق به لبه پیاده‌رو)
    const roadInfo = getNearestRoadInfo(px, pz);
    if (roadInfo.distance < roadInfo.roadHalfWidth + footExtent + 0.16) continue;
    if (getDistanceToFreeway(px, pz) < footExtent + 1.45) continue;

    // فاصله کوچه بین ساختمان‌ها (فشرده در داون‌تاون، بازتر در حومه)
    const alleyGap = 0.06 + radialNorm * 0.38;
    const overlaps = placed.some(
      (p) => Math.hypot(p.x - px, p.z - pz) < p.r + footExtent + alleyGap
    );
    if (overlaps) continue;

    placed.push({ x: px, z: pz, r: footExtent });

    // فضای سبز و درخت در حیاط‌ها و حومه
    if (rand() < (radialNorm > 0.65 ? 0.28 : 0.07)) {
      const ts = (0.36 + rand() * 0.24) * (0.7 + sizeScale * 0.45);
      dummy.position.set(px, ts * 0.92, pz);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(ts * 0.95, ts * 1.1, ts * 0.95);
      dummy.updateMatrix();
      treeCanopyMatrices.push(dummy.matrix.clone());

      dummy.position.set(px, ts * 0.3, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(ts * 0.25, ts * 0.6, ts * 0.25);
      dummy.updateMatrix();
      treeTrunkMatrices.push(dummy.matrix.clone());
      continue;
    }

    // هم‌راستایی طبیعی با خیابان مجاور
    const snapQuarter = Math.floor(rand() * 2) * (Math.PI * 0.5);
    const yaw = -roadInfo.angle + snapQuarter + (rand() - 0.5) * 0.08;

    // ارتفاع متناسب با پهنه‌های لس‌آنجلس:
    // هسته داون‌تاون (r < 14): برج‌های ۲.۸ تا ۶.۰
    // میان‌شهر (r 14..23): بلوک‌های ۱.۳ تا ۳.۱
    // حومه (r > 23): خانه‌ها و بنگالوهای ۰.۴۵ تا ۱.۲
    let h: number;
    if (distFromCenter < 14) {
      h = 2.65 + rand() * 3.25 * (1 - (distFromCenter - 4.5) / 14);
    } else if (distFromCenter < 23) {
      h = 1.25 + rand() * 1.85 * (1 - (distFromCenter - 14) / 14);
    } else {
      h = 0.45 + rand() * 0.78 * Math.max(0.25, 1 - (distFromCenter - 23) / 14);
    }

    // انتخاب تیپ معماری بر اساس پهنه شهری
    if (distFromCenter < 14.5) {
      // ── پهنه‌ی ۱: برج‌های داون‌تاون لس‌آنجلس ──
      const roll = rand();
      if (roll < 0.34) {
        // برج آرت‌دکو پلکانی با قرنیز، ستون‌های کناری و تاج مخابراتی
        const h1 = h * 0.42;
        const h2 = h * 0.38;
        const h3 = h * 0.24;
        pushBoxRotated(decoGeos, px, h1 / 2, pz, w, h1, d, yaw);
        pushBoxRotated(capGeos, px, h1 + 0.05, pz, w * 1.04, 0.1, d * 1.04, yaw);

        pushBoxRotated(decoGeos, px, h1 + h2 / 2, pz, w * 0.78, h2, d * 0.78, yaw);
        pushBoxRotated(capGeos, px, h1 + h2 + 0.05, pz, w * 0.8, 0.09, d * 0.8, yaw);

        pushBoxRotated(glassGeos, px, h1 + h2 + h3 / 2, pz, w * 0.54, h3, d * 0.54, yaw);
        pushBoxRotated(capGeos, px, h1 + h2 + h3 + 0.04, pz, w * 0.56, 0.08, d * 0.56, yaw);

        // آنتن / منار نوک برج
        const spire = new THREE.CylinderGeometry(0.02, 0.06, 0.75, 6);
        pushTransformedPart(unitGeos, spire, px, h1 + h2 + h3 + 0.42, pz, yaw);
        spire.dispose();
      } else if (roll < 0.68) {
        // آسمان‌خراش شیشه‌ای مدرن (الهام از Wilshire Grand) با بام اریب
        const mainH = h * 0.88;
        pushBoxRotated(glassGeos, px, mainH / 2, pz, w * 0.92, mainH, d * 0.84, yaw);

        // بال کناری کوتاه‌تر برای شکست حجم
        pushBoxRotated(
          decoGeos,
          px,
          h * 0.28,
          pz,
          w * 0.42,
          h * 0.56,
          d * 0.96,
          yaw,
          w * 0.3,
          0,
          0
        );

        // بام بادبانی شیب‌دار روی تاج شیشه‌ای
        const shape = new THREE.Shape();
        shape.moveTo(-w * 0.46, 0);
        shape.lineTo(w * 0.46, 0);
        shape.lineTo(w * 0.46, h * 0.18);
        shape.closePath();
        const sail = new THREE.ExtrudeGeometry(shape, {
          depth: d * 0.84,
          bevelEnabled: false,
        });
        sail.translate(0, 0, -d * 0.42);
        pushTransformedPart(glassGeos, sail, px, mainH, pz, yaw);
        sail.dispose();
      } else {
        // برج هشت‌ضلعی پله‌ای با سکوی پودیوم و هلیکوپترپد (شبیه US Bank Tower)
        const podH = h * 0.25;
        pushBoxRotated(decoGeos, px, podH / 2, pz, w * 1.02, podH, d * 1.02, yaw);
        pushBoxRotated(capGeos, px, podH + 0.05, pz, w * 1.05, 0.09, d * 1.05, yaw);

        const shaftRad = Math.min(w, d) * 0.42;
        const shaftH = h * 0.62;
        const oct1 = new THREE.CylinderGeometry(shaftRad, shaftRad * 1.06, shaftH, 8);
        pushTransformedPart(glassGeos, oct1, px, podH + shaftH / 2, pz, yaw);
        oct1.dispose();

        const crownRad = shaftRad * 0.72;
        const crownH = h * 0.16;
        const oct2 = new THREE.CylinderGeometry(crownRad, shaftRad * 0.92, crownH, 8);
        pushTransformedPart(decoGeos, oct2, px, podH + shaftH + crownH / 2, pz, yaw);
        oct2.dispose();

        // هلیکوپترپد دایره‌ای روی بام
        const heli = new THREE.CylinderGeometry(crownRad * 0.78, crownRad * 0.78, 0.08, 12);
        pushTransformedPart(unitGeos, heli, px, podH + shaftH + crownH + 0.04, pz, yaw);
        heli.dispose();
      }
    } else if (distFromCenter < 23.5) {
      // ── پهنه‌ی ۲: بلوک‌های میان‌شهر، ویلشر و آرتز دیستریکت ──
      const roll = rand();
      if (roll < 0.35) {
        // آپارتمان حیاط‌مرکزی U-شکل با بالکن‌های افقی و تاسیسات بام
        const spineH = h;
        pushBoxRotated(loftGeos, px, spineH / 2, pz, w, spineH, d * 0.36, yaw, 0, 0, -d * 0.3);
        pushBoxRotated(loftGeos, px, spineH * 0.42, pz, w * 0.3, spineH * 0.84, d * 0.64, yaw, -w * 0.35, 0, d * 0.14);
        pushBoxRotated(loftGeos, px, spineH * 0.42, pz, w * 0.3, spineH * 0.84, d * 0.64, yaw, w * 0.35, 0, d * 0.14);

        // لبه بالکن / قرنیز وسط ارتفاع
        pushBoxRotated(capGeos, px, spineH * 0.56, pz, w * 1.04, 0.08, d * 0.4, yaw, 0, 0, -d * 0.3);
        pushBoxRotated(capGeos, px, spineH + 0.04, pz, w * 1.02, 0.09, d * 0.38, yaw, 0, 0, -d * 0.3);

        // چیلر و برج آب کوچک بام
        pushBoxRotated(unitGeos, px, spineH + 0.2, pz, w * 0.22, 0.24, d * 0.18, yaw, -w * 0.2, 0, -d * 0.3);
      } else if (roll < 0.68) {
        // استودیو / لافت آرتز دیستریکت با سقف دندانه‌اره‌ای (Sawtooth) و سایه‌بان ورودی
        const bodyH = h * 0.82;
        pushBoxRotated(loftGeos, px, bodyH / 2, pz, w * 1.02, bodyH, d * 0.96, yaw);
        pushSawtoothRoof(px, bodyH, pz, w * 1.02, 0.32, d * 0.94, yaw, 3);
        // سایه‌بان ورودی سمت خیابان
        pushBoxRotated(capGeos, px, 0.52, pz, w * 0.65, 0.08, 0.28, yaw, 0, 0, d * 0.54);
      } else {
        // مجتمع L-شکل آرت‌دکو میان‌رده با دو طبقه متمایز و بالکن
        const hA = h;
        const hB = h * 0.66;
        pushBoxRotated(decoGeos, px, hA / 2, pz, w * 0.94, hA, d * 0.48, yaw, 0, 0, -d * 0.24);
        pushBoxRotated(capGeos, px, hA + 0.04, pz, w * 0.96, 0.09, d * 0.5, yaw, 0, 0, -d * 0.24);

        const side = rand() > 0.5 ? 1 : -1;
        pushBoxRotated(glassGeos, px, hB / 2, pz, w * 0.46, hB, d * 0.62, yaw, side * w * 0.24, 0, d * 0.22);
        pushBoxRotated(capGeos, px, hB + 0.04, pz, w * 0.48, 0.09, d * 0.64, yaw, side * w * 0.24, 0, d * 0.22);

        pushBoxRotated(unitGeos, px, hA + 0.2, pz, w * 0.26, 0.26, d * 0.22, yaw, 0, 0, -d * 0.24);
      }
    } else {
      // ── پهنه‌ی ۳: خانه‌ها و بنگالوهای کم‌ارتفاع حاشیه (کاهش واضح ارتفاع و مقیاس) ──
      const roll = rand();
      if (roll < 0.56) {
        // خانه بنگالو کالیفرنیا با سقف شیروانی و ایوان
        const wallH = h * 0.72;
        pushBoxRotated(bungalowGeos, px, wallH / 2, pz, w * 0.94, wallH, d * 0.88, yaw);
        pushGableRoof(px, wallH, pz, w * 1.04, Math.max(0.22, Math.min(0.48, w * 0.34)), d * 0.98, yaw);
        // دودکش ظریف
        pushBoxRotated(unitGeos, px, wallH + 0.24, pz, 0.14, 0.34, 0.14, yaw, w * 0.22, 0, d * 0.18);
      } else {
        // ویلای مدرن کالیفرنیا (سقف تخت کنسولی با حیاط جلویی)
        const mainH = h * 0.84;
        pushBoxRotated(bungalowGeos, px, mainH / 2, pz, w * 0.9, mainH, d * 0.82, yaw);
        pushBoxRotated(capGeos, px, mainH + 0.04, pz, w * 1.06, 0.08, d * 0.98, yaw, w * 0.06, 0, 0);
      }
    }
  }

  // ۲. کاشت ردیف نخل‌های کالیفرنیا در امتداد بلوارهای شاخص (Wilshire, Sunset, Olympic, Grand) و میدان مرکزی
  const addPalmAt = (px: number, pz: number, hScale: number, tiltYaw: number) => {
    const trunkH = 1.45 * hScale;
    dummy.position.set(px, trunkH * 0.5, pz);
    dummy.rotation.set(0.06, tiltYaw, 0.04);
    dummy.scale.set(hScale, trunkH, hScale);
    dummy.updateMatrix();
    palmTrunkMatrices.push(dummy.matrix.clone());

    dummy.position.set(px + Math.sin(tiltYaw) * 0.05, trunkH + 0.02, pz + Math.cos(tiltYaw) * 0.05);
    dummy.rotation.set(0, tiltYaw, 0);
    dummy.scale.setScalar(0.95 * hScale);
    dummy.updateMatrix();
    palmCrownMatrices.push(dummy.matrix.clone());
  };

  for (const road of CITY_ROAD_POLYLINES) {
    if (!road.isPalmBoulevard) continue;
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      const countOnSeg = Math.max(1, Math.floor(segLen / 4.2));
      const ang = Math.atan2(bz - az, bx - ax);
      const nx = -Math.sin(ang);
      const nz = Math.cos(ang);

      for (let s = 0; s < countOnSeg; s++) {
        const t = (s + 0.5) / countOnSeg;
        const rx = ax + (bx - ax) * t;
        const rz = az + (bz - az) * t;
        const distC = Math.hypot(rx, rz);
        if (distC < 4.5 || distC > 26) continue;

        for (const side of [-1, 1]) {
          if ((s + (side > 0 ? 1 : 0)) % 2 !== 0) continue;
          const curbDist = road.width * 0.5 + 0.34;
          const px = rx + nx * curbDist * side;
          const pz = rz + nz * curbDist * side;

          const tooCloseLandmark = nodes.some(
            (n) => Math.hypot(n.x - px, n.z - pz) < 2.4
          );
          if (tooCloseLandmark) continue;

          addPalmAt(px, pz, 0.82 + rand() * 0.35, rand() * Math.PI * 2);

          // تیر چراغ‌برق شهری در امتداد پیاده‌رو
          if (s % 2 === 0 && side === 1) {
            dummy.position.set(px + nx * 0.14, 0.58, pz + nz * 0.14);
            dummy.rotation.set(0, ang, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            lampPostMatrices.push(dummy.matrix.clone());
          }
        }
      }
    }
  }

  // ۴ نخل در گوشه‌های میدان مرکزی بانکر هیل
  [
    [-3.1, -3.1],
    [3.1, -3.1],
    [-3.1, 3.1],
    [3.1, 3.1],
  ].forEach(([px, pz], idx) => {
    addPalmAt(px, pz, 1.05, idx * 1.4);
  });

  // ۳. خودروهای پارک‌شده کنار جدول خیابان‌ها
  for (const road of CITY_ROAD_POLYLINES) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const mx = (ax + bx) * 0.5;
      const mz = (az + bz) * 0.5;
      const distC = Math.hypot(mx, mz);
      if (distC < 5.0 || distC > 23) continue;
      if (rand() > 0.58) continue;

      const ang = Math.atan2(bz - az, bx - ax);
      const laneOff = road.width * 0.34 * (rand() > 0.5 ? 1 : -1);
      const cx = mx - Math.sin(ang) * laneOff;
      const cz = mz + Math.cos(ang) * laneOff;

      pushBoxRotated(parkedCarGeos, cx, 0.11, cz, 0.78, 0.18, 0.36, -ang);
      pushBoxRotated(parkedCarGeos, cx, 0.24, cz, 0.46, 0.12, 0.31, -ang);
    }
  }

  unitBox.dispose();

  const addMergedLayer = (
    geos: THREE.BufferGeometry[],
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true
  ) => {
    if (geos.length === 0) return;
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    group.add(mesh);
  };

  addMergedLayer(decoGeos, mats.fillerMat);
  addMergedLayer(glassGeos, mats.fillerGlassMat);
  addMergedLayer(loftGeos, mats.fillerLoftMat);
  addMergedLayer(bungalowGeos, mats.fillerBungalowMat);
  addMergedLayer(capGeos, mats.fillerCapMat);
  addMergedLayer(slopeRoofGeos, mats.fillerRoofSlopeMat);
  addMergedLayer(unitGeos, mats.rooftopUnitMat);
  addMergedLayer(parkedCarGeos, mats.carMat);

  if (inkEdgeGeos.length > 0) {
    const mergedEdges = mergeGeometries(inkEdgeGeos);
    inkEdgeGeos.forEach((g) => g.dispose());
    if (mergedEdges) {
      applyRadialVertexColors(mergedEdges, 26, 44, "#252525");
      group.add(new THREE.LineSegments(mergedEdges, mats.radialInkLineMat));
    }
  }

  // درختان سایه‌دار و تنه آن‌ها
  if (treeCanopyMatrices.length > 0) {
    const treeGeo = new THREE.IcosahedronGeometry(0.62, 1);
    const treeMesh = new THREE.InstancedMesh(treeGeo, mats.treeMat, treeCanopyMatrices.length);
    treeMesh.castShadow = true;
    treeMesh.receiveShadow = true;
    treeCanopyMatrices.forEach((m, i) => treeMesh.setMatrixAt(i, m));
    treeMesh.instanceMatrix.needsUpdate = true;
    treeMesh.computeBoundingSphere();
    group.add(treeMesh);

    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 1, 6);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, mats.palmTrunkMat, treeTrunkMatrices.length);
    treeTrunkMatrices.forEach((m, i) => trunkMesh.setMatrixAt(i, m));
    trunkMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.computeBoundingSphere();
    group.add(trunkMesh);
  }

  // نخل‌های کالیفرنیا (تنه و تاج برگ)
  if (palmTrunkMatrices.length > 0) {
    const pTrunkGeo = new THREE.CylinderGeometry(0.035, 0.065, 1, 5);
    const pTrunkMesh = new THREE.InstancedMesh(pTrunkGeo, mats.palmTrunkMat, palmTrunkMatrices.length);
    pTrunkMesh.castShadow = true;
    palmTrunkMatrices.forEach((m, i) => pTrunkMesh.setMatrixAt(i, m));
    pTrunkMesh.instanceMatrix.needsUpdate = true;
    pTrunkMesh.computeBoundingSphere();
    group.add(pTrunkMesh);

    const pCrownGeo = createPalmCrownGeometry();
    const pCrownMesh = new THREE.InstancedMesh(pCrownGeo, mats.palmFrondMat, palmCrownMatrices.length);
    pCrownMesh.castShadow = true;
    palmCrownMatrices.forEach((m, i) => pCrownMesh.setMatrixAt(i, m));
    pCrownMesh.instanceMatrix.needsUpdate = true;
    pCrownMesh.computeBoundingSphere();
    group.add(pCrownMesh);
  }

  // تیرهای چراغ‌برق حاشیه بلوارها
  if (lampPostMatrices.length > 0) {
    const lampGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.15, 5);
    const lampMesh = new THREE.InstancedMesh(lampGeo, mats.humanMat, lampPostMatrices.length);
    lampPostMatrices.forEach((m, i) => lampMesh.setMatrixAt(i, m));
    lampMesh.instanceMatrix.needsUpdate = true;
    lampMesh.computeBoundingSphere();
    group.add(lampMesh);
  }

  // میدان مرکزی بانکر هیل (پلازا با خطوط پله‌ای اسکیس)
  const plazaGeo = new THREE.BoxGeometry(7.2, 0.08, 6.8);
  const plaza = new THREE.Mesh(plazaGeo, mats.plazaMat);
  plaza.position.y = 0.04;
  plaza.receiveShadow = true;
  plaza.add(new THREE.LineSegments(new THREE.EdgesGeometry(plazaGeo, 24), mats.inkFaintLineMat));
  group.add(plaza);

  return group;
}

/**
 * سیستم ترافیک زنده خودروهای لس‌آنجلس روی بلوارها و بزرگراه معلق (Zero-GC InstancedMesh)
 */
export function buildVehicleTrafficSystem(mats: CityMaterialPalette): VehicleTrafficSystem {
  const group = new THREE.Group();

  const laneSpecs = CITY_CAR_LANES.map((lane) => {
    const yLevel = lane.elevated ? 2.02 : 0.06;
    const pts = lane.points.map(([x, z]) => new THREE.Vector3(x, yLevel, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    return {
      curve,
      len: Math.max(10, curve.getLength()),
      laneOffset: lane.laneOffset,
      yBase: lane.elevated ? 1.94 : 0.02,
      isFreeway: Boolean(lane.elevated),
    };
  });

  type CarAgent = {
    laneIdx: number;
    baseT: number;
    speedUnitsPerSec: number;
  };

  const count = 28;
  const cars: CarAgent[] = [];
  for (let i = 0; i < count; i++) {
    const laneIdx = i % laneSpecs.length;
    const spec = laneSpecs[laneIdx];
    cars.push({
      laneIdx,
      baseT: ((i / count) + (laneIdx * 0.13)) % 1,
      speedUnitsPerSec: spec.isFreeway ? 4.8 + (i % 3) * 0.7 : 2.3 + (i % 4) * 0.45,
    });
  }

  const bodyGeo = new THREE.BoxGeometry(0.36, 0.18, 0.78);
  const cabinGeo = new THREE.BoxGeometry(0.31, 0.12, 0.44);

  const bodyMesh = new THREE.InstancedMesh(bodyGeo, mats.carMat, count);
  const cabinMesh = new THREE.InstancedMesh(cabinGeo, mats.rooftopUnitMat, count);
  [bodyMesh, cabinMesh].forEach((m) => {
    m.frustumCulled = false;
    m.castShadow = true;
    group.add(m);
  });

  const dummy = new THREE.Object3D();
  const pos = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  const update = (tSec: number, reducedMotion: boolean) => {
    const activeTime = reducedMotion ? 0 : tSec;

    for (let i = 0; i < count; i++) {
      const c = cars[i];
      const spec = laneSpecs[c.laneIdx];
      const u = ((c.baseT + (activeTime * c.speedUnitsPerSec) / spec.len) % 1 + 1) % 1;

      spec.curve.getPointAt(u, pos);
      spec.curve.getTangentAt(u, tangent);

      const yaw = Math.atan2(tangent.x, tangent.z);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      const wx = pos.x + rightX * spec.laneOffset;
      const wz = pos.z + rightZ * spec.laneOffset;

      // محو مقیاس خودرو در انتهای بزرگراه/بلوارهای بیرونی
      const distC = Math.hypot(wx, wz);
      const edgeFade = distC > 28 ? Math.max(0, 1 - (distC - 28) / 14) : 1;

      dummy.position.set(wx, spec.yBase + 0.09, wz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(edgeFade);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(wx, spec.yBase + 0.22, wz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(edgeFade);
      dummy.updateMatrix();
      cabinMesh.setMatrixAt(i, dummy.matrix);
    }

    bodyMesh.instanceMatrix.needsUpdate = true;
    cabinMesh.instanceMatrix.needsUpdate = true;
  };

  update(0, false);
  return { group, update };
}

/**
 * سیستم فیگورهای انسانی متحرک روی پیاده‌روها و میدان مرکزی (۴ InstancedMesh هماهنگ با Zero-GC)
 */
export function buildPedestrianSystem(mats: CityMaterialPalette): PedestrianSystem {
  const group = new THREE.Group();

  const curves = CITY_WALKWAY_PATHS.map((wp) => {
    const pts = wp.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    return {
      closed: wp.closed,
      curve: new THREE.CatmullRomCurve3(pts, wp.closed, "catmullrom", 0.35),
    };
  });

  type Agent = {
    curveIdx: number;
    speedUnitsPerSec: number;
    curveLen: number;
    baseT: number;
    dir: 1 | -1;
    lateral: number;
    scale: number;
    stridePhase: number;
  };

  let seed = 9411;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const count = 64;
  const agents: Agent[] = [];
  for (let i = 0; i < count; i++) {
    const curveIdx = i % curves.length;
    const curveLen = Math.max(4, curves[curveIdx].curve.getLength());
    agents.push({
      curveIdx,
      speedUnitsPerSec: 0.72 + rand() * 0.58,
      curveLen,
      baseT: rand(),
      dir: rand() > 0.5 ? 1 : -1,
      lateral: (rand() - 0.5) * 0.42,
      scale: 0.88 + rand() * 0.24,
      stridePhase: rand() * Math.PI * 2,
    });
  }

  const headGeo = new THREE.SphereGeometry(0.056, 8, 8);
  const torsoGeo = new THREE.CylinderGeometry(0.048, 0.072, 0.23, 8);
  const legGeo = new THREE.BoxGeometry(0.04, 0.17, 0.046);

  const headMesh = new THREE.InstancedMesh(headGeo, mats.humanMat, count);
  const torsoMesh = new THREE.InstancedMesh(torsoGeo, mats.humanMat, count);
  const leftLegMesh = new THREE.InstancedMesh(legGeo, mats.humanMat, count);
  const rightLegMesh = new THREE.InstancedMesh(legGeo, mats.humanMat, count);

  [headMesh, torsoMesh, leftLegMesh, rightLegMesh].forEach((m) => {
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = false;
    group.add(m);
  });

  const dummy = new THREE.Object3D();
  const pos = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  const update = (tSec: number, reducedMotion: boolean) => {
    const activeTime = reducedMotion ? 0 : tSec;

    for (let i = 0; i < count; i++) {
      const a = agents[i];
      const spec = curves[a.curveIdx];
      const distNorm = (activeTime * a.speedUnitsPerSec) / a.curveLen;

      let u: number;
      let moveSign = a.dir;
      if (spec.closed) {
        u = ((a.baseT + a.dir * distNorm) % 1 + 1) % 1;
      } else {
        const raw = ((a.baseT + distNorm) % 2 + 2) % 2;
        if (raw <= 1) {
          u = raw;
          moveSign = 1;
        } else {
          u = 2 - raw;
          moveSign = -1;
        }
      }

      spec.curve.getPointAt(u, pos);
      spec.curve.getTangentAt(u, tangent);

      const dirX = tangent.x * moveSign;
      const dirZ = tangent.z * moveSign;
      const yaw = Math.atan2(dirX, dirZ);

      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const wx = pos.x + rightX * a.lateral;
      const wz = pos.z + rightZ * a.lateral;

      const s = a.scale;
      const strideFreq = a.speedUnitsPerSec * 7.2;
      const swing = reducedMotion ? 0 : Math.sin(activeTime * strideFreq + a.stridePhase) * 0.42;
      const bob = reducedMotion ? 0 : Math.abs(Math.sin(activeTime * strideFreq + a.stridePhase)) * 0.018;

      dummy.position.set(wx, (0.44 + bob) * s, wz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      headMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(wx, (0.27 + bob) * s, wz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      torsoMesh.setMatrixAt(i, dummy.matrix);

      const legOff = 0.03 * s;
      dummy.position.set(wx + rightX * legOff, 0.095 * s, wz + rightZ * legOff);
      dummy.rotation.set(0, yaw, 0);
      dummy.rotateX(swing);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      leftLegMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(wx - rightX * legOff, 0.095 * s, wz - rightZ * legOff);
      dummy.rotation.set(0, yaw, 0);
      dummy.rotateX(-swing);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      rightLegMesh.setMatrixAt(i, dummy.matrix);
    }

    headMesh.instanceMatrix.needsUpdate = true;
    torsoMesh.instanceMatrix.needsUpdate = true;
    leftLegMesh.instanceMatrix.needsUpdate = true;
    rightLegMesh.instanceMatrix.needsUpdate = true;
  };

  update(0, false);
  return { group, update };
}

/**
 * ساخت مسیرهای ارتباطی دیتا بین ساختمان‌های مجاز با انحنای معماری ایزومتریک
 */
export function buildDataConduits(
  visibleNodes: CityNode[],
  mats: CityMaterialPalette
): { group: THREE.Group; paths: DataPathInstance[] } {
  const group = new THREE.Group();
  const byId = new Map(visibleNodes.map((n) => [n.id, n]));
  const paths: DataPathInstance[] = [];

  CITY_EDGES.forEach((edge, idx) => {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) return;

    const midX = (a.x + b.x) * 0.5;
    const midZ = idx % 2 === 0 ? a.z : b.z;
    const elev = 0.14 + (idx % 3) * 0.025;

    const pts = [
      new THREE.Vector3(a.x, elev, a.z),
      new THREE.Vector3(midX, elev, a.z + (b.z - a.z) * 0.12),
      new THREE.Vector3(
        idx % 2 === 0 ? b.x - (b.x - a.x) * 0.12 : a.x + (b.x - a.x) * 0.12,
        elev + 0.04,
        midZ
      ),
      new THREE.Vector3(b.x, elev, b.z),
    ];

    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.28);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.085, 6, false);
    const mat = mats.conduitBaseMat.clone();
    const tube = new THREE.Mesh(tubeGeo, mat);
    group.add(tube);

    paths.push({
      from: edge.from,
      to: edge.to,
      curve,
      tube,
      mat,
      speed: 0.24 + (edge.intensity ?? 0.85) * 0.18,
      offset: (idx * 0.19) % 1,
    });
  });

  return { group, paths };
}
