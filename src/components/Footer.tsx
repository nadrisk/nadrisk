const Footer = () => {
  return (
    <footer className="py-12 px-6 md:px-12 border-t border-border/30">
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="tracking-wider uppercase">© {new Date().getFullYear()} Nadrisk</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground transition-colors">Imprint</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
