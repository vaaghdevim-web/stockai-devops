import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { Button, Modal } from '../common'

interface PalletCameraScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

function cameraError(error: unknown) {
  const name = error instanceof Error || error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access in your browser settings, then reopen the scanner.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No usable camera was found. You can still type a code or use a handheld scanner.'
  }
  if (name === 'NotReadableError') {
    return 'The camera is unavailable or in use by another application. Close that application and try again.'
  }
  return 'The camera scanner could not start. Close it and try again, or enter the code manually.'
}

export function PalletCameraScanner({ onScan, onClose }: PalletCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState('Requesting camera access. Allow permission when prompted.')
  const [error, setError] = useState<string | null>(null)
  const scanned = useEffectEvent(onScan)

  useEffect(() => {
    let cancelled = false
    let detected = false
    let stream: MediaStream | undefined
    let controls: IScannerControls | undefined
    const video = videoRef.current

    function stop() {
      controls?.stop()
      stream?.getTracks().forEach(track => track.stop())
      if (video && stream && video.srcObject === stream) video.srcObject = null
    }

    async function start() {
      let phase: 'decoder' | 'camera' | 'preview' = 'decoder'
      try {
        if (!window.isSecureContext) {
          throw new Error('SECURE_CONTEXT_REQUIRED')
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('CAMERA_API_UNAVAILABLE')
        }
        if (!video) throw new Error('VIDEO_PREVIEW_UNAVAILABLE')
        const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser')
        if (cancelled) return
        phase = 'camera'
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        })
        // Permission may resolve after the user has already closed the dialog.
        if (cancelled) { stop(); return }
        const reader = new BrowserMultiFormatReader()
        reader.possibleFormats = [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]
        phase = 'preview'
        setStatus('Starting camera preview…')
        controls = await reader.decodeFromStream(stream, video, (result, _error, scannerControls) => {
          if (cancelled || detected || !result) return
          const code = result.getText().trim()
          if (!code) return
          detected = true
          scannerControls.stop()
          stop()
          scanned(code)
        })
        // The decoder can return controls after a scan callback or dialog close.
        if (cancelled || detected) stop()
        else setStatus('Scanning. Keep the entire Code-128 barcode or QR code in view and hold the camera steady.')
      } catch (requestError) {
        stop()
        if (cancelled || detected) return
        const message = requestError instanceof Error ? requestError.message : ''
        if (message === 'SECURE_CONTEXT_REQUIRED') {
          setError('Camera access requires HTTPS or localhost. Open this application over HTTPS on your phone, or enter the code manually.')
        } else if (message === 'CAMERA_API_UNAVAILABLE') {
          setError('This browser does not expose the camera API. Use a supported browser with camera access enabled; embedded browsers may block it.')
        } else if (phase === 'decoder') {
          setError('Scanner initialization failed: the barcode decoder or preview could not load. Reload the page and try again.')
        } else if (phase === 'preview') {
          setError('Camera access was granted, but the video preview or decoder could not start. Close the scanner and retry; check that another application is not using the camera.')
        } else {
          setError(cameraError(requestError))
        }
      }
    }
    void start()
    return () => { cancelled = true; stop() }
  }, [])

  return (
    <Modal isOpen onClose={onClose} title="Scan pallet code" description="Use the camera to scan a Code-128 barcode or QR code." size="md">
      <div className="space-y-4">
        {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>
          : <p role="status" className="text-sm text-slate-600">{status}</p>}
        <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview for pallet scanning"
          className={`aspect-video w-full rounded-lg bg-slate-900 object-contain ${error ? 'hidden' : ''}`} />
        <Button type="button" variant="secondary" onClick={onClose}>Close Scanner</Button>
      </div>
    </Modal>
  )
}
