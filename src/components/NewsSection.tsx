import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { newsEntries } from "@/data/newsData";
import { Button } from "@/components/ui/button";

const NewsSection = () => {
  return (
    <section className="latest-section">
      <div className="section-heading"><div><span className="eyebrow">02 / FIELD NOTES</span><h2>Latest transmissions</h2></div><Button asChild variant="ghost" className="archive-link"><Link to="/news">All updates <ArrowRight size={14} /></Link></Button></div>
      <div className="latest-grid">{newsEntries.slice(0, 3).map((entry, index) => <Link to="/news" className="latest-item" key={entry.title}><span className="latest-date"><span>00{index + 1}</span>{entry.date}</span><h3>{entry.title}</h3><p>{entry.description}</p><span className="latest-arrow"><ArrowRight size={18} /></span></Link>)}</div>
    </section>
  );
};

export default NewsSection;
