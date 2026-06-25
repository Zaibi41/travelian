import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GROUP_TICKET_COLLECTIONS } from "@/lib/group-ticketing";
import { ExternalLink, KeyRound, Tickets } from "lucide-react";

export default function GroupTicketingCollectionsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Group Ticketing Collections</h1>
          <p className="text-sm text-muted-foreground">
            Public collection names shown on the website map to these supplier integrations.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/group-ticketing" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> View public page
          </Link>
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Tickets className="h-5 w-5 text-primary" />
            Collection → supplier mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Public label</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Provider ID</TableHead>
                <TableHead>Category slug</TableHead>
                <TableHead>Secret</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GROUP_TICKET_COLLECTIONS.map((collection) => (
                <TableRow key={collection.slug}>
                  <TableCell className="font-medium">{collection.publicLabel}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{collection.supplierName}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{collection.providerId}</TableCell>
                  <TableCell className="font-mono text-xs">{collection.slug}</TableCell>
                  <TableCell>
                    <Link
                      to="/admin/secrets"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {collection.secretId}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-muted shadow-card">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Customers only see the public collection names (for example, Group Collection 1). Supplier names are hidden on the public site and shown here for admin reference.
        </CardContent>
      </Card>
    </div>
  );
}
