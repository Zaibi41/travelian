import { useId, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldShell, Input, Textarea } from "@/components/ui/field";
import { ContactError, sendContactMessage } from "@/lib/contact-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 ()-]{6,19}$/;
type Errors = Partial<Record<"name" | "reply" | "email" | "phone" | "message", string>>;

/** gateway#114: "Send us a message" on /contact. Name, email and/or mobile, message; sent to the team (admin + email). */
export function ContactForm() {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // spam trap: hidden from people
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState("");

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Enter your name.";
    if (!email.trim() && !phone.trim()) next.reply = "Add an email address or a mobile number so we can reply.";
    if (email.trim() && !EMAIL.test(email.trim())) next.email = "Enter a valid email address, e.g. name@example.com.";
    if (phone.trim() && !PHONE.test(phone.trim())) next.phone = "Enter a mobile number in digits, e.g. 03001234567.";
    if (message.trim().length < 10) next.message = "Tell us a little more (at least 10 characters).";
    return next;
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0] === "reply" ? "email" : Object.keys(found)[0]}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      setDone(await sendContactMessage({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, message: message.trim(),
        website: website || null }));
      setStatus("sent");
    } catch (error) {
      setProblem(error instanceof ContactError ? error.message : "Your message couldn't be sent right now. Please try again, or message us on WhatsApp.");
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-foreground">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div className="space-y-2">
          <p className="font-semibold">Message sent</p>
          <p className="text-muted-foreground">{done}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { setStatus("idle"); setMessage(""); }}>Send another message</Button>
        </div>
      </div>
    );
  }

  const describe = (field: keyof Errors) => (errors[field] ? `${id}-${field}-error` : undefined);
  return (
    <form noValidate aria-label="Send us a message" className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <FieldShell id={`${id}-name`} label="Your name" error={errors.name} className="sm:col-span-2">
        <Input id={`${id}-name`} autoComplete="name" maxLength={80} value={name} aria-invalid={!!errors.name} aria-describedby={describe("name")}
          onChange={event => setName(event.target.value)} />
      </FieldShell>
      <FieldShell id={`${id}-email`} label="Email" error={errors.email}>
        <Input id={`${id}-email`} type="email" autoComplete="email" maxLength={120} value={email} placeholder="name@example.com"
          aria-invalid={!!(errors.email || errors.reply)} aria-describedby={errors.email ? describe("email") : errors.reply ? `${id}-reply` : `${id}-reply-hint`}
          onChange={event => setEmail(event.target.value)} />
      </FieldShell>
      <FieldShell id={`${id}-phone`} label="Mobile number" error={errors.phone}>
        <Input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={phone} placeholder="03001234567"
          aria-invalid={!!(errors.phone || errors.reply)} aria-describedby={errors.phone ? describe("phone") : errors.reply ? `${id}-reply` : `${id}-reply-hint`}
          onChange={event => setPhone(event.target.value)} />
      </FieldShell>
      {errors.reply
        ? <p id={`${id}-reply`} role="alert" className="-mt-2 text-label text-destructive sm:col-span-2">{errors.reply}</p>
        : <p id={`${id}-reply-hint`} className="-mt-2 text-helper text-muted-foreground sm:col-span-2">An email or a mobile number, so we can reply.</p>}
      <FieldShell id={`${id}-message`} label="Message" error={errors.message} className="sm:col-span-2"
        hint={`${message.length}/2000 · Include your booking reference or PNR if it's about an existing booking.`}>
        <Textarea id={`${id}-message`} rows={5} maxLength={2000} value={message} aria-invalid={!!errors.message}
          aria-describedby={errors.message ? describe("message") : `${id}-message-hint`} onChange={event => setMessage(event.target.value)} />
      </FieldShell>
      {/* Spam trap: people never see or fill this. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
      </div>
      {problem && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{problem}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={status === "sending"} className="min-h-11 w-full sm:w-auto">
          {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…</> : "Send message"}
        </Button>
      </div>
    </form>
  );
}
