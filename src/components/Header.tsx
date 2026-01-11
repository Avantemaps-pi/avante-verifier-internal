import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Receipt } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PiLoginButton } from "@/components/PiLoginButton";
import { MobileNav } from "@/components/MobileNav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PaymentHistory } from "@/components/PaymentHistory";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left side - Logo and Pi Login */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">
              Avante
            </span>
          </Link>
          <PiLoginButton />
        </div>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-2">
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Payment History Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Receipt className="h-4 w-4" />
                  Payment History
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <div className="pt-6">
                  <PaymentHistory />
                </div>
              </SheetContent>
            </Sheet>
            <ThemeToggle />
            <Link to="/docs">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                API Docs
              </Button>
            </Link>
          </div>
          {/* Mobile Navigation */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
};
