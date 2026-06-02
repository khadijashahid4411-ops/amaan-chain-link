import { BackButton } from "@/components/BackButton";
import { BecomeResponder } from "@/components/BecomeResponder";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const BecomeResponderPage = () => {
  const { roles } = useAuth();
  const isResponder = roles.includes("responder");

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <BackButton />
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-accent" /> Become a Responder
        </h1>
        <p className="text-muted-foreground">
          Apply to join the responder network — admins will review your request.
        </p>
      </header>

      {isResponder ? (
        <Card className="border-success">
          <CardContent className="py-10 text-center text-success">
            You're already an approved responder. Open the Responder dashboard from the sidebar.
          </CardContent>
        </Card>
      ) : (
        <BecomeResponder />
      )}
    </div>
  );
};

export default BecomeResponderPage;
