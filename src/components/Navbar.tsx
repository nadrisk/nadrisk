import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/nadrisk-logo.png";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/60 backdrop-blur-md border-b border-border/30">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-sm font-medium text-foreground hover:text-accent transition-colors tracking-wide uppercase">
          Home
        </Link>
        <Link to="/news" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase">
          News
        </Link>
      </div>

      <a href="#home" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <img src={logo} alt="Nadrisk" className="h-8 w-8 invert" />
        <span className="text-xs font-medium tracking-[0.25em] text-foreground uppercase">Nadrisk</span>
      </a>

      <div className="flex items-center gap-4">
        <a
          href="mailto:contact@nadrisk.com"
          className="hidden sm:inline-flex px-5 py-2 text-xs font-medium tracking-wider uppercase border border-foreground/30 text-foreground hover:bg-foreground hover:text-background transition-all duration-300 rounded-sm"
        >
          Book Now
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Instagram size={18} />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
