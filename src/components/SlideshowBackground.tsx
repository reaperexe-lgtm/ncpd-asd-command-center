import { useState, useEffect } from "react";

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BG_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {BG_IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: `url('${src}')`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
};

export default SlideshowBackground;
