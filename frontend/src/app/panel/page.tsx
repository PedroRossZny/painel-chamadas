"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { API_URL, UNIT_NAME } from "../../lib/config";

// Event sent by the backend (GET /audio/stream/area/:areaId) for each call.
type AudioEvent = {
  audioId: number;
  callId: number;
  patientName: string;
  doctorName: string;
  sector: string;
  attempt: number;
  text: string;
  audioUrl: string;
};

type RecentCall = {
  callId: number;
  patientName: string;
  sector: string;
  time: string; // HH:MM
};

// Messages that scroll at the bottom of the screen.
const NOTICES = [
  "Mantenha o silêncio nas áreas de atendimento",
  "Utilize máscara se estiver com sintomas gripais",
  "Respeite a ordem de chamada dos pacientes",
  "Em caso de dúvidas, procure a recepção",
  "Acompanhe apenas se autorizado pela equipe",
  "Higienize as mãos com frequência",
  "Obrigado por colaborar com um ambiente seguro",
];

// The panel shows one area, chosen in the address: /panel?area=2 (default 1).
function getAreaId() {
  const area = Number(new URLSearchParams(window.location.search).get("area"));
  return Number.isInteger(area) && area > 0 ? area : 1;
}

let audioContext: AudioContext | null = null;

// Short beep before the voice, made with the Web Audio API (no audio file).
function playBeep() {
  audioContext ??= new AudioContext();
  const ctx = audioContext;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(800, ctx.currentTime);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.8);
}

// Resolves when the announcement ends, or right away if the browser blocks
// autoplay, so the backend is always told that the panel is free again.
function playAudio(audioUrl: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio(audioUrl);

    audio.onended = () => resolve();
    audio.onerror = () => resolve();

    audio.play().catch(() => resolve());
  });
}

