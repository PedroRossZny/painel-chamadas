export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* AZUL BASE */}
        <div
          className="absolute inset-0 bg-blue-700"
          style={{
            clipPath: "polygon(100% 100%, 100% 0%, 35% 0%, 50% 100%)",
          }}
        />

        {/* AZUL MÉDIO */}
        <div
          className="absolute inset-0 bg-blue-800"
          style={{
            clipPath: "polygon(50.1% 100%, 35.1% 0%, 15% 0%, 30% 100%)",
          }}
        />

        {/* AZUL ESCURO */}
        <div
          className="absolute inset-0 bg-blue-900"
          style={{
            clipPath: "polygon(30.1% 100%, 15.1% 0%, 0% 0%, 0% 100%)",
          }}
        />
      </div>

      {/* ================= CONTEÚDO DA PÁGINA ================= */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="bg-zinc-900/80 backdrop-blur p-8 rounded-xl">
          <h1 className="text-3xl font-bold">Página com background especial</h1>
          <p className="mt-2 text-zinc-300">
            Esse fundo só existe nesta página
          </p>
        </div>
      </div>

    </div>
  );
}
