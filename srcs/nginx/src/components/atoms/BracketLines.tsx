export function BracketLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 500"
      preserveAspectRatio="none"
    >
      {/* LEFT TO CENTER */}
      <path d="M150 120 C300 120 300 250 500 250" stroke="#7dd3fc" strokeWidth="2" fill="none" />
      <path d="M150 380 C300 380 300 250 500 250" stroke="#7dd3fc" strokeWidth="2" fill="none" />

      {/* RIGHT TO CENTER */}
      <path d="M850 120 C700 120 700 250 500 250" stroke="#7dd3fc" strokeWidth="2" fill="none" />
      <path d="M850 380 C700 380 700 250 500 250" stroke="#7dd3fc" strokeWidth="2" fill="none" />
    </svg>
  );
}
