'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { useApi } from '@/hooks/use-api';
import type { DisplaySettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';

function extractAssetTag(decodedText: string): string {
  try {
    const url = new URL(decodedText);
    const segments = url.pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] ?? decodedText);
  } catch {
    return decodedText.trim();
  }
}

export default function ScanPage() {
  const router = useRouter();
  const { data: displaySettings, loading: settingsLoading } = useApi<DisplaySettingsRecord>('/settings/display');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTag, setManualTag] = useState('');

  function stopCamera() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      tick();
    } catch {
      setError('Could not access the camera. Check permissions, or type the asset tag below.');
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      stopCamera();
      router.push(`/scan/${encodeURIComponent(extractAssetTag(code.data))}`);
      return;
    }

    frameRef.current = requestAnimationFrame(tick);
  }

  function onManualSubmit() {
    if (manualTag.trim()) router.push(`/scan/${encodeURIComponent(manualTag.trim())}`);
  }

  if (settingsLoading) return <PageLoading />;

  if (!displaySettings?.scanEnabled) {
    return (
      <div className="max-w-md">
        <PageHeader title="Scan Asset" />
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Asset scanning has not been enabled by your administrator.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <PageHeader title="Scan Asset" description="Scan a QR label with your camera, or enter the asset tag manually." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}

          {!scanning ? (
            <Button onClick={startCamera} className="mb-4 w-full">
              Start Camera
            </Button>
          ) : (
            <Button variant="secondary" onClick={stopCamera} className="mb-4 w-full">
              Stop Camera
            </Button>
          )}

          <div className="mb-4 overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="w-full" playsInline muted />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="border-t border-slate-200 pt-4">
            <Field>
              <Label htmlFor="manualTag">Or enter asset tag</Label>
              <Input
                id="manualTag"
                value={manualTag}
                onChange={(e) => setManualTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onManualSubmit()}
                placeholder="e.g. LAP-00001"
              />
            </Field>
            <Button variant="secondary" onClick={onManualSubmit} className="w-full">
              Look Up
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
