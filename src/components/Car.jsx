import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export default function Car({ bodyColor = null }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/car.glb`);

  useMemo(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        // Clone material to avoid cross-mesh pollution
        const mat = child.material.clone();
        child.material = mat;

        const name = (child.name + " " + (mat.name || "")).toLowerCase();

        // 1. Target body paint meshes precisely
        const isBodyPaint = /paint|body|carrosserie|shell|hood|fender|door/i.test(name) &&
          !/glass|window|wheel|tire|rim|brake|interior|engine|exhaust|light|lamp|carbon/i.test(name);

        // 2. Body paint — apply custom color + automotive finish
        if (isBodyPaint) {
          if (bodyColor) {
            mat.color = new THREE.Color(bodyColor);
          }
          // Realistic automotive clear-coat paint
          if ("envMapIntensity" in mat) mat.envMapIntensity = 1.0;
          mat.clearcoat = 0.8;
          mat.clearcoatRoughness = 0.08;
          mat.roughness = Math.min(mat.roughness ?? 0.3, 0.28);
          mat.metalness = Math.max(mat.metalness ?? 0.4, 0.45);
        } else {
          // Non-paint parts: keep original look, just gentle env reflection
            if ("envMapIntensity" in mat) {
            mat.envMapIntensity = Math.min(mat.envMapIntensity ?? 1, 0.8);
          }
        }

        // Keep glass clean & transparent
        if (/glass|window|windshield/i.test(name)) {
          mat.transparent = true;
          mat.opacity = 0.45;
          mat.roughness = 0.0;
        }
      }
    });
  }, [scene, bodyColor]);

  return (
    <primitive
      object={scene}
      scale={1}
      rotation={[0, Math.PI, 0]}
    />
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/car.glb`);
