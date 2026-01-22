import Image from "next/image";

export default function Home() {
  return (
    <div className="flex w-full">
      <aside className="w-64 bg-zinc-900 p-4">
        <h1 className="text-xl font-bold">Painel de Chamadas</h1>
      </aside>

      <main className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Dashboard
        </h2>

        <div className="bg-zinc-800 p-4 rounded">
          Conteúdo do painel
        </div>
      </main>
    </div>
  )
}
