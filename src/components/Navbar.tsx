import { ArrowUpRight, Instagram, Cable } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar = () => <nav className="site-nav" aria-label="Main navigation">
  <div className="nav-document"><Cable size={17} /><span>nadrisk / <span className="text-muted-foreground">sound experiments</span></span></div>
  <div className="nav-links"><Button asChild variant="ghost" size="sm"><NavLink to="/" end className={({ isActive }) => isActive ? "nav-active" : ""}><span className="nav-indicator" />Home</NavLink></Button><Button asChild variant="ghost" size="sm"><NavLink to="/news" className={({ isActive }) => isActive ? "nav-active" : ""}>News <ArrowUpRight size={12} /></NavLink></Button><Button asChild variant="ghost" size="icon" className="instagram-link"><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={16} /></a></Button></div>
</nav>;

export default Navbar;
