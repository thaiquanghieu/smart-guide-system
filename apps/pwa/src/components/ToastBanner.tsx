type ToastBannerProps = {
  message: string;
};

export default function ToastBanner({ message }: ToastBannerProps) {
  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-8 z-50 w-[min(88vw,360px)] -translate-x-1/2 rounded-[14px] border border-[#8CB7FF] bg-[#EEF4FF]/95 px-4 py-3 text-center text-[14px] font-semibold text-[#0F5BD7] shadow-[0_8px_20px_rgba(15,91,215,0.16)]">
      {message}
    </div>
  );
}
