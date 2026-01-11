import { Crown, Zap, Shield, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { usePiAuth } from "@/contexts/PiAuthContext";
import { format } from "date-fns";

const tierIcons = {
  free: <Zap className="h-5 w-5" />,
  basic: <Zap className="h-5 w-5" />,
  professional: <Shield className="h-5 w-5" />,
  enterprise: <Crown className="h-5 w-5" />,
};

const tierColors = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  professional: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  enterprise: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export const SubscriptionManagement = () => {
  const { subscription, isLoading, refetch, tierConfig } = useSubscription();
  const { user } = usePiAuth();

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const tier = subscription.tier;
  const config = tierConfig[tier];
  const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date();
  const usagePercent = tier === 'enterprise' 
    ? 0 
    : Math.min((subscription.verifications_used / subscription.verifications_limit) * 100, 100);
  const remainingVerifications = tier === 'enterprise'
    ? '∞'
    : Math.max(0, subscription.verifications_limit - subscription.verifications_used);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('features');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Card className="w-full max-w-md border-border/50 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${tierColors[tier]}`}>
              {tierIcons[tier]}
            </div>
            <div>
              <CardTitle className="text-lg">Your Plan</CardTitle>
              <CardDescription className="text-xs">
                {user?.username ? `@${user.username}` : 'Anonymous User'}
              </CardDescription>
            </div>
          </div>
          <Badge className={tierColors[tier]}>
            {config.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Usage Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verifications Used</span>
            <span className="font-medium">
              {subscription.verifications_used} / {tier === 'enterprise' ? '∞' : subscription.verifications_limit}
            </span>
          </div>
          {tier !== 'enterprise' && (
            <Progress value={usagePercent} className="h-2" />
          )}
          <p className="text-xs text-muted-foreground">
            {tier === 'enterprise' 
              ? 'Unlimited verifications available'
              : `${remainingVerifications} verifications remaining`
            }
          </p>
        </div>

        {/* Expiration Warning */}
        {isExpired && tier !== 'free' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Your subscription has expired. Renew to continue.</span>
          </div>
        )}

        {/* Subscription Details */}
        {tier !== 'free' && subscription.expires_at && !isExpired && (
          <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">
              {subscription.billing_period === 'annual' ? 'Annual' : 'Monthly'} subscription
            </span>
            <span className="text-foreground">
              Expires {format(new Date(subscription.expires_at), 'MMM d, yyyy')}
            </span>
          </div>
        )}

        {/* Features List */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Plan Features
          </p>
          <ul className="space-y-1.5">
            {tier === 'free' && (
              <>
                <FeatureItem>1 verification per month</FeatureItem>
                <FeatureItem>Standard processing</FeatureItem>
              </>
            )}
            {tier === 'basic' && (
              <>
                <FeatureItem>5 verifications per month</FeatureItem>
                <FeatureItem>Standard processing</FeatureItem>
                <FeatureItem>Email support</FeatureItem>
              </>
            )}
            {tier === 'professional' && (
              <>
                <FeatureItem>50 verifications per month</FeatureItem>
                <FeatureItem>Priority processing</FeatureItem>
                <FeatureItem>API access</FeatureItem>
                <FeatureItem>24/7 support</FeatureItem>
              </>
            )}
            {tier === 'enterprise' && (
              <>
                <FeatureItem>Unlimited verifications</FeatureItem>
                <FeatureItem>Instant processing</FeatureItem>
                <FeatureItem>Full API access</FeatureItem>
                <FeatureItem>Dedicated account manager</FeatureItem>
              </>
            )}
          </ul>
        </div>

        {/* Upgrade Button */}
        {tier !== 'enterprise' && (
          <Button 
            onClick={scrollToPricing}
            variant={tier === 'free' ? 'default' : 'outline'}
            className="w-full"
          >
            {tier === 'free' ? 'Upgrade Now' : 'Change Plan'}
          </Button>
        )}

        {/* Refresh Button */}
        <Button 
          onClick={refetch}
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
};

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-center gap-2 text-sm text-muted-foreground">
    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
    {children}
  </li>
);
