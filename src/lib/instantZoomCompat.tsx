import { createContext, useContext, useMemo, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent, type WheelEvent } from "react";

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
  scale: number;
  minScale: number;
  maxScale: number;
  position: Point;
  setScale: (scale: number) => void;
  setPosition: (position: Point) => void;
  resetTransform: () => void;
};

const ZoomContext = createContext<ZoomContextValue | null>(null);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const touchDistance = (touches: TouchList) => {
  if (touches.length < 2) return 0;

  const first = touches[0];
  const second = touches[1];
  const x = second.clientX - first.clientX;
  const y = second.clientY - first.clientY;

  return Math.hypot(x, y);
};

export const TransformWrapper = ({ children, minScale = 1, maxScale = 4 }: TransformWrapperProps) => {
  const safeMinScale = Math.max(0.5, minScale);
  const safeMaxScale = Math.max(safeMinScale, maxScale);
  const [scale, setScaleState] = useState(safeMinScale);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });

  const setScale = (nextScale: number) => {
    const clampedScale = clamp(nextScale, safeMinScale, safeMaxScale);

    setScaleState(clampedScale);

    if (clampedScale <= safeMinScale + 0.001) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const resetTransform = () => {
    setScaleState(safeMinScale);
    setPosition({ x: 0, y: 0 });
  };

  const controls = useMemo(
    () => ({
      zoomIn: () => setScale(scale * 1.4),
      zoomOut: () => setScale(scale / 1.4),
      resetTransform,
    }),
    [scale, safeMinScale, safeMaxScale],
  );

  return (
    <ZoomContext.Provider
      value={{
        scale,
        minScale: safeMinScale,
        maxScale: safeMaxScale,
        position,
        setScale,
        setPosition,
        resetTransform,
      }}
    >
      {typeof children === "function" ? children(controls) : children}
    </ZoomContext.Provider>
  );
};

export const TransformComponent = ({ children, wrapperClass = "", contentClass = "" }: TransformComponentProps) => {
  const zoom = useContext(ZoomContext);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point>({ x: 0, y: 0 });
  const pinchDistanceRef = useRef(0);
  const pinchScaleRef = useRef(1);
  const lastTapRef = useRef(0);
  const [isInteracting, setIsInteracting] = useState(false);

  if (!zoom) {
    return (
      <div className={wrapperClass}>
        <div className={contentClass}>{children}</div>
      </div>
    );
  }

  const { scale, minScale, maxScale, position, setScale, setPosition, resetTransform } = zoom;
  const isZoomed = scale > minScale + 0.01;

  const clampPosition = (next: Point, nextScale = scale) => {
    const wrapper = wrapperRef.current;

    if (!wrapper || nextScale <= minScale + 0.01) return { x: 0, y: 0 };

    const rect = wrapper.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (nextScale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (nextScale - 1)) / 2);

    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  };

  const applyScale = (nextScale: number) => {
    const clampedScale = clamp(nextScale, minScale, maxScale);

    setScale(clampedScale);
    setPosition(clampPosition(position, clampedScale));
  };

  const toggleZoom = () => {
    if (isZoomed) {
      resetTransform();
      return;
    }

    applyScale(Math.min(maxScale, Math.max(2.5, minScale * 2.5)));
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    applyScale(scale * factor);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleZoom();
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    setIsInteracting(true);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragOriginRef.current = position;
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !dragStartRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const next = {
      x: dragOriginRef.current.x + event.clientX - dragStartRef.current.x,
      y: dragOriginRef.current.y + event.clientY - dragStartRef.current.y,
    };

    setPosition(clampPosition(next));
  };

  const stopMousePan = () => {
    dragStartRef.current = null;
    setIsInteracting(false);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      event.stopPropagation();
      setIsInteracting(true);
      pinchDistanceRef.current = touchDistance(event.touches);
      pinchScaleRef.current = scale;
      dragStartRef.current = null;
      return;
    }

    if (event.touches.length !== 1) return;

    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 260;
    lastTapRef.current = now;

    if (isDoubleTap) {
      event.preventDefault();
      event.stopPropagation();
      toggleZoom();
      lastTapRef.current = 0;
      return;
    }

    if (!isZoomed) return;

    event.preventDefault();
    event.stopPropagation();
    setIsInteracting(true);
    const touch = event.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    dragOriginRef.current = position;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchDistanceRef.current > 0) {
      event.preventDefault();
      event.stopPropagation();

      const distance = touchDistance(event.touches);
      const ratio = distance / pinchDistanceRef.current;
      applyScale(pinchScaleRef.current * ratio);
      return;
    }

    if (!isZoomed || event.touches.length !== 1 || !dragStartRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    const next = {
      x: dragOriginRef.current.x + touch.clientX - dragStartRef.current.x,
      y: dragOriginRef.current.y + touch.clientY - dragStartRef.current.y,
    };

    setPosition(clampPosition(next));
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
    pinchDistanceRef.current = 0;
    setIsInteracting(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={`instant-zoom-wrapper ${wrapperClass}`}
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
        overflow: "hidden",
        touchAction: isZoomed ? "none" : "pan-y",
        cursor: isZoomed ? (isInteracting ? "grabbing" : "grab") : "zoom-in",
      }}
    >
      <div
        className={`instant-zoom-content ${contentClass}`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          transition: isInteracting ? "none" : "transform 140ms ease-out",
          willChange: isZoomed ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
};
