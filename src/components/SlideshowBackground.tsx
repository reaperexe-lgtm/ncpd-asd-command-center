import { useEffect, useState } from "react";

const LOCAL_IMAGES = ["/images/auth-bg.png"];

const SlideshowBackground = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % LOCAL_IMAGES.length);
    }, 8000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {LOCAL_IMAGES.map((src, i) => (
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
