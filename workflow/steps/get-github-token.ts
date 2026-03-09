import { parseError } from "@/lib/error";
import { getInstallationOctokit } from "@/lib/github";
import type { WorkflowParams } from "@/workflow";

export const getGitHubToken = async (
  params: Pick<WorkflowParams, "installationId">
): Promise<string> => {
  "use step";

  const { installationId } = params;

  const octokit = await getInstallationOctokit(installationId).catch(
    (error: unknown) => {
      throw new Error(
        `[getGitHubToken] Failed to get GitHub client: ${parseError(error)}`
      );
    }
  );

  const { token } = await octokit.auth({ type: "installation" });
  return token as string;
};
