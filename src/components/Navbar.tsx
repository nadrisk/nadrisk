import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => <nav className="site-nav" aria-label="Main navigation">
  <a className="nav-document" href="#groovebox" aria-label="NAD Groovebox"><span className="status-dot" /><span>NAD GROOVEBOX</span></a>
  <div className="nav-links"><Button asChild variant="ghost" size="sm"><a href="#about">About</a></Button><Button asChild variant="ghost" size="icon" className="instagram-link"><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={16} /></a></Button></div>
</nav>;

export default Navbar;
