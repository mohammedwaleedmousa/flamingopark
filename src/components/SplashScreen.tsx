import { useEffect, useState } from "react";

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [leaving, setLeaving] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReduceMotion(mq.matches);
    };

    update();

    mq.addEventListener("change", update);

    return () => {
      mq.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const leaveAt = reduceMotion ? 250 : 1250;
    const doneAt = reduceMotion ? 400 : 1550;

    const t1 = setTimeout(() => {
      setLeaving(true);
    }, leaveAt);

    const t2 = setTimeout(() => {
      onDone();
    }, doneAt);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone, reduceMotion]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#FCFBFA] transition-opacity duration-300 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,198,201,0.18)_0%,rgba(255,255,255,0)_52%)]" />

      <div className={`relative flex items-center justify-center ${reduceMotion ? "" : "animate-logo-enter"}`}>
        <svg className="h-[145px] w-[145px] sm:h-[165px] sm:w-[165px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#D88A96" floodOpacity="0.10" />
            </filter>
          </defs>

          <g filter="url(#soft-shadow)">
            {/* =========================
                BASE FLAMINGO DRAWING
            ========================== */}

            <path
              d="M122 43C108 39 95 44 88 55C80 67 83 80 95 87C106 94 118 90 125 81C132 72 130 59 121 54C113 49 103 52 99 59"
              className="flamingo-base"
            />

            <path
              d="M98 59C88 68 82 79 80 92C78 105 82 116 92 123"
              className="flamingo-base"
            />

            <path
              d="M92 123C104 134 121 136 136 129C148 123 154 112 152 101C150 91 141 84 129 84C120 84 112 89 108 98C104 107 107 117 116 122"
              className="flamingo-base"
            />

            <path
              d="M136 129C130 140 121 149 109 154"
              className="flamingo-base"
            />

            <path
              d="M113 152C103 155 95 155 87 152"
              className="flamingo-base"
            />

            <path
              d="M111 154L103 179"
              className="flamingo-base"
            />

            <path
              d="M103 179L95 188"
              className="flamingo-base"
            />

            <path
              d="M126 140L131 166"
              className="flamingo-base"
            />

            <path
              d="M131 166L138 181"
              className="flamingo-base"
            />

            <path
              d="M122 43C129 44 136 48 140 54L131 58"
              className="flamingo-base"
            />

            <circle cx="117" cy="49" r="2.4" fill="#B85E6D" />

            {/* =========================
                MOVING DARK EDGE
            ========================== */}

            {!reduceMotion && (
              <>
                <path
                  d="M122 43C108 39 95 44 88 55C80 67 83 80 95 87C106 94 118 90 125 81C132 72 130 59 121 54C113 49 103 52 99 59"
                  className="flamingo-runner runner-1"
                />

                <path
                  d="M98 59C88 68 82 79 80 92C78 105 82 116 92 123"
                  className="flamingo-runner runner-2"
                />

                <path
                  d="M92 123C104 134 121 136 136 129C148 123 154 112 152 101C150 91 141 84 129 84C120 84 112 89 108 98C104 107 107 117 116 122"
                  className="flamingo-runner runner-3"
                />

                <path
                  d="M136 129C130 140 121 149 109 154"
                  className="flamingo-runner runner-4"
                />

                <path
                  d="M113 152C103 155 95 155 87 152"
                  className="flamingo-runner runner-5"
                />

                <path
                  d="M111 154L103 179L95 188"
                  className="flamingo-runner runner-6"
                />

                <path
                  d="M126 140L131 166L138 181"
                  className="flamingo-runner runner-7"
                />

                <path
                  d="M122 43C129 44 136 48 140 54L131 58"
                  className="flamingo-runner runner-8"
                />
              </>
            )}
          </g>
        </svg>
      </div>

      <style>{`
        .flamingo-base {
          fill: none;
          stroke: #E7A9B2;
          stroke-width: 4.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .flamingo-runner {
          fill: none;
          stroke: #A94F60;
          stroke-width: 4.6;
          stroke-linecap: round;
          stroke-linejoin: round;

          stroke-dasharray: 18 260;
          stroke-dashoffset: 0;

          animation: flamingo-edge-run 1.35s linear infinite;
        }

        .runner-2 {
          animation-delay: -0.10s;
        }

        .runner-3 {
          animation-delay: -0.20s;
        }

        .runner-4 {
          animation-delay: -0.30s;
        }

        .runner-5 {
          animation-delay: -0.40s;
        }

        .runner-6 {
          animation-delay: -0.50s;
        }

        .runner-7 {
          animation-delay: -0.60s;
        }

        .runner-8 {
          animation-delay: -0.70s;
        }

        @keyframes flamingo-edge-run {
          from {
            stroke-dashoffset: 0;
          }

          to {
            stroke-dashoffset: -278;
          }
        }

        @keyframes logo-enter {
          0% {
            opacity: 0;
            transform: scale(0.9);
            filter: blur(3px);
          }

          45% {
            opacity: 1;
            filter: blur(0);
          }

          75% {
            transform: scale(1.025);
          }

          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        .animate-logo-enter {
          animation: logo-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;