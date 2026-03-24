// Test script for AI generation
const testEntryId = '58131c9c-1520-4538-8a30-b46d938695fb';

console.log('Testing AI generation for entry:', testEntryId);
console.log('Expected data:');
console.log('- Stage 1: "God vind, holdt rett på. Alle treff i figur. Føltes bra!"');
console.log('- Stage 2: "Sterk motvind fra høyre. Måtte holde 2 knepp venstre. Ett treff utenfor." + image');
console.log('- Stage 3: Only image, no notes');
console.log('- Stage 4: No documentation');
console.log('');
console.log('This will call the edge function with real Claude API.');
console.log('Check the database after to verify:');
console.log('  SELECT model_used, tokens_used, data_quality, version');
console.log('  FROM competition_ai_summaries');
console.log('  WHERE entry_id = \'' + testEntryId + '\' AND is_active = true;');
