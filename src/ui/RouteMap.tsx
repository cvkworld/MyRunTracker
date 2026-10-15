import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { RoutePart } from '../domain/types';
import { colors as c } from './theme';

export function RouteMap({ routes, live = false }: { routes: RoutePart[]; live?: boolean }) {
  const map = useRef<MapView>(null);
  const points = routes.flatMap(r => r.coordinates);
  const first = points[0];
  const last = points.at(-1);
  const signature = `${points.length}-${last?.timestamp ?? 0}`;
  const fit = () => {
    if (!points.length) return;
    if (points.length === 1 || live) {
      map.current?.animateToRegion({ latitude: last!.latitude, longitude: last!.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 400);
    } else map.current?.fitToCoordinates(points, { edgePadding: { top: 35, bottom: 35, left: 35, right: 35 }, animated: true });
  };
  useEffect(() => { if (live) fit(); }, [signature, live]);
  return <View style={s.wrapper}>
    {first ? <MapView ref={map} style={StyleSheet.absoluteFill} userInterfaceStyle="dark"
      initialRegion={{ latitude: first.latitude, longitude: first.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      onMapReady={fit} showsCompass showsScale showsUserLocation={false} showsMyLocationButton={false}
      accessibilityLabel="Workout route map. Green is running and blue is cooldown walking.">
      {routes.filter(r => r.coordinates.length >= 2).map(route => <Polyline key={route.key} coordinates={route.coordinates}
        strokeColor={route.phase === 'run' ? c.green : c.blue} strokeWidth={5} />)}
      <Marker coordinate={first} title="Start" pinColor={c.green} />
      {last && last.timestamp !== first.timestamp && <Marker coordinate={last} title={live ? 'Latest recorded point' : 'Last recorded point'} pinColor={c.blue} />}
    </MapView> : <View style={s.empty}>
      <View style={s.orbit}><Ionicons name="navigate-outline" size={31} color={c.green} /></View>
      <Text style={s.emptyTitle}>Your route starts here</Text>
      <Text style={s.emptyText}>Head outside. Find your rhythm.</Text>
    </View>}
    {!!first && <Pressable style={s.recenter} onPress={fit} accessibilityRole="button" accessibilityLabel="Recenter route map">
      <Ionicons name="locate-outline" size={21} color={c.text} />
    </Pressable>}
    <View style={s.legend} pointerEvents="none"><View style={[s.dot, { backgroundColor: c.green }]} /><Text style={s.legendText}>Run</Text>
      <View style={[s.dot, { backgroundColor: c.blue }]} /><Text style={s.legendText}>Cooldown</Text></View>
  </View>;
}

const s = StyleSheet.create({
  wrapper: { height: 240, borderRadius: 24, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 25 },
  orbit: { width: 66, height: 66, borderRadius: 33, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
  emptyText: { color: c.muted, fontSize: 12, marginTop: 6 },
  recenter: { position: 'absolute', top: 14, right: 14, backgroundColor: c.background, padding: 12, borderRadius: 22 },
  legend: { position: 'absolute', bottom: 12, left: 12, backgroundColor: '#0B1210EE', flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 20, gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 }, legendText: { color: c.text, fontSize: 11, marginRight: 8 },
});
