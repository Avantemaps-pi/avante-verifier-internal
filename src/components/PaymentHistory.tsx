import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt, ChevronDown, ChevronUp, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePiAuth } from "@/contexts/PiAuthContext";

// Get or create a persistent session ID for anonymous users
function getOrCreateSessionId(): string {
  const STORAGE_KEY = 'verificationSessionId';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = `session_${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
}

interface PaymentRecord {
  id: string;
  payment_id: string;
  amount: number;
  memo: string | null;
  status: string;
  txid: string | null;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export const PaymentHistory = () => {
  const { user } = usePiAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const getExternalUserId = (): string => {
    if (user?.uid) {
      return user.uid;
    }
    return getOrCreateSessionId();
  };

  const fetchPaymentHistory = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const externalUserId = getExternalUserId();
      const { data, error } = await supabase.functions.invoke('get-payment-history', {
        body: { externalUserId, page, pageSize: PAGE_SIZE },
      });

      if (error) {
        console.error('Failed to fetch payment history:', error);
        return;
      }

      if (data?.success) {
        setPayments(data.data || []);
        setPagination(data.pagination || null);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Payment history error:', error);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  const handleToggle = () => {
    if (!hasLoaded) {
      fetchPaymentHistory();
    }
    setIsExpanded(!isExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full max-w-2xl p-6 bg-gradient-to-br from-card to-card/50 border-border/50 backdrop-blur-sm">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
            <p className="text-sm text-muted-foreground">View your past transactions</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading payments...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No payment records found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Your premium feature purchases will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 rounded-lg bg-background/50 border border-border/30 hover:border-border/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {payment.amount} π
                        </span>
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      {payment.memo && (
                        <p className="text-sm text-muted-foreground truncate">
                          {payment.memo}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                    {payment.txid && (
                      <a
                        href={`https://pi.blockexplorer.com/tx/${payment.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border/30">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {pagination.totalPages} ({pagination.totalRecords} records)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPaymentHistory(currentPage - 1)}
                      disabled={isLoading || currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPaymentHistory(currentPage + 1)}
                      disabled={isLoading || currentPage >= pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next</span>
                    </Button>
                  </div>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchPaymentHistory(currentPage)}
                className="w-full mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Refresh
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
