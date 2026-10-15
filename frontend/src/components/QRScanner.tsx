"use client";

import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { Camera, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QRScanner() {
  const router = useRouter();
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const handleScan = (data: string) => {
    try {
      if (data.includes("/store/")) {
        const parts = data.split("/store/");
        if (parts.length > 1 && parts[1]) {
          router.push(`/store/${parts[1]}`);
          return;
        }
      }
      router.push(`/store/${data.trim()}`);
    } catch {
      toast.error("Invalid QR code format");
    }
  };

  useEffect(() => {
    setHasCameraError(false);

    try {
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          supportedScanTypes: [0],
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true
        },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          scanner.clear();
          setScanResult(decodedText);
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Camera permission or feed issues
          if (errorMessage?.includes("NotAllowedError") || errorMessage?.includes("Permission denied")) {
            setHasCameraError(true);
          }
        }
      );
    } catch (e) {
      setHasCameraError(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [scanKey]);

  return (
    <Card className="w-full bg-[#101A32] border-[#203052] shadow-xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mx-auto mb-2">
          <Camera className="w-5 h-5" />
        </div>
        <CardTitle className="text-base font-bold text-[#ECF2FF]">
          Point Camera at QR
        </CardTitle>
        <CardDescription className="text-xs text-[#889DC2]">
          Hold steady inside the viewfinder frame.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {hasCameraError ? (
          <div className="p-6 text-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#ECF2FF] mb-1">
              Camera Access Required
            </h4>
            <p className="text-xs text-[#889DC2] mb-4">
              Please grant camera permissions in your browser or switch to manual store code entry above.
            </p>
            <Button
              size="sm"
              onClick={() => setScanKey(prev => prev + 1)}
              variant="outline"
              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Retry Camera
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div
              id="reader"
              className="w-full overflow-hidden rounded-xl bg-[#050B18] border border-[#203052]"
            />
            {scanResult && (
              <p className="text-center text-xs font-semibold text-emerald-400 mt-3">
                Detected: {scanResult}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
