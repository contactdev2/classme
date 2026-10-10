// DoneMark's strip on a phone (template 50): in a preview DoneMark's CI published, what went wrong in
// words at the bottom of every screen — and, for an error that would close the app, a screen saying so.
import { useEffect, useState } from 'react';
import { DevSettings, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { linkedToDonemark, listen, onStop, saidLines, theStop, type Said } from '../lib/donemark-try';

async function share(all: Said[]) {
  try { await Share.share({ message: `What the app said while I tried it:\n${saidLines(all)}` }); } catch { /* the sheet was closed */ }
}

async function restart() {
  try { await Updates.reloadAsync(); } catch { DevSettings.reload(); }
}

const ink = '#e8eaee';
const ember = '#ffd3c1';
const button = { borderWidth: 1, borderColor: '#4a5260', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 } as const;

export function DonemarkTryStrip() {
  const [said, setSaid] = useState<Said[]>([]);
  const [stop, setStop] = useState<Said | null>(theStop());
  const [hidden, setHidden] = useState(false);
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    const a = listen(setSaid);
    const b = onStop(setStop);
    Linking.getInitialURL().then((url) => setLinked(linkedToDonemark(url))).catch(() => undefined);
    return () => { a(); b(); };
  }, []);

  if (stop) {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1d2026', padding: 24, paddingTop: 64, gap: 14 }}>
        <Text style={{ color: ink, fontSize: 13, fontWeight: '700' }}>DoneMark · Try</Text>
        <Text style={{ color: ink, fontSize: 22, fontWeight: '700' }}>The app stopped here</Text>
        <Text style={{ color: ember, fontFamily: 'monospace' }}>{stop.words}</Text>
        <Text style={{ color: '#9aa3ae' }}>If Restart does nothing, close the app and open it again.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable style={button} onPress={() => void restart()}><Text style={{ color: '#bfe8e5' }}>Restart</Text></Pressable>
          <Pressable style={button} onPress={() => void share(said)}><Text style={{ color: '#bfe8e5' }}>Share for my look</Text></Pressable>
        </View>
      </View>
    );
  }
  if (hidden) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1d2026', borderTopWidth: 1, borderTopColor: '#2e333b', paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, flexWrap: 'wrap' }}>
        <Text style={{ color: ink, fontWeight: '700' }}>DoneMark · Try{linked ? ' · linked to DoneMark' : ''}</Text>
        <Text style={{ color: '#9aa3ae', flexShrink: 1 }}>{said.length === 0 ? 'Nothing has gone wrong so far.' : `${said.length} ${said.length === 1 ? 'error' : 'errors'}, newest first`}</Text>
        <Pressable style={[button, { marginLeft: 'auto' }]} onPress={() => setHidden(true)}><Text style={{ color: '#bfe8e5' }}>Hide</Text></Pressable>
      </View>
      {said.length > 0 ? (
        <ScrollView style={{ maxHeight: 160 }}>
          {said.map((s, i) => <Text key={`${s.at}-${i}`} style={{ color: ember, fontFamily: 'monospace', fontSize: 12, paddingHorizontal: 12, paddingVertical: 4 }}>{saidLines([s])}</Text>)}
          <Pressable style={[button, { margin: 12, alignSelf: 'flex-start' }]} onPress={() => void share(said)}><Text style={{ color: '#bfe8e5' }}>Share for my look</Text></Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}
