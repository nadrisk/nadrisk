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
        <p>Nadrisk is the project of Nadir Čajić, a sound designer and electronic producer from Bosnia and Herzegovina. His music moves through textured electronics, deep bass and drifting atmospheres, always driven by experimentation.</p>
        <p>The NAD Groovebox was born from a need to step out of DAWs and perfectionism. Most tools focus on production; this one is built to be played. Shape rhythms, samples and synthesis on the fly and perform your ideas live.</p>
        <p>The goal is to inspire musicians, new and seasoned alike, with a tool that makes expressing ideas fun again and lets you take your creations to a stage.</p>
        <nav className="about-links" aria-label="Nadrisk links">
          <a className="gb-cycle" href={LINKS.instagram} {...ext}>INSTAGRAM</a>
          <a className="gb-cycle" href={LINKS.soundcloud} {...ext}>SOUNDCLOUD</a>
          <a className="gb-cycle" href={LINKS.apple} {...ext}>APPLE MUSIC</a>
          <a className="gb-cycle" href={LINKS.youtube} {...ext}>YOUTUBE</a>
        </nav>
        {!native && <div className="about-cta">
          <p>The groovebox is free. If you enjoy it, support it on Ko-fi to keep it online and growing.</p>
          <a className="gb-cycle about-kofi" href={LINKS.kofi} {...ext}>♥ SUPPORT ON KO-FI</a>
        </div>}
      </div>
    </div>
    <footer className="about-status"><span>ARTIST / PRODUCER / SOUND DESIGNER</span><span>NAD GROOVEBOX</span></footer>
  </section>
);

export default AboutSection;
