import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gongfu Cha Brewing — How to Actually Do It",
  description:
    "A firsthand guide to gongfu-style tea brewing: gear, leaf-to-water ratio, temperature, the rinse, schedule logic, how to taste, and the traps to avoid.",
  alternates: { canonical: "/brewing" },
  openGraph: {
    title: "Gongfu Cha Brewing — How to Actually Do It",
    description:
      "Small vessel, many short steeps, tasting the leaf across its arc. Opinionated notes on gear, ratio, temperature, and the rinse.",
    type: "article",
    url: "https://gongfucha.app/brewing",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gongfu Cha Brewing — How to Actually Do It",
    description:
      "Small vessel, many short steeps, tasting the leaf across its arc.",
    images: ["/og-image.png"],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Gongfu Cha Brewing — How to Actually Do It",
    description:
      "A firsthand guide to gongfu-style tea brewing: gear, leaf-to-water ratio, temperature, the rinse, schedule logic, how to taste, and the traps to avoid.",
    datePublished: "2026-04-14",
    dateModified: "2026-04-14",
    author: {
      "@type": "Person",
      name: "Pekka Setälä",
      url: "https://gongfucha.app/about/methodology",
    },
    publisher: {
      "@type": "Organization",
      name: "Gongfu Cha",
      url: "https://gongfucha.app",
    },
    mainEntityOfPage: "https://gongfucha.app/brewing",
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Pekka Setälä",
    url: "https://gongfucha.app/about/methodology",
    sameAs: [
      "https://pekkasetala.github.io",
      "https://github.com/PekkaSetala",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://gongfucha.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Brewing",
        item: "https://gongfucha.app/brewing",
      },
    ],
  },
];

