import { cn } from '@/client/lib/utils';
import logoSrc from '@/client/assets/logos/logo.png';

type MindArenaLogoProps = {
  className?: string;
  markClassName?: string;
};

export function MindArenaLogo({ className, markClassName }: MindArenaLogoProps) {
  return (
    <img
      src={logoSrc}
      alt=""
      aria-hidden="true"
      className={cn('block h-10 w-10 object-contain', className, markClassName)}
    />
  );
}
