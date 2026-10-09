const AboutSection = () => {
  return (
    <section id="about" className="about-section">
      <div className="about-heading"><span className="eyebrow">03 / BEHIND THE SIGNAL</span><h2>The person<br />in the patch.</h2><span className="about-object">p nadrisk</span></div>
      <div>

        <div className="about-copy space-y-6 text-muted-foreground leading-relaxed text-sm">
          <p className="text-foreground text-lg md:text-xl font-light italic">
            Nadrisk is what you play for that friend who says they're into everything, just to see if they mean it.
          </p>

          <p>
            Bosnian artist Nadir Čajić creates music by experimenting with a wide range of instruments and sounds, from synths and guitars to samples and field recordings, then reshaping them through heavy manipulation into something uniquely his.
          </p>

          <p>
            His tracks feel like tuning into a strange signal late at night, somewhere between a memory, a dream, and a system error.
          </p>

          <p>
            With a focus on textured sound, deep bass, and drifting synths, his music blends glitchy atmospheres with an experimental touch, always guided by the desire to shape something new.
          </p>

          <div className="pt-4 border-t border-border/50 space-y-3 text-sm">
            <p>Nadrisk composed the music for the <span className="text-foreground">HAAD fashion show</span>, titled <span className="text-foreground">Mektub</span>.</p>
            <p>He was also featured on <span className="text-foreground">VISION Radio</span> by <span className="text-foreground">Billain</span>.</p>
            <p>His work has been released on labels like <span className="text-foreground">inter.net</span> and <span className="text-foreground">LMNL Records</span>.</p>
            <p>He has dropped EPs and audiovisual projects such as <span className="text-foreground">Vihor</span>, <span className="text-foreground">Crave</span>, <span className="text-foreground">Magla</span>, and <span className="text-foreground">Inner Construct</span>.</p>
            <p>He's earned recognition in events like the <span className="text-foreground">Machinedrum compo</span>, <span className="text-foreground">raster. soundtrack europe 20—25</span>, and <span className="text-foreground">MArteLive Europe</span>.</p>
          </div>

          <p className="text-foreground/70 italic text-sm pt-4">
            Best used when you want the world to feel slightly off in the best way.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
