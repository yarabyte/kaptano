import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type KaptanoBrandProps = {
  href?: string;
  size?: "sm" | "lg";
  showText?: boolean;
  className?: string;
};

export function KaptanoBrand({
  href = "/",
  size = "lg",
  showText = true,
  className,
}: KaptanoBrandProps) {
  const iconSize = size === "lg" ? 56 : 36;
  const textSize = size === "lg" ? "text-2xl" : "text-xl";

  const content = (
    <span className={cn("inline-flex flex-col items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Kaptano"
        width={iconSize}
        height={iconSize}
        priority
      />
      {showText && (
        <span className={cn("font-heading font-bold tracking-tight text-foreground", textSize)}>
          Kaptano
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
