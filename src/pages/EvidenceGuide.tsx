import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/BackButton";
import { Wallet, Upload, ShieldCheck, FileImage, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <div className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
      {n}
    </div>
    <div className="flex-1 space-y-1">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground space-y-1.5">{children}</div>
    </div>
  </div>
);

const WalletGuide = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Connect your wallet (one-time)</CardTitle>
      <CardDescription>You need a free MetaMask wallet to sign evidence on the blockchain. Takes 3 minutes.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Step n={1} title="Install MetaMask">
        <p>On a computer, go to <a className="text-accent underline" href="https://metamask.io/download" target="_blank" rel="noreferrer">metamask.io/download</a> and add the browser extension. On phone, install the MetaMask app from the App Store / Play Store.</p>
      </Step>
      <Step n={2} title="Create a wallet">
        <p>Pick "Create a new wallet", set a password, then carefully write down your 12-word secret recovery phrase on paper. <strong>Never share it.</strong> AmaanChain will never ask for it.</p>
      </Step>
      <Step n={3} title="Switch to the Sepolia test network">
        <p>AmaanChain uses Sepolia (a free test blockchain). The app switches the network for you automatically the first time you upload — just approve the popup.</p>
      </Step>
      <Step n={4} title="Get free test ETH (one-time)">
        <p>Open a faucet like <a className="text-accent underline" href="https://sepoliafaucet.com" target="_blank" rel="noreferrer">sepoliafaucet.com</a> or <a className="text-accent underline" href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noreferrer">Alchemy's faucet</a>, paste your wallet address, and request a small amount. Enough for ~100 uploads.</p>
      </Step>
      <Step n={5} title="Save your wallet address in Profile">
        <p>Go to <Link to="/profile" className="text-accent underline">Profile</Link> and paste your wallet address. AmaanChain uses it to tag your future uploads on-chain.</p>
      </Step>
    </CardContent>
  </Card>
);

const UploadFlow = ({ role }: { role: "user" | "responder" | "admin" }) => {
  const purpose = {
    user: "Add photos or videos of an incident as tamper-proof proof.",
    responder: "Document the scene after you accept an alert — before / during / after photos.",
    admin: "Upload audit reports, internal documents, or override evidence on any case.",
  }[role];
  const where = {
    user: <>From <Link to="/evidence" className="text-accent underline">Upload Evidence</Link> in the sidebar (standalone), or expand any alert in your history and use the upload form.</>,
    responder: <>From <Link to="/responder/evidence" className="text-accent underline">Upload Evidence</Link>, or from any active alert card on the Responder dashboard.</>,
    admin: <>From the Admin dashboard → Evidence section, or from any alert detail.</>,
  }[role];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Upload evidence — step by step</CardTitle>
        <CardDescription>{purpose}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Step n={1} title="Open the upload screen">
          <p>{where}</p>
        </Step>
        <Step n={2} title="Pick your file">
          <p>Choose any image, short video, or PDF. Max size <strong>25 MB</strong>. Add a short title and description so others know what it shows.</p>
        </Step>
        <Step n={3} title="Click "Upload to IPFS + Sepolia"">
          <p>The app will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Send the file to <strong>IPFS</strong> (decentralised storage). It can never be silently changed.</li>
            <li>Compute a SHA-256 fingerprint of the file.</li>
            <li>Open MetaMask asking you to sign a tiny blockchain transaction containing that fingerprint.</li>
          </ul>
        </Step>
        <Step n={4} title="Approve the MetaMask popup">
          <p>Click <strong>Confirm</strong>. Network fee is a few cents of test ETH. Wait ~10 seconds for the transaction to be mined.</p>
        </Step>
        <Step n={5} title="Done — proof is permanent">
          <p>You'll see a green success toast. The record now appears in your evidence list with two links:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>IPFS</strong> — opens the file itself.</li>
            <li><strong>Sepolia tx</strong> — opens Etherscan showing the timestamp + your wallet that signed it.</li>
          </ul>
        </Step>
      </CardContent>
    </Card>
  );
};

const RolePanel = ({ role }: { role: "user" | "responder" | "admin" }) => (
  <div className="space-y-4">
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="pt-5 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm">
          <strong className="capitalize">{role}</strong> guide. Every evidence file is stored on IPFS (so it can't be deleted from a single server)
          <strong> and</strong> its fingerprint is anchored on the Sepolia blockchain (so the timestamp and uploader cannot be faked).
        </div>
      </CardContent>
    </Card>
    <WalletGuide />
    <UploadFlow role={role} />
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Verify / view evidence later</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="flex items-start gap-2"><FileImage className="h-4 w-4 mt-0.5 text-accent" /> Anyone with the IPFS link can view the file — it stays available even if our servers go offline.</p>
        <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-success" /> The Sepolia tx link proves <em>when</em> the file existed and <em>which wallet</em> uploaded it. Re-uploading a modified file produces a different fingerprint, so tampering is instantly visible.</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Troubleshooting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p><strong className="text-foreground">"MetaMask not detected"</strong> — install the extension/app, then refresh the page.</p>
        <p><strong className="text-foreground">Popup didn't appear</strong> — click the MetaMask icon in your browser; the request may be queued.</p>
        <p><strong className="text-foreground">"Insufficient funds"</strong> — get more free test ETH from a Sepolia faucet (see step 4 above).</p>
        <p><strong className="text-foreground">Upload stuck on "Uploading to IPFS…"</strong> — large files take longer; try a smaller file or better connection.</p>
      </CardContent>
    </Card>
    <div className="flex justify-end">
      <Button asChild>
        <Link to={role === "responder" ? "/responder/evidence" : "/evidence"}>
          <Upload className="h-4 w-4 mr-2" /> Open Upload Evidence
        </Link>
      </Button>
    </div>
  </div>
);

const EvidenceGuide = () => {
  const { primaryRole } = useAuth();
  const def = primaryRole;
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <BackButton />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Evidence Upload Guide</h1>
        <p className="text-muted-foreground">Step-by-step instructions for connecting your wallet and anchoring evidence on the blockchain.</p>
        <Badge variant="outline" className="mt-2 capitalize">Your role: {primaryRole}</Badge>
      </div>
      <Tabs defaultValue={def}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="user">For Users</TabsTrigger>
          <TabsTrigger value="responder">For Responders</TabsTrigger>
          <TabsTrigger value="admin">For Admin</TabsTrigger>
        </TabsList>
        <TabsContent value="user" className="mt-4"><RolePanel role="user" /></TabsContent>
        <TabsContent value="responder" className="mt-4"><RolePanel role="responder" /></TabsContent>
        <TabsContent value="admin" className="mt-4"><RolePanel role="admin" /></TabsContent>
      </Tabs>
    </div>
  );
};

export default EvidenceGuide;
