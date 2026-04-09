"use client";

import { InlineViewHeader } from "@/components/InlineViewHeader";

interface GuidePrimerProps {
  onBack: () => void;
}

/**
 * Static hand-written onboarding primer. ~610 words. Serif body,
 * generous line-height, max-65ch reading column on desktop.
 *
 * Fact-checked against white2tea, Mei Leaf, Yunnan Sourcing, Teasenz.
 * See the Tea Guide spec for the editorial rationale.
 */
export function GuidePrimer({ onBack }: GuidePrimerProps) {
  return (
    <div className="min-h-[100dvh] bg-surface">
      <InlineViewHeader title="A short primer on gongfu cha" onBack={onBack} />

      <article className="max-w-[65ch] mx-auto px-5 py-6 text-primary">
        <h1 className="font-serif-cn text-[28px] leading-tight mb-6">
          A short primer on gongfu cha
        </h1>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-6">
          Gongfu cha means &ldquo;tea with effort&rdquo; or &ldquo;tea with skill&rdquo;{" "}
          (<span lang="zh">功夫茶</span>). Both translations work. The short
          version: small vessel, a lot of leaf, short steeps, and you drink the
          same tea over and over in one sitting.
        </p>

        <h2 className="font-serif-cn text-[20px] mt-10 mb-3">
          What it actually is
        </h2>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          You take a small pot or gaiwan, maybe 100&nbsp;ml. You put in more
          leaf than seems reasonable, 5 to 8 grams. Hot water goes in. Five to
          fifteen seconds later you pour it all out into a small cup and drink
          it.
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          Then you do it again. And again. Five, six, sometimes eight infusions
          from the same leaves. Each round steeps a little longer than the last.
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          It&rsquo;s a different way of drinking tea, not just &ldquo;stronger
          tea.&rdquo; The first infusion tastes one way; the third tastes
          different; the fifth different again. The leaves open slowly, release
          different things each round, and you taste the whole arc. Some teas
          (good oolongs, pu-erh, aged whites) only really make sense this way.
          You can&rsquo;t get them from a teabag.
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          Western brewing isn&rsquo;t wrong. It&rsquo;s faster and less
          attentive, which is sometimes what you want. Gongfu is the slower
          option. An hour, a dozen small cups, one batch of leaves.
        </p>

        <h2 className="font-serif-cn text-[20px] mt-10 mb-3">
          How to read a brewing schedule
        </h2>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          Every tea in this app shows four numbers. They look fussy but
          they&rsquo;re not.
        </p>

        <ul className="font-serif-cn text-[17px] leading-[1.7] mb-4 space-y-3 list-none pl-0">
          <li>
            <strong>Temperature.</strong> Greens want it coolest, around 80°C.
            Roasted oolongs and pu-erh want it hot, 95°C or off the boil.
            Everything else lands in between. Too hot makes things bitter. Too
            cool keeps the tea thin.
          </li>
          <li>
            <strong>Ratio.</strong> How much leaf for how much water, in grams
            per 100&nbsp;ml. 5 to 8&nbsp;g/100&nbsp;ml is the normal range.
            Closer to 7 for oolongs and pu-erh, lighter for delicate greens.
          </li>
          <li>
            <strong>Infusions.</strong> How many rounds the leaves will give
            you, usually five or six, sometimes more.
          </li>
          <li>
            <strong>Times.</strong> How long each steep runs. Very short at
            first (five to fifteen seconds), getting longer as the leaves
            fatigue.
          </li>
        </ul>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          You don&rsquo;t have to memorize any of this. The app does the math
          when you change your vessel or leaf amount. The numbers are starting
          points, not laws. After a few sessions you&rsquo;ll want to steep
          some teas longer or shorter than the app suggests. That&rsquo;s the
          whole idea.
        </p>

        <h2 className="font-serif-cn text-[20px] mt-10 mb-3">
          What gear you actually need
        </h2>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          A gaiwan, to start.
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          A gaiwan is a small lidded porcelain cup, around 100&nbsp;ml.
          Porcelain doesn&rsquo;t hold flavor, so you can brew any tea in it
          and clean it with water. A decent one costs ten or fifteen euros
          online.
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          The other traditional gongfu vessel is the yixing teapot. Yixing
          pots are unglazed clay that seasons slowly with the tea you brew in
          them, which means one pot, one kind of tea. That&rsquo;s a
          commitment. Yixing is wonderful if you&rsquo;ve settled into drinking
          one tea a lot; it&rsquo;s fiddly if you&rsquo;re still trying things
          out. Come back to it later.
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-4">
          Everything else is optional: a small pitcher (cha hai, or
          &ldquo;fairness pitcher&rdquo;) for pouring evenly into multiple
          cups; small cups, 30 to 50&nbsp;ml, any shape; a kettle with
          temperature control (nice but not required; boiling water rested for
          a minute gets you close enough for most teas).
        </p>

        <p className="font-serif-cn text-[17px] leading-[1.7] mb-10">
          What you don&rsquo;t need: a bamboo tea tray, matching porcelain,
          artisan tongs. None of this makes the tea better. Buy beautiful
          things later if you want them. But the person telling you that you
          need a $300 pot to brew properly is selling you a pot.
        </p>
      </article>
    </div>
  );
}
