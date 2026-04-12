import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ncpdBadge from "@/assets/ncpd-badge.png";
import heliWatermark from "@/assets/heli-watermark.png";

const FluglizenzenUrkunde = () => {
  const [candidateName, setCandidateName] = useState("Stewie Smith");
  const [flightTime, setFlightTime] = useState("7:35");
  const [directorName, setDirectorName] = useState("Pablo Morales");
  const [coDirectorName, setCoDirectorName] = useState("Gabriel Rodrigues");
  const [directorTitle, setDirectorTitle] = useState("Director");
  const [coDirectorTitle, setCoDirectorTitle] = useState("Co-Director");

  return (
    <div className="space-y-6">
      {/* Edit controls */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-primary text-sm">Urkunde bearbeiten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Name des Absolventen</Label>
            <Input className="mt-1 bg-background border-border" placeholder="Vor- und Nachname" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          </div>
          <div>
            <Label>Flugzeit (Minuten)</Label>
            <Input className="mt-1 bg-background border-border" placeholder="z.B. 7:35" value={flightTime} onChange={(e) => setFlightTime(e.target.value)} />
          </div>
          <div>
            <Label>Director Name</Label>
            <Input className="mt-1 bg-background border-border" value={directorName} onChange={(e) => setDirectorName(e.target.value)} />
          </div>
          <div>
            <Label>Director Titel</Label>
            <Input className="mt-1 bg-background border-border" value={directorTitle} onChange={(e) => setDirectorTitle(e.target.value)} />
          </div>
          <div>
            <Label>Co-Director Name</Label>
            <Input className="mt-1 bg-background border-border" value={coDirectorName} onChange={(e) => setCoDirectorName(e.target.value)} />
          </div>
          <div>
            <Label>Co-Director Titel</Label>
            <Input className="mt-1 bg-background border-border" value={coDirectorTitle} onChange={(e) => setCoDirectorTitle(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Certificate preview */}
      <div className="flex justify-center">
        <div
          className="relative bg-white text-black w-full max-w-[800px] aspect-[1.414/1] border-2 border-[#c9b06b] shadow-xl overflow-hidden"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {/* Inner border */}
          <div className="absolute inset-3 border border-[#c9b06b]/60 z-10 pointer-events-none" />

          {/* Helicopter watermark background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={heliWatermark}
              alt=""
              className="w-[65%] h-auto opacity-[0.08] select-none"
              draggable={false}
            />
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

            {/* Badge */}
            <div className="w-[clamp(80px,16vw,140px)] h-[clamp(80px,16vw,140px)] rounded-full overflow-hidden shadow-lg">
              <img
                src={ncpdBadge}
                alt="NCPD Fluglizenz Badge"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Awarded to */}
            <p className="text-[clamp(0.5rem,1.1vw,0.7rem)] tracking-[0.2em] text-[#888] uppercase">
              Diese wird vergeben an
            </p>

            {/* Name */}
            <div className="text-center w-full max-w-[70%]">
              <p
                className="text-[clamp(1.5rem,4.5vw,3.2rem)] leading-tight text-[#1a1a1a]"
                style={{ fontFamily: "'Great Vibes', 'Pinyon Script', cursive, serif" }}
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
                  style={{ fontFamily: "'Great Vibes', 'Pinyon Script', cursive, serif" }}
                >
                  {directorName}
                </p>
                <div className="w-full h-[1px] bg-[#c9b06b]/60" />
                <p className="text-[clamp(0.45rem,0.9vw,0.6rem)] tracking-[0.25em] text-[#666] uppercase mt-1">
                  {directorName}
                </p>
                <p className="text-[clamp(0.4rem,0.8vw,0.55rem)] text-[#999]">{directorTitle}</p>
              </div>
              <div className="text-center">
                <p
                  className="text-[clamp(1rem,2.5vw,1.8rem)] text-[#1a1a1a]"
                  style={{ fontFamily: "'Great Vibes', 'Pinyon Script', cursive, serif" }}
                >
                  {coDirectorName}
                </p>
                <div className="w-full h-[1px] bg-[#c9b06b]/60" />
                <p className="text-[clamp(0.45rem,0.9vw,0.6rem)] tracking-[0.25em] text-[#666] uppercase mt-1">
                  {coDirectorName}
                </p>
                <p className="text-[clamp(0.4rem,0.8vw,0.55rem)] text-[#999]">{coDirectorTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluglizenzenUrkunde;
