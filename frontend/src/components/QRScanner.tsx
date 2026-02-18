"use client";

import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function QRScanner() {
    const router = useRouter();
    const [scanResult, setScanResult] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0], // 0 means camera only (no file upload)
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                aspectRatio: 1.0, 
                showTorchButtonIfSupported: true,
                rememberLastUsedCamera: true
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                scanner.clear();
                setScanResult(decodedText);
                handleScan(decodedText);
            },
            (errorMessage) => {
                // handle scan error or ignore
            }
        );

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, []);

    const handleScan = (data: string) => {
        // data might be a full URL (http://locahost:3000/store/xyz) or just the ID (xyz)
        // We need to parse it.
        try {
            console.log("Scanned:", data);
            
            // If it's a full URL and belongs to our app
            if (data.includes("/store/")) {
                const parts = data.split("/store/");
                if (parts.length > 1) {
                    const qrCode = parts[1];
                    router.push(`/store/${qrCode}`);
                    return;
                }
            }
            
            // Assume it's just the code if not a URL
            router.push(`/store/${data}`);
        } catch (err) {
            console.error(err);
            alert("Invalid QR Code");
        }
    };

    return (
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 relative">
             <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2 z-50 text-white"
                onClick={() => router.back()}
            >
                <X />
            </Button>
            <CardHeader>
                <CardTitle className="text-center text-white">Scan Store QR</CardTitle>
            </CardHeader>
            <CardContent>
                <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
                {scanResult && <p className="text-center text-green-500 mt-4">Found: {scanResult}</p>}
                <p className="text-center text-gray-500 text-sm mt-4">Point your camera at a QueueLess QR Code</p>
            </CardContent>
        </Card>
    );
}
