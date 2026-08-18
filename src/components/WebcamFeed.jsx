import { useEffect, useRef } from "react";

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [5, 9], [9, 10], [10, 11], [11, 12],     // middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // ring
  [13, 17], [17, 18], [18, 19], [19, 20],  // pinky
  [0, 17],                                  // palm base
];

export default function WebcamFeed({ videoRef, resultsRef, ready, gestureRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!ready) return;

    let frameId;
    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw mirrored video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw hand landmarks for all detected hands
      const results = resultsRef.current;
      if (results?.landmarks) {
        for (const lm of results.landmarks) {
          const w = canvas.width;
          const h = canvas.height;

          // Draw connections
          ctx.strokeStyle = "#00e5ff";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#00e5ff";
          ctx.shadowBlur = 6;
          for (const [a, b] of CONNECTIONS) {
            ctx.beginPath();
            ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
            ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;

          // Draw landmark points
          for (let i = 0; i < lm.length; i++) {
            const point = lm[i];
            const px = (1 - point.x) * w;
            const py = point.y * h;

            const isTip = [4, 8, 12, 16, 20].includes(i);
            ctx.fillStyle = isTip ? "#00b0ff" : "#0091ea";
            ctx.beginPath();
            ctx.arc(px, py, isTip ? 6 : 3, 0, Math.PI * 2);
            ctx.fill();

            if (isTip) {
              ctx.strokeStyle = "rgba(0, 176, 255, 0.4)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(px, py, 10, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }

      // Draw gesture HUD label at bottom of PiP
      const gestureType = gestureRef?.current?.type || "idle";
      let statusText = "HAND READY";
      let statusColor = "rgba(0, 229, 255, 0.8)";

      if (gestureType === "active") {
        statusText = "🖐 ROTATE & ZOOM (DEPTH)";
        statusColor = "#00e5ff";
      } else if (gestureType === "fist") {
        statusText = "✊ FIST (HOLD TO RESET)";
        statusColor = "#e57373";
      } else if (gestureType === "reset") {
        statusText = "🔄 CAMERA RESET";
        statusColor = "#81c784";
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - 24, canvas.width, 24);

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = statusColor;
      ctx.textAlign = "center";
      ctx.fillText(statusText, canvas.width / 2, canvas.height - 8);

      frameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [ready, videoRef, resultsRef, gestureRef]);

  return (
    <div className="webcam-pip">
      <video ref={videoRef} playsInline muted style={{ display: "none" }} />
      <canvas ref={canvasRef} />
      <div className="webcam-label">
        <span className="webcam-dot" />
        HAND TRACKING
      </div>
    </div>
  );
}
