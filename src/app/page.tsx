import Link from "next/link";

const CLASSES = [
  { id: "archbishop", name: "Archbishop", icon: "⛪" },
  { id: "ranger", name: "Ranger", icon: "🏹" },
  { id: "warlock", name: "Warlock", icon: "🔮" },
  { id: "royal-guard", name: "Royal Guard", icon: "🛡️" },
  { id: "sorcerer", name: "Sorcerer", icon: "✨" },
  { id: "mechanic", name: "Mechanic", icon: "⚙️" },
  { id: "guillotine-cross", name: "Guillotine Cross", icon: "🗡️" },
  { id: "shadow-chaser", name: "Shadow Chaser", icon: "🎭" },
  { id: "genetic", name: "Genetic", icon: "🧪" },
  { id: "minstrel", name: "Minstrel", icon: "🎵" },
  { id: "wanderer", name: "Wanderer", icon: "🎶" },
  { id: "rune-knight", name: "Rune Knight", icon: "⚔️" },
];

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-ro-gold mb-3">
          RO LATAM Build Consultant
        </h1>
        <p className="text-slate-400 text-lg">
          Builds otimizadas para o servidor Ragnarok Online LATAM
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CLASSES.map((cls) => (
          <Link
            key={cls.id}
            href={`/class/${cls.id}`}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-ro-gold rounded-lg p-4 text-center transition-all"
          >
            <div className="text-3xl mb-2">{cls.icon}</div>
            <div className="font-semibold text-sm">{cls.name}</div>
          </Link>
        ))}
      </div>

      <div className="mt-12 grid md:grid-cols-2 gap-6">
        <Link
          href="/meta"
          className="bg-slate-800 border border-slate-600 hover:border-ro-blue rounded-lg p-6 transition-all"
        >
          <h2 className="text-xl font-bold text-ro-blue mb-2">Meta Atual</h2>
          <p className="text-slate-400 text-sm">
            Tier list e rankings das classes no patch atual
          </p>
        </Link>
        <Link
          href="/items"
          className="bg-slate-800 border border-slate-600 hover:border-ro-gold rounded-lg p-6 transition-all"
        >
          <h2 className="text-xl font-bold text-ro-gold mb-2">
            Database de Itens
          </h2>
          <p className="text-slate-400 text-sm">
            Pesquise equipamentos, cards e encantamentos do LATAM
          </p>
        </Link>
      </div>
    </main>
  );
}
