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
  const STORAGE_KEY = "laborwaze_professional_state";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      setProfessionalName(parsed.professionalName);
      setArea(parsed.area);
      setRoom(parsed.room);

      // Verifica se a chamada já expirou no momento do reload da página
      let restoredCall = parsed.activeCall ?? null;
      if (restoredCall && restoredCall.timestamp) {
        const timePassed = Date.now() - restoredCall.timestamp;
        if (timePassed >= 5 * 60 * 1000) { // 5 minutos
          restoredCall = null;
          parsed.activeCall = null;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }

      setActiveCall(restoredCall); // <-- USANDO A CHAMADA RESTAURADA (OU NULA SE EXPIROU)
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
  const [cooldown, setCooldown] = useState(false); // Estado para o delay

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  function handleGenerateReport() {
    if (!selectedDate) {
      alert("Selecione uma data.");
      return;
    }

    window.open(
      `http://localhost:3001/call/report?date=${selectedDate}`,
      "_blank",
    );

    setShowModal(false);
  }
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
  
  // <-- Adicionado 'timestamp' ao tipo do activeCall
  const [activeCall, setActiveCall] = useState<null | {
    callId: number;
    attempt: number;
    timestamp: number; 
  }>(null);

  // Timer que monitora os 5 minutos com o site aberto
  useEffect(() => {
    if (!activeCall || !activeCall.timestamp) return;

    const timePassed = Date.now() - activeCall.timestamp;
    const timeRemaining = 5 * 60 * 1000 - timePassed; // 5 minutos em milissegundos

    if (timeRemaining <= 0) {
      clearActiveCall();
    } else {
      const timer = setTimeout(() => {
        clearActiveCall();
      }, timeRemaining);

      return () => clearTimeout(timer);
    }

    function clearActiveCall() {
      setActiveCall(null);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.activeCall = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  }, [activeCall]);

  // ===============================
  // HANDLERS
  // ===============================

  function handleConfirmSetup() {
    if (!professionalName || !area || !room) {
      alert("Preencha todos os campos.");
      return;
    }

    const state = {
      professionalName,
      area,
      room,
      activeCall: null,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    setIsConfigured(true);
  }
  
  function handleResetSetup() {
    if (!confirm("Deseja mesmo mudar suas especificações?")) return;

    localStorage.removeItem(STORAGE_KEY);

    setIsConfigured(false);
    setProfessionalName("");
    setArea("");
    setRoom("");
    setActiveCall(null);
  }
  
  async function handleRetryCall() {
    if (!activeCall) return;

    // Confirmação de rechamada
    const confirmed = confirm("Deseja chamar este paciente novamente?");
    if (!confirmed) return;

    try {
      setIsCalling(true);

      const response = await fetch("http://localhost:3001/call/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: activeCall.callId,
        }),
      });

      const data = await response.json();
      console.log(data);
      if (!response.ok) {
        alert(data.message || "Não foi possível chamar novamente.");
        return;
      }

      const updatedCall = {
        callId: data.callId,
        attempt: data.nextAttempt,
        timestamp: Date.now(), // <-- Reseta o tempo da tentativa
      };

      setActiveCall(updatedCall);
      if (updatedCall.attempt >= 3) {
        setTimeout(() => {
          setActiveCall(null);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              professionalName,
              area,
              room,
              activeCall: null,
            }),
          );
        }, 1000);
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          professionalName,
          area,
          room,
          activeCall: updatedCall,
        }),
      );
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsCalling(false);
      // <-- Aplica o delay de 3 segundos
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000); 
    }
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
          sectorId: Number(room),
        }),
      });

      const data = await response.json();
      console.log(data);

      if (!response.ok) throw new Error();

      const newActiveCall = {
        callId: data.id,
        // Garante que a primeira tentativa seja 1 e não 0
        attempt: data.call_attempts === 0 ? 1 : (data.call_attempts || 1), 
        timestamp: Date.now(), // <-- Salva a hora exata da primeira chamada
      };

      setActiveCall(newActiveCall);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          professionalName,
          area,
          room,
          activeCall: newActiveCall,
        }),
      );

      setPatientName("");
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsCalling(false);
      // Aplica o delay de 3 segundos
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
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
              disabled={isCalling || cooldown} // Bloqueia durante o delay
              className="w-full mb-4 rounded-md bg-blue-500 py-5 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
            >
              {" "}
              {isCalling ? "Chamando..." : "CHAMAR PACIENTE"}{" "}
            </button>
            {activeCall && activeCall.attempt < 3 && (
              <button
                onClick={handleRetryCall}
                disabled={isCalling || cooldown} // Bloqueia durante o delay
                className="w-full mb-4 rounded-md bg-yellow-500 py-4 font-semibold text-white hover:bg-yellow-400 disabled:opacity-50"
              >
                CHAMAR NOVAMENTE ({activeCall.attempt}/3)
              </button>
            )}

            <button
              onClick={() => setShowModal(true)}
              className="w-full rounded-md border border-zinc-700 py-3 2xl:py-6 text-zinc-300 2xl:text-2xl hover:bg-zinc-800 transition"
            >
              📄 GERAR RELATÓRIO
            </button>
          </div>
        </div>
      )}
      {showModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-zinc-900">
              Gerar Relatório
            </h2>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full mb-4 rounded-md border border-zinc-300 px-4 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={handleGenerateReport}
                className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-400"
              >
                Gerar
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-zinc-300 text-zinc-800 py-2 rounded-md hover:bg-zinc-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}