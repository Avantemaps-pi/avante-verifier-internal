import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PiLoginButton } from "@/components/PiLoginButton";
import { MobileNav } from "@/components/MobileNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { PaymentHistory } from "@/components/PaymentHistory";
import { Badge } from "@/components/ui/badge";
import { usePaymentCount } from "@/hooks/usePaymentCount";
import { useState } from "react";

export const Header = () => {
  const { count, newCount, hasNotification, markAsViewed } = usePaymentCount();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSheetChange = (open: boolean) => {
    setSheetOpen(open);
    if (open) {
      markAsViewed();
    }
  };

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
            <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 relative">
                  <Receipt className="h-4 w-4" />
                  Payment History
                  {count > 0 && (
                    <Badge 
                      variant={hasNotification ? "default" : "secondary"}
                      className={`ml-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs ${
                        hasNotification ? "animate-pulse bg-primary" : ""
                      }`}
                    >
                      {newCount > 0 ? `${newCount > 99 ? '99+' : newCount} new` : count > 99 ? '99+' : count}
                    </Badge>
                  )}
                  {hasNotification && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-ping" />
                  )}
                  {hasNotification && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                  <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Receipt className="h-5 w-5 text-primary" />
                    Payment History
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </SheetHeader>
                <PaymentHistory />
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
