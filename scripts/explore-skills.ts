import fs from 'fs';
import path from 'path';

// Load the DB
const skillsPath = path.resolve(__dirname, '../data/database/skills.json');
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));

console.log("Searching for skill modifiers in descriptions...");

const damageRegex = /Dano(?: físico)?(?: mágico)?:\s*(\d+)%/i;
const damageLevelRegex = /Dano(?: físico)?(?: mágico)?:\s*(\w+)\s*%/i; // sometimes it says "Dano físico: (Nv. da hab. x 100)%"

const interestingSkills = ['HW_MAGICCRASHER', 'SC_FEINTBOMB', 'GN_CARTCANNON', 'WL_HELLINFERNO', 'SO_DIAMONDDUST'];

for (const skill of skills) {
    if (interestingSkills.includes(skill.aegisName)) {
        console.log(`\n=== ${skill.aegisName} ===`);
        console.log(JSON.stringify(skill.description, null, 2));
    }
}
