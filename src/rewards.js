// REWARDS: intentionally disabled. No payments, wallets or tokens are handled here.
// Plan for server-verified rewards (to implement later):
//  1. onRunStart(): POST /api/runs -> server returns a signed runId + seed.
//  2. During play, record the input log (game.js uses a fixed 1/60s step, so runs are replayable).
//  3. submitRunForVerification(): send {runId, inputLog, claimedScore}. The SERVER replays the run,
//     recomputes score/time, checks anti-cheat limits, and only then marks a reward as earned.
//  4. Payouts/claims happen server-side (wallet linking, rate limits, KYC if needed). The browser
//     never decides or sends rewards. Client score is for display only.
CC.Rewards = {
  enabled: false,
  onRunStart() { /* TODO(server): request a run token here */ },
  async submitRunForVerification(result, entry) {
    // TODO(server): upload input log + result, return {verified, rewardId?}
    return { verified: false, reason: 'rewards-disabled' };
  }
};
