import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export const PlayIcon = (props: IconProps) => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
)

export const PauseIcon = (props: IconProps) => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
  </svg>
)

export const PrevIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 6v12L9 12z" fill="currentColor" stroke="none" />
    <path d="M6 6v12" />
  </svg>
)

export const NextIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 6v12l9-6z" fill="currentColor" stroke="none" />
    <path d="M18 6v12" />
  </svg>
)

export const HomeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="6" />
    <path d="M15.5 15.5 20 20" />
  </svg>
)

export const LibraryIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 5v14M8 5v14M12.5 5.8l6.2 13.4" />
  </svg>
)

export const QueueIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h11M4 12h11M4 17h7M18 12v8" />
    <path d="M20.5 14.5 18 12l-2.5 2.5" />
  </svg>
)

export const SettingsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M4 12h2.2M17.8 12H20M12 4v2.2M12 17.8V20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" />
  </svg>
)

export const LinkIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10 13a4 4 0 0 0 5.7 0l2.3-2.3A4 4 0 0 0 12.3 5L11 6.3" />
    <path d="M14 11a4 4 0 0 0-5.7 0L6 13.3A4 4 0 0 0 11.7 19l1.3-1.3" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const PlayNextIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h9M4 12h9M4 17h5" />
    <path d="M17 8v8l5-4z" fill="currentColor" stroke="none" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const ChevronUpIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 15l6-6 6 6" />
  </svg>
)

export const WarningIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 4l8.5 15H3.5z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
)

export const VolumeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 10v4h3l4 3.5v-11L7 10z" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" />
  </svg>
)

export const EqualsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M7 9h10M7 15h10" />
  </svg>
)

export const MusicIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17.5" cy="15" r="2.5" />
    <path d="M9.5 17V7l10.5-2v10" />
  </svg>
)

export const ShuffleIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h3.5l9 10H20M4 17h3.5l3-3.3M14 9.3 16.5 7H20" />
    <path d="M18 4.5 20.5 7 18 9.5M18 14.5 20.5 17 18 19.5" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 12.5 9.5 17 19 7" />
  </svg>
)

/** Lambang Unison: tiga benang menyatu jadi satu garis. */
export const UnisonMark = (props: IconProps) => (
  <svg
    viewBox="0 0 48 32"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M2 5 H14 C24 5 24 16 34 16 H46" />
    <path d="M2 16 H46" />
    <path d="M2 27 H14 C24 27 24 16 34 16" />
  </svg>
)
