import { cn } from "../../lib/utils";

export function ContentLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 min-w-0 max-w-full overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
