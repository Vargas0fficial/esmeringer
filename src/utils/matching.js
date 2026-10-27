import { ANYWHERE } from '../config/constants';

const normalize = (text) => text.trim().toLowerCase();

export function sharedTopics(mine = [], theirs = []) {
  const other = new Set(theirs.map(normalize));
  return mine.filter((topic) => other.has(normalize(topic)));
}

function score(me, candidate) {
  let points = sharedTopics(me.topics, candidate.topics).length * 2;
  if (me.location !== ANYWHERE && candidate.location === me.location) points += 3;
  return points + Math.random() * 0.5; // random tie-break
}

/** Best waiting person for `me`. Anyone is acceptable; shared topics and location only rank them. */
export function pickBest(me, candidates) {
  const ranked = candidates.map((candidate) => ({
    candidate,
    points: score(me, candidate),
  }));
  return ranked.reduce((best, next) => (next.points > best.points ? next : best))
    .candidate;
}
