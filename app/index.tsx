import { Text, View } from 'react-native';
import { productName } from '../lib/product';

export default function Home() {
  return (
    <View>
      <Text>{productName()}</Text>
    </View>
  );
}
