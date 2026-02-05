import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThresholdInputsProps {
  minTransactions: string;
  minCreditedTransactions: string;
  minUniqueWallets: string;
  onMinTransactionsChange: (value: string) => void;
  onMinCreditedTransactionsChange: (value: string) => void;
  onMinUniqueWalletsChange: (value: string) => void;
}

export const ThresholdInputs = ({
  minTransactions,
  minCreditedTransactions,
  minUniqueWallets,
  onMinTransactionsChange,
  onMinCreditedTransactionsChange,
  onMinUniqueWalletsChange,
}: ThresholdInputsProps) => {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="minTransactions" className="text-foreground flex items-center gap-1.5">
          Min Total Transactions
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Total number of transactions (both incoming and outgoing) associated with this wallet address.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="minTransactions"
          type="number"
          min="1"
          placeholder="100"
          value={minTransactions}
          onChange={(e) => onMinTransactionsChange(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">Default: 100</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minCreditedTransactions" className="text-foreground flex items-center gap-1.5">
          Min Credited Transactions
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Credited transactions are payments <strong>received</strong> by this wallet (incoming Pi). This helps verify real business activity from customers.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="minCreditedTransactions"
          type="number"
          min="1"
          placeholder="50"
          value={minCreditedTransactions}
          onChange={(e) => onMinCreditedTransactionsChange(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">Default: 50</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minUniqueWallets" className="text-foreground flex items-center gap-1.5">
          Min Unique Wallets
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Number of distinct wallet addresses that have transacted with this business. Higher counts indicate a broader customer base.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="minUniqueWallets"
          type="number"
          min="1"
          placeholder="10"
          value={minUniqueWallets}
          onChange={(e) => onMinUniqueWalletsChange(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">Default: 10</p>
      </div>
    </div>
  );
};
