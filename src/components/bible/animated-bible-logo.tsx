export function AnimatedBibleLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      className={className}
      role="img"
      aria-label="Bible Logo"
    >
      <defs>
        {/* Page shadow gradient */}
        <linearGradient id="pageShadowL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" className="[stop-color:#00000020] dark:[stop-color:#00000040]" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="pageShadowR" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" className="[stop-color:#00000020] dark:[stop-color:#00000040]" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        {/* Cover gradient for depth */}
        <linearGradient id="coverGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:#4a4a4a] dark:[stop-color:#888888]" />
          <stop offset="100%" className="[stop-color:#2a2a2a] dark:[stop-color:#666666]" />
        </linearGradient>
      </defs>

      {/* Book cover / back */}
      <path
        d="M512 200 C512 200 390 170 220 170 C196 170 172 186 172 210 L172 700 C172 724 196 740 220 740 C390 740 512 770 512 770 C512 770 634 740 804 740 C828 740 852 724 852 700 L852 210 C852 186 828 170 804 170 C634 170 512 200 512 200Z"
        className="fill-[#383838] dark:fill-[#555555]"
        strokeWidth="0"
      />

      {/* Left page */}
      <path
        d="M512 220 C512 220 400 192 232 192 C212 192 196 206 196 226 L196 688 C196 708 212 722 232 722 C400 722 512 750 512 750"
        className="fill-[#f0ede8] dark:fill-[#484848] stroke-[#3a3a3a] dark:stroke-[#999999]"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Left page inner shadow */}
      <path
        d="M512 220 C512 220 400 192 232 192 C212 192 196 206 196 226 L196 688 C196 708 212 722 232 722 C400 722 512 750 512 750"
        fill="url(#pageShadowR)"
        opacity="0.5"
      />

      {/* Right page */}
      <path
        d="M512 220 C512 220 624 192 792 192 C812 192 828 206 828 226 L828 688 C828 708 812 722 792 722 C624 722 512 750 512 750"
        className="fill-[#f7f5f0] dark:fill-[#585858] stroke-[#3a3a3a] dark:stroke-[#999999]"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Right page inner shadow */}
      <path
        d="M512 220 C512 220 624 192 792 192 C812 192 828 206 828 226 L828 688 C828 708 812 722 792 722 C624 722 512 750 512 750"
        fill="url(#pageShadowL)"
        opacity="0.5"
      />

      {/* Left page text lines */}
      <line x1="248" y1="290" x2="460" y2="274" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="248" y1="340" x2="460" y2="324" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />
      <line x1="248" y1="390" x2="460" y2="374" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="248" y1="440" x2="460" y2="424" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />
      <line x1="248" y1="490" x2="460" y2="474" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="248" y1="540" x2="420" y2="527" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />
      <line x1="248" y1="590" x2="460" y2="577" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="248" y1="640" x2="380" y2="630" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />

      {/* Right page text lines */}
      <line x1="564" y1="274" x2="776" y2="290" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="564" y1="324" x2="776" y2="340" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />
      <line x1="564" y1="374" x2="776" y2="390" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="564" y1="424" x2="776" y2="440" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />
      <line x1="564" y1="474" x2="776" y2="490" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="564" y1="527" x2="720" y2="540" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />
      <line x1="564" y1="577" x2="776" y2="590" className="stroke-[#888888] dark:stroke-[#aaaaaa]" strokeWidth="7" strokeLinecap="round" />
      <line x1="564" y1="630" x2="700" y2="640" className="stroke-[#999999] dark:stroke-[#aaaaaa]" strokeWidth="6" strokeLinecap="round" />

      {/* Animated flipping page */}
      <g className="bible-page-flip">
        <path
          d="M512 220 C512 220 624 192 792 192 C812 192 828 206 828 226 L828 688 C828 708 812 722 792 722 C624 722 512 750 512 750"
          className="fill-[#faf8f4] dark:fill-[#626262] stroke-[#3a3a3a] dark:stroke-[#999999]"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <line x1="564" y1="290" x2="756" y2="304" className="stroke-[#b0b0b0] dark:stroke-[#c0c0c0]" strokeWidth="6" strokeLinecap="round" />
        <line x1="564" y1="345" x2="756" y2="359" className="stroke-[#b0b0b0] dark:stroke-[#c0c0c0]" strokeWidth="6" strokeLinecap="round" />
        <line x1="564" y1="400" x2="756" y2="414" className="stroke-[#b0b0b0] dark:stroke-[#c0c0c0]" strokeWidth="6" strokeLinecap="round" />
        <line x1="564" y1="455" x2="700" y2="466" className="stroke-[#b0b0b0] dark:stroke-[#c0c0c0]" strokeWidth="6" strokeLinecap="round" />
        <line x1="564" y1="510" x2="756" y2="524" className="stroke-[#b0b0b0] dark:stroke-[#c0c0c0]" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Spine highlight */}
      <line x1="512" y1="180" x2="512" y2="775" className="stroke-[#222222] dark:stroke-[#aaaaaa]" strokeWidth="6" />
      {/* Spine highlight edge */}
      <line x1="514" y1="182" x2="514" y2="773" className="stroke-[#666666] dark:stroke-[#777777]" strokeWidth="2" opacity="0.4" />
    </svg>
  );
}
