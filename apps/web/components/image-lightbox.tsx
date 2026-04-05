"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";

type LightboxState = { src: string; alt: string } | null;

const LightboxContext = createContext<(src: string, alt: string) => void>(() => {});

export function useImageLightbox() {
  return useContext(LightboxContext);
}

export function ImageLightboxProvider({ children }: { children: React.ReactNode }) {
  const [image, setImage] = useState<LightboxState>(null);

  const open = useCallback((src: string, alt: string) => {
    setImage({ src, alt });
  }, []);

  const close = useCallback(() => setImage(null), []);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [image, close]);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </LightboxContext.Provider>
  );
}
