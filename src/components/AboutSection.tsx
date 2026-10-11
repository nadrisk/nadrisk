import nadriskLogo from "@/assets/nadrisk-logo.png";

const AboutSection = () => {
  return (
    <section id="about" className="about-section">
      <header className="about-header"><span>ABOUT</span><span>02 / MAKER</span></header>
      <div className="about-body">
        <div className="about-mark"><img src={nadriskLogo} alt="Nadrisk logo" /><span>NADRISK</span></div>
        <div className="about-copy">
          <span className="eyebrow">BEHIND THE INSTRUMENT</span>
          <h2>NADIR ČAJIĆ IS NADRISK.</h2>
          <p>Bosnian artist and sound tinkerer Nadir Čajić built the NAD Groovebox as an instrument for shaping rhythms, samples and synthesis into strange new signals.</p>
          <p>His music moves through textured electronics, deep bass and drifting atmospheres—always guided by experimentation and the urge to make something that feels slightly off in the best way.</p>
        </div>
      </div>
      <footer className="about-status"><span>ARTIST / EXPLORER / TINKERER</span><span>BOSNIA &amp; HERZEGOVINA</span></footer>
    </section>
  );
};

export default AboutSection;
