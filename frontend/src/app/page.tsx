"use client";

import { useState } from "react";
import { useEffect } from "react";

export default function Page() {
  // ===============================
  // STATE – CONFIGURAÇÃO INICIAL
  // ===============================

  const [isConfigured, setIsConfigured] = useState(false);
  const [professionalName, setProfessionalName] = useState("");
  const [area, setArea] = useState<number | "">("");
  const [room, setRoom] = useState("");
  const STORAGE_KEY = "laborwaze_professional_config";
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      setProfessionalName(parsed.professionalName);
      setArea(parsed.area);
      setRoom(parsed.room);
      setIsConfigured(true);
    }
  }, []);
  useEffect(() => {
    async function fetchAreas() {
      try {
        const response = await fetch("http://localhost:3001/sector");

        if (!response.ok) throw new Error();

        const data = await response.json();
        setAreas(data);
      } catch {
        alert("Erro ao carregar áreas.");
      } finally {
        setLoadingAreas(false);
      }
    }

    fetchAreas();
  }, []);

  // ===============================
  // STATE – PAINEL DE CHAMADAS
  // ===============================

  const [patientName, setPatientName] = useState("");

  const [isCalling, setIsCalling] = useState(false);

  // ===============================
  // CONSTANTES
  // ===============================

  type Sector = {
    id: number;
    name: string;
  };

  type Area = {
    areaId: number;
    areaName: string;
    sectors: Sector[];
  };

  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // ===============================
  // HANDLERS
  // ===============================

  function handleConfirmSetup() {
    if (!professionalName || !area || !room) {
      alert("Preencha todos os campos.");
      return;
    }

    const config = {
      professionalName,
      area,
      room,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

    setIsConfigured(true);
  }

  function handleResetSetup() {
    if (!confirm("Deseja mesmo mudar suas especificações?")) return;

    localStorage.removeItem(STORAGE_KEY);

    setIsConfigured(false);
    setProfessionalName("");
    setArea("");
    setRoom("");
  }

  function handlePatientNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPatientName(e.target.value.toUpperCase());
  }

  async function handleCallPatient() {
    if (!patientName) {
      alert("Digite o nome do paciente.");
      return;
    }

    const confirmed = confirm("Certeza que deseja chamar esse paciente?");
    if (!confirmed) return;

    try {
      setIsCalling(true);

      const response = await fetch("http://localhost:3001/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorName: professionalName,
          patientName: patientName,
          sectorId: room,
        }),
      });

      if (!response.ok) throw new Error();

      setPatientName("");
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsCalling(false);
    }
  }
  const selectedArea = areas.find((a) => a.areaId === Number(area));

  const selectedSector = selectedArea?.sectors.find(
    (s) => s.id === Number(room),
  );
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-blue-700"
          style={{ clipPath: "polygon(100% 100%, 100% 0%, 35% 0%, 50% 100%)" }}
        />
        <div
          className="absolute inset-0 bg-blue-800"
          style={{
            clipPath: "polygon(50.1% 100%, 35.1% 0%, 15% 0%, 30% 100%)",
          }}
        />
        <div
          className="absolute inset-0 bg-blue-900"
          style={{ clipPath: "polygon(30.1% 100%, 15.1% 0%, 0% 0%, 0% 100%)" }}
        />
      </div>

      {/* ================= CARD DO PROFISSIONAL ================= */}
      {isConfigured && (
        <div className="absolute top-4 left-4 right-4 md:right-auto z-20">
          <div className="relative bg-white/10 backdrop-blur-md px-5 py-4 pr-12 rounded-lg border-l-4 border-blue-400 shadow-lg w-full md:w-auto md:min-w-75 2xl:min-w-112.5 2xl:px-8 2xl:py-6">
            <button
              onClick={handleResetSetup}
              className="absolute top-2 right-2 bg-black/20 hover:bg-black/30 text-zinc-200 hover:text-white w-6 h-6 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center transition 2xl:text-xl"
            >
              ✕
            </button>

            <p className="text-blue-200 text-xs 2xl:text-lg uppercase tracking-widest font-bold">
              Profissional
            </p>
            <p className="text-white font-semibold truncate 2xl:text-2xl 2xl:mt-1">
              {professionalName}
            </p>
            <p className="text-zinc-300 text-sm 2xl:text-xl">
              {selectedArea?.areaName} — {selectedSector?.name}
            </p>
          </div>
        </div>
      )}

      {/* ================= OVERLAY CONFIGURAÇÃO ================= */}
      {!isConfigured && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md 2xl:max-w-3xl bg-white rounded-lg p-6 md:p-8 2xl:p-14 shadow-xl">
            <h2 className="text-xl md:text-2xl 2xl:text-4xl font-bold mb-6 2xl:mb-10 text-center text-zinc-900">
              Configuração inicial
            </h2>

            <input
              type="text"
              placeholder="NOME COMPLETO"
              value={professionalName}
              onChange={(e) => setProfessionalName(e.target.value)}
              className="w-full mb-4 2xl:mb-8 rounded-md border border-zinc-300 px-4 py-3 2xl:px-6 2xl:py-5 text-zinc-900 2xl:text-2xl placeholder-zinc-500 outline-none focus:ring-2 focus:ring-zinc-400"
            />

            <select
              value={area}
              onChange={(e) => {
                setArea(Number(e.target.value));
                setRoom("");
              }}
              className="w-full mb-4 2xl:mb-8 rounded-md border border-zinc-300 px-4 py-3 2xl:px-6 2xl:py-5 text-zinc-900 2xl:text-2xl bg-white outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">Selecione a área</option>
              {areas.map((a) => (
                <option key={a.areaId} value={a.areaId}>
                  {a.areaName}
                </option>
              ))}
            </select>

            {area && (
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full mb-6 2xl:mb-10 rounded-md border border-zinc-300 px-4 py-3 2xl:px-6 2xl:py-5 text-zinc-900 2xl:text-2xl bg-white outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">Selecione a sala</option>
                {areas
                  .find((a) => a.areaId === Number(area))
                  ?.sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            )}

            <button
              onClick={handleConfirmSetup}
              className="w-full rounded-md bg-blue-500 py-3 2xl:py-6 font-semibold text-white hover:bg-blue-400 2xl:text-2xl"
            >
              CONFIRMAR
            </button>
          </div>
        </div>
      )}

      {/* ================= PAINEL PRINCIPAL ================= */}
      {isConfigured && (
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md 2xl:max-w-4xl bg-zinc-900/90 backdrop-blur p-6 md:p-8 2xl:p-16 rounded-lg shadow-xl">
            <input
              type="text"
              placeholder="DIGITE O NOME DO PACIENTE"
              value={patientName}
              onChange={handlePatientNameChange}
              className="w-full mb-8 2xl:mb-12 rounded-md bg-zinc-800 px-4 py-3 2xl:px-8 2xl:py-6 text-white 2xl:text-3xl placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleCallPatient}
              disabled={isCalling}
              className="w-full mb-4 rounded-md bg-blue-500 py-5 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
            >
              {" "}
              {isCalling ? "Chamando..." : "CHAMAR PACIENTE"}{" "}
            </button>

            <button className="w-full rounded-md border border-zinc-700 py-3 2xl:py-6 text-zinc-300 2xl:text-2xl hover:bg-zinc-800">
              📄 GERAR RELATÓRIO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
