import { useState } from "react";
import { BUFFS, type BuffDefinition, type BuffType } from "@/lib/ro-buffs";

interface BuffSelectorModalProps {
    activeBuffIds: string[];
    onToggleBuff: (buffId: string) => void;
    onClose: () => void;
}

const TABS: { id: BuffType; label: string }[] = [
    { id: "consumable", label: "Consumíveis" },
    { id: "skill", label: "Habilidades" },
];

export default function BuffSelectorModal({ activeBuffIds, onToggleBuff, onClose }: BuffSelectorModalProps) {
    const [activeTab, setActiveTab] = useState<BuffType>("consumable");

    const buffsForTab = BUFFS.filter((b) => b.type === activeTab);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="ro-panel w-[400px] max-h-[80vh] flex flex-col p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-ro-gold uppercase tracking-wider">Selecionar Buffs</h3>
                    <button onClick={onClose} className="text-ro-muted hover:text-ro-gold transition-colors text-lg flex items-center justify-center w-6 h-6 leading-none">&times;</button>
                </div>

                <div className="flex gap-2 border-b border-ro-border mb-3">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-200 border-b-2 ${activeTab === tab.id
                                ? "border-ro-gold text-ro-gold"
                                : "border-transparent text-ro-muted hover:text-[var(--ro-text)]"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {buffsForTab.map((buff) => {
                        const isActive = activeBuffIds.includes(buff.id);
                        return (
                            <label
                                key={buff.id}
                                className={`flex gap-3 items-center p-2 rounded-lg border cursor-pointer transition-colors ${isActive ? "bg-ro-gold/[0.1] border-ro-gold text-[var(--ro-text)] shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-ro-surface border-ro-border text-ro-muted hover:border-ro-gold/50"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => onToggleBuff(buff.id)}
                                    className="hidden"
                                />

                                {buff.iconUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={buff.iconUrl} alt="" className="w-8 h-8 rounded shrink-0 object-contain shadow-sm border border-black/20" />
                                ) : (
                                    <div className="w-8 h-8 bg-ro-dark border border-ro-border rounded shrink-0" />
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold truncate ${isActive ? "text-ro-gold" : ""}`}>{buff.name}</div>
                                    {buff.description && (
                                        <div className="text-[10px] leading-tight opacity-80 mt-0.5" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                            {buff.description}
                                        </div>
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
