import { Check, Zap, Shield, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiPaymentButton } from "@/components/PiPaymentButton";
import { usePiAuth } from "@/contexts/PiAuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PricingTier {
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
  memo: string;
}

const tiers: PricingTier[] = [
  {
    name: "Basic",
    description: "Essential verification for small businesses",
    price: 1,
    icon: <Zap className="h-6 w-6" />,
    memo: "Basic Verification Plan",
    features: [
      "5 verifications per month",
      "Standard processing speed",
      "Email support",
      "Basic analytics",
    ],
  },
  {
    name: "Professional",
    description: "Advanced features for growing businesses",
    price: 5,
    icon: <Shield className="h-6 w-6" />,
    memo: "Professional Verification Plan",
    popular: true,
    features: [
      "50 verifications per month",
      "Priority processing",
      "API access",
      "Detailed analytics",
      "Batch verification",
      "24/7 support",
    ],
  },
  {
    name: "Enterprise",
    description: "Unlimited power for large organizations",
    price: 20,
    icon: <Crown className="h-6 w-6" />,
    memo: "Enterprise Verification Plan",
    features: [
      "Unlimited verifications",
      "Instant processing",
      "Full API access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "White-label options",
    ],
  },
];

export const PricingTable = () => {
  const { user } = usePiAuth();

  const handlePaymentSuccess = (tierName: string) => {
    toast.success(`Successfully purchased ${tierName} plan!`, {
      description: "Your account has been upgraded.",
    });
  };

  const handlePaymentError = (error: Error) => {
    toast.error("Payment failed", {
      description: error.message,
    });
  };

  return (
    <section id="features" className="w-full max-w-6xl mx-auto py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the verification tier that best fits your business needs. Pay securely with Pi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={`relative flex flex-col ${
              tier.popular
                ? "border-primary shadow-lg shadow-primary/20 scale-105"
                : "border-border"
            }`}
          >
            {tier.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}

            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-3">
                {tier.icon}
              </div>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                <span className="text-2xl font-semibold text-primary ml-1">π</span>
                <span className="text-muted-foreground text-sm block mt-1">per month</span>
              </div>

              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {user ? (
                <PiPaymentButton
                  amount={tier.price}
                  memo={tier.memo}
                  metadata={{ tier: tier.name }}
                  onSuccess={() => handlePaymentSuccess(tier.name)}
                  onError={handlePaymentError}
                  className={`w-full ${
                    tier.popular
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                >
                  Get {tier.name}
                </PiPaymentButton>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Sign in to purchase
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};
