import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const FluglizenzenUrkunde = () => {
  const [candidateName, setCandidateName] = useState("Stewie Smith");
  const [flightTime, setFlightTime] = useState("7:35");
  const certRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      {/* Edit controls */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-primary text-sm">Urkunde bearbeiten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Name des Absolventen</Label>
            <Input
              className="mt-1 bg-background border-border"
              placeholder="Vor- und Nachname"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>
          <div>
            <Label>Flugzeit (Minuten)</Label>
            <Input
              className="mt-1 bg-background border-border"
              placeholder="z.B. 7:35"
              value={flightTime}
              onChange={(e) => setFlightTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Certificate preview */}
      <div className="flex justify-center">
        <div
          ref={certRef}
          className="relative bg-white text-black w-full max-w-[800px] aspect-[1.414/1] border-2 border-[#c9b06b] shadow-xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {/* Inner border */}
          <div className="absolute inset-3 border border-[#c9b06b]/60" />

          {/* Helicopter silhouette watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
            <svg viewBox="0 0 512 512" className="w-[60%] h-auto" fill="currentColor">
              <path d="M504 168h-72.6l-51.7-77.6c-3.9-5.9-10.5-9.4-17.6-9.4H288V48h56c4.4 0 8-3.6 8-8V8c0-4.4-3.6-8-8-8H168c-4.4 0-8 3.6-8 8v32c0 4.4 3.6 8 8 8h56v33H149.9c-7.1 0-13.7 3.5-17.6 9.4L80.6 168H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h48v64c0 8.8 7.2 16 16 16h16c8.8 0 16-7.2 16-16v-64h304v64c0 8.8 7.2 16 16 16h16c8.8 0 16-7.2 16-16v-64h48c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8zM160.6 168l34.6-52h121.6l34.6 52H160.6zM304 384H208c-8.8 0-16 7.2-16 16v64c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48v-64c0-8.8-7.2-16-16-16z" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-between h-full py-[6%] px-[8%]">
            {/* Header */}
            <div className="text-center space-y-1">
              <h1
                className="text-[clamp(1.2rem,3vw,2.2rem)] tracking-[0.35em] font-normal text-[#2c2c2c]"
                style={{ fontVariant: "small-caps" }}
              >
                URKUNDE
              </h1>
              <p className="text-[clamp(0.5rem,1.2vw,0.75rem)] tracking-[0.25em] text-[#666] uppercase">
                Für das Absolvieren der Fluglizenz
              </p>
            </div>

            {/* Badge placeholder */}
            <div className="w-[clamp(50px,10vw,80px)] h-[clamp(50px,10vw,80px)] rounded-full bg-gradient-to-br from-[#1a1a3e] to-[#2a2a5e] border-2 border-[#c9b06b]/50 flex items-center justify-center shadow-md">
              <span className="text-white text-[clamp(0.4rem,0.8vw,0.6rem)] font-bold tracking-wider">NCPD</span>
            </div>

            {/* Awarded to */}
            <div className="text-center space-y-1">
              <p className="text-[clamp(0.5rem,1.1vw,0.7rem)] tracking-[0.2em] text-[#888] uppercase">
                Diese wird vergeben an
              </p>
            </div>

            {/* Name */}
            <div className="text-center w-full max-w-[70%]">
              <p
                className="text-[clamp(1.5rem,4.5vw,3.2rem)] leading-tight text-[#1a1a1a]"
                style={{ fontFamily: "'Pinyon Script', 'Dancing Script', cursive, Georgia, serif" }}
              >
                {candidateName || "Name eingeben"}
              </p>
              <div className="w-full h-[1px] bg-[#c9b06b]/60 mt-1" />
            </div>

            {/* Time text */}
            <p className="text-[clamp(0.45rem,1vw,0.65rem)] tracking-[0.15em] text-[#888] uppercase text-center">
              Die Flugstrecke wurde in einer Zeit von{" "}
              <span className="font-semibold text-[#555]">{flightTime || "0:00"} Min</span>{" "}
              absolviert.
            </p>

            {/* Signatures */}
            <div className="w-full flex justify-between items-end px-[5%]">
              <div className="text-center">
                <p
                  className="text-[clamp(1rem,2.5vw,1.8rem)] text-[#1a1a1a]"
                  style={{ fontFamily: "'Pinyon Script', 'Dancing Script', cursive, Georgia, serif" }}
                >
                  Pablo Morales
                </p>
                <div className="w-full h-[1px] bg-[#c9b06b]/60" />
                <p className="text-[clamp(0.45rem,0.9vw,0.6rem)] tracking-[0.25em] text-[#666] uppercase mt-1">
                  Pablo Morales
                </p>
                <p className="text-[clamp(0.4rem,0.8vw,0.55rem)] text-[#999]">Director</p>
              </div>
              <div className="text-center">
                <p
                  className="text-[clamp(1rem,2.5vw,1.8rem)] text-[#1a1a1a]"
                  style={{ fontFamily: "'Pinyon Script', 'Dancing Script', cursive, Georgia, serif" }}
                >
                  Gabriel Rodrigues
                </p>
                <div className="w-full h-[1px] bg-[#c9b06b]/60" />
                <p className="text-[clamp(0.45rem,0.9vw,0.6rem)] tracking-[0.25em] text-[#666] uppercase mt-1">
                  Gabriel Rodrigues
                </p>
                <p className="text-[clamp(0.4rem,0.8vw,0.55rem)] text-[#999]">Co-Director</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluglizenzenUrkunde;
