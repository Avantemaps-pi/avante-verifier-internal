import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="w-full border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Avante Business Verifier. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
