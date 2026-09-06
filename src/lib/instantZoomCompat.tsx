import { createContext, useContext, useMemo, useRef, useState, type ReactNode, type TouchEvent, type WheelEvent } from "react";

type TransformWrapperProps = {
  children: ReactNode | ((controls: Record<string, never>) => ReactNode);
  minScale?: number;
  maxScale?: number;
  [key: string]: unknown;
};

type TransformComponentProps = {
  children: ReactNode;
  wrapperClass?: string;
  contentClass?: string;
  [key: string]: unknown;
};

type ZoomContextValue = {
  minScale: number;
  maxScale: number;
  scale: number;
  setScale: (value: number) => void;
  position: { x: number; y: number };
  setPosition: (value: { x: number; y: number }) => void;
};

const ZoomContext = createContext<ZoomContextValue | null>(null);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (touches: TouchList) => {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
};

export const TransformWrapper = ({ children, minScale = 1, maxScale = 4 }: TransformWrapperProps) => {
  const safeMin = Number.isFinite(minScale) ? Math.max(0.5, Number(minScale)) : 1;
  const safeMax = Number.isFinite(maxScale) ? Math.max(safeMin, Number(maxScale)) : 4;
  const [scale, setScaleState] = useState(safeMin);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const setScale = (value: number) => {
    const next = clamp(value, safeMin, safeMax);
    setScaleState(next);
    if (next <= safeMin + 0.001) setPosition({ x: 0, y: 0 });
  };

  const context = useMemo<ZoomContextValue>(() => ({ minScale: safeMin, maxScale: safeMax, scale, setScale, position, setPosition }), [safeMin, safeMax, scale, position]);

  return <ZoomContext.Provider value={context}>{typeof children === "function" ? children({}) : children}</ZoomContext.Provider>;
};

export const TransformComponent = ({ children, wrapperClass = "", contentClass = "" }: TransformComponentProps) => {
  const zoom = useContext(ZoomContext);
  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1);
  const panStart = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const lastTapAt = useRef(0);

  if (!zoom) {
    return <div className={wrapperClass}><div className={contentClass}>{children}</div></div>;
  }

  const { minScale, maxScale, scale, setScale, position, setPosition } = zoom;
  const isZoomed = scale > minScale + 0.01;

  const toggleZoom = () => {
    if (isZoomed) {
      setScale(minScale);
      return;
    }
    setScale(Math.min(maxScale, Math.max(minScale + 1, 2.5)));
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      pinchStartDistance.current = distance(event.touches);
      pinchStartScale.current = scale;
      panStart.current = null;
      event.stopPropagation();
      return;
    }

    if (event.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapAt.current < 260) {
        event.preventDefault();
        event.stopPropagation();
        toggleZoom();
        lastTapAt.current = 0;
        return;
      }
      lastTapAt.current = now;

      if (isZoomed) {
        const touch = event.touches[0];
        panStart.current = { x: position.x, y: position.y, clientX: touch.clientX, clientY: touch.clientY };
        event.stopPropagation();
      }
    }
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2 && pinchStartDistance.current > 0) {
      const currentDistance = distance(event.touches);
      if (currentDistance > 0) {
        event.preventDefault();
        event.stopPropagation();
        setScale(pinchStartScale.current * (currentDistance / pinchStartDistance.current));
      }
      return;
    }

    if (event.touches.length === 1 && isZoomed && panStart.current) {
      event.preventDefault();
      event.stopPropagation();
      const touch = event.touches[0];
      const maxOffset = 240 * (scale - minScale);
      setPosition({
        x: clamp(panStart.current.x + touch.clientX - panStart.current.clientX, -maxOffset, maxOffset),
        y: clamp(panStart.current.y + touch.clientY - panStart.current.clientY, -maxOffset, maxOffset),
      });
    }
  };

  const onTouchEnd = () => {
    if (scale <= minScale + 0.01) {
      setScale(minScale);
    }
    pinchStartDistance.current = 0;
    panStart.current = null;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY < 0 ? 1 : -1;
    setScale(scale + direction * 0.2);
  };

  return (
    <div
      className={wrapperClass}
      onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleZoom(); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onWheel={onWheel}
      style={{ touchAction: isZoomed ? "none" : "pan-y" }}
    >
      <div
        className={contentClass}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          transition: pinchStartDistance.current > 0 || panStart.current ? "none" : "transform 160ms ease-out",
          willChange: isZoomed ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
