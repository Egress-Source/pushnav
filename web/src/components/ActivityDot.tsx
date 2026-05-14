interface Props {
  active: boolean;
}

export function ActivityDot({ active }: Props) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full ml-1 align-middle"
      style={{
        backgroundColor: active ? "rgb(255, 70, 70)" : "rgb(60, 15, 15)",
      }}
    />
  );
}
