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
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {BG_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: i === current ? 1 : 0,
            transition: "opacity 3s ease-in-out",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
};

export default SlideshowBackground;
