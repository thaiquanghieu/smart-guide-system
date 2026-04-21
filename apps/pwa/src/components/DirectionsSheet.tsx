type DirectionsSheetProps = {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
};

export default function DirectionsSheet({ open, onClose, latitude, longitude }: DirectionsSheetProps) {
  if (!open) return null;

  const appleUrl = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-[18px] font-bold text-[#111827]">Mở chỉ đường bằng</h3>

        <div className="mt-5 grid gap-3">
          <a href={appleUrl} target="_blank" rel="noreferrer" className="ios-card rounded-[16px] px-4 py-4 text-center text-[#111827]">
            Apple Maps
          </a>
          <a href={googleUrl} target="_blank" rel="noreferrer" className="ios-card rounded-[16px] px-4 py-4 text-center text-[#111827]">
            Google Maps
          </a>
          <button type="button" onClick={onClose} className="rounded-[16px] bg-[#0F5BD7] px-4 py-4 text-white">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
