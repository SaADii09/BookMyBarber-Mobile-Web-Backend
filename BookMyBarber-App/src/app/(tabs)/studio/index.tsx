import { Redirect, type Href } from 'expo-router';

export default function StudioIndex() {
  return <Redirect href={'/studio/services' as Href} />;
}
