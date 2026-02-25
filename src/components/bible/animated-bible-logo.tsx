export function AnimatedBibleLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Bible Logo"
    >
      {/* Left page */}
      <path
        d="M256 140 C256 140 200 120 120 120 C108 120 96 128 96 140 L96 340 C96 352 108 360 120 360 C200 360 256 380 256 380"
        className="fill-[#e5e5e5] dark:fill-[#525252] stroke-[#525252] dark:stroke-[#a3a3a3]"
        strokeWidth="4"
      />
      {/* Right page */}
      <path
        d="M256 140 C256 140 312 120 392 120 C404 120 416 128 416 140 L416 340 C416 352 404 360 392 360 C312 360 256 380 256 380"
        className="fill-[#f5f5f5] dark:fill-[#737373] stroke-[#525252] dark:stroke-[#a3a3a3]"
        strokeWidth="4"
      />
      {/* Left page lines */}
      <line x1="130" y1="170" x2="230" y2="162" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="130" y1="200" x2="230" y2="192" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="130" y1="230" x2="230" y2="222" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="130" y1="260" x2="230" y2="252" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="130" y1="290" x2="230" y2="282" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="130" y1="320" x2="210" y2="314" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      {/* Right page lines */}
      <line x1="282" y1="162" x2="382" y2="170" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="282" y1="192" x2="382" y2="200" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="282" y1="222" x2="382" y2="230" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="282" y1="252" x2="382" y2="260" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="282" y1="282" x2="382" y2="290" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      <line x1="282" y1="314" x2="362" y2="320" className="stroke-[#737373] dark:stroke-[#d4d4d4]" strokeWidth="5" strokeLinecap="round" />
      {/* Animated flipping page */}
      <g className="bible-page-flip">
        <path
          d="M256 140 C256 140 312 120 392 120 C404 120 416 128 416 140 L416 340 C416 352 404 360 392 360 C312 360 256 380 256 380"
          className="fill-white dark:fill-[#808080] stroke-[#525252] dark:stroke-[#a3a3a3]"
          strokeWidth="4"
        />
        {/* Text lines on the flipping page */}
        <line x1="282" y1="170" x2="370" y2="177" className="stroke-[#a3a3a3] dark:stroke-[#b8b8b8]" strokeWidth="4" strokeLinecap="round" />
        <line x1="282" y1="200" x2="370" y2="207" className="stroke-[#a3a3a3] dark:stroke-[#b8b8b8]" strokeWidth="4" strokeLinecap="round" />
        <line x1="282" y1="230" x2="370" y2="237" className="stroke-[#a3a3a3] dark:stroke-[#b8b8b8]" strokeWidth="4" strokeLinecap="round" />
        <line x1="282" y1="260" x2="370" y2="267" className="stroke-[#a3a3a3] dark:stroke-[#b8b8b8]" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* Spine (on top of everything) */}
      <line x1="256" y1="130" x2="256" y2="385" className="stroke-[#525252] dark:stroke-[#a3a3a3]" strokeWidth="4" />
    </svg>
  );
}
