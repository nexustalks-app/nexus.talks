/**
 * Nexus Guide rollout gate.
 * Checks GUIDE_ROLLOUT and GUIDE_ALLOWLIST only — no DB calls.
 * With GUIDE_ROLLOUT=off (or unset) this always returns false.
 */
export function isGuideEnabledForUser(userId: string): boolean {
  const rollout = process.env.GUIDE_ROLLOUT ?? 'off';

  if (rollout === 'off') return false;

  if (rollout === 'all') return true;

  if (rollout === 'allowlist') {
    const raw = process.env.GUIDE_ALLOWLIST ?? '';
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return ids.includes(userId);
  }

  // Unknown value — treat as off for safety.
  return false;
}
