// There's no auth in this app — these localStorage keys are how a browser
// recognizes "this is my submission" / "I created this trip" / "I have a
// pending join request", scoped per session id.

export function submissionStorageKey(sessionId: string) {
  return `trip-planner:submission:${sessionId}`;
}

export function adminStorageKey(sessionId: string) {
  return `trip-planner:admin:${sessionId}`;
}

export function joinRequestStorageKey(sessionId: string) {
  return `trip-planner:join-request:${sessionId}`;
}
