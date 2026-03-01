import type { EquipBonus, BaseStats } from "./ro-stats";

export type BuffType = "consumable" | "skill";

export interface BuffDefinition {
    id: string;
    name: string;
    type: BuffType;
    iconUrl?: string; // e.g. divine-pride icon URL or local asset
    description?: string;
    // Apply raw totalBonus modifications directly
    applyBonus?: (bonus: EquipBonus, baseStats: BaseStats, baseLevel: number) => void;
    // For special damage formulas that don't just add flat stats (like EDP multiplying final weapon ATK)
    specialTag?: string;
}

// ─── Constants for UI ease ───
export const EDP_TAG = "EDP";
export const NO_LIMITS_TAG = "NO_LIMITS";
export const DARK_CLAW_TAG = "DARK_CLAW";

// Helper for Divine Pride buff icons or item icons
const itemIcon = (id: number) => `https://static.divine-pride.net/images/items/item/${id}.png`;
const skillIcon = (id: number) => `https://static.divine-pride.net/images/skill/${id}.png`;

export const BUFFS: BuffDefinition[] = [
    // ─── Consumables ───
    {
        id: "bolinho_divino",
        name: "Bolinho Divino",
        type: "consumable",
        iconUrl: itemIcon(12414),
        description: "Todas as propriedades +10, ATQ e ATQM +10%. Duração: 30 min.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 10;
            bonus.agi = (bonus.agi || 0) + 10;
            bonus.vit = (bonus.vit || 0) + 10;
            bonus.int = (bonus.int || 0) + 10;
            bonus.dex = (bonus.dex || 0) + 10;
            bonus.luk = (bonus.luk || 0) + 10;
            bonus.atkRate = (bonus.atkRate || 0) + 10;
            bonus.matkRate = (bonus.matkRate || 0) + 10;
        },
    },
    {
        id: "palito_limao",
        name: "Palito de Limão",
        type: "consumable",
        iconUrl: itemIcon(12028),
        description: "Precisão +30, Esquiva +30.",
        applyBonus: (bonus) => {
            bonus.hit = (bonus.hit || 0) + 30;
            bonus.flee = (bonus.flee || 0) + 30;
        },
    },
    {
        id: "elixir_rubro",
        name: "Elixir Rubro",
        type: "consumable",
        iconUrl: itemIcon(12796),
        description: "ATQ/ATQM +30, HP/SP Máximo +10%. Duração: 10 min.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 30;
            bonus.matk = (bonus.matk || 0) + 30;
            bonus.maxHpRate = (bonus.maxHpRate || 0) + 10;
            bonus.maxSpRate = (bonus.maxSpRate || 0) + 10;
        },
    },
    {
        id: "pocao_ilimitada",
        name: "Poção Ilimitada",
        type: "consumable",
        iconUrl: itemIcon(14766),
        description: "Dano Crítico, Mágico e a Distância +5%, ATQ/ATQM +30.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 30;
            bonus.matk = (bonus.matk || 0) + 30;
            bonus.critAtkRate = (bonus.critAtkRate || 0) + 5;
            bonus.longAtkRate = (bonus.longAtkRate || 0) + 5;
            // Variable and Fixed Cast rate -5% logic could be here, but we focus on damage
        },
    },
    {
        id: "pocao_infinita",
        name: "Poção Infinita",
        type: "consumable",
        iconUrl: itemIcon(23475), // Also 100008, using 23475 as base
        description: "HP/SP Máx. +5%, Dano Físico/Mágico +5%, Crítico e Longo +5%.",
        applyBonus: (bonus) => {
            bonus.maxHpRate = (bonus.maxHpRate || 0) + 5;
            bonus.maxSpRate = (bonus.maxSpRate || 0) + 5;
            bonus.atkRate = (bonus.atkRate || 0) + 5;
            bonus.matkRate = (bonus.matkRate || 0) + 5;
            bonus.critAtkRate = (bonus.critAtkRate || 0) + 5;
            bonus.longAtkRate = (bonus.longAtkRate || 0) + 5;
        },
    },
    {
        id: "bencao_tyr",
        name: "Bênção de Tyr",
        type: "consumable",
        iconUrl: itemIcon(14601),
        description: "ATQ e ATQM +20, Precisão e Esquiva +30 por 5 minutos.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 20;
            bonus.matk = (bonus.matk || 0) + 20;
            bonus.hit = (bonus.hit || 0) + 30;
            bonus.flee = (bonus.flee || 0) + 30;
        },
    },
    {
        id: "bebida_realgar",
        name: "Bebida de Realgar",
        type: "consumable",
        iconUrl: itemIcon(682),
        description: "ATQ +30, ATQM +30 por 10 minutos.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 30;
            bonus.matk = (bonus.matk || 0) + 30;
        },
    },
    {
        id: "pocao_furia",
        name: "Poção da Fúria Selvagem",
        type: "consumable",
        iconUrl: itemIcon(657),
        description: "Aumenta ligeiramente a Velocidade de Ataque.",
        applyBonus: (bonus) => {
            bonus.aspdRate = (bonus.aspdRate || 0) + 20;
        },
    },
    {
        id: "pocao_despertar",
        name: "Poção do Despertar",
        type: "consumable",
        iconUrl: itemIcon(656),
        description: "Aumenta um pouco a Velocidade de Ataque.",
        applyBonus: (bonus) => {
            bonus.aspdRate = (bonus.aspdRate || 0) + 15;
        },
    },
    {
        id: "doce_guyak",
        name: "Doce de Guyak",
        type: "consumable",
        iconUrl: itemIcon(12709),
        description: "Aumenta a Velocidade de Movimento (não se aplica) e ASPD +5%.",
        applyBonus: (bonus) => {
            bonus.aspdRate = (bonus.aspdRate || 0) + 5;
        },
    },
    {
        id: "acaraje",
        name: "Acarajé",
        type: "consumable",
        iconUrl: itemIcon(12375),
        description: "Velocidade de Ataque +10%, Precisão +15. Duração: 20 min.",
        applyBonus: (bonus) => {
            bonus.aspdRate = (bonus.aspdRate || 0) + 10;
            bonus.hit = (bonus.hit || 0) + 15;
        },
    },
    {
        id: "suco_celular",
        name: "Suco Celular Enriquecido",
        type: "consumable",
        iconUrl: itemIcon(12437),
        description: "Velocidade de Ataque +10%. Duração: 500s.",
        applyBonus: (bonus) => {
            bonus.aspdRate = (bonus.aspdRate || 0) + 10;
        },
    },
    {
        id: "pocao_ouro",
        name: "Poção de Ouro",
        type: "consumable",
        iconUrl: itemIcon(12684),
        description: "Esquiva +20, MaxHP/MaxSP +5%, ASPD +3%. Duração: 15 min.",
        applyBonus: (bonus) => {
            bonus.flee = (bonus.flee || 0) + 20;
            bonus.maxHpRate = (bonus.maxHpRate || 0) + 5;
            bonus.maxSpRate = (bonus.maxSpRate || 0) + 5;
            bonus.aspdRate = (bonus.aspdRate || 0) + 3;
        },
    },
    {
        id: "pocao_grande_hp",
        name: "Poção Grande de HP",
        type: "consumable",
        iconUrl: itemIcon(12434),
        description: "Aumenta o HP Máximo consideravelmente.",
        applyBonus: (bonus) => {
            bonus.maxHpRate = (bonus.maxHpRate || 0) + 20; // Aproximadamente ~20% dependendo do level e vit real
        },
    },
    {
        id: "pocao_grande_sp",
        name: "Poção Grande de SP",
        type: "consumable",
        iconUrl: itemIcon(12435),
        description: "Aumenta o SP Máximo consideravelmente.",
        applyBonus: (bonus) => {
            bonus.maxSpRate = (bonus.maxSpRate || 0) + 20; // Aproximadamente ~20%
        },
    },
    {
        id: "comida_str",
        name: "Churrasco de Selvagem (+20 FOR)",
        type: "consumable",
        iconUrl: itemIcon(12068),
        description: "FOR + 20.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 20;
        },
    },
    {
        id: "comida_agi",
        name: "Escorpiões no Vapor (+20 AGI)",
        type: "consumable",
        iconUrl: itemIcon(12073),
        description: "AGI + 20.",
        applyBonus: (bonus) => {
            bonus.agi = (bonus.agi || 0) + 20;
        },
    },
    {
        id: "comida_vit",
        name: "Cozido de Imortal (+20 VIT)",
        type: "consumable",
        iconUrl: itemIcon(12083),
        description: "VIT + 20.",
        applyBonus: (bonus) => {
            bonus.vit = (bonus.vit || 0) + 20;
        },
    },
    {
        id: "comida_int",
        name: "Coquetel Uivante (+20 INT)",
        type: "consumable",
        iconUrl: itemIcon(12078),
        description: "INT + 20.",
        applyBonus: (bonus) => {
            bonus.int = (bonus.int || 0) + 20;
        },
    },
    {
        id: "comida_dex",
        name: "Tônico de Hwergelmir (+20 DES)",
        type: "consumable",
        iconUrl: itemIcon(12088),
        description: "DES + 20.",
        applyBonus: (bonus) => {
            bonus.dex = (bonus.dex || 0) + 20;
        },
    },
    {
        id: "comida_luk",
        name: "Nove Caudas Assadas (+20 SOR)",
        type: "consumable",
        iconUrl: itemIcon(12093),
        description: "SOR + 20.",
        applyBonus: (bonus) => {
            bonus.luk = (bonus.luk || 0) + 20;
        },
    },
    // ─── Class Skills ───
    {
        id: "edp",
        name: "Encantar com Veneno Mortal",
        type: "skill",
        iconUrl: skillIcon(378),
        description: "Multiplica o ATQ da Arma e Equipamento brutalmente. Drenagem de HP nula nesta calculadora.",
        specialTag: EDP_TAG,
    },
    {
        id: "no_limits",
        name: "Ilimitar (No Limits)",
        type: "skill",
        iconUrl: skillIcon(2238), // RA_UNLIMIT
        description: "Dano Físico a Distância +250%, DEF/MDEF penalizados.",
        applyBonus: (bonus) => {
            bonus.longAtkRate = (bonus.longAtkRate || 0) + 250;
            // We don't bother heavily dropping DEF as target isn't hitting back here, but mechanically it drops Def/Mdef to 1
        },
        specialTag: NO_LIMITS_TAG,
    },
    {
        id: "camouflage",
        name: "Camuflagem (Dano Máx)",
        type: "skill",
        iconUrl: skillIcon(2247),
        description: "Mantida para dano máximo ao ser quebrada: ATQ +300 e Crítico +100.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 300;
            bonus.crit = (bonus.crit || 0) + 100;
        },
    },
    {
        id: "true_sight",
        name: "Visão Real Lv 10",
        type: "skill",
        iconUrl: skillIcon(380),
        description: "Todos atributos +5, Precisão +30, Crítico +10, Dano Base +20%.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 5;
            bonus.agi = (bonus.agi || 0) + 5;
            bonus.vit = (bonus.vit || 0) + 5;
            bonus.int = (bonus.int || 0) + 5;
            bonus.dex = (bonus.dex || 0) + 5;
            bonus.luk = (bonus.luk || 0) + 5;
            bonus.hit = (bonus.hit || 0) + 30;
            bonus.crit = (bonus.crit || 0) + 10;
            bonus.atkRate = (bonus.atkRate || 0) + 20;
        },
    },
    {
        id: "improve_concentration",
        name: "Concentração Lv 10",
        type: "skill",
        iconUrl: skillIcon(45),
        description: "AGI e DES +12% do valor base. (Aproximado para +15 stats nativos p/ calc simples)",
        applyBonus: (bonus) => {
            bonus.agi = (bonus.agi || 0) + 15;
            bonus.dex = (bonus.dex || 0) + 15;
        },
    },
    // ─── Sicário ───
    {
        id: "dark_claw",
        name: "Garra Sombria",
        type: "skill",
        iconUrl: skillIcon(5001),
        description: "Debuff no alvo. O alvo recebe +150% de Dano Físico de curta distância por 5 segundos.",
        specialTag: DARK_CLAW_TAG,
    },
    {
        id: "venom_impress",
        name: "Injeção de Veneno Lv 5",
        type: "skill",
        iconUrl: skillIcon(2021),
        description: "Fração do dano bônus contra o alvo pela propriedade Veneno (+50% Dano de Veneno).",
        applyBonus: (bonus) => {
            bonus.addEle = bonus.addEle || {};
            bonus.addEle["Ele_Poison"] = (bonus.addEle["Ele_Poison"] || 0) + 50;
        },
    },
    // ─── Shura ───
    {
        id: "raising_dragon",
        name: "Dragão Ascendente Lv 10",
        type: "skill",
        iconUrl: skillIcon(2338),
        description: "15 Esferas Espirituais (+45 ATQ) e MaxHP/MaxSP +10%.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 45; // 3 ATK per sphere * 15
            bonus.maxHpRate = (bonus.maxHpRate || 0) + 10;
            bonus.maxSpRate = (bonus.maxSpRate || 0) + 10;
        },
    },
    {
        id: "gentle_touch_energy",
        name: "Chakra da Fúria Lv 5",
        type: "skill",
        iconUrl: skillIcon(402), // Gentle Touch 
        description: "Gera ATQ baseado no seu HP Máximo. (Aproximando flat ATK + 250 p/ calculos genéricos).",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 250;
        },
    },
    // ─── Cavaleiro Rúnico ───
    {
        id: "rune_turisaz",
        name: "Runa Turisaz (Força Gigante)",
        type: "consumable",
        iconUrl: itemIcon(12725),
        description: "FOR +30 e pequeno multiplicador de ATQ bônus aleatório.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 30;
        },
    },
    {
        id: "rune_othila",
        name: "Runa Othila (Aura de Combate)",
        type: "consumable",
        iconUrl: itemIcon(12729),
        description: "Aumenta ATQ baseado nos membros do grupo. Assumindo grupo médio: ATQ +50.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 50;
        },
    },
    {
        id: "rune_lux_anima",
        name: "Runa Lux Anima",
        type: "consumable",
        iconUrl: itemIcon(22539), // Standard Lux Anima ID roughly
        description: "Todos Stats +30, MaxHP/SP +30%, Dano Físico Melee/Longo +30% e Dano Crítico +30%.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 30;
            bonus.agi = (bonus.agi || 0) + 30;
            bonus.vit = (bonus.vit || 0) + 30;
            bonus.int = (bonus.int || 0) + 30;
            bonus.dex = (bonus.dex || 0) + 30;
            bonus.luk = (bonus.luk || 0) + 30;
            bonus.maxHpRate = (bonus.maxHpRate || 0) + 30;
            bonus.maxSpRate = (bonus.maxSpRate || 0) + 30;
            bonus.atkRate = (bonus.atkRate || 0) + 30;
            bonus.longAtkRate = (bonus.longAtkRate || 0) + 30;
            bonus.critAtkRate = (bonus.critAtkRate || 0) + 30;
        },
    },
    // ─── Ferreiro / Mestre-Ferreiro ───
    {
        id: "weapon_perfection",
        name: "Manejo Perfeito",
        type: "skill",
        iconUrl: skillIcon(112),
        description: "Anula a penalidade de tamanho de todas as armas.",
        applyBonus: (bonus) => {
            bonus.noSizeFix = true;
        },
    },
    {
        id: "maximize_power",
        name: "Maximizar o Poder",
        type: "skill",
        iconUrl: skillIcon(114),
        description: "Sempre causa o dano máximo da arma (Variância de Dano = 0).",
        // Handled in damage calculator directly if we track this, or we just rely on MAX dmg display.
    },
    {
        id: "overthrust",
        name: "Força Violenta Lv 5",
        type: "skill",
        iconUrl: skillIcon(113),
        description: "Dano do Ataque Físico com armas +25%.",
        applyBonus: (bonus) => {
            bonus.weaponAtkRate = (bonus.weaponAtkRate || 0) + 25;
        },
    },
    {
        id: "overthrust_max",
        name: "Força Violenta Máxima Lv 5",
        type: "skill",
        iconUrl: skillIcon(486),
        description: "Dano do Ataque Físico com armas +100%. (Substitui Força Violenta básica).",
        applyBonus: (bonus) => {
            bonus.weaponAtkRate = (bonus.weaponAtkRate || 0) + 100;
        },
    },
    {
        id: "cart_boost_ws",
        name: "Impulso no Carrinho (Apenas Mestre-Ferreiro)",
        type: "skill",
        iconUrl: skillIcon(387),
        description: "Aumenta a Velocidade de Movimento e não confere status bruto aqui, mas conta para habilidades.",
    },
    // ─── Cavaleiro / Lorde ───
    {
        id: "aura_blade",
        name: "Lâmina de Aura Lv 5",
        type: "skill",
        iconUrl: skillIcon(355),
        description: "Dano Físico plano adicional baseado no Base Level. (Aproximadamente +100 Dano Físico dependendo do nível, trataremos aqui como BaseAtk +100 para simplificar).",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 100;
        },
    },
    {
        id: "spear_dynamo",
        name: "Concentração Lv 5",
        type: "skill",
        iconUrl: skillIcon(357),
        description: "ATQ de Equipamento e Arma +25%, Precisão +50.",
        applyBonus: (bonus) => {
            bonus.weaponAtkRate = (bonus.weaponAtkRate || 0) + 25;
            bonus.hit = (bonus.hit || 0) + 50;
        },
    },
    {
        id: "twohand_quicken",
        name: "Rapidez com Duas Mãos",
        type: "skill",
        iconUrl: skillIcon(60),
        description: "Velocidade de Ataque +30%.",
        applyBonus: (bonus) => {
            bonus.aspdRate = (bonus.aspdRate || 0) + 30;
        },
    },
    {
        id: "magnum_break",
        name: "Impacto Explosivo (Bônus 10s)",
        type: "skill",
        iconUrl: skillIcon(7),
        description: "Bônus de 20% Dano Físico de propriedade Fogo por 10s após o uso.",
        applyBonus: (bonus) => {
            bonus.addEle = bonus.addEle || {};
            bonus.addEle["Ele_Fire"] = (bonus.addEle["Ele_Fire"] || 0) + 20;
        },
    },
    {
        id: "blessing",
        name: "Bênção Lv 10",
        type: "skill",
        iconUrl: skillIcon(34),
        description: "FOR, INT e DES +10.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 10;
            bonus.int = (bonus.int || 0) + 10;
            bonus.dex = (bonus.dex || 0) + 10;
        },
    },
    {
        id: "agi_up",
        name: "Aumentar Agilidade Lv 10",
        type: "skill",
        iconUrl: skillIcon(29),
        description: "AGI +12.",
        applyBonus: (bonus) => {
            bonus.agi = (bonus.agi || 0) + 12;
        },
    },
    {
        id: "impositio",
        name: "Impositio Manus Lv 5 (Pranchas)",
        type: "skill",
        iconUrl: skillIcon(66),
        description: "ATQ de Equipamento +25 (ou maior via Renewal). Vamos assumir o clássico +25.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 25;
        },
    },
    {
        id: "gloria",
        name: "Glória",
        type: "skill",
        iconUrl: skillIcon(70),
        description: "SOR +30.",
        applyBonus: (bonus) => {
            bonus.luk = (bonus.luk || 0) + 30;
        },
    },
    {
        id: "clementia",
        name: "Clementia / Cantocandidus (Bônus extra AB)",
        type: "skill",
        iconUrl: skillIcon(2042),
        description: "Adiciona +5 em todos os atributos baseados no Job Lv do Arcebispo.",
        applyBonus: (bonus) => {
            bonus.str = (bonus.str || 0) + 5;
            bonus.agi = (bonus.agi || 0) + 5;
            bonus.int = (bonus.int || 0) + 5;
            bonus.dex = (bonus.dex || 0) + 5;
        },
    },
    {
        id: "odin_power",
        name: "Poder de Odin Lv 2",
        type: "skill",
        iconUrl: skillIcon(2047),
        description: "ATQ e ATQM +100.",
        applyBonus: (bonus) => {
            bonus.atk = (bonus.atk || 0) + 100;
            bonus.matk = (bonus.matk || 0) + 100;
        },
    },

];

export function getBuff(id: string): BuffDefinition | undefined {
    return BUFFS.find(b => b.id === id);
}

// Applies all active buffs to the accumulated bonus dictionary IN PLACE.
// Should be called inside calculateDerivedStats after all item/card/enchant scripts have been parsed.
export function applyActiveBuffs(activeBuffIds: string[], totalBonus: EquipBonus, baseStats: BaseStats, baseLevel: number) {
    for (const id of activeBuffIds) {
        const buff = getBuff(id);
        if (buff && buff.applyBonus) {
            buff.applyBonus(totalBonus, baseStats, baseLevel);
        }
    }
}
