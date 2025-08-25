// Quick test of intent recognition for customer selection
const testInputs = [
  "Houston Energy Trading",
  "great. lets pick Houston Energy Trading",
  "I choose Houston Energy Trading", 
  "use Houston Energy Trading"
];

for (const input of testInputs) {
  console.log(`Testing: "${input}"`);
  
  // Test the regex patterns
  const pickPattern = /(?:pick|choose|select|use|go with)\s+([a-zA-Z][a-zA-Z\s&.,\-']*(?:llc|inc|corp|ltd|co|company|solutions|energy|trading|group))/i;
  const directPattern = /([a-zA-Z][a-zA-Z\s&.,\-']*(?:llc|inc|corp|ltd|co|company|solutions|energy|trading|group))/i;
  
  const pickMatch = pickPattern.exec(input);
  const directMatch = directPattern.exec(input);
  
  if (pickMatch) {
    console.log(`  ✅ Pick pattern matched: "${pickMatch[1]}"`);
  } else if (directMatch) {
    console.log(`  ✅ Direct pattern matched: "${directMatch[1]}"`);
  } else {
    console.log(`  ❌ No pattern matched`);
  }
  console.log('');
}