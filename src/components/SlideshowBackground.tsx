import { useEffect, useState } from "react";
import image50 from "@/assets/slideshow/image-50-1.png";

// To add more images: import them the same way above and add them to this array.
// Example:
//   import myPic from "@/assets/slideshow/mein-bild.png";
//   const LOCAL_IMAGES = [image50, myPic];
const LOCAL_IMAGES: string[] = [image50];

const SlideshowBackground = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (LOCAL_IMAGES.length <= 1) return;

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
      <div className="absolute inset-0 bg-background/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background/60" />
    </div>
  );
};

export default SlideshowBackground;
