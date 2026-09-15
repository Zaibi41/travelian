import { readFileSync } from "node:fs";

const text = readFileSync("src/data/airports.ts", "utf8");
const codes = [
  "ISB", "MCT", "LHE", "KHI", "SKT", "PEW", "MUX", "DXB", "JED", "MED",
  "RUH", "IST", "DOH", "AUH", "LHR", "MAN", "JFK", "YYZ", "KUL", "BKK",
  "SIN", "LYP", "UET", "SHJ", "BAH", "KWI", "CAI", "AMM",
];

for (const code of codes) {
  const re = new RegExp(
    `"code": "${code}"\\s*,\\s*"name": "([^"]*)"\\s*,\\s*"city": "([^"]*)"\\s*,\\s*"country": "([^"]*)"`,
  );
  const m = text.match(re);
  if (!m) {
    console.log(`${code}: NOT FOUND`);
    continue;
  }
  console.log(`${code} | ${m[2]} | ${m[1]} | ${m[3]}`);
}
