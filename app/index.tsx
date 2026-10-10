import { Text, View } from 'react-native';
import { productLine, productName } from '../lib/product';

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 34, fontWeight: '700' }}>{productName()}</Text>
      <Text style={{ fontSize: 17, color: '#3f4651' }}>{productLine()}</Text>
    </View>
  );
}
