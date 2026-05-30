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


      <div className="flex items-center gap-4">
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
