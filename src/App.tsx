import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { analyze, averagePace, paceText, timeText } from './domain/metrics';
import type { HistoryItem, Workout } from './domain/types';
import { repository } from './storage/database';
import { shareWorkout } from './storage/share';
import { isExpoGo } from './tracking/engine';
import { useTracker } from './tracking/useTracker';
import { Button, Card, Label, Notice, PhaseSummary, Splits, Stat, s } from './ui/components';
import { RouteMap } from './ui/RouteMap';
import { colors as c } from './ui/theme';

type Tab = 'record' | 'history' | 'settings';
type Tracker = ReturnType<typeof useTracker>;
const buzz = () => { void Haptics.selectionAsync().catch(() => undefined); };
const showError = (e: unknown) => Alert.alert('MyRun', e instanceof Error ? e.message : String(e));

export default function App() {
  return <SafeAreaProvider><MyRun /></SafeAreaProvider>;
}

function MyRun() {
  const tracker = useTracker();
  const [tab, setTab] = useState<Tab>('record');
  const [detail, setDetail] = useState<Workout | null>(null);
  const openWorkout = async (id: string) => {
    try { setDetail(await (await repository()).getWorkout(id)); }
    catch (e) { showError(e); }
  };
  return <SafeAreaView style={s.screen} edges={['top', 'left', 'right', 'bottom']}>
    <StatusBar style="light" />
    <View style={s.header}><View style={s.row}><Ionicons name="pulse" size={25} color={c.green} /><Text style={s.brand}>MYRUN</Text></View>
      <Text style={[s.badge, isExpoGo && { color: c.amber }]}>{isExpoGo ? 'EXPO GO · FOREGROUND' : 'ON YOUR DEVICE'}</Text></View>
    {tracker.error && <View style={{ paddingHorizontal: 22, marginBottom: 12 }}>
      <Notice title="Needs your attention" warning>{tracker.error}</Notice>
      <View style={[s.row, { paddingTop: 8 }]}><Pressable onPress={() => { void Linking.openSettings(); }} accessibilityRole="button" style={styles.textButton}><Text style={styles.link}>Open Settings</Text></Pressable>
        <Pressable onPress={tracker.dismissError} accessibilityRole="button" style={styles.textButton}><Text style={styles.link}>Dismiss</Text></Pressable></View>
    </View>}
    {!tracker.ready ? <View style={styles.center}><ActivityIndicator color={c.green} /><Text style={s.subtitle}>Opening your local workout log…</Text></View>
      : detail ? <WorkoutDetail workout={detail} onBack={() => setDetail(null)} onDelete={() => {
        Alert.alert('Delete this workout?', 'This removes the workout and its route from this device.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => {
            void tracker.remove(detail.session.id).then(() => setDetail(null));
          } },
        ]);
      }} /> : tab === 'record' ? <Recorder tracker={tracker} onFinished={openWorkout} />
      : tab === 'history' ? <History history={tracker.history} onOpen={openWorkout} /> : <SettingsScreen tracker={tracker} />}
    {!detail && <View style={styles.tabs}>{([
      { key: 'record', icon: 'radio-button-on-outline', title: 'Record' },
      { key: 'history', icon: 'time-outline', title: 'History' },
      { key: 'settings', icon: 'options-outline', title: 'Settings' },
    ] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }}
      onPress={() => { buzz(); setTab(item.key); }} style={styles.tab}>
      <Ionicons name={item.icon} size={22} color={tab === item.key ? c.green : c.muted} />
      <Text style={[styles.tabLabel, tab === item.key && { color: c.green }]}>{item.title}</Text>
    </Pressable>)}</View>}
  </SafeAreaView>;
}