export default function BrewingPage() {
  return (
    <main
      id="main-content"
      className="flex-1 bg-bg text-primary px-5 py-10 sm:py-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-[680px]">
        <header className="mb-10">
          <h1 className="font-serif-cn text-3xl sm:text-4xl font-bold leading-tight text-primary">
            Gongfu Cha Brewing — How to Actually Do It
          </h1>
          <p className="mt-3 text-sm text-secondary">By Pekka Setälä</p>
        </header>

        <section id="meaning" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            What gongfu cha means, and what it doesn&apos;t
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            Gongfu cha is a small vessel, a lot of leaf for the water it holds,
            and many short steeps taken back to back. You taste the same leaf
            three, five, ten times in a row and you watch it change. The first
            steep is not the same tea as the fifth. That arc is the whole
            point.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            It is not a ceremony. The Japanese tea ceremony —{" "}
            <span className="font-serif-cn">茶道</span>, chanoyu — is a
            choreographed ritual with guests, host, prescribed movements, and a
            powdered green tea whisked into foam. Gongfu cha is something
            else: working tea at a table, alone or with friends, paying
            attention. There is no script. You pour water, you pour tea, you
            taste.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            The word <span className="font-serif-cn">工夫</span> (gongfu) means
            skill, effort, the thing you get from practicing. It has nothing to
            do with the martial art Westerners call kung fu, which in Mandarin
            is also gongfu but written{" "}
            <span className="font-serif-cn">功夫</span> and pronounced the same
            way. Same sound, different characters, different idea. Here it
            means: the craft of brewing tea well, which you acquire by doing it
            a lot.
          </p>
        </section>

        <section id="gear" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            Gear: gaiwan vs small teapot
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            Vessel size matters because it fixes the ratio between leaf and
            water. Five grams of oolong in a 100ml gaiwan is a very different
            tea from five grams in a 400ml mug. More water dilutes, less water
            concentrates. Gongfu lives at the concentrated end of that line,
            which is why small vessels are not aesthetic preference — they are
            the mechanism.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            Start with a porcelain gaiwan around 100 to 150ml. A gaiwan is a
            three-piece lidded bowl: cup, lid, saucer. You brew in it, you
            pinch the lid against the rim, you pour. Porcelain is neutral — it
            gives you the tea, nothing added, nothing absorbed. That neutrality
            is what a beginner needs, because you are still learning what the
            tea tastes like.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            A clay teapot — Yixing zisha, Chaozhou red clay — is the next step
            and only for specific teas. Unglazed clay is porous. It takes on
            the character of whatever you brew in it and slowly gives some of
            that back. This memory effect is real, not marketing. A pot
            seasoned on roasted oolong rounds out roast edges; a pot seasoned
            on shou puerh softens earth. Dedicate one pot to one tea type, or
            the memory works against you.
          </p>
        </section>

        <section id="ratio" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            Leaf-to-water ratio
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            Western gongfu drinkers think in grams per 100 millilitres, not raw
            g/ml, because the numbers are easier to hold in your head and the
            ranges fall out cleanly. Rough starting points: 5 to 6 g/100ml for
            most oolongs and puerh, 3 to 4 g/100ml for greens and whites. Red
            tea sits around 4 to 5. These are starting points, not rules.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            The trade-off is always the same: more leaf means shorter steeps.
            More leaf, longer steeps gives you an ashtray. The right move when
            you push the ratio up is to cut time, not add it. You can over-leaf
            a gaiwan on purpose and flash-steep for two seconds — that is a
            technique, not a mistake — but the timing has to come down with
            the leaf going up.
          </p>
        </section>

        <section id="temperature" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            Temperature by category
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            Temperature is the biggest lever you have after ratio, and it
            splits cleanly by tea category. Greens want 75 to 80°C. Whites
            around 85°C. Unroasted and light oolongs 90 to 95°C. Roasted
            oolongs, red tea, and puerh — both sheng and shou — take a full 95
            to 100°C. Boiling is fine for dense compressed teas; it is a
            disaster for Long Jing.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            The reason is extraction chemistry. Amino acids, which give tea its
            sweetness and body, extract readily at lower temperatures. Tannins
            and heavy polyphenols, which give bitterness and astringency, need
            heat to come out. Greens are full of amino acids and relatively
            thin-walled — you want to coax the sweet stuff out without also
            ripping the tannins loose, which is why 80°C is the ceiling. Push
            a green to 95°C and you get a bitter stewed mouthful that no
            amount of short steeping will save.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            On the other end: roasted oolongs, aged teas, and compressed puerh
            have thick leaves and dense structure. Below 95°C they taste thin,
            hollow, like you only scraped the surface. Those teas need heat to
            wake up. Boil the kettle, pour straight in, no cooling. If a dark
            roast Wuyi yancha tastes flat to you, the water is almost always
            the culprit before the leaf is.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            White teas sit between. Young silver needle likes 85°C; aged white
            cake can take 95°C or near boiling because the aging has tightened
            it up. Category labels on a bag are a starting hint, not an order.
            Taste and adjust.
          </p>
        </section>

        <section id="rinse" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            The rinse
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            The rinse is a short pour of hot water over the leaves that you
            discard before the first real steep. Five seconds in, five seconds
            out. You do it for dense compressed teas, for anything roasted,
            and always for puerh — the leaves have been pressed or fired, they
            need a moment to open, and a rinse also washes off whatever storage
            dust or loose fragments came along for the ride. It primes the
            vessel, too: a cold gaiwan steals heat from your first steep and
            you lose extraction.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            Skip the rinse for greens and whites. The first steep on a Long
            Jing or a silver needle is often the best steep you will get — the
            most aromatic, the sweetest — and pouring it down the drain is a
            waste. The leaves are loose, the tea is clean, there is nothing to
            wake up and nothing to wash off. Just brew it.
          </p>
        </section>

        <section id="schedule" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            Schedule logic
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            Steep times grow as the session goes on, and the reason is
            physical. Early steeps extract fast because surface area is high
            and soluble compounds — amino acids, light aromatics — come off
            easily. By the fourth or fifth pour those quick-release compounds
            are mostly gone and you are asking the leaf to give up its slower
            fractions: heavier polyphenols, deeper flavours, what is left in
            the mid-leaf structure. That takes time.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            A typical 5 to 6 g/100ml oolong runs something like 10 seconds, 15,
            20, 30, 45, 60, and then you are extending from there. These are
            numbers to start from and ignore once you have tasted. Some teas
            want shorter early steeps and longer back halves; some give
            everything up in the first four pours and die. Learn the curve of
            each tea you drink regularly.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            Extend past the schedule when the tea is still giving and you do
            not want to stop. If steep six tastes full and the aftertaste is
            still long, add ten seconds and keep going. The schedule is a
            scaffold, not a contract.
          </p>
        </section>

        <section id="tasting" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            How to taste: 三口, 生津, huigan
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            Chinese tea culture has a small vocabulary for the specific things
            a good tea does in your mouth, and learning the words makes you
            notice them.{" "}
            <span className="font-serif-cn">三口</span> sān kǒu — three sips.
            Take a small sip first: just enough liquid on the tongue to
            register the flavour. The second sip is for texture — how the tea
            feels in the mouth, whether it is oily, thin, coating, chalky,
            silky. The third sip is for the finish: swallow, pause, and notice
            what the tea leaves behind.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            <span className="font-serif-cn">生津</span> shēngjīn means
            saliva-rising. A good tea makes your mouth water after you swallow
            — not immediately, but within a few seconds, as if your glands are
            responding to something the tea did. You feel it on the sides of
            the tongue and under it. Shengjin is one of the clearest signs
            that what you are drinking has structure and life. Bulk
            supermarket tea does not do this. Good Wuyi yancha, good aged
            sheng, good dan cong — they do.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            <span className="font-serif-cn">回甘</span> huígān means returning
            sweetness. It is the sweet aftertaste that rises in the back of
            the throat a few seconds, sometimes a minute, after you swallow.
            You took a sip of something that was not particularly sweet, you
            swallowed, and now there is honey in your throat. That is huigan.
            It is not mystical. It is a specific sensory event and either the
            tea does it or it does not.
          </p>
          <p className="mb-4 text-primary leading-relaxed">
            Shengjin and huigan are the two checks I run on any tea I am
            evaluating. Flavour is easy to fake with fragrance and roast —
            mouthfeel and aftertaste are where the quality lives.
          </p>
        </section>

        <section id="traps" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            Common traps
          </h2>
          <ol className="list-decimal list-outside pl-5 space-y-3 text-primary leading-relaxed">
            <li>
              <strong className="text-primary">Over-leafing for strength.</strong>{" "}
              &quot;More leaf equals stronger tea&quot; is true up to a point
              and wrong past it. Past the point, more leaf plus shorter steeps
              is the right adjustment. Adding leaf and keeping old steep times
              gives you a bitter mess.
            </li>
            <li>
              <strong className="text-primary">Over-steeping.</strong> Tannins
              win the longer water sits on leaf. Once a steep turns
              astringent, the next one will be worse — you cannot recover a
              tea that has gone bitter by backing off the time.
            </li>
            <li>
              <strong className="text-primary">Chasing bitterness.</strong> If
              a steep is bitter, the session is already done. Do not try to
              dilute your way out or extend to &quot;push through.&quot; End
              the session or rinse hard and restart the clock.
            </li>
            <li>
              <strong className="text-primary">Hot water on greens.</strong>{" "}
              Boiling water on Long Jing is the single most common Western
              mistake. Let the kettle cool to 80°C.
            </li>
            <li>
              <strong className="text-primary">Cold water on roasted
              oolongs.</strong> The opposite failure mode. A 90°C pour on dark
              Wuyi tastes thin. Use boiling.
            </li>
            <li>
              <strong className="text-primary">Skipping the rinse on dense
              teas.</strong> Compressed puerh, heavily roasted oolong, aged
              whites — they need the rinse to open and to prime the vessel.
              No rinse, thin first steep.
            </li>
          </ol>
        </section>

        <section id="ending" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">
            When to end a session
          </h2>
          <p className="mb-4 text-primary leading-relaxed">
            The tea tells you. Flavour goes thin, the aftertaste gets shorter,
            shengjin stops responding, huigan fades. When a steep tastes like
            warm water with a hint of something, that is the end. Most oolongs
            give six to ten steeps, greens and whites four to six, good sheng
            puerh can run past ten. Stop when the tea is done. Do not chase
            dead leaves — all you get is disappointment and a cold cup.
          </p>
        </section>
      </article>
    </main>
  );
}
