import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const BackToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="العودة للأعلى"
      className="fixed bottom-24 left-4 md:bottom-8 md:left-8 z-40 w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform animate-fade-in"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};

export default BackToTop;