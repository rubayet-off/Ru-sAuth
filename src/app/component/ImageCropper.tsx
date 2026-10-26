"use client";

import { Minus, Plus } from "@mynaui/icons-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";

export interface ImageCropperHandle {
  getCroppedBlob: () => Promise<Blob>;
}

interface ImageCropperProps {
  src: string;
  ref?: Ref<ImageCropperHandle>;
  disabled?: boolean;
}

const VIEWPORT = 256;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const KEY_STEP = 12;

interface Point {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function ImageCropper({
  src,
  ref,
  disabled,
}: ImageCropperProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const pointersRef = useRef(new Map<number, Point>());
  const lastPinchDistanceRef = useRef<number | null>(null);

  const baseScale = natural
    ? Math.max(VIEWPORT / natural.width, VIEWPORT / natural.height)
    : 1;

  const scale = baseScale * zoom;
  const displayWidth = natural ? natural.width * scale : 0;
  const displayHeight = natural ? natural.height * scale : 0;

  const clampOffset = useCallback(
    (point: Point, width: number, height: number): Point => {
      const maxX = Math.max(0, (width - VIEWPORT) / 2);
      const maxY = Math.max(0, (height - VIEWPORT) / 2);

      return { x: clamp(point.x, -maxX, maxX), y: clamp(point.y, -maxY, maxY) };
    },
    [],
  );

  const applyZoom = useCallback(
    (nextZoom: number) => {
      if (!natural) return;

      const safeZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const nextScale = baseScale * safeZoom;

      setZoom(safeZoom);
      setOffset((current) =>
        clampOffset(
          current,
          natural.width * nextScale,
          natural.height * nextScale,
        ),
      );
    },
    [natural, baseScale, clampOffset],
  );

  useEffect(() => {
    const node = viewportRef.current;

    if (!node || disabled) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyZoom(zoom - event.deltaY * 0.0025);
    };

    node.addEventListener("wheel", onWheel, { passive: false });

    return () => node.removeEventListener("wheel", onWheel);
  }, [applyZoom, zoom, disabled]);

  function handleLoad() {
    const image = imageRef.current;

    if (image)
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    lastPinchDistanceRef.current = null;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);

    if (!previous || !natural) return;

    const current = { x: event.clientX, y: event.clientY };

    pointers.set(event.pointerId, current);

    if (pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);

      if (lastPinchDistanceRef.current) {
        applyZoom(zoom * (distance / lastPinchDistanceRef.current));
      }

      lastPinchDistanceRef.current = distance;
      return;
    }

    setOffset((value) =>
      clampOffset(
        {
          x: value.x + current.x - previous.x,
          y: value.y + current.y - previous.y,
        },
        displayWidth,
        displayHeight,
      ),
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    lastPinchDistanceRef.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    const moves: Record<string, Point> = {
      ArrowLeft: { x: KEY_STEP, y: 0 },
      ArrowRight: { x: -KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: KEY_STEP },
      ArrowDown: { x: 0, y: -KEY_STEP },
    };

    const move = moves[event.key];

    if (move) {
      event.preventDefault();
      setOffset((value) =>
        clampOffset(
          { x: value.x + move.x, y: value.y + move.y },
          displayWidth,
          displayHeight,
        ),
      );
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      applyZoom(zoom + 0.1);
    } else if (event.key === "-") {
      event.preventDefault();
      applyZoom(zoom - 0.1);
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      getCroppedBlob: () =>
        new Promise<Blob>((resolve, reject) => {
          const image = imageRef.current;

          if (!image || !natural) {
            reject(new Error("The image is not ready yet."));
            return;
          }

          const sourceX = (displayWidth / 2 - VIEWPORT / 2 - offset.x) / scale;
          const sourceY = (displayHeight / 2 - VIEWPORT / 2 - offset.y) / scale;
          const sourceSize = VIEWPORT / scale;

          const canvas = document.createElement("canvas");

          canvas.width = OUTPUT_SIZE;
          canvas.height = OUTPUT_SIZE;

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Your browser could not prepare the image."));
            return;
          }

          context.fillStyle = "#1f2026";
          context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
          context.imageSmoothingQuality = "high";
          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            OUTPUT_SIZE,
            OUTPUT_SIZE,
          );

          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new Error("Could not crop the image.")),
            "image/jpeg",
            0.9,
          );
        }),
    }),
    [natural, displayWidth, displayHeight, offset, scale],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={viewportRef}
        role="application"
        tabIndex={disabled ? -1 : 0}
        aria-label="Photo position. Drag or use arrow keys to move, plus and minus to zoom."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        style={{ width: VIEWPORT, height: VIEWPORT, maxWidth: "100%" }}
        className="relative touch-none select-none overflow-hidden rounded-full border border-[#2A2C32] bg-[#0E0F12] outline-none focus-visible:border-[#3B82F6] cursor-grab active:cursor-grabbing"
      >
        <img
          ref={imageRef}
          src={src}
          alt="Selected profile picture"
          draggable={false}
          onLoad={handleLoad}
          style={{
            width: displayWidth || undefined,
            height: displayHeight || undefined,
            left: VIEWPORT / 2 - displayWidth / 2 + offset.x,
            top: VIEWPORT / 2 - displayHeight / 2 + offset.y,
            visibility: natural ? "visible" : "hidden",
          }}
          className="pointer-events-none absolute max-w-none"
        />
      </div>

      <div className="flex w-full max-w-64 items-center gap-3">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={disabled || zoom <= MIN_ZOOM}
          onClick={() => applyZoom(zoom - 0.2)}
          className="cursor-pointer text-[#787878] transition hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={18} />
        </button>

        <input
          type="range"
          aria-label="Zoom"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={disabled}
          onChange={(event) => applyZoom(Number(event.target.value))}
          className="h-1 w-full cursor-pointer accent-[#3B82F6]"
        />

        <button
          type="button"
          aria-label="Zoom in"
          disabled={disabled || zoom >= MAX_ZOOM}
          onClick={() => applyZoom(zoom + 0.2)}
          className="cursor-pointer text-[#787878] transition hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
      </div>

      <p className="text-center text-xs text-[#787878]">
        Drag to reposition · scroll, pinch or use the slider to zoom
      </p>
    </div>
  );
}
