/* Сканер секретов: AWS/JWT/Slack/пароли/DB-строки */
const PATTERNS = [
  ["AWS Access Key", /AKIA[0-9A-Z]{16}/],
  ["Private Key", /-----BEGIN (RSA |EC )?PRIVATE KEY-----/],
  ["JWT Token", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]*/],
  ["Slack Token", /xox[baprs]-[0-9a-zA-Z]{10,48}/],
  ["Hardcoded Password", /password['":\s=]+['"][^'"]{6,}['"]/i],
  ["DB Connection", /\b(mongodb|postgres|mysql):\/\/[^\s'"]+/i],
];
export function scanSecrets(files) {
  const findings = [];
  for (const [path, content] of files) {
    for (const [name, re] of PATTERNS)
      if (re.test(content)) findings.push({ type: name, file: path, severity: "critical" });
  }
  return findings;
}
