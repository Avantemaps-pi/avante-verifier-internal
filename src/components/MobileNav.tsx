import { Menu, FileText, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PiLoginButton } from "@/components/PiLoginButton";
import { PaymentHistory } from "@/components/PaymentHistory";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 mt-6">
            <PiLoginButton />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <Button 
              variant="outline" 
              className="w-full gap-2 justify-start"
              onClick={() => {
                setOpen(false);
                setPaymentHistoryOpen(true);
              }}
            >
              <Receipt className="h-4 w-4" />
              Payment History
            </Button>
            <Link to="/docs" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full gap-2 justify-start">
                <FileText className="h-4 w-4" />
                API Docs
              </Button>
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <Sheet open={paymentHistoryOpen} onOpenChange={setPaymentHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payment History</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PaymentHistory />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
