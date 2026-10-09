import Navbar from "@/components/Navbar";
import Groovebox from "@/components/Groovebox";
import AboutSection from "@/components/AboutSection";
import NewsSection from "@/components/NewsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
      <header className="site-masthead"><div><span className="eyebrow">INDEPENDENT ELECTRONIC MUSIC</span><h1>NADRISK<span className="title-period">.</span></h1></div><div className="masthead-note"><span>ARTIST. EXPLORER. TINKERER.</span><span>BOSNIA & HERZEGOVINA <span className="status-dot" /></span></div></header>
      <Groovebox />
      <NewsSection />
      <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
