"use client";

interface GuidePrimerProps {
  onBack: () => void;
}

interface SectionProps {
  title: string;
  dotColor: string;
  children: React.ReactNode;
}

function Section({ title, dotColor, children }: SectionProps) {
  return (
    <section>
      <h2 className="font-serif-cn text-[20px] text-primary mt-14 mb-5 flex items-center gap-3">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Static hand-written onboarding primer for gongfu cha.
 * Editorial reading view: typography-led, no chrome beyond a back arrow.
 *
 * Fact-checked against white2tea, Mei Leaf, Yunnan Sourcing, Teasenz.
 */
export function GuidePrimer({ onBack }: GuidePrimerProps) {
  return (
    <div className="min-h-[100dvh] bg-surface">
      {/* Sticky back chrome */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-[6px]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-tertiary hover:text-primary px-5 py-4 min-h-[44px]"
          style={{ transition: "color 150ms var(--ease-out)" }}
          aria-label="Back to tea list"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4L6 9l5 5" />
          </svg>
          <span className="text-[13px]">Tea list</span>
        </button>
      </div>

      <article className="max-w-[65ch] mx-auto px-5 pt-2 pb-24 text-primary">
        {/* Masthead */}
        <header className="mb-10 mt-4">
          <p
            lang="zh"
            className="font-serif-cn text-[44px] leading-none text-primary"
          >
            功夫茶
          </p>
          <h1 className="font-serif-cn text-[22px] text-secondary mt-3 italic font-light">
            A short primer
          </h1>
        </header>

        {/* Lead paragraph */}
        <p className="font-serif-cn text-[18px] leading-[1.75] text-primary mb-2">
          Gongfu cha means &ldquo;tea with effort&rdquo; or &ldquo;tea with
          skill.&rdquo; Both translations work. The short version: small
          vessel, a lot of leaf, short steeps, and you drink the same tea over
          and over in one sitting.
        </p>

        <Section title="What it actually is" dotColor="#7A9E6B">
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            You take a small pot or gaiwan, maybe 100&nbsp;ml. You put in more
            leaf than seems reasonable, 5 to 8 grams. Hot water goes in. Five
            to fifteen seconds later you pour it all out into a small cup and
            drink it.
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            Then you do it again. And again. Five, six, sometimes eight
            infusions from the same leaves. Each round steeps a little longer
            than the last.
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            It&rsquo;s a different way of drinking tea, not just &ldquo;stronger
            tea.&rdquo; The first infusion tastes one way; the third tastes
            different; the fifth different again. The leaves open slowly,
            release different things each round, and you taste the whole arc.
            Some teas (good oolongs, pu-erh, aged whites) only really make
            sense this way. You can&rsquo;t get them from a teabag.
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75]">
            Western brewing isn&rsquo;t wrong. It&rsquo;s faster and less
            attentive, which is sometimes what you want. Gongfu is the slower
            option. An hour, a dozen small cups, one batch of leaves.
          </p>
        </Section>

        <Section title="How to read a brewing schedule" dotColor="#A8884A">
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-5">
            Every tea in this app shows four numbers. They look fussy but
            they&rsquo;re not.
          </p>
          <ul className="font-serif-cn text-[16px] leading-[1.75] mb-5 space-y-4 list-none pl-0">
            <li>
              <strong className="text-primary">Temperature.</strong> Greens
              want it coolest, around 80°C. Roasted oolongs and pu-erh want it
              hot, 95°C or off the boil. Everything else lands in between. Too
              hot makes things bitter. Too cool keeps the tea thin.
            </li>
            <li>
              <strong className="text-primary">Ratio.</strong> How much leaf
              for how much water, in grams per 100&nbsp;ml. 5 to
              8&nbsp;g/100&nbsp;ml is the normal range. Closer to 7 for
              oolongs and pu-erh, lighter for delicate greens.
            </li>
            <li>
              <strong className="text-primary">Infusions.</strong> How many
              rounds the leaves will give you, usually five or six, sometimes
              more.
            </li>
            <li>
              <strong className="text-primary">Times.</strong> How long each
              steep runs. Very short at first (five to fifteen seconds),
              getting longer as the leaves fatigue.
            </li>
          </ul>
          <p className="font-serif-cn text-[16px] leading-[1.75]">
            You don&rsquo;t have to memorize any of this. The app does the
            math when you change your vessel or leaf amount. The numbers are
            starting points, not laws. After a few sessions you&rsquo;ll want
            to steep some teas longer or shorter than the app suggests.
            That&rsquo;s the whole idea.
          </p>
        </Section>

        <Section title="What gear you actually need" dotColor="#7B6B4D">
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            A gaiwan, to start.
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            A gaiwan is a small lidded porcelain cup, around 100&nbsp;ml.
            Porcelain doesn&rsquo;t hold flavor, so you can brew any tea in it
            and clean it with water. A decent one costs ten or fifteen euros
            online.
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            The other traditional gongfu vessel is the yixing teapot. Yixing
            pots are unglazed clay that seasons slowly with the tea you brew
            in them, which means one pot, one kind of tea. That&rsquo;s a
            commitment. Yixing is wonderful if you&rsquo;ve settled into
            drinking one tea a lot; it&rsquo;s fiddly if you&rsquo;re still
            trying things out. Come back to it later.
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75] mb-4">
            Everything else is optional: a small pitcher (cha hai, or
            &ldquo;fairness pitcher&rdquo;) for pouring evenly into multiple
            cups; small cups, 30 to 50&nbsp;ml, any shape; a kettle with
            temperature control (nice but not required; boiling water rested
            for a minute gets you close enough for most teas).
          </p>
          <p className="font-serif-cn text-[16px] leading-[1.75]">
            What you don&rsquo;t need: a bamboo tea tray, matching porcelain,
            artisan tongs. None of this makes the tea better. Buy beautiful
            things later if you want them. But the person telling you that
            you need a $300 pot to brew properly is selling you a pot.
          </p>
        </Section>

        {/* Closing flourish — bookends the masthead */}
        <div className="mt-20 flex justify-center" aria-hidden="true">
          <p
            lang="zh"
            className="font-serif-cn text-[16px] text-tertiary/40 tracking-[8px]"
          >
            功夫茶
          </p>
        </div>
      </article>
    </div>
  );
}
