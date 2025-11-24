const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const languages = {};

// Load language files
function loadLanguages() {
    const langDir = path.join(__dirname, '../../lang');
    const files = fs.readdirSync(langDir);

    for (const file of files) {
        if (file.endsWith('.json')) {
            const lang = file.replace('.json', '');
            languages[lang] = require(path.join(langDir, file));
        }
    }
}

// Get translation
function t(key, lang = null, replacements = {}) {
    const currentLang = lang || db.getLanguage() || 'ar';
    const langData = languages[currentLang] || languages['ar'];

    // Navigate through nested keys
    const keys = key.split('.');
    let value = langData;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key; // Return the key if translation not found
        }
    }

    // Replace placeholders
    if (typeof value === 'string') {
        for (const [placeholder, replacement] of Object.entries(replacements)) {
            value = value.replace(new RegExp(`{${placeholder}}`, 'g'), replacement);
        }
    }

    return value;
}

// Get language data
function getLanguageData(lang = null) {
    const currentLang = lang || db.getLanguage() || 'ar';
    return languages[currentLang] || languages['ar'];
}

// Initialize languages on load
loadLanguages();

module.exports = {
    t,
    getLanguageData,
    loadLanguages,
    languages
};
