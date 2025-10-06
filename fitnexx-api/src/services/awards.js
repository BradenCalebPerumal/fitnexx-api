const RewardEvent = require("../models/RewardEvent");
const StreakState = require("../models/StreakState");
const BadgeGrant  = require("../models/BadgeGrant");

function yyyymmdd(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function nextTo(prev, current) {
  // prev=YYYY-MM-DD; returns: "continue" if consecutive day, "reset" if gap, "first" if none
  if (!prev) return "first";
  const p = new Date(prev+"T00:00:00Z"); const c = new Date(current+"T00:00:00Z");
  return ((c - p) === 86400000) ? "continue" : (prev === current ? "same" : "reset");
}

async function addPoints(uid, type, key, points, meta = {}) {
  if (points <= 0) return { created:false, points:0 };

  // Idempotent insert
  const ev = await RewardEvent.findOneAndUpdate(
    { uid, type, key },
    { $setOnInsert: { uid, type, key, points, meta }},
    { upsert: true, new: false } // new=false => returns doc if existed; null if inserted
  );
  if (ev) return { created:false, points:0 };

  // Update pointsTotal quick accumulator
  await StreakState.updateOne({ uid }, { $inc: { pointsTotal: points } }, { upsert:true });
  return { created:true, points };
}

async function touchStreak(uid, track, dateKey) {
  const s = await StreakState.findOne({ uid });
  const doc = s || new StreakState({ uid });

  const st = doc[track] || { current:0, best:0, lastDateKey:null };
  const rel = nextTo(st.lastDateKey, dateKey);

  if (rel === "same") return doc; // already touched today
  if (rel === "continue" || rel === "first") {
    st.current = (rel === "first") ? 1 : (st.current + 1);
  } else { // reset
    st.current = 1;
  }
  st.best = Math.max(st.best, st.current);
  st.lastDateKey = dateKey;

  doc[track] = st;
  await doc.save();
  return doc;
}

// ---- Rule helpers ----

// Water: +1 point per +250 ml delta (capped to +16 per day by default)
async function awardWater(uid, dateKey, oldMl, newMl, dailyCap = 16) {
  const inc = Math.max(0, newMl - (oldMl||0));
  if (inc <= 0) return { points:0 };
  const stepsOf250 = Math.floor(inc / 250);
  if (stepsOf250 <= 0) return { points:0 };

  // a single event per update call
  const key = `${dateKey}:${newMl}`;
  const { created, points } = await addPoints(uid, "water", key, Math.min(stepsOf250, dailyCap), { deltaMl: inc });

  // streak condition: “hydrated day” when total >= 2000 ml
  if (newMl >= 2000) await touchStreak(uid, "water", dateKey);

  if (created) await maybeGrantBadges(uid); // evaluate thresholds
  return { points };
}

// Steps goal: +50 once per day (only when crossing goal)
async function awardStepsGoal(uid, dateKey) {
  const { created, points } = await addPoints(uid, "steps_goal", dateKey, 50, {});
  if (created) {
    await touchStreak(uid, "steps_goal", dateKey);
    await maybeGrantBadges(uid);
  }
  return { points };
}

// Workout finish: base + (floor(distanceKm))
async function awardWorkoutFinish(uid, workoutId, dateKey, distanceKm = 0) {
  const base = 20 + Math.floor(distanceKm);
  const { created, points } = await addPoints(uid, "workout_finish", workoutId, base, { distanceKm });
  if (created) {
    await touchStreak(uid, "workout", dateKey);
    await maybeGrantBadges(uid);
  }
  return { points };
}

// Badges: simple tier thresholds; expand later
async function maybeGrantBadges(uid) {
  const s = await StreakState.findOne({ uid });
  if (!s) return;

  const grants = [];
  // streak badges
  if (s.water?.best >= 3)  grants.push("hydration_3");
  if (s.water?.best >= 7)  grants.push("hydration_7");
  if (s.steps_goal?.best >= 7) grants.push("walker_7");
  if (s.workout?.best >= 1) grants.push("first_run");

  // points badges
  if ((s.pointsTotal||0) >= 500) grants.push("points_500");
  if ((s.pointsTotal||0) >= 1000) grants.push("points_1000");

  await Promise.all(grants.map(b =>
    BadgeGrant.updateOne({ uid, badge: b }, { $setOnInsert: { uid, badge: b } }, { upsert: true })
  ));
}

module.exports = { awardWater, awardStepsGoal, awardWorkoutFinish };
