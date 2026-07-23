import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

export interface CarouselImage {
  url: string;
  publicId?: string;
}

/**
 * Zomato/Swiggy style photo carousel. Supports up to 5 photos with
 * swipe-to-navigate, dot indicators, and a smooth slide+fade transition.
 * Works both as an inline card image strip and inside a fullscreen viewer.
 */
export default function PhotoCarousel({
  images,
  className = '',
  onOpenFullscreen,
}: {
  images: CarouselImage[];
  className?: string;
  onOpenFullscreen?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const photos = images.slice(0, 5);

  if (photos.length === 0) return null;

  const go = (next: number) => {
    if (next < 0 || next >= photos.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50) go(index + 1);
    else if (info.offset.x > 50) go(index - 1);
  };

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={index}
          src={photos[index].url}
          alt=""
          className="w-full h-full object-cover cursor-pointer"
          custom={direction}
          drag={photos.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          onClick={() => onOpenFullscreen?.(index)}
          initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
      </AnimatePresence>

      {photos.length > 1 && (
        <>
          <div className="absolute inset-x-0 top-2 flex justify-center gap-1.5 pointer-events-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              go(index - 1);
            }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white text-sm flex items-center justify-center backdrop-blur-sm"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              go(index + 1);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white text-sm flex items-center justify-center backdrop-blur-sm"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
