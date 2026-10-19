import nadriskLogo from "@/assets/nadrisk-logo.png";
import { LINKS } from "@/lib/welcome";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const AboutSection = ({ native = false }: { native?: boolean }) => (
  <section id="about" className="about-section">
    <header className="about-header"><span>ABOUT</span><span>02 / MAKER</span></header>
    <div className="about-body">
      <div className="about-mark"><img src={nadriskLogo} alt="Nadrisk logo" /><span>NADRISK</span></div>
      <div className="about-copy">
        <span className="eyebrow">BEHIND THE INSTRUMENT</span>
        <h2>NADIR ČAJIĆ IS NADRISK.</h2>
        <p>A sound designer and electronic music producer from Bosnia and Herzegovina. His music moves through textured electronics, deep bass and drifting atmospheres, always driven by experimentation.</p>
        <p>The Nadrisk Groovebox started as a way to get away from traditional DAWs and spend less time trying to make everything perfect. It&rsquo;s built for playing, experimenting, and having fun with sound.</p>
        <p>Make beats, build grooves, shape samples, mess with synths, and try out ideas as you go. Whether you&rsquo;re just starting out or have been making music for years, the idea is simple: make music feel fun and spontaneous again, wherever you are, wherever you go, even on your phone. And when you&rsquo;re ready, take your ideas to the stage.</p>

        <nav className="about-links" aria-label="Nadrisk links">
          <a className="gb-cycle" href={LINKS.instagram} {...ext}>INSTAGRAM</a>
          <a className="gb-cycle" href={LINKS.soundcloud} {...ext}>SOUNDCLOUD</a>
          <a className="gb-cycle" href={LINKS.apple} {...ext}>APPLE MUSIC</a>
          <a className="gb-cycle" href={LINKS.youtube} {...ext}>YOUTUBE</a>
        </nav>
        {!native && <div className="about-cta">
          <p>The Nadrisk Groovebox is free. If you enjoy it, consider donating on Ko-fi — your support keeps it online and helps it grow.</p>
          <a className="gb-cycle about-kofi" href={LINKS.kofi} {...ext}>♥ SUPPORT ON KO-FI</a>
        </div>}
      </div>
    </div>
    <footer className="about-status"><span>ARTIST / PRODUCER / SOUND DESIGNER</span><span>NADRISK GROOVEBOX</span></footer>
  </section>
);

export default AboutSection;
