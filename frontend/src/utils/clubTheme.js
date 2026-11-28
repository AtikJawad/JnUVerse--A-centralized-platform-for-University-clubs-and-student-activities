/**
 * Stitch dashboard club palette — Week 7 Stage 4
 *
 * Mirrors the tinted icon squircles, corner shapes and "Chartered" pills of
 * `jnuverse_student_dashboard_living_campus_experience/code.html`
 * (sky, purple, orange, pink, emerald), picked from the club's interests,
 * name and description. Keywords follow the ExploreClubs theme mapping.
 */
const THEMES = {
  tech: { icon: "terminal", iconBg: "bg-sky-100 text-primary-container", corner: "bg-sky-50", pill: "bg-sky-50 text-primary-container" },
  debate: { icon: "record_voice_over", iconBg: "bg-purple-100 text-secondary", corner: "bg-purple-50", pill: "bg-purple-50 text-secondary" },
  photo: { icon: "photo_camera", iconBg: "bg-orange-100 text-orange-700", corner: "bg-orange-50", pill: "bg-orange-50 text-orange-700" },
  culture: { icon: "theater_comedy", iconBg: "bg-pink-100 text-pink-700", corner: "bg-pink-50", pill: "bg-pink-50 text-pink-700" },
  social: { icon: "volunteer_activism", iconBg: "bg-emerald-100 text-emerald-800", corner: "bg-emerald-50", pill: "bg-emerald-50 text-emerald-700" },
  sports: { icon: "sports_soccer", iconBg: "bg-emerald-100 text-emerald-800", corner: "bg-emerald-50", pill: "bg-emerald-50 text-emerald-700" },
  research: { icon: "biotech", iconBg: "bg-sky-100 text-sky-800", corner: "bg-sky-50", pill: "bg-sky-50 text-sky-800" },
  default: { icon: "groups", iconBg: "bg-surface-lavender text-primary", corner: "bg-surface-lavender", pill: "bg-surface-lavender text-primary" },
};

const RULES = [
  ["tech", ["technology", "programming", "robotics", " it ", "computer", "tech", "code", "software"]],
  ["debate", ["debate", "literature", "speech", "forum"]],
  ["photo", ["photography", "photo", "camera"]],
  ["culture", ["cultural", "music", "drama", "culture", "theater", "performing"]],
  ["sports", ["sports", "sport", "cricket", "football", "athletic", "fitness"]],
  ["social", ["social service", "environment", "scout", "rover", "volunteer", "welfare"]],
  ["research", ["research", "science", "biology", "chemistry"]],
];

export function getClubTheme(club) {
  const interests = (club?.interests || []).map((i) => i.name).join(" ");
  const text = ` ${interests} ${club?.name || ""} ${club?.description || ""} `.toLowerCase();
  const match = RULES.find(([, words]) => words.some((w) => text.includes(w)));
  return THEMES[match ? match[0] : "default"];
}
