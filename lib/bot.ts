import "server-only";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createRedisState } from "@chat-adapter/state-redis";
import { Chat, emoji } from "chat";
import type { Message, Thread } from "chat";
import { start } from "workflow/api";

import { env } from "@/lib/env";
import type { WorkflowParams } from "@/workflow";

import { getInstallationOctokit } from "./github";

interface ThreadState {
  baseBranch: string;
  prBranch: string;
  prNumber: number;
  repoFullName: string;
}

const state = env.REDIS_URL
  ? createRedisState({ url: env.REDIS_URL })
  : createMemoryState();

export const bot = new Chat({
  adapters: {
    github: createGitHubAdapter({
      appId: env.GITHUB_APP_ID,
      installationId: env.GITHUB_APP_INSTALLATION_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll("\\n", "\n"),
      userName: "openreview[bot]",
      webhookSecret: env.GITHUB_APP_WEBHOOK_SECRET,
    }),
  },
  state,
  userName: "openreview",
});

const handleMention = async (thread: Thread, message: Message) => {
  const raw = message.raw as GitHubRawMessage;

  const repoFullName = raw.repository.full_name;
  const { prNumber } = raw;
  const comment = message.text.trim() || "Review this pull request";

  const octokit = await getInstallationOctokit();
  const [owner, repo] = repoFullName.split("/");

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    pull_number: prNumber,
    repo,
  });

  await thread.setState({
    baseBranch: pr.base.ref,
    prBranch: pr.head.ref,
    prNumber,
    repoFullName,
  } satisfies ThreadState);

  const { botWorkflow } = await import("@/workflow");

  await start(botWorkflow, [
    {
      baseBranch: pr.base.ref,
      comment,
      prBranch: pr.head.ref,
      prNumber,
      repoFullName,
      threadId: thread.id,
    } satisfies WorkflowParams,
  ]);
};

bot.onNewMention(handleMention);

bot.onSubscribedMessage(async (thread, message) => {
  if (!message.isMention) {
    return;
  }

  await handleMention(thread, message);
});

// Thumbs up on a bot message → treat its text as an approved instruction
bot.onReaction([emoji.thumbs_up, emoji.heart], async (event) => {
  if (!event.added || !event.message?.author.isMe) {
    return;
  }

  const threadState = (await event.thread.state) as ThreadState | null;

  if (!threadState) {
    return;
  }

  const comment = event.message.text.trim();

  const { botWorkflow } = await import("@/workflow");

  await start(botWorkflow, [
    {
      ...threadState,
      comment,
      threadId: event.thread.id,
    } satisfies WorkflowParams,
  ]);
});

// Thumbs down on a bot message → acknowledge and skip
bot.onReaction([emoji.thumbs_down, emoji.confused], async (event) => {
  if (!event.added || !event.message?.author.isMe) {
    return;
  }

  await event.thread.post(
    `${emoji.eyes} Got it, skipping that. Mention me with feedback if you'd like a different approach.`
  );
});
