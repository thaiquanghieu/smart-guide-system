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
        <div className="mx-auto flex w-fit items-center justify-center rounded-[28px] border border-[#0E3A63] bg-[#041B2D] px-7 py-5 shadow-[0_18px_40px_rgba(4,27,45,0.18)] animate-app-heartbeat">
          <img
            src="/assets/appiconfg.png"
            alt="Smart Guide"
            className="mx-auto w-[168px] animate-app-heartbeat-soft"
          />
        </div>
        <p className="mt-5 text-[16px] font-semibold text-[#0F5BD7]">{message}</p>
        {detail ? <p className="mt-2 text-[14px] leading-[1.6] text-[#6B7280]">{detail}</p> : null}
      </div>
    </main>
  );
}
