import { chromium } from 'playwright';

const SCREENSHOTS = '/Users/pekkasetala/Documents/Vibe/Sandbox/GongfuchaAI/screenshots';
const URL = 'http://localhost:3004';

async function audit(viewport, label) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const snap = async (name) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/${label}_${name}.png`, fullPage: false });
    console.log(`  [${label}] ${name} captured`);
  };

  // 1. Initial load
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await snap('01_initial_load');

  // Get accessibility tree summary
  const a11y = await page.accessibility.snapshot();
  console.log(`  A11y root role: ${a11y?.role}, children: ${a11y?.children?.length}`);

  // 2. Tea selection — click first tea in the list
  const teaItems = await page.locator('[class*="tea"], [role="button"], button').all();
  console.log(`  Found ${teaItems.length} interactive elements`);

  // Try to find tea list items more specifically
  let firstTea = page.locator('ul li').first();
  let firstTeaExists = await firstTea.count();

  if (firstTeaExists === 0) {
    // Try other selectors
    firstTea = page.locator('[class*="cursor-pointer"]').first();
    firstTeaExists = await firstTea.count();
  }

  if (firstTeaExists > 0) {
    const teaText = await firstTea.textContent();
    console.log(`  Clicking first tea: "${teaText?.substring(0, 50)}..."`);
    await firstTea.click();
    await snap('02_tea_selected');
  } else {
    console.log('  WARNING: Could not find tea list items');
    // Take a full page screenshot to see what we have
    await page.screenshot({ path: `${SCREENSHOTS}/${label}_02_full_page.png`, fullPage: true });
  }

  // 3. State bug — click "Ask AI" while tea is selected
  const askAiBtn = page.locator('text=/ask ai/i').first();
  if (await askAiBtn.count() > 0) {
    await askAiBtn.click();
    await page.waitForTimeout(300);
    await snap('03_ask_ai_state_bug');
  } else {
    console.log('  WARNING: "Ask AI" button not found');
    // Try alternative selectors
    const allButtons = await page.locator('button').allTextContents();
    console.log(`  Available buttons: ${allButtons.join(', ')}`);
  }

  // 4. AI view screenshot
  await snap('04_ai_view');

  // 5. Back navigation
  const backBtn = page.locator('[aria-label*="back" i], button:has(svg)').first();
  if (await backBtn.count() > 0) {
    await backBtn.click();
    await page.waitForTimeout(300);
    await snap('05_back_navigation');
  } else {
    console.log('  WARNING: Back button not found');
  }

  // 6. Custom brew view
  const customBtn = page.locator('text=/custom/i').first();
  if (await customBtn.count() > 0) {
    await customBtn.click();
    await page.waitForTimeout(300);
    await snap('06_custom_brew');
  } else {
    console.log('  WARNING: "Custom" button not found');
  }

  // 7. Go back, select tea, start brewing
  const backBtn2 = page.locator('button:has(svg)').first();
  if (await backBtn2.count() > 0) {
    await backBtn2.click();
    await page.waitForTimeout(300);
  }

  // Re-select first tea
  firstTea = page.locator('ul li').first();
  if (await firstTea.count() > 0) {
    await firstTea.click();
    await page.waitForTimeout(300);
  } else {
    firstTea = page.locator('[class*="cursor-pointer"]').first();
    if (await firstTea.count() > 0) {
      await firstTea.click();
      await page.waitForTimeout(300);
    }
  }

  // Click "Start Brewing"
  const startBtn = page.locator('text=/start brewing/i').first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await page.waitForTimeout(800);
    await snap('07_brewing_timer');

    // 8. Timer running state — wait a moment for animation
    await page.waitForTimeout(2000);
    await snap('08_timer_running');
  } else {
    console.log('  WARNING: "Start Brewing" button not found');
    const allBtns = await page.locator('button').allTextContents();
    console.log(`  Available buttons: ${allBtns.join(', ')}`);
  }

  // Extra: full page screenshot for layout analysis
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SCREENSHOTS}/${label}_09_full_page.png`, fullPage: true });

  // Log page console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  CONSOLE ERROR: ${msg.text()}`);
  });

  await browser.close();
}

async function main() {
  try {
    // Mobile viewport
    await audit({ width: 375, height: 812 }, 'mobile');
  } catch (e) {
    console.error('Mobile audit error:', e.message);
  }

  try {
    // Desktop viewport
    await audit({ width: 1200, height: 900 }, 'desktop');
  } catch (e) {
    console.error('Desktop audit error:', e.message);
  }

  console.log('\n=== Audit complete ===');
  console.log(`Screenshots saved to: ${SCREENSHOTS}/`);
}

main();
