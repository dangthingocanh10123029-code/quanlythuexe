import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from '../utils/theme';

interface Location {
  id: number;
  name: string;
  address: string;
  cars: number;
  x: number;
  y: number;
  type: 'premium' | 'standard' | 'airport' | 'hotel';
}

const carRentalLocations: Location[] = [
    {
      id: 1,
      name: "Landmark 81",
      address: "720A Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh",
      cars: 15,
      x: 75,
      y: 30,
      type: "premium"
    },
    {
      id: 2,
      name: "Vincom Đồng Khởi",
      address: "72 Lê Thánh Tôn, Quận 1, TP. Hồ Chí Minh",
      cars: 12,
      x: 35,
      y: 55,
      type: "standard"
    },
    {
      id: 3,
      name: "Sân bay Tân Sơn Nhất",
      address: "Trường Sơn, Tân Bình, TP. Hồ Chí Minh",
      cars: 8,
      x: 75,
      y: 25,
      type: "airport"
    },
    {
      id: 4,
      name: "Crescent Mall",
      address: "101 Tôn Dật Tiên, Quận 7, TP. Hồ Chí Minh",
      cars: 10,
      x: 80,
      y: 60,
      type: "standard"
    },
    {
      id: 5,
      name: "Chợ Bến Thành",
      address: "Lê Lợi, Quận 1, TP. Hồ Chí Minh",
      cars: 7,
      x: 68,
      y: 58,
      type: "standard"
    },
    {
      id: 6,
      name: "AEON Mall Tân Phú",
      address: "30 Bờ Bao Tân Thắng, Tân Phú, TP. Hồ Chí Minh",
      cars: 9,
      x: 42,
      y: 42,
      type: "standard"
    },
    {
      id: 7,
      name: "Khách sạn Rex Sài Gòn",
      address: "141 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
      cars: 6,
      x: 41,
      y: 57,
      type: "hotel"
    }
  ];

const TYPE_LABELS: Record<Location['type'], string> = {
  premium: 'Cao cấp',
  standard: 'Tiêu chuẩn',
  airport: 'Sân bay',
  hotel: 'Khách sạn',
};

const DummyMap = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const getMarkerColor = (type: Location['type']) => {
    switch (type) {
      case 'premium': return '#10B981';
      case 'airport': return '#3B82F6';
      case 'hotel': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="map-outline" size={18} color={THEME_COLORS.primary} />
              </View>
              <Text style={styles.headerTitle}>Bản đồ</Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>TP. Hồ Chí Minh, Việt Nam</Text>
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          {/* Grid Background */}
          <View style={styles.grid}>
            {[...Array(10)].map((_, i) => (
              <View key={`h${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${i * 10}%` }]} />
            ))}
            {[...Array(10)].map((_, i) => (
              <View key={`v${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${i * 10}%` }]} />
            ))}
          </View>

          {/* Location Markers */}
          {carRentalLocations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.marker,
                {
                  left: `${location.x}%`,
                  top: `${location.y}%`,
                  backgroundColor: getMarkerColor(location.type),
                },
                selectedLocation?.id === location.id && styles.selectedMarker
              ]}
              onPress={() => setSelectedLocation(
                selectedLocation?.id === location.id ? null : location
              )}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="car" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          ))}

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Loại điểm thuê</Text>
            <View style={styles.legendItems}>
              {[
                { type: 'premium', label: 'Cao cấp' },
                { type: 'airport', label: 'Sân bay' },
                { type: 'hotel', label: 'Khách sạn' },
                { type: 'standard', label: 'Tiêu chuẩn' },
              ].map((item) => (
                <View key={item.type} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getMarkerColor(item.type as Location['type']) }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Selected Location Panel */}
          {selectedLocation && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle} numberOfLines={1}>{selectedLocation.name}</Text>
                <TouchableOpacity
                  style={styles.panelClose}
                  onPress={() => setSelectedLocation(null)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="close" size={18} color={THEME_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.panelAddress}>{selectedLocation.address}</Text>
              <View style={styles.panelInfo}>
                <View style={styles.carCount}>
                  <Ionicons name="car-outline" size={16} color={THEME_COLORS.success} />
                  <Text style={styles.carCountText}>{selectedLocation.cars} xe sẵn sàng</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getMarkerColor(selectedLocation.type) + '1F' }]}>
                  <Text style={[styles.badgeText, { color: getMarkerColor(selectedLocation.type) }]}>
                    {TYPE_LABELS[selectedLocation.type]}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewButton} activeOpacity={PRESS_OPACITY}>
                <Text style={styles.viewButtonText}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Lớp ngoài mang bóng/viền (UI.card); lớp trong cắt nội dung theo bo góc
  container: {
    ...UI.card,
    height: 400,
  },
  inner: {
    flex: 1,
    borderRadius: RADIUS.card - 1,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACE.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    flexShrink: 1,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: THEME_COLORS.surfaceMuted,
    position: 'relative',
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: THEME_COLORS.border,
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  marker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    ...SHADOWS.card,
  },
  selectedMarker: {
    transform: [{ translateX: -16 }, { translateY: -16 }, { scale: 1.2 }],
    ...SHADOWS.raised,
  },
  legend: {
    ...UI.card,
    position: 'absolute',
    left: SPACE.md,
    bottom: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
  },
  legendTitle: {
    ...TYPOGRAPHY.overline,
    fontSize: 10,
    marginBottom: SPACE.sm,
  },
  legendItems: {
    gap: SPACE.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
  },
  panel: {
    ...UI.card,
    ...SHADOWS.raised,
    position: 'absolute',
    top: SPACE.md,
    left: SPACE.md,
    right: SPACE.md,
    padding: SPACE.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.xs,
    gap: SPACE.sm,
  },
  panelTitle: {
    ...TYPOGRAPHY.h3,
    flex: 1,
  },
  panelClose: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelAddress: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACE.md,
  },
  panelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.lg,
  },
  carCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  carCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.success,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewButton: {
    ...UI.primaryButton,
    height: 44,
  },
  viewButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
});

export default DummyMap;