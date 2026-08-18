import { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function useHandTracking() {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const resultsRef = useRef(null);
  const animFrameRef = useRef(null);
  const [ready, setReady] = useState(false);

  const start = useCallback(async () => {
    // 1. Load WASM runtime
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    // 2. Create hand landmarker
    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });

    // 3. Open webcam
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" },
    });
    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();

    setReady(true);

    let lastTime = -1;
    let lastDetect = 0;
    const INTERVAL = 40; // ms between detections (~25fps)
    const detect = () => {
      if (video.readyState >= 2 && landmarkerRef.current) {
        const now = performance.now();
        if (now - lastDetect >= INTERVAL && now > lastTime) {
          resultsRef.current = landmarkerRef.current.detectForVideo(video, now);
          lastTime = now;
          lastDetect = now;
        }
      }
      animFrameRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const video = videoRef.current;
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  return { videoRef, resultsRef, ready, start };
}
