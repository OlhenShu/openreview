import { Sandbox } from "@vercel/sandbox";
import { tool } from "ai";
import { z } from "zod";

const SANDBOX_CWD = ".";

const runBashStep = async (
  sandboxId: string,
  command: string
): Promise<{ exitCode: number; stderr: string; stdout: string }> => {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  const fullCommand = `cd "${SANDBOX_CWD}" && ${command}`;
  const result = await sandbox.runCommand("bash", ["-c", fullCommand]);
  const [stdout, stderr] = await Promise.all([
    result.stdout(),
    result.stderr(),
  ]);

  return { exitCode: result.exitCode, stderr, stdout };
};

export const createBashTool = (sandboxId: string) =>
  tool({
    description: [
      "Execute bash commands in the sandbox environment.",
      "",
      `WORKING DIRECTORY: ${SANDBOX_CWD}`,
      "All commands execute from this directory. Use relative paths from here.",
      "",
      "Common operations:",
      "  ls -la              # List files with details",
      "  find . -name '*.ts' # Find files by pattern",
      "  grep -r 'pattern' . # Search file contents",
      "  cat <file>          # View file contents",
    ].join("\n"),
    execute: ({ command }) => runBashStep(sandboxId, command),
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
    }),
  });
