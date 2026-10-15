import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PhaseStats } from '../domain/types';
import { averagePace, paceText, timeText } from '../domain/metrics';
import { colors as c } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export function Button({ title, onPress, icon, kind = 'primary', disabled = false, loading = false }: {
  title: string; onPress: () => void; icon?: IconName; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; loading?: boolean;
}) {
  const foreground = kind === 'primary' ? c.background : kind === 'danger' ? c.red : c.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [s.button,
      { backgroundColor: kind === 'primary' ? c.green : c.raised, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}>
    {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
    <Text style={[s.buttonText, { color: foreground }]}>{title}</Text>
  </Pressable>;
}

export function Card({ children }: { children: ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Label({ children }: { children: ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return <View style={{ flex: 1, minWidth: 0 }}><Text style={s.label}>{label}</Text>
    <Text style={s.statValue} adjustsFontSizeToFit numberOfLines={1}>{value}<Text style={s.unit}>{unit ? ` ${unit}` : ''}</Text></Text></View>;
}

export function Notice({ title, children, warning = false }: { title: string; children: ReactNode; warning?: boolean }) {
  return <View style={[s.notice, { borderColor: warning ? '#6D5630' : c.line }]}>
    <Ionicons name={warning ? 'information-circle-outline' : 'shield-checkmark-outline'} size={20} color={warning ? c.amber : c.green} />
    <View style={{ flex: 1, gap: 4 }}><Text style={[s.noticeTitle, warning && { color: c.amber }]}>{title}</Text><Text style={s.body}>{children}</Text></View>
  </View>;
}

export function PhaseSummary({ stats, walking = false }: { stats: PhaseStats; walking?: boolean }) {
  return <Card><View style={s.row}><Ionicons name={walking ? 'walk-outline' : 'fitness-outline'} size={21} color={walking ? c.blue : c.green} />
    <Text style={s.cardTitle}>{walking ? 'Cooldown walking' : 'Running'}</Text></View>
    <View style={[s.row, { marginTop: 20 }]}><Stat label="Distance" value={(stats.distanceM / 1000).toFixed(2)} unit="km" />
      <Stat label="Active time" value={timeText(stats.durationMs)} /></View>
    <View style={[s.row, { marginTop: 18 }]}><Stat label="Average pace" value={paceText(averagePace(stats))} unit="/km" />
      <Stat label="Est. calories" value={String(Math.round(stats.calories))} unit="kcal" /></View>
  </Card>;
}

export function Splits({ stats, walking = false }: { stats: PhaseStats; walking?: boolean }) {
  return <Card><View style={s.row}><Text style={s.cardTitle}>{walking ? 'Cooldown splits' : 'Kilometre splits'}</Text>
    <Text style={s.small}>{walking ? 'WALK' : 'RUN'}</Text></View>
    <View style={[s.row, { marginTop: 20, marginBottom: 8 }]}><Text style={[s.small, { flex: 1 }]}>KILOMETRE</Text><Text style={s.small}>PACE /KM</Text></View>
    {stats.splits.map(split => <View key={split.kilometre} style={s.splitRow}><Text style={s.body}>{String(split.kilometre).padStart(2, '0')}</Text>
      <View style={{ flex: 1, marginHorizontal: 18, height: 5, borderRadius: 3, backgroundColor: c.line }}>
        <View style={{ height: 5, borderRadius: 3, width: `${Math.min(100, 100 * 300_000 / Math.max(300_000, split.durationMs))}%`, backgroundColor: walking ? c.blue : c.green }} />
      </View><Text style={s.splitPace}>{paceText(split.durationMs / 1000)}</Text></View>)}
    {stats.partialDistanceM >= 1 && <View style={s.splitRow}><Text style={s.body}>{(stats.partialDistanceM / 1000).toFixed(2)} km · partial</Text>
      <Text style={s.small}>{timeText(stats.partialDurationMs)}</Text></View>}
    {!stats.splits.length && stats.partialDistanceM < 1 && <Text style={[s.body, { marginTop: 8 }]}>Your first split appears after 1 km.</Text>}
  </Card>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { padding: 22, paddingTop: 8, gap: 16, paddingBottom: 35 },
  header: { paddingHorizontal: 24, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { color: c.text, fontSize: 21, fontWeight: '800', letterSpacing: 2 },
  badge: { color: c.green, fontSize: 9, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: c.raised, overflow: 'hidden' },
  heading: { color: c.text, fontSize: 32, fontWeight: '700', letterSpacing: -1, marginTop: 5 },
  subtitle: { color: c.muted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  label: { color: c.muted, fontSize: 12, letterSpacing: 0.3 },
  body: { color: c.muted, fontSize: 13, lineHeight: 20 },
  small: { color: c.muted, fontSize: 10, letterSpacing: 0.7, fontWeight: '600' },
  card: { padding: 20, borderRadius: 24, backgroundColor: c.card, borderColor: c.line, borderWidth: 1 },
  cardTitle: { color: c.text, fontSize: 16, fontWeight: '600', flex: 1 },
  statValue: { color: c.text, fontSize: 25, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 7, letterSpacing: -0.6 },
  unit: { color: c.muted, fontSize: 12, fontWeight: '400', letterSpacing: 0 },
  button: { minHeight: 56, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  notice: { padding: 15, borderRadius: 18, borderWidth: 1, backgroundColor: c.card, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeTitle: { color: c.text, fontSize: 13, fontWeight: '600' },
  splitRow: { borderTopWidth: 1, borderTopColor: c.line, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  splitPace: { color: c.text, fontSize: 17, fontVariant: ['tabular-nums'] },
});
