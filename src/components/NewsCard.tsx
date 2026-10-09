import { ExternalLink } from "lucide-react";
import type { NewsEntry } from "@/data/newsData";

interface NewsCardProps {
  entry: NewsEntry;
  index: number;
}

const NewsCard = ({ entry, index }: NewsCardProps) => {
  return (
    <article
      className="group news-entry border-b border-border py-12 first:pt-0 last:border-b-0"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-3">
          <span className="news-entry-index">[{String(index + 1).padStart(3, "0")}]</span>
          <h3 className="text-lg md:text-xl font-medium text-foreground group-hover:text-accent transition-colors">
            {entry.title}
          </h3>
          <p className="news-description text-muted-foreground text-sm leading-relaxed">
            {entry.description}
          </p>
          {entry.link && (
            <a
              href={entry.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-foreground transition-colors"
            >
              {entry.link.text}
              <ExternalLink size={12} />
            </a>
          )}
          {entry.youtubeId && (
            <div className="pt-2">
              <a
                href={`https://www.youtube.com/watch?v=${entry.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-foreground transition-colors"
              >
                Watch on YouTube
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground tracking-wider whitespace-nowrap md:pt-1.5">
          {entry.date}
        </span>
      </div>

      {entry.youtubeId && (
        <div className="mt-6 aspect-video w-full max-w-xl rounded-sm overflow-hidden bg-secondary">
          <iframe
            src={`https://www.youtube.com/embed/${entry.youtubeId}`}
            title={entry.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            loading="lazy"
          />
        </div>
      )}
    </article>
  );
};

export default NewsCard;
