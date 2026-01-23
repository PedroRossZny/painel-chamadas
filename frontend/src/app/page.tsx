"use client";

import { useState } from "react";

export default function Page() {
  // ===============================
  // STATE – CONFIGURAÇÃO INICIAL
  // ===============================

  const [isConfigured, setIsConfigured] = useState(false);
  const [professionalName, setProfessionalName] = useState("");
  const [area, setArea] = useState("");
  const [room, setRoom] = useState("");

  // ===============================
  // STATE – PAINEL DE CHAMADAS
  // ===============================

  const [patientName, setPatientName] = useState("");

  // ===============================
  // CONSTANTES
  // ===============================

  const areas: Record<string, string[]> = {
    Consultório: ["Consultório 1", "Consultório 2", "Consultório 3", "Consultório 4"],
    Triagem: ["Triagem 1", "Triagem 2", "Triagem 3", "Triagem 4"],
    Emergência: ["Emergência 1", "Emergência 2", "Emergência 3", "Emergência 4"],
  };

  // ===============================
  // HANDLERS
  // ===============================

  function handleConfirmSetup() {
    if (!professionalName || !area || !room) {
      alert("Preencha todos os campos.");
      return;
    }
    setIsConfigured(true);
  }

  function handleResetSetup() {
    if (!confirm("Deseja mesmo mudar suas especificações?")) return;
    setIsConfigured(false);
    setProfessionalName("");
    setArea("");
    setRoom("");
  }

  function handlePatientNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPatientName(e.target.value.toUpperCase());
  }

  function handleCallPatient() {
    confirm("Certeza que deseja chamar esse paciente?");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-blue-700" style={{ clipPath: "polygon(100% 100%, 100% 0%, 35% 0%, 50% 100%)" }} />
        <div className="absolute inset-0 bg-blue-800" style={{ clipPath: "polygon(50.1% 100%, 35.1% 0%, 15% 0%, 30% 100%)" }} />
        <div className="absolute inset-0 bg-blue-900" style={{ clipPath: "polygon(30.1% 100%, 15.1% 0%, 0% 0%, 0% 100%)" }} />
      </div>

      {/* ================= CARD DO PROFISSIONAL ================= */}
      {isConfigured && (
        <div className="absolute top-4 left-4 right-4 md:right-auto z-20">
          <div className="relative bg-white/10 backdrop-blur-md px-5 py-4 pr-12 rounded-lg border-l-4 border-blue-400 shadow-lg w-full md:w-auto md:min-w-75 2xl:min-w-112.5 2xl:px-8 2xl:py-6">
            <button onClick={handleResetSetup} className="absolute top-2 right-2 bg-black/20 hover:bg-black/30 text-zinc-200 hover:text-white w-6 h-6 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center transition 2xl:text-xl">
              ✕
            </button>

            <p className="text-blue-200 text-xs 2xl:text-lg uppercase tracking-widest font-bold">Profissional</p>
            <p className="text-white font-semibold truncate 2xl:text-2xl 2xl:mt-1">{professionalName}</p>
            <p className="text-zinc-300 text-sm 2xl:text-xl">{area} — {room}</p>
          </div>
        </div>
      )}

      {/* ================= OVERLAY CONFIGURAÇÃO ================= */}
      {!isConfigured && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md 2xl:max-w-3xl bg-white rounded-lg p-6 md:p-8 2xl:p-14 shadow-xl">
            <h2 className="text-xl md:text-2xl 2xl:text-4xl font-bold mb-6 2xl:mb-10 text-center text-zinc-900">Configuração inicial</h2>

            <input type="text" placeholder="NOME COMPLETO" value={professionalName} onChange={(e) => setProfessionalName(e.target.value)} className="w-full mb-4 2xl:mb-8 rounded-md border border-zinc-300 px-4 py-3 2xl:px-6 2xl:py-5 text-zinc-900 2xl:text-2xl placeholder-zinc-500 outline-none focus:ring-2 focus:ring-zinc-400" />

            <select value={area} onChange={(e) => { setArea(e.target.value); setRoom(""); }} className="w-full mb-4 2xl:mb-8 rounded-md border border-zinc-300 px-4 py-3 2xl:px-6 2xl:py-5 text-zinc-900 2xl:text-2xl bg-white outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Selecione a área</option>
              {Object.keys(areas).map((a) => (<option key={a}>{a}</option>))}
            </select>

            {area && (
              <select value={room} onChange={(e) => setRoom(e.target.value)} className="w-full mb-6 2xl:mb-10 rounded-md border border-zinc-300 px-4 py-3 2xl:px-6 2xl:py-5 text-zinc-900 2xl:text-2xl bg-white outline-none focus:ring-2 focus:ring-zinc-400">
                <option value="">Selecione a sala</option>
                {areas[area].map((r) => (<option key={r}>{r}</option>))}
              </select>
            )}

            <button onClick={handleConfirmSetup} className="w-full rounded-md bg-blue-500 py-3 2xl:py-6 font-semibold text-white hover:bg-blue-400 2xl:text-2xl">
              CONFIRMAR
            </button>
          </div>
        </div>
      )}

      {/* ================= PAINEL PRINCIPAL ================= */}
      {isConfigured && (
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md 2xl:max-w-4xl bg-zinc-900/90 backdrop-blur p-6 md:p-8 2xl:p-16 rounded-lg shadow-xl">
            <input type="text" placeholder="DIGITE O NOME DO PACIENTE" value={patientName} onChange={handlePatientNameChange} className="w-full mb-8 2xl:mb-12 rounded-md bg-zinc-800 px-4 py-3 2xl:px-8 2xl:py-6 text-white 2xl:text-3xl placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500" />

            <button onClick={handleCallPatient} className="w-full mb-4 2xl:mb-8 rounded-md bg-blue-500 py-5 2xl:py-8 font-semibold text-white 2xl:text-3xl hover:bg-blue-400">
              CHAMAR PACIENTE
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
