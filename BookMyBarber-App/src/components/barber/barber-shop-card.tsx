import { router, type Href } from 'expo-router';
import { MapPin, Users, Clock, Scissors, Settings } from 'lucide-react-native';
import { View, Linking, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';
import { home } from '@/constants/home-ui';
import { appAlert } from '@/lib/app-alert';
import type { BarberShopSummary } from '@/lib/booking-types';

interface BarberShopCardProps {
  shop: BarberShopSummary;
}

const STATUS_COLORS: Record<string, string> = {
  approved: COLORS.chart2,
  pending: COLORS.chart4,
  rejected: COLORS.destructive,
};

type TagDef = {
  label: string;
  icon: React.ReactNode;
  route?: string;
  action?: () => void;
  dim?: boolean;
};

function openExternalMap(shop: BarberShopSummary) {
  if (!shop.latitude || !shop.longitude) {
    appAlert('Missing location', 'This shop does not have map coordinates yet.');
    return;
  }
  const lat = Number(shop.latitude);
  const lng = Number(shop.longitude);
  const label = encodeURIComponent(`${shop.name} - ${shop.address}`.trim());
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  Linking.openURL(url).catch(() => appAlert('Error', 'Unable to open navigation'));
}

export function BarberShopCard({ shop }: BarberShopCardProps) {
  const statusColor = STATUS_COLORS[shop.status || ''] || COLORS.mutedForeground;

  const navigateTo = (tab: string) => {
    router.navigate(`/studio/${tab}?shopId=${shop.id}` as Href);
  };

  const tags: TagDef[] = [
    {
      label: `${shop.worker_count} Worker${shop.worker_count !== 1 ? 's' : ''}`,
      icon: <Users size={14} color={COLORS.primary} />,
      route: 'workers',
    },
    {
      label: `${shop.service_count} Service${shop.service_count !== 1 ? 's' : ''}`,
      icon: <Scissors size={14} color={COLORS.primary} />,
      route: 'services',
    },
    {
      label: shop.has_active_hours ? 'Hours' : 'No hours',
      icon: <Clock size={14} color={COLORS.primary} />,
      route: 'hours',
      dim: !shop.has_active_hours,
    },
    {
      label: 'Details',
      icon: <Settings size={14} color={COLORS.primary} />,
      route: 'details',
    },
    {
      label: 'Map',
      icon: <MapPin size={14} color={COLORS.primary} />,
      action: () => openExternalMap(shop),
    },
  ];

  return (
    <View className={home.barberShopCard}>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <ThemedText type="smallBold" className="text-base">{shop.name}</ThemedText>
          <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: statusColor + '20' }}>
            <ThemedText className="text-[9px] font-body font-semibold" style={{ color: statusColor, textTransform: 'capitalize' }}>
              {shop.status}
            </ThemedText>
          </View>
        </View>

        <View className="flex-row items-center gap-1 mt-1">
          <MapPin size={12} color={COLORS.mutedForeground} />
          <ThemedText themeColor="textSecondary" className="font-body text-sm flex-1" numberOfLines={1}>
            {shop.address}, {shop.city}
          </ThemedText>
        </View>

        {shop.description ? (
          <ThemedText themeColor="textSecondary" className="font-body text-xs mt-1" numberOfLines={1}>
            {shop.description}
          </ThemedText>
        ) : null}
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {tags.map((tag) => (
          <HapticPressable
            key={tag.label}
            haptic="light"
            className={`flex-row items-center gap-1 rounded-lg border px-2.5 py-1.5 ${tag.dim ? 'opacity-50' : ''}`}
            style={{ borderColor: COLORS.primary + '30', backgroundColor: COLORS.primary + '0A' }}
            onPress={() => {
              if (tag.action) tag.action();
              else if (tag.route) navigateTo(tag.route);
            }}
          >
            {tag.icon}
            <ThemedText className="font-body text-xs" style={{ color: COLORS.primary }}>
              {tag.label}
            </ThemedText>
          </HapticPressable>
        ))}
      </View>
    </View>
  );
}
