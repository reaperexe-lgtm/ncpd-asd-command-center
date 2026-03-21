import { useState, useEffect, useRef } from "react";

const BG_IMAGES = [
  "/images/bg-1.png",
  "/images/bg-2.png",
  "/images/bg-3.png",
  "/images/bg-4.png",
  "/images/bg-5.png",
  "/images/bg-6.png",
  "/images/bg-7.png",
  "/images/bg-8.png",
  "/images/auth-bg.png",
];

const SlideshowBackground = () => {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const interval = setInterval(() => {
      setPrev(current);
      setCurrent((p) => (p + 1) % BG_IMAGES.length);
      setFading(true);

      // After fade completes, remove old layer
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setPrev(null);
        setFading(false);
      }, 2000);
    }, 6000);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current]);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {/* Previous image fading out */}
      {prev !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: `url('${BG_IMAGES[prev]}')`,
            opacity: fading ? 0 : 1,
          }}
        />
      )}
      {/* Current image fading in */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms] ease-in-out"
        style={{
          backgroundImage: `url('${BG_IMAGES[current]}')`,
          opacity: 1,
        }}
      />
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
};

export default SlideshowBackground;
