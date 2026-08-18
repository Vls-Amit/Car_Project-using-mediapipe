import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const DEFAULT_TARGET = new THREE.Vector3(0, 0.5, 0);

export default function GestureCamera({ gestureRef, resultsRef, processLandmarks, active }) {
  const { camera } = useThree();
  const smoothAzimuth = useRef(0);
  const smoothPolar = useRef(Math.PI / 4);
  const smoothDistance = useRef(7);

  useFrame(() => {
    if (!active) return;

    // 1. Process latest landmarks → update gestureRef
    processLandmarks(resultsRef);

    const g = gestureRef.current;
    const lerp = 0.15; // responsive smoothing factor

    // 2. Smoothly interpolate toward target values
    smoothAzimuth.current += (g.azimuth - smoothAzimuth.current) * lerp;
    smoothPolar.current += (g.polar - smoothPolar.current) * lerp;
    smoothDistance.current += (g.distance - smoothDistance.current) * lerp;

    // 3. Convert spherical → cartesian
    const r = smoothDistance.current;
    const phi = smoothPolar.current;   // vertical angle
    const theta = smoothAzimuth.current; // horizontal angle

    camera.position.set(
      r * Math.sin(phi) * Math.sin(theta) + DEFAULT_TARGET.x,
      r * Math.cos(phi) + DEFAULT_TARGET.y,
      r * Math.sin(phi) * Math.cos(theta) + DEFAULT_TARGET.z
    );

    camera.lookAt(DEFAULT_TARGET);
  });

  return null;
}
