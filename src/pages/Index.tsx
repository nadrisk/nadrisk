import Navbar from "@/components/Navbar";
import Groovebox from "@/components/Groovebox";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Groovebox />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
