import { ArrowRight } from "lucide-react";

const NewsSection = () => {
  return (
    <section className="py-24 px-6 md:px-12 border-t border-border/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-light text-foreground mb-4">
          See what's new!
        </h2>
        <a
          href="#"
          className="inline-flex items-center gap-2 text-sm font-medium tracking-wider uppercase text-accent hover:text-foreground transition-colors group"
        >
          More Info
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </section>
  );
};

export default NewsSection;
