import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Apple, Chrome } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const Install = () => (
  <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
    <BackButton />
    <header>
      <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
        <Smartphone className="h-7 w-7 text-primary" /> Install AmaanChain
      </h1>
      <p className="text-muted-foreground">Get instant access from your home screen.</p>
    </header>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Apple className="h-5 w-5" /> iPhone / iPad</CardTitle>
        <CardDescription>Safari only — Chrome on iOS doesn't support installs.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p>1. Tap the <strong>Share</strong> icon in Safari's bottom bar.</p>
        <p>2. Scroll and tap <strong>"Add to Home Screen"</strong>.</p>
        <p>3. Tap <strong>Add</strong>. AmaanChain appears like a native app.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Chrome className="h-5 w-5" /> Android</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p>1. Open this site in Chrome.</p>
        <p>2. Tap the <strong>⋮ menu</strong> in the top-right.</p>
        <p>3. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
      </CardContent>
    </Card>

    <Card className="bg-muted/30 border-dashed">
      <CardContent className="pt-6 text-sm text-muted-foreground">
        Once installed, AmaanChain runs full-screen, sends location to dispatch responders, and
        can be wrapped to a real APK/IPA later via Capacitor for App Store / Play Store distribution.
      </CardContent>
    </Card>
  </div>
);

export default Install;
