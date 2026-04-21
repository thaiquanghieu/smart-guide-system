type SearchBarProps = {
  value: string;
  placeholder: string;
  active?: boolean;
  onChange: (value: string) => void;
  onCancel?: () => void;
};

export default function SearchBar({ value, placeholder, active = true, onChange, onCancel }: SearchBarProps) {
  return (
    <div className="rounded-[14px] border border-[#D1D5DB] bg-white px-3 py-0 shadow-[0_10px_20px_rgba(0,0,0,0.04)]">
      <div className="grid h-[60px] grid-cols-[40px,1fr,auto] items-center gap-2">
        <img src="/assets/search.png" alt="Search" className="h-[28px] w-[28px] justify-self-center" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-0 bg-transparent text-[16px] text-[#0F5BD7] outline-none placeholder:text-[#6C8FD8]"
        />
        {active ? (
          <button type="button" onClick={onCancel} className="text-[14px] text-[#0F5BD7]">
            Huỷ
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
