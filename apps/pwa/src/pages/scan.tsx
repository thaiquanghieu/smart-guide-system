import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Check, Image as ImageIcon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { buildQrEntryPath, resolveQrPayload } from "@/lib/qr";

function getReturnPath(router: ReturnType<typeof useRouter>) {
  return typeof router.query.returnTo === "string" && router.query.returnTo
    ? router.query.returnTo
    : "/";
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const [message, setMessage] = useState("Đưa mã QR vào khung để quét");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const stopScanner = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const goBack = () => {
    stopScanner();
    const returnTo = getReturnPath(router);
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(returnTo);
  };

  const handleDecodedText = async (rawText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    stopScanner();

    const payload = resolveQrPayload(rawText);
    if (!payload) {
      setMessage("Không đọc được mã QR hợp lệ");
      processingRef.current = false;
      return;
    }

    setScanSuccess(true);
    setMessage("Đã quét thành công");
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    await router.replace(buildQrEntryPath(payload));
  };

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || processingRef.current) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code?.data) {
        void handleDecodedText(code.data);
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Thiết bị không hỗ trợ mở camera trong trình duyệt");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
        frameRef.current = window.requestAnimationFrame(tick);
      } catch {
        setMessage("Không thể mở camera. Bạn có thể chọn ảnh QR từ thiết bị.");
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [router]);

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setMessage("Đang đọc ảnh QR...");
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Không thể đọc ảnh"));
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas chưa sẵn sàng");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Không thể đọc ảnh");

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      URL.revokeObjectURL(imageUrl);

      if (!code?.data) {
        setMessage("Không tìm thấy mã QR trong ảnh đã chọn");
        return;
      }

      await handleDecodedText(code.data);
    } catch {
      setMessage("Không thể xử lý ảnh QR. Vui lòng thử ảnh khác.");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <main
      className="min-h-screen bg-[#041B2D] px-5 pb-6 text-white"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
    >
      <div className="mx-auto max-w-[540px]">
        <AppHeader leftIcon="back" onLeftClick={goBack} />

        <section className="mt-6 rounded-[28px] bg-[#0A2440] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <p className="text-center text-[22px] font-bold">Quét mã QR</p>
          <p className="mt-2 text-center text-[14px] text-[#D1E3FF]">{message}</p>

          <div className="relative mt-5 overflow-hidden rounded-[26px] bg-black">
            <div className="aspect-[3/4] w-full">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`relative h-[220px] w-[220px] rounded-[28px] border border-white/45 bg-transparent ${scanSuccess ? "animate-scan-success" : ""}`}
                style={{ boxShadow: "0 0 0 999px rgba(0,0,0,0.62)" }}
              >
                <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-[22px] border-l-4 border-t-4 border-[#4CD964]" />
                <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-[22px] border-r-4 border-t-4 border-[#4CD964]" />
                <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-[22px] border-b-4 border-l-4 border-[#4CD964]" />
                <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-[22px] border-b-4 border-r-4 border-[#4CD964]" />
                {!scanSuccess ? (
                  <div
                    className="absolute left-4 right-4 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[rgba(76,217,100,0.9)]"
                    style={{ boxShadow: "0 0 18px rgba(76,217,100,0.7)", animation: "scanLine 1.9s ease-in-out infinite" }}
                  />
                ) : null}
                {scanSuccess ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[#0F5BD7]/20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0F5BD7] shadow-[0_12px_30px_rgba(15,91,215,0.24)]">
                      <Check className="h-8 w-8" strokeWidth={2.8} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {!cameraReady ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-center text-[14px] text-white/90">
                Đang chuẩn bị camera...
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-[18px] bg-white/10 px-4 py-4 text-[15px] font-semibold text-white"
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="h-5 w-5" strokeWidth={2.2} />
            Upload từ thiết bị
          </button>
        </section>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleImageUpload(event.target.files?.[0])}
      />
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
