import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { newsEntries } from "@/data/newsData";

const News = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-32 pb-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-16">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase mb-8"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
            <h1 className="text-5xl md:text-7xl font-light text-foreground tracking-wide text-glow">
              NEWS
            </h1>
          </div>

          <div>
            {newsEntries.map((entry, i) => (
              <NewsCard key={i} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default News;
