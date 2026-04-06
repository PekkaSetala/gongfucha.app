/**
 * Rotating gongfu tips — one shown per session.
 * Mix of practical technique, tea knowledge, and equipment advice
 * aimed at Western hobbyists who are still building their practice.
 */
const tips = [
  "Pre-heat your vessel and cups with boiling water. Cold porcelain steals heat from the first steep.",
  "If your tea tastes bitter, try a flash steep next time — pour in, pour out immediately.",
  "The color of the liquor tells you a lot. Hold your cup against something white to read it clearly.",
  "Don't pour boiling water directly onto delicate greens. Pour it onto the wall of the gaiwan and let it slide down.",
  "Sniff the empty cup after drinking. The aroma that lingers there (the 'cup fragrance') is often more complex than the tea itself.",
  "Compressed tea (cakes, bricks) needs a longer rinse to let the leaves separate. Be patient.",
  "If a tea has pile taste (fishy, musty), an extra rinse or two will usually clear it.",
  "Your water matters more than your teaware. Filtered or spring water makes a real difference.",
  "A gaiwan is the most versatile vessel. One 100-120ml gaiwan can brew anything well.",
  "Don't lift the lid to check on the leaves mid-steep. You lose heat and disrupt the extraction.",
  "After the rinse, smell the wet leaves in your heated vessel. That aroma tells you what's coming.",
  "If you're getting thin, watery steeps, try a higher leaf-to-water ratio rather than longer times.",
  "Pouring speed matters. A slow, gentle pour agitates the leaves less than a hard stream.",
  "When a session starts going flat, try a 5-10 minute rest before the next infusion. The leaves recover.",
  "Store your tea away from light, moisture, and strong odors. A sealed bag in a cupboard works fine.",
  "Young sheng pu-erh can be intense. If it's too bitter or astringent, back off the temperature to 85-90°C.",
  "Wuyi yancha (rock oolong) often needs 2-3 steeps before it really opens up. Don't judge it by the first cup.",
  "If your gaiwan is too hot to hold, you've overfilled it. Leave a centimeter of space at the top.",
  "The 'hui gan' (returning sweetness) after swallowing is one of the best indicators of tea quality.",
  "Aged pu-erh and aged white tea both benefit from full boiling water. Don't hold back on the heat.",
  "Dan Cong oolongs are famous for being tricky — keep steeps very short (5-8s) for the first few rounds.",
  "If you're new to gongfu, start with a forgiving tea like Dian Hong (Yunnan black). It's hard to mess up.",
  "The difference between 'off-boil' and 'rolling boil' is roughly 3-5°C. It matters more than you'd think.",
  "A fairness pitcher (cha hai) ensures every cup from the same steep tastes the same.",
];

/**
 * Get a tip that rotates daily.
 * Uses day-of-year so it changes once per day, not per page load.
 */
export function getDailyTip(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return tips[dayOfYear % tips.length];
}
