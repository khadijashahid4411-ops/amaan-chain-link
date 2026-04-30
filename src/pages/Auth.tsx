import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldAlert, Loader2, Wallet, RefreshCw } from "lucide-react";
import { z } from "zod";
import { PAKISTAN_AREAS } from "@/lib/pakistan-areas";
import { HARDHAT_ACCOUNTS, randomHardhatAddress } from "@/lib/hardhat-wallets";

const cnicRegex = /^\d{5}-?\d{7}-?\d$/; // 35202-1234567-1
const walletRegex = /^0x[a-fA-F0-9]{40}$/;
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin12345!";

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Full name is required").max(60),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  phone: z.string().trim().min(7, "Phone is required").max(20),
  cnic: z.string().trim().regex(cnicRegex, "CNIC format: 35202-1234567-1"),
  address: z.string().trim().min(3, "Address is required").max(200),
  area: z.string().min(1, "Select your area"),
  walletAddress: z.string().regex(walletRegex, "Wallet must be 0x + 40 hex chars"),
  roleIntent: z.enum(["user", "responder"]),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(() => randomHardhatAddress());
  const [area, setArea] = useState<string>("");
  const [roleIntent, setRoleIntent] = useState<"user" | "responder">("user");

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      if (parsed.data.email.toLowerCase() === ADMIN_EMAIL && parsed.data.password === ADMIN_PASSWORD) {
        const { data: adminData, error: adminErr } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: "AmaanChain Admin",
              phone: "03000000000",
              cnic: "00000-0000000-0",
              address: "Admin Command Center",
              area: "Islamabad",
              wallet_address: HARDHAT_ACCOUNTS[0],
              role_intent: "user",
            },
          },
        });
        setLoading(false);
        if (adminErr) {
          toast.error(adminErr.message);
          return;
        }
        if (adminData.session) await supabase.auth.setSession(adminData.session);
        toast.success("Admin account ready");
        navigate("/admin");
        return;
      }
      setLoading(false);
      const msg = error.message.toLowerCase().includes("email not confirmed")
        ? "Please confirm your email or sign up again."
        : error.message;
      toast.error(msg);
      return;
    }
    toast.success("Welcome back");
    navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      displayName: fd.get("displayName"),
      email: fd.get("email"),
      password: fd.get("password"),
      phone: fd.get("phone"),
      cnic: fd.get("cnic"),
      address: fd.get("address"),
      area,
      walletAddress: wallet,
      roleIntent,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: parsed.data.displayName,
          phone: parsed.data.phone,
          cnic: parsed.data.cnic,
          address: parsed.data.address,
          area: parsed.data.area,
          wallet_address: parsed.data.walletAddress,
          role_intent: parsed.data.roleIntent,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    setLoading(false);
    if (!data.session) {
      toast.success("Account created — please sign in");
      return;
    }
    await supabase.auth.setSession(data.session);
    toast.success("Welcome to AmaanChain");
    navigate(parsed.data.email.toLowerCase() === ADMIN_EMAIL ? "/admin" : "/");
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  const areas = useMemo(() => PAKISTAN_AREAS, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-command bg-gradient-glow p-4">
      <div className="w-full max-w-md space-y-6 py-8">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-emergency shadow-emergency mb-4">
            <ShieldAlert className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">AmaanChain</h1>
          <p className="text-sm text-primary-foreground/70 mt-1">
            Emergency response, secured by blockchain
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Access the network</CardTitle>
            <CardDescription>Sign in or create your AmaanChain account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pass">Password</Label>
                    <Input
                      id="si-pass"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" name="displayName" required maxLength={60} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pass">Password</Label>
                    <Input
                      id="su-pass"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-phone">Phone</Label>
                      <Input id="su-phone" name="phone" type="tel" required maxLength={20} placeholder="03xx-xxxxxxx" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-cnic">CNIC</Label>
                      <Input id="su-cnic" name="cnic" required maxLength={15} placeholder="35202-1234567-1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-area">Area</Label>
                    <Select value={area} onValueChange={setArea}>
                      <SelectTrigger id="su-area">
                        <SelectValue placeholder="Select your city / area" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {areas.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-address">Address</Label>
                    <Textarea
                      id="su-address"
                      name="address"
                      required
                      maxLength={200}
                      rows={2}
                      placeholder="Street, block, landmark…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-wallet" className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" /> Wallet address
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="su-wallet"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value.trim())}
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setWallet(randomHardhatAddress())}
                        title="Pick another Hardhat test wallet"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-filled from Hardhat test accounts. Paste your own MetaMask address to override.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={roleIntent} onValueChange={(v) => setRoleIntent(v as typeof roleIntent)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User — request emergency help</SelectItem>
                        <SelectItem value="responder">Responder — accept emergency alerts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