function Recorder({ tracker: t, onFinished }: { tracker: Tracker; onFinished: (id: string) => void }) {
  const a = useMemo(() => analyze(t.workout, t.now), [t.workout, t.now]);
  const session = t.workout?.session;
  const paused = session?.status === 'paused';
  const walking = session?.phase === 'walk';
  const phase = walking ? a.walk : a.run;
  const latest = a.lastFix;
  const stale = !!session && !paused && (!a.lastGoodAt || t.now - a.lastGoodAt > 30_000);
  const livePace = a.liveSpeedMps >= 0.4 ? 1000 / a.liveSpeedMps : null;
  const finish = () => Alert.alert('Save workout?', 'Your running and cooldown statistics will be saved together.', [
    { text: 'Keep going', style: 'cancel' }, { text: 'Save workout', onPress: () => { buzz(); void t.finish().then(id => { if (id) onFinished(id); }); } },
  ]);
  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View><Label>OUTDOOR SESSION</Label><Text style={s.heading}>{!session ? 'Make time for a run.' : paused ? 'Take a breath.' : walking ? 'Ease into cooldown.' : 'Find your rhythm.'}</Text>
      <Text style={s.subtitle}>{!session ? 'Just you, your route, and the next kilometre.' : paused ? 'Timing and distance are paused.' : walking ? 'Your run is saved separately. Walk it out.' : 'One step at a time. You’ve got this.'}</Text></View>
    <View style={styles.hero}>
      <View style={s.row}><View style={[styles.statusDot, { backgroundColor: paused ? c.amber : walking ? c.blue : c.green }]} />
        <Text style={styles.status}>{!session ? 'READY WHEN YOU ARE' : paused ? 'PAUSED' : walking ? 'COOLDOWN WALK' : 'RECORDING RUN'}</Text>
        <Ionicons name="location-outline" size={14} color={c.muted} /><Text style={s.small}>{latest?.accuracy != null ? `±${Math.round(latest.accuracy)} m` : 'GPS'}</Text></View>
      <View style={styles.distanceRow}><Text style={[styles.distance, walking && { color: c.blue }]} adjustsFontSizeToFit numberOfLines={1}>{(phase.distanceM / 1000).toFixed(2)}</Text><Text style={styles.distanceUnit}>km</Text></View>
      <Text style={s.label}>{walking ? 'Cooldown walking distance' : 'Running distance'}</Text>
      <View style={styles.heroDivider} />
      <View style={s.row}><Stat label={walking ? 'Walking time' : 'Running time'} value={timeText(phase.durationMs)} />
        <Stat label="Live pace" value={paceText(livePace)} unit="/km" /></View>
      <View style={[s.row, { marginTop: 23 }]}><Stat label="Live speed" value={(a.liveSpeedMps * 3.6).toFixed(1)} unit="km/h" />
        <Stat label="Est. calories" value={String(Math.round(phase.calories))} unit="kcal" /></View>
    </View>
    {isExpoGo && <Notice title="Foreground test mode" warning>Keep Expo Go open and the screen on. Locking the screen pauses this test. An installed build is required for background recording.</Notice>}
    {stale && <Notice title="Waiting for a recent GPS fix" warning>The last usable point is over 30 seconds old, or GPS is still starting. Check your view of the sky. Missing route intervals are left as gaps.</Notice>}
    {!!t.diagnostic && <Notice title="Recorder update" warning>{t.diagnostic}</Notice>}
    <View style={s.row}><Text style={styles.sectionTitle}>Your route</Text>
      <Text style={s.small}>{session?.mode === 'background' && !paused ? 'BACKGROUND GPS' : 'LOCAL GPS'}</Text></View>
    <RouteMap routes={a.routes} live={session?.status === 'active'} />
    <Card><View style={s.row}><Ionicons name="walk-outline" color={c.blue} size={21} /><Text style={s.cardTitle}>Cooldown walking</Text><Text style={{ color: c.blue, fontSize: 20, fontWeight: '600' }}>{(a.walk.distanceM / 1000).toFixed(2)}<Text style={s.unit}> km</Text></Text></View>
      <View style={[s.row, { marginTop: 15 }]}><Stat label="Walking time" value={timeText(a.walk.durationMs)} /><Stat label="Total active session" value={timeText(a.activeMs)} /></View>
      {walking && <Text style={[s.body, { marginTop: 15 }]}>Run completed · {(a.run.distanceM / 1000).toFixed(2)} km · {timeText(a.run.durationMs)} · {paceText(averagePace(a.run))}/km</Text>}
    </Card>
    <Splits stats={a.run} />
    {walking && <Splits stats={a.walk} walking />}
    {!!a.gaps && <Text style={s.body}>{a.gaps} GPS gap(s) over 30 seconds. Distance may be understated.</Text>}
    <View style={[s.row, { justifyContent: 'center' }]}><Ionicons name="shield-checkmark-outline" color={c.muted} size={14} /><Text style={s.small}>YOUR WORKOUTS STAY ON THIS DEVICE</Text></View>
  </ScrollView><View style={styles.controls}>
    {!session ? <Button title={t.busy ? 'Getting GPS ready…' : 'Start run'} icon="play" loading={t.busy} onPress={() => { buzz(); void t.start(); }} />
      : <View style={{ gap: 10 }}><View style={s.row}>
        <View style={{ flex: 1 }}><Button title={paused ? 'Resume' : 'Pause'} icon={paused ? 'play' : 'pause'} loading={t.busy}
          onPress={() => { buzz(); void (paused ? t.resume() : t.pause()); }} /></View>
        <View style={{ flex: 1 }}><Button title="Finish" kind="secondary" icon="stop-outline" disabled={t.busy} onPress={finish} /></View>
      </View>{!walking && <Button title="Start cooldown walk" kind="secondary" icon="walk-outline" disabled={t.busy || paused}
        onPress={() => Alert.alert('Start cooldown?', 'Running statistics will stop here. Walking statistics start next.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Start cooldown', onPress: () => { buzz(); void t.cooldown(); } },
        ])} />}</View>}
  </View></View>;
}