async function finishAudio(audioId: number) {
  try {
    await fetch(`${API_URL}/audio/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioId }),
    });
  } catch (err) {
    console.error("Erro ao finalizar áudio", err);
  }
}

export default function Home() {
  // Clock (HH:MM) and date (DD/MM/YYYY) in the header.
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // Patient being called now.
  const [currentCall, setCurrentCall] = useState<AudioEvent | null>(null);

  // Last three different patients, shown in the footer.
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);

  // Announcements play one after the other. Each event waits for the
  // previous one to finish, so none is skipped or played on top of another.
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");

      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();

      setTime(`${hours}:${minutes}`);
      setDate(`${day}/${month}/${year}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listens to the backend's event stream for this area. If the connection
  // drops, EventSource reconnects by itself.
  useEffect(() => {
    const eventSource = new EventSource(
      `${API_URL}/audio/stream/area/${getAreaId()}`,
    );

    const announce = async (data: AudioEvent) => {
      const timeLabel = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setCurrentCall(data);

      // Newest first, without repeating a patient that was called again.
      setRecentCalls((prev) => {
        const next = [
          {
            callId: data.callId,
            patientName: data.patientName,
            sector: data.sector,
            time: timeLabel,
          },
          ...prev,
        ];

        const unique = next.filter(
          (item, index, self) =>
            index === self.findIndex((i) => i.callId === item.callId),
        );

        return unique.slice(0, 3);
      });

      playBeep();
      await new Promise((r) => setTimeout(r, 800));
      await playAudio(`${API_URL}${data.audioUrl}`);

      // Frees the area so the backend can send the next call.
      await finishAudio(data.audioId);
    };

    eventSource.onmessage = (event) => {
      const data: AudioEvent = JSON.parse(event.data);
      queueRef.current = queueRef.current
        .then(() => announce(data))
        .catch((err) => console.error("Erro ao anunciar chamada", err));
    };

    eventSource.onerror = () => {
      console.error("Conexão com o servidor perdida, tentando de novo...");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="h-screen relative overflow-hidden bg-slate-900">
      {/* ================= HEADER ================= */}
      <div className="h-[20%] min-h-30 bg-blue-900 text-white z-10 relative flex items-center px-8 gap-6 shadow-xl">
        {/* LOGO */}
        <div className="h-[70%] aspect-square relative">
          <Image
            src="/logo-base.png"
            alt="Logo do estabelecimento"
            fill
            sizes="20vh"
            className="object-contain"
          />
        </div>

        {/* NAME OF THE HEALTH UNIT */}
        <div className=" text-base sm:text-lg md:text-3xl 2xl:text-5xl font-semibold leading-tight max-w-[70%]">
          {UNIT_NAME}
        </div>

        {/* CLOCK */}
        <div className="ml-auto bg-blue-950/80 px-5 py-3 rounded-lg text-center border border-blue-800/50">
          <div className="text-lg sm:text-xl md:text-2xl 2xl:text-4xl font-semibold leading-none font-mono">
            {time}
          </div>

          <div className="text-sm sm:text-base md:text-xl 2xl:text-3xl opacity-80">
            {date}
          </div>
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div className="relative h-[55%] overflow-hidden">
        {/* BACKGROUND: three diagonal shades of blue */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-blue-600"
            style={{
              clipPath: "polygon(100% 100%, 100% 0%, 35% 0%, 50% 100%)",
            }}
          />

          <div
            className="absolute inset-0 bg-blue-700"
            style={{
              clipPath: "polygon(50.1% 100%, 35.1% 0%, 15% 0%, 30% 100%)",
            }}
          />

          <div
            className="absolute inset-0 bg-blue-800"
            style={{
              clipPath: "polygon(30.1% 100%, 15.1% 0%, 0% 0%, 0% 100%)",
            }}
          />
        </div>

        {/* PROFESSIONAL, top left corner */}
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 md:top-4 md:left-4 z-20">
          <div className="inline-block bg-white/10 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 md:py-3 rounded-lg border-l-4 border-blue-400 shadow-lg max-w-[75w] sm:max-w-none">
            <p className="text-blue-200 text-[10px] sm:text-xs 2xl:text-2xl 2xl:p-1 uppercase tracking-widest font-bold">
              Profissional
            </p>
            <p className="text-white text-sm sm:text-base md:text-xl 2xl:text-3xl 2xl:p-1 font-semibold truncate">
              {currentCall?.doctorName ?? "—"}
            </p>
          </div>
        </div>

        {/* PATIENT AND ROOM */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <p className="text-blue-200 text-xl md:text-2xl 2xl:text-3xl uppercase tracking-[0.2em] mb-2 2xl:mb-4 font-medium">
            Paciente
          </p>

          <h1 className="text-3xl md:text-5xl lg:text-6xl 2xl:text-7xl font-black text-white uppercase drop-shadow-lg tracking-wide animate-pulse-once mb-4 2xl:mb-6">
            {currentCall?.patientName ?? "—"}
          </h1>
          {currentCall && currentCall.attempt > 1 && (
            <div
              className={`mb-3 px-4 py-1 rounded-full text-sm font-semibold 2xl:text-3xl
      ${
        currentCall.attempt === 2
          ? "bg-yellow-500/90 text-yellow-950"
          : "bg-red-600/90 text-white"
      }
    `}
            >
              {currentCall.attempt === 2 ? "Chamada Nº 2 " : "Chamada Nº 3"}
            </div>
          )}
          <div className="mt-2 md:mt-4 px-8 py-2 2xl:py-3 bg-blue-950/30 backdrop-blur-sm rounded-full border border-blue-400/20">
            <p className="text-xl md:text-3xl 2xl:text-5xl font-medium 2xl:font-semibold text-blue-100">
              {currentCall?.sector ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="absolute bottom-0 w-full h-[30%] bg-blue-200/90 text-blue-900 z-20 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col">
        <div className="px-4 py-2 2xl:py-4 bg-blue-100/80 border-b border-blue-300">
          <span className="text-lg md:text-2xl 2xl:text-4xl font-semibold uppercase tracking-wide text-blue-900">
            Últimas chamadas
          </span>
        </div>

        {/* LAST CALLS: time, patient and room in three columns */}
        <div className="flex-1 px-2 pb-10 2xl:pb-13">
          {/* items-center keeps the rows centered in the extra height of full screen (F11) */}
          <div className="grid grid-cols-[1fr_16fr_1.8fr] 2xl:grid-cols-[1fr_10fr_1.7fr] h-full items-center">
            {(["time", "patientName", "sector"] as const).map((field) => (
              <div
                key={field}
                className="flex flex-col gap-1 md:gap-2 2xl:gap-3 pl-2"
              >
                {[0, 1, 2].map((row) => (
                  <p
                    key={row}
                    className="text-[2.5vh] lg:text-xl 2xl:text-[3.5vh] font-medium leading-tight"
                  >
                    {recentCalls[row]?.[field] ?? " "}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* SCROLLING NOTICES. The list is rendered twice so the loop has no gap. */}
        <div className="absolute bottom-0 left-0 w-full h-10 2xl:h-14 bg-blue-500 overflow-hidden flex items-center">
          <div className="flex whitespace-nowrap animate-marquee text-white font-semibold text-base md:text-lg 2xl:text-3xl">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-12 px-6">
                {NOTICES.map((notice) => (
                  <span key={notice} className="flex items-center gap-3">
                    <span className="text-xl md:text-2xl 2xl:text-5xl leading-none">
                      •
                    </span>
                    {notice}
                    <span className="text-xl md:text-2xl 2xl:text-5xl leading-none">
                      •
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
