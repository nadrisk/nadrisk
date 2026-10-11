import nadriskLogo from "@/assets/nadrisk-logo.png";

const AboutSection = () => {
  return (
    <section id="about" className="about-section">
      <div className="about-mark"><img src={nadriskLogo} alt="Nadrisk logo" /></div>
      <div className="about-copy">
        <span className="eyebrow">ABOUT / BEHIND THE INSTRUMENT</span>
        <h2>Nadir Čajić is Nadrisk.</h2>
        <p>Bosnian artist and sound tinkerer Nadir Čajić built the NAD Groovebox as an instrument for shaping rhythms, samples and synthesis into strange new signals.</p>
        <p>His music moves through textured electronics, deep bass and drifting atmospheres—always guided by experimentation and the urge to make something that feels slightly off in the best way.</p>
      </div>
    </section>
  );
};

export default AboutSection;
