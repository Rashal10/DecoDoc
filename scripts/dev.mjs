import { spawn } from "node:child_process";

const commands = [
  ["server", ["run", "dev", "-w", "server"]],
  ["client", ["run", "dev", "-w", "client"]]
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32"
  });
  child.on("exit", (code) => {
    if (code) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }
  });
  return child;
});

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
