type AppLoadingScreenProps = {
  message?: string;
  detail?: string;
  backgroundClassName?: string;
};

export default function AppLoadingScreen({
  message = "Đang tải...",
  detail,
  backgroundClassName = "bg-[#F4F7FB]",
}: AppLoadingScreenProps) {
  return (
    <main className={`app-shell flex items-center justify-center ${backgroundClassName}`}>
      <div className="w-full text-center">
        <img
          src="/assets/appiconfg.png"
          alt="Smart Guide"
          className="mx-auto w-[172px] animate-app-heartbeat"
        />
        <p className="mt-5 text-[16px] font-semibold text-[#0F5BD7]">{message}</p>
        {detail ? <p className="mt-2 text-[14px] leading-[1.6] text-[#6B7280]">{detail}</p> : null}
      </div>
    </main>
  );
}
