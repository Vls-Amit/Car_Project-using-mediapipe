import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  Environment,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useState } from "react";
import * as THREE from "three";
import Car from "./components/Car";
import useHandTracking from "./hooks/useHandTracking";
import useGestureControls from "./hooks/useGestureControls";
import WebcamFeed from "./components/WebcamFeed";
import GestureCamera from "./components/GestureCamera";

const COLOR_PRESETS = [
  { name: "Factory Original", value: null, color: "linear-gradient(135deg, #002a6e, #0a0a0a)" },
  { name: "French Racing Blue", value: "#0045ac", color: "#0045ac" },
  { name: "Italian Red", value: "#d50000", color: "#d50000" },
  { name: "Nocturne Black", value: "#0d0d11", color: "#0d0d11" },
  { name: "Liquid Silver", value: "#b0bec5", color: "#b0bec5" },
  { name: "Racing Yellow", value: "#ffd600", color: "#ffd600" },
  { name: "Emerald Green", value: "#00c853", color: "#00c853" },
];

/* ── Neon Strip Light (visual-only, no rectAreaLight) ──────── */
function NeonStrip({ position, rotation, color, width = 4, intensity = 12 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[width, 0.04, 0.04]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ── Garage Back Wall ──────────────────────────────────────── */
function GarageWall() {
  return (
    <>
      {/* Back wall */}
      <mesh position={[0, 3, -6]} receiveShadow>
        <planeGeometry args={[24, 8]} />
        <meshStandardMaterial
          color="#080808"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Side walls */}
      <mesh
        position={[-8, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial
          color="#060606"
          roughness={0.92}
          metalness={0.08}
        />
      </mesh>
      <mesh
        position={[8, 3, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial
          color="#060606"
          roughness={0.92}
          metalness={0.08}
        />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 6.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 14]} />
        <meshStandardMaterial color="#030303" roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

/* ── Ceiling Light Panels ──────────────────────────────────── */
function CeilingLights() {
  return (
    <>
      {[[-3, 6.4, -2], [3, 6.4, -2]].map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[1.2, 0.05, 0.3]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── Simple Reflective Floor ───────────────────────────────── */
function GarageFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshPhysicalMaterial
        color="#050505"
        roughness={0.25}
        metalness={0.6}
        clearcoat={1}
        clearcoatRoughness={0.08}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

/* ── Main App ──────────────────────────────────────────────── */
export default function App() {
  const { videoRef, resultsRef, ready, start } = useHandTracking();
  const { gestureRef, processLandmarks } = useGestureControls();
  const [selectedColor, setSelectedColor] = useState(null);

  return (
    <>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
          powerPreference: "high-performance",
        }}
        camera={{
          position: [6.5, 2.5, 5.5],
          fov: 32,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000000",
        }}
      >
        {/* Environment for reflections */}
        <Environment preset="warehouse" environmentIntensity={0.9} background={false} />

        {/* Fog for depth */}
        <fog attach="fog" args={["#000000", 14, 35]} />

        {/* Ambient fill */}
        <ambientLight intensity={0.06} color="#b0b0c0" />

        {/* ── Lights (1 shadow-casting, rest are cheap) ── */}

        {/* Main key spotlight — only shadow caster */}
        <spotLight
          position={[5, 7, 4]}
          angle={0.35}
          penumbra={0.8}
          intensity={45}
          color="#fff5e8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          distance={20}
          decay={2}
        />

        {/* Cool fill from back-left (no shadow) */}
        <spotLight
          position={[-4, 6, -3]}
          angle={0.4}
          penumbra={1}
          intensity={15}
          color="#c8d8ff"
          distance={18}
          decay={2}
        />

        {/* Blue rim from rear (no shadow) */}
        <spotLight
          position={[0, 5, -5]}
          angle={0.5}
          penumbra={0.9}
          intensity={12}
          color="#0066ff"
          distance={16}
          decay={2}
        />

        {/* Accent point lights */}
        <pointLight position={[6, 1.5, 0]} intensity={1.5} color="#00b0ff" distance={10} decay={2} />
        <pointLight position={[-6, 1.5, 0]} intensity={1.5} color="#4488ff" distance={10} decay={2} />

        {/* ── Neon strips (emissive meshes only, no real lights) ── */}

        {/* Electric blue neon on back wall */}
        <NeonStrip
          position={[0, 2.8, -5.9]}
          rotation={[0, 0, 0]}
          color="#0091ea"
          width={6}
          intensity={5}
        />

        {/* Blue neon along wall bases */}
        <NeonStrip
          position={[-7.9, 0.15, 0]}
          rotation={[0, Math.PI / 2, 0]}
          color="#00b0ff"
          width={10}
          intensity={3}
        />
        <NeonStrip
          position={[7.9, 0.15, 0]}
          rotation={[0, Math.PI / 2, 0]}
          color="#00e5ff"
          width={10}
          intensity={3}
        />

        {/* Ceiling accent */}
        <NeonStrip
          position={[0, 6.3, -5.9]}
          rotation={[0, 0, 0]}
          color="#0091ea"
          width={8}
          intensity={2.5}
        />

        {/* ── Garage Structure ─────────────────────────── */}
        <GarageWall />
        <CeilingLights />

        {/* ── Floor ────────────────────────────────────── */}
        <GarageFloor />
        <gridHelper args={[50, 80, "#111111", "#0a0a0a"]} position={[0, 0.001, 0]} />

        {/* ── The Car ──────────────────────────────────── */}
        <Suspense fallback={null}>
          <group position={[0, 0.12, 0]}>
            <Car bodyColor={selectedColor} />
          </group>
        </Suspense>

        {/* Contact shadows for grounding */}
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.6}
          scale={16}
          blur={2}
          far={6}
          color="#000000"
        />

        {/* ── Post Processing (lightweight) ────────────── */}
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={1.1}
            luminanceSmoothing={0.4}
            intensity={0.35}
            mipmapBlur
          />
          <Vignette
            offset={0.3}
            darkness={0.7}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>

        {/* ── Controls ─────────────────────────────────── */}
        <GestureCamera
          gestureRef={gestureRef}
          resultsRef={resultsRef}
          processLandmarks={processLandmarks}
          active={ready}
        />
        {!ready && (
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.06}
            minDistance={3.5}
            maxDistance={10}
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={0.2}
          />
        )}
      </Canvas>

      {/* ── HTML Overlay UI ─────────────────────────────── */}
      <div className="overlay">
        <div className="garage-brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">BOLIDE</span>
          <span className="brand-sub">BUGATTI</span>
        </div>

        <div className="car-title">
          <span className="car-name">BUGATTI BOLIDE</span>
          <span className="car-tag">TRACK-ONLY HYPERCAR</span>
        </div>

        {/* ── Paint Color Selector Bar ────────────────────── */}
        <div className="color-picker-bar">
          <span className="color-picker-title">PAINT FINISH</span>
          <div className="color-swatches">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className={`color-swatch ${selectedColor === preset.value ? "active" : ""}`}
                style={{ background: preset.color }}
                title={preset.name}
                onClick={() => setSelectedColor(preset.value)}
              />
            ))}
          </div>
        </div>

        <div className="corner-accent top-left" />
        <div className="corner-accent top-right" />
        <div className="corner-accent bottom-left" />
        <div className="corner-accent bottom-right" />

        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">1,825</span>
            <span className="stat-label">HP</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">2.17</span>
            <span className="stat-label">0-60 MPH</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">W16</span>
            <span className="stat-label">ENGINE</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">311</span>
            <span className="stat-label">MPH</span>
          </div>
        </div>

        <WebcamFeed videoRef={videoRef} resultsRef={resultsRef} ready={ready} gestureRef={gestureRef} />
        {!ready && (
          <button className="start-cam-btn" onClick={start}>
            ◈ Start Hand Tracking
          </button>
        )}
      </div>
    </>
  );
}