function History({ history, onOpen }: { history: HistoryItem[]; onOpen: (id: string) => void }) {
  const totalM = history.reduce((sum, item) => sum + item.totals.run.distanceM, 0);
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View><Label>YOUR WORKOUT LOG</Label><Text style={s.heading}>Every run counts.</Text><Text style={s.subtitle}>Saved locally. Ready whenever you are.</Text></View>
    <Card><View style={s.row}><Stat label="Workouts" value={String(history.length)} /><Stat label="Running distance" value={(totalM / 1000).toFixed(2)} unit="km" /></View></Card>
    {!history.length && <View style={[styles.center, { paddingVertical: 60 }]}><Ionicons name="footsteps-outline" size={42} color={c.green} />
      <Text style={[s.cardTitle, { flex: 0, marginTop: 15 }]}>Your first run is waiting</Text><Text style={[s.body, { marginTop: 9 }]}>Finish a workout to see it here.</Text></View>}
    {history.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open workout from ${new Date(item.startedAt).toLocaleString()}`} onPress={() => onOpen(item.id)}>
      <Card><View style={s.row}><Text style={s.cardTitle}>{new Date(item.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text><Ionicons name="arrow-forward" size={18} color={c.muted} /></View>
        <Text style={[s.small, { marginTop: 6 }]}>{new Date(item.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{item.mode === 'foreground' ? ' · FOREGROUND TEST' : ''}</Text>
        <View style={[s.row, { marginTop: 17 }]}><Stat label="Run" value={(item.totals.run.distanceM / 1000).toFixed(2)} unit="km" /><Stat label="Pace" value={paceText(averagePace(item.totals.run))} unit="/km" /></View>
        <Text style={[s.body, { marginTop: 12 }]}>{timeText(item.totals.activeMs)} active · {(item.totals.walk.distanceM / 1000).toFixed(2)} km cooldown</Text>
      </Card></Pressable>)}
  </ScrollView>;
}

function WorkoutDetail({ workout, onBack, onDelete }: { workout: Workout; onBack: () => void; onDelete: () => void }) {
  const a = useMemo(() => analyze(workout, workout.session.endedAt ?? Date.now()), [workout]);
  const [sharing, setSharing] = useState(false);
  const exportFile = async (format: 'json' | 'gpx') => {
    setSharing(true);
    try { await shareWorkout(workout, format); } catch (e) { showError(e); } finally { setSharing(false); }
  };
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable onPress={onBack} accessibilityRole="button" style={[s.row, { minHeight: 44 }]}><Ionicons name="arrow-back" size={22} color={c.green} /><Text style={styles.link}>Back</Text></Pressable>
    <View><Label>WORKOUT SAVED</Label><Text style={s.heading}>A little further.</Text><Text style={s.subtitle}>{new Date(workout.session.startedAt).toLocaleString()}</Text></View>
    <RouteMap routes={a.routes} />
    <PhaseSummary stats={a.run} /><PhaseSummary stats={a.walk} walking />
    <Card><View style={s.row}><Stat label="Total active time" value={timeText(a.activeMs)} /><Stat label="Elapsed incl. pauses" value={timeText(a.wallMs)} /></View>
      <View style={[s.row, { marginTop: 20 }]}><Stat label="Run avg. speed" value={(a.run.durationMs > 0 ? a.run.distanceM / a.run.durationMs * 3600 : 0).toFixed(1)} unit="km/h" />
        <Stat label="Walk avg. speed" value={(a.walk.durationMs > 0 ? a.walk.distanceM / a.walk.durationMs * 3600 : 0).toFixed(1)} unit="km/h" /></View>
    </Card>
    <Splits stats={a.run} />{a.walk.durationMs > 0 && <Splits stats={a.walk} walking />}
    <Text style={s.body}>{workout.points.length} stored GPS samples · {a.rejected} filtered · {a.gaps} gap(s) over 30 s. Calories are a distance-based estimate using {workout.session.weightKg} kg.</Text>
    <Text style={s.body}>Last GPS sample: {a.lastFix ? new Date(a.lastFix.timestamp).toLocaleString() : 'None'}. Export JSON to inspect all sample timestamps.</Text>
    {workout.session.mode === 'foreground' && <Notice title="Expo Go test workout" warning>This workout was recorded in foreground test mode.</Notice>}
    <Button title="Export route as GPX" icon="share-outline" disabled={sharing} onPress={() => { void exportFile('gpx'); }} />
    <Button title="Export full workout JSON" kind="secondary" disabled={sharing} onPress={() => { void exportFile('json'); }} />
    <Button title="Delete workout" kind="danger" icon="trash-outline" onPress={onDelete} />
  </ScrollView>;
}

function SettingsScreen({ tracker: t }: { tracker: Tracker }) {
  const [weight, setWeight] = useState(String(t.settings.weightKg));
  useEffect(() => setWeight(String(t.settings.weightKg)), [t.settings.weightKg]);
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View><Label>MAKE IT YOURS</Label><Text style={s.heading}>Simple by design.</Text><Text style={s.subtitle}>The essentials for your next run.</Text></View>
    <Card><Text style={s.cardTitle}>Body weight</Text><Text style={[s.body, { marginTop: 7 }]}>Used for estimated calories. Changes apply to your next workout.</Text>
      <View style={[s.row, { marginVertical: 20 }]}><TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" returnKeyType="done"
        accessibilityLabel="Body weight in kilograms" style={styles.input} maxLength={6} /><Text style={s.body}>kg</Text></View>
      <Button title="Save weight" disabled={t.busy} onPress={() => { void t.saveSettings({ weightKg: Number(weight.replace(',', '.')) }); }} />
      <Text style={[s.body, { marginTop: 12 }]}>Run: 1.0 × kg × km. Walk: 0.5 × kg × km. These rough estimates ignore hills, heart rate, and individual efficiency.</Text>
    </Card>
    <Notice title={isExpoGo ? 'Expo Go · foreground only' : 'Installed iOS build'} warning={isExpoGo}>
      {isExpoGo ? 'To test screen-locked GPS, install the standalone app. A free signing route with AltStore is included in the setup guide.' : 'Choose Always and enable Precise Location. Start the workout with MyRun open, then lock your screen. Do not swipe the app away.'}
    </Notice>
    <Button title="Location & iPhone settings" icon="settings-outline" kind="secondary" onPress={() => { void Linking.openSettings(); }} />
    <Card><Text style={s.cardTitle}>Yours, from start to finish.</Text><Text style={[s.body, { marginTop: 10 }]}>No account, ads, analytics, or workout server. Your routes and history live in a local SQLite database. Use export to save a copy to Files. Removing the app removes its local data. iOS device backups may include app data.</Text>
      <Text style={[s.body, { marginTop: 12 }]}>GPS works without mobile data. Apple Maps may need internet for its background map. The map provider can receive map requests.</Text></Card>
    <Text style={[s.small, { textAlign: 'center', paddingVertical: 12 }]}>MYRUN 1.0 · OPEN SOURCE · MADE TO MOVE</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 8 },
  hero: { backgroundColor: c.card, borderRadius: 28, padding: 23, borderWidth: 1, borderColor: c.line },
  controls: { paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.background },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  status: { color: c.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, flex: 1 },
  distanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 18 },
  distance: { fontSize: 76, color: c.green, fontWeight: '600', letterSpacing: -4, fontVariant: ['tabular-nums'], flexShrink: 1 },
  distanceUnit: { fontSize: 25, color: c.muted },
  heroDivider: { height: 1, backgroundColor: c.line, marginVertical: 22 },
  sectionTitle: { color: c.text, fontSize: 17, fontWeight: '600', flex: 1, marginTop: 6 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, paddingBottom: 7, backgroundColor: c.background },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 5, minHeight: 50 },
  tabLabel: { color: c.muted, fontSize: 10, fontWeight: '600' },
  input: { color: c.text, backgroundColor: c.background, borderWidth: 1, borderColor: c.line, borderRadius: 14, fontSize: 26, padding: 14, minWidth: 130 },
  link: { color: c.green, fontSize: 14, fontWeight: '600' },
  textButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 },
});
