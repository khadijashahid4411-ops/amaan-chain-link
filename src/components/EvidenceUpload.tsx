import { useEffect, useState } from "react";
import { useWallet, SEPOLIA_CHAIN_ID } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  alertId?: string | null;
  onUploaded?: () => void;
}

export const EvidenceUpload = ({ alertId, onUploaded }: Props) => {
  const { primaryRole } = useAuth();
  const wallet = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [profileWallet, setProfileWallet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>("");

  useEffect(() => {
    supabase.rpc("get_my_profile").then(({ data }) => {
      setProfileWallet(data?.[0]?.wallet_address ?? null);
    });
  }, []);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setBusy(true);
    try {
      // 1. Connect wallet (Sepolia)
      setStep("Connecting wallet…");
      const w = await wallet.connect();
      if (!w) {
        setBusy(false);
        return;
      }

      // 2. Upload to IPFS via edge function
      setStep("Uploading to IPFS…");
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("upload-evidence", { body: fd });
      if (error || !data?.ipfsCid) throw new Error(error?.message ?? "IPFS upload failed");

      // 3. Anchor hash on-chain
      setStep("Confirming blockchain transaction…");
      const txHash = await wallet.anchorEvidence(w.signer, data.fileHash, alertId ?? "standalone");

      // 4. Save to database
      setStep("Saving record…");
      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("evidence").insert({
        alert_id: alertId ?? null,
        uploaded_by: userData.user!.id,
        uploader_role: primaryRole,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
        ipfs_cid: data.ipfsCid,
        ipfs_url: data.ipfsUrl,
        file_hash: data.fileHash,
        title: title.trim() || null,
        description: description.trim() || null,
        wallet_address: profileWallet ?? w.address,
        tx_hash: txHash,
        chain_id: SEPOLIA_CHAIN_ID,
        status: "verified",
      });
      if (insErr) throw insErr;

      toast.success("Evidence anchored on Sepolia");
      setFile(null);
      setTitle("");
      setDescription("");
      onUploaded?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
      setStep("");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-accent" />
          Add blockchain-verified evidence
        </div>
        <div className="space-y-2">
          <Label htmlFor={`t-${alertId}`}>Title (optional)</Label>
          <Input id={`t-${alertId}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} disabled={busy} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`d-${alertId}`}>Description (optional)</Label>
          <Textarea id={`d-${alertId}`} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={240} disabled={busy} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`f-${alertId}`}>File (image, video, document — max 25MB)</Label>
          <Input
            id={`f-${alertId}`}
            type="file"
            accept="image/*,video/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
        </div>
        <Button onClick={handleUpload} disabled={!file || busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {busy ? step : "Upload to IPFS + Sepolia"}
        </Button>
        <p className="text-xs text-muted-foreground">
          File goes to IPFS (Pinata). Profile wallet {profileWallet ? profileWallet.slice(0, 8) + "…" : "will be used when saved"}. A SHA-256 hash + alert ID is signed on Sepolia testnet —
          providing tamper-proof timestamped proof. <ExternalLink className="inline h-3 w-3" />
        </p>
      </CardContent>
    </Card>
  );
};
