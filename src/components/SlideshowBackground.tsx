import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_IMAGES = [
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
  const [images, setImages] = useState<string[]>(DEFAULT_IMAGES);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("slideshow_images")
        .select("image_url,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      const extra = (data ?? []).map((r: any) => r.image_url).filter(Boolean);
      setImages(extra.length ? [...DEFAULT_IMAGES, ...extra] : DEFAULT_IMAGES);
    };
    load();
    const ch = supabase
      .channel("slideshow-images-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "slideshow_images" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {images.map((src, i) => (
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
