import Avatar, { genConfig, type AvatarFullConfig } from 'react-nice-avatar';
import { cn } from '@/client/lib/utils';

const STUDENT_AVATARS: Array<{ label: string; config: AvatarFullConfig }> = [
  {
    label: 'Grade 4 student, girl avatar',
    config: {
      sex: 'woman',
      faceColor: '#f3c9a6',
      hairStyle: 'womanShort',
      hairColor: '#4b2f24',
      eyeStyle: 'smile',
      noseStyle: 'short',
      mouthStyle: 'smile',
      shirtStyle: 'hoody',
      shirtColor: '#b04200',
      bgColor: '#fff3d6',
    },
  },
  {
    label: 'Grade 5 student, boy avatar',
    config: {
      sex: 'man',
      faceColor: '#d9a77f',
      hairStyle: 'normal',
      hairColor: '#2f2a25',
      eyeStyle: 'circle',
      noseStyle: 'round',
      mouthStyle: 'laugh',
      shirtStyle: 'short',
      shirtColor: '#0f8f72',
      bgColor: '#e8f7f2',
    },
  },
  {
    label: 'Grade 6 student, girl avatar',
    config: {
      sex: 'woman',
      faceColor: '#f0b98f',
      hairStyle: 'womanLong',
      hairColor: '#6b3d1f',
      eyeStyle: 'oval',
      noseStyle: 'short',
      mouthStyle: 'peace',
      shirtStyle: 'polo',
      shirtColor: '#2563eb',
      bgColor: '#e7efff',
    },
  },
  {
    label: 'Grade 7 student, boy avatar',
    config: {
      sex: 'man',
      faceColor: '#c98f67',
      hairStyle: 'thick',
      hairColor: '#251b18',
      eyeStyle: 'smile',
      glassesStyle: 'round',
      noseStyle: 'long',
      mouthStyle: 'smile',
      shirtStyle: 'hoody',
      shirtColor: '#b91c1c',
      bgColor: '#ffe8e8',
    },
  },
  {
    label: 'Grade 8 student, girl avatar',
    config: {
      sex: 'woman',
      faceColor: '#e0ad83',
      hairStyle: 'womanShort',
      hairColor: '#3a2419',
      hatStyle: 'beanie',
      hatColor: '#f59e0b',
      eyeStyle: 'circle',
      noseStyle: 'round',
      mouthStyle: 'laugh',
      shirtStyle: 'short',
      shirtColor: '#3f3f46',
      bgColor: '#fff7db',
    },
  },
];

type StudentAvatarProps = {
  variant?: number;
  className?: string;
};

export function StudentAvatar({ variant = 0, className }: StudentAvatarProps) {
  const avatar = STUDENT_AVATARS[((variant % STUDENT_AVATARS.length) + STUDENT_AVATARS.length) % STUDENT_AVATARS.length];
  const config = genConfig(avatar.config);

  return (
    <div
      role="img"
      aria-label={avatar.label}
      title={avatar.label}
      className={cn(
        'block h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-background bg-primary-container shadow-sm',
        className,
      )}
    >
      <Avatar className="h-full w-full" shape="circle" {...config} />
    </div>
  );
}
