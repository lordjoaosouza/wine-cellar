import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BankIcon,
  BookmarkIcon,
  CameraIcon,
  CaretRightIcon,
  CheckIcon,
  DownloadSimpleIcon,
  DropIcon,
  EyeIcon,
  EyeSlashIcon,
  ForkKnifeIcon,
  GearIcon,
  HourglassIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MapTrifoldIcon,
  MinusIcon,
  type Icon as PhosphorIcon,
  PlusIcon,
  SignOutIcon,
  StarIcon,
  ThermometerIcon,
  TrashIcon,
  UploadSimpleIcon,
  WarningIcon,
  WifiSlashIcon,
  WineIcon,
  XIcon,
} from "phosphor-react-native";
import { Circle, Path, Svg } from "react-native-svg";

const GRAPE_STEM = "M22 5V2l-5.89 5.89";
const GRAPE_BERRIES: [number, number][] = [
  [16.6, 15.89],
  [8.11, 7.4],
  [12.35, 11.65],
  [13.91, 5.85],
  [18.15, 10.09],
  [6.56, 13.2],
  [10.8, 17.44],
  [5, 19],
];

function GrapeIcon({
  size = 20,
  color = "#1A1216",
  filled = false,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d={GRAPE_STEM}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      {GRAPE_BERRIES.map(([cx, cy]) => (
        <Circle
          cx={cx}
          cy={cy}
          fill={filled ? color : "none"}
          key={`${cx}-${cy}`}
          r={3}
          stroke={color}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}

const phosphorIcons = {
  arrowLeft: ArrowLeftIcon,
  arrowRight: ArrowRightIcon,
  bookmark: BookmarkIcon,
  bookmarkFilled: BookmarkIcon,
  building: BankIcon,
  camera: CameraIcon,
  check: CheckIcon,
  chevronRight: CaretRightIcon,
  close: XIcon,
  export: UploadSimpleIcon,
  eye: EyeIcon,
  eyeOff: EyeSlashIcon,
  fork: ForkKnifeIcon,
  gear: GearIcon,
  home: HouseIcon,
  hourglass: HourglassIcon,
  humidity: DropIcon,
  import: DownloadSimpleIcon,
  map: MapTrifoldIcon,
  mapPin: MapPinIcon,
  minus: MinusIcon,
  plus: PlusIcon,
  refresh: ArrowClockwiseIcon,
  search: MagnifyingGlassIcon,
  signOut: SignOutIcon,
  star: StarIcon,
  starFilled: StarIcon,
  thermometer: ThermometerIcon,
  trash: TrashIcon,
  warning: WarningIcon,
  wifiOff: WifiSlashIcon,
  wineGlass: WineIcon,
} satisfies Record<string, PhosphorIcon>;

const FILLED_NAMES = new Set<PhosphorIconName>([
  "bookmarkFilled",
  "starFilled",
]);

type PhosphorIconName = keyof typeof phosphorIcons;
export type IconName = PhosphorIconName | "grape";

export function Icon({
  name,
  size = 20,
  color = "#1A1216",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  if (name === "grape") {
    return <GrapeIcon color={color} filled={false} size={size} />;
  }
  const Component = phosphorIcons[name];
  return (
    <Component
      color={color}
      size={size}
      weight={FILLED_NAMES.has(name) ? "fill" : "regular"}
    />
  );
}
