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

      <main className="news-page">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase mb-8"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
            <span className="eyebrow block mb-4">02 / FIELD NOTES</span><h1 className="news-title">Transmissions<span className="title-period">.</span></h1><div className="news-subheading"><span>RELEASES, EXPERIMENTS & OTHER SIGNALS</span><span>{newsEntries.length} ENTRIES</span></div>
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
