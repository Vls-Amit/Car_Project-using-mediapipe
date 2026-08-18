import { useRef, useCallback } from "react";

/*
 * Landmark indices:
 *  0 = wrist
 *  4 = thumb tip,  3 = thumb IP
 *  8 = index tip,  6 = index PIP
 * 12 = middle tip, 10 = middle PIP
 * 16 = ring tip,   14 = ring PIP
 * 20 = pinky tip,  18 = pinky PIP
 *  5 = index MCP,   9 = middle MCP, 13 = ring MCP, 17 = pinky MCP
 */

// Check if a finger is extended (tip farther from wrist than PIP joint)
function isFingerExtended(lm, tipIdx, pipIdx) {
  const wrist = lm[0];
  const tip = lm[tipIdx];
  const pip = lm[pipIdx];

  const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
  const pipDist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);

  return tipDist > pipDist;
}

function isThumbExtended(lm) {
  // Thumb: tip (4) should be farther from palm center than IP joint (3)
  const palmX = (lm[0].x + lm[5].x + lm[17].x) / 3;
  const palmY = (lm[0].y + lm[5].y + lm[17].y) / 3;
  const tipDist = Math.hypot(lm[4].x - palmX, lm[4].y - palmY);
  const ipDist = Math.hypot(lm[3].x - palmX, lm[3].y - palmY);
  return tipDist > ipDist * 1.1;
}

function countExtendedFingers(lm) {
  let count = 0;
  if (isThumbExtended(lm)) count++;
  if (isFingerExtended(lm, 8, 6)) count++;   // index
  if (isFingerExtended(lm, 12, 10)) count++;  // middle
  if (isFingerExtended(lm, 16, 14)) count++;  // ring
  if (isFingerExtended(lm, 20, 18)) count++;  // pinky
  return count;
}

function getPalmSize(lm) {
  // Distance from wrist (0) to middle finger base (9) + span from index base (5) to pinky base (17)
  const length = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
  const width = Math.hypot(lm[5].x - lm[17].x, lm[5].y - lm[17].y);
  return (length + width) / 2;
}

function getPalmCenter(lm) {
  return {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
  };
}

export default function useGestureControls() {
  const gestureRef = useRef({
    type: "idle",          // current gesture
    azimuth: 0,            // horizontal angle (radians)
    polar: Math.PI / 4,    // vertical angle (radians)
    distance: 7,           // camera distance
    // Tracking state
    smoothPalmX: null,
    smoothPalmY: null,
    smoothPalmSize: null,
    wasFist: false,
    resetTriggered: false,
  });

  const processLandmarks = useCallback((resultsRef) => {
    const g = gestureRef.current;
    const results = resultsRef.current;

    if (!results?.landmarks?.[0]) {
      g.type = "idle";
      g.smoothPalmX = null;
      g.smoothPalmY = null;
      g.smoothPalmSize = null;
      return;
    }

    const lm = results.landmarks[0];
    const extendedCount = countExtendedFingers(lm);
    const rawPalm = getPalmCenter(lm);
    const rawSize = getPalmSize(lm);

    // ── Fist detection (0-1 fingers extended) ───────────
    if (extendedCount <= 1) {
      g.type = "fist";
      g.wasFist = true;
      g.smoothPalmX = null;
      g.smoothPalmY = null;
      g.smoothPalmSize = null;
      g.resetTriggered = false;
      return;
    }

    // ── Fist → Open = Reset ─────────────────────────────
    if (g.wasFist && extendedCount >= 4) {
      g.wasFist = false;
      g.resetTriggered = true;
      g.type = "reset";
      g.smoothPalmX = null;
      g.smoothPalmY = null;
      g.smoothPalmSize = null;

      // Reset camera to defaults
      g.azimuth = 0;
      g.polar = Math.PI / 4;
      g.distance = 7;
      return;
    }

    if (g.resetTriggered) {
      g.resetTriggered = false;
    }

    // ── Open hand: Palm Movement = Rotate + Depth Zoom ─────────────
    if (extendedCount >= 3) {
      g.type = "active";
      g.wasFist = false;

      if (g.smoothPalmX === null || g.smoothPalmY === null || g.smoothPalmSize === null) {
        g.smoothPalmX = rawPalm.x;
        g.smoothPalmY = rawPalm.y;
        g.smoothPalmSize = rawSize;
      } else {
        // Exponential moving average filter for palm position and size
        const alpha = 0.45;
        const newSmoothX = g.smoothPalmX + (rawPalm.x - g.smoothPalmX) * alpha;
        const newSmoothY = g.smoothPalmY + (rawPalm.y - g.smoothPalmY) * alpha;
        const newSmoothSize = g.smoothPalmSize + (rawSize - g.smoothPalmSize) * alpha;

        // Invert X because camera is mirrored
        const dx = -(newSmoothX - g.smoothPalmX);
        const dy = newSmoothY - g.smoothPalmY;
        const dSize = newSmoothSize - g.smoothPalmSize; // positive = hand closer to camera

        // 1. Rotation (X/Y movement)
        const dist = Math.hypot(dx, dy);
        if (dist > 0.0015) {
          g.azimuth += dx * 3.5;
          g.polar = Math.max(0.2, Math.min(Math.PI / 2.1, g.polar + dy * 2.5));
        }

        // 2. Proximity Zoom (Z movement / Hand size)
        // Hand closer (dSize > 0) -> camera distance decreases (ZOOM IN)
        // Hand further (dSize < 0) -> camera distance increases (ZOOM OUT)
        if (Math.abs(dSize) > 0.002) {
          g.distance = Math.max(2.8, Math.min(11, g.distance - dSize * 24));
        }

        g.smoothPalmX = newSmoothX;
        g.smoothPalmY = newSmoothY;
        g.smoothPalmSize = newSmoothSize;
      }
      return;
    }

    // Default → idle
    g.type = "idle";
    g.smoothPalmX = null;
    g.smoothPalmY = null;
    g.smoothPalmSize = null;
  }, []);

  return { gestureRef, processLandmarks };
}
