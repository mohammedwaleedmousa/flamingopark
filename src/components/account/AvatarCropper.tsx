import { useEffect, useRef, useState } from "react";
import { Camera, Check, Upload, X } from "lucide-react";

type Props = {
  currentUrl?: string;
  disabled?: boolean;
  onReady: (file: File, previewUrl: string) => void;
};

type Point = { x: number; y: number };

const OUTPUT_SIZE = 512;

const AvatarCropper = ({ currentUrl = "", disabled, onReady }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (source.startsWith("blob:")) URL.revokeObjectURL(source);
  }, [source]);

  const selectFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختر صورة صحيحة");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("حجم الصورة كبير جدًا. الحد الأقصى 25MB");
      return;
    }
    setError("");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSource(URL.createObjectURL(file));
  };

  const displayScale = (() => {
    const base = Math.max(220 / natural.width, 220 / natural.height);
    return base * zoom;
  })();

  const clampOffset = (next: Point, nextZoom = zoom) => {
    const base = Math.max(220 / natural.width, 220 / natural.height);
    const scale = base * nextZoom;
    const maxX = Math.max(0, (natural.width * scale - 220) / 2);
    const maxY = Math.max(0, (natural.height * scale - 220) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
  };

  const confirmCrop = async () => {
    const image = imageRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const previewToOutput = OUTPUT_SIZE / 220;
    const scaledWidth = natural.width * displayScale * previewToOutput;
    const scaledHeight = natural.height * displayScale * previewToOutput;
    const centerX = OUTPUT_SIZE / 2 + offset.x * previewToOutput;
    const centerY = OUTPUT_SIZE / 2 + offset.y * previewToOutput;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(image, centerX - scaledWidth / 2, centerY - scaledHeight / 2, scaledWidth, scaledHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob) {
      setError("تعذر تجهيز الصورة");
      return;
    }

    const file = new File([blob], "avatar.webp", { type: "image/webp", lastModified: Date.now() });
    const previewUrl = URL.createObjectURL(blob);
    onReady(file, previewUrl);
    setSource("");
  };

  if (!source) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative h-[92px] w-[92px] overflow-hidden rounded-full border border-[#E4CECA] bg-[#FAECE9]">
          {currentUrl ? <img src={currentUrl} alt="معاينة الصورة" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Camera className="h-6 w-6 stroke-[1.4] text-[#B77A7B]" /></div>}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} className="hidden" />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="mt-2 flex items-center gap-1.5 text-[8px] font-medium text-[#B86168] disabled:opacity-50"><Upload className="h-3.5 w-3.5" />تغيير الصورة</button>
        {error && <p className="mt-1.5 text-[7px] text-[#B75C5C]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[#E9DDDA] bg-[#FFF9F7] p-3">
      <div className="mb-2 flex items-center justify-between"><div><p className="text-[9px] font-semibold text-[#51433F]">ضبط الصورة</p><p className="mt-0.5 text-[6px] text-[#9C8E89]">حرّك الصورة وكبّرها حتى تناسب الدائرة</p></div><button type="button" onClick={() => setSource("")} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5D8D4] bg-white"><X className="h-3 w-3" /></button></div>
      <div className="mx-auto h-[220px] w-[220px] touch-none overflow-hidden rounded-full border-2 border-white bg-[#EEE5E2] shadow-inner" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: offset }; }} onPointerMove={(event) => { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; setOffset(clampOffset({ x: drag.origin.x + event.clientX - drag.start.x, y: drag.origin.y + event.clientY - drag.start.y })); }} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        <img ref={imageRef} src={source} alt="قص الصورة" draggable={false} onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth || 1, height: event.currentTarget.naturalHeight || 1 })} className="pointer-events-none relative left-1/2 top-1/2 max-w-none select-none" style={{ width: natural.width * displayScale, height: natural.height * displayScale, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
      </div>
      <div className="mt-3 flex items-center gap-2"><span className="text-[7px] text-[#8F807B]">−</span><input aria-label="تكبير الصورة" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => { const next = Number(event.target.value); setZoom(next); setOffset((current) => clampOffset(current, next)); }} className="h-1 flex-1 accent-[#D4777D]" /><span className="text-[7px] text-[#8F807B]">+</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="h-9 rounded-[10px] border border-[#E1D5D1] bg-white text-[8px] font-medium text-[#756661]">إعادة ضبط</button><button type="button" onClick={confirmCrop} className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#D4777D] text-[8px] font-semibold text-white"><Check className="h-3 w-3" />اعتماد الصورة</button></div>
    </div>
  );
};

export default AvatarCropper;
