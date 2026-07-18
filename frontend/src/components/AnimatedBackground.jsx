/**
 * Decorative only - three soft gradient blobs drifting slowly behind the
 * hero copy. Pure CSS animation (see .animate-blobFloat / .bg-blob in
 * index.css), so no JS work per frame and it respects prefers-reduced-motion.
 */
export default function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="bg-blob animate-blobFloat bg-gold"
        style={{ top: "-10%", left: "5%", width: 340, height: 340 }}
      />
      <div
        className="bg-blob animate-blobFloat bg-teal"
        style={{ top: "10%", right: "0%", width: 300, height: 300, animationDelay: "-6s" }}
      />
      <div
        className="bg-blob animate-blobFloat bg-gold"
        style={{ bottom: "-15%", left: "35%", width: 380, height: 380, animationDelay: "-12s" }}
      />
    </div>
  );
}
