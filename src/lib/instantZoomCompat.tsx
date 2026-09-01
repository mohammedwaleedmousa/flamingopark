import { cloneElement, isValidElement, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode, type TouchEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";

type Point = {
  x: number;
  y: number;
};

type TransformWrapperProps = {
  children: ReactNode | ((controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    resetTransform: () => void;
  }) => ReactNode);
  [key: string]: unknown;
};

type TransformComponentProps = {
  children: ReactNode;
  wrapperClass?: string;
  contentClass?: string;
  [key: string]: unknown;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const CLICK_MOVE_THRESHOLD = 9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const touchDistance = (touches: TouchList) => {
  if (touches.length < 2) return 0;

  const first = touches[0];
  const second = touches[1];
  const x = second.clientX - first.clientX;
  const y = second.clientY - first.clientY;

  return Math.hypot(x, y);
};

export const TransformWrapper = ({ children }: TransformWrapperProps) => {
  const controls = {
    zoomIn: () => undefined,
    zoomOut: () => undefined,
    resetTransform: () => undefined,
  };

  return <>{typeof children === "function" ? children(controls) : children}</>;
};

export const TransformComponent = ({ children, wrapperClass = "", contentClass = "" }: TransformComponentProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<Point | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point>({ x: 0, y: 0 });
  const pinchDistanceRef = useRef(0);
  const pinchScaleRef = useRef(MIN_SCALE);
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  const isZoomed = scale > MIN_SCALE + 0.01;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeZoom();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const resetTransform = () => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  };

  const closeZoom = () => {
    setIsOpen(false);
    setIsInteracting(false);
    dragStartRef.current = null;
    pinchDistanceRef.current = 0;
    resetTransform();
  };

  const clampPosition = (next: Point, nextScale = scale) => {
    const viewport = viewportRef.current;

    if (!viewport || nextScale <= MIN_SCALE + 0.01) return { x: 0, y: 0 };

    const rect = viewport.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (nextScale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (nextScale - 1)) / 2);

    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  };

  const applyScale = (nextScale: number) => {
    const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);

    setScale(clampedScale);
    setPosition(clampPosition(position, clampedScale));
  };

  const toggleZoom = () => {
    if (isZoomed) {
      resetTransform();
      return;
    }

    applyScale(2.5);
  };

  const openZoom = () => {
    setIsOpen(true);
    resetTransform();
  };

  const handlePreviewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePreviewPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!start) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);

    if (moved <= CLICK_MOVE_THRESHOLD) {
      openZoom();
    }
  };

  const handlePreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openZoom();
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    applyScale(scale * (event.deltaY < 0 ? 1.16 : 1 / 1.16));
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleZoom();
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || event.button !== 0) return;

    event.preventDefault();
    setIsInteracting(true);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragOriginRef.current = position;
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !dragStartRef.current) return;

    event.preventDefault();

    setPosition(
      clampPosition({
        x: dragOriginRef.current.x + event.clientX - dragStartRef.current.x,
        y: dragOriginRef.current.y + event.clientY - dragStartRef.current.y,
      }),
    );
  };

  const stopMousePan = () => {
    dragStartRef.current = null;
    setIsInteracting(false);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      setIsInteracting(true);
      pinchDistanceRef.current = touchDistance(event.touches);
      pinchScaleRef.current = scale;
      dragStartRef.current = null;
      return;
    }

    if (!isZoomed || event.touches.length !== 1) return;

    event.preventDefault();
    setIsInteracting(true);
    const touch = event.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    dragOriginRef.current = position;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchDistanceRef.current > 0) {
      event.preventDefault();
      const distance = touchDistance(event.touches);
      applyScale(pinchScaleRef.current * (distance / pinchDistanceRef.current));
      return;
    }

    if (!isZoomed || event.touches.length !== 1 || !dragStartRef.current) return;

    event.preventDefault();
    const touch = event.touches[0];

    setPosition(
      clampPosition({
        x: dragOriginRef.current.x + touch.clientX - dragStartRef.current.x,
        y: dragOriginRef.current.y + touch.clientY - dragStartRef.current.y,
      }),
    );
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
    pinchDistanceRef.current = 0;
    setIsInteracting(false);
  };

  const zoomChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ className?: string }>, {
        className: `${(children as ReactElement<{ className?: string }>).props.className || ""} !object-contain !object-center`,
      })
    : children;

  return (
    <>
      <div
        className={`instant-zoom-preview ${wrapperClass}`}
        role="button"
        tabIndex={0}
        aria-label="تكبير صورة المنتج"
        onPointerDown={handlePreviewPointerDown}
        onPointerUp={handlePreviewPointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
        onKeyDown={handlePreviewKeyDown}
        style={{ cursor: "zoom-in" }}
      >
        <div className={contentClass}>{children}</div>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-white/98"
            role="dialog"
            aria-modal="true"
            aria-label="تكبير صورة المنتج"
          >
            <button
              type="button"
              onClick={closeZoom}
              aria-label="إغلاق التكبير"
              className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#E7DDD9] bg-white/95 text-[27px] font-light leading-none text-[#554844] shadow-sm md:right-5 md:top-5"
            >
              ×
            </button>

            <div
              ref={viewportRef}
              className="absolute inset-0 overflow-hidden px-2 pb-16 pt-14 md:px-12 md:pb-20 md:pt-16"
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopMousePan}
              onMouseLeave={stopMousePan}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              style={{
                touchAction: "none",
                cursor: isZoomed ? (isInteracting ? "grabbing" : "grab") : "zoom-in",
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                  transformOrigin: "center center",
                  transition: isInteracting ? "none" : "transform 140ms ease-out",
                  willChange: isZoomed ? "transform" : "auto",
                }}
              >
                <div className="h-full w-full">{zoomChild}</div>
              </div>
            </div>

            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#E7DDD9] bg-white/95 p-1.5 shadow-sm md:bottom-5">
              <button
                type="button"
                onClick={() => applyScale(scale / 1.35)}
                disabled={scale <= MIN_SCALE + 0.01}
                aria-label="تصغير الصورة"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-[#554844] disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[46px] text-center text-[10px] font-semibold text-[#786863]">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => applyScale(scale * 1.35)}
                disabled={scale >= MAX_SCALE - 0.01}
                aria-label="تكبير الصورة"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-[#554844] disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
