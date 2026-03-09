export interface PushAccessResult {
  canPush: boolean;
  reason?: string;
}

export const checkPushAccess = async (
  _repoFullName: string,
  _branch: string
): Promise<PushAccessResult> => {
  "use step";

  return {
    canPush: false,
    reason: "Disabled: OpenReview is configured for comment-only mode",
  };
};
