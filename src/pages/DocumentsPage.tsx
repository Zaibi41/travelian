import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Eye, Trash2 } from "lucide-react";

const mockDocs = [
  { id: 'd1', name: 'passport_ali_raza.pdf', type: 'Passport', bookingId: 'b1', uploadedBy: 'Ali Raza', size: '2.4 MB', uploadedAt: '2025-03-01' },
  { id: 'd2', name: 'visa_aisha_begum.pdf', type: 'Visa', bookingId: 'b2', uploadedBy: 'Al Hijaz Tours', size: '1.8 MB', uploadedAt: '2025-03-10' },
  { id: 'd3', name: 'ticket_usman_sheikh.pdf', type: 'Ticket', bookingId: 'b3', uploadedBy: 'Safar Tours', size: '0.9 MB', uploadedAt: '2025-03-15' },
  { id: 'd4', name: 'passport_khadija_noor.pdf', type: 'Passport', bookingId: 'b4', uploadedBy: 'Khadija Noor', size: '3.1 MB', uploadedAt: '2025-02-28' },
  { id: 'd5', name: 'hotel_voucher_b2.pdf', type: 'Voucher', bookingId: 'b2', uploadedBy: 'System', size: '0.5 MB', uploadedAt: '2025-03-12' },
];

const typeIcon: Record<string, string> = {
  Passport: 'bg-info/10 text-info',
  Visa: 'bg-success/10 text-success',
  Ticket: 'bg-warning/10 text-warning',
  Voucher: 'bg-accent text-accent-foreground',
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Documents</h1>
          <p className="text-sm text-muted-foreground">Manage passports, visas, tickets, and vouchers</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Upload className="h-4 w-4" /> Upload Document
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Document</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Booking</th>
                  <th className="p-3 font-medium">Uploaded By</th>
                  <th className="p-3 font-medium">Size</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockDocs.map(doc => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded flex items-center justify-center ${typeIcon[doc.type] || 'bg-muted'}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </td>
                    <td className="p-3">{doc.type}</td>
                    <td className="p-3 font-mono text-xs">{doc.bookingId}</td>
                    <td className="p-3 text-muted-foreground">{doc.uploadedBy}</td>
                    <td className="p-3 text-muted-foreground">{doc.size}</td>
                    <td className="p-3 text-muted-foreground">{doc.uploadedAt}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
