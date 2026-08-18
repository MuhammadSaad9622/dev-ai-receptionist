import { apiServer } from "@/lib/api-server";
import type { Quote } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteStatusBadge } from "@/components/status-badge";
import { QuoteStatusMenu } from "@/components/quote-status-menu";
import { formatCurrency, formatDateTime, formatPhone } from "@/lib/format";

export default async function QuotesPage() {
  const quotes = await apiServer<Quote[]>("/quotes");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Quotes</h1>
        <p className="text-sm text-muted-foreground">
          Open estimates and their follow-up status.
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No quotes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {quote.customer.name || formatPhone(quote.customer.phone)}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(quote.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{quote.description}</p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatCurrency(quote.amountCents)}
                </p>
                <QuoteStatusBadge status={quote.status} />
                <QuoteStatusMenu quoteId={quote.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
