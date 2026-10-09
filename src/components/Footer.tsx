const Footer = () => {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} NADRISK</span><span>END OF PATCH <span className="status-dot" /></span><a href="https://docs.cycling74.com/userguide/patching/" target="_blank" rel="noopener noreferrer">Inspired by the art of patching ↗</a>
    </footer>
  );
};

export default Footer;
