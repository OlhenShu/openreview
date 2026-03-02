import { Sandbox } from "@vercel/sandbox";
import { tool } from "ai";
import { z } from "zod";

const SANDBOX_CWD = ".";

const readFileStep = async (
  sandboxId: string,
  path: string
): Promise<{ content: string }> => {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  const resolvedPath = path.startsWith("/") ? path : `${SANDBOX_CWD}/${path}`;
  const buffer = await sandbox.readFileToBuffer({ path: resolvedPath });

  if (buffer === null) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  return { content: buffer.toString("utf8") };
};

export const createReadFileTool = (sandboxId: string) =>
  tool({
    description: "Read the contents of a file from the sandbox.",
    execute: ({ path }) => readFileStep(sandboxId, path),
    inputSchema: z.object({
      path: z.string().describe("The path to the file to read"),
    }),
  });